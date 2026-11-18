import importlib.util
import unittest
from pathlib import Path

path=Path(__file__).resolve().parents[1]/'scripts/train_prescription_handwriting.py'
spec=importlib.util.spec_from_file_location('prescription_training',path)
training=importlib.util.module_from_spec(spec)
spec.loader.exec_module(training)

class PrescriptionTrainingTests(unittest.TestCase):
    def test_ctc_repeat_and_blank_decoding(self):
        self.assertEqual(training.decode([1,1,0,1,2,2,0], 'ab'),'aab')

    def test_character_error_counts_insert_delete_substitute(self):
        self.assertEqual(training.edit_distance('tablet','tablet'),0)
        self.assertEqual(training.edit_distance('tablet','table'),1)
        self.assertEqual(training.edit_distance('dose','doze'),1)
        self.assertEqual(training.edit_distance('','abc'),3)

    def test_normalization_keeps_strength_and_punctuation(self):
        self.assertEqual(training.text_key('  Example  10 mg/mL '),'example 10 mg/ml')
