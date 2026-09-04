# 🛡️ VanRaksha AI (वनरक्षा AI) — Forest Rights Act (FRA) Decision Support System
### ORIGIN'26 Hackathon Prototype — Problem Statement 7

> **"Which FRA claims need attention, why do they need attention, and what should an administrative officer look at first?"**

---

## 📌 Executive Overview

**VanRaksha AI** is an AI-powered intelligence and decision-support system built for administrative officials to monitor Forest Rights Act (FRA) claims across Indian states and districts. Instead of requiring officers to manually inspect thousands of fragmented physical records, the system implements:

1. **Interactive WebGIS Map**: Visualizes claims geographically by district with GeoJSON district boundaries, choropleth anomaly densities, and color-coded claim severity markers.
2. **Deterministic & Contextual Anomaly Engine**: Screens all claims using explainable mathematical and statistical rules (comparing claim metrics against district and state baselines).
3. **AI Explanation & Decision Support Layer**: Synthesizes detected evidence into human-readable executive summaries and prioritized next actions for verification officers.
4. **State-Wise Decision Support**: Aggregates state and district progress, identifying high-priority bottleneck districts requiring administrative intervention.

### 🏛️ Complete User Journey
$$\text{Dashboard} \longrightarrow \text{Select State} \longrightarrow \text{Inspect District on Map} \longrightarrow \text{View District Claims} \longrightarrow \text{Identify Anomaly} \longrightarrow \text{Examine Evidence} \longrightarrow \text{Generate AI Guidance} \longrightarrow \text{Recommended Action}$$

---

## 🌟 Key Capabilities & Requirements Matrix

| Requirement | Implementation in VanRaksha AI | Status |
|---|---|---|
| **A. WebGIS Map** | Leaflet.js with OpenStreetMap tiles, 750 geotagged claim markers with severity color coding, GeoJSON district boundaries with anomaly-rate choropleth, click-to-filter, and zoom/pan controls. | ✅ Complete |
| **B. FRA Claim Visualization** | 8 real-time KPI cards, dynamic state performance bar chart (approved vs pending vs rejected), state-wise progress summary table, and priority anomalies feed. | ✅ Complete |
| **C. Anomaly Detection** | 7 explainable rules covering delivery delays (threshold & district average), land-record mismatches (claimed vs recorded area), incomplete documentation, unusual areas, and district bottlenecks. | ✅ Complete |
| **D. Explainable Evidence & AI** | Every anomaly displays the underlying quantitative evidence (e.g., pending days vs district average; claimed area vs recorded area difference). Gemini AI produces structured administrative recommendations with 100% deterministic fallback. | ✅ Complete |
| **E. State-Wise Decision Support** | State summary table, High Priority Districts section ranking bottlenecks by pending rate and anomaly density, district-level drilldowns, and AI administrative briefs. | ✅ Complete |
| **F. Realistic Mock Data** | 750 realistic synthetic claims deterministically generated (`seed=42`) across 8 states and 40 districts, featuring guaranteed benchmark demo cases (`DEMO-001`, `DEMO-002`, `DEMO-003`). | ✅ Complete |
| **G. Demo & Usability Quality** | One-click demo presets in top navigation, global search, multi-filter criteria, clean government intelligence aesthetic, zero external dependencies required to run. | ✅ Complete |

---

## ⚙️ Deterministic Anomaly Detection Rules

The system avoids "black box" decisions. Every flag is reproducible and backed by explicit quantitative rules:

| Rule Code | Condition / Evaluation | Score Impact | Evidence Shown to Officer |
|---|---|---|---|
| `DELAYED_CLAIM` | Pending duration exceeds configured threshold (180 days) | `+25` | Pending days, threshold (180d), district average, state average |
| `DELAY_VS_DISTRICT_AVG` | Pending duration is >2x the district average for pending claims | `+20` | Pending days, district average, multiple ratio |
| `LAND_RECORD_MISMATCH` | Cadastral status is `Mismatch` or claimed vs recorded area diff >20% | `+35` | Claimed area (acres), recorded area (acres), difference percentage |
| `INCOMPLETE_DOCUMENTATION` | Required supporting records missing on active pending claim | `+20` | Gram Sabha resolution status, identity verification status |
| `UNUSUAL_AREA` | Claimed area exceeds 15 acres (95th percentile for individual tenure) | `+15` | Claimed acreage vs typical 0.5–15 acre district range |
| `GEOGRAPHIC_INCONSISTENCY` | GPS coordinates deviate from designated district forest boundary | `+30` | Plot latitude/longitude vs gazetted district polygon |
| `POSSIBLE_DUPLICATE` | Identical claimant attributes match another active submission | `+25` | Matching claimant details in same district |
| `UNUSUAL_PROCESSING` | Approved in unusually short/long time compared to district average | `+15` | Processing duration vs district approved average |

### Transparent Severity Scoring Scale:
- **0 – 19**: **Normal** (Standard compliance — routine administrative review)
- **20 – 39**: **Low** (Minor delays or pending verification)
- **40 – 59**: **Medium** (Documentation gaps or area variances)
- **60 – 79**: **High** (Substantial delay or boundary discrepancies — prioritized DLC inspection)
- **80 – 100**: **Critical** (Multiple compounding flags — halt approval for SDLC field audit)

> [!IMPORTANT]
> **Data Honesty & Terminology**: The system does **not** accuse claimants of fraud or make legally binding determinations. The system uses objective administrative language: *"Potential anomaly"*, *"Data mismatch"*, *"Unusual pattern"*, *"Requires review"*. Final legal decisions rest with the statutory authority (Gram Sabha, SDLC, DLC).

---

## 🧠 AI Layer Architecture

```
                    ┌────────────────────────────┐
                    │    Mock FRA Claim Data     │
                    │   (SQLite / 750 Records)   │
                    └─────────────┬──────────────┘
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │ Deterministic & Contextual │
                    │       Anomaly Engine       │
                    └─────────────┬──────────────┘
                                  │ (Evaluates 7 Rules + District Context)
                                  ▼
                    ┌────────────────────────────┐
                    │  Structured Evidence Block │
                    │ (Pending, Avg, Area Diff)  │
                    └─────────────┬──────────────┘
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │     LLM / Fallback Engine  │
                    │   (Google Gemini 1.5 Flash)│
                    └─────────────┬──────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│       Executive Summary         │       │   Recommended Officer Action    │
│  "Potential processing delay    │       │  "Immediate manual review       │
│   exceeding district avg..."    │       │   recommended by SDLC..."       │
└─────────────────────────────────┘       └─────────────────────────────────┘
```

If the Google Gemini API key is not configured or network access is restricted, the application seamlessly activates an **instant deterministic decision-support report**. The demo will **never break or hang**.

---

## 🗂️ Project Structure

```
fra-monitor/
├── backend/
│   ├── app/
│   │   ├── api/                 # FastAPI routers (dashboard, claims, states, anomalies, ai, filters)
│   │   ├── models/              # Pydantic schemas (ClaimBase, ClaimListResponse)
│   │   ├── services/            # Anomaly engine, evidence builder, context generator, statistics
│   │   │   ├── anomaly_engine.py    # 7 deterministic rules
│   │   │   ├── anomaly_evidence.py  # Structured metrics generator
│   │   │   ├── anomaly_context.py   # District/state baseline statistics
│   │   │   └── statistics.py        # Aggregation, priority districts, GeoJSON generator
│   │   ├── ai/                  # Gemini provider & prompt templates
│   │   ├── config.py            # Environment configuration
│   │   ├── database.py          # SQLite connection helper
│   │   └── main.py              # FastAPI application entrypoint
│   ├── fra_monitor.db           # SQLite database with 750 seeded claims & indexes
│   ├── server.py                # Standalone zero-dependency REST & WebGIS server
│   ├── test_api.py              # Automated verification test suite
│   └── requirements.txt         # Optional pip dependencies for FastAPI/Uvicorn
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable React components (Layout, IndiaMap, KPICard, etc.)
│   │   ├── pages/               # Dashboard, ClaimsExplorer, ClaimDetail, StateIntelligence
│   │   ├── services/            # API client
│   │   └── types/               # TypeScript data definitions
│   ├── package.json
│   └── vite.config.ts
├── web/
│   ├── index.html               # Production WebGIS Single Page Application
│   ├── app.js                   # Leaflet map, Chart.js, multi-filtering, & AI integration
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
Simply open [`web/index.html`](file:///Users/mdjahiruddinahmed/.gemini/antigravity/scratch/fra-monitor/web/index.html) directly in any browser. All WebGIS maps, charts, multi-filters, and decision-support features will run locally!

### 3. Optional: Run with FastAPI & Uvicorn

If you have `fastapi` and `uvicorn` installed:
```bash
cd fra-monitor/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Run Automated Verification Tests
```bash
python3 backend/test_api.py
```

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` to configure an optional Google Gemini LLM API key:

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
| `GET` | `/api/dashboard` | Aggregated KPIs, priority districts, state summary, recent anomalies |
| `GET` | `/api/map/districts` | GeoJSON FeatureCollection with district polygons and anomaly rates |
| `GET` | `/api/priority-districts` | Ranked bottleneck districts requiring immediate administrative attention |
| `GET` | `/api/states` | Summary statistics across all 8 states |
| `GET` | `/api/states/{state}` | Granular district breakdown for a specific state |
| `GET` | `/api/districts/{district}` | District-level claim metrics |
| `GET` | `/api/claims` | Filterable claims list (`?state=&district=&status=&severity=&search=&page=&limit=`) |
| `GET` | `/api/claims/{claim_id}` | Detailed record for an individual claim |
| `GET` | `/api/anomalies` | Filtered list of claims with `anomaly_score > 0` |
| `GET` | `/api/anomalies/{claim_id}` | Anomaly details, rule breakdown, and score |
| `GET` | `/api/analytics/state` | Chart datasets for comparative state visualization |
| `GET` | `/api/filters` | Dynamic dropdown filter values |
| `POST` | `/api/ai/analyze-claim` | Generates structured AI decision report for a claim |
| `POST` | `/api/ai/state-summary` | Generates concise natural language summary of state metrics |

---

## 🎯 Exact 2–3 Minute Hackathon Presentation Flow

Follow this exact presentation sequence for maximum judging impact:

### Step 1: The Administrative Problem & Command Center (0:00 – 0:45)
1. Open **`http://localhost:8000`** (Command Dashboard).
2. Point out the 8 real-time KPI cards:
   > *"Across 8 monitored states, manual inspection of 750 FRA claims is fragmented and slow. Our command center immediately surfaces the big picture: 351 approved, 287 pending, and 37 high/critical cases requiring immediate attention."*
3. Show the **High Priority Districts** section:
   > *"Notice how the system immediately flags bottleneck districts like Seoni, Chhindwara, and Bastar where pending rates and anomaly densities deviate from state norms."*

### Step 2: Interactive WebGIS Map & State Progress (0:45 – 1:30)
1. Point to the **WebGIS Map**:
   > *"The map integrates lightweight district GeoJSON boundaries with claim points. Districts are shaded by anomaly rate, while individual claim markers are color-coded by severity."*
2. Click **Madhya Pradesh** in the State Progress Table:
   > *"Clicking a state instantly filters the WebGIS view to that state's districts and updates the claim density."*
3. Click a district on the map (or choose **Seoni**):
   > *"The map zooms directly into the district, showing the local claim distribution."*

### Step 3: Guaranteed Benchmark Record `DEMO-003` (1:30 – 2:15)
1. Click the preset button **`DEMO-003`** in the top navigation bar.
2. Walk through the **Hero Claim Intelligence Page**:
   > *"Here is our benchmark critical case: Claim DEMO-003 by Bhuri Bai Korku in Seoni, Madhya Pradesh."*
3. Highlight the **Transparent Scoring & Evidence**:
   > *"Look at the Anomaly Score: 80/100 (Critical). This is not an unexplained black box. The deterministic engine identifies three concrete signals with numerical evidence:
   > 1. Pending for 187 days — exceeding the 180-day threshold and higher than the district average of 114 days.
   > 2. Land Record Mismatch: 8.5 acres claimed vs. 3.2 acres in cadastral records (+165% discrepancy).
   > 3. Missing Gram Sabha documentation for an active claim."*

### Step 4: AI Decision Support & Actionable Guidance (2:15 – 3:00)
1. Click **`[✨ Analyze with AI]`**.
2. Show the generated report:
   > *"Watch how the AI synthesizes these signals into an administrative brief. It does not replace the officer — it produces a concrete next action: 'Immediate high-priority manual review recommended. Sub-Divisional Committee should halt clearance and order ground cadastral survey in Seoni.' Notice our strict disclaimer: decision support, not legal adjudication."*
3. Conclude:
   > *"VanRaksha AI bridges the gap between fragmented records and administrative action, ensuring officers focus on the claims that truly need attention first."*

---

## 💬 Judge Questions & Technical Answers

### Q1: Why use AI?
> **Answer**: Deterministic rules and statistical benchmarks identify anomalies from structured records reliably and without hallucinations. The LLM converts those structured findings into an executive summary and recommended administrative next steps that any reviewing officer can immediately act upon.

### Q2: Why not use AI for everything?
> **Answer**: Anomaly detection must be transparent, auditable, and mathematically explainable to government officials and judicial authorities. If an official asks *"Why was this claim flagged?"*, we must show exact numbers (e.g. 187 days vs 114d district avg, or 8.5ac vs 3.2ac recorded). An LLM should explain evidence, not invent criteria.

### Q3: What is an FRA claim?
> **Answer**: An application submitted under the Scheduled Tribes and Other Traditional Forest Dwellers (Recognition of Forest Rights) Act, 2006, recognizing individual or community rights to forestland and resources occupied prior to December 13, 2005.

### Q4: Is the system deciding whether a claim is legally valid?
> **Answer**: No. The system strictly provides administrative triage and decision support. It flags potential anomalies, data mismatches, and processing bottlenecks. Statutory authority to approve or reject claims resides exclusively with the Gram Sabha, Sub-Divisional Level Committee (SDLC), and District Level Committee (DLC).

### Q5: Is this real government data?
> **Answer**: No. To protect privacy and adhere to hackathon guidelines, all 750 records are synthetic mock data generated deterministically (`seed=42`) based on realistic geographic coordinates, district names, and tribal demographics across 8 Indian states.
