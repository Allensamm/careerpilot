"""Fail-closed application readiness checks. No network submission adapter is enabled."""
from dataclasses import dataclass
from typing import Any

@dataclass(frozen=True)
class Readiness:
    ready: bool
    blockers: tuple[str, ...]

def evaluate(profile: dict[str, Any], job: dict[str, Any], *, cv_present: bool, authorization: bool) -> Readiness:
    blockers = []
    if not authorization:
        blockers.append('Explicit submission authorization is missing')
    if not cv_present:
        blockers.append('CV attachment is missing')
    if not profile.get('name') or not profile.get('email'):
        blockers.append('Applicant identity is incomplete')
    if not profile.get('verified_facts'):
        blockers.append('Verified candidate facts are missing')
    if not profile.get('eligibility_confirmed'):
        blockers.append('Work authorization and eligibility require verification')
    if not job.get('form_schema_verified'):
        blockers.append('Employer application form has not been verified')
    if not job.get('submission_adapter_authorized'):
        blockers.append('No authorized employer submission adapter')
    return Readiness(not blockers, tuple(blockers))

# Deliberately disabled: readiness alone never authorizes a network request.
SUBMISSIONS_ENABLED = False
