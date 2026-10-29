"""Public job-feed aggregation. No CVs or personal information are sent to job feeds."""
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse
from fastapi import APIRouter

router = APIRouter()
SOURCES = {
    "remotive": "https://remotive.com/api/remote-jobs?limit=100",
    "arbeitnow": "https://www.arbeitnow.com/api/job-board-api",
}
def get_json(url):
    request = urllib.request.Request(url, headers={"User-Agent": "CareerPilot/1.0 (public job discovery)", "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=8) as response:
        if int(response.headers.get("Content-Length", "0")) > 4000000:
            return {}
        return json.loads(response.read(4000000))

def normalize(name, payload):
    if name == "remotive":
        items = payload.get("jobs", [])
    else:
        items = payload.get("data", [])
    output = []
    for item in items[:150]:
        title = str(item.get("title") or "")[:180]
        company = str(item.get("company_name") or item.get("company") or "Employer")[:100]
        url = str(item.get("url") or "")
        parsed = urlparse(url)
        if not title or parsed.scheme != "https" or not parsed.netloc:
            continue
        location = item.get("candidate_required_location") or item.get("location") or "Location not specified"
        tags = item.get("tags") or []
        description = item.get("description") or ""
        if not isinstance(description, str):
            description = ""
        output.append({"id": name + ":" + str(item.get("id") or item.get("slug") or url),
                       "title": title, "company": company, "location": str(location)[:120],
                       "url": url, "description": description[:1200],
                       "source": name, "tags": tags[:10] if isinstance(tags, list) else []})
    return output

@router.get("/api/jobs/public")
def public_jobs():
    jobs = []
    checked = {}
    with ThreadPoolExecutor(max_workers=2) as executor:
        tasks = {executor.submit(get_json, url): name for name, url in SOURCES.items()}
        for future in as_completed(tasks):
            name = tasks[future]
            try:
                data = normalize(name, future.result())
                checked[name] = len(data)
                jobs.extend(data)
            except Exception:
                checked[name] = 0
    seen = set()
    unique = []
    for job in jobs:
        if job["url"] not in seen:
            unique.append(job)
            seen.add(job["url"])
    return {"jobs": unique, "sources": checked, "note": "Listings are supplied by external public feeds. Check the employer page for availability and eligibility."}
