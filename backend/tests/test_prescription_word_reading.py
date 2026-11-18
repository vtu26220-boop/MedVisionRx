import unittest
from types import SimpleNamespace
from unittest.mock import patch
import cv2
import numpy as np
from app.services.prescription_word_reading import medicine_word_readings

class PrescriptionWordReadingTests(unittest.TestCase):
    def setUp(self):
        self.image=np.full((400,300,3),255,dtype=np.uint8)
        cv2.rectangle(self.image,(120,65),(220,95),(180,40,20),-1)
        cv2.rectangle(self.image,(70,65),(100,95),(180,40,20),-1)
        self.original=[{'box':[40,40,250,120],'score':.6}]

    def engine(self,pixels,**kwargs):
        name='ExampleMed' if pixels.shape[1]>80 else '5%'
        return SimpleNamespace(txts=[name],scores=[.98])

    def test_agreed_name_and_adjacent_strength(self):
        with patch('app.services.prescription_word_reading.recognized_name',side_effect=lambda name:name=='ExampleMed'):
            values=medicine_word_readings(self.image,self.engine,self.original)
        self.assertEqual(len(values),1)
        self.assertEqual(values[0]['text'],'ExampleMed 5%')
        self.assertTrue(values[0]['needs_verification'])

    def test_disagreeing_second_reading_is_rejected(self):
        calls=0
        def changing(pixels,**kwargs):
            nonlocal calls
            calls+=1
            if pixels.shape[1]>80:
                text='ExampleMed' if calls<=2 else 'Different'
                return SimpleNamespace(txts=[text],scores=[.98])
            return self.engine(pixels,**kwargs)
        with patch('app.services.prescription_word_reading.recognized_name',return_value=True):
            self.assertEqual(medicine_word_readings(self.image,changing,self.original),[])

    def test_unknown_names_are_not_fuzzy_corrected(self):
        with patch('app.services.prescription_word_reading.recognized_name',return_value=False):
            self.assertEqual(medicine_word_readings(self.image,self.engine,self.original),[])

    def test_confident_printed_regions_do_not_retry(self):
        def unexpected(*args,**kwargs):raise AssertionError('No extra OCR expected')
        self.assertEqual(medicine_word_readings(self.image,unexpected,[{'box':[40,40,250,120],'score':.99}]),[])


class CachedEngineRegressionTests(unittest.TestCase):
    def test_full_document_flags_reset_after_word_crop_call(self):
        import io
        import os
        from pathlib import Path
        from PIL import Image
        from app.services.prescription_ocr import extract_document
        class StatefulEngine:
            detection=True
            def __call__(self,pixels,**kwargs):
                self.detection=kwargs.get('use_det',self.detection)
                return SimpleNamespace(txts=['Tab ExampleMed 10mg' if self.detection else 'Unsegmented'],scores=[.99])
        engine=StatefulEngine()
        def crop_retry(pixels,cached,original):
            cached(pixels,use_det=False,use_cls=False,use_rec=True)
            return []
        content=io.BytesIO();Image.new('RGB',(100,100),'white').save(content,format='PNG')
        with patch.dict(os.environ,{'PRESCRIPTION_OCR_PROVIDER':'local'}),patch('app.services.prescription_ocr.get_local_engine',return_value=engine),patch('app.services.prescription_word_reading.medicine_word_readings',side_effect=crop_retry):
            for _ in range(2):
                result=extract_document([content.getvalue()],Path('unused'))
                self.assertEqual(result['text'],'Tab ExampleMed 10mg')
