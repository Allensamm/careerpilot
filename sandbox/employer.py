"""Local-only fictional employer. NEVER use real applicant data."""
import secrets
from fastapi import FastAPI, Form, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse

app = FastAPI(title='Fictional employer sandbox', docs_url=None, redoc_url=None)
RECEIPTS = {}

@app.get('/jobs/demo-001', response_class=HTMLResponse)
def job_form():
    return '''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
    <h1>Fictional Employer — Demo Engineer</h1><p>LOCAL SANDBOX ONLY. No actual employer receives this form.</p>
    <form action="/jobs/demo-001/apply" method="post" enctype="multipart/form-data">
    <label>Full name <input name="full_name" required></label>
    <label>Email <input name="email" type="email" required></label>
    <label>Work authorization <select name="work_authorized" required><option value="">Choose</option><option value="yes">Yes</option><option value="no">No</option></select></label>
    <label>CV <input name="cv" type="file" accept=".pdf,.docx" required></label>
    <button type="submit">Submit fictional application</button></form></body></html>'''

@app.post('/jobs/demo-001/apply', response_class=HTMLResponse)
async def submit(full_name: str = Form(...), email: str = Form(...), work_authorized: str = Form(...), cv: UploadFile = File(...)):
    raw = await cv.read(2 * 1024 * 1024 + 1)
    if not full_name.strip() or '@' not in email or work_authorized not in ('yes','no') or not raw or len(raw)>2*1024*1024:
        raise HTTPException(422, 'Invalid application')
    if not ((cv.filename or '').lower().endswith('.pdf') and raw.startswith(b'%PDF-')) and not ((cv.filename or '').lower().endswith('.docx') and raw.startswith(b'PK\x03\x04')):
        raise HTTPException(422, 'Only PDF or DOCX CV accepted')
    reference = 'DEMO-' + secrets.token_hex(6).upper()
    # Only non-PII reference retained in memory; no CV, name or email persisted.
    RECEIPTS[reference] = True
    return f'<h1>Fictional submission received</h1><p data-testid="confirmation">{reference}</p><p>No real employer was contacted.</p>'

@app.get('/health')
def health():
    return {'sandbox': True, 'real_employer': False}
