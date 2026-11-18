import unittest
from types import SimpleNamespace
import cv2
import numpy as np
from app.services.prescription_image_reading import reading_variants, output_lines, merge_readings
from app.services.prescription_service import parse_candidates

class PrescriptionRecognitionTests(unittest.TestCase):
    def test_sachet_and_plural_forms(self):
        medicines = parse_candidates('ORS 2 sachets\nTablets Example 20mg BD\nCapsules Sample 5mg', [])
        self.assertEqual([m['medicine_name'] for m in medicines], ['ORS', 'Example', 'Sample'])
        self.assertTrue(all(not m['user_confirmed'] for m in medicines))

    def test_concentration_before_name(self):
        medicines = parse_candidates('5% Dextrose IV stat', [])
        self.assertEqual(medicines[0]['medicine_name'], 'Dextrose')
        self.assertEqual(medicines[0]['strength'], '5%')

    def test_no_fuzzy_medicine_invention(self):
        self.assertEqual(parse_candidates('du: 10 5% Dextrore (inj stat.\nBP: 110/70\nHospital: Example', []), [])

    def test_clear_name_does_not_correct_unreadable_quantity(self):
        medicines = parse_candidates('ORS 2 zachets.', [])
        self.assertEqual(medicines[0]['medicine_name'], 'ORS')
        self.assertIn('zachets', medicines[0]['source_text'])
        self.assertEqual(medicines[0]['strength'], '')

    def test_blue_ink_triggers_local_passes(self):
        image = np.full((200, 300, 3), 255, dtype=np.uint8)
        cv2.putText(image, 'Sample', (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 1, (180, 40, 20), 2)
        self.assertEqual([name for name, _ in reading_variants(image)], ['contrast', 'ink_separation'])

    def test_confident_uncolored_page_fast_path(self):
        self.assertEqual(reading_variants(np.full((50, 50, 3),255,dtype=np.uint8)), [])

    def test_spatial_merge_removes_duplicates_and_joins_fragments(self):
        def observation(text, score, x, right, variant):
            return {'text':text,'score':score,'box':[x,20,right,40],'variant':variant,'index':0}
        lines=merge_readings([observation('0RS',.5,10,50,'original'),observation('ORS',.99,10,50,'contrast'),observation('2 sachets',.9,60,150,'original')])
        self.assertEqual(len(lines),1)
        self.assertEqual(lines[0]['text'],'ORS 2 sachets')

    def test_no_box_legacy_output_supported(self):
        lines=output_lines(SimpleNamespace(txts=['Sample'],scores=[.9]))
        self.assertEqual(merge_readings(lines)[0]['text'],'Sample')
