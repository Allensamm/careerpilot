"""Cloud-worker-shaped execution bridge for a FICTIONAL employer only.

Never reads production candidate packages. Explicit fixture consent required.
Leases are persisted before external effects; abandoned leases require review.
"""
import asyncio
import contextlib
import fcntl
import threading
import json
import os
import re
import tempfile
import time
from pathlib import Path
from sandbox.browser_adapter import submit_sandbox, validate_application

FIXTURE_JOB = 'demo-001'
FIXTURE_URL = 'http://127.0.0.1:8765/jobs/demo-001'

# A stable sidecar lock survives atomic queue-file replacement. POSIX only.
# Thread lock complements flock because flock semantics differ across threads.
_THREAD_LOCK = threading.Lock()

@contextlib.contextmanager
def queue_lock(path):
    lock_path = Path(str(path) + '.lock')
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with _THREAD_LOCK:
        fd = os.open(lock_path, os.O_CREAT | os.O_RDWR, 0o600)
        try:
            fcntl.flock(fd, fcntl.LOCK_EX)
            yield
        finally:
            fcntl.flock(fd, fcntl.LOCK_UN)
            os.close(fd)



def atomic_write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix='.bridge-', dir=path.parent)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, 'w') as out:
            json.dump(value, out)
            out.flush()
            os.fsync(out.fileno())
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def enqueue_fixture(path, *, consent=False):
    if not consent:
        raise ValueError('Explicit consent to submit to fictional employer required')
    path = Path(path)
    with queue_lock(path):
        data = json.loads(path.read_text()) if path.exists() else {'schema': 1, 'jobs': {}}
        if FIXTURE_JOB in data['jobs']:
            return {'duplicate': True, 'status': data['jobs'][FIXTURE_JOB]['status']}
        data['jobs'][FIXTURE_JOB] = {'status': 'QUEUED', 'attempts': 0, 'receipt': None,
                                     'job_id': FIXTURE_JOB, 'created_at': int(time.time())}
        atomic_write(path, data)
        return {'duplicate': False, 'status': 'QUEUED'}


async def process_fixture(path, *, name, email, authorized, cv, consent=False, submitter=submit_sandbox):
    if not consent:
        raise ValueError('Explicit consent required')
    if not email.endswith('@example.test'):
        raise ValueError('Fictional example.test email required')
    validate_application(name, email, authorized, Path(cv), consent)
    path = Path(path)
    with queue_lock(path):
        data = json.loads(path.read_text())
        job = data['jobs'].get(FIXTURE_JOB)
        if not job or job['status'] != 'QUEUED':
            return {'executed': False, 'status': job['status'] if job else 'NOT_QUEUED'}
        # Persist irreversible attempt marker before touching employer endpoint.
        job.update(status='IN_FLIGHT_UNCERTAIN', attempts=job['attempts'] + 1,
                   started_at=int(time.time()))
        atomic_write(path, data)
    try:
        receipt = await submitter(url=FIXTURE_URL, name=name, email=email,
                                  authorized=authorized, cv=Path(cv), consent=True)
        if (receipt.get('status') != 'LOCAL_SANDBOX_CONFIRMED' or
            receipt.get('real_employer') is not False or
            not re.fullmatch(r'DEMO-[0-9A-F]{12}', str(receipt.get('reference', '')))):
            raise ValueError('Unverified fictional receipt')
    except Exception:
        with queue_lock(path):
            data = json.loads(path.read_text())
            data['jobs'][FIXTURE_JOB]['status'] = 'REVIEW_REQUIRED_UNCERTAIN'
            atomic_write(path, data)
        return {'executed': True, 'status': 'REVIEW_REQUIRED_UNCERTAIN', 'real_application_submitted': False}
    with queue_lock(path):
        data = json.loads(path.read_text())
        job = data['jobs'][FIXTURE_JOB]
        job['status'] = 'SANDBOX_CONFIRMED'
        job['receipt'] = receipt['reference']
        job['finished_at'] = int(time.time())
        atomic_write(path, data)
    return {'executed': True, 'status': 'SANDBOX_CONFIRMED', 'receipt': receipt['reference'],
            'real_application_submitted': False}


def main():
    import argparse
    parser = argparse.ArgumentParser(description='FICTIONAL sandbox cloud-worker bridge only')
    parser.add_argument('--queue', type=Path, default=Path('.sandbox_bridge.json'))
    parser.add_argument('--enqueue', action='store_true')
    parser.add_argument('--run', action='store_true')
    parser.add_argument('--consent-to-sandbox-submit', action='store_true')
    parser.add_argument('--name', default='Fictional Applicant')
    parser.add_argument('--email', default='fictional@example.test')
    parser.add_argument('--work-authorized', choices=['yes', 'no'], default='yes')
    parser.add_argument('--cv', type=Path)
    args = parser.parse_args()
    if args.enqueue:
        print(enqueue_fixture(args.queue, consent=args.consent_to_sandbox_submit))
    if args.run:
        if not args.cv:
            parser.error('--run requires --cv')
        print(asyncio.run(process_fixture(args.queue, name=args.name, email=args.email,
              authorized=args.work_authorized, cv=args.cv,
              consent=args.consent_to_sandbox_submit)))


if __name__ == '__main__':
    main()
