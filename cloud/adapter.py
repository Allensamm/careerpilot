"""Conservative employer-form mapping and deterministic preview. No network POSTs.

Greenhouse public job boards expose job details but do not grant third-party
submission permission. This adapter requires an independently verified schema.
"""
import hashlib
import json
from dataclasses import dataclass
from typing import Any

ALLOWED_FIELDS = frozenset({'first_name', 'last_name', 'email', 'phone', 'resume'})

@dataclass(frozen=True)
class Preview:
    ready: bool
    blockers: tuple[str, ...]
    fields: dict[str, str]
    fingerprint: str


def prepare(profile: dict[str, Any], job: dict[str, Any], *, cv_present: bool,
            authorization: bool, schema: dict[str, Any] | None = None) -> Preview:
    blockers: list[str] = []
    schema = schema or {}
    if not authorization:
        blockers.append('Per-job submission authorization required')
    if not job.get('submission_adapter_authorized'):
        blockers.append('Employer-supported submission method not verified')
    if not schema.get('verified'):
        blockers.append('Application form schema not independently verified')
    name = str(profile.get('name') or '').strip().split()
    fields = {'first_name': name[0] if name else '',
              'last_name': ' '.join(name[1:]) if len(name) > 1 else '',
              'email': str(profile.get('email') or '').strip(),
              'phone': str(profile.get('phone') or '').strip()}
    if cv_present:
        fields['resume'] = '[encrypted attachment available]'
    if not profile.get('verified_facts'):
        blockers.append('Candidate facts must be verified')
    if not profile.get('eligibility_confirmed'):
        blockers.append('Candidate eligibility must be confirmed')
    requested = schema.get('required_fields', [])
    if not isinstance(requested, list) or any(not isinstance(x, str) for x in requested):
        blockers.append('Malformed required fields')
        requested = []
    for key in requested:
        if key not in ALLOWED_FIELDS:
            blockers.append(f'Unmapped employer question: {key[:80]}')
        elif not fields.get(key):
            blockers.append(f'Missing required field: {key}')
    if not cv_present:
        blockers.append('CV attachment missing')
    identity = json.dumps({'board': job.get('board'), 'id': job.get('id'),
                           'email': fields['email'].lower()}, sort_keys=True)
    fingerprint = hashlib.sha256(identity.encode()).hexdigest()
    # Do not expose applicant PII in preview response.
    safe_fields = {key: ('present' if value else 'missing') for key, value in fields.items()}
    return Preview(not blockers, tuple(blockers), safe_fields, fingerprint)
