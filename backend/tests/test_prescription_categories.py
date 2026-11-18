import unittest
from unittest.mock import patch
from app.services.prescription_reference import reference_for
from app.services.prescription_service import reference_candidates
from app.services.prescription_structure import extract_prescribed_instructions
import asyncio

class PrescriptionCategoryTests(unittest.TestCase):
    def test_exact_category_has_sources_not_product_identity(self):
        with patch('app.services.prescription_reference.public_label') as lookup:
            result=reference_for('ORS','','',[])
        self.assertEqual(result['reference_status'],'category_match')
        self.assertIn('not identified',result['generic_name'])
        self.assertEqual(len(result['sources']),2)
        lookup.assert_not_called()
        self.assertNotIn('dose',result)

    def test_category_does_not_invent_formulation_or_fix_spelling(self):
        with patch('app.services.prescription_reference.public_label',return_value=None):
            for name,strength,form in [('0RS','',''),('ORS','10mg',''),('ORS','','injection')]:
                self.assertEqual(reference_for(name,strength,form,[])['reference_status'],'unavailable')

    def test_category_enrichment_has_four_searches_and_no_personal_schedule(self):
        medicine={'medicine_name':'ORS','strength':'','dosage_form':'','source_text':'ORS','prescribed':extract_prescribed_instructions('ORS')}
        enriched=asyncio.run(reference_candidates([medicine],[]))[0]
        self.assertEqual(len(enriched['pharmacy_options']),4)
        self.assertFalse(enriched['user_confirmed'])
        self.assertFalse(enriched['prescribed'].get('morning'))
        self.assertTrue(all(option['action']=='Search pharmacy' for option in enriched['pharmacy_options']))
