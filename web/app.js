/**
 * VanRaksha AI (वनरक्षा AI) — Forest Rights Act Decision Support & WebGIS Engine
 * Clean EduVault Aesthetic with Dark Mode, Side-by-Side Command Center,
 * Satellite Temporal NDVI Analysis, Protected Forest Geo-Fencing,
 * Officer Disposition Console, and Policy Backlog Simulator.
 */

// Global Application State
let allClaims = [];
let filteredClaims = [];
let dashboardData = null;
let statesData = [];
let filterOptions = { states: [], districts: [] };
let currentPage = 1;
const pageSize = 15;
let currentClaim = null;
let currentSpatialData = null;
let currentAuditTrail = [];
let mainMap = null;
let miniMap = null;
let mapMarkers = [];
let miniMapMarker = null;
let miniMapBuffer = null;
let districtLayer = null;
let districtGeoJson = null;
let stateChart = null;
let simulationChart = null;
let activeBaseMap = 'osm';
let baseTileLayer = null;
let currentLanguage = 'en';
let isAudioSpeaking = false;
let speechUtterance = null;
let officialBenchmarksData = null;

// Tile Layer Definitions
const BASEMAP_TILES = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr: '&copy; OpenStreetMap contributors | VanRaksha AI'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attr: '&copy; CARTO &copy; OpenStreetMap contributors | VanRaksha AI Dark'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr: '&copy; Esri, Maxar, Earthstar Geographics | VanRaksha AI High-Res Satellite'
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attr: '&copy; OpenTopoMap contributors | VanRaksha AI Forest Topography'
  }
};

// Protected Forest Area gazetted centroids
const PROTECTED_FOREST_AREAS = [
  { name: 'Pench Tiger Reserve (MP)', lat: 21.67, lon: 79.30, type: 'Critical Tiger Habitat' },
  { name: 'Kanha National Park (Mandla)', lat: 22.33, lon: 80.61, type: 'National Park & Tiger Reserve' },
  { name: 'Satpura Tiger Reserve (Hoshangabad)', lat: 22.48, lon: 78.43, type: 'Tiger Reserve Core' },
  { name: 'Kanger Ghati National Park (Bastar)', lat: 18.87, lon: 81.87, type: 'National Park & Biosphere' },
  { name: 'Similipal Tiger Reserve (Mayurbhanj)', lat: 21.93, lon: 86.34, type: 'Biosphere Reserve & CTH' },
  { name: 'Achanakmar Tiger Reserve (Bilaspur)', lat: 22.50, lon: 81.75, type: 'Critical Tiger Habitat' },
  { name: 'Bandhavgarh National Park (Umaria)', lat: 23.70, lon: 81.03, type: 'National Park Core' },
  { name: 'Gir National Park & Sanctuary (Junagadh)', lat: 21.12, lon: 70.82, type: 'National Park & Wildlife Sanctuary' },
  { name: 'Tadoba Andhari Tiger Reserve (Chandrapur)', lat: 20.24, lon: 79.30, type: 'Tiger Reserve Core' }
];

// Severity Colors & CSS Classes
const SEVERITY_COLORS = {
  Critical: '#dc2626',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#3b82f6',
  Normal: '#94a3b8'
};

const SEVERITY_BG = {
  Critical: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/60',
  High: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60',
  Medium: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  Low: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  Normal: 'bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'
};

const STATUS_BG = {
  Approved: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  Pending: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  Rejected: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
  'Under Review': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60'
};

// Bilingual Administrative Dictionaries
const TRANSLATIONS = {
  en: {
    subtitle: 'FRA Intelligence & Decision Support',
    nav_dashboard: 'Monitor',
    nav_claims: 'Investigate',
    nav_states: 'States',
    kpi_total: 'Total Claims Received',
    kpi_approved: 'Titles Distributed',
    kpi_pending: 'Statutory Pending Review',
    kpi_rejected: 'Claims Rejected',
    kpi_rate: 'Approval Rate',
    kpi_anomalies: 'Anomalies Flagged',
    kpi_high: 'Critical Priority (SDLC)',
    kpi_avg_proc: 'Avg Lead Time',
    map_title: 'Interactive WebGIS FRA Claim & Forest Reserve Map',
    map_desc: 'District boundaries, geotagged claims & protected habitats',
    priority_title: 'High Priority Districts — Immediate Attention Required',
    state_prog_title: 'State-wise FRA Progress Summary',
    audio_listen: '🎧 Listen to Officer Briefing',
    audio_stop: '⏹️ Stop Audio Briefing',
    action_recorded_msg: 'Administrative disposition recorded successfully into official audit trail.',
  },
  hi: {
    subtitle: 'वन अधिकार अधिनियम (FRA) आसूचना एवं निर्णय समर्थन प्रणाली',
    nav_dashboard: 'मॉनिटर',
    nav_claims: 'इन्वेस्टिगेट',
    nav_states: 'राज्य',
    kpi_total: 'कुल प्राप्त दावे',
    kpi_approved: 'स्वीकृत एवं पट्टा वितरित',
    kpi_pending: 'समीक्षा हेतु लंबित',
    kpi_rejected: 'अस्वीकृत दावे',
    kpi_rate: 'स्वीकृति दर',
    kpi_anomalies: 'चिह्नित विसंगतियां',
    kpi_high: 'अति-महत्वपूर्ण (SDLC)',
    kpi_avg_proc: 'औसत निस्तारण अवधि',
    map_title: 'सक्रिय WebGIS वन अधिकार एवं संरक्षित वन मानचित्र',
    map_desc: 'जिला सीमाएं, भू-चिह्नित दावे एवं राष्ट्रीय उद्यान बफर',
    priority_title: 'उच्च प्राथमिकता वाले जिले — तत्काल प्रशासनिक समीक्षा आवश्यक',
    state_prog_title: 'राज्यवार वन अधिकार प्रगति सारांश',
    audio_listen: '🎧 अधिकारी प्रशासनिक ब्रीफिंग सुनें',
    audio_stop: '⏹️ ऑडियो रोकें',
    action_recorded_msg: 'प्रशासनिक आदेश डिजिटल ऑडिट ट्रेल में सफलतापूर्वक दर्ज किया गया।',
  }
};

// =========================================================================
// INITIALIZATION & THEME MANAGEMENT
// =========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  if (window.lucide) lucide.createIcons();
  await loadInitialData();
  initMap();
  await loadDistrictBoundaries();
  setupRouting();
  populateFilterDropdowns();
  renderDashboard();
  runPolicySimulation();
});

function initTheme() {
  const savedTheme = localStorage.getItem('vanraksha-theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
  applyTheme(isDark ? 'dark' : 'light');
}

function toggleDarkMode() {
  const isCurrentlyDark = document.documentElement.classList.contains('dark');
  applyTheme(isCurrentlyDark ? 'light' : 'dark');
}

function applyTheme(theme) {
  const html = document.documentElement;
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (theme === 'dark') {
    html.classList.add('dark');
    localStorage.setItem('vanraksha-theme', 'dark');
    if (themeBtn) {
      themeBtn.innerHTML = '<i data-lucide="sun" class="w-4 h-4 text-amber-400"></i>';
      themeBtn.title = 'Switch to Light Theme';
    }
  } else {
    html.classList.remove('dark');
    localStorage.setItem('vanraksha-theme', 'light');
    if (themeBtn) {
      themeBtn.innerHTML = '<i data-lucide="moon" class="w-4 h-4 text-stone-500 hover:text-stone-900"></i>';
      themeBtn.title = 'Switch to Dark Theme';
    }
  }
  if (window.lucide) lucide.createIcons();

  // Update Leaflet Base Layer if using standard Street mode
  if (activeBaseMap === 'osm' && mainMap && baseTileLayer) {
    const tileDef = theme === 'dark' ? BASEMAP_TILES.dark : BASEMAP_TILES.osm;
    mainMap.removeLayer(baseTileLayer);
    baseTileLayer = L.tileLayer(tileDef.url, {
      attribution: tileDef.attr,
      maxZoom: 18
    }).addTo(mainMap);
  }

  // Refresh Charts if initialized
  if (stateChart) renderStatePerformanceChart();
  if (simulationChart) runPolicySimulation();
}

// =========================================================================
// DATA LOADING
// =========================================================================

async function loadInitialData() {
  // Check Database Status (Supabase / SQLite)
  try {
    const dbRes = await fetch('/api/database/status');
    if (dbRes.ok) {
      const dbInfo = await dbRes.json();
      const dot = document.getElementById('db-status-dot');
      const txt = document.getElementById('db-status-text');
      if (dot && txt) {
        if (dbInfo.source === 'supabase' && dbInfo.status === 'connected') {
          dot.className = 'w-2 h-2 rounded-full bg-[#168E53] animate-pulse';
          txt.textContent = `750 Claims`;
        } else if (dbInfo.status === 'awaiting_key') {
          dot.className = 'w-2 h-2 rounded-full bg-amber-500';
          txt.textContent = `750 Claims`;
        } else {
          dot.className = 'w-2 h-2 rounded-full bg-[#168E53]';
          txt.textContent = `750 Claims`;
        }
      }
    }
  } catch (e) {
    console.debug('Database status check skipped:', e);
  }

  // Load official MoTA benchmarks
  try {
    const bmRes = await fetch('/api/benchmarks');
    if (bmRes.ok) {
      officialBenchmarksData = await bmRes.json();
    }
  } catch (e) {
    console.debug('Benchmarks API fetch skipped:', e);
  }

  // Built-in verified MoTA fallback if offline or loading directly from filesystem
  if (!officialBenchmarksData || !officialBenchmarksData.states) {
    officialBenchmarksData = {
      source: "Ministry of Tribal Affairs (MoTA), Government of India",
      source_url: "https://tribal.nic.in/FRA.aspx",
      reporting_date: "2026-03-31",
      data_provenance: "OFFICIAL FRA AGGREGATE BENCHMARK (Government of India)",
      national_summary: {
        states_covered: 8,
        total_claims_received: 3460818,
        total_titles_distributed: 1904679,
        total_forest_land_extent_acres: 11292200.0,
        overall_title_distribution_rate_pct: 55.0
      },
      states: [
        { state: 'Madhya Pradesh', claims_received_total: 766430, titles_distributed_total: 260707, forest_land_extent_acres: 1385200.0, approval_rate_pct: 34.0, claims_received_individual: 737015, claims_received_community: 29415, titles_distributed_individual: 231164, titles_distributed_community: 29543, source_note: 'Official Monthly Progress Report (MPR) tabled in Parliament. Includes Habitat Rights recognized for Baiga PVTG.' },
        { state: 'Chhattisgarh', claims_received_total: 922346, titles_distributed_total: 534068, forest_land_extent_acres: 3280500.0, approval_rate_pct: 57.9, claims_received_individual: 864800, claims_received_community: 57546, titles_distributed_individual: 479000, titles_distributed_community: 55068, source_note: 'Official Cumulative MPR. Highest CFR title distribution extent in Central India.' },
        { state: 'Odisha', claims_received_total: 733158, titles_distributed_total: 464504, forest_land_extent_acres: 1070400.0, approval_rate_pct: 63.4, claims_received_individual: 715620, claims_received_community: 17538, titles_distributed_individual: 456800, titles_distributed_community: 7704, source_note: 'Official MoTA Status Report. Highest title distribution rate among eastern tribal states.' },
        { state: 'Maharashtra', claims_received_total: 397897, titles_distributed_total: 199667, forest_land_extent_acres: 3120000.0, approval_rate_pct: 50.2, claims_received_individual: 387000, claims_received_community: 10897, titles_distributed_individual: 191800, titles_distributed_community: 7867, source_note: 'Official MoTA MPR. Significant Community Forest Rights recognized in Gadchiroli and Vidarbha.' },
        { state: 'Andhra Pradesh', claims_received_total: 288409, titles_distributed_total: 228473, forest_land_extent_acres: 960800.0, approval_rate_pct: 79.2, claims_received_individual: 279000, claims_received_community: 9409, titles_distributed_individual: 220100, titles_distributed_community: 8373, source_note: 'Official MoTA Progress Summary. High disposal efficiency in Scheduled and Agency tracts.' },
        { state: 'Gujarat', claims_received_total: 190056, titles_distributed_total: 103524, forest_land_extent_acres: 1140000.0, approval_rate_pct: 54.5, claims_received_individual: 182500, claims_received_community: 7556, titles_distributed_individual: 98200, titles_distributed_community: 5324, source_note: 'Official MoTA FRA Status Report. Concentrated in Dangs, Narmada, and Dahod tribal belts.' },
        { state: 'Jharkhand', claims_received_total: 110756, titles_distributed_total: 61970, forest_land_extent_acres: 250300.0, approval_rate_pct: 56.0, claims_received_individual: 106200, claims_received_community: 4556, titles_distributed_individual: 59800, titles_distributed_community: 2170, source_note: 'Official MoTA MPR. Primary coverage in Chota Nagpur and Santhal Pargana tribal regions.' },
        { state: 'Rajasthan', claims_received_total: 51766, titles_distributed_total: 51766, forest_land_extent_acres: 85000.0, approval_rate_pct: 100.0, claims_received_individual: 51000, claims_received_community: 766, titles_distributed_individual: 51000, titles_distributed_community: 766, source_note: 'Official MoTA Progress Report. Covers TSP districts including Udaipur, Banswara, and Dungarpur.' }
      ]
    };
  }

  // Update UI national benchmark elements if available
  if (officialBenchmarksData && officialBenchmarksData.national_summary) {
    const ns = officialBenchmarksData.national_summary;
    const cEl = document.getElementById('official-total-claims');
    const tEl = document.getElementById('official-total-titles');
    const aEl = document.getElementById('official-total-acres');
    const rEl = document.getElementById('official-avg-rate');
    if (cEl) cEl.innerText = Number(ns.total_claims_received).toLocaleString('en-IN');
    if (tEl) tEl.innerText = Number(ns.total_titles_distributed).toLocaleString('en-IN');
    if (aEl) aEl.innerHTML = `${(Number(ns.total_forest_land_extent_acres) / 1000000).toFixed(2)}M <span class="text-xs font-normal text-stone-500">acres</span>`;
    if (rEl) rEl.innerText = `${ns.overall_title_distribution_rate_pct}%`;
  }

  try {
    const res = await fetch('/api/dashboard');
    if (res.ok) {
      dashboardData = await res.json();
    }
  } catch (e) {
    console.warn('Backend /api/dashboard not reachable, will calculate client-side');
  }

  // Load claims list
  try {
    const res = await fetch('/api/claims?limit=1000');
    if (res.ok) {
      const data = await res.json();
      allClaims = data.data || [];
    }
  } catch (e) {
    console.warn('Failed to fetch from /api/claims, attempting claims_data.json');
  }

  // Fallback to local claims_data.json if needed
  if (!allClaims || allClaims.length === 0) {
    try {
      const res = await fetch('claims_data.json');
      if (res.ok) {
        allClaims = await res.json();
      }
    } catch (e) {
      console.error('Failed to load claims_data.json fallback:', e);
    }
  }

  // Calculate client-side stats if needed
  if (!dashboardData && allClaims.length > 0) {
    calculateDashboardStats();
  }

  filteredClaims = [...allClaims];
  buildStatesData();
}

function calculateDashboardStats() {
  const total = allClaims.length;
  let approved = 0, pending = 0, rejected = 0, under_review = 0;
  let anomalies = 0, high_priority = 0;
  let totalApprovalDays = 0, approvedCount = 0;

  allClaims.forEach(c => {
    if (c.status === 'Approved') {
      approved++;
      if (c.days_pending) {
        totalApprovalDays += c.days_pending;
        approvedCount++;
      }
    } else if (c.status === 'Pending') pending++;
    else if (c.status === 'Rejected') rejected++;
    else if (c.status === 'Under Review') under_review++;

    if (c.anomaly_score > 0) anomalies++;
    if (c.severity === 'High' || c.severity === 'Critical') high_priority++;
  });

  const recentAnomalies = [...allClaims]
    .filter(c => c.anomaly_score > 0)
    .sort((a, b) => b.anomaly_score - a.anomaly_score)
    .slice(0, 10);

  dashboardData = {
    total_claims: total,
    approved: approved,
    pending: pending,
    rejected: rejected,
    under_review: under_review,
    approval_percentage: total > 0 ? ((approved / total) * 100) : 0,
    total_anomalies: anomalies,
    high_priority_anomalies: high_priority,
    avg_processing_days: approvedCount > 0 ? Math.round(totalApprovalDays / approvedCount) : 187,
    recent_anomalies: recentAnomalies
  };
}

function buildStatesData() {
  const stateMap = {};
  allClaims.forEach(c => {
    if (!stateMap[c.state]) {
      stateMap[c.state] = {
        state: c.state,
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        anomalies: 0,
        high_priority: 0,
        districts: {}
      };
    }
    const s = stateMap[c.state];
    s.total++;
    if (c.status === 'Approved') s.approved++;
    else if (c.status === 'Pending') s.pending++;
    else if (c.status === 'Rejected') s.rejected++;

    if (c.anomaly_score > 0) s.anomalies++;
    if (c.severity === 'High' || c.severity === 'Critical') s.high_priority++;

    if (!s.districts[c.district]) {
      s.districts[c.district] = { district: c.district, total: 0, approved: 0, pending: 0, anomalies: 0, high_priority: 0 };
    }
    const d = s.districts[c.district];
    d.total++;
    if (c.status === 'Approved') d.approved++;
    else if (c.status === 'Pending') d.pending++;
    if (c.anomaly_score > 0) d.anomalies++;
    if (c.severity === 'High' || c.severity === 'Critical') d.high_priority++;
  });

  statesData = Object.values(stateMap).map(s => {
    s.approval_rate = s.total > 0 ? Math.round((s.approved / s.total) * 1000) / 10 : 0;
    return s;
  }).sort((a, b) => b.total - a.total);
}

// =========================================================================
// BILINGUAL LANGUAGE SUPPORT
// =========================================================================

function setLanguage(lang) {
  currentLanguage = lang;
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Toggle button styling
  const btnEn = document.getElementById('lang-btn-en');
  if (btnEn) {
    const span = btnEn.querySelector('span');
    if (span) span.innerText = lang.toUpperCase();
  }

  // Update static UI elements
  document.getElementById('nav-subtitle').innerText = t.subtitle;
  document.getElementById('nav-item-dashboard').innerText = t.nav_dashboard;
  document.getElementById('nav-item-claims').innerText = t.nav_claims;
  document.getElementById('nav-item-states').innerText = t.nav_states;
  document.getElementById('txt-map-title').innerText = t.map_title;
  document.getElementById('txt-map-desc').innerText = t.map_desc;
  document.getElementById('txt-priority-title').innerText = t.priority_title;
  document.getElementById('txt-state-prog-title').innerText = t.state_prog_title;

  const audioLabel = document.getElementById('audio-btn-label');
  if (audioLabel) audioLabel.innerText = isAudioSpeaking ? t.audio_stop : t.audio_listen;

  renderDashboard();
}

// =========================================================================
// DASHBOARD RENDERING (4 PRIMARY HIGH-IMPACT CARDS + SIDE-BY-SIDE QUEUE)
// =========================================================================

function renderDashboard() {
  if (!dashboardData) return;
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  // 4 Primary High-Impact KPI HUD Cards (Sovereign Forest GIS)
  const kpis = [
    { 
      label: t.kpi_total, 
      value: dashboardData.total_claims.toLocaleString(), 
      badge: '3.46M MoTA Benchmark',
      desc: '8 Tribal States Monitored',
      icon: 'file-text', 
      color: 'text-emerald-500 dark:text-emerald-400', 
      bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
    },
    { 
      label: t.kpi_approved, 
      value: dashboardData.approved.toLocaleString(), 
      badge: `${dashboardData.approval_percentage.toFixed(1)}% Title Rate`,
      desc: 'Titles Sanctioned & Recorded',
      icon: 'check-circle-2', 
      color: 'text-teal-500 dark:text-teal-400', 
      bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30' 
    },
    { 
      label: t.kpi_pending, 
      value: dashboardData.pending.toLocaleString(), 
      badge: `${dashboardData.avg_processing_days}d avg delay`,
      desc: 'Statutory Backlog (>180d)',
      icon: 'clock', 
      color: 'text-amber-500 dark:text-amber-400', 
      bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
    },
    { 
      label: t.kpi_anomalies, 
      value: dashboardData.total_anomalies.toLocaleString(), 
      badge: `${dashboardData.high_priority_anomalies} Critical Priority`,
      desc: 'Spatial & Cadastral Flags',
      icon: 'alert-octagon', 
      color: 'text-rose-500 dark:text-rose-400', 
      bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30' 
    }
  ];

  const grid = document.getElementById('kpi-grid');
  grid.innerHTML = kpis.map(k => `
    <div class="relative overflow-hidden bg-white/90 dark:bg-[#071610]/90 backdrop-blur-md p-5 rounded-2xl border border-stone-200/80 dark:border-[#163528] shadow-sm hover:border-emerald-500/50 hover:shadow-lg dark:hover:shadow-emerald-950/40 transition-all duration-300 group flex flex-col justify-between">
      <div class="flex items-center justify-between mb-3">
        <span class="text-[11px] font-bold text-stone-500 dark:text-emerald-300/70 uppercase tracking-wider truncate font-mono">${k.label}</span>
        <div class="${k.bg} p-2 rounded-xl group-hover:scale-110 transition-transform">
          <i data-lucide="${k.icon}" class="w-4 h-4"></i>
        </div>
      </div>
      <div>
        <div class="text-3xl sm:text-4xl font-black text-stone-900 dark:text-white tracking-tight font-mono">${k.value}</div>
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 dark:border-[#142C23] text-[11px]">
          <span class="text-stone-500 dark:text-stone-400 truncate">${k.desc}</span>
          <span class="font-bold ${k.color} font-mono shrink-0 bg-stone-100 dark:bg-[#040E0A] px-2 py-0.5 rounded-md border border-stone-200 dark:border-[#18362B]">${k.badge}</span>
        </div>
      </div>
    </div>
  `).join('');

  // Update secondary strip
  const secRate = document.getElementById('sec-stat-rate');
  const secAvg = document.getElementById('sec-stat-avg-days');
  const secCrit = document.getElementById('sec-stat-critical');
  if (secRate) secRate.innerText = `${dashboardData.approval_percentage.toFixed(1)}%`;
  if (secAvg) secAvg.innerText = `${dashboardData.avg_processing_days} days`;
  if (secCrit) secCrit.innerText = `${dashboardData.high_priority_anomalies} cases`;

  // Render recent anomalies in right feed
  const recentList = document.getElementById('recent-anomalies-list');
  recentList.innerHTML = (dashboardData.recent_anomalies || []).slice(0, 5).map(c => {
    const sevClass = SEVERITY_BG[c.severity] || 'bg-stone-100 text-stone-700 border-stone-300';
    const statusClass = STATUS_BG[c.status] || 'bg-stone-100 text-stone-700 border-stone-300';
    return `
      <div onclick="viewClaim('${c.claim_id}')" class="p-2.5 bg-stone-50/80 dark:bg-[#05110C] hover:bg-emerald-50/50 dark:hover:bg-[#0B1E17] border border-stone-200 dark:border-[#163528] rounded-xl cursor-pointer transition flex items-center justify-between gap-3 group">
        <div class="min-w-0 flex-1">
          <div class="flex items-center space-x-1.5 mb-0.5">
            <span class="font-bold text-xs text-stone-900 dark:text-emerald-300 font-mono group-hover:underline">${c.claim_id}</span>
            <span class="text-[9px] px-1.5 py-0.2 rounded border font-semibold ${sevClass}">${c.severity}</span>
            <span class="text-[9px] px-1.5 py-0.2 rounded border font-medium ${statusClass}">${c.status}</span>
          </div>
          <div class="text-[11px] text-stone-600 dark:text-stone-400 truncate">
            <strong>${c.claimant_name}</strong> • ${c.district}, ${c.state} (${c.area_acres} ac)
          </div>
        </div>
        <div class="text-right flex-shrink-0">
          <span class="text-sm font-black font-mono ${c.anomaly_score >= 80 ? 'text-rose-500' : 'text-stone-900 dark:text-white'}">${c.anomaly_score}</span>
          <span class="text-[9px] text-stone-400 block uppercase font-mono">score</span>
        </div>
      </div>
    `;
  }).join('');

  renderStatePerformanceChart();
  renderPriorityDistricts();
  renderStateSummaryTable();
  updateMapMarkers(allClaims);
  if (window.lucide) lucide.createIcons();
}

// =========================================================================
// WEBGIS LEAFLET MAP & TILE MANAGEMENT
// =========================================================================

function initMap() {
  if (mainMap) return;
  const mapEl = document.getElementById('main-map');
  if (!mapEl) return;

  mainMap = L.map('main-map', {
    center: [22.0, 79.5],
    zoom: 5.4,
    scrollWheelZoom: true
  });

  const isDark = document.documentElement.classList.contains('dark');
  const layerDef = (isDark && activeBaseMap === 'osm') ? BASEMAP_TILES.dark : BASEMAP_TILES.osm;
  baseTileLayer = L.tileLayer(layerDef.url, {
    attribution: layerDef.attr,
    maxZoom: 18
  }).addTo(mainMap);

  // Gazetted protected area centroids with circle markers
  PROTECTED_FOREST_AREAS.forEach(pa => {
    const paMarker = L.circle([pa.lat, pa.lon], {
      radius: 12000,
      color: '#059669',
      fillColor: '#10b981',
      fillOpacity: 0.18,
      weight: 1.5,
      dashArray: '4, 4'
    }).addTo(mainMap);

    paMarker.bindPopup(`
      <div class="text-xs p-1">
        <strong class="text-emerald-900 dark:text-emerald-400 block font-bold text-sm">${pa.name}</strong>
        <span class="text-emerald-700 dark:text-emerald-300 block mt-0.5">Category: ${pa.type}</span>
        <span class="text-stone-500 dark:text-stone-400 text-[10px] mt-1 block">Gazetted Protected Forest Zone / Wildlife Corridor (12km buffer)</span>
      </div>
    `);
  });
}

function switchBaseMap(type) {
  if (!mainMap || !BASEMAP_TILES[type]) return;
  activeBaseMap = type;

  if (baseTileLayer) {
    mainMap.removeLayer(baseTileLayer);
  }

  const isDark = document.documentElement.classList.contains('dark');
  const def = (type === 'osm' && isDark) ? BASEMAP_TILES.dark : BASEMAP_TILES[type];
  baseTileLayer = L.tileLayer(def.url, {
    attribution: def.attr,
    maxZoom: 18
  }).addTo(mainMap);

  // Update button classes
  ['osm', 'satellite', 'topo'].forEach(t => {
    const btn = document.getElementById(`btn-bm-${t}`);
    if (!btn) return;
    if (t === type) {
      btn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white shadow-xs transition';
    } else {
      btn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition';
    }
  });
}

function updateMapMarkers(claims) {
  if (!mainMap) return;

  mapMarkers.forEach(m => mainMap.removeLayer(m));
  mapMarkers = [];

  claims.forEach(c => {
    const lat = c.latitude || c.lat;
    const lon = c.longitude || c.lon;
    if (!lat || !lon) return;

    const color = SEVERITY_COLORS[c.severity] || '#94a3b8';
    const radius = c.severity === 'Critical' ? 7.5 : c.severity === 'High' ? 6 : c.severity === 'Medium' ? 5 : 4;

    const marker = L.circleMarker([lat, lon], {
      radius: radius,
      fillColor: color,
      color: '#ffffff',
      weight: 1.5,
      opacity: 0.95,
      fillOpacity: 0.88
    });

    const popupHtml = `
      <div class="text-xs p-1">
        <div class="text-[9px] uppercase font-bold tracking-wider text-stone-400 mb-0.5">Synthetic Demo Record</div>
        <div class="flex items-center justify-between gap-2 mb-1">
          <strong class="font-mono text-sm text-stone-900 dark:text-white">${c.claim_id}</strong>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${SEVERITY_BG[c.severity]}">${c.severity}</span>
        </div>
        <div class="text-stone-600 dark:text-stone-300 space-y-0.5 mb-1.5">
          <div>Claimant: <strong>${c.claimant_name}</strong></div>
          <div>Location: ${c.district}, ${c.state}</div>
          <div>Area: ${c.area_acres} acres (${c.claim_type})</div>
          <div>Status: <span class="font-semibold">${c.status}</span></div>
          <div>Anomaly Score: <strong>${c.anomaly_score}/100</strong></div>
        </div>
        <button onclick="viewClaim('${c.claim_id}')" class="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-1 px-2 rounded text-[11px] transition text-center">
          Open Claim Intelligence →
        </button>
      </div>
    `;

    marker.bindPopup(popupHtml);
    marker.addTo(mainMap);
    mapMarkers.push(marker);
  });
}

function districtFillColor(anomalyRate) {
  if (anomalyRate >= 50) return '#fecaca';
  if (anomalyRate >= 35) return '#fed7aa';
  if (anomalyRate >= 20) return '#fef3c7';
  return '#ecfdf5';
}

async function loadDistrictBoundaries() {
  if (!mainMap) return;
  try {
    const res = await fetch('/api/map/districts');
    if (res.ok) {
      districtGeoJson = await res.json();
    }
  } catch (e) {
    console.warn('District GeoJSON not reachable from server, will rely on claim points');
  }

  if (!districtGeoJson || !districtGeoJson.features) return;

  if (districtLayer) {
    mainMap.removeLayer(districtLayer);
  }

  districtLayer = L.geoJSON(districtGeoJson, {
    style: (feature) => ({
      fillColor: districtFillColor(feature.properties.anomaly_rate || 0),
      weight: 1.5,
      opacity: 0.85,
      color: '#64748b',
      fillOpacity: 0.45,
    }),
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      layer.bindPopup(`
        <div class="text-xs">
          <strong>${p.district}</strong>, ${p.state}<br/>
          Claims: ${p.claim_count} | Anomalies: ${p.anomalies} (${p.anomaly_rate}%)<br/>
          <button onclick="focusDistrict('${p.state}', '${p.district}')" class="mt-2 text-amber-600 font-semibold">View district claims →</button>
        </div>
      `);
      layer.on('click', () => focusDistrict(p.state, p.district));
    },
  }).addTo(mainMap);
}

function focusDistrict(state, district) {
  document.getElementById('map-state-filter').value = state;
  const subset = allClaims.filter(c => c.state === state && c.district === district);
  updateMapMarkers(subset.length ? subset : allClaims.filter(c => c.state === state));
  if (subset.length > 0) {
    const lat = subset[0].latitude || subset[0].lat;
    const lon = subset[0].longitude || subset[0].lon;
    mainMap.flyTo([lat, lon], 9, { duration: 1.2 });
  }
}

function filterMap() {
  const state = document.getElementById('map-state-filter').value;
  const sev = document.getElementById('map-severity-filter').value;

  let subset = allClaims.filter(c => {
    if (state && c.state !== state) return false;
    if (sev === 'Critical' && c.severity !== 'Critical') return false;
    if (sev === 'High' && c.severity !== 'High' && c.severity !== 'Critical') return false;
    if (sev === 'Medium' && c.severity === 'Normal' && c.severity === 'Low') return false;
    if (sev === 'Low' && c.severity === 'Normal') return false;
    if (sev === 'Normal' && c.severity !== 'Normal') return false;
    return true;
  });

  updateMapMarkers(subset);

  if (state && subset.length > 0) {
    const lat = subset[0].latitude || subset[0].lat;
    const lon = subset[0].longitude || subset[0].lon;
    mainMap.flyTo([lat, lon], 7.5, { duration: 1.2 });
  }
}

function resetMap() {
  document.getElementById('map-state-filter').value = '';
  document.getElementById('map-severity-filter').value = '';
  updateMapMarkers(allClaims);
  mainMap.flyTo([22.0, 79.5], 5.4, { duration: 1 });
}

function renderPriorityDistricts() {
  const el = document.getElementById('priority-districts-list');
  if (!el) return;

  const districts = (dashboardData && dashboardData.priority_districts) || [];
  if (!districts.length) {
    const fallback = [];
    statesData.forEach(s => {
      Object.values(s.districts || {}).forEach(d => {
        fallback.push({
          district: d.district,
          state: s.state,
          pending: d.pending,
          anomalies: d.anomalies,
          high_priority: d.high_priority,
          attention_reasons: d.anomalies >= 3 ? ['elevated cadastral discrepancies', 'processing threshold delay'] : ['monitoring recommended'],
        });
      });
    });
    fallback.sort((a, b) => (b.anomalies + b.high_priority) - (a.anomalies + a.high_priority));
    districts.push(...fallback.slice(0, 8));
  }

  el.innerHTML = districts.slice(0, 6).map((d, i) => `
    <div onclick="focusDistrict('${d.state}', '${d.district}')" class="flex items-center justify-between p-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 hover:bg-amber-50/50 dark:hover:bg-amber-950/40 cursor-pointer transition">
      <div class="flex items-center space-x-2 min-w-0">
        <span class="w-4 h-4 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold text-[10px] flex items-center justify-center shrink-0">${i + 1}</span>
        <div class="min-w-0">
          <div class="font-bold text-stone-900 dark:text-stone-100 text-xs truncate">${d.district} <span class="text-stone-400 font-normal">• ${d.state}</span></div>
          <div class="text-[9px] text-stone-500 dark:text-stone-400 truncate">${(d.attention_reasons || []).join(', ')}</div>
        </div>
      </div>
      <div class="text-right shrink-0">
        <span class="text-xs font-bold font-mono text-orange-600 dark:text-orange-400">${d.anomalies ?? 0}</span>
        <span class="text-[9px] text-stone-400 block">anomalies</span>
      </div>
    </div>
  `).join('');
}

function renderStateSummaryTable() {
  const tbody = document.getElementById('state-summary-table');
  if (!tbody) return;

  const rows = (dashboardData && dashboardData.state_summary) || statesData.map(s => ({
    state: s.state,
    total: s.total,
    approved: s.approved,
    pending: s.pending,
    approval_rate: s.approval_rate,
    anomalies: s.anomalies,
  }));

  tbody.innerHTML = rows.map(r => `
    <tr onclick="selectStateOnMap('${r.state}')" class="hover:bg-amber-50/50 dark:hover:bg-stone-800/60 cursor-pointer transition">
      <td class="px-3 py-2 font-semibold text-stone-900 dark:text-stone-100 font-sans">${r.state}</td>
      <td class="px-3 py-2 text-right text-stone-700 dark:text-stone-300">${r.total}</td>
      <td class="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400 font-semibold">${r.approved}</td>
      <td class="px-3 py-2 text-right text-amber-600 dark:text-amber-400 font-semibold">${r.pending}</td>
      <td class="px-3 py-2 text-right text-stone-700 dark:text-stone-300">${r.approval_rate}%</td>
      <td class="px-3 py-2 text-right text-orange-600 dark:text-orange-400 font-semibold">${r.anomalies}</td>
    </tr>
  `).join('');
}

function selectStateOnMap(stateName) {
  document.getElementById('map-state-filter').value = stateName;
  filterMap();
  mainMap.flyTo([22.0, 79.5], 6.2, { duration: 1 });
  document.getElementById('main-map').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderStatePerformanceChart() {
  const ctx = document.getElementById('statePerformanceChart');
  if (!ctx) return;

  if (stateChart) stateChart.destroy();

  const isDark = document.documentElement.classList.contains('dark');
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9';

  const labels = statesData.map(s => s.state.length > 10 ? s.state.substring(0, 9) + '…' : s.state);
  const approvedData = statesData.map(s => s.approved);
  const pendingData = statesData.map(s => s.pending);
  const rejectedData = statesData.map(s => s.rejected);

  stateChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Approved', data: approvedData, backgroundColor: '#10b981', borderRadius: 4 },
        { label: 'Pending', data: pendingData, backgroundColor: '#f59e0b', borderRadius: 4 },
        { label: 'Rejected', data: rejectedData, backgroundColor: '#f43f5e', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: 'top', 
          labels: { 
            boxWidth: 12, 
            color: tickColor,
            font: { size: 10 } 
          } 
        }
      },
      scales: {
        x: { 
          stacked: true, 
          grid: { display: false }, 
          ticks: { color: tickColor, font: { size: 10 } } 
        },
        y: { 
          stacked: true, 
          grid: { color: gridColor }, 
          ticks: { color: tickColor, font: { size: 10 } } 
        }
      }
    }
  });
}

function populateFilterDropdowns() {
  const states = [...new Set(allClaims.map(c => c.state))].sort();
  const districts = [...new Set(allClaims.map(c => c.district))].sort();

  const mapStateSelect = document.getElementById('map-state-filter');
  const filterStateSelect = document.getElementById('filter-state');
  const filterDistrictSelect = document.getElementById('filter-district');

  states.forEach(s => {
    mapStateSelect.add(new Option(s, s));
    filterStateSelect.add(new Option(s, s));
  });

  districts.forEach(d => {
    filterDistrictSelect.add(new Option(d, d));
  });
}

// =========================================================================
// CLAIMS EXPLORER TABLE & FILTERING
// =========================================================================

function renderClaimsTable() {
  const tbody = document.getElementById('claims-table-body');
  const total = filteredClaims.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageClaims = filteredClaims.slice(start, end);

  document.getElementById('claims-count-badge').innerText = `Total ${total} claims (${start + 1}-${end})`;
  document.getElementById('pagination-info').innerText = `Page ${currentPage} of ${totalPages} (${total} total)`;
  document.getElementById('btn-prev').disabled = currentPage === 1;
  document.getElementById('btn-next').disabled = currentPage >= totalPages;

  if (pageClaims.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-stone-400 font-medium">No claims match the selected filter criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = pageClaims.map(c => {
    const sevClass = SEVERITY_BG[c.severity] || 'bg-stone-100 text-stone-700 border-stone-300';
    const statusClass = STATUS_BG[c.status] || 'bg-stone-100 text-stone-700 border-stone-300';
    return `
      <tr class="hover:bg-amber-500/5 dark:hover:bg-stone-800/60 transition cursor-pointer group" onclick="viewClaim('${c.claim_id}')">
        <td class="px-4 py-3.5">
          <div class="font-mono font-bold text-stone-900 dark:text-stone-100 text-xs group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">${c.claim_id}</div>
          <div class="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">${c.claimant_name}</div>
        </td>
        <td class="px-4 py-3.5">
          <div class="text-stone-800 dark:text-stone-200 font-semibold text-xs">${c.district}</div>
          <div class="text-[11px] text-stone-400 font-mono">${c.state}</div>
        </td>
        <td class="px-4 py-3.5">
          <div class="text-stone-900 dark:text-stone-100 font-mono font-bold text-xs">${c.area_acres} ac</div>
          <div class="text-[11px] text-stone-400">${c.claim_type}</div>
        </td>
        <td class="px-4 py-3.5">
          <span class="px-2.5 py-1 rounded-full border text-[10px] font-bold ${statusClass}">${c.status}</span>
        </td>
        <td class="px-4 py-3.5 font-mono text-xs font-semibold ${c.days_pending > 180 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-stone-600 dark:text-stone-400'}">
          ${c.days_pending || 0}d
        </td>
        <td class="px-4 py-3.5">
          <div class="flex items-center space-x-2">
            <span class="font-mono font-bold text-xs ${c.anomaly_score >= 60 ? 'text-rose-600 dark:text-rose-400' : 'text-stone-800 dark:text-stone-200'}">${c.anomaly_score}</span>
            <div class="w-16 bg-stone-200/70 dark:bg-stone-700 rounded-full h-1.5 overflow-hidden">
              <div class="h-full ${c.anomaly_score >= 80 ? 'bg-rose-600' : c.anomaly_score >= 60 ? 'bg-orange-500' : c.anomaly_score >= 25 ? 'bg-amber-500' : 'bg-stone-400'}" style="width: ${c.anomaly_score}%"></div>
            </div>
          </div>
        </td>
        <td class="px-4 py-3.5">
          <span class="px-2.5 py-0.5 rounded-full border text-[10px] font-bold font-mono ${sevClass}">${c.severity}</span>
        </td>
        <td class="px-4 py-3.5 text-right">
          <button onclick="event.stopPropagation(); viewClaim('${c.claim_id}')" class="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-2xs hover:scale-105 transition">
            Inspect →
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function setQuickFilter(type) {
  const stateEl = document.getElementById('filter-state');
  const distEl = document.getElementById('filter-district');
  const statusEl = document.getElementById('filter-status');
  const sevEl = document.getElementById('filter-severity');
  const anomEl = document.getElementById('filter-anomaly');

  if (stateEl) stateEl.value = '';
  if (distEl) distEl.value = '';
  if (statusEl) statusEl.value = '';
  if (sevEl) sevEl.value = '';
  if (anomEl) anomEl.value = '';

  if (type === 'critical' && sevEl) sevEl.value = 'Critical';
  else if (type === 'delayed' && anomEl) anomEl.value = 'DELAYED_CLAIM';
  else if (type === 'mp' && stateEl) stateEl.value = 'Madhya Pradesh';
  else if (type === 'cg' && stateEl) stateEl.value = 'Chhattisgarh';
  else if (type === 'odisha' && stateEl) stateEl.value = 'Odisha';

  applyFilters();
}

function applyFilters() {
  const state = document.getElementById('filter-state').value;
  const district = document.getElementById('filter-district').value;
  const status = document.getElementById('filter-status').value;
  const severity = document.getElementById('filter-severity').value;
  const anomaly = document.getElementById('filter-anomaly').value;

  filteredClaims = allClaims.filter(c => {
    if (state && c.state !== state) return false;
    if (district && c.district !== district) return false;
    if (status && c.status !== status) return false;
    if (severity && c.severity !== severity) return false;
    if (anomaly) {
      const types = Array.isArray(c.anomaly_types) ? c.anomaly_types : JSON.parse(c.anomaly_types || '[]');
      if (!types.includes(anomaly)) return false;
    }
    return true;
  });

  currentPage = 1;
  renderClaimsTable();
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderClaimsTable();
  }
}

function nextPage() {
  const totalPages = Math.ceil(filteredClaims.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    renderClaimsTable();
  }
}

function handleGlobalSearch(query) {
  if (!query) return;
  query = query.trim().toLowerCase();
  navigateTo('claims');

  filteredClaims = allClaims.filter(c => 
    c.claim_id.toLowerCase().includes(query) ||
    c.claimant_name.toLowerCase().includes(query) ||
    c.district.toLowerCase().includes(query) ||
    c.state.toLowerCase().includes(query)
  );

  currentPage = 1;
  renderClaimsTable();
}

// =========================================================================
// CLAIM INTELLIGENCE (HERO VIEW)
// =========================================================================

async function viewClaim(claimId) {
  currentClaim = allClaims.find(c => c.claim_id === claimId);
  if (!currentClaim) return;

  navigateTo('claim-detail');

  // Stop previous voice briefing if running
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  isAudioSpeaking = false;
  const audioBtnLabel = document.getElementById('audio-btn-label');
  if (audioBtnLabel) audioBtnLabel.innerText = TRANSLATIONS[currentLanguage].audio_listen;

  // Header badges
  document.getElementById('detail-claim-id').innerText = currentClaim.claim_id;
  document.getElementById('detail-badge-id').innerText = currentClaim.claim_id;
  document.getElementById('detail-location').innerText = `${currentClaim.district}, ${currentClaim.state}`;
  document.getElementById('detail-claimant').innerText = currentClaim.claimant_name;
  document.getElementById('detail-type-area').innerText = `${currentClaim.claim_type} Claim (${currentClaim.area_acres} acres)`;
  document.getElementById('detail-days-pending').innerText = currentClaim.days_pending || 0;

  // Status & Severity pills
  const sevClass = SEVERITY_BG[currentClaim.severity] || 'bg-stone-100 text-stone-700 border-stone-300';
  const statusClass = STATUS_BG[currentClaim.status] || 'bg-stone-100 text-stone-700 border-stone-300';
  document.getElementById('detail-severity-pill').className = `px-2.5 py-1 rounded-md border text-xs font-bold ${sevClass}`;
  document.getElementById('detail-severity-pill').innerText = currentClaim.severity.toUpperCase();
  document.getElementById('detail-status-pill').className = `px-2.5 py-1 rounded-md border text-xs font-bold ${statusClass}`;
  document.getElementById('detail-status-pill').innerText = currentClaim.status;

  // Anomaly score meter
  document.getElementById('detail-score-number').innerText = currentClaim.anomaly_score;
  const scoreBar = document.getElementById('detail-score-bar');
  scoreBar.style.width = `${currentClaim.anomaly_score}%`;
  scoreBar.className = `h-full rounded-full transition-all duration-500 ${
    currentClaim.anomaly_score >= 80 ? 'bg-red-600' : 
    currentClaim.anomaly_score >= 60 ? 'bg-orange-500' : 
    currentClaim.anomaly_score >= 40 ? 'bg-amber-500' : 'bg-blue-500'
  }`;

  // Flagged Detection Signals List
  const flaggedList = document.getElementById('detail-flagged-list');
  const anomalyTypes = Array.isArray(currentClaim.anomaly_types) 
    ? currentClaim.anomaly_types 
    : JSON.parse(currentClaim.anomaly_types || '[]');

  const anomalyDescriptions = {
    'DELAYED_CLAIM': `Processing pending for ${currentClaim.days_pending} days beyond statutory 180-day threshold`,
    'LAND_RECORD_MISMATCH': `Cadastral record status indicates mismatch with claimed ${currentClaim.area_acres} acres`,
    'INCOMPLETE_DOCUMENTATION': 'Required supporting Gram Sabha resolution or caste documentation incomplete',
    'UNUSUAL_AREA': `Claim area of ${currentClaim.area_acres} acres significantly higher than typical 2-4 acre district norm`,
    'GEOGRAPHIC_INCONSISTENCY': 'GPS coordinates fall outside recognized revenue / forest village boundary',
    'POSSIBLE_DUPLICATE': 'Identical claimant details matched with another pending application',
    'HISTORICAL_CANOPY_CLEARING': 'Satellite NDVI shows dense canopy in 2005 with clearing post-2010 (potential cut-off issue)',
    'PROTECTED_ZONE_OVERLAP': 'Plot falls within sensitive buffer of gazetted Wildlife Sanctuary or National Park'
  };

  if (anomalyTypes.length === 0) {
    flaggedList.innerHTML = `
      <div class="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
        <i data-lucide="shield-check" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i>
        <span>No anomalies flagged. Claim records meet standard automated compliance rules.</span>
      </div>
    `;
  } else {
    flaggedList.innerHTML = anomalyTypes.map(type => `
      <div class="p-2.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-lg text-xs text-stone-800 dark:text-stone-200 flex items-start space-x-2.5">
        <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"></i>
        <div>
          <strong class="text-amber-900 dark:text-amber-300 block font-mono text-[11px] mb-0.5">${type}</strong>
          <span class="text-stone-600 dark:text-stone-300">${anomalyDescriptions[type] || 'Flagged for administrative verification'}</span>
        </div>
      </div>
    `).join('');
  }

  // Raw Ground Truth Evidence Grid
  const evidenceGrid = document.getElementById('detail-evidence-grid');
  const evidence = [
    { label: 'Claimant Name', val: currentClaim.claimant_name },
    { label: 'Claim Type', val: currentClaim.claim_type },
    { label: 'Claimed Area', val: `${currentClaim.area_acres || currentClaim.claimed_area} acres` },
    { label: 'Recorded Area', val: `${currentClaim.recorded_area ?? currentClaim.area_acres} acres` },
    { label: 'Submission Date', val: currentClaim.submission_date },
    { label: 'Approval Date', val: currentClaim.approval_date || 'None (Pending)' },
    { label: 'Land Record Status', val: currentClaim.land_record_status },
    { label: 'Documents Complete', val: currentClaim.documents_complete ? 'Yes (Verified)' : 'No (Missing Records)' },
    { label: 'Days in Process', val: `${currentClaim.days_pending} days` }
  ];

  evidenceGrid.innerHTML = evidence.map(e => `
    <div class="bg-stone-50 dark:bg-stone-900/60 p-2.5 rounded-lg border border-stone-200 dark:border-stone-800">
      <span class="text-[10px] text-stone-400 dark:text-stone-500 uppercase font-semibold block mb-0.5">${e.label}</span>
      <span class="text-stone-800 dark:text-stone-200 font-medium">${e.val}</span>
    </div>
  `).join('');

  // Coordinates
  const lat = currentClaim.latitude || currentClaim.lat;
  const lon = currentClaim.longitude || currentClaim.lon;
  document.getElementById('detail-coords').innerText = `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`;

  // Mini Map
  updateMiniMap(lat, lon, currentClaim.claim_id, currentClaim.severity);

  // Load Quantitative Explainable Evidence
  await renderExplainableEvidence(claimId);

  // Load Satellite & Spatial Conflict Intelligence
  await loadClaimSpatialAnalysis(claimId);

  // Load Audit Trail History
  await loadAuditTrail(claimId);

  // Reset AI card state
  document.getElementById('ai-cta-state').classList.remove('hidden');
  document.getElementById('ai-loading-state').classList.add('hidden');
  document.getElementById('ai-report-state').classList.add('hidden');

  if (window.lucide) lucide.createIcons();
}

async function renderExplainableEvidence(claimId) {
  const container = document.getElementById('detail-anomaly-evidence');
  if (!container) return;
  container.innerHTML = '<p class="text-xs text-stone-400">Loading quantitative baseline comparisons...</p>';

  let payload = null;
  try {
    const res = await fetch(`/api/anomalies/${claimId}`);
    if (res.ok) payload = await res.json();
  } catch (e) {
    console.warn('Evidence API unavailable, using client-side fallback');
  }

  const evidenceBlocks = payload?.evidence || [];
  if (!evidenceBlocks.length) {
    container.innerHTML = `
      <div class="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
        No anomalies flagged. Claim is within normal automated screening parameters.
      </div>`;
    return;
  }

  container.innerHTML = evidenceBlocks.map(block => {
    const metricsHtml = Object.entries(block.metrics || {}).map(([k, v]) =>
      `<div class="flex justify-between gap-2 text-[11px]"><span class="text-stone-500 dark:text-stone-400">${k.replace(/_/g, ' ')}</span><span class="font-mono font-semibold text-stone-900 dark:text-stone-100">${v}</span></div>`
    ).join('');

    return `
      <div class="border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-3">
        <div class="flex items-center justify-between gap-2 mb-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 font-mono">${block.type}</span>
          <span class="text-[10px] text-amber-700 dark:text-amber-400 font-medium">⚠ ${block.severity_hint || 'Potential anomaly'}</span>
        </div>
        <div class="grid grid-cols-1 gap-1.5 mb-2 bg-white/90 dark:bg-stone-900/70 rounded-md p-2.5 border border-amber-100 dark:border-amber-900/40">${metricsHtml}</div>
        <p class="text-[11px] text-stone-700 dark:text-stone-300 leading-relaxed"><strong class="text-stone-900 dark:text-stone-100">Why flagged:</strong> ${block.explanation}</p>
      </div>`;
  }).join('');
}

// Satellite Temporal NDVI & Protected Area Geo-Fencing
async function loadClaimSpatialAnalysis(claimId) {
  let data = null;
  try {
    const res = await fetch(`/api/claims/${claimId}/spatial-analysis`);
    if (res.ok) {
      data = await res.json();
    }
  } catch (e) {
    console.warn('Spatial analysis API call failed, generating locally');
  }

  // Client-side fallback if server route not reached
  if (!data) {
    const isDemo3 = claimId === 'DEMO-003';
    data = {
      claim_id: claimId,
      nearest_protected_area: {
        name: isDemo3 ? 'Pench Tiger Reserve (MP)' : 'Kanha National Park (Mandla)',
        type: 'Critical Tiger Habitat',
        distance_km: isDemo3 ? 14.2 : 28.5,
        buffer_status: isDemo3 ? 'Eco-Sensitive Buffer Zone (<15km)' : 'Standard Beat (>25km)',
        conflict_severity: isDemo3 ? 'High' : 'Normal'
      },
      temporal_satellite_analysis: {
        cutoff_year_2005: {
          year: 2005,
          ndvi: isDemo3 ? 0.74 : 0.28,
          canopy_density_pct: isDemo3 ? 81 : 22,
          classification: isDemo3 ? 'Dense Intact Forest Canopy' : 'Cultivated / Settled Plot'
        },
        midterm_year_2015: {
          year: 2015,
          ndvi: isDemo3 ? 0.65 : 0.31,
          canopy_density_pct: isDemo3 ? 68 : 24,
          classification: isDemo3 ? 'Initial Fragmentation' : 'Stabilized Agriculture'
        },
        present_year_2024: {
          year: 2024,
          ndvi: isDemo3 ? 0.32 : 0.30,
          canopy_density_pct: isDemo3 ? 27 : 23,
          classification: isDemo3 ? 'Recent Forest Clearing' : 'Active Cultivation'
        },
        verdict: isDemo3 ? 'High Risk: Post-2005 Forest Clearing Detected' : 'Pre-2005 Cultivation Corroborated',
        details: isDemo3 
          ? 'Spectral time-series confirms intact closed-canopy forest (NDVI 0.74, 81% canopy) as of December 2005. Clearing occurred post-2015.'
          : 'Historical Landsat spectral index (NDVI: 0.28) indicates open agricultural clearing prior to Dec 13, 2005 cut-off. Fully compliant.',
        fra_cutoff_compliant: !isDemo3
      }
    };
  }

  currentSpatialData = data;
  const sat = data.temporal_satellite_analysis;
  const pa = data.nearest_protected_area;

  // Header cutoff badge
  const cutoffPill = document.getElementById('detail-cutoff-pill');
  if (cutoffPill) {
    if (sat.fra_cutoff_compliant) {
      cutoffPill.className = 'text-xs px-2.5 py-0.5 rounded-md border font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      cutoffPill.innerText = '✓ FRA 2005 Cut-Off Compliant';
    } else {
      cutoffPill.className = 'text-xs px-2.5 py-0.5 rounded-md border font-bold bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800 pulse-danger';
      cutoffPill.innerText = '⚠ Post-2005 Clearing Alert';
    }
  }

  // 3-Epoch Grid
  const epochGrid = document.getElementById('satellite-epoch-grid');
  if (epochGrid) {
    const epochs = [sat.cutoff_year_2005, sat.midterm_year_2015, sat.present_year_2024];
    epochGrid.innerHTML = epochs.map((ep, i) => `
      <div class="p-2.5 rounded-lg border ${
        i === 0 
          ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30' 
          : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60'
      }">
        <span class="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase block mb-1">
          ${ep.year} ${i === 0 ? '<span class="text-amber-600 dark:text-amber-400 font-bold">(Cut-off)</span>' : ''}
        </span>
        <div class="font-mono text-base font-black text-stone-900 dark:text-white">${ep.ndvi}</div>
        <div class="text-[10px] font-semibold text-stone-600 dark:text-stone-300 mt-0.5">${ep.canopy_density_pct}% Canopy</div>
        <span class="inline-block text-[9px] px-1.5 py-0.5 rounded mt-1.5 font-medium ${
          ep.ndvi > 0.6 
            ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300' 
            : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
        }">${ep.classification}</span>
      </div>
    `).join('');
  }

  // Verdict Box
  const verdictBox = document.getElementById('satellite-verdict-box');
  if (verdictBox) {
    if (sat.fra_cutoff_compliant) {
      verdictBox.className = 'p-3 rounded-lg text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-start space-x-2.5';
      verdictBox.innerHTML = `
        <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5"></i>
        <div>
          <strong class="block font-bold">${sat.verdict}</strong>
          <span class="text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">${sat.details}</span>
        </div>
      `;
    } else {
      verdictBox.className = 'p-3 rounded-lg text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 flex items-start space-x-2.5';
      verdictBox.innerHTML = `
        <i data-lucide="alert-octagon" class="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"></i>
        <div>
          <strong class="block font-bold">${sat.verdict}</strong>
          <span class="text-red-800 dark:text-red-300 text-[11px] leading-relaxed">${sat.details}</span>
        </div>
      `;
    }
  }

  // Protected Area Box
  const paBox = document.getElementById('protected-zone-box');
  if (paBox && pa) {
    const isConflict = pa.conflict_severity === 'Critical' || pa.conflict_severity === 'High';
    paBox.className = `p-3 rounded-lg border text-xs ${
      isConflict 
        ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/50 text-orange-950 dark:text-orange-200' 
        : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200'
    }`;
    paBox.innerHTML = `
      <div class="flex justify-between items-start mb-1">
        <strong class="font-bold text-stone-900 dark:text-white text-xs">${pa.name}</strong>
        <span class="font-mono font-bold text-[11px] ${isConflict ? 'text-red-600 dark:text-red-400' : 'text-stone-600 dark:text-stone-400'}">${pa.distance_km} km away</span>
      </div>
      <div class="text-[11px] text-stone-600 dark:text-stone-400 mb-1">
        <span>Zone: <strong>${pa.type}</strong></span> • 
        <span>Buffer Status: <strong class="${isConflict ? 'text-red-600 dark:text-red-400' : 'text-stone-700 dark:text-stone-300'}">${pa.buffer_status}</strong></span>
      </div>
      <p class="text-[10px] text-stone-500 dark:text-stone-400 mt-1 italic">
        Section 4(2) Advisory: ${isConflict ? 'Prior statutory wildlife corridor clearance required before granting tenure.' : 'Outside immediate Critical Tiger Habitat core boundaries.'}
      </p>
    `;

    // Draw buffer circle on mini-map
    if (miniMap && currentClaim) {
      const lat = currentClaim.latitude || currentClaim.lat;
      const lon = currentClaim.longitude || currentClaim.lon;
      if (miniMapBuffer) miniMap.removeLayer(miniMapBuffer);
      miniMapBuffer = L.circle([lat, lon], {
        radius: isConflict ? 2500 : 5000,
        color: isConflict ? '#dc2626' : '#10b981',
        fillColor: isConflict ? '#ef4444' : '#34d399',
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: '3, 3'
      }).addTo(miniMap);
    }
  }
}

// Mini Map
function updateMiniMap(lat, lon, claimId, severity) {
  if (!miniMap) {
    miniMap = L.map('mini-map', {
      center: [lat, lon],
      zoom: 11,
      zoomControl: false,
      scrollWheelZoom: false
    });
    const isDark = document.documentElement.classList.contains('dark');
    const tileDef = isDark ? BASEMAP_TILES.dark : BASEMAP_TILES.osm;
    L.tileLayer(tileDef.url, { attribution: '&copy; OpenStreetMap' }).addTo(miniMap);
  } else {
    miniMap.setView([lat, lon], 11);
    if (miniMapMarker) miniMap.removeLayer(miniMapMarker);
  }

  miniMapMarker = L.circleMarker([lat, lon], {
    radius: 9,
    fillColor: SEVERITY_COLORS[severity] || '#6366f1',
    color: '#ffffff',
    weight: 2.5,
    fillOpacity: 0.95
  }).addTo(miniMap);

  miniMapMarker.bindPopup(`<strong>${claimId}</strong><br>GPS Plot: ${lat.toFixed(4)}, ${lon.toFixed(4)}`).openPopup();
  setTimeout(() => miniMap.invalidateSize(), 300);
}

// Officer Administrative Action & Disposition
async function submitOfficerAction(e) {
  e.preventDefault();
  if (!currentClaim) return;

  const actionType = document.getElementById('action-type-select').value;
  const officerName = document.getElementById('action-officer-name').value;
  const officerDesig = document.getElementById('action-officer-desig').value;
  const remarks = document.getElementById('action-remarks').value;

  const payload = {
    action_type: actionType,
    officer_name: officerName,
    officer_designation: officerDesig,
    remarks: remarks
  };

  let resData = null;
  try {
    const res = await fetch(`/api/claims/${currentClaim.claim_id}/disposition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      resData = await res.json();
    }
  } catch (err) {
    console.warn('Backend disposition route failed, recording in local state');
  }

  const nowStr = new Date().toISOString();
  const noticeRef = resData?.disposition?.notice_ref_no || `SDLC/${new Date().getFullYear()}/NOT-${Math.floor(Math.random() * 9000 + 1000)}`;

  const newDisp = {
    claim_id: currentClaim.claim_id,
    action_type: actionType,
    officer_name: officerName,
    officer_designation: officerDesig,
    remarks: remarks,
    notice_ref_no: noticeRef,
    created_at: nowStr
  };

  currentAuditTrail.unshift(newDisp);
  renderAuditTrail();

  alert(TRANSLATIONS[currentLanguage].action_recorded_msg + `\nReference No: ${noticeRef}`);
  openOfficialNoticeMemo();
}

async function loadAuditTrail(claimId) {
  currentAuditTrail = [];
  try {
    const res = await fetch(`/api/claims/${claimId}/audit-trail`);
    if (res.ok) {
      const data = await res.json();
      currentAuditTrail = data.dispositions || [];
    }
  } catch (e) {
    console.warn('Audit trail API unavailable, using local mock');
  }

  if (currentAuditTrail.length === 0) {
    currentAuditTrail = [
      {
        claim_id: claimId,
        action_type: 'INITIAL_SCREENING_FLAGGED',
        officer_name: 'VanRaksha AI Screening Engine',
        officer_designation: 'Automated Triaging Service',
        remarks: 'System detected land record discrepancy exceeding 20% cadastral margin.',
        notice_ref_no: `SYS/${new Date().getFullYear()}/AUD-0104`,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString()
      }
    ];
  }

  renderAuditTrail();
}

function renderAuditTrail() {
  const container = document.getElementById('audit-trail-timeline');
  const countEl = document.getElementById('audit-trail-count');
  if (countEl) countEl.innerText = `${currentAuditTrail.length} recorded`;
  if (!container) return;

  container.innerHTML = currentAuditTrail.map(ev => `
    <div class="p-2.5 bg-stone-50 dark:bg-stone-900/60 rounded-lg border border-stone-200 dark:border-stone-800">
      <div class="flex items-center justify-between gap-2 mb-1">
        <span class="font-mono text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded">${ev.action_type}</span>
        <span class="text-[10px] text-stone-400 font-mono">${(ev.created_at || '').substring(0, 10)}</span>
      </div>
      <div class="text-[11px] text-stone-700 dark:text-stone-300">
        <strong>${ev.officer_name}</strong> <span class="text-stone-500 dark:text-stone-400 font-normal">(${ev.officer_designation})</span>
      </div>
      ${ev.remarks ? `<div class="text-[11px] text-stone-600 dark:text-stone-400 mt-1 italic">"${ev.remarks}"</div>` : ''}
      <div class="text-[9px] text-stone-400 font-mono mt-1">Ref: ${ev.notice_ref_no || 'N/A'}</div>
    </div>
  `).join('');
}

// Web Speech Officer Audio Executive Briefing
function toggleAudioBriefing() {
  if (!window.speechSynthesis) {
    alert('Web Speech API is not supported on this browser.');
    return;
  }

  const btnLabel = document.getElementById('audio-btn-label');

  if (isAudioSpeaking) {
    window.speechSynthesis.cancel();
    isAudioSpeaking = false;
    if (btnLabel) btnLabel.innerText = TRANSLATIONS[currentLanguage].audio_listen;
    return;
  }

  if (!currentClaim) return;

  const sat = currentSpatialData?.temporal_satellite_analysis;
  let textToSpeak = '';

  if (currentLanguage === 'hi') {
    textToSpeak = `अधिकारी ब्रीफिंग। दावा संख्या ${currentClaim.claim_id}, आवेदक ${currentClaim.claimant_name}, जिला ${currentClaim.district}, ${currentClaim.state}। कुल क्षेत्रफल ${currentClaim.area_acres} एकड़। विसंगति अंक 100 में से ${currentClaim.anomaly_score}, प्राथमिकता ${currentClaim.severity}। ${
      sat?.fra_cutoff_compliant
        ? 'उपग्रह विश्लेषण पुष्टि करता है कि आवेदक वर्ष 2005 की निर्धारित तिथि से पूर्व भूमि पर काबिज है।'
        : 'सावधान! उपग्रह आंकड़ों में वर्ष 2005 के बाद वन क्षेत्र में कटाई पाई गई है।'
    } उप-प्रभागीय समिति को तत्काल स्थलीय सत्यापन और ग्राम सभा अभिलेख जांच की अनुशंसा की जाती है।`;
  } else {
    textToSpeak = `Administrative brief for Claim ${currentClaim.claim_id}. Claimant: ${currentClaim.claimant_name}, located in ${currentClaim.district}, ${currentClaim.state}. Land parcel: ${currentClaim.area_acres} acres. Calculated anomaly score is ${currentClaim.anomaly_score} out of 100, severity classified as ${currentClaim.severity}. ${
      sat?.fra_cutoff_compliant
        ? 'Satellite spectral evidence corroborates pre-2005 agricultural cultivation in compliance with Section 4(3) of the Forest Rights Act.'
        : 'Warning! Satellite time-series indicates post-2005 forest clearing. High priority field cadastral audit recommended.'
    } Recommended next action: Sub-Divisional Committee should order joint field survey before title clearance.`;
  }

  speechUtterance = new SpeechSynthesisUtterance(textToSpeak);
  speechUtterance.rate = 0.95;
  speechUtterance.pitch = 1.0;
  speechUtterance.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';

  speechUtterance.onstart = () => {
    isAudioSpeaking = true;
    if (btnLabel) btnLabel.innerText = TRANSLATIONS[currentLanguage].audio_stop;
  };

  speechUtterance.onend = () => {
    isAudioSpeaking = false;
    if (btnLabel) btnLabel.innerText = TRANSLATIONS[currentLanguage].audio_listen;
  };

  speechUtterance.onerror = () => {
    isAudioSpeaking = false;
    if (btnLabel) btnLabel.innerText = TRANSLATIONS[currentLanguage].audio_listen;
  };

  window.speechSynthesis.speak(speechUtterance);
}

// Gemini AI Analysis
async function runAIAnalysis() {
  if (!currentClaim) return;

  document.getElementById('ai-cta-state').classList.add('hidden');
  document.getElementById('ai-loading-state').classList.remove('hidden');
  document.getElementById('ai-report-state').classList.add('hidden');

  let result = null;

  try {
    const res = await fetch('/api/ai/analyze-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim_id: currentClaim.claim_id })
    });
    if (res.ok) {
      result = await res.json();
    }
  } catch (e) {
    console.warn('Backend AI API call failed, generating deterministic synthesis:', e);
  }

  if (!result) {
    await new Promise(r => setTimeout(r, 600));
    const anomalyTypes = Array.isArray(currentClaim.anomaly_types) 
      ? currentClaim.anomaly_types 
      : JSON.parse(currentClaim.anomaly_types || '[]');

    const anomalyTextMap = {
      'DELAYED_CLAIM': `Processing delayed by ${currentClaim.days_pending} days beyond statutory 180-day threshold`,
      'LAND_RECORD_MISMATCH': `Cadastral boundary records show discrepancy with claimed ${currentClaim.area_acres} acres`,
      'INCOMPLETE_DOCUMENTATION': 'Supporting Gram Sabha resolution or identity documentation missing',
      'UNUSUAL_AREA': `Claimed area of ${currentClaim.area_acres} acres is unusually large for individual tenure`,
      'GEOGRAPHIC_INCONSISTENCY': 'GPS plot coordinates fall outside designated revenue/forest boundary polygon',
      'POSSIBLE_DUPLICATE': 'Identical claimant parameters matched to existing submission',
      'HISTORICAL_CANOPY_CLEARING': 'Satellite multi-temporal imagery suggests post-2005 forest clearance',
      'PROTECTED_ZONE_OVERLAP': 'Plot falls within eco-sensitive buffer of gazetted Wildlife Sanctuary'
    };

    const reasons = anomalyTypes.map(t => anomalyTextMap[t] || t.replace('_', ' '));

    let action = '';
    if (currentClaim.severity === 'Critical') {
      action = `Immediate high-priority manual review recommended. Sub-Divisional Level Committee (SDLC) should halt automated clearance, order ground cadastral survey in ${currentClaim.district}, and verify physical Gram Sabha records before decision.`;
    } else if (currentClaim.severity === 'High') {
      action = `Priority inspection required. Cross-reference land records with district revenue office and request missing documentation from ${currentClaim.claimant_name}.`;
    } else if (currentClaim.severity === 'Medium') {
      action = `Standard review with focus on flagged verification. Issue notification to local Forest Rights Committee (FRC) to clear documentation bottlenecks.`;
    } else {
      action = `Routine administrative processing. No red-flag conditions detected.`;
    }

    result = {
      summary: `Claim ${currentClaim.claim_id} by ${currentClaim.claimant_name} for ${currentClaim.area_acres} acres in ${currentClaim.district}, ${currentClaim.state}. Current status is ${currentClaim.status} with an anomaly score of ${currentClaim.anomaly_score}/100 (${currentClaim.severity}).`,
      why_flagged: reasons.length > 0 ? reasons : ['Routine compliance verification — no severe flags detected.'],
      recommended_action: action,
      disclaimer: 'This intelligence report was generated for decision support. It flags claims for administrative attention and does not constitute an official legal determination.'
    };
  }

  // Render AI Output
  document.getElementById('ai-summary-text').innerText = result.summary;
  const whyList = document.getElementById('ai-why-flagged-list');
  const reasons = Array.isArray(result.why_flagged) ? result.why_flagged : [result.why_flagged];
  whyList.innerHTML = reasons.map(r => `<li>${r}</li>`).join('');
  document.getElementById('ai-action-text').innerText = result.recommended_action;
  document.getElementById('ai-disclaimer-text').innerText = result.disclaimer;

  document.getElementById('ai-loading-state').classList.add('hidden');
  document.getElementById('ai-report-state').classList.remove('hidden');

  if (window.lucide) lucide.createIcons();
}

// =========================================================================
// STATE INTELLIGENCE & POLICY SIMULATOR
// =========================================================================

function renderStatesView() {
  const grid = document.getElementById('states-card-grid');
  grid.innerHTML = statesData.map(s => {
    const bm = officialBenchmarksData?.states?.find(b => b.state.toLowerCase() === s.state.toLowerCase()) || null;
    const bmClaims = bm ? Number(bm.claims_received_total).toLocaleString('en-IN') : 'N/A';
    const bmTitles = bm ? Number(bm.titles_distributed_total).toLocaleString('en-IN') : 'N/A';
    const bmRate = bm ? bm.approval_rate_pct : null;
    const bmAcres = bm ? (Number(bm.forest_land_extent_acres) / 100000).toFixed(1) + 'L ac' : '';

    return `
    <div onclick="drillIntoState('${s.state}')" class="bg-white dark:bg-stone-900/80 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xs hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-3">
      <div>
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-bold text-stone-900 dark:text-white text-sm">${s.state}</h3>
          <span class="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/40 px-2 py-0.5 rounded">Sample: ${s.total}</span>
        </div>
        
        <!-- Official MoTA Benchmark Reference Section -->
        <div class="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-lg p-2.5 mb-2.5 text-[11px]">
          <div class="flex justify-between items-center text-emerald-900 dark:text-emerald-300 font-bold mb-1">
            <span class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Official MoTA Baseline
            </span>
            <span class="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 font-mono">${bmRate !== null ? bmRate + '%' : ''}</span>
          </div>
          <div class="text-stone-600 dark:text-stone-400 flex justify-between">
            <span>Claims Received:</span>
            <strong class="text-stone-900 dark:text-stone-200 font-mono">${bmClaims}</strong>
          </div>
          <div class="text-stone-600 dark:text-stone-400 flex justify-between">
            <span>Titles Distributed:</span>
            <strong class="text-emerald-800 dark:text-emerald-400 font-mono">${bmTitles}</strong>
          </div>
          ${bmAcres ? `<div class="text-stone-500 dark:text-stone-400 text-[10px] flex justify-between mt-0.5"><span>Recognized Land:</span><span class="font-mono text-stone-700 dark:text-stone-300">${bmAcres}</span></div>` : ''}
        </div>

        <!-- Synthetic Demo Sample Breakdown -->
        <div class="space-y-1 text-xs text-stone-600 dark:text-stone-400 mb-1">
          <div class="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-0.5">Demo Sample (${s.total} Claims)</div>
          <div class="flex justify-between"><span>Approved:</span><strong class="text-emerald-700 dark:text-emerald-400">${s.approved}</strong></div>
          <div class="flex justify-between"><span>Pending:</span><strong class="text-amber-700 dark:text-amber-400">${s.pending}</strong></div>
          <div class="flex justify-between"><span>Anomalies:</span><strong class="text-orange-700 dark:text-orange-400">${s.anomalies}</strong></div>
          <div class="flex justify-between"><span>Critical Priority:</span><strong class="text-red-700 dark:text-red-400">${s.high_priority}</strong></div>
        </div>
      </div>

      <div>
        <div class="flex justify-between text-[10px] font-semibold text-stone-500 dark:text-stone-400 mb-1">
          <span>Sample Approval Rate</span>
          <span>${s.approval_rate}%</span>
        </div>
        <div class="w-full bg-stone-100 dark:bg-stone-700 rounded-full h-1.5 overflow-hidden">
          <div class="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full" style="width: ${s.approval_rate}%"></div>
        </div>
      </div>
    </div>
    `;
  }).join('');
}

let selectedState = null;

function drillIntoState(stateName) {
  selectedState = statesData.find(s => s.state === stateName);
  if (!selectedState) return;

  document.getElementById('drilldown-state-name').innerText = selectedState.state;
  document.getElementById('state-detail-panel').classList.remove('hidden');

  // Populate State Official MoTA Reference Benchmark Box
  const bm = officialBenchmarksData?.states?.find(b => b.state.toLowerCase() === selectedState.state.toLowerCase()) || null;
  const benchmarkBox = document.getElementById('state-benchmark-box');
  if (benchmarkBox) {
    if (bm) {
      benchmarkBox.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-2.5">
          <div class="flex items-center space-x-2">
            <span class="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider flex items-center gap-1">
              <i data-lucide="landmark" class="w-3 h-3"></i> Official MoTA Ground Truth
            </span>
            <span class="font-bold text-stone-900 dark:text-white text-sm">${selectedState.state} — Parliamentary Baseline</span>
          </div>
          <a href="${bm.source_url || 'https://tribal.nic.in/FRA.aspx'}" target="_blank" rel="noopener noreferrer" class="text-emerald-600 dark:text-emerald-400 hover:underline text-[11px] font-semibold flex items-center gap-1">
            <span>Ministry of Tribal Affairs</span>
            <i data-lucide="external-link" class="w-3 h-3"></i>
          </a>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-white dark:bg-stone-800 p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 shadow-2xs">
            <span class="text-[10px] uppercase font-bold text-stone-400 block">Total Claims Received</span>
            <div class="text-lg font-black text-stone-900 dark:text-white font-mono">${Number(bm.claims_received_total).toLocaleString('en-IN')}</div>
            <div class="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">Ind: ${Number(bm.claims_received_individual).toLocaleString('en-IN')} • Com: ${Number(bm.claims_received_community).toLocaleString('en-IN')}</div>
          </div>

          <div class="bg-white dark:bg-stone-800 p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 shadow-2xs">
            <span class="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Titles Distributed</span>
            <div class="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">${Number(bm.titles_distributed_total).toLocaleString('en-IN')}</div>
            <div class="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">Ind: ${Number(bm.titles_distributed_individual).toLocaleString('en-IN')} • Com: ${Number(bm.titles_distributed_community).toLocaleString('en-IN')}</div>
          </div>

          <div class="bg-white dark:bg-stone-800 p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 shadow-2xs">
            <span class="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">Forest Extent Recognized</span>
            <div class="text-lg font-black text-amber-700 dark:text-amber-400 font-mono">${(Number(bm.forest_land_extent_acres) / 100000).toFixed(2)} Lakh <span class="text-xs font-normal text-stone-500">acres</span></div>
            <div class="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">~${(Number(bm.forest_land_extent_acres) * 0.404686 / 100000).toFixed(2)} Lakh Ha</div>
          </div>

          <div class="bg-white dark:bg-stone-800 p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 shadow-2xs">
            <span class="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">Title Recognition Rate</span>
            <div class="text-lg font-black text-blue-700 dark:text-blue-400 font-mono">${bm.approval_rate_pct}%</div>
            <div class="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">MoTA MPR (March 2026)</div>
          </div>
        </div>

        <div class="bg-white/90 dark:bg-stone-800/90 p-2.5 rounded-lg border border-stone-200/90 dark:border-stone-700 text-[11px] text-stone-600 dark:text-stone-300 flex items-start gap-2">
          <i data-lucide="info" class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"></i>
          <div>
            <strong class="text-stone-800 dark:text-stone-200">MoTA Baseline Note:</strong> ${bm.source_note || 'Official Ministry of Tribal Affairs monthly progress report.'}
            <span class="text-stone-500 dark:text-stone-400 block mt-0.5">Below are <strong>${selectedState.total} synthetic demonstration claims</strong> mapped across priority districts to evaluate cadastral mismatches, processing delays, and satellite NDVI compliance.</span>
          </div>
        </div>
      `;
    } else {
      benchmarkBox.innerHTML = `<div class="text-stone-500 text-xs">Official benchmark context loading...</div>`;
    }
  }

  const tbody = document.getElementById('drilldown-districts-table');
  const distList = Object.values(selectedState.districts).sort((a, b) => b.anomalies - a.anomalies);

  tbody.innerHTML = distList.map(d => `
    <tr class="hover:bg-stone-50 dark:hover:bg-stone-850 transition">
      <td class="px-4 py-2 font-bold text-stone-900 dark:text-stone-100">${d.district}</td>
      <td class="px-4 py-2 text-right text-stone-700 dark:text-stone-300">${d.total}</td>
      <td class="px-4 py-2 text-right text-emerald-600 dark:text-emerald-400 font-semibold">${d.approved}</td>
      <td class="px-4 py-2 text-right text-amber-600 dark:text-amber-400 font-semibold">${d.pending}</td>
      <td class="px-4 py-2 text-right text-orange-600 dark:text-orange-400 font-semibold">${d.anomalies}</td>
      <td class="px-4 py-2 text-right text-red-600 dark:text-red-400 font-bold">${d.high_priority}</td>
      <td class="px-4 py-2 text-center">
        <button onclick="filterClaimsByDistrict('${selectedState.state}', '${d.district}')" class="text-amber-600 dark:text-amber-400 hover:text-amber-800 font-semibold">
          View Claims →
        </button>
      </td>
    </tr>
  `).join('');

  document.getElementById('state-ai-summary-box').classList.add('hidden');
  if (window.lucide) lucide.createIcons();
  document.getElementById('state-detail-panel').scrollIntoView({ behavior: 'smooth' });
}

function filterClaimsByDistrict(state, district) {
  navigateTo('claims');
  document.getElementById('filter-state').value = state;
  document.getElementById('filter-district').value = district;
  applyFilters();
}

async function generateStateAISummary() {
  if (!selectedState) return;
  const box = document.getElementById('state-ai-summary-box');
  const content = document.getElementById('state-ai-summary-content');
  box.classList.remove('hidden');
  content.innerText = 'Generating administrative state brief...';

  try {
    const res = await fetch('/api/ai/state-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: selectedState.state })
    });
    if (res.ok) {
      const data = await res.json();
      content.innerText = data.summary;
      return;
    }
  } catch (e) {
    console.warn('AI state-summary API call failed, generating locally');
  }

  content.innerText = `${selectedState.state} currently monitors ${selectedState.total} total FRA claims with ${selectedState.approved} approved (${selectedState.approval_rate}% approval rate). There are ${selectedState.pending} claims pending review, of which ${selectedState.high_priority} are classified as critical priority requiring immediate administrative intervention. Recommendation: deploy mobile survey squads to priority districts.`;
}

// What-If Policy Simulation Engine
async function runPolicySimulation() {
  const teamsInput = document.getElementById('sim-teams-input');
  const fastTrackInput = document.getElementById('sim-fasttrack-input');
  if (!teamsInput || !fastTrackInput) return;

  const teams = parseInt(teamsInput.value, 10);
  const fastTrack = fastTrackInput.checked;
  document.getElementById('sim-teams-val').innerText = `+${teams} Teams`;

  let payload = null;
  try {
    const res = await fetch('/api/simulation/clearance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        additional_survey_teams: teams,
        fast_track_small_holdings: fastTrack,
        target_resolution_days: 90
      })
    });
    if (res.ok) {
      payload = await res.json();
    }
  } catch (e) {
    console.warn('Simulation API call failed, calculating locally');
  }

  if (!payload) {
    const pendingTotal = dashboardData?.pending || 287;
    const baseSpeed = 14;
    let newSpeed = baseSpeed + (teams * 12);
    if (fastTrack) newSpeed = Math.round(newSpeed * 1.28);

    const baseWeeks = Math.ceil(pendingTotal / baseSpeed);
    const projWeeks = Math.ceil(pendingTotal / newSpeed);
    const daysSaved = Math.max(0, (baseWeeks - projWeeks) * 7);

    const trajectory = [];
    let cur = pendingTotal;
    for (let w = 0; w <= projWeeks + 2; w++) {
      trajectory.push({ week: w, remaining_claims: Math.max(0, cur) });
      cur -= newSpeed;
    }

    payload = {
      pending_claims: pendingTotal,
      baseline_weeks: baseWeeks,
      projected_weeks: projWeeks,
      days_saved: daysSaved,
      clearance_rate_weekly: newSpeed,
      trajectory: trajectory
    };
  }

  // Update UI indicators
  document.getElementById('sim-projected-weeks').innerHTML = `${payload.projected_weeks} <span class="text-sm font-normal text-amber-300">wks</span>`;
  document.getElementById('sim-baseline-weeks').innerText = payload.baseline_weeks;
  document.getElementById('sim-days-saved').innerHTML = `~${payload.days_saved} <span class="text-sm font-normal text-emerald-300">days</span>`;
  document.getElementById('sim-weekly-rate').innerHTML = `${payload.clearance_rate_weekly} <span class="text-xs font-normal text-stone-400">claims/wk</span>`;
  document.getElementById('sim-pending-claims').innerText = payload.pending_claims;

  renderSimulationChart(payload.trajectory || []);
}

function renderSimulationChart(trajectory) {
  const ctx = document.getElementById('simulationChart');
  if (!ctx) return;

  if (simulationChart) simulationChart.destroy();

  const labels = trajectory.map(t => `Wk ${t.week}`);
  const data = trajectory.map(t => t.remaining_claims);

  simulationChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Backlog Remaining',
          data: data,
          borderColor: '#818cf8',
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2.5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 9 } } },
        y: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#94a3b8', font: { size: 9 } } }
      }
    }
  });
}

// =========================================================================
// MODALS & ORDER MEMORANDUM
// =========================================================================

function openOfficialNoticeMemo() {
  if (!currentClaim) return;

  const memoModal = document.getElementById('modal-official-memo');
  const latestDisp = currentAuditTrail[0] || {};

  document.getElementById('memo-ref-no').innerText = latestDisp.notice_ref_no || `SDLC/2026/NOT-${Math.floor(Math.random() * 8000 + 1000)}`;
  document.getElementById('memo-date').innerText = new Date().toLocaleDateString('en-GB');
  document.getElementById('memo-claim-id').innerText = currentClaim.claim_id;
  document.getElementById('memo-claimant-name').innerText = currentClaim.claimant_name;
  document.getElementById('memo-area').innerText = `${currentClaim.area_acres} acres`;
  document.getElementById('memo-district').innerText = `${currentClaim.district} (${currentClaim.state})`;

  const reasonsList = document.getElementById('memo-reasons-list');
  const anomalyTypes = Array.isArray(currentClaim.anomaly_types) 
    ? currentClaim.anomaly_types 
    : JSON.parse(currentClaim.anomaly_types || '[]');

  reasonsList.innerHTML = anomalyTypes.map(t => `<li><strong>${t}:</strong> Flagged during automated spatial/cadastral screening.</li>`).join('') || '<li>Standard administrative inquiry and physical record verification required.</li>';

  const orderText = document.getElementById('memo-order-text');
  const actionType = latestDisp.action_type || 'JOINT_SURVEY_ORDERED';

  if (actionType === 'JOINT_SURVEY_ORDERED') {
    orderText.innerText = `The Sub-Divisional Magistrate hereby directs the Forest Range Officer and Revenue Inspector to conduct a joint field inspection within 14 days, verify boundary stones, and submit cadastral overlay records.`;
  } else if (actionType === 'GRAM_SABHA_NOTICE') {
    orderText.innerText = `Notice is hereby issued to the Secretary, Gram Sabha, to submit certified copy of Resolution with quorum register within 7 working days.`;
  } else if (actionType === 'DLC_RECOMMENDED') {
    orderText.innerText = `SDLC recommends title sanction subject to confirmation of non-encroachment in adjoining reserved forest compartments.`;
  } else {
    orderText.innerText = `Administrative proceedings are hereby stayed pending submission of ancestral proof and cadastral boundary re-alignment.`;
  }

  document.getElementById('memo-remarks-text').innerText = latestDisp.remarks || 'Ensure differential GPS boundaries are tagged with high accuracy.';
  document.getElementById('memo-officer-signature').innerText = latestDisp.officer_name || 'Dr. Alok Ranjan, IAS';
  document.getElementById('memo-officer-title').innerText = latestDisp.officer_designation || 'Sub-Divisional Magistrate & Chair, SDLC';
  document.getElementById('memo-hash').innerText = Math.random().toString(36).substring(2, 10).toUpperCase();

  memoModal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function openDistrictDossierModal() {
  const modal = document.getElementById('modal-district-dossier');
  const total = dashboardData?.total_claims || allClaims.length;
  const approved = dashboardData?.approved || 0;
  const pending = dashboardData?.pending || 0;
  const critical = dashboardData?.high_priority_anomalies || 0;

  document.getElementById('dossier-total').innerText = total;
  document.getElementById('dossier-approved').innerText = approved;
  document.getElementById('dossier-pending').innerText = pending;
  document.getElementById('dossier-critical').innerText = critical;

  const topBottlenecks = [...allClaims]
    .filter(c => c.anomaly_score >= 60)
    .sort((a, b) => b.anomaly_score - a.anomaly_score)
    .slice(0, 5);

  const listEl = document.getElementById('dossier-claims-list');
  listEl.innerHTML = topBottlenecks.map((c) => `
    <div class="p-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded flex items-center justify-between">
      <div>
        <strong class="font-mono text-stone-900 dark:text-white">${c.claim_id}</strong> — 
        <span class="text-stone-800 dark:text-stone-200">${c.claimant_name} (${c.district}, ${c.state})</span>
        <span class="text-[10px] text-stone-500 dark:text-stone-400 block">Area: ${c.area_acres} ac • Pending: ${c.days_pending}d</span>
      </div>
      <div class="text-right">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${SEVERITY_BG[c.severity]}">${c.severity}</span>
        <span class="font-mono font-bold text-xs block text-stone-900 dark:text-white mt-0.5">Score ${c.anomaly_score}</span>
      </div>
    </div>
  `).join('');

  modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

// =========================================================================
// ROUTING, NAVIGATION & WORKSPACES
// =========================================================================

function toggleNationalAggregates() {
  const drawer = document.getElementById('national-kpi-drawer');
  const txt = document.getElementById('txt-kpi-toggle');
  if (!drawer) return;
  if (drawer.classList.contains('hidden')) {
    drawer.classList.remove('hidden');
    if (txt) txt.textContent = 'Hide National Overview';
  } else {
    drawer.classList.add('hidden');
    if (txt) txt.textContent = 'National MoTA Overview (3.46M)';
  }
}

let currentNavSection = 'landing';
let previousNavSection = 'landing';

function navigateTo(page) {
  if (page === 'monitor') page = 'dashboard';
  if (page === 'investigate') page = 'claims';
  if (page === 'decide') {
    viewClaim(currentClaim?.claim_id || 'DEMO-003');
    return;
  }

  if (page === 'claim-detail') {
    if (currentNavSection !== 'claim-detail') {
      previousNavSection = currentNavSection || 'dashboard';
    }
    const backTxt = document.getElementById('back-nav-text');
    if (backTxt) {
      backTxt.textContent = previousNavSection === 'claims' ? 'Back to Investigate' : 'Back to Monitor';
    }
  } else {
    currentNavSection = page;
  }

  // Hide all sections inside main
  document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));

  // Reset all nav link styles
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.classList.remove('text-[#164E3B]', 'dark:text-emerald-400', 'border-[#164E3B]', 'dark:border-emerald-400', 'font-bold', 'bg-amber-500', 'text-white', 'shadow-sm');
    btn.classList.add('text-stone-500', 'dark:text-stone-400', 'font-medium', 'border-transparent');
  });

  const activeNavClasses = ['text-[#164E3B]', 'dark:text-emerald-400', 'border-[#164E3B]', 'dark:border-emerald-400', 'font-bold'];

  // Toggle triage ribbon visibility (hidden on landing page, visible inside workspaces)
  const triageRibbon = document.getElementById('workspace-triage-ribbon');
  if (triageRibbon) {
    triageRibbon.classList.remove('hidden');
  }

  if (page === 'landing') {
    const landing = document.getElementById('page-landing');
    if (landing) landing.classList.remove('hidden');
    window.location.hash = 'landing';
  } else if (page === 'dashboard') {
    document.getElementById('page-dashboard').classList.remove('hidden');
    const navBtn = document.getElementById('nav-dashboard');
    if (navBtn) {
      navBtn.classList.remove('text-stone-500', 'dark:text-stone-400', 'border-transparent', 'font-medium');
      navBtn.classList.add(...activeNavClasses);
    }
    window.location.hash = 'dashboard';
    setTimeout(() => {
      if (mainMap) mainMap.invalidateSize();
    }, 200);
  } else if (page === 'claims') {
    document.getElementById('page-claims').classList.remove('hidden');
    const navBtn = document.getElementById('nav-claims');
    if (navBtn) {
      navBtn.classList.remove('text-stone-500', 'dark:text-stone-400', 'border-transparent', 'font-medium');
      navBtn.classList.add(...activeNavClasses);
    }
    window.location.hash = 'claims';
    renderClaimsTable();
  } else if (page === 'states') {
    document.getElementById('page-states').classList.remove('hidden');
    const navBtn = document.getElementById('nav-states');
    if (navBtn) {
      navBtn.classList.remove('text-stone-500', 'dark:text-stone-400', 'border-transparent', 'font-medium');
      navBtn.classList.add(...activeNavClasses);
    }
    window.location.hash = 'states';
    renderStatesView();
    renderStatePerformanceChart();
    renderStateSummaryTable();
    setTimeout(() => runPolicySimulation(), 100);
  } else if (page === 'claim-detail') {
    document.getElementById('page-claim-detail').classList.remove('hidden');
    const navBtn = document.getElementById('nav-decide');
    if (navBtn) {
      navBtn.classList.remove('text-stone-500', 'dark:text-stone-400', 'border-transparent', 'font-medium');
      navBtn.classList.add(...activeNavClasses);
    }
    window.location.hash = `claim/${currentClaim?.claim_id || 'DEMO-003'}`;
    setTimeout(() => {
      if (miniMap) miniMap.invalidateSize();
    }, 200);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigateBack() {
  navigateTo(previousNavSection || 'dashboard');
}

function setupRouting() {
  const hash = window.location.hash.replace('#', '');
  if (hash.startsWith('claim/')) {
    const cid = hash.replace('claim/', '');
    setTimeout(() => viewClaim(cid), 300);
  } else if (hash === 'claims' || hash === 'investigate') {
    navigateTo('claims');
  } else if (hash === 'dashboard' || hash === 'monitor') {
    navigateTo('dashboard');
  } else if (hash === 'states') {
    navigateTo('states');
  } else if (hash === 'decide') {
    setTimeout(() => viewClaim('DEMO-003'), 300);
  } else if (hash === 'landing') {
    navigateTo('landing');
  } else {
    // Default to clean product gateway
    navigateTo('landing');
  }

  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash.replace('#', '');
    if (newHash === 'landing' || newHash === '') navigateTo('landing');
    else if (newHash === 'dashboard' || newHash === 'monitor') navigateTo('dashboard');
    else if (newHash === 'claims' || newHash === 'investigate') navigateTo('claims');
    else if (newHash === 'states') navigateTo('states');
    else if (newHash === 'decide') viewClaim('DEMO-003');
    else if (newHash.startsWith('claim/')) viewClaim(newHash.replace('claim/', ''));
  });

  // Global Keyboard Shortcut: ⌘ K / Ctrl+K to search
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const input = document.getElementById('global-search');
      if (input) {
        input.focus();
        input.select();
      }
    }
  });
}
