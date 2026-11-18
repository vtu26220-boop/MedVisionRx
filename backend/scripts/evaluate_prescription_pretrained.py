"""Evaluate a cached pretrained model on explicitly selected local text lines.
No image is sent to a provider. Results never update a user's saved analysis.
"""
import argparse
import json
from pathlib import Path
import time
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import torch
from PIL import Image,ImageOps
from transformers import TrOCRProcessor,VisionEncoderDecoderModel


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('image',type=Path)
    parser.add_argument('--region',action='append',required=True,help='x1,y1,x2,y2: one handwritten text line')
    parser.add_argument('--model',type=Path)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    root=Path(__file__).resolve().parents[1]
    model_path=args.model
    if model_path is None:
        versions=list((root/'app/models/prescription/pretrained-cache/models--microsoft--trocr-base-handwritten/snapshots').glob('*'))
        if len(versions)!=1:raise ValueError('Provide a verified local model directory')
        model_path=versions[0]
    torch.set_num_threads(3)
    processor=TrOCRProcessor.from_pretrained(model_path,local_files_only=True,use_fast=False)
    model=VisionEncoderDecoderModel.from_pretrained(model_path,local_files_only=True,use_safetensors=True).eval()
    output=[]
    with Image.open(args.image) as original:
        original=ImageOps.exif_transpose(original).convert('RGB')
        for region in args.region:
            box=tuple(int(n) for n in region.split(','))
            if len(box)!=4 or not(0<=box[0]<box[2]<=original.width and 0<=box[1]<box[3]<=original.height):raise ValueError('Invalid crop bounds')
            crop=original.crop(box)
            for variant,image in [('original',crop),('contrast',ImageOps.autocontrast(crop.convert('L')).convert('RGB'))]:
                started=time.monotonic()
                pixels=processor(images=image,return_tensors='pt').pixel_values
                with torch.inference_mode():
                    ids=model.generate(pixels,max_new_tokens=80,num_beams=3,do_sample=False)
                text=processor.batch_decode(ids,skip_special_tokens=True)[0]
                result={'region':list(box),'variant':variant,'text':text,'seconds':round(time.monotonic()-started,2)}
                output.append(result)
                print(json.dumps(result,ensure_ascii=True),flush=True)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps({'model':model_path.parent.parent.name.removeprefix('models--').replace('--','/'),'local_only':True,'live_ocr_changed':False,'readings':output},indent=2),encoding='utf-8')

if __name__=='__main__':main()
