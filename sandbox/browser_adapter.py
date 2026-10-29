"""Playwright adapter restricted to the bundled fictional employer on loopback.

Runs only with explicit per-job consent and a locally supplied test CV.
Does not bypass CAPTCHAs or submit to real sites.
"""
import argparse
import asyncio
import re
from pathlib import Path
from urllib.parse import urlparse

ALLOWED_HOSTS = {'127.0.0.1', 'localhost'}
ALLOWED_PATH = '/jobs/demo-001'


def validate_sandbox_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme != 'http' or parsed.hostname not in ALLOWED_HOSTS or parsed.path != ALLOWED_PATH or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError('Only the local fictional employer job page is permitted')
    if parsed.port not in (8765,):
        raise ValueError('Only sandbox port 8765 is permitted')


def validate_application(name: str, email: str, authorized: str, cv: Path, consent: bool) -> None:
    if not consent:
        raise ValueError('Explicit sandbox submission consent required')
    if not name.strip() or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email):
        raise ValueError('Name and valid email required')
    if authorized not in ('yes', 'no'):
        raise ValueError('Verified work authorization answer required')
    if cv.suffix.lower() not in ('.pdf', '.docx') or not cv.is_file() or cv.stat().st_size > 2*1024*1024:
        raise ValueError('Existing PDF/DOCX CV <=2 MiB required')
    signature = cv.read_bytes()[:5]
    if (cv.suffix.lower() == '.pdf' and not signature.startswith(b'%PDF-')) or (cv.suffix.lower() == '.docx' and not signature.startswith(b'PK\x03\x04')):
        raise ValueError('Invalid CV file signature')


async def submit_sandbox(*, url: str, name: str, email: str, authorized: str, cv: Path, consent: bool) -> dict:
    validate_sandbox_url(url)
    validate_application(name, email, authorized, cv, consent)
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page()
            await page.goto(url, wait_until='domcontentloaded', timeout=10000)
            await page.locator('input[name="full_name"]').fill(name)
            await page.locator('input[name="email"]').fill(email)
            await page.locator('select[name="work_authorized"]').select_option(authorized)
            await page.locator('input[name="cv"]').set_input_files(str(cv.resolve()))
            await page.get_by_role('button', name='Submit fictional application').click()
            confirmation = (await page.get_by_test_id('confirmation').inner_text(timeout=10000)).strip()
            if not re.fullmatch(r'DEMO-[0-9A-F]{12}', confirmation):
                raise RuntimeError('Fictional employer confirmation not verified')
            return {'status': 'LOCAL_SANDBOX_CONFIRMED', 'reference': confirmation, 'real_employer': False}
        finally:
            await browser.close()


def main():
    parser = argparse.ArgumentParser(description='Local fictional employer Playwright demonstration')
    parser.add_argument('--url', default='http://127.0.0.1:8765/jobs/demo-001')
    parser.add_argument('--name', required=True)
    parser.add_argument('--email', required=True)
    parser.add_argument('--work-authorized', choices=('yes','no'), required=True)
    parser.add_argument('--cv', type=Path, required=True)
    parser.add_argument('--consent-to-sandbox-submit', action='store_true')
    args = parser.parse_args()
    result = asyncio.run(submit_sandbox(url=args.url, name=args.name, email=args.email, authorized=args.work_authorized, cv=args.cv, consent=args.consent_to_sandbox_submit))
    print(result)

if __name__ == '__main__':
    main()
