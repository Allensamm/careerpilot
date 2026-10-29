import base64
import importlib
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

class CloudTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {
            'CAREERPILOT_PACKAGE_DIR': self.tmp.name,
            'CAREERPILOT_CLOUD_KEY': base64.urlsafe_b64encode(os.urandom(32)).decode(),
        })
        self.env.start()
        from cloud import service
        self.service = importlib.reload(service)
        self.client = TestClient(self.service.app)
        self.payload = {'consent': True, 'name': 'Demo', 'email': 'demo@example.com', 'role': 'Engineer', 'skills': ['Python']}

    def tearDown(self):
        self.env.stop()
        self.tmp.cleanup()

    def test_consent_required(self):
        r = self.client.post('/api/cloud/packages', json={**self.payload, 'consent': False})
        self.assertEqual(r.status_code, 400)

    def test_encrypted_storage_and_revoke(self):
        r = self.client.post('/api/cloud/packages', json=self.payload)
        self.assertEqual(r.status_code, 201, r.text)
        item = r.json()
        disk = Path(self.tmp.name, item['id'] + '.json').read_text()
        self.assertNotIn('demo@example.com', disk)
        self.assertNotIn(item['management_token'], disk)
        endpoint = '/api/cloud/packages/' + item['id']
        self.assertEqual(self.client.get(endpoint).status_code, 404)
        h = {'X-Management-Token': item['management_token']}
        self.assertEqual(self.client.get(endpoint, headers=h).json()['status'], 'AWAITING_DISCOVERY')
        self.assertEqual(self.client.delete(endpoint, headers=h).status_code, 200)
        self.assertFalse(Path(self.tmp.name, item['id'] + '.json').exists())

    def test_no_static_package_exposure(self):
        self.assertEqual(self.client.get('/.cloud_packages/secret.json').status_code, 404)
        self.assertEqual(self.client.get('/cloud/service.py').status_code, 404)

if __name__ == '__main__': unittest.main()
