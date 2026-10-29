import base64
import importlib
import os
import tempfile
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from cloud.worker import plan_jobs, process_once

class WorkerTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.env=patch.dict(os.environ, {'CAREERPILOT_PACKAGE_DIR':self.tmp.name, 'CAREERPILOT_CLOUD_KEY':base64.urlsafe_b64encode(os.urandom(32)).decode()})
        self.env.start()
        from cloud import service
        self.service=importlib.reload(service)
        self.client=TestClient(service.app)
    def tearDown(self):
        self.env.stop();self.tmp.cleanup()
    def test_discovery_without_submissions(self):
        p={'consent':True,'name':'Example Person','email':'example@sample.test','role':'Engineer','skills':['Python'],'boards':['exampleboard']}
        r=self.client.post('/api/cloud/packages',json=p)
        self.assertEqual(r.status_code,201,r.text)
        data=r.json()
        def fake_fetch(board):
            self.assertEqual(board,'exampleboard')
            return [{'id':123,'title':'Senior Python Engineer','absolute_url':'https://boards.greenhouse.io/example/jobs/123'}]
        self.assertEqual(process_once(self.service,fetcher=fake_fetch),1)
        response=self.client.get('/api/cloud/packages/'+data['id'],headers={'X-Management-Token':data['management_token']}).json()
        self.assertEqual(response['status'],'MATCHES_READY_REVIEW_ONLY')
        self.assertEqual(len(response['matches']),1)
        self.assertEqual(response['matches'][0]['status'],'REVIEW_REQUIRED_NO_SUBMISSION')
        self.assertEqual(process_once(self.service,fetcher=fake_fetch),0)
        self.assertNotIn('example@sample.test',__import__('pathlib').Path(self.tmp.name,data['id']+'.json').read_text())
    def test_bad_board_rejected(self):
        r=self.client.post('/api/cloud/packages',json={'consent':True,'name':'A','email':'a@b.com','role':'R','boards':['../bad']})
        self.assertEqual(r.status_code,422)
    def test_role_matching(self):
        found=plan_jobs({'role':'Analyst','skills':[]},[{'id':1,'title':'Data Analyst','absolute_url':'https://example.org/job'}],'board')
        self.assertEqual(len(found),1)
if __name__=='__main__':unittest.main()
