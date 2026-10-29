"""Local-only opt-in agent control plane. No CV/profile exchange or ATS submissions."""
import json
import os
import secrets
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = '127.0.0.1'
PORT = int(os.environ.get('CAREERPILOT_AGENT_PORT', '8765'))
ALLOWED_ORIGINS = {'http://localhost:8000', 'http://127.0.0.1:8000'}
PAIR_CODE = f'{secrets.randbelow(1000000):06d}'
STATE = {'token': None, 'jobs': [], 'paired': False}
LOCK = threading.Lock()

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # Never log request bodies, codes or tokens.
        pass

    def _origin(self):
        return self.headers.get('Origin', '')

    def _headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        if self._origin() in ALLOWED_ORIGINS:
            self.send_header('Access-Control-Allow-Origin', self._origin())
            self.send_header('Vary', 'Origin')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.end_headers()

    def _reply(self, obj, status=200):
        self._headers(status)
        self.wfile.write(json.dumps(obj).encode())

    def _trusted(self):
        return self._origin() in ALLOWED_ORIGINS

    def _authorized(self):
        with LOCK:
            token = STATE['token']
        return bool(token and secrets.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + token))

    def do_OPTIONS(self):
        if not self._trusted():
            return self._reply({'error': 'Origin not allowed'}, 403)
        self._headers(204)

    def do_GET(self):
        if not self._trusted():
            return self._reply({'error': 'Origin not allowed'}, 403)
        if self.path == '/v1/health':
            return self._reply({'ok': True, 'agent': 'CareerPilot', 'version': '0.5', 'paired': STATE['paired'], 'submissionsEnabled': False})
        if self.path == '/v1/queue':
            if not self._authorized():
                return self._reply({'error': 'Unauthorized'}, 401)
            with LOCK:
                jobs = list(STATE['jobs'])
            return self._reply({'jobs': jobs, 'submissionsEnabled': False})
        return self._reply({'error': 'Not found'}, 404)

    def do_POST(self):
        if not self._trusted():
            return self._reply({'error': 'Origin not allowed'}, 403)
        if self.headers.get('Content-Type', '').split(';')[0].strip() != 'application/json':
            return self._reply({'error': 'JSON required'}, 415)
        try:
            n = int(self.headers.get('Content-Length', '-1'))
            if not 0 <= n <= 4096:
                return self._reply({'error': 'Invalid request size'}, 413)
            payload = json.loads(self.rfile.read(n))
            if not isinstance(payload, dict):
                raise ValueError('Object required')
        except (ValueError, json.JSONDecodeError):
            return self._reply({'error': 'Invalid JSON'}, 400)
        if self.path == '/v1/pair':
            code = payload.get('code', '')
            if not isinstance(code, str) or not secrets.compare_digest(code, PAIR_CODE):
                return self._reply({'error': 'Incorrect pairing code'}, 403)
            with LOCK:
                STATE['token'] = secrets.token_urlsafe(32)
                STATE['paired'] = True
                token = STATE['token']
            return self._reply({'token': token, 'submissionsEnabled': False})
        if not self._authorized():
            return self._reply({'error': 'Unauthorized'}, 401)
        if self.path == '/v1/queue':
            # Public job identifiers only. No CV, contact details or applications.
            job_id = payload.get('jobId')
            if not isinstance(job_id, str) or not 1 <= len(job_id) <= 120 or not all(c.isalnum() or c in ':_-.' for c in job_id):
                return self._reply({'error': 'Invalid public job ID'}, 400)
            with LOCK:
                if job_id not in STATE['jobs']:
                    STATE['jobs'].append(job_id)
            return self._reply({'queued': True, 'jobId': job_id, 'submissionsEnabled': False})
        if self.path == '/v1/unpair':
            with LOCK:
                STATE['token'] = None
                STATE['paired'] = False
                STATE['jobs'].clear()
            return self._reply({'unpaired': True})
        return self._reply({'error': 'Not found'}, 404)


def run():
    print('CareerPilot local agent (no application submissions)')
    print(f'Pairing code: {PAIR_CODE}')
    print(f'Listening only on http://{HOST}:{PORT}')
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()

if __name__ == '__main__':
    run()
