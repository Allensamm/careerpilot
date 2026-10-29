import unittest
from cloud.receipts import record_sandbox_attempt

class SandboxReceiptTests(unittest.TestCase):
    def setUp(self):
        self.record = {'application_queue': [{'board': 'sample', 'id': '123', 'state': 'PREPARATION_APPROVED_NO_SUBMISSION'}]}

    def test_requires_consent(self):
        with self.assertRaises(ValueError):
            record_sandbox_attempt(self.record, package_id='abc', board='sample', job_id='123', consent=False)

    def test_requires_approved_job(self):
        with self.assertRaises(ValueError):
            record_sandbox_attempt(self.record, package_id='abc', board='sample', job_id='456', consent=True)

    def test_idempotent(self):
        first, dup1 = record_sandbox_attempt(self.record, package_id='abc', board='sample', job_id='123', consent=True)
        second, dup2 = record_sandbox_attempt(self.record, package_id='abc', board='sample', job_id='123', consent=True)
        self.assertFalse(dup1)
        self.assertTrue(dup2)
        self.assertEqual(first, second)
        self.assertEqual(len(self.record['sandbox_receipts']), 1)

    def test_never_claims_employer_submission(self):
        receipt, _ = record_sandbox_attempt(self.record, package_id='abc', board='sample', job_id='123', consent=True)
        self.assertEqual(receipt['status'], 'SANDBOX_ONLY_NOT_SUBMITTED')
        self.assertIsNone(receipt['employer_confirmation'])

if __name__ == '__main__':
    unittest.main()
