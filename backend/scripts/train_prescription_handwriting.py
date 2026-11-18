"""Train an experimental word recognizer locally; never changes live OCR.

Run from backend: .venv\\Scripts\\python.exe scripts/train_prescription_handwriting.py --epochs 20
CTC reference: https://docs.pytorch.org/docs/stable/generated/torch.nn.CTCLoss.html
"""
import argparse
import hashlib
import json
import random
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
import torch
from torch import nn
from torch.utils.data import Dataset, DataLoader

ROOT = Path(__file__).resolve().parents[1]


def text_key(text):
    return ' '.join(text.split()).casefold()


def edit_distance(a, b):
    previous = list(range(len(b)+1))
    for i, char in enumerate(a, 1):
        current = [i]
        for j, other in enumerate(b, 1):
            current.append(min(current[-1]+1, previous[j]+1, previous[j-1]+(char != other)))
        previous = current
    return previous[-1]


def decode(indices, alphabet):
    output, previous = [], None
    for value in indices:
        if value and value != previous:
            output.append(alphabet[value-1])
        previous = value
    return ''.join(output)


def read_manifest(root, split):
    records = [json.loads(line) for line in (root/f'{split}.jsonl').read_text(encoding='utf-8').splitlines() if line.strip()]
    for record in records:
        image = (root/record['image']).resolve()
        if not image.is_relative_to(root.resolve()) or not image.is_file():
            raise ValueError('Manifest image is missing or outside dataset')
    return records


class Words(Dataset):
    def __init__(self, root, records, alphabet, training=False):
        self.values, self.charset, self.training = [], {c:i+1 for i,c in enumerate(alphabet)}, training
        for record in records:
            with Image.open(root/record['image']) as image:
                gray = ImageOps.autocontrast(image.convert('L'))
                # Images in this archive were normalized to square word crops.
                gray = gray.resize((256,32),Image.Resampling.BILINEAR)
                pixels = np.asarray(gray,dtype=np.float32).copy()/127.5-1
            text = text_key(record['text'])
            self.values.append((torch.from_numpy(pixels).unsqueeze(0),text))
    def __len__(self): return len(self.values)
    def __getitem__(self,index):
        pixels,text = self.values[index]
        if self.training:
            pixels = (pixels + torch.randn_like(pixels)*.025).clamp(-1,1)
        return pixels,torch.tensor([self.charset.get(c,0) for c in text],dtype=torch.long),text


def collate(batch):
    images, targets, texts = zip(*batch)
    return torch.stack(images),torch.cat(targets),torch.tensor([len(t) for t in targets]),texts


class Recognizer(nn.Module):
    def __init__(self, classes):
        super().__init__()
        self.features=nn.Sequential(
            nn.Conv2d(1,32,3,padding=1),nn.ReLU(),nn.MaxPool2d(2),
            nn.Conv2d(32,64,3,padding=1),nn.ReLU(),nn.MaxPool2d(2),
            nn.Conv2d(64,128,3,padding=1),nn.ReLU(),nn.MaxPool2d((2,1)),
            nn.Conv2d(128,128,3,padding=1),nn.ReLU())
        self.sequence=nn.GRU(128,96,num_layers=2,bidirectional=True,dropout=.15)
        self.classifier=nn.Linear(192,classes)
    def forward(self,images):
        features=self.features(images).mean(2).permute(2,0,1)
        sequence,_=self.sequence(features)
        return self.classifier(sequence).log_softmax(2)


@torch.inference_mode()
def evaluate(model, loader, alphabet, device):
    model.eval()
    errors=characters=correct=count=unknown=0
    for images,_,_,texts in loader:
        guesses=model(images.to(device)).argmax(2).transpose(0,1).cpu().tolist()
        for guess,text in zip(guesses,texts):
            predicted=decode(guess,alphabet)
            errors+=edit_distance(predicted,text)
            characters+=len(text)
            correct+=int(predicted==text)
            unknown+=sum(c not in alphabet for c in text)
            count+=1
    return {'words':count,'word_accuracy':correct/max(count,1),'character_error_rate':errors/max(characters,1),'unseen_characters':unknown}


def write_json(path,data):
    temporary=path.with_suffix('.tmp')
    temporary.write_text(json.dumps(data,indent=2),encoding='utf-8')
    temporary.replace(path)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data',type=Path,default=ROOT/'datasets/prepared/rxhandbd')
    parser.add_argument('--output',type=Path,default=ROOT/'app/models/prescription/experimental-crnn')
    parser.add_argument('--epochs',type=int,default=20)
    parser.add_argument('--batch-size',type=int,default=32)
    parser.add_argument('--threads',type=int,default=3)
    parser.add_argument('--resume',action='store_true')
    args=parser.parse_args()
    if min(args.epochs,args.batch_size,args.threads)<1: parser.error('Values must be positive')
    random.seed(42);np.random.seed(42);torch.manual_seed(42)
    torch.set_num_threads(args.threads)
    device='cuda' if torch.cuda.is_available() else 'cpu'
    args.output.mkdir(parents=True,exist_ok=True)
    checkpoint=args.output/'last.pt'
    if checkpoint.exists() and not args.resume:
        raise ValueError('Existing run found. Use --resume or select another --output directory.')
    records={split:read_manifest(args.data,split) for split in ['train','validation','test']}
    # Ensure validation and test images do not leak into training.
    hashes={s:{r['sha256'] for r in rows} for s,rows in records.items()}
    if any(hashes[a]&hashes[b] for a,b in [('train','validation'),('train','test'),('validation','test')]):
        raise ValueError('Duplicate image hashes across data splits')
    alphabet=''.join(sorted(set(''.join(text_key(r['text']) for r in records['train']))))
    fingerprint=hashlib.sha256((args.data/'train.jsonl').read_bytes()).hexdigest()
    model=Recognizer(len(alphabet)+1).to(device)
    optimizer=torch.optim.AdamW(model.parameters(),lr=.001,weight_decay=.0001)
    first,best,history=1,float('inf'),[]
    if args.resume:
        saved=torch.load(checkpoint,map_location=device,weights_only=True)
        if saved['alphabet']!=alphabet or saved['fingerprint']!=fingerprint:
            raise ValueError('Checkpoint and training data differ')
        model.load_state_dict(saved['model']);optimizer.load_state_dict(saved['optimizer'])
        first,best,history=saved['epoch']+1,saved['best_cer'],saved['history']
    train=DataLoader(Words(args.data,records['train'],alphabet,True),batch_size=args.batch_size,shuffle=True,collate_fn=collate)
    validation=DataLoader(Words(args.data,records['validation'],alphabet),batch_size=args.batch_size,collate_fn=collate)
    loss_fn=nn.CTCLoss(blank=0,zero_infinity=False)
    print(json.dumps({'device':device,'parameters':sum(p.numel() for p in model.parameters()),'train':len(records['train']),'validation':len(records['validation']),'alphabet_size':len(alphabet),'live_ocr_changed':False}),flush=True)
    for epoch in range(first,args.epochs+1):
        started=time.monotonic();model.train();total=0
        for images,targets,lengths,_ in train:
            if (targets==0).any(): raise ValueError('Unknown training character')
            optimizer.zero_grad(set_to_none=True)
            output=model(images.to(device))
            input_lengths=torch.full((images.size(0),),output.size(0),dtype=torch.long)
            loss=loss_fn(output,targets.to(device),input_lengths,lengths)
            if not torch.isfinite(loss): raise ValueError('Non-finite training loss; check alignment lengths')
            loss.backward();nn.utils.clip_grad_norm_(model.parameters(),5);optimizer.step()
            total+=loss.item()*images.size(0)
        metrics=evaluate(model,validation,alphabet,device)
        row={'epoch':epoch,'train_loss':total/len(train.dataset),'validation':metrics,'seconds':round(time.monotonic()-started,2)}
        history.append(row)
        improved=metrics['character_error_rate']<best
        best=min(best,metrics['character_error_rate'])
        saved={'model':model.state_dict(),'optimizer':optimizer.state_dict(),'epoch':epoch,'alphabet':alphabet,'fingerprint':fingerprint,'best_cer':best,'history':history}
        temporary=checkpoint.with_suffix('.tmp');torch.save(saved,temporary);temporary.replace(checkpoint)
        if improved:
            torch.save({'model':model.state_dict(),'alphabet':alphabet,'epoch':epoch,'fingerprint':fingerprint},args.output/'best.pt')
        write_json(args.output/'metrics.json',{'state':'training','live_ocr_changed':False,'history':history})
        print(json.dumps(row),flush=True)
    saved=torch.load(args.output/'best.pt',map_location=device,weights_only=True)
    model.load_state_dict(saved['model'])
    test=DataLoader(Words(args.data,records['test'],alphabet),batch_size=args.batch_size,collate_fn=collate)
    result={'state':'completed','live_ocr_changed':False,'selected_epoch':saved['epoch'],'history':history,'test':evaluate(model,test,alphabet,device),'production_approved':False}
    write_json(args.output/'metrics.json',result)
    print(json.dumps({'test':result['test'],'production_approved':False}),flush=True)

if __name__=='__main__': main()
