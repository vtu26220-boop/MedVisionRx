import sqlite3
from contextlib import closing
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from app.services import prescription_name_index as index
from app.services.prescription_service import parse_candidates

class PrescriptionNameIndexTests(unittest.TestCase):
    def test_exact_name_and_no_spelling_repair(self):
        with tempfile.TemporaryDirectory() as folder:
            database=Path(folder)/'names.sqlite3'
            with closing(sqlite3.connect(database)) as connection:
                connection.execute('CREATE TABLE names (normalized TEXT)')
                connection.execute('INSERT INTO names VALUES (?)',('example ingredient',))
                connection.commit()
            with patch.object(index,'INDEX',database):
                self.assertTrue(index.recognized_name('Example  Ingredient'))
                self.assertFalse(index.recognized_name('Example Ingredlent'))
                self.assertFalse(index.recognized_name("' OR 1=1 --"))

    def test_missing_index_does_not_break_analysis(self):
        with patch.object(index,'INDEX',Path('missing-optional-index.sqlite3')):
            self.assertFalse(index.recognized_name('Example'))

    def test_name_index_only_adds_unconfirmed_identity(self):
        with patch('app.services.prescription_service.recognized_name',return_value=True):
            result=parse_candidates('Example Ingredient',[])
        self.assertEqual(result[0]['medicine_name'],'Example Ingredient')
        self.assertFalse(result[0]['user_confirmed'])
        self.assertIsNone(result[0]['generic_name'])
        self.assertEqual(result[0]['pharmacy_options'],[])
