import tempfile
import unittest
from pathlib import Path
from sandbox.browser_adapter import validate_sandbox_url, validate_application

class BrowserAdapterSafetyTests(unittest.TestCase):
    def test_allows_local_mock_only(self):
        validate_sandbox_url('http://127.0.0.1:8765/jobs/demo-001')
        for url in ('https://example.com/jobs/demo-001','http://localhost:8000/jobs/demo-001','http://127.0.0.1:8765/other','http://127.0.0.1:8765/jobs/demo-001?next=1'):
            with self.subTest(url=url), self.assertRaises(ValueError): validate_sandbox_url(url)
    def test_requires_consent_and_verified_fields(self):
        with tempfile.TemporaryDirectory() as tmp:
            cv = Path(tmp)/'fictional.pdf'; cv.write_bytes(b'%PDF-1.4\nfictional')
            with self.assertRaises(ValueError): validate_application('Demo User','demo@example.test','yes',cv,False)
            with self.assertRaises(ValueError): validate_application('Demo User','demo@example.test','unknown',cv,True)
            validate_application('Demo User','demo@example.test','yes',cv,True)
    def test_rejects_invalid_cv(self):
        with tempfile.TemporaryDirectory() as tmp:
            cv = Path(tmp)/'fictional.pdf'; cv.write_bytes(b'not a pdf')
            with self.assertRaises(ValueError): validate_application('Demo User','demo@example.test','yes',cv,True)

if __name__ == '__main__': unittest.main()
