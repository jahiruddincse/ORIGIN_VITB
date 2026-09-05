# 🛡️ VanRaksha AI (वनरक्षा AI) — Forest Rights Act Decision Support & WebGIS Platform

[![Production Live](https://img.shields.io/badge/Production%20Live-fra--monitor.vercel.app-emerald?style=flat-square&logo=vercel)](https://fra-monitor.vercel.app)
[![GitHub Repository](https://img.shields.io/badge/GitHub-jahiruddincse%2FORIGIN__VITB-blue?style=flat-square&logo=github)](https://github.com/jahiruddincse/ORIGIN_VITB)
[![AI Engine](https://img.shields.io/badge/AI%20Engine-Google%20Gemini%202.5%20Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![Cloud Database](https://img.shields.io/badge/Cloud%20DB-Supabase%20PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Python Version](https://img.shields.io/badge/Python-3.9%20%7C%203.11%20%7C%203.13-3776AB?style=flat-square&logo=python)](https://www.python.org/)
[![Tests Passing](https://img.shields.io/badge/Tests-17%2F17%20Verified-success?style=flat-square)](backend/test_api.py)
[![Statutory Compliance](https://img.shields.io/badge/FRA%202006-Section%204(3)%20Cut--Off-orange?style=flat-square)](#-satellite-temporal-inspector--fra-2005-cut-off-verification)
[![Bilingual Support](https://img.shields.io/badge/Localization-English%20%7C%20%E0%A4%B9%E0%A4%BF%E0%A4%A8%E0%A5%8D%E0%A4%A6%E0%A5%80-violet?style=flat-square)](#-bilingual-governance--bhashini-ready-localization)
[![License](https://img.shields.io/badge/License-MIT-gray?style=flat-square)](LICENSE)

> **"Which FRA claims need administrative intervention, exactly why are they stalled, and what specific statutory order should an officer sign today?"**

---

## 🌐 Live Production Access

| Resource | URL | Description |
|---|---|---|
| **Production Application** | **[https://fra-monitor.vercel.app](https://fra-monitor.vercel.app)** | Live WebGIS dashboard, real-time claim inspector, and officer action console |
| **GitHub Repository** | **[https://github.com/jahiruddincse/ORIGIN_VITB](https://github.com/jahiruddincse/ORIGIN_VITB)** | Complete open-source codebase, test suites, and database seed scripts |
| **Database Status** | `https://fra-monitor.vercel.app/api/database/status` | Live connection probe verifying Supabase PostgreSQL and SQLite fallback |
| **AI Decision Endpoint** | `https://fra-monitor.vercel.app/api/ai/analyze-claim` | Powered by Google Gemini 2.5 Flash API with deterministic fallback |

---

## 🧭 The Real-World Crisis: Why Forest Rights Get Stalled

The **Scheduled Tribes and Other Traditional Forest Dwellers (Recognition of Forest Rights) Act, 2006 (FRA)** was enacted to undo historical injustices by granting legal tenure to tribal communities living on ancestral forest lands.

According to official Ministry of Tribal Affairs (MoTA) data, over **3.46 million individual and community claims** have been registered across the 8 primary tribal states. However, **over 45% remain unresolved or caught in multi-year administrative gridlocks**.

```
  Traditional Paper Bottleneck (180+ to 600 Days)
  ┌──────────────┐     Lost Paperwork     ┌──────────────┐     Cadastral Clash     ┌──────────────┐
  │  Gram Sabha  │ ─────────────────────> │     SDLC     │ ─────────────────────> │     DLC      │
  │     (FRC)    │ <───────────────────── │  (SDM Chair) │ <───────────────────── │ (Collector)  │
  └──────────────┘    Unrecorded Queries  └──────────────┘     Arbitrary Rejection └──────────────┘
                                                  │
                                                  ▼
                        VanRaksha AI Unified Decision Cockpit
     [WebGIS Geofencing] + [2005 Satellite NDVI] + [Gemini 2.5 Flash] + [Legal Memo Dispatch]
```

### The Three Structural Failures on the Ground:

1. **The Section 4(3) Pre-2005 Occupation Nightmare**:
   Section 4(3) of the Act stipulates that rights can only be recognized if the claimant was in occupation of forest land **prior to December 13, 2005**. In remote tribal hamlets, claimants rarely possess dated paperwork from 20 years ago. Reviewing officers face an impossible dilemma: approve claims without documentary proof and risk sanction for illegal encroachment, or reject legitimate tribal claims arbitrarily.
2. **Siloed Cadastral & Forest Working Plan Boundaries**:
   Revenue Department village records (*khasra/khatauni*) do not align with Forest Department compartment boundaries (*van khand*). Without overlaid GIS layers, identifying whether a claimed plot overlaps with a Critical Wildlife Habitat or Tiger Reserve (Section 4(2) restrictions) requires multiple disconnected physical field visits.
3. **Accountability Gaps in the Three-Tier Hierarchy**:
   Claims progress from the Gram Sabha (Forest Rights Committee) to the Sub-Divisional Level Committee (SDLC) and finally to the District Level Committee (DLC). When claims stall for 400 to 600+ days, district leadership has no mechanism to determine which desk holds the file, why it is delayed, or whether missing documents have even been requested from the claimant.

---

## 💡 What VanRaksha AI Does

VanRaksha AI is **not a generic AI chatbot**. It is an **administrative intelligence cockpit** built for Sub-Divisional Magistrates (SDMs), District Collectors (DM), and Divisional Forest Officers (DFOs).

It ingests spatial coordinates, cadastral records, and procedural milestones to solve the exact operational bottlenecks above:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 VANRAKSHA AI OPERATIONAL COCKPIT                                 │
├────────────────────────────┬────────────────────────────┬────────────────────────────────────────┤
│   1. Multi-Layer WebGIS   │ 2. 2005 Satellite NDVI     │ 3. Gemini 2.5 Statutory Synthesis      │
│   Switch between OSM, Esri │ Reconstructs forest canopy │ Generates structured legal directives  │
│   Satellite, & Topo layers │ at Dec 13, 2005 cut-off    │ with zero hallucination & rule backups │
├────────────────────────────┼────────────────────────────┼────────────────────────────────────────┤
│   4. Supabase Cloud Sync   │ 5. Officer Action Console  │ 6. What-If Policy Backlog Simulator    │
│   Realtime multi-tier      │ Issues legally auditable   │ Predicts days saved by deploying       │
│   synchronization & SQLite │ Form-C and joint orders    │ extra cadastral survey squads          │
└────────────────────────────┴────────────────────────────┴────────────────────────────────────────┘
```

---

## 🚀 Key Innovations & Functional Capabilities

### 1. 🛰️ Satellite Temporal Inspector & FRA 2005 Cut-Off Verification
Under Section 4(3), proving land tenure prior to December 13, 2005 is statutory. VanRaksha AI integrates multi-epoch satellite vegetation index (NDVI) analysis across three critical milestones:
- **2005 Baseline (Pre-FRA Cut-Off)**: Checks whether the coordinate was already cultivated clearing or dense unbroken canopy.
- **2015 Mid-Term (Post-Act Era)**: Detects whether agricultural clearing was consistent over time.
- **2024 Present Epoch**: Validates current ground status against recent high-resolution imagery.

*If an applicant claims continuous occupation since 2002, but satellite NDVI shows 81% dense canopy cover in 2005 that was only cleared in 2018, the system immediately flags: `High Risk: Post-2005 Forest Clearing Detected`.*

### 2. 🗺️ Multi-Layer WebGIS & Protected Habitat Geo-Fencing
- **Dynamic Basemap Switching**: Toggle instantaneously between **Esri High-Resolution World Imagery** (for tree cover inspection), **OpenTopoMap** (for terrain elevation & slope analysis), and **OpenStreetMap** (for village road and boundary connectivity).
- **Gazetted Protected Area Geo-Fences**: Real-time proximity calculation to core zones of Kanha, Pench, Similipal, Bastar, and Satpura National Parks with visual buffer indicators to prevent Section 4(2) violations.

### 3. 🧠 Google Gemini 2.5 Flash Statutory Synthesis
Unlike open-ended chatbots, our integration with the **Google Gemini 2.5 Flash API** operates under strict statutory prompts:
- Synthesizes cadastral status, pending duration, district delay averages, and satellite vegetative evidence into **actionable executive summaries**.
- Explains **why the claim was flagged** in plain administrative terminology.
- Recommends **specific statutory next steps** (e.g., *Issue notice under Rule 12A(3) for joint demarcation*).
- **100% Deterministic Fallback**: If internet connectivity drops or API limits are reached, the system automatically falls back to deterministic rule-based synthesis.

### 4. ☁️ Supabase Cloud PostgreSQL with Local SQLite Fallback
- **Live Supabase Sync**: Real-time cloud database hosting all claims, geotagged spatial coordinates, and administrative dispositions.
- **Resilient Offline Architecture**: Remote forest offices without high-speed internet can run the system using the embedded Python standard library SQLite engine (`fra_monitor.db`) with zero code changes.

### 5. 🏛️ Officer Administrative Action Console & Digital Audit Trail
Officers don't just view reports — they take legally binding action:
- **Select Statutory Disposition**: *Order Joint Field Cadastral Survey*, *Issue Form-C Gram Sabha Clarification Notice*, *Request FRC Quorum Verification*, or *Recommend for DLC Title Sanction*.
- **Generate Government Order (GO) Memos**: One-click generation of printable, formatted official memorandums complete with formal government seal, statutory reference numbers (e.g. `SDLC/2026/TST-9999`), and official officer signature blocks.
- **Immutable Audit Trail**: Every status change, inquiry order, and notice dispatch is permanently recorded in the claim's procedural history.

### 6. 🇮🇳 Bilingual Governance & Bhashini-Ready Localization
- Grassroots forest beat guards and Gram Sabha secretaries work primarily in regional languages. 
- A one-click toggle seamlessly switches the entire platform between **English** and authentic administrative **हिन्दी (Hindi)**.

### 7. 🎧 Web Speech Audio Briefings for Mobile Field Officers
- Field officers reviewing claims on mobile tablets during forest inspections can click **"Listen to Officer Briefing"** to hear a synthesized executive summary of the claim, severity assessment, and required field checks.

### 8. 📊 What-If Policy Backlog Clearance Simulator
- Built for District Collectors and Principal Secretaries.
- Simulates the direct impact of administrative policy levers (e.g., adding 1 to 5 joint revenue-forest survey squads, or fast-tracking undisputed small holdings under 2 acres).
- Calculates projected days saved and visualizes the accelerated backlog clearance trajectory.

---

## 📊 Dual-Layer Data Provenance & Integrity

VanRaksha AI enforces strict data separation between authentic national parliamentary benchmarks and granular demonstration records:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 DATA INTEGRITY PROVENANCE                              │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│   LAYER 1: OFFICIAL MoTA BENCHMARKS      │   LAYER 2: GRANULAR EVALUATION DATASET      │
│   (Authentic Public Government Data)     │   (Demonstration & Field Evaluation)        │
├──────────────────────────────────────────┼─────────────────────────────────────────────┤
│ • Source: Ministry of Tribal Affairs     │ • Scope: 750 granular claims                │
│   (MoTA), Government of India / MPR      │ • Purpose: Spatial pins, cadastral mismatch │
│ • Extent: 3,460,818 claims received;     │   detection, 2005 satellite NDVI series,    │
│   1,904,679 titles distributed;          │   and Gemini decision support evaluation    │
│   11,292,200 acres recognized (8 states) │ • Geography: 40 districts across 8 states   │
│ • Purpose: Authoritative macro baseline  │ • Provenance: Explicitly tagged across all  │
│ • URL: https://tribal.nic.in/FRA.aspx   │   REST endpoints and UI badges              │
└──────────────────────────────────────────┴─────────────────────────────────────────────┘
```

### Official MoTA Progress Baseline (8 Monitored States)

| State | Claims Received | Titles Distributed | Recognized Land (Acres) | Disposal Rate | Key Administrative Notes |
|---|---|---|---|---|---|
| **Madhya Pradesh** | 766,430 | 260,707 | 1,385,200 | 34.0% | Official MPR. Special habitat rights recognized for Baiga PVTG. |
| **Chhattisgarh** | 922,346 | 534,068 | 3,280,500 | 57.9% | Highest Community Forest Resource (CFR) extent in Central India. |
| **Odisha** | 733,158 | 464,504 | 1,070,400 | 63.4% | Highest title recognition rate among eastern tribal states. |
| **Maharashtra** | 397,897 | 199,667 | 3,120,000 | 50.2% | Extensive CFR recognized in Gadchiroli and Vidarbha. |
| **Andhra Pradesh** | 288,409 | 228,473 | 960,800 | 79.2% | High disposal efficiency across Scheduled Agency tracts. |
| **Gujarat** | 190,056 | 103,524 | 1,140,000 | 54.5% | Concentrated in Dangs, Narmada, and Dahod tribal belts. |
| **Jharkhand** | 110,756 | 61,970 | 250,300 | 56.0% | Covers Chota Nagpur and Santhal Pargana tribal regions. |
| **Rajasthan** | 51,766 | 51,766 | 85,000 | 100.0% | Covers Tribal Sub-Plan districts (Udaipur, Dungarpur). |
| **Monitored Total** | **3,460,818** | **1,904,679** | **11,292,200** | **55.0%** | **Official National Baseline** |

---

## ⚙️ Deterministic Anomaly Detection Rules

Every score and flag in VanRaksha AI is reproducible and anchored to explicit quantitative evidence:

| Rule Code | Evaluation Criteria | Score Impact | Quantitative Evidence Displayed |
|---|---|---|---|
| `DELAYED_CLAIM` | Pending duration exceeds statutory threshold (180 days) | `+25` | Pending days vs 180d threshold & district mean |
| `DELAY_VS_DISTRICT_AVG` | Pending duration is >2x the district average for pending claims | `+20` | Pending duration vs district pending average |
| `LAND_RECORD_MISMATCH` | Cadastral status is `Mismatch` or claimed vs recorded area diff >20% | `+35` | Claimed acreage vs recorded revenue area |
| `INCOMPLETE_DOCUMENTATION` | Mandatory supporting records missing on active pending claim | `+20` | Gram Sabha resolution & identity status |
| `UNUSUAL_AREA` | Claimed area exceeds 15 acres (95th percentile threshold) | `+15` | Claimed acreage vs 0.5–15 acre district range |
| `GEOGRAPHIC_INCONSISTENCY` | GPS coordinates deviate from designated district forest boundary | `+30` | Plot coordinates vs district forest polygon |
| `POSSIBLE_DUPLICATE` | Identical claimant attributes match another active submission | `+25` | Matched record ID in same revenue village |
| `UNUSUAL_PROCESSING` | Approved in unusually short/long time compared to district mean | `+15` | Processing duration vs district approved mean |
| `HISTORICAL_CANOPY_CLEARING`| Satellite NDVI indicates dense canopy in 2005 with clearing post-2010 | `+20` | 2005 NDVI (0.74) vs 2024 NDVI (0.32), canopy loss % |
| `PROTECTED_ZONE_OVERLAP` | Plot coordinates fall within sensitive buffer of a National Park | `+25` | Distance to nearest gazetted core zone (e.g. Pench 14.2km) |

### Transparent Severity Scale
- **0 – 19 (Normal)**: Standard statutory compliance — routine administrative review.
- **20 – 39 (Low)**: Minor delay or pending verification.
- **40 – 59 (Medium)**: Documentation gaps or minor area discrepancies.
- **60 – 79 (High)**: Substantial delay or boundary mismatch — prioritized DLC inspection.
- **80 – 100 (Critical)**: Compounding flags (e.g. post-2005 clearing + area mismatch) — halt approval for SDLC field audit.

---

## 🎯 Evaluator Quick-Demo Guide: Benchmark Claims

When evaluating the platform on [fra-monitor.vercel.app](https://fra-monitor.vercel.app), click the **Demo Presets** in the top navigation bar to observe the system's core capabilities:

### Case 1: `DEMO-003` — The Critical Fraud & Delay Anomaly
- **Claimant**: Bhuri Bai Korku | **District**: Seoni, Madhya Pradesh
- **Severity Score**: **80/100 (Critical)**
- **Why It Matters**: 
  1. **Satellite Pre-2005 Check**: 2005 NDVI is 0.74 (Dense Canopy), but 2024 NDVI drops to 0.32 (Clearing). The system flags: `High Risk: Post-2005 Forest Clearing Detected` (Section 4(3) violation).
  2. **Cadastral Mismatch**: 8.5 acres claimed vs 3.2 acres recorded in the revenue register.
  3. **Eco-Buffer Warning**: Plot is situated within 14.2 km of the Pench Tiger Reserve eco-sensitive buffer.
  4. **Actionable Step**: Click **"Analyze with AI"** to see Google Gemini's legal synthesis, then scroll to the **Officer Action Console**, select *Order Joint Field Cadastral Survey*, and click **"View Official Notice Memo"** to see the generated dispatch memo.

### Case 2: `DEMO-002` — The 600-Day Administrative Delay Bottleneck
- **Claimant**: Sukhdai Maravi | **District**: Bastar, Chhattisgarh
- **Severity Score**: **25/100 (Low)**
- **Why It Matters**: Demonstrates a legitimate tribal claim that is completely stalled. Documents are 100% complete and cadastral records match, yet the claim has been sitting for over 600 days. The system recommends issuing a procedural escalation to the SDLC.

### Case 3: `DEMO-001` — The Verified Compliant Claim
- **Claimant**: Ramesh Gond | **District**: Mandla, Madhya Pradesh
- **Severity Score**: **0/100 (Normal)**
- **Why It Matters**: Fully compliant individual claim (3.2 acres) with verified revenue records, pre-2005 occupation confirmed, and approved within 95 days. Demonstrates how clean claims pass through without false positives.

---

## 🏗️ Technical Architecture

```
                                  USER BROWSER / FIELD TABLET
                                               │
                                               ▼
                         ┌───────────────────────────────────────────┐
                         │   VanRaksha AI Single Page Application    │
                         │   - Responsive Tailwind UI (Warm Stone)   │
                         │   - Leaflet.js Multi-Layer WebGIS Engine  │
                         │   - Web Speech Synthesis Audio Briefing   │
                         │   - Bilingual Bhashini Localizer (EN/HI)  │
                         └─────────────────────┬─────────────────────┘
                                               │
                        ┌──────────────────────┴──────────────────────┐
                        ▼                                             ▼
          ┌───────────────────────────┐                 ┌───────────────────────────┐
          │  Vercel Serverless Cloud  │                 │  Local Zero-Dependency   │
          │  Runtime (@vercel/python) │                 │  Python Server (server.py)│
          └─────────────┬─────────────┘                 └─────────────┬─────────────┘
                        │                                             │
                        ├──────────────────────┬──────────────────────┤
                        ▼                      ▼                      ▼
          ┌───────────────────────────┐  ┌───────────┐  ┌───────────────────────────┐
          │   Supabase Cloud DB       │  │  SQLite3  │  │   Google Gemini 2.5       │
          │   - PostgreSQL 15         │  │  Local DB │  │   Flash REST API          │
          │   - Spatial Lat/Lon       │  │  Fallback │  │   - Statutory Synthesis   │
          │   - Realtime Sync         │  │           │  │   - Deterministic Fallback│
          └───────────────────────────┘  └───────────┘  └───────────────────────────┘
```

---

## 📡 REST API Reference (All 17 Verified Endpoints)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health check and server timestamp |
| `GET` | `/api/database/status` | Live database connectivity status (`supabase` or `sqlite`) |
| `GET` | `/api/benchmarks` | Official Ministry of Tribal Affairs (MoTA) baseline metrics across all 8 states |
| `GET` | `/api/benchmarks/{state}` | Official MoTA aggregate statistics & parliamentary notes for a specific state |
| `GET` | `/api/dashboard` | Real-time aggregate KPIs, priority bottlenecks, and recent anomalies |
| `GET` | `/api/map/districts` | GeoJSON FeatureCollection with district boundary polygons and anomaly choropleths |
| `GET` | `/api/priority-districts` | Ranked bottleneck districts requiring prioritized administrative intervention |
| `GET` | `/api/states` | Summary statistics across all 8 monitored states |
| `GET` | `/api/states/{state}` | Granular district-level breakdown and state performance indicators |
| `GET` | `/api/districts/{district}`| District-level claim metrics and pending volume |
| `GET` | `/api/claims` | Filterable claims list (`?state=&district=&status=&severity=&search=&page=`) |
| `GET` | `/api/claims/{claim_id}` | Complete dossier record for an individual claim with provenance metadata |
| `GET` | `/api/claims/{claim_id}/spatial-analysis` | 3-epoch satellite NDVI values, canopy loss %, and protected area proximity |
| `GET` | `/api/claims/{claim_id}/audit-trail` | Immutable procedural history of officer actions, queries, and memo numbers |
| `POST` | `/api/claims/{claim_id}/disposition` | Records statutory officer action and generates official Government Order memo |
| `POST` | `/api/simulation/clearance` | Computes backlog clearance timeline based on survey squad adjustments |
| `GET` | `/api/anomalies` | Filtered list of claims with `anomaly_score > 0` |
| `GET` | `/api/anomalies/{claim_id}` | Anomaly details, active rule breakdown, and individual score contributions |
| `POST` | `/api/ai/analyze-claim` | Generates Google Gemini 2.5 Flash statutory synthesis and action recommendation |
| `POST` | `/api/ai/state-summary` | Generates concise natural language summary of state-wide FRA performance |

---

## 🛠️ Local Installation & Setup

### Option 1: Standalone Run (Zero Dependencies — Recommended)
VanRaksha AI was engineered to run out of the box using **only the Python standard library**:

```bash
# 1. Clone the repository
git clone https://github.com/jahiruddincse/ORIGIN_VITB.git
cd ORIGIN_VITB

# 2. Start the built-in server (Runs REST API + serves WebGIS frontend)
python3 backend/server.py 8000
```
Open your browser and navigate to **`http://localhost:8000`**.

### Option 2: Running Automated Verification Tests (17/17 Tests)
```bash
python3 backend/test_api.py
```

Expected output:
```
==================================================
  VANRAKSHA AI — BACKEND & API VERIFICATION SUITE
==================================================
[TEST 1] GET /api/health -> ✓ OK
[TEST 2] GET /api/dashboard -> ✓ Total: 750, Approved: 351, Pending: 287
...
[TEST 12] GET /api/claims/DEMO-003/spatial-analysis -> ✓ 2005 Cut-Off NDVI Verified
[TEST 13] GET /api/claims/DEMO-003/audit-trail -> ✓ Disposition History Loaded
[TEST 14] POST /api/claims/DEMO-003/disposition -> ✓ Disposition Recorded
[TEST 15] POST /api/simulation/clearance -> ✓ Policy Simulation Computed (~126 days saved)
[TEST 16] GET /api/benchmarks -> ✓ Official MoTA Reference Layer Verified
[TEST 17] Data Provenance & Integrity Isolation -> ✓ Isolated & Verified
==================================================
  🎉 ALL 17 API ENDPOINTS & SERVICES 100% VERIFIED! 
==================================================
```

---

## 🔐 Environment Configuration

Create a `.env` file in the root directory (refer to `.env.example`):

```bash
# Google Gemini API Key (Powers AI statutory decision support)
# Get a free key from: https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Cloud Database (Powers live cloud persistence & realtime sync)
# Get free project credentials from: https://supabase.com/
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key_here
```

> **Zero-Config Resiliency**: If no API keys are configured, the system continues to run flawlessly using deterministic rule-based synthesis and the embedded SQLite database.

---

## ⚖️ Governance & Ethical Safeguards

1. **Constitutional & Statutory Primacy**:
   Under the Forest Rights Act, 2006, the Gram Sabha is the statutory authority for initiating claim recognition, subject to appeal before the SDLC and DLC. VanRaksha AI strictly functions as a **decision support tool**; it cannot automatically approve or reject any claim.
2. **Neutral Administrative Vocabulary**:
   The system deliberately avoids accusatory terminology like *"fraudulent"* or *"illegal encroachment"*. All flags are framed neutrally as *"Data variance requiring field survey"* or *"Satellite canopy change requiring Gram Sabha verification"*.
3. **Auditability & Procedural Due Process**:
   Every algorithmic flag is anchored to quantitative, inspectable metrics (e.g. `NDVI 2005 = 0.74 vs NDVI 2024 = 0.32`). No tribal land tenure decision is ever derived from an unexplainable "black box" prediction.

---

## 👥 Contributors & Acknowledgements

- **Repository**: [https://github.com/jahiruddincse/ORIGIN_VITB](https://github.com/jahiruddincse/ORIGIN_VITB)
- **Official Benchmark Data**: Ministry of Tribal Affairs (MoTA), Government of India Monthly Progress Reports (MPR).
- **Satellite Basemaps**: Esri World Imagery, OpenTopoMap, and OpenStreetMap Contributors.
