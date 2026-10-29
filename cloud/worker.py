"""Privacy-minimizing background discovery and planning. Never submits applications."""
import base64
import json
import re
import time
import urllib.request
from datetime import datetime, timezone
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

MAX_JOBS_PER_BOARD = 250

def fetch_greenhouse(board, timeout=12):
    if not re.fullmatch(r'[a-zA-Z0-9_-]{2,80}', board):
        raise ValueError('Invalid Greenhouse board token')
    url = f'https://boards-api.greenhouse.io/v1/boards/{board}/jobs'
    request = urllib.request.Request(url, headers={'User-Agent': 'CareerPilot-Discovery/0.8', 'Accept': 'application/json'})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        data = json.load(response)
    return (data.get('jobs') or [])[:MAX_JOBS_PER_BOARD]

def plan_jobs(profile, jobs, board):
    skills = {str(x).strip().lower() for x in profile.get('skills', []) if str(x).strip()}
    role = profile.get('role', '').strip().lower()
    matches = []
    for job in jobs:
        title = str(job.get('title') or '')[:200]
        url = str(job.get('absolute_url') or '')
        if not url.startswith('https://'):
            continue
        title_lower = title.lower()
        matching = sorted(s for s in skills if s in title_lower)
        role_match = bool(role and role in title_lower)
        if not matching and not role_match:
            continue
        matches.append({'id': str(job.get('id', ''))[:80], 'board': board, 'title': title,
                        'url': url, 'matching_skills': matching[:10], 'role_match': role_match,
                        'status': 'REVIEW_REQUIRED_NO_SUBMISSION'})
    return matches[:100]

def process_once(service, fetcher=fetch_greenhouse, now=None):
    """Run once, suitable for cron/systemd/Kubernetes. No user data printed or returned."""
    service.ensure_key()
    now = time.time() if now is None else now
    processed = 0
    from cloud import storage
    if not storage.enabled() and not service.STORE.exists():
        return processed
    package_ids = storage.ids() if storage.enabled() else [p.stem for p in service.STORE.glob('*.json')]
    for pid in package_ids:
        try:
            with service.lock:
                record = service.read_record(pid)
                if record['expires_at'] <= now or record.get('status') == 'REVOKED':
                    continue
                if record.get('next_run_at', 0) > now:
                    continue
                nonce = base64.b64decode(record['nonce'])
                payload = json.loads(AESGCM(service.KEY).decrypt(nonce, base64.b64decode(record['ciphertext']), pid.encode()))
            boards = payload.get('boards', [])
            planned = []
            for board in boards:
                try:
                    planned.extend(plan_jobs(payload, fetcher(board), board))
                except (OSError, ValueError, TimeoutError, json.JSONDecodeError):
                    continue
            # Store only public job metadata; do not persist decrypted applicant fields.
            with service.lock:
                latest = service.read_record(pid)
                if latest['expires_at'] <= time.time() or latest['ciphertext'] != record['ciphertext']:
                    continue
                latest['matches'] = planned[:100]
                # A match can be queued only once. Queue entries survive future discovery runs.
                if payload.get('auto_queue'):
                    queue = latest.setdefault('application_queue', [])
                    known = {(q['board'], q['id']) for q in queue}
                    for match in planned[:100]:
                        identity = (match['board'], match['id'])
                        if identity not in known and len(queue) < 100:
                            queue.append({'id': match['id'], 'board': match['board'],
                                          'title': match['title'], 'url': match['url'],
                                          'state': 'AUTO_QUEUED_REQUIRES_VERIFICATION',
                                          'created_at': int(now)})
                            known.add(identity)
                latest['last_run_at'] = int(now)
                latest['next_run_at'] = int(now) + 3600
                latest['status'] = 'MATCHES_READY_REVIEW_ONLY' if planned else 'DISCOVERY_COMPLETE_NO_MATCHES'
                service.write_record(pid, latest)
                processed += 1
        except (OSError, ValueError, KeyError, json.JSONDecodeError):
            continue
    return processed

if __name__ == '__main__':
    import argparse
    from cloud import service
    parser = argparse.ArgumentParser()
    parser.add_argument('--loop', action='store_true', help='Run hourly while process is alive')
    args = parser.parse_args()
    while True:
        process_once(service)
        service.purge_expired()
        if not args.loop:
            break
        time.sleep(60)
