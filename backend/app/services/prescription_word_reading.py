"""Bounded local word retries for blue-ink medicine-and-strength regions.

Accept only exact known names with two matching high-confidence crop readings
and a nearby, independently agreed strength. Never repair a drug spelling.
"""
import re
from app.services.prescription_image_reading import output_lines
from app.services.prescription_name_index import recognized_name

CATEGORY_NAMES=frozenset({'ors','oral rehydration salts','dextrose','normal saline','sodium chloride','ringer lactate','ringers lactate'})
STRENGTH=re.compile(r'^\d+(?:\.\d+)?\s*(?:%|mg|mcg|g|ml|iu)$',re.I)


def medicine_word_readings(pixels,engine,original):
    import cv2
    import numpy as np
    if not any(line.get('box') for line in original):return []
    height,width=pixels.shape[:2]
    hsv=cv2.cvtColor(pixels,cv2.COLOR_BGR2HSV)
    mask=cv2.inRange(hsv,np.array([90,25,20]),np.array([140,255,245]))
    ratio=float(np.count_nonzero(mask))/max(mask.size,1)
    if not .002<=ratio<=.20:return []
    kernel=max(3,min(25,round(width/80)))
    grouped=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_RECT,(kernel,3)))
    contours,_=cv2.findContours(grouped,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    regions=[]
    for contour in contours:
        x,y,w,h=cv2.boundingRect(contour)
        if w<20 or h<max(12,height*.008) or w>width*.6 or h>height*.12 or w<h*.9:continue
        nearby=[]
        for line in original:
            box=line.get('box')
            if box and min(x+w,box[2])>max(x,box[0]) and min(y+h,box[3])>max(y,box[1]):
                nearby.append(line.get('score') or 0)
        if not nearby or min(nearby)>=.92:continue
        padding=max(5,min(16,round(h*.25)))
        box=[max(0,x-padding),max(0,y-padding),min(width,x+w+padding),min(height,y+h+padding)]
        regions.append({'box':box,'priority':min(nearby)})
    regions=sorted(regions,key=lambda r:r['priority'])[:40]
    def read(region,contrast=False):
        x1,y1,x2,y2=region['box'];crop=pixels[y1:y2,x1:x2]
        if contrast:
            gray=cv2.cvtColor(crop,cv2.COLOR_BGR2GRAY)
            crop=cv2.cvtColor(cv2.createCLAHE(clipLimit=2.,tileGridSize=(8,8)).apply(gray),cv2.COLOR_GRAY2BGR)
        result=output_lines(engine(crop,use_det=False,use_cls=False,use_rec=True))
        if len(result)!=1:return None
        return result[0]
    for region in regions:
        result=read(region)
        region['reading']=result
    accepted=[]
    for region in regions:
        reading=region['reading']
        if not reading or (reading['score'] or 0)<.90:continue
        name=reading['text'].strip()
        if not re.search(r'[^\W\d_]',name):continue
        if name.casefold() not in CATEGORY_NAMES and not recognized_name(name):continue
        alternate=read(region,True)
        if not alternate or (alternate['score'] or 0)<.85 or alternate['text'].strip().casefold()!=name.casefold():continue
        box=region['box'];center=(box[1]+box[3])/2;h=box[3]-box[1]
        strengths=[]
        for neighbor in regions:
            if neighbor is region:continue
            candidate=neighbor['reading'];other=neighbor['box']
            if not candidate or not STRENGTH.fullmatch(candidate['text'].strip()) or (candidate['score'] or 0)<.95:continue
            if abs((other[1]+other[3])/2-center)>h*.4:continue
            gap=max(0,box[0]-other[2],other[0]-box[2])
            if gap>h*1.5:continue
            second=read(neighbor,True)
            if not second or (second['score'] or 0)<.95 or second['text'].strip().casefold()!=candidate['text'].strip().casefold():continue
            strengths.append((gap,candidate,other))
        if not strengths:continue
        _,strength,strength_box=min(strengths,key=lambda value:value[0])
        accepted.append({'text':f"{name} {strength['text'].strip()}",'confidence':min(reading['score'],alternate['score'],strength['score']),
                         'box':[min(box[0],strength_box[0]),min(box[1],strength_box[1]),max(box[2],strength_box[2]),max(box[3],strength_box[3])],
                         'method':'local_word_consensus','needs_verification':True})
    return accepted
