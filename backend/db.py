import sqlite3
from datetime import datetime, timezone 

DB_FILE = "clinical_trials.db"


def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row   # lets us read rows like dictionaries
    return conn


def create_tables():
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS searches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            condition TEXT,
            drug TEXT,
            status TEXT,
            total_trials INTEGER,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS trials (
            search_id INTEGER,
            nct_id TEXT,
            title TEXT,
            status TEXT,
            phase TEXT,
            sponsor TEXT,
            enrollment INTEGER,
            start_date TEXT
        );

        CREATE TABLE IF NOT EXISTS sites (
            search_id INTEGER,
            nct_id TEXT,
            facility TEXT,
            city TEXT,
            country TEXT,
            lat REAL,
            lon REAL
        );
    """)
    conn.commit()
    conn.close()
    
def save_search(condition, drug, status, result):
    conn = get_connection()

    # 1. Write one row in "searches" and get its new id
    cursor = conn.execute(
        "INSERT INTO searches (condition, drug, status, total_trials, created_at) VALUES (?, ?, ?, ?, ?)",
        (condition, drug, status, result["total_trials"], datetime.now(timezone.utc).isoformat()),
    )
    search_id = cursor.lastrowid

    # 2. Write each trial, and each of its sites
    for study in result["studies"]:
        conn.execute(
            "INSERT INTO trials VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (search_id, study["nct_id"], study["title"], study["status"],
             "/".join(study["phase"]), study["sponsor"],
             study["enrollment"], study["start_date"]),
        )
        for site in study["sites"]:
            conn.execute(
                "INSERT INTO sites VALUES (?, ?, ?, ?, ?, ?, ?)",
                (search_id, study["nct_id"], site["facility"], site["city"],
                 site["country"], site["lat"], site["lon"]),
            )

    conn.commit()
    conn.close()
    return search_id

def find_search(condition, drug, status):
    conn = get_connection()
    row = conn.execute(
        """
        SELECT s.id, s.total_trials,
               (SELECT COUNT(*) FROM trials t WHERE t.search_id = s.id) AS fetched
        FROM searches s
        WHERE s.condition = ? AND s.drug = ? AND s.status = ?
        ORDER BY s.id DESC
        LIMIT 1
        """,
        (condition, drug, status),
    ).fetchone()
    conn.close()
    return row

def get_sites(search_id, phase="", status="", country=""):
    where, params = trial_filters(search_id, phase, status, country)

    # On the map, a country filter should also hide pins in other countries
    if country:
        where += " AND s.country = ?"
        params.append(country)

    conn = get_connection()

    rows = conn.execute(
        f"""
        SELECT s.nct_id, s.facility, s.city, s.country, s.lat, s.lon,
               t.title, t.status
        FROM sites s
        JOIN trials t ON t.search_id = s.search_id AND t.nct_id = s.nct_id
        WHERE {where} AND s.lat IS NOT NULL AND s.lon IS NOT NULL
        """,
        params,
    ).fetchall()

    missing = conn.execute(
        f"""
        SELECT COUNT(*) FROM sites s
        JOIN trials t ON t.search_id = s.search_id AND t.nct_id = s.nct_id
        WHERE {where} AND (s.lat IS NULL OR s.lon IS NULL)
        """,
        params,
    ).fetchone()[0]

    conn.close()
    return {
        "sites": [dict(row) for row in rows],
        "missing_coordinates": missing,
    }
    
def get_stats(search_id, phase="", status="", country=""):
    where, params = trial_filters(search_id, phase, status, country)
    conn = get_connection()

    kpis = conn.execute(
        f"""
        SELECT COUNT(*) AS total_trials,
               COALESCE(SUM(t.enrollment), 0) AS total_enrollment,
               COALESCE(SUM(CASE WHEN t.status = 'RECRUITING' THEN 1 ELSE 0 END), 0) AS recruiting
        FROM trials t WHERE {where}
        """,
        params,
    ).fetchone()

    country_where = where
    country_params = list(params)

    if country:
        country_where += " AND s.country = ?"
        country_params.append(country)

    countries = conn.execute(
        f"""
        SELECT COUNT(DISTINCT s.country)
        FROM sites s
        JOIN trials t
            ON t.search_id = s.search_id
            AND t.nct_id = s.nct_id
        WHERE {country_where}
        AND s.country != 'Unknown'
        """,
        country_params,
    ).fetchone()[0]

    # Helper: run a GROUP BY query using the same filters
    def group(select, group_by, order_by, extra=""):
        sql = f"SELECT {select} FROM trials t WHERE {where} {extra} GROUP BY {group_by} ORDER BY {order_by}"
        return [dict(row) for row in conn.execute(sql, params).fetchall()]

    by_status = group("t.status AS label, COUNT(*) AS count", "t.status", "count DESC")
    by_phase = group(
        "CASE WHEN t.phase IN ('', 'NA') THEN 'N/A' ELSE t.phase END AS label, COUNT(*) AS count",
        "label", "count DESC",
    )
    top_sponsors = group("t.sponsor AS label, COUNT(*) AS count", "t.sponsor", "count DESC LIMIT 10")
    by_year = group(
        "SUBSTR(t.start_date, 1, 4) AS label, COUNT(*) AS count",
        "label", "label", extra="AND t.start_date IS NOT NULL",
    )

    conn.close()
    return {
        "kpis": {**dict(kpis), "countries": countries},
        "by_status": by_status,
        "by_phase": by_phase,
        "top_sponsors": top_sponsors,
        "by_year": by_year,
    }
    
def trial_filters(search_id, phase="", status="", country=""):
    """Build the WHERE part for the trials table (nickname t)."""
    where = "t.search_id = ?"
    params = [search_id]

    if phase == "N/A":
        where += " AND t.phase IN ('', 'NA')"
    elif phase:
        where += " AND ('/' || t.phase || '/') LIKE ?"
        params.append(f"%/{phase}/%")

    if status:
        where += " AND t.status = ?"
        params.append(status)

    if country:
        where += """ AND EXISTS (
            SELECT 1 FROM sites c
            WHERE c.search_id = t.search_id AND c.nct_id = t.nct_id AND c.country = ?
        )"""
        params.append(country)

    return where, params