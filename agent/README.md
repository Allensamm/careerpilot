# Optional local agent — architecture scaffold

This is **not** an autonomous submitter yet. The first runnable local component is an offline PDF/DOCX/TXT parser.

Install dependencies locally: `python -m pip install -r agent/requirements.txt`.
Run: `python agent/parse_cv.py /path/to/cv.pdf`.
Import the resulting `.extracted.txt` into the browser app, then delete that plaintext intermediate file.

Planned architecture:
- Tauri desktop shell with OS keychain integration and explicit permissions.
- Loopback-only API with origin allowlist, short-lived pairing tokens and CSRF protection.
- Local encrypted vault shared through an explicit user-approved pairing/export protocol (never direct web-page filesystem access).
- OS-managed background worker, authorized employer adapters, durable application queue and receipts.
- No browser extension or remote server is required to read the CV.

**Threat boundary:** The web vault and desktop agent are not yet paired. There is no submission automation in this release. A local agent cannot work when the device is powered off.
