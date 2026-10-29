"""Deterministic sandbox receipts. No outbound network or employer submission."""
import hashlib
import json
import time


def fingerprint(package_id: str, board: str, job_id: str) -> str:
    return hashlib.sha256(json.dumps([package_id, board, job_id], separators=(',', ':')).encode()).hexdigest()


def record_sandbox_attempt(record: dict, *, package_id: str, board: str, job_id: str, consent: bool) -> tuple[dict, bool]:
    if not consent:
        raise ValueError('Explicit per-job sandbox consent required')
    item = next((q for q in record.get('application_queue', []) if q.get('board') == board and q.get('id') == job_id), None)
    if item is None or item.get('state') != 'PREPARATION_APPROVED_NO_SUBMISSION':
        raise ValueError('Job must be approved for preparation')
    key = fingerprint(package_id, board, job_id)
    receipts = record.setdefault('sandbox_receipts', [])
    existing = next((r for r in receipts if r['fingerprint'] == key), None)
    if existing:
        return existing, True
    receipt = {'fingerprint': key, 'board': board, 'job_id': job_id,
               'status': 'SANDBOX_ONLY_NOT_SUBMITTED', 'created_at': int(time.time()),
               'employer_confirmation': None}
    receipts.append(receipt)
    return receipt, False
