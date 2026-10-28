from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from db import create_tables, find_search, save_search, get_sites, get_stats
from services.clinical_trials import fetch_clinical_trials, fetch_all_trials
import requests

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
    
@app.get("/api/search")
def search(condition: str = "", drug: str = "", status: str = ""):
    # Clean the input so "Obesity " and "obesity" count as the same search
    condition = condition.strip().lower()
    drug = drug.strip().lower()
    status = status.strip().upper()

    cached = find_search(condition, drug, status)
    if cached:
        return {
            "search_id": cached["id"],
            "total_trials": cached["total_trials"],
            "fetched": cached["fetched"],
            "from_cache": True,
        }

    try:
        result = fetch_all_trials(condition=condition, drug=drug, status=status)
    except requests.RequestException as error:
        raise HTTPException(status_code=502, detail=str(error))

    search_id = save_search(condition, drug, status, result)
    return {
        "search_id": search_id,
        "total_trials": result["total_trials"],
        "fetched": result["fetched"],
        "from_cache": False,
    }
    
@app.get("/api/searches/{search_id}/sites")
def search_sites(search_id: int, phase: str = "", status: str = "", country: str = ""):
    return get_sites(search_id, phase, status, country)

@app.get("/api/searches/{search_id}/stats")
def search_stats(search_id: int, phase: str = "", status: str = "", country: str = ""):
    return get_stats(search_id, phase, status, country)