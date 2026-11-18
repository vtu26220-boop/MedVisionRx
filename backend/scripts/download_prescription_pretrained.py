"""Download official model weights in bounded, verified range requests."""
import argparse
import hashlib
import os
from pathlib import Path
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request,urlopen
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app.admin.tls import enable_system_certificates


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prescription-checkpoint',action='store_true')
    args=parser.parse_args()
    model='shubham879/trocr-prescription' if args.prescription_checkpoint else 'microsoft/trocr-base-handwritten'
    revision='f319fd3bff64d0ac952e4eba6a963484a0854b91' if args.prescription_checkpoint else 'eaacaf452b06415df8f10bb6fad3a4c11e609406'
    enable_system_certificates()
    root=Path(__file__).resolve().parents[1]/('app/models/prescription/pretrained-cache/models--'+model.replace('/','--'))
    snapshots=list((root/'snapshots').glob('*'))
    if len(snapshots)!=1:raise ValueError('Download model configuration first')
    destination=snapshots[0]/'model.safetensors'
    size=1335747032 if args.prescription_checkpoint else 1333384464
    digest='b6dbb014e02cbe8586b9dd7118790a05632de58f430b0f00b091b07189a3206e' if args.prescription_checkpoint else '25a40cddc7e6120140a3d5b9e3dd3878a92ada7b4f312953ab22edc19c2a5acc'
    partial=root/'blobs'/f'{digest}.incomplete'
    if destination.is_file():
        with destination.open('rb') as f:
            if hashlib.file_digest(f,'sha256').hexdigest()==digest:
                print('Weights already verified',flush=True);return
        raise ValueError('Existing weights failed integrity verification')
    start=partial.stat().st_size if partial.exists() else 0
    if start>size:raise ValueError('Partial download larger than expected')
    chunk=8*1024*1024
    ranges=[(p,min(p+chunk,size)-1) for p in range(start,size,chunk)]
    def fetch(bounds):
        first,last=bounds
        for attempt in range(3):
            try:
                url=f'https://huggingface.co/{model}/resolve/{revision}/model.safetensors?download=true&part={first}'
                with urlopen(Request(url,headers={'Range':f'bytes={first}-{last}'}),timeout=45) as response:
                    if response.status!=206 or response.headers.get('Content-Range')!=f'bytes {first}-{last}/{size}':raise ValueError('Unexpected range response')
                    data=response.read(last-first+2)
                if len(data)!=last-first+1:raise ValueError('Truncated range')
                return data
            except Exception:
                if attempt==2:raise
                time.sleep(attempt+1)
    print(f'Resuming verified-range download at {start}/{size} bytes',flush=True)
    with partial.open('ab') as output,ThreadPoolExecutor(max_workers=4) as pool:
        for index,data in enumerate(pool.map(fetch,ranges),1):
            output.write(data);output.flush()
            if index%8==0 or index==len(ranges):print(f'Downloaded {output.tell()}/{size} bytes',flush=True)
    with partial.open('rb') as f:actual=hashlib.file_digest(f,'sha256').hexdigest()
    if actual!=digest:raise ValueError('Weights failed SHA256 verification; do not load')
    os.replace(partial,destination)
    print('Official weights SHA256 verified; ready for local evaluation',flush=True)

if __name__=='__main__':main()
