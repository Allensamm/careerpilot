"""Development-only 24/7 cloud package prototype. No live job submissions."""
import base64
import hashlib
import json
import os
import re
import secrets
import tempfile
import mimetypes
import time
from pathlib import Path
from threading import Lock

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
STORE = Path(os.environ.get('CAREERPILOT_PACKAGE_DIR', str(ROOT / '.cloud_packages')))
KEY_B64 = os.environ.get('CAREERPILOT_CLOUD_KEY', '')
KEY = base64.urlsafe_b64decode(KEY_B64 + '=' * (-len(KEY_B64) % 4)) if KEY_B64 else None
if KEY is not None and len(KEY) != 32:
    raise RuntimeError('CAREERPILOT_CLOUD_KEY must be a 32-byte URL-safe base64 key')
TTL_SECONDS = 24 * 60 * 60
MAX_CV_BYTES = 2 * 1024 * 1024
MAX_PACKAGES = 100  # prototype safety bound
lock = Lock()
app = FastAPI(title='CareerPilot consented cloud prototype', docs_url=None, redoc_url=None)

class Package(BaseModel):
    consent: bool
    email: str = Field(min_length=3, max_length=254)
    name: str = Field(min_length=1, max_length=160)
    role: str = Field(min_length=1, max_length=160)
    region: str = Field(default='', max_length=160)
    skills: list[str] = Field(default_factory=list, max_length=80)
    boards: list[str] = Field(default_factory=list, max_length=10)
    verified_facts: list[str] = Field(default_factory=list, max_length=40)
    eligibility_confirmed: bool = False
    auto_queue: bool = False  # Explicitly opt in to preparation; NEVER submits
    # No CV uploaded by this prototype. Real ATS submissions need a separate explicit flow.


def ensure_key():
    if KEY is None:
        raise HTTPException(503, 'Cloud worker disabled: set CAREERPILOT_CLOUD_KEY')


def path_for(pid):
    if not re.fullmatch(r'[a-f0-9]{32}', pid):
        raise HTTPException(404, 'Not found')
    return STORE / f'{pid}.json'


def read_record(pid):
    try:
        return json.loads(path_for(pid).read_text())
    except (OSError, ValueError):
        raise HTTPException(404, 'Not found')


def authorize(record, token):
    if not token or not secrets.compare_digest(hashlib.sha256(token.encode()).hexdigest(), record['token_hash']):
        raise HTTPException(404, 'Not found')
    if record['expires_at'] <= time.time():
        raise HTTPException(410, 'Package expired')


def write_record(pid, record):
    STORE.mkdir(mode=0o700, parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix='.package-', dir=STORE)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, 'w') as f:
            json.dump(record, f)
        os.replace(tmp, path_for(pid))
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


@app.post('/api/cloud/packages', status_code=201)
def create_package(package: Package):
    ensure_key()
    if not package.consent:
        raise HTTPException(400, 'Explicit consent required')
    if '@' not in package.email or len(package.skills) > 80:
        raise HTTPException(422, 'Invalid package')
    if any(not re.fullmatch(r'[a-zA-Z0-9_-]{2,80}', b) for b in package.boards):
        raise HTTPException(422, 'Invalid board token')
    with lock:
        STORE.mkdir(mode=0o700, parents=True, exist_ok=True)
        if len(list(STORE.glob('*.json'))) >= MAX_PACKAGES:
            raise HTTPException(503, 'Prototype package capacity reached')
        pid = secrets.token_hex(16)
        token = secrets.token_urlsafe(32)
        nonce = secrets.token_bytes(12)
        payload = package.model_dump(exclude={'consent'})
        ciphertext = AESGCM(KEY).encrypt(nonce, json.dumps(payload).encode(), pid.encode())
        now = int(time.time())
        record = {'version': 1, 'nonce': base64.b64encode(nonce).decode(),
                  'ciphertext': base64.b64encode(ciphertext).decode(),
                  'token_hash': hashlib.sha256(token.encode()).hexdigest(),
                  'created_at': now, 'expires_at': now + TTL_SECONDS,
                  'status': 'AWAITING_DISCOVERY', 'matches': [], 'application_queue': [], 'next_run_at': now, 'cv_attachment': None}
        write_record(pid, record)
    return {'id': pid, 'management_token': token, 'expires_at': record['expires_at'], 'status': record['status']}


@app.get('/api/cloud/packages/{pid}')
def package_status(pid: str, x_management_token: str | None = Header(default=None)):
    record = read_record(pid)
    authorize(record, x_management_token)
    return {'id': pid, 'status': record['status'], 'expires_at': record['expires_at'],
            'matches': record.get('matches', []), 'application_queue': record.get('application_queue', []), 'last_run_at': record.get('last_run_at'),
            'cv_attached': bool(record.get('cv_attachment')),
            'note': 'Submission readiness checks only. No applications are submitted.'}


@app.delete('/api/cloud/packages/{pid}')
def revoke_package(pid: str, x_management_token: str | None = Header(default=None)):
    with lock:
        record = read_record(pid)
        authorize(record, x_management_token)
        path_for(pid).unlink()
    return {'revoked': True}


def purge_expired():
    """Call periodically from a scheduler; expiration also blocks status access."""
    if not STORE.exists():
        return 0
    removed = 0
    with lock:
        for path in STORE.glob('*.json'):
            try:
                if json.loads(path.read_text())['expires_at'] <= time.time():
                    path.unlink()
                    removed += 1
            except (OSError, ValueError, KeyError):
                pass
    return removed




class QueueDecision(BaseModel):
    job_id: str = Field(min_length=1, max_length=80)
    board: str = Field(min_length=2, max_length=80)
    decision: str  # approve_preparation or dismiss


@app.post('/api/cloud/packages/{pid}/queue')
def queue_decision(pid: str, decision: QueueDecision, x_management_token: str | None = Header(default=None)):
    """Queue preparation only. No external submission is performed."""
    if decision.decision not in ('approve_preparation', 'dismiss'):
        raise HTTPException(422, 'Unsupported decision')
    with lock:
        record = read_record(pid)
        authorize(record, x_management_token)
        matches = record.get('matches', [])
        match = next((m for m in matches if m['id'] == decision.job_id and m['board'] == decision.board), None)
        if match is None:
            raise HTTPException(404, 'Job not in this package matches')
        queue = record.setdefault('application_queue', [])
        existing = next((q for q in queue if q['id'] == decision.job_id and q['board'] == decision.board), None)
        if existing is not None:
            return {'job': existing, 'duplicate': True}
        item = {'id': match['id'], 'board': match['board'], 'title': match['title'],
                'url': match['url'], 'state': 'PREPARATION_APPROVED_NO_SUBMISSION' if decision.decision == 'approve_preparation' else 'DISMISSED',
                'created_at': int(time.time())}
        queue.append(item)
        write_record(pid, record)
        return {'job': item, 'duplicate': False}



class CvAttachment(BaseModel):
    consent: bool
    filename: str = Field(min_length=1, max_length=160)
    content_type: str
    data_base64: str = Field(min_length=1, max_length=3_000_000)


@app.post('/api/cloud/packages/{pid}/cv')
def attach_cv(pid: str, attachment: CvAttachment, x_management_token: str | None = Header(default=None)):
    """Optional, consented CV escrow; encrypted at rest, never served back to the browser."""
    ensure_key()
    if not attachment.consent:
        raise HTTPException(400, 'Separate CV transfer consent required')
    if attachment.content_type not in ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'):
        raise HTTPException(422, 'Only PDF and DOCX supported')
    try:
        raw = base64.b64decode(attachment.data_base64, validate=True)
    except (ValueError, base64.binascii.Error):
        raise HTTPException(422, 'Invalid base64')
    if not raw or len(raw) > MAX_CV_BYTES:
        raise HTTPException(413, 'CV must be 1 byte to 2 MiB')
    if attachment.content_type == 'application/pdf' and not raw.startswith(b'%PDF-'):
        raise HTTPException(422, 'Invalid PDF signature')
    if attachment.content_type.endswith('document') and not raw.startswith(b'PK\x03\x04'):
        raise HTTPException(422, 'Invalid DOCX signature')
    with lock:
        record = read_record(pid)
        authorize(record, x_management_token)
        nonce = secrets.token_bytes(12)
        encrypted = AESGCM(KEY).encrypt(nonce, raw, (pid + ':cv').encode())
        record['cv_attachment'] = {'filename': Path(attachment.filename).name, 'type': attachment.content_type,
                                   'nonce': base64.b64encode(nonce).decode(),
                                   'ciphertext': base64.b64encode(encrypted).decode(), 'size': len(raw)}
        write_record(pid, record)
    return {'stored_encrypted': True, 'size': len(raw), 'expires_at': record['expires_at']}


@app.delete('/api/cloud/packages/{pid}/cv')
def remove_cv(pid: str, x_management_token: str | None = Header(default=None)):
    with lock:
        record = read_record(pid)
        authorize(record, x_management_token)
        record['cv_attachment'] = None
        write_record(pid, record)
    return {'deleted': True}


@app.get('/api/cloud/packages/{pid}/queue/readiness')
def queue_readiness(pid: str, x_management_token: str | None = Header(default=None)):
    from cloud.submission import evaluate
    record = read_record(pid)
    authorize(record, x_management_token)
    payload = json.loads(AESGCM(KEY).decrypt(base64.b64decode(record['nonce']),
                         base64.b64decode(record['ciphertext']), pid.encode()))
    results = []
    for job in record.get('application_queue', []):
        result = evaluate(payload, job, cv_present=bool(record.get('cv_attachment')), authorization=False)
        results.append({'id': job['id'], 'board': job['board'], 'ready': result.ready,
                        'blockers': list(result.blockers), 'state': 'BLOCKED_NO_SUBMISSION'})
    return {'jobs': results, 'submissions_enabled': False}

@app.get('/api/cloud/health')
def health():
    return {'configured': KEY is not None, 'submissions_enabled': False}


@app.get('/')
def homepage():
    return FileResponse(ROOT / 'index.html')

@app.get('/index.html')
def index_html():
    return FileResponse(ROOT / 'index.html')

@app.get('/style.css')
def stylesheet():
    return FileResponse(ROOT / 'style.css')

app.mount('/src', StaticFiles(directory=ROOT / 'src'), name='src')


class PreviewRequest(BaseModel):
    job_id: str = Field(min_length=1, max_length=80)
    board: str = Field(min_length=2, max_length=80)
    authorize_this_job: bool = False
    # Untrusted form schemas cannot be asserted verified by callers.


@app.post('/api/cloud/packages/{pid}/applications/preview')
def application_preview(pid: str, request: PreviewRequest,
                        x_management_token: str | None = Header(default=None)):
    """Fail-closed per-job preview; never submits or exposes personal fields."""
    from cloud.adapter import prepare
    ensure_key()
    record = read_record(pid)
    authorize(record, x_management_token)
    job = next((j for j in record.get('application_queue', [])
                if j['id'] == request.job_id and j['board'] == request.board), None)
    if job is None:
        raise HTTPException(404, 'Job not in authorized queue')
    payload = json.loads(AESGCM(KEY).decrypt(base64.b64decode(record['nonce']),
                         base64.b64decode(record['ciphertext']), pid.encode()))
    # A job listing or browser request cannot assert an employer-verified adapter.
    result = prepare(payload, job, cv_present=bool(record.get('cv_attachment')),
                     authorization=request.authorize_this_job, schema=None)
    return {'job_id': request.job_id, 'board': request.board, 'ready': result.ready,
            'blockers': list(result.blockers), 'field_presence': result.fields,
            'fingerprint': result.fingerprint, 'submitted': False}

class SandboxAttemptRequest(BaseModel):
    board: str = Field(min_length=2, max_length=80)
    job_id: str = Field(min_length=1, max_length=80)
    consent_to_simulation: bool = False


@app.post('/api/cloud/packages/{pid}/applications/sandbox', status_code=200)
def sandbox_attempt(pid: str, request: SandboxAttemptRequest,
                    x_management_token: str | None = Header(default=None)):
    """Test receipt/idempotency workflow; NEVER sends an employer application."""
    from cloud.receipts import record_sandbox_attempt
    with lock:
        record = read_record(pid)
        authorize(record, x_management_token)
        try:
            receipt, duplicate = record_sandbox_attempt(
                record, package_id=pid, board=request.board,
                job_id=request.job_id, consent=request.consent_to_simulation)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        if not duplicate:
            write_record(pid, record)
    return {'receipt': receipt, 'duplicate': duplicate, 'real_application_submitted': False}


@app.get('/api/cloud/packages/{pid}/applications/receipts')
def list_receipts(pid: str, x_management_token: str | None = Header(default=None)):
    record = read_record(pid)
    authorize(record, x_management_token)
    return {'receipts': record.get('sandbox_receipts', []), 'real_application_submitted': False}
