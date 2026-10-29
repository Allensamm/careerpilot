# CareerPilot v1.5 — safe worker coordination

# CareerPilot v0.6 — local vault + opt-in encrypted cloud package

This is a **development prototype**, not a production 24/7 auto-apply system.

## Privacy model

- CV text, full candidate profile, local preferences, and package management token stay in an encrypted IndexedDB vault on the user's device.
- Only after an explicit checkbox and click, the browser sends **name, email, role, region, and detected skills** over the same-origin API to the cloud service.
- The server **sees these fields in plaintext during the HTTPS request and in worker memory**, then encrypts the package at rest with AES-256-GCM using a server-held key. This is **not end-to-end encryption or zero-knowledge**.
- The server stores encrypted JSON package files (not a database) for up to 24 hours. **No CV is uploaded** by this prototype. Real ATS submission will require an additional consented CV/document flow and a dedicated retention policy.
- A capability token for package status/deletion is stored in the user's encrypted browser vault; the server stores only its SHA-256 hash. Losing the local vault can make manual deletion unavailable until expiration/purge.
- This build does **not** perform job submissions, run background matching, or implement a scheduler. `QUEUED_DEMO_ONLY` means only that a package is saved.
- Expired packages are inaccessible by API, but physical deletion requires a periodic `purge_expired()` scheduler call. **Set up this scheduler before any real deployment**.
- Browser vault and cloud package are separate. Erasing the browser vault does **not** automatically revoke a cloud package. Revoke it first.

## Local setup

Requires Python 3.10+ and Node 20+ for tests.

```bash
python -m pip install -r cloud/requirements.txt
python -c "import base64,os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
```

Set the output as `CAREERPILOT_CLOUD_KEY` in your terminal environment. **Do not commit it**.

```bash
export CAREERPILOT_CLOUD_KEY='your-generated-value'
uvicorn cloud.service:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000. For local testing only, use **fictional profile information**. Avoid public hosting until authentication, TLS, rate limiting, secure key management, automated expiry deletion, audit/security review, and submission authorization are implemented.

## Tests

```bash
npm test
python -m unittest discover -s cloud -p 'test_*.py'
```

## Planned next steps

1. Authenticated tenant isolation and secure account recovery without retaining complete profiles.
2. Dedicated cloud worker with durable, auditable tasks, automatic TTL purge, and explicit per-job eligibility rules.
3. Employer-supported application integrations with verified receipts and duplicate prevention.
4. Consent versioning, per-job authorization boundaries, pause/revoke controls, and a real threat model.

The optional localhost desktop agent remains for users who prefer device execution, but is **not required** for the cloud prototype.

## v0.7: Offline-phone cloud discovery worker (no submissions)

The cloud worker reads explicitly consented, encrypted packages, queries selected public Greenhouse boards, performs a **preliminary title/skill match**, and writes public job references and a review-only status. It does **not** submit applications, upload CVs, or claim eligibility. The worker is intentionally independent of the phone being on.

Run one pass with `python -m cloud.worker` from the project root, using the same `CAREERPILOT_CLOUD_KEY` and `CAREERPILOT_PACKAGE_DIR` as the API. For repeated execution use `python -m cloud.worker --loop` under a managed process supervisor. Package expiration remains 24 hours; automatic purge runs with the worker. **The 24-hour expiry means users must renew consent and packages for uninterrupted operation beyond a day.**

The browser's Greenhouse board token is included in the consented package. The status endpoint returns preliminary public job matches. Matching is deliberately conservative and incomplete: it only checks job titles and skills, and does not infer work authorization, eligibility, or application answers. This is not a live application engine.

**Deployment warning:** The prototype still lacks user accounts, rate limiting, hardened auth, a durable distributed job queue, secure key management, observability, consent versioning, and a real ATS integration. Do not deploy publicly with real candidate data. Cloud workers can decrypt the minimal package; it is not zero knowledge. A live submission workflow requires explicit scoped authorization, verified answers and documents, employer-supported integrations, idempotency and receipts.

## v0.8 — application preparation queue (NOT real submission)

The cloud package accepts optional `auto_queue: true` **only with explicit user consent**.
Matching public jobs are then added to a durable, idempotent per-package preparation queue.
If `auto_queue` is false, the package owner can approve preparation using
`POST /api/cloud/packages/{id}/queue` with the management token and
`{"job_id":"...","board":"...","decision":"approve_preparation"}`.
`dismiss` is also supported. Queue status is returned by the existing authenticated
`GET /api/cloud/packages/{id}` endpoint. Deleting the package deletes its queue.

**Important:** No real job applications are sent. Queueing is not submission.
The current cloud package lacks a full CV, verified employment history, work authorization,
and employer-specific question answers. Those must be explicitly authorized and validated
before a future submission adapter can safely operate. Cloud-held packages remain decryptable
by the server and expire after 24 hours; use fictional details only for this prototype.

Test with `python -m unittest discover -s cloud -p 'test_*.py' -v`.

## v0.9 — Optional encrypted CV escrow and submission readiness (no live submissions)

- `POST /api/cloud/packages/{id}/cv`: upload a PDF/DOCX (max 2 MiB) with **separate explicit consent** and management token. CV is AES-GCM encrypted on disk, bound to package ID, and expires with the package.
- `DELETE /api/cloud/packages/{id}/cv`: delete escrowed attachment from the active package.
- `GET /api/cloud/packages/{id}/queue/readiness`: fail-closed readiness report. It blocks jobs without verified applicant facts, eligibility, employer form schema, approved adapter, attachment, and explicit submission authorization.
- **No real application submission occurs**; there is no external submission adapter. The 24-hour package TTL remains in place.
- CV escrow is not zero-knowledge: the cloud service holds the decryption key. File signature checks are not malware scanning or complete document validation. Do not use real personal data or deploy publicly before authentication, per-user authorization, key management, rate limiting, malware scanning, audit, retention and backup deletion policies are implemented.
- Storage is local to the server's filesystem, not a traditional database, but **it is still cloud-held personal data**.

Run tests: `python -m unittest discover -s cloud -p 'test_*.py'` and `npm test`.

## v1.0 — fail-closed application adapter preview (no live submissions)

Added `cloud/adapter.py` with an allowlisted mapping for standard identity fields,
explicit checks for verified employer form schemas, work eligibility, attached CV,
per-job authorization, and unmapped screening questions. An application fingerprint
supports future idempotency. The preview API is:

`POST /api/cloud/packages/{id}/applications/preview` with management token and
JSON `{ "job_id": "...", "board": "...", "authorize_this_job": true }`.

It returns blockers and field **presence**, never the applicant's raw answers.
Importantly, callers cannot mark employer schemas as verified: that requires a
separate trusted integration process. **No actual applications are submitted.**
Public Greenhouse listing access does not imply permission to use an employer's
application submission endpoint. Production submission requires documented
employer/ATS authorization, a verified adapter, complete applicant data, secure
receipts, deduplication, audit logging, and a security review.

## v1.1 — sandbox submission receipts

This release introduces a **non-networked sandbox application-attempt ledger**. It records
explicitly consented simulation attempts for previously approved queue items, prevents
duplicate attempts by package/board/job fingerprint, and exposes receipt status without
candidate PII. It **does not send any application to any employer**.

- `POST /api/cloud/packages/{id}/applications/sandbox` with management token header
  `X-Management-Token` and JSON `{"board":"...","job_id":"...","consent_to_simulation":true}`
- `GET /api/cloud/packages/{id}/applications/receipts` with the same header.
- Revoking or expiring a package removes its receipt ledger along with its cloud data.
- Real submissions require a verified employer-supported API, applicant field completeness,
  durable cross-worker idempotency, operational audit controls, and consent before enablement.

**Security:** This remains a development prototype, not a production deployment. The
management token is a bearer secret; protect it. Cloud escrow is decryptable by the service.

## v1.2 — Free Playwright integration with fictional employer (sandbox only)

This release adds `sandbox/employer.py`, a local-only fictional employer application form, and `sandbox/browser_adapter.py`, a **strictly loopback-restricted** Playwright form filler. It demonstrates field mapping, CV upload, explicit consent, and verification of a fictional confirmation receipt. It does **not** connect to any real employer, is **not** wired into cloud autopilot, and makes **no real applications**. No paid API is required.

Install the Python requirements and browser binaries:

```bash
python -m pip install -r cloud/requirements.txt
python -m playwright install chromium
```

In terminal A, start the fictional employer **on your own machine**:

```bash
uvicorn sandbox.employer:app --host 127.0.0.1 --port 8765
```

In terminal B, use a **fictional** name/email and a small **test-only** PDF/DOCX file (never a real CV):

```bash
python -m sandbox.browser_adapter --name 'Demo User' --email demo@example.test --work-authorized yes --cv /path/to/fictional.pdf --consent-to-sandbox-submit
```

You should see `LOCAL_SANDBOX_CONFIRMED` with a `DEMO-...` reference. The fictional employer stores only the non-personal reference in process memory. Run unit tests with `python -m unittest discover -s sandbox -p 'test_*.py'` plus the existing tests. Browser integration requires installed Chromium and a running sandbox server; unit tests do not.

**Security caveats:** The cloud prototype still has significant limitations (including a 24-hour authorization expiry and missing production authentication). The local sandbox adapter is intentionally hardcoded to `127.0.0.1`/`localhost` port 8765 and cannot target third-party sites. Real employer integration requires a separately verified, permitted submission method and robust eligibility checks. There are no paid software licenses; always-on hosting can still cost money.

## v1.3 — Durable fictional-employer queue runner

This version adds `sandbox/queue_runner.py`, a local queue runner connected to the v1.2 Playwright fictional-employer adapter. It persists sandbox job state in a local JSON file (not a database) with restrictive file permissions and atomic writes, records an attempt before the network request, and **never automatically retries an uncertain submission**. It only accepts `demo-001` on the bundled loopback fictional employer; it cannot submit to real sites. This is a separate sandbox demonstration, **not yet connected to the cloud worker's candidate packages**. Use fictional data only. The queue file contains job state and a fictional receipt, not CV contents or candidate identity.

In terminal 1, run the fictional employer: `uvicorn sandbox.employer:app --host 127.0.0.1 --port 8765`.

In terminal 2, enqueue and run a fictional application:

```bash
python -m sandbox.queue_runner --enqueue --consent-to-sandbox-submit
python -m sandbox.queue_runner --run --consent-to-sandbox-submit --cv /path/to/fictional.pdf
```

The CV must be a locally available test PDF or DOCX. The Playwright Chromium browser must be installed (`python -m playwright install chromium`). For an unknown outcome the queue requires manual reconciliation; this prevents accidental duplicate submissions. The local queue is single-process only and is not safe for concurrent workers. This is not a hosted 24/7 submission service. Cloud package expiry is still 24 hours.

## v1.4 — Cloud-worker-shaped sandbox execution bridge

`cloud/sandbox_bridge.py` adds a **fictional-only** submission executor with a
persisted queue, explicit consent, fail-closed attempt marker, confirmation
validation, and no automatic retry after uncertain outcomes. This is an
integration seam for the future hosted worker, **not** a production cloud
submission integration. It deliberately does not read real encrypted candidate
packages or send CVs from the cloud to any real employer.

Start the bundled fictional employer (separate terminal):

```bash
uvicorn sandbox.employer:app --host 127.0.0.1 --port 8765
```

Then enqueue and execute with a **fictional PDF** and `@example.test` identity:

```bash
python -m cloud.sandbox_bridge --enqueue --consent-to-sandbox-submit
python -m cloud.sandbox_bridge --run --consent-to-sandbox-submit --cv /path/to/fictional.pdf
```

Install dependencies from `cloud/requirements.txt` and Chromium using
`python -m playwright install chromium`. For automated tests run
`python -m unittest discover -s cloud -p 'test_*.py'` and
`python -m unittest discover -s sandbox -p 'test_*.py'`.

**Security scope:** Single-process queue only. Do not run concurrent workers
against the same file. No live employer submissions, no cloud candidate package
bridge, no distributed lease/lock, no production-grade identity management.
Do not deploy this demo with real personal data.


## v1.5 changes

- Persistent sandbox queue now uses a stable `.lock` sidecar and POSIX `flock` plus a thread mutex to serialize claiming and enqueue operations across local workers.
- The `IN_FLIGHT_UNCERTAIN` marker is persisted before the sandbox form is submitted. A second worker will not submit the same job.
- Added a parallel-worker test exercising eight concurrent claim attempts.
- This locking is for a **single shared local filesystem** only; it is not distributed coordination across hosts or network filesystems. For multiple cloud hosts use a transactional queue with lease fencing and durable atomic compare-and-set.
- Real candidate packages and real employer submissions remain deliberately disconnected.
- The `.lock` sidecar does not store candidate information.

Run tests: `python -m unittest discover -s cloud -p 'test_*.py'`
