import unittest
from cloud.adapter import prepare

class AdapterTests(unittest.TestCase):
    def setUp(self):
        self.profile = {'name':'Ada Example', 'email':'ada@example.org',
                        'verified_facts':['education'], 'eligibility_confirmed':True}
        self.job = {'board':'example', 'id':'123', 'submission_adapter_authorized':True}
        self.schema = {'verified':True, 'required_fields':['first_name','last_name','email','resume']}

    def test_complete_mapping_only_in_internal_preview(self):
        result = prepare(self.profile, self.job, cv_present=True, authorization=True, schema=self.schema)
        self.assertTrue(result.ready)
        self.assertEqual(result.fields['email'], 'present')
        self.assertNotIn('ada@example.org', str(result.fields))

    def test_unknown_screening_question_fails_closed(self):
        schema = {'verified':True, 'required_fields':['visa_sponsorship']}
        result = prepare(self.profile, self.job, cv_present=True, authorization=True, schema=schema)
        self.assertFalse(result.ready)
        self.assertTrue(any('Unmapped' in b for b in result.blockers))

    def test_unverified_adapter_blocks(self):
        job = {**self.job, 'submission_adapter_authorized':False}
        result = prepare(self.profile, job, cv_present=True, authorization=True, schema=self.schema)
        self.assertFalse(result.ready)

    def test_idempotency_fingerprint_stable(self):
        a = prepare(self.profile, self.job, cv_present=True, authorization=True, schema=self.schema)
        b = prepare(self.profile, self.job, cv_present=True, authorization=True, schema=self.schema)
        self.assertEqual(a.fingerprint, b.fingerprint)

    def test_no_cv_blocks(self):
        result = prepare(self.profile, self.job, cv_present=False, authorization=True, schema=self.schema)
        self.assertFalse(result.ready)
