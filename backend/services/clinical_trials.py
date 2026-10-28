import requests

BASE_URL = "https://clinicaltrials.gov/api/v2/studies"


def fetch_clinical_trials(
    condition=None,
    drug=None,
    status=None,
    page_size=20,
    page_token=None
):
    params = {
        "format": "json",
        "pageSize": page_size,
        "countTotal": "true"
    }

    # Search by disease
    if condition:
        params["query.cond"] = condition

    # Search by drug
    if drug:
        params["query.intr"] = drug

    # Filter by trial status
    if status:
        params["filter.overallStatus"] = status

    # Pagination
    if page_token:
        params["pageToken"] = page_token

    response = requests.get(
        BASE_URL,
        params=params,
        timeout=30
    )

    response.raise_for_status()

    data = response.json()
    
    clean_studies = []
    for study in data.get("studies", []):
        clean_studies.append(parse_study(study))

    return {
        "total_trials": data.get("totalCount", 0),
        "studies": clean_studies,
        "next_page_token": data.get("nextPageToken")
    }
def parse_study(study):
    protocol = study.get("protocolSection", {})
    ident = protocol.get("identificationModule", {})
    status = protocol.get("statusModule", {})
    sponsor = protocol.get("sponsorCollaboratorsModule", {})
    design = protocol.get("designModule", {})
    contacts = protocol.get("contactsLocationsModule", {})
    
    sites = []
    for location in contacts.get("locations", []):
        geo = location.get("geoPoint", {})
        sites.append({
            "facility": location.get("facility", ""),
            "city": location.get("city", ""),
            "country": location.get("country", "Unknown"),
            "lat": geo.get("lat"),
            "lon": geo.get("lon"),
        })
    
    return {
        "nct_id": ident.get("nctId"),
        "title": ident.get("briefTitle",  ""),
        "status": status.get("overallStatus", "UNKNOWN"),
        "phase": design.get("phases", []),
        "sponsor": sponsor.get("leadSponsor", {}).get("name", "Unknown"),
        "enrollment": design.get("enrollmentInfo", {}).get("count"),
        "start_date": status.get("startDateStruct", {}).get("date"),
        "sites": sites,
    }
def fetch_all_trials(condition=None, drug=None, status=None, max_trials=1000):
    all_studies = []
    page_token = None
    total = None
    
    while True: 
        result = fetch_clinical_trials(
            condition = condition,
            drug = drug,
            status = status,
            page_size = 100,
            page_token = page_token
        )
        
        all_studies.extend(result["studies"])
        
        if total is None:
            total = result["total_trials"]
            
        page_token = result["next_page_token"]
        
        if not page_token or len(all_studies) >= max_trials:
            break
    return {
        "total_trials": total,
        "fetched": len(all_studies),
        "studies": all_studies
    }

        
        
    