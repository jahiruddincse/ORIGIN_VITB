# 🛡️ VanRaksha AI (वनरक्षा AI) — Forest Rights Act (FRA) Decision Support System
### ORIGIN'26 Hackathon Prototype — Problem Statement 7

> **"Which FRA claims need attention, why do they need attention, and what should an administrative officer look at first?"**

---

## 📌 Executive Overview

**VanRaksha AI** is an AI-powered intelligence and decision-support system built for administrative officials to monitor Forest Rights Act (FRA) claims across districts. Instead of requiring officers to manually inspect thousands of physical records, the system implements a **Deterministic Anomaly Engine** that screens all incoming claims, flags discrepancies with transparent scoring, and uses an **AI Intelligence Layer** to explain detected evidence and formulate actionable next steps.

### 🏛️ Core User Journey
$$\text{Dashboard} \longrightarrow \text{State} \longrightarrow \text{District} \longrightarrow \text{Claim} \longrightarrow \text{Anomaly} \longrightarrow \text{Evidence} \longrightarrow \text{AI Explanation} \longrightarrow \text{Recommended Action}$$

---

## 🌟 Key Features

1. **WebGIS Claim Map**:
   - Geotagged interactive Leaflet map rendering 750 mock claims across 8 states and 40 districts.
   - Dynamic CircleMarkers color-coded by severity (Critical, High, Medium, Low, Normal).
   - District/state filtering and interactive claim inspection popups.

2. **Deterministic Anomaly Engine**:
   - **Rule 1 — Delayed Claim**: Flagged if pending > 180 days (`+25 pts`).
   - **Rule 2 — Land Record Mismatch**: Flagged if cadastral records conflict (`+35 pts`).
   - **Rule 3 — Missing Documentation**: Flagged if Gram Sabha / identity documents missing (`+20 pts`).
   - **Rule 4 — Unusual Land Area**: Flagged if claimed area > 15 acres (`+15 pts`).
   - **Rule 5 — Geographic Inconsistency**: Flagged if coordinates deviate from designated boundaries (`+30 pts`).
   - **Rule 6 — Possible Duplicate**: Flagged if duplicate claimant parameters match an active file (`+25 pts`).
   - **Transparent Score**: Composite score (0–100) mapped to Normal (0–19), Low (20–39), Medium (40–59), High (60–79), Critical (80+).

3. **AI Intelligence & Decision Support Layer**:
   - Powered by Google Gemini (with instant deterministic rule-based fallback).
   - Consumes *only structured anomaly evidence* — never makes unsupported legal assertions.
   - Produces 6 distinct outputs: Executive Summary, Why Flagged reasons, Severity Assessment, Recommended Action, Evidence Used, and Decision Support Disclaimer.

4. **State Intelligence & Analytics**:
   - Comparative analytics across 8 states and 40 districts.
   - Stacked visual performance distribution (Approved vs. Pending vs. Rejected).
   - Single-click AI State Administrative Summaries.

---

## 🗂️ Project Structure

```
fra-monitor/
├── backend/
│   ├── app/
│   │   ├── api/                 # FastAPI routers (dashboard, claims, states, anomalies, ai)
│   │   ├── models/              # Pydantic data schemas
│   │   ├── services/            # Anomaly engine & statistics aggregation
│   │   ├── ai/                  # Gemini provider & structured prompt templates
│   │   ├── config.py            # Environment configuration
│   │   ├── database.py          # SQLite connection helper
│   │   └── main.py              # FastAPI application entrypoint
│   ├── fra_monitor.db           # SQLite database with 750 seeded claims & indexes
│   ├── server.py                # Zero-dependency Python HTTP & REST API server
│   ├── test_api.py              # Automated test suite verifying all 11 endpoints
│   └── requirements.txt         # Optional pip dependencies for FastAPI/Uvicorn
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable React components (Layout, IndiaMap, KPICard, etc.)
│   │   ├── pages/               # Dashboard, ClaimsExplorer, ClaimDetail, StateIntelligence
│   │   ├── services/            # REST API client
│   │   └── types/               # TypeScript data definitions
│   ├── package.json
│   └── vite.config.ts
├── web/
│   ├── index.html               # Production WebGIS Single Page Application
│   ├── app.js                   # Client controller, Leaflet, Chart.js, & AI integration
│   └── claims_data.json         # Static demo dataset fallback
├── scripts/
│   ├── generate_data.py         # Deterministic synthetic data generator (seed 42)
│   ├── seed_database.py         # SQLite schema creator & data loader
│   └── claims_data.json         # Master 750-record dataset
├── index.html                   # Root symlink for one-command execution
├── app.js
├── README.md
└── .env.example
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.9+ (Python 3.11/3.13 recommended)
- Any modern web browser (Chrome, Edge, Safari, Firefox)

### 2. Run the Application (One Command)

The built-in backend server serves both the **REST API** and the **Interactive WebGIS UI** simultaneously:

```bash
cd fra-monitor
python3 backend/server.py 8000
```
Open your browser and navigate to:
👉 **[http://localhost:8000](http://localhost:8000)**

*(Alternative standalone viewing without server)*:
Simply open `web/index.html` directly in your browser. All data and decision support calculations will run locally!

### 3. Optional: Run with FastAPI & Uvicorn

If you have `fastapi` and `uvicorn` installed:
```bash
cd fra-monitor/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. (Re)seed the Database

The SQLite database (`backend/fra_monitor.db`) is already pre-seeded and indexed with 750 claims. If you wish to re-generate the dataset deterministically:
```bash
python3 scripts/generate_data.py
python3 scripts/seed_database.py
```

### 5. Run Verification Tests
```bash
python3 backend/test_api.py
```

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` to configure an external Gemini LLM:

```bash
# Optional: Google Gemini API Key (If omitted, system uses deterministic fallback)
GEMINI_API_KEY=your_gemini_api_key_here

# Backend settings
BACKEND_PORT=8000
DATABASE_PATH=fra_monitor.db
DELAY_THRESHOLD_DAYS=180
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health check |
| `GET` | `/api/dashboard` | Aggregated KPIs, approval rates, recent anomalies |
| `GET` | `/api/states` | Summary statistics across all 8 states |
| `GET` | `/api/states/{state}` | Granular district breakdown for a specific state |
| `GET` | `/api/districts/{district}` | District-level claim metrics |
| `GET` | `/api/claims` | Filterable claims list (`?state=&district=&status=&severity=&search=&page=&limit=`) |
| `GET` | `/api/claims/{claim_id}` | Detailed record for an individual claim |
| `GET` | `/api/anomalies` | Filtered list of claims with `anomaly_score > 0` |
| `GET` | `/api/anomalies/{claim_id}` | Anomaly details, rule breakdown, and score |
| `GET` | `/api/analytics/state` | Chart datasets for comparative state visualization |
| `GET` | `/api/filters` | Dynamic dropdown filter values |
| `POST` | `/api/ai/analyze-claim` | Generates AI decision report for a claim |
| `POST` | `/api/ai/state-summary` | Generates concise natural language summary of state metrics |

---

## 🎯 Exact 3-Minute Hackathon Demo Flow

Follow this exact presentation sequence for maximum judging impact:

### Minute 1: The Administrative Problem & Command Center (0:00 – 1:00)
1. **Start on the Dashboard (`/` or `#dashboard`)**:
   > *"Across our 8 monitored states, manual review of 750 FRA claims is impossible. Look at the real-time KPIs: 366 claims approved (48.8%), 271 pending, and 230 flagged with anomalies. Most importantly: 15 high/critical priority cases requiring immediate intervention."*
2. **Show the Live WebGIS Map**:
   > *"Every claim is geotagged. The color coding immediately shows district hotspots. Notice how critical anomalies (red pins) cluster in Central India."*

### Minute 2: State Intelligence & District Drilldown (1:00 – 1:50)
1. **Click `State Intelligence` in the navigation**:
   > *"We can compare performance across states. Let's inspect Madhya Pradesh."*
2. **Click on `Madhya Pradesh`**:
   > *"The district breakdown reveals that Seoni district has a concentrated volume of pending claims and anomalies."*
3. **Click `[✨ Generate AI State Summary]`**:
   > *"With one click, our AI summarizes administrative bottlenecks for leadership without hallucinating numbers."*

### Minute 3: Anomaly Evidence & AI Decision Support (1:50 – 3:00)
1. **Click the preset button `DEMO-003` in the top demo bar**:
   > *"Here is our guaranteed critical demo record: Claim DEMO-003 by Bhuri Bai Korku in Seoni, MP."*
2. **Highlight the Transparent Scoring**:
   > *"Look at the Anomaly Score: 80/100 (Critical). This is not an unexplained black box. The deterministic engine identifies three concrete signals: 187 days pending (>180d threshold), land record mismatch, and incomplete Gram Sabha documentation."*
3. **Show Ground Truth Evidence**:
   > *"We show the reviewing officer the exact underlying records alongside a satellite-ready plot map."*
4. **Click `[✨ Analyze with AI]`**:
   > *"Watch the AI synthesize these signals. It produces an executive summary, itemizes why the claim was flagged, and provides an actionable recommendation: 'Immediate manual review recommended. Sub-Divisional Level Committee should halt clearance and order ground cadastral survey in Seoni.' Notice our strict disclaimer: decision support, not legal adjudication."*
5. **Conclude**:
   > *"Our system does not replace the officer. It ensures the officer spends their valuable time on the claims that truly need attention first."*

---

## ⚠️ Important Data Honesty & Limitations

- **Synthetic Prototype**: All claim records, claimant names, and land parcels are synthetic mock data generated deterministically (`seed=42`) for demonstration purposes.
- **No Official Endorsement**: This is an academic hackathon prototype for ORIGIN'26. It is not affiliated with the Ministry of Tribal Affairs or any State Forest Department.
- **Decision Support Only**: The system does not possess statutory authority to approve or reject Forest Rights Act claims. All actions must be verified by competent statutory committees (FRC, SDLC, DLC).
