import asyncio
import json
import tempfile
import unittest
from pathlib import Path
from sandbox.queue_runner import enqueue, run_once

class QueueRunnerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / 'queue.json'
        self.cv = Path(self.tmp.name) / 'fictional.pdf'
        self.cv.write_bytes(b'%PDF-1.4\nfictional')

    def test_consent_and_allowlist(self):
        with self.assertRaises(ValueError):
            enqueue(self.path, job_id='demo-001', consent=False)
        with self.assertRaises(ValueError):
            enqueue(self.path, job_id='real-job', consent=True)

    def test_idempotent_queue(self):
        enqueue(self.path, job_id='demo-001', consent=True)
        _, duplicate = enqueue(self.path, job_id='demo-001', consent=True)
        self.assertTrue(duplicate)
        self.assertEqual(len(json.loads(self.path.read_text())['jobs']), 1)

    def test_confirmed_and_no_duplicate_run(self):
        async def submitter(**kwargs):
            return {'status':'LOCAL_SANDBOX_CONFIRMED','reference':'DEMO-ABCDEF123456','real_employer':False}
        enqueue(self.path, job_id='demo-001', consent=True)
        kwargs = dict(name='Fictional Applicant', email='fictional@example.test', authorized='yes', cv=self.cv, submitter=submitter)
        result = asyncio.run(run_once(self.path, **kwargs))
        self.assertEqual(result['status'], 'LOCAL_SANDBOX_CONFIRMED')
        self.assertFalse(asyncio.run(run_once(self.path, **kwargs))['ran'])
        self.assertEqual(json.loads(self.path.read_text())['jobs']['demo-001']['attempts'], 1)

    def test_unknown_result_no_automatic_retry(self):
        calls = []
        async def submitter(**kwargs):
            calls.append(True)
            raise TimeoutError('Uncertain outcome')
        enqueue(self.path, job_id='demo-001', consent=True)
        kwargs = dict(name='Fictional Applicant', email='fictional@example.test', authorized='yes', cv=self.cv, submitter=submitter)
        result = asyncio.run(run_once(self.path, **kwargs))
        self.assertEqual(result['status'], 'REVIEW_REQUIRED_OUTCOME_UNKNOWN')
        self.assertFalse(asyncio.run(run_once(self.path, **kwargs))['ran'])
        self.assertEqual(len(calls), 1)

    def test_in_flight_not_retried_after_restart(self):
        enqueue(self.path, job_id='demo-001', consent=True)
        state = json.loads(self.path.read_text())
        state['jobs']['demo-001']['status'] = 'IN_FLIGHT_OUTCOME_UNKNOWN'
        self.path.write_text(json.dumps(state))
        result = asyncio.run(run_once(self.path, name='Fictional Applicant', email='fictional@example.test', authorized='yes', cv=self.cv))
        self.assertFalse(result['ran'])

if __name__ == '__main__':
    unittest.main()
