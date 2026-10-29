import base64
import importlib
import os
import tempfile
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from cloud.worker import process_once

class QueueTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.env=patch.dict(os.environ, {'CAREERPILOT_PACKAGE_DIR':self.tmp.name,'CAREERPILOT_CLOUD_KEY':base64.urlsafe_b64encode(os.urandom(32)).decode()})
        self.env.start()
        from cloud import service
        self.service=importlib.reload(service)
        self.client=TestClient(service.app)
    def tearDown(self):
        self.env.stop(); self.tmp.cleanup()
    def make(self, auto=False):
        r=self.client.post('/api/cloud/packages',json={'consent':True,'name':'Test','email':'test@example.org','role':'Engineer','boards':['sampleboard'],'auto_queue':auto})
        self.assertEqual(r.status_code,201,r.text)
        obj=r.json();return obj['id'],{'X-Management-Token':obj['management_token']}
    def discover(self):
        process_once(self.service,fetcher=lambda board:[{'id':123,'title':'Engineer','absolute_url':'https://example.org/jobs/123'}])
    def test_auto_queue_idempotent(self):
        pid,h=self.make(True);self.discover()
        url=f'/api/cloud/packages/{pid}'
        q=self.client.get(url,headers=h).json()['application_queue']
        self.assertEqual(len(q),1)
        self.assertEqual(q[0]['state'],'AUTO_QUEUED_REQUIRES_VERIFICATION')
        self.assertEqual(self.client.post(url+'/queue',headers=h,json={'job_id':'123','board':'sampleboard','decision':'approve_preparation'}).json()['duplicate'],True)
    def test_manual_queue_duplicate_and_revoke(self):
        pid,h=self.make();self.discover();url=f'/api/cloud/packages/{pid}'
        payload={'job_id':'123','board':'sampleboard','decision':'approve_preparation'}
        self.assertFalse(self.client.post(url+'/queue',headers=h,json=payload).json()['duplicate'])
        self.assertTrue(self.client.post(url+'/queue',headers=h,json=payload).json()['duplicate'])
        self.assertEqual(len(self.client.get(url,headers=h).json()['application_queue']),1)
        self.client.delete(url,headers=h)
        self.assertEqual(self.client.get(url,headers=h).status_code,404)
    def test_unknown_job_rejected(self):
        pid,h=self.make()
        r=self.client.post(f'/api/cloud/packages/{pid}/queue',headers=h,json={'job_id':'bogus','board':'sampleboard','decision':'approve_preparation'})
        self.assertEqual(r.status_code,404)
if __name__=='__main__':unittest.main()
