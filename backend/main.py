from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from db import create_tables, find_search, save_search, get_sites, get_stats
from services.clinical_trials import fetch_clinical_trials, fetch_all_trials
import requests
import threading
import uuid

create_tables() 

app = FastAPI(
    title="Clinical Trial Explorer API",
    description="Backend API for exploring clinical trials worldwide",
    version="1.0.0"
)


# Allow React frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "Clinical Trial Explorer API is running",
        "status": "success"
    }


@app.get("/api/trials")
def get_trials(
    condition: str = "",
    drug: str = "",
    status: str = "",
    page_size: int = Query(default=20, ge=1, le=100),
    page_token: str | None = None
):
    try:
        results = fetch_clinical_trials(
            condition=condition,
            drug=drug,
            status=status,
            page_size=page_size,
            page_token=page_token
        )

        return results

    except requests.RequestException as error:
        print(f"ClinicalTrials.gov API Error: {error}")

        raise HTTPException(
            status_code=502,
            detail=str(error)
        )

@app.get("/api/trials/all")
def get_all_trials(condition: str = "", drug: str = "", status: str = ""):
    try:
        return fetch_all_trials(condition=condition, drug=drug, status=status)
    except requests.RequestException as error:
        raise HTTPException(status_code=502, detail=str(error))
    
jobs = {}  # Stores progress information for each search job


def run_search_job(job_id, condition, drug, status):

    # Callback function: updates progress after each page
    def update(done, goal):
        jobs[job_id]["fetched"] = done
        jobs[job_id]["goal"] = goal

    try:
        # Download clinical trials
        result = fetch_all_trials(
            condition=condition,
            drug=drug,
            status=status,
            on_progress=update
        )

        # Save downloaded trials into SQLite
        jobs[job_id]["search_id"] = save_search(
            condition, drug, status, result
        )

        # Mark the job as completed
        jobs[job_id]["state"] = "done"

    except requests.RequestException as error:
        # Handle API/network errors
        jobs[job_id]["state"] = "error"
        jobs[job_id]["error"] = str(error)
    
@app.get("/api/search")
def search(condition: str = "", drug: str = "", status: str = ""):
    condition = condition.strip().lower()
    drug = drug.strip().lower()
    status = status.strip().upper()

    # Already in the notebook? Answer instantly, no job needed
    cached = find_search(condition, drug, status)
    if cached:
        return {
            "state": "done",
            "search_id": cached["id"],
            "fetched": cached["fetched"],
            "goal": cached["fetched"],
            "from_cache": True,
        }

    # Not cached: start a background job and answer right away
    job_id = uuid.uuid4().hex
    jobs[job_id] = {"state": "running", "fetched": 0, "goal": None, "search_id": None}

    threading.Thread(
        target=run_search_job,
        args=(job_id, condition, drug, status),
        daemon=True,
    ).start()

    return {"job_id": job_id, "state": "running", "from_cache": False}


@app.get("/api/jobs/{job_id}")
def job_progress(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]
    
@app.get("/api/searches/{search_id}/sites")
def search_sites(search_id: int, phase: str = "", status: str = "", country: str = "",
                 year_from: int | None = None, year_to: int | None = None):
    return get_sites(search_id, phase, status, country, year_from, year_to)

@app.get("/api/searches/{search_id}/stats")
def search_stats(search_id: int, phase: str = "", status: str = "", country: str = "",
                 year_from: int | None = None, year_to: int | None = None):
    return get_stats(search_id, phase, status, country, year_from, year_to)