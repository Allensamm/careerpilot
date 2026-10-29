import base64
import os
import unittest
from cloud.submission import evaluate, SUBMISSIONS_ENABLED
from cloud.test_service import CloudTests

class ReadinessTests(unittest.TestCase):
    def test_fail_closed(self):
        result = evaluate({'name':'Example', 'email':'a@example.com'}, {}, cv_present=False, authorization=False)
        self.assertFalse(result.ready)
        self.assertGreaterEqual(len(result.blockers), 4)
        self.assertFalse(SUBMISSIONS_ENABLED)

    def test_complete_readiness_does_not_enable_submission(self):
        result = evaluate({'name':'Example','email':'a@example.com','verified_facts':['education'], 'eligibility_confirmed':True},
                          {'form_schema_verified':True,'submission_adapter_authorized':True}, cv_present=True, authorization=True)
        self.assertTrue(result.ready)
        self.assertFalse(SUBMISSIONS_ENABLED)

class CvEscrowTests(CloudTests):
    def test_cv_consent_encryption_and_deletion(self):
        package = self.client.post('/api/cloud/packages', json=self.payload).json()
        url = '/api/cloud/packages/' + package['id'] + '/cv'
        headers = {'X-Management-Token': package['management_token']}
        cv = {'consent': True, 'filename': 'cv.pdf', 'content_type': 'application/pdf',
              'data_base64': base64.b64encode(b'%PDF-1.4\nPRIVATE TEST CONTENT').decode()}
        self.assertEqual(self.client.post(url, json={**cv,'consent':False}, headers=headers).status_code, 400)
        response = self.client.post(url, json=cv, headers=headers)
        self.assertEqual(response.status_code, 200, response.text)
        path = os.path.join(self.tmp.name, package['id'] + '.json')
        self.assertNotIn('PRIVATE TEST CONTENT', __import__('pathlib').Path(path).read_text())
        self.assertEqual(self.client.get('/api/cloud/packages/'+package['id'], headers=headers).json()['cv_attached'], True)
        self.assertEqual(self.client.delete(url, headers=headers).status_code, 200)
        self.assertEqual(self.client.get('/api/cloud/packages/'+package['id'], headers=headers).json()['cv_attached'], False)

    def test_cv_rejects_invalid_format(self):
        package = self.client.post('/api/cloud/packages', json=self.payload).json()
        headers = {'X-Management-Token': package['management_token']}
        response = self.client.post('/api/cloud/packages/'+package['id']+'/cv', headers=headers,
                                    json={'consent':True,'filename':'x.pdf','content_type':'application/pdf',
                                          'data_base64':base64.b64encode(b'not a pdf').decode()})
        self.assertEqual(response.status_code, 422)
