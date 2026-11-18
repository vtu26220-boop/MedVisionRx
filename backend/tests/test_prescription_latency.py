import asyncio
import threading
import time
import unittest
from unittest.mock import patch
from app.services import prescription_service as service

class PrescriptionLatencyTests(unittest.IsolatedAsyncioTestCase):
    async def test_reference_deadline_preserves_ready_results_and_names(self):
        release=threading.Event()
        started=[]
        def lookup(name,*args):
            started.append(name)
            if name!='Ready':release.wait(2)
            return {'reference_status':'label_match','generic_name':name,'uses':['Example sourced use'],'sources':[]}
        medicines=[{'medicine_name':name,'strength':'10mg','dosage_form':'tablet','source_text':'written instruction'} for name in ['Ready']+[f'Slow{i}' for i in range(9)]]
        try:
            with patch.object(service,'REFERENCE_BUDGET_SECONDS',.05),patch.object(service,'reference_for',side_effect=lookup):
                begin=time.monotonic()
                results=await service.reference_candidates(medicines,[])
                elapsed=time.monotonic()-begin
            self.assertLess(elapsed,.5)
            self.assertEqual([m['medicine_name'] for m in results],[m['medicine_name'] for m in medicines])
            self.assertEqual(results[0]['reference_status'],'label_match')
            self.assertEqual(len(results[0]['pharmacy_options']),4)
            self.assertTrue(all(m['reference_status']=='unavailable' for m in results[1:]))
            self.assertTrue(all(m['source_text']=='written instruction' for m in results))
            self.assertLessEqual(len(started),4)
            self.assertIn('too long',results[-1]['reference_note'])
        finally:
            release.set()
            await asyncio.sleep(.02)

    async def test_review_timeout_preserves_user_confirmation_without_sources(self):
        release=threading.Event()
        def lookup(*args):
            release.wait(2)
            return {'reference_status':'label_match'}
        try:
            with patch.object(service,'REFERENCE_BUDGET_SECONDS',.02),patch.object(service,'reference_for',side_effect=lookup):
                result=(await service.enrich_references([{'medicine_name':'Example','source_text':'As written'}],[],confirmed=True))[0]
            self.assertTrue(result['user_confirmed'])
            self.assertTrue(result['needs_verification'])
            self.assertEqual(result['reference_status'],'unavailable')
            self.assertEqual(result['pharmacy_options'],[])
        finally:
            release.set()
            await asyncio.sleep(.02)

class ParserScanTests(unittest.TestCase):
    def test_catalogue_is_not_rescanned_for_each_line(self):
        class Counted(dict):
            gets=0
            def get(self,*args):
                Counted.gets+=1
                return super().get(*args)
        rows=[Counted(name=f'Example{i}',generic_name=f'Ingredient{i}') for i in range(100)]
        with patch.object(service,'recognized_name',return_value=False):
            result=service.parse_candidates('\n'.join(['Unrecognized heading']*30+['Tab Example99 10mg']),rows)
        self.assertEqual(result[0]['medicine_name'],'Example99')
        self.assertLess(Counted.gets,1000)
