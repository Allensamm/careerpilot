"""Durable, fail-closed local sandbox submission queue.

Only fictional identities and the bundled loopback employer are supported.
A crashed/uncertain attempt is never automatically retried: doing so could duplicate submissions.
"""
import asyncio
import json
import os
import tempfile
import time
from pathlib import Path
from .browser_adapter import submit_sandbox, validate_application, validate_sandbox_url

SANDBOX_URL = 'http://127.0.0.1:8765/jobs/demo-001'


def save(path: Path, state: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(dir=path.parent, prefix='.queue-')
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, 'w') as stream:
            json.dump(state, stream)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def enqueue(path: Path, *, job_id: str, consent: bool):
    if not consent:
        raise ValueError('Explicit per-job sandbox consent required')
    if job_id != 'demo-001':
        raise ValueError('Only the fictional demo-001 job is allowed')
    state = json.loads(path.read_text()) if path.exists() else {'jobs': {}}
    if job_id in state['jobs']:
        return state['jobs'][job_id], True
    item = {'job_id': job_id, 'url': SANDBOX_URL, 'status': 'QUEUED_SANDBOX', 'attempts': 0, 'reference': None}
    state['jobs'][job_id] = item
    save(path, state)
    return item, False


async def run_once(path: Path, *, name: str, email: str, authorized: str, cv: Path, submitter=submit_sandbox):
    """Runs one queued sandbox job. Single process only; no concurrent workers."""
    validate_application(name, email, authorized, cv, True)
    state = json.loads(path.read_text())
    item = state['jobs'].get('demo-001')
    if not item or item['status'] != 'QUEUED_SANDBOX':
        return {'ran': False, 'reason': 'No safely queued sandbox job'}
    validate_sandbox_url(item['url'])
    # Persist the attempt BEFORE making a network call. Unknown outcomes must be reviewed.
    item['status'] = 'IN_FLIGHT_OUTCOME_UNKNOWN'
    item['attempts'] += 1
    item['started_at'] = int(time.time())
    save(path, state)
    try:
        result = await submitter(url=item['url'], name=name, email=email, authorized=authorized, cv=cv, consent=True)
        if result.get('status') != 'LOCAL_SANDBOX_CONFIRMED' or result.get('real_employer') is not False:
            raise ValueError('Unverified sandbox receipt')
        import re
        if not re.fullmatch(r'DEMO-[0-9A-F]{12}', result.get('reference', '')):
            raise ValueError('Invalid sandbox reference')
    except Exception:
        # Do not automatically retry an ambiguous submission.
        item['status'] = 'REVIEW_REQUIRED_OUTCOME_UNKNOWN'
        save(path, state)
        return {'ran': True, 'status': item['status'], 'real_application_submitted': False}
    item['status'] = 'LOCAL_SANDBOX_CONFIRMED'
    item['reference'] = result['reference']
    item['finished_at'] = int(time.time())
    save(path, state)
    return {'ran': True, 'status': item['status'], 'reference': item['reference'], 'real_application_submitted': False}


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Fictional employer queue demonstration only')
    parser.add_argument('--queue', type=Path, default=Path('.sandbox_queue.json'))
    parser.add_argument('--enqueue', action='store_true')
    parser.add_argument('--run', action='store_true')
    parser.add_argument('--consent-to-sandbox-submit', action='store_true')
    parser.add_argument('--name', default='Fictional Applicant')
    parser.add_argument('--email', default='fictional@example.test')
    parser.add_argument('--work-authorized', choices=['yes', 'no'], default='yes')
    parser.add_argument('--cv', type=Path)
    args = parser.parse_args()
    if args.enqueue:
        print(enqueue(args.queue, job_id='demo-001', consent=args.consent_to_sandbox_submit))
    if args.run:
        if not args.consent_to_sandbox_submit or args.cv is None:
            parser.error('--run requires --consent-to-sandbox-submit and --cv')
        print(asyncio.run(run_once(args.queue, name=args.name, email=args.email, authorized=args.work_authorized, cv=args.cv)))

if __name__ == '__main__':
    main()
