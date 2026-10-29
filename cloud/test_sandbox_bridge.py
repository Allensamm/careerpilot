import asyncio
import json
import tempfile
import unittest
from pathlib import Path
from cloud.sandbox_bridge import enqueue_fixture, process_fixture

class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / 'queue.json'
        self.cv = Path(self.temp.name) / 'fictional.pdf'
        self.cv.write_bytes(b'%PDF-1.4\n' + b'0' * 30)
    def tearDown(self):
        self.temp.cleanup()
    def run_job(self, submitter, email='demo@example.test'):
        return asyncio.run(process_fixture(self.path, name='Fictional Applicant',
            email=email, authorized='yes', cv=self.cv, consent=True, submitter=submitter))
    def test_consent_and_duplicate(self):
        with self.assertRaises(ValueError): enqueue_fixture(self.path)
        self.assertFalse(enqueue_fixture(self.path, consent=True)['duplicate'])
        self.assertTrue(enqueue_fixture(self.path, consent=True)['duplicate'])
    def test_success_and_no_repeat(self):
        enqueue_fixture(self.path, consent=True)
        calls = []
        async def submitter(**kwargs):
            calls.append(kwargs)
            return {'status':'LOCAL_SANDBOX_CONFIRMED', 'reference':'DEMO-123456ABCDEF', 'real_employer':False}
        self.assertEqual(self.run_job(submitter)['status'], 'SANDBOX_CONFIRMED')
        self.assertFalse(self.run_job(submitter)['executed'])
        self.assertEqual(len(calls), 1)
        self.assertEqual(json.loads(self.path.read_text())['jobs']['demo-001']['attempts'], 1)
    def test_ambiguous_failure_is_not_retried(self):
        enqueue_fixture(self.path, consent=True)
        async def fail(**kwargs): raise TimeoutError('unknown')
        self.assertEqual(self.run_job(fail)['status'], 'REVIEW_REQUIRED_UNCERTAIN')
        self.assertFalse(self.run_job(fail)['executed'])
    def test_reject_real_candidate_identity(self):
        enqueue_fixture(self.path, consent=True)
        async def submitter(**kwargs): raise AssertionError('must not run')
        with self.assertRaises(ValueError): self.run_job(submitter, 'real@gmail.com')
    def test_parallel_workers_do_not_double_submit(self):
        enqueue_fixture(self.path, consent=True)
        calls = []
        async def slow_submitter(**kwargs):
            calls.append(1)
            await asyncio.sleep(0.02)
            return {'status': 'LOCAL_SANDBOX_CONFIRMED', 'reference': 'DEMO-123456ABCDEF', 'real_employer': False}
        async def parallel():
            return await asyncio.gather(*(process_fixture(self.path, name='Fictional Applicant',
                email='demo@example.test', authorized='yes', cv=self.cv, consent=True,
                submitter=slow_submitter) for _ in range(8)))
        results = asyncio.run(parallel())
        self.assertEqual(sum(r['executed'] for r in results), 1)
        self.assertEqual(len(calls), 1)
        self.assertEqual(json.loads(self.path.read_text())['jobs']['demo-001']['attempts'], 1)

    def test_unverified_receipt(self):
        enqueue_fixture(self.path, consent=True)
        async def bad(**kwargs): return {'status':'LOCAL_SANDBOX_CONFIRMED','reference':'DEMO-123456ABCDEF','real_employer':True}
        self.assertEqual(self.run_job(bad)['status'], 'REVIEW_REQUIRED_UNCERTAIN')

if __name__ == '__main__': unittest.main()
