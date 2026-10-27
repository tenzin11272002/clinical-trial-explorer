# Clinical Trial Map Explorer

A full-stack web application for exploring clinical trials worldwide using an interactive map and data visualizations.

This project is developed as part of the Eclypse AI Full Stack Development Task.

## Project Overview

Clinical Trial Map Explorer allows users to search for clinical trials based on medical conditions and drugs.

The application retrieves clinical trial information from the ClinicalTrials.gov API v2 and presents it through an interactive world map, dashboard statistics, and detailed trial information.

## Tech Stack

### Frontend

- React with Vite
- TypeScript
- Tailwind CSS (planned)
- React Leaflet (planned)
- Recharts (planned)
- Axios (planned)

### Backend

- Python
- FastAPI
- Requests
- SQLAlchemy
- SQLite (planned)

### Data Source

- ClinicalTrials.gov API v2

## Project Structure

```text
clinical-trial-explorer/
├── frontend/
├── backend/
│   ├── services/
│   ├── main.py
│   └── requirements.txt
├── .gitignore
└── README.md
```

## Planned Features

- Search clinical trials by condition and drug
- Filter trials by status, phase, country, and year
- Display clinical trial locations on an interactive world map
- Cluster map markers for improved performance
- View trial details, including sponsor, phase, enrollment, and dates
- Display dashboard statistics and charts
- Cache API results for faster repeated searches

## Installation and Setup

### Prerequisites

- Node.js and npm
- Python 3
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/clinical-trial-explorer.git
cd clinical-trial-explorer
```

Replace `YOUR_USERNAME` with the actual GitHub username.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at:

`http://localhost:5173`

### 3. Backend Setup

Open a separate terminal:

```bash
cd backend
python -m venv venv
```

Activate the virtual environment.

Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
uvicorn main:app --reload
```

The backend runs at:

`http://127.0.0.1:8000`

API documentation is available at:

`http://127.0.0.1:8000/docs`

## API Integration

The application uses the ClinicalTrials.gov API v2.

The backend is responsible for retrieving clinical trial information, processing API responses, and providing structured data to the frontend.

API endpoint:

`GET /api/trials`

Example search:

`/api/trials?condition=obesity&drug=semaglutide`

The initial implementation retrieves a limited page of results. Full pagination and caching are planned.

## Design Decisions

### React with Vite

React provides a component-based architecture for building reusable user interface components. Vite provides a fast development environment.

### FastAPI

FastAPI was selected for its simplicity, Python support, automatic API documentation, and suitability for REST API development.

### SQLite

SQLite is planned for caching clinical trial results without requiring a separate database server.

### React Leaflet

React Leaflet is planned for displaying interactive maps without requiring a paid mapping API.

### Separate Frontend and Backend

Separating frontend and backend responsibilities improves maintainability and allows API processing to remain independent of the user interface.

## Limitations

The following limitations will be reviewed during development:

- Some clinical trial sites may not provide coordinates.
- Large clinical trials may contain hundreds of locations.
- External API requests depend on ClinicalTrials.gov availability.
- Some trials contain combined phases.
- Search performance may vary depending on the number of results.

Implemented limitations and trade-offs will be documented before submission.

## AI Tools Used

AI assistance was used for development guidance, architecture planning, troubleshooting, and code explanations.

All generated or suggested code should be reviewed, tested, and understood before submission.

## Future Improvements

- Compare clinical trials for two different drugs
- Animate trial activity over time
- Improve advanced filtering
- Add more interactive dashboard visualizations

## Project Status

**In Development**

The project is currently under active development.
