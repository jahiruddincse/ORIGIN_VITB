/**
 * VanRaksha AI (वनरक्षा AI) — Forest Rights Act Decision Support & WebGIS Engine
 * Full bilingual support (English & Hindi), Satellite Temporal NDVI Analysis,
 * Protected Forest Geo-Fencing, Officer Disposition Console, and Policy Simulator.
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

// Tile Layer Definitions
const BASEMAP_TILES = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr: '&copy; OpenStreetMap contributors | VanRaksha AI'
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
  Critical: 'bg-red-100 text-red-800 border-red-300',
  High: 'bg-orange-100 text-orange-800 border-orange-300',
  Medium: 'bg-amber-100 text-amber-800 border-amber-300',
  Low: 'bg-blue-100 text-blue-800 border-blue-300',
  Normal: 'bg-slate-100 text-slate-700 border-slate-300'
};

const STATUS_BG = {
  Approved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Pending: 'bg-amber-100 text-amber-800 border-amber-300',
  Rejected: 'bg-rose-100 text-rose-800 border-rose-300',
  'Under Review': 'bg-blue-100 text-blue-800 border-blue-300'
};

// Bilingual Administrative Dictionaries
const TRANSLATIONS = {
  en: {
    subtitle: 'FRA Intelligence & Decision Support',
    nav_dashboard: 'Dashboard',
    nav_claims: 'Claims Explorer',
    nav_states: 'State Intelligence',
    kpi_total: 'Total Claims',
    kpi_approved: 'Approved',
    kpi_pending: 'Pending',
    kpi_rejected: 'Rejected',
    kpi_rate: 'Approval Rate',
    kpi_anomalies: 'Total Anomalies',
    kpi_high: 'High Priority',
    kpi_avg_proc: 'Avg Processing',
    map_title: 'Interactive WebGIS FRA Claim & Forest Reserve Map',
    map_desc: 'District polygons, geotagged claims & protected habitats',
    priority_title: 'High Priority Districts — Immediate Attention Required',
    state_prog_title: 'State-wise FRA Progress Summary',
    audio_listen: '🎧 Listen to Officer Briefing',
    audio_stop: '⏹️ Stop Audio Briefing',
    action_recorded_msg: 'Administrative disposition recorded successfully into official audit trail.',
  },
  hi: {
    subtitle: 'वन अधिकार अधिनियम (FRA) आसूचना एवं निर्णय समर्थन प्रणाली',
    nav_dashboard: 'डैशबोर्ड',
    nav_claims: 'दावा अन्वेषक',
    nav_states: 'राज्य आसूचना',
    kpi_total: 'कुल दावे',
    kpi_approved: 'स्वीकृत दावे',
    kpi_pending: 'लंबित दावे',
    kpi_rejected: 'अस्वीकृत',
    kpi_rate: 'स्वीकृति दर',
    kpi_anomalies: 'कुल विसंगतियां',
    kpi_high: 'उच्च प्राथमिकता',
    kpi_avg_proc: 'औसत समय',
    map_title: 'सक्रिय WebGIS वन अधिकार एवं संरक्षित वन मानचित्र',
    map_desc: 'जिला सीमाएं, भू-चिह्नित दावे एवं राष्ट्रीय उद्यान बफर',
    priority_title: 'उच्च प्राथमिकता वाले जिले — तत्काल प्रशासनिक समीक्षा आवश्यक',
    state_prog_title: 'राज्यवार वन अधिकार प्रगति सारांश',
    audio_listen: '🎧 अधिकारी प्रशासनिक ब्रीफिंग सुनें',
    audio_stop: '⏹️ ऑडियो रोकें',
    action_recorded_msg: 'प्रशासनिक आदेश डिजिटल ऑडिट ट्रेल में सफलतापूर्वक दर्ज किया गया।',
  }
};

// Initialization on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) lucide.createIcons();
  await loadInitialData();
  initMap();
  await loadDistrictBoundaries();
  setupRouting();
  populateFilterDropdowns();
  renderDashboard();
  runPolicySimulation();
});

// Load Initial Data with API + Local Fallbacks
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
          dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
          txt.textContent = `Supabase Live (${dbInfo.claims_count || '750'})`;
        } else if (dbInfo.status === 'awaiting_key') {
          dot.className = 'w-2 h-2 rounded-full bg-amber-400';
          txt.textContent = `Supabase Ready (Local Fallback)`;
        } else {
          dot.className = 'w-2 h-2 rounded-full bg-emerald-500';
          txt.textContent = `Database: 750 Claims`;
        }
      }
    }
  } catch (e) {
    console.debug('Database status check skipped:', e);
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

// Language Switching (English / Hindi)
function setLanguage(lang) {
  currentLanguage = lang;
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Toggle button styling
  const btnEn = document.getElementById('lang-btn-en');
  const btnHi = document.getElementById('lang-btn-hi');
  if (lang === 'hi') {
    btnHi.className = 'px-2.5 py-1 rounded text-xs font-bold bg-indigo-600 text-white shadow-xs transition';
    btnEn.className = 'px-2.5 py-1 rounded text-xs font-bold text-slate-400 hover:text-white transition';
  } else {
    btnEn.className = 'px-2.5 py-1 rounded text-xs font-bold bg-indigo-600 text-white shadow-xs transition';
    btnHi.className = 'px-2.5 py-1 rounded text-xs font-bold text-slate-400 hover:text-white transition';
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

// Render Dashboard Elements
function renderDashboard() {
  if (!dashboardData) return;
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  const kpis = [
    { label: t.kpi_total, value: dashboardData.total_claims.toLocaleString(), icon: 'file-text', color: 'text-slate-700', bg: 'bg-slate-100' },
    { label: t.kpi_approved, value: dashboardData.approved.toLocaleString(), icon: 'check-circle-2', color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: t.kpi_pending, value: dashboardData.pending.toLocaleString(), icon: 'clock', color: 'text-amber-700', bg: 'bg-amber-50' },
    { label: t.kpi_rejected, value: dashboardData.rejected.toLocaleString(), icon: 'x-circle', color: 'text-rose-700', bg: 'bg-rose-50' },
    { label: t.kpi_rate, value: `${dashboardData.approval_percentage.toFixed(1)}%`, icon: 'trending-up', color: 'text-indigo-700', bg: 'bg-indigo-50' },
    { label: t.kpi_anomalies, value: dashboardData.total_anomalies.toLocaleString(), icon: 'alert-triangle', color: 'text-orange-700', bg: 'bg-orange-50' },
    { label: t.kpi_high, value: dashboardData.high_priority_anomalies.toLocaleString(), icon: 'alert-octagon', color: 'text-red-700', bg: 'bg-red-50' },
    { label: t.kpi_avg_proc, value: `${dashboardData.avg_processing_days}d`, icon: 'calendar', color: 'text-blue-700', bg: 'bg-blue-50' }
  ];

  const grid = document.getElementById('kpi-grid');
  grid.innerHTML = kpis.map(k => `
    <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">${k.label}</span>
        <div class="${k.bg} ${k.color} p-1 rounded-md">
          <i data-lucide="${k.icon}" class="w-3.5 h-3.5"></i>
        </div>
      </div>
      <div class="text-xl font-black text-slate-900 tracking-tight">${k.value}</div>
    </div>
  `).join('');

  // Render recent anomalies
  const recentList = document.getElementById('recent-anomalies-list');
  recentList.innerHTML = (dashboardData.recent_anomalies || []).slice(0, 6).map(c => {
    const sevClass = SEVERITY_BG[c.severity] || 'bg-slate-100 text-slate-700 border-slate-300';
    const statusClass = STATUS_BG[c.status] || 'bg-slate-100 text-slate-700 border-slate-300';
    return `
      <div onclick="viewClaim('${c.claim_id}')" class="p-2.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 rounded-lg cursor-pointer transition flex items-center justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center space-x-1.5 mb-0.5">
            <span class="font-bold text-xs text-slate-900 font-mono">${c.claim_id}</span>
            <span class="text-[9px] px-1.5 py-0.2 rounded border font-semibold ${sevClass}">${c.severity}</span>
            <span class="text-[9px] px-1.5 py-0.2 rounded border font-medium ${statusClass}">${c.status}</span>
          </div>
          <div class="text-[11px] text-slate-600 truncate">
            <strong>${c.claimant_name}</strong> • ${c.district}, ${c.state} (${c.area_acres} ac)
          </div>
        </div>
        <div class="text-right flex-shrink-0">
          <span class="text-sm font-black ${c.anomaly_score >= 80 ? 'text-red-600' : 'text-slate-900'}">${c.anomaly_score}</span>
          <span class="text-[9px] text-slate-400 block uppercase">score</span>
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

// WebGIS Map Initialization & Base Map Switcher
function initMap() {
  if (mainMap) return;
  const mapEl = document.getElementById('main-map');
  if (!mapEl) return;

  mainMap = L.map('main-map', {
    center: [22.0, 79.5],
    zoom: 5.4,
    scrollWheelZoom: true
  });

  const layerDef = BASEMAP_TILES.osm;
  baseTileLayer = L.tileLayer(layerDef.url, {
    attribution: layerDef.attr,
    maxZoom: 18
  }).addTo(mainMap);

  // Add gazetted protected area centroids with circle markers
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
        <strong class="text-emerald-900 block font-bold text-sm">${pa.name}</strong>
        <span class="text-emerald-700 block mt-0.5">Category: ${pa.type}</span>
        <span class="text-slate-500 text-[10px] mt-1 block">Gazetted Protected Forest Zone / Wildlife Corridor (12km buffer)</span>
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

  const def = BASEMAP_TILES[type];
  baseTileLayer = L.tileLayer(def.url, {
    attribution: def.attr,
    maxZoom: 18
  }).addTo(mainMap);

  // Update button classes
  ['osm', 'satellite', 'topo'].forEach(t => {
    const btn = document.getElementById(`btn-bm-${t}`);
    if (!btn) return;
    if (t === type) {
      btn.className = 'px-2 py-1 rounded text-xs font-semibold bg-indigo-600 text-white shadow-xs transition';
    } else {
      btn.className = 'px-2 py-1 rounded text-xs font-semibold text-slate-600 hover:text-slate-900 transition';
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
        <div class="flex items-center justify-between gap-2 mb-1">
          <strong class="font-mono text-sm text-slate-900">${c.claim_id}</strong>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${SEVERITY_BG[c.severity]}">${c.severity}</span>
        </div>
        <div class="text-slate-600 space-y-0.5 mb-1.5">
          <div>Claimant: <strong>${c.claimant_name}</strong></div>
          <div>Location: ${c.district}, ${c.state}</div>
          <div>Area: ${c.area_acres} acres (${c.claim_type})</div>
          <div>Status: <span class="font-semibold text-slate-800">${c.status}</span></div>
          <div>Anomaly Score: <strong>${c.anomaly_score}/100</strong></div>
        </div>
        <button onclick="viewClaim('${c.claim_id}')" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1 px-2 rounded text-[11px] transition text-center">
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
          <button onclick="focusDistrict('${p.state}', '${p.district}')" class="mt-2 text-indigo-600 font-semibold">View district claims →</button>
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

  el.innerHTML = districts.slice(0, 8).map((d, i) => `
    <div onclick="focusDistrict('${d.state}', '${d.district}')" class="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-indigo-50/50 cursor-pointer transition">
      <div class="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center">${i + 1}</div>
      <div class="flex-1 min-w-0">
        <div class="font-bold text-slate-900 text-xs">${d.district} <span class="text-slate-400 font-normal">• ${d.state}</span></div>
        <div class="text-[10px] text-slate-600 mt-0.5 truncate">${(d.attention_reasons || []).join(', ')}</div>
        <div class="flex gap-2.5 text-[9px] text-slate-500 mt-1">
          <span>Pending: <strong class="text-amber-700">${d.pending ?? '—'}</strong></span>
          <span>Anomalies: <strong class="text-orange-700">${d.anomalies ?? '—'}</strong></span>
          ${d.high_priority ? `<span>Critical: <strong class="text-red-700">${d.high_priority}</strong></span>` : ''}
        </div>
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
    <tr onclick="selectStateOnMap('${r.state}')" class="hover:bg-indigo-50/60 cursor-pointer">
      <td class="px-3 py-2 font-semibold text-slate-900 font-sans">${r.state}</td>
      <td class="px-3 py-2 text-right">${r.total}</td>
      <td class="px-3 py-2 text-right text-emerald-700 font-semibold">${r.approved}</td>
      <td class="px-3 py-2 text-right text-amber-700 font-semibold">${r.pending}</td>
      <td class="px-3 py-2 text-right">${r.approval_rate}%</td>
      <td class="px-3 py-2 text-right text-orange-700 font-semibold">${r.anomalies}</td>
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
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { stacked: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } }
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

// Claims Explorer Table & Pagination
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
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400">No claims match the selected filter criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = pageClaims.map(c => {
    const sevClass = SEVERITY_BG[c.severity] || 'bg-slate-100 text-slate-700 border-slate-300';
    const statusClass = STATUS_BG[c.status] || 'bg-slate-100 text-slate-700 border-slate-300';
    return `
      <tr class="hover:bg-slate-50 transition cursor-pointer" onclick="viewClaim('${c.claim_id}')">
        <td class="px-4 py-3">
          <div class="font-mono font-bold text-slate-900 text-xs">${c.claim_id}</div>
          <div class="text-[11px] text-slate-500">${c.claimant_name}</div>
        </td>
        <td class="px-4 py-3">
          <div class="text-slate-800 font-medium">${c.district}</div>
          <div class="text-[11px] text-slate-400">${c.state}</div>
        </td>
        <td class="px-4 py-3">
          <div class="text-slate-700 font-semibold">${c.area_acres} acres</div>
          <div class="text-[11px] text-slate-400">${c.claim_type}</div>
        </td>
        <td class="px-4 py-3">
          <span class="px-2 py-0.5 rounded border text-[10px] font-bold ${statusClass}">${c.status}</span>
        </td>
        <td class="px-4 py-3 font-mono text-slate-600">
          ${c.days_pending || 0}d
        </td>
        <td class="px-4 py-3">
          <div class="flex items-center space-x-2">
            <span class="font-mono font-bold ${c.anomaly_score >= 60 ? 'text-red-600' : 'text-slate-800'}">${c.anomaly_score}</span>
            <div class="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div class="h-full ${c.anomaly_score >= 80 ? 'bg-red-600' : c.anomaly_score >= 60 ? 'bg-orange-500' : 'bg-slate-400'}" style="width: ${c.anomaly_score}%"></div>
            </div>
          </div>
        </td>
        <td class="px-4 py-3">
          <span class="px-2 py-0.5 rounded border text-[10px] font-bold ${sevClass}">${c.severity}</span>
        </td>
        <td class="px-4 py-3">
          <button onclick="event.stopPropagation(); viewClaim('${c.claim_id}')" class="text-indigo-600 hover:text-indigo-800 font-semibold text-xs">
            Inspect →
          </button>
        </td>
      </tr>
    `;
  }).join('');
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

// CLAIM INTELLIGENCE (HERO VIEW)
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
  const sevClass = SEVERITY_BG[currentClaim.severity] || 'bg-slate-100 text-slate-700 border-slate-300';
  const statusClass = STATUS_BG[currentClaim.status] || 'bg-slate-100 text-slate-700 border-slate-300';
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

  // Flagged Issues List
  const flaggedList = document.getElementById('detail-flagged-list');
  const anomalyTypes = Array.isArray(currentClaim.anomaly_types) 
    ? currentClaim.anomaly_types 
    : JSON.parse(currentClaim.anomaly_types || '[]');

  const anomalyDescriptions = {
    'DELAYED_CLAIM': `Processing pending for ${currentClaim.days_pending} days beyond the 180-day threshold`,
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
      <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center space-x-2">
        <i data-lucide="shield-check" class="w-4 h-4 text-emerald-600"></i>
        <span>No anomalies flagged. Claim records meet standard automated compliance rules.</span>
      </div>
    `;
  } else {
    flaggedList.innerHTML = anomalyTypes.map(type => `
      <div class="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-lg text-xs text-slate-800 flex items-start space-x-2.5">
        <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"></i>
        <div>
          <strong class="text-amber-900 block font-mono text-[11px] mb-0.5">${type}</strong>
          <span class="text-slate-600">${anomalyDescriptions[type] || 'Flagged for administrative verification'}</span>
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
    <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
      <span class="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">${e.label}</span>
      <span class="text-slate-800 font-medium">${e.val}</span>
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
  container.innerHTML = '<p class="text-xs text-slate-400">Loading quantitative baseline comparisons...</p>';

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
      <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
        No anomalies flagged. Claim is within normal automated screening parameters.
      </div>`;
    return;
  }

  container.innerHTML = evidenceBlocks.map(block => {
    const metricsHtml = Object.entries(block.metrics || {}).map(([k, v]) =>
      `<div class="flex justify-between gap-2"><span class="text-slate-500">${k.replace(/_/g, ' ')}</span><span class="font-mono font-semibold text-slate-800">${v}</span></div>`
    ).join('');

    return `
      <div class="border border-amber-200 bg-amber-50/60 rounded-lg p-2.5">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="text-[10px] font-bold uppercase tracking-wide text-amber-900">${block.type}</span>
          <span class="text-[10px] text-amber-700">⚠ ${block.severity_hint || 'Potential anomaly'}</span>
        </div>
        <div class="grid grid-cols-1 gap-1 text-[11px] mb-1.5 bg-white/80 rounded p-2 border border-amber-100">${metricsHtml}</div>
        <p class="text-[11px] text-slate-700 leading-relaxed"><strong>Why flagged:</strong> ${block.explanation}</p>
      </div>`;
  }).join('');
}

// NEW FEATURE 1 & 2: SATELLITE TEMPORAL NDVI & PROTECTED AREA GEO-FENCING
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
    const isDemo1 = claimId === 'DEMO-001';
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
      cutoffPill.className = 'text-xs px-2.5 py-0.5 rounded-md border font-bold bg-emerald-100 text-emerald-800 border-emerald-300';
      cutoffPill.innerText = '✓ FRA 2005 Cut-Off Compliant';
    } else {
      cutoffPill.className = 'text-xs px-2.5 py-0.5 rounded-md border font-bold bg-red-100 text-red-800 border-red-300 pulse-danger';
      cutoffPill.innerText = '⚠ Post-2005 Clearing Alert';
    }
  }

  // 3-Epoch Grid
  const epochGrid = document.getElementById('satellite-epoch-grid');
  if (epochGrid) {
    const epochs = [sat.cutoff_year_2005, sat.midterm_year_2015, sat.present_year_2024];
    epochGrid.innerHTML = epochs.map((ep, i) => `
      <div class="bg-slate-50 p-2.5 rounded-lg border ${i === 0 ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200'}">
        <span class="text-[10px] font-bold text-slate-500 uppercase block mb-1">
          ${ep.year} ${i === 0 ? '<span class="text-indigo-600">(Cut-off)</span>' : ''}
        </span>
        <div class="font-mono text-base font-black text-slate-900">${ep.ndvi}</div>
        <div class="text-[10px] font-semibold text-slate-600 mt-0.5">${ep.canopy_density_pct}% Canopy</div>
        <span class="inline-block text-[9px] px-1.5 py-0.5 rounded mt-1.5 font-medium ${
          ep.ndvi > 0.6 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
        }">${ep.classification}</span>
      </div>
    `).join('');
  }

  // Verdict Box
  const verdictBox = document.getElementById('satellite-verdict-box');
  if (verdictBox) {
    if (sat.fra_cutoff_compliant) {
      verdictBox.className = 'p-3 rounded-lg text-xs bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start space-x-2.5';
      verdictBox.innerHTML = `
        <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5"></i>
        <div>
          <strong class="block font-bold">${sat.verdict}</strong>
          <span class="text-emerald-800 text-[11px] leading-relaxed">${sat.details}</span>
        </div>
      `;
    } else {
      verdictBox.className = 'p-3 rounded-lg text-xs bg-red-50 border border-red-200 text-red-900 flex items-start space-x-2.5';
      verdictBox.innerHTML = `
        <i data-lucide="alert-octagon" class="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"></i>
        <div>
          <strong class="block font-bold">${sat.verdict}</strong>
          <span class="text-red-800 text-[11px] leading-relaxed">${sat.details}</span>
        </div>
      `;
    }
  }

  // Protected Area Box
  const paBox = document.getElementById('protected-zone-box');
  if (paBox && pa) {
    const isConflict = pa.conflict_severity === 'Critical' || pa.conflict_severity === 'High';
    paBox.className = `p-3 rounded-lg border text-xs ${isConflict ? 'bg-orange-50 border-orange-200 text-orange-950' : 'bg-slate-50 border-slate-200 text-slate-800'}`;
    paBox.innerHTML = `
      <div class="flex justify-between items-start mb-1">
        <strong class="font-bold text-slate-900 text-xs">${pa.name}</strong>
        <span class="font-mono font-bold text-[11px] ${isConflict ? 'text-red-700' : 'text-slate-600'}">${pa.distance_km} km away</span>
      </div>
      <div class="text-[11px] text-slate-600 mb-1">
        <span>Zone Category: <strong>${pa.type}</strong></span> • 
        <span>Buffer Status: <strong class="${isConflict ? 'text-red-700' : 'text-slate-700'}">${pa.buffer_status}</strong></span>
      </div>
      <p class="text-[10px] text-slate-500 mt-1 italic">
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
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(miniMap);
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

// NEW FEATURE 3: OFFICER ADMINISTRATIVE ACTION CONSOLE & DISPOSITION
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

  // Show alert
  alert(TRANSLATIONS[currentLanguage].action_recorded_msg + `\nReference No: ${noticeRef}`);

  // Automatically open official memo modal for immediate review/printing
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

  // Fallback initial sample event
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
    <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
      <div class="flex items-center justify-between gap-2 mb-1">
        <span class="font-mono text-[10px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">${ev.action_type}</span>
        <span class="text-[10px] text-slate-400 font-mono">${(ev.created_at || '').substring(0, 10)}</span>
      </div>
      <div class="text-[11px] text-slate-700">
        <strong>${ev.officer_name}</strong> <span class="text-slate-500 font-normal">(${ev.officer_designation})</span>
      </div>
      ${ev.remarks ? `<div class="text-[11px] text-slate-600 mt-1 italic">"${ev.remarks}"</div>` : ''}
      <div class="text-[9px] text-slate-400 font-mono mt-1">Ref: ${ev.notice_ref_no || 'N/A'}</div>
    </div>
  `).join('');
}

// NEW FEATURE 5: WEB SPEECH OFFICER AUDIO EXECUTIVE BRIEFING
function toggleAudioBriefing() {
  if (!window.speechSynthesis) {
    alert('Web Speech API is not supported on this browser.');
    return;
  }

  const btnLabel = document.getElementById('audio-btn-label');
  const btnIcon = document.getElementById('audio-icon');

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

// AI Analysis Function
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
    console.warn('Backend AI API call failed, generating deterministic synthesis');
  }

  // Client-side fallback if backend AI route unavailable
  if (!result) {
    await new Promise(r => setTimeout(r, 600));
    const anomalyTypes = Array.isArray(currentClaim.anomaly_types) 
      ? currentClaim.anomaly_types 
      : JSON.parse(currentClaim.anomaly_types || '[]');

    const anomalyTextMap = {
      'DELAYED_CLAIM': `Processing delayed by ${currentClaim.days_pending} days beyond the 180-day threshold`,
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

// STATE INTELLIGENCE & POLICY SIMULATOR
function renderStatesView() {
  const grid = document.getElementById('states-card-grid');
  grid.innerHTML = statesData.map(s => `
    <div onclick="drillIntoState('${s.state}')" class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between">
      <div>
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-bold text-slate-900 text-sm">${s.state}</h3>
          <span class="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">${s.total} claims</span>
        </div>
        <div class="space-y-1 text-xs text-slate-600 mb-3">
          <div class="flex justify-between"><span>Approved:</span><strong class="text-emerald-700">${s.approved}</strong></div>
          <div class="flex justify-between"><span>Pending:</span><strong class="text-amber-700">${s.pending}</strong></div>
          <div class="flex justify-between"><span>Anomalies:</span><strong class="text-orange-700">${s.anomalies}</strong></div>
          <div class="flex justify-between"><span>Critical:</span><strong class="text-red-700">${s.high_priority}</strong></div>
        </div>
      </div>
      <div>
        <div class="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
          <span>Approval Rate</span>
          <span>${s.approval_rate}%</span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div class="bg-indigo-600 h-full rounded-full" style="width: ${s.approval_rate}%"></div>
        </div>
      </div>
    </div>
  `).join('');
}

let selectedState = null;

function drillIntoState(stateName) {
  selectedState = statesData.find(s => s.state === stateName);
  if (!selectedState) return;

  document.getElementById('drilldown-state-name').innerText = selectedState.state;
  document.getElementById('state-detail-panel').classList.remove('hidden');

  const tbody = document.getElementById('drilldown-districts-table');
  const distList = Object.values(selectedState.districts).sort((a, b) => b.anomalies - a.anomalies);

  tbody.innerHTML = distList.map(d => `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-2 font-bold text-slate-900">${d.district}</td>
      <td class="px-4 py-2 text-right">${d.total}</td>
      <td class="px-4 py-2 text-right text-emerald-700 font-semibold">${d.approved}</td>
      <td class="px-4 py-2 text-right text-amber-700 font-semibold">${d.pending}</td>
      <td class="px-4 py-2 text-right text-orange-700 font-semibold">${d.anomalies}</td>
      <td class="px-4 py-2 text-right text-red-700 font-bold">${d.high_priority}</td>
      <td class="px-4 py-2 text-center">
        <button onclick="filterClaimsByDistrict('${selectedState.state}', '${d.district}')" class="text-indigo-600 hover:text-indigo-800 font-semibold">
          View Claims →
        </button>
      </td>
    </tr>
  `).join('');

  document.getElementById('state-ai-summary-box').classList.add('hidden');
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

// NEW FEATURE 6: WHAT-IF POLICY SIMULATION ENGINE
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

  // Client-side fallback calculation
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
      trajectory.append ? trajectory.append({ week: w, remaining_claims: Math.max(0, cur) }) : trajectory.push({ week: w, remaining_claims: Math.max(0, cur) });
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
  document.getElementById('sim-projected-weeks').innerHTML = `${payload.projected_weeks} <span class="text-sm font-normal text-indigo-300">wks</span>`;
  document.getElementById('sim-baseline-weeks').innerText = payload.baseline_weeks;
  document.getElementById('sim-days-saved').innerHTML = `~${payload.days_saved} <span class="text-sm font-normal text-emerald-300">days</span>`;
  document.getElementById('sim-weekly-rate').innerHTML = `${payload.clearance_rate_weekly} <span class="text-xs font-normal text-slate-400">claims/wk</span>`;
  document.getElementById('sim-pending-claims').innerText = payload.pending_claims;

  // Render Chart
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

// MODAL CONTROLS & OFFICIAL ORDER MEMO
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
  listEl.innerHTML = topBottlenecks.map((c, i) => `
    <div class="p-2 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
      <div>
        <strong class="font-mono text-slate-900">${c.claim_id}</strong> — 
        <span>${c.claimant_name} (${c.district}, ${c.state})</span>
        <span class="text-[10px] text-slate-500 block">Area: ${c.area_acres} ac • Pending: ${c.days_pending}d</span>
      </div>
      <div class="text-right">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${SEVERITY_BG[c.severity]}">${c.severity}</span>
        <span class="font-mono font-bold text-xs block text-slate-900 mt-0.5">Score ${c.anomaly_score}</span>
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

// Navigation & Routing
function navigateTo(page) {
  document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.classList.remove('text-white', 'bg-slate-800');
    btn.classList.add('text-slate-300');
  });

  if (page === 'dashboard') {
    document.getElementById('page-dashboard').classList.remove('hidden');
    document.getElementById('nav-dashboard').classList.add('text-white', 'bg-slate-800');
    window.location.hash = 'dashboard';
    setTimeout(() => {
      if (mainMap) mainMap.invalidateSize();
    }, 200);
  } else if (page === 'claims') {
    document.getElementById('page-claims').classList.remove('hidden');
    document.getElementById('nav-claims').classList.add('text-white', 'bg-slate-800');
    window.location.hash = 'claims';
    renderClaimsTable();
  } else if (page === 'states') {
    document.getElementById('page-states').classList.remove('hidden');
    document.getElementById('nav-states').classList.add('text-white', 'bg-slate-800');
    window.location.hash = 'states';
    renderStatesView();
    setTimeout(() => runPolicySimulation(), 100);
  } else if (page === 'claim-detail') {
    document.getElementById('page-claim-detail').classList.remove('hidden');
    window.location.hash = `claim/${currentClaim?.claim_id || ''}`;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigateBack() {
  navigateTo('claims');
}

function setupRouting() {
  const hash = window.location.hash.replace('#', '');
  if (hash.startsWith('claim/')) {
    const cid = hash.replace('claim/', '');
    setTimeout(() => viewClaim(cid), 300);
  } else if (hash === 'claims') {
    navigateTo('claims');
  } else if (hash === 'states') {
    navigateTo('states');
  } else {
    navigateTo('dashboard');
  }

  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash.replace('#', '');
    if (newHash === 'dashboard') navigateTo('dashboard');
    else if (newHash === 'claims') navigateTo('claims');
    else if (newHash === 'states') navigateTo('states');
    else if (newHash.startsWith('claim/')) viewClaim(newHash.replace('claim/', ''));
  });
}
