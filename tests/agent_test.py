import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch
from io import BytesIO

spec=importlib.util.spec_from_file_location('local_agent',Path(__file__).parents[1]/'agent'/'local_agent.py')
agent=importlib.util.module_from_spec(spec);spec.loader.exec_module(agent)

class AgentTests(unittest.TestCase):
    def test_localhost_only(self):
        self.assertEqual(agent.HOST,'127.0.0.1')
        self.assertNotIn('https://attacker.example',agent.ALLOWED_ORIGINS)
    def test_submissions_not_implemented(self):
        self.assertNotIn('cv',agent.STATE)
        self.assertNotIn('profile',agent.STATE)
        self.assertEqual(agent.STATE['jobs'],[])
    def test_pair_code_format(self):
        self.assertEqual(len(agent.PAIR_CODE),6)
        self.assertTrue(agent.PAIR_CODE.isdecimal())
if __name__=='__main__':unittest.main()
