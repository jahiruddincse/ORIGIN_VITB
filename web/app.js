/**
 * VanRaksha AI — Interactive Decision Support Application Logic
 * Integrates with Backend REST API (FastAPI / Python Server) with automatic local fallback.
 */

// Global State
let allClaims = [];
let filteredClaims = [];
let dashboardData = null;
let statesData = [];
let filterOptions = { states: [], districts: [] };
let currentPage = 1;
const pageSize = 15;
let currentClaim = null;
let mainMap = null;
let miniMap = null;
let mapMarkers = [];
let stateChart = null;

// Severity colors
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

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) lucide.createIcons();
  await loadInitialData();
  initMap();
  setupRouting();
  populateFilterDropdowns();
  renderDashboard();
});

// Load Data from API with fallback to claims_data.json
async function loadInitialData() {
  try {
    const res = await fetch('/api/dashboard');
    if (res.ok) {
      dashboardData = await res.json();
      console.log('Loaded dashboard from backend API:', dashboardData);
    }
  } catch (e) {
    console.warn('Backend API /api/dashboard not reachable, will calculate client-side');
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
      console.error('Failed to load claims_data.json:', e);
    }
  }

  // Calculate stats client-side if not loaded from API
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

    // District level
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

// Render Dashboard
function renderDashboard() {
  if (!dashboardData) return;

  const kpis = [
    { label: 'Total Claims', value: dashboardData.total_claims.toLocaleString(), icon: 'file-text', color: 'text-slate-700', bg: 'bg-slate-100' },
    { label: 'Approved', value: dashboardData.approved.toLocaleString(), icon: 'check-circle-2', color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: 'Pending', value: dashboardData.pending.toLocaleString(), icon: 'clock', color: 'text-amber-700', bg: 'bg-amber-50' },
    { label: 'Rejected', value: dashboardData.rejected.toLocaleString(), icon: 'x-circle', color: 'text-rose-700', bg: 'bg-rose-50' },
    { label: 'Approval Rate', value: `${dashboardData.approval_percentage.toFixed(1)}%`, icon: 'trending-up', color: 'text-indigo-700', bg: 'bg-indigo-50' },
    { label: 'Total Anomalies', value: dashboardData.total_anomalies.toLocaleString(), icon: 'alert-triangle', color: 'text-orange-700', bg: 'bg-orange-50' },
    { label: 'High Priority', value: dashboardData.high_priority_anomalies.toLocaleString(), icon: 'alert-octagon', color: 'text-red-700', bg: 'bg-red-50' },
    { label: 'Avg Processing', value: `${dashboardData.avg_processing_days}d`, icon: 'calendar', color: 'text-blue-700', bg: 'bg-blue-50' }
  ];

  const grid = document.getElementById('kpi-grid');
  grid.innerHTML = kpis.map(k => `
    <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">${k.label}</span>
        <div class="${k.bg} ${k.color} p-1.5 rounded-lg">
          <i data-lucide="${k.icon}" class="w-3.5 h-3.5"></i>
        </div>
      </div>
      <div class="text-xl font-black text-slate-900 tracking-tight">${k.value}</div>
    </div>
  `).join('');

  // Render recent anomalies
  const recentList = document.getElementById('recent-anomalies-list');
  recentList.innerHTML = (dashboardData.recent_anomalies || []).slice(0, 7).map(c => {
    const sevClass = SEVERITY_BG[c.severity] || 'bg-slate-100 text-slate-700 border-slate-300';
    const statusClass = STATUS_BG[c.status] || 'bg-slate-100 text-slate-700 border-slate-300';
    return `
      <div onclick="viewClaim('${c.claim_id}')" class="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg cursor-pointer transition flex items-center justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center space-x-2 mb-0.5">
            <span class="font-bold text-xs text-slate-900 font-mono">${c.claim_id}</span>
            <span class="text-[10px] px-2 py-0.5 rounded border font-semibold ${sevClass}">${c.severity}</span>
            <span class="text-[10px] px-2 py-0.5 rounded border font-medium ${statusClass}">${c.status}</span>
          </div>
          <div class="text-xs text-slate-600 truncate">
            <strong>${c.claimant_name}</strong> • ${c.district}, ${c.state} (${c.area_acres} ac)
          </div>
        </div>
        <div class="text-right flex-shrink-0">
          <span class="text-sm font-black text-slate-900">${c.anomaly_score}</span>
          <span class="text-[10px] text-slate-400 block">score</span>
        </div>
      </div>
    `;
  }).join('');

  renderStatePerformanceChart();
  updateMapMarkers(allClaims);
  if (window.lucide) lucide.createIcons();
}

// Chart.js State Performance Chart
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
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            title: (items) => statesData[items[0].dataIndex].state
          }
        }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { stacked: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } }
      }
    }
  });
}

// Interactive WebGIS Leaflet Map
function initMap() {
  if (mainMap) return;
  const mapEl = document.getElementById('main-map');
  if (!mapEl) return;

  // Center on Central India (approx Seoni / Madhya Pradesh)
  mainMap = L.map('main-map', {
    center: [22.0, 79.5],
    zoom: 5.4,
    scrollWheelZoom: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors | VanRaksha AI WebGIS',
    maxZoom: 18
  }).addTo(mainMap);
}

function updateMapMarkers(claims) {
  if (!mainMap) return;

  // Clear existing markers
  mapMarkers.forEach(m => mainMap.removeLayer(m));
  mapMarkers = [];

  // Add Circle Markers for each claim
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
      opacity: 0.9,
      fillOpacity: 0.85
    });

    const popupHtml = `
      <div class="text-xs p-1">
        <div class="flex items-center justify-between gap-2 mb-1">
          <strong class="font-mono text-sm text-slate-900">${c.claim_id}</strong>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${SEVERITY_BG[c.severity]}">${c.severity}</span>
        </div>
        <div class="text-slate-600 mb-1">
          <div>Claimant: <strong>${c.claimant_name}</strong></div>
          <div>Location: ${c.district}, ${c.state}</div>
          <div>Area: ${c.area_acres} acres (${c.claim_type})</div>
          <div>Status: <span class="font-semibold">${c.status}</span></div>
          <div>Anomaly Score: <strong>${c.anomaly_score}/100</strong></div>
        </div>
        <button onclick="viewClaim('${c.claim_id}')" class="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1 px-2 rounded text-[11px] transition text-center">
          Open Claim Intelligence →
        </button>
      </div>
    `;

    marker.bindPopup(popupHtml);
    marker.addTo(mainMap);
    mapMarkers.push(marker);
  });
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

  // Auto zoom to state if selected
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

// Populate Filter Dropdowns
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

  document.getElementById('claims-count-badge').innerText = `Showing ${total} claims (${start + 1}-${end})`;
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

// CLAIM INTELLIGENCE (HERO PAGE)
function viewClaim(claimId) {
  currentClaim = allClaims.find(c => c.claim_id === claimId);
  if (!currentClaim) return;

  navigateTo('claim-detail');

  // Populate header
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
    'DELAYED_CLAIM': `Claim has been pending for ${currentClaim.days_pending} days beyond the 180-day threshold`,
    'LAND_RECORD_MISMATCH': `Cadastral record status indicates mismatch with claimed ${currentClaim.area_acres} acres`,
    'INCOMPLETE_DOCUMENTATION': 'Required supporting Gram Sabha resolution or caste documentation incomplete',
    'UNUSUAL_AREA': `Claim area of ${currentClaim.area_acres} acres significantly higher than typical 2-4 acre district norm`,
    'GEOGRAPHIC_INCONSISTENCY': 'GPS coordinates fall outside recognized revenue / forest village boundary',
    'POSSIBLE_DUPLICATE': 'Identical claimant details matched with another pending application'
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
      <div class="p-3 bg-amber-50/80 border border-amber-200/80 rounded-lg text-xs text-slate-800 flex items-start space-x-2.5">
        <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"></i>
        <div>
          <strong class="text-amber-900 block font-mono text-[11px] mb-0.5">${type}</strong>
          <span class="text-slate-600">${anomalyDescriptions[type] || 'Flagged for administrative verification'}</span>
        </div>
      </div>
    `).join('');
  }

  // Evidence Grid
  const evidenceGrid = document.getElementById('detail-evidence-grid');
  const evidence = [
    { label: 'Claimant Name', val: currentClaim.claimant_name },
    { label: 'Claim Type', val: currentClaim.claim_type },
    { label: 'Claimed Area', val: `${currentClaim.area_acres} acres` },
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

  // Reset AI state
  document.getElementById('ai-cta-state').classList.remove('hidden');
  document.getElementById('ai-loading-state').classList.add('hidden');
  document.getElementById('ai-report-state').classList.add('hidden');

  if (window.lucide) lucide.createIcons();
}

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
    miniMap.eachLayer(l => {
      if (l instanceof L.Marker || l instanceof L.CircleMarker) miniMap.removeLayer(l);
    });
  }

  const marker = L.circleMarker([lat, lon], {
    radius: 9,
    fillColor: SEVERITY_COLORS[severity] || '#6366f1',
    color: '#ffffff',
    weight: 2.5,
    fillOpacity: 0.95
  }).addTo(miniMap);

  marker.bindPopup(`<strong>${claimId}</strong><br>GPS Plot: ${lat}, ${lon}`).openPopup();
  setTimeout(() => miniMap.invalidateSize(), 300);
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
    console.warn('API call failed, generating deterministic AI synthesis report');
  }

  // Client-side fallback if backend AI route unavailable
  if (!result) {
    await new Promise(r => setTimeout(r, 600)); // Smooth UX transition
    const anomalyTypes = Array.isArray(currentClaim.anomaly_types) 
      ? currentClaim.anomaly_types 
      : JSON.parse(currentClaim.anomaly_types || '[]');

    const anomalyTextMap = {
      'DELAYED_CLAIM': `Processing delayed by ${currentClaim.days_pending} days beyond the 180-day threshold`,
      'LAND_RECORD_MISMATCH': `Cadastral boundary records show discrepancy with claimed ${currentClaim.area_acres} acres`,
      'INCOMPLETE_DOCUMENTATION': 'Supporting Gram Sabha resolution or identity documentation missing',
      'UNUSUAL_AREA': `Claimed area of ${currentClaim.area_acres} acres is unusually large for individual tenure`,
      'GEOGRAPHIC_INCONSISTENCY': 'GPS plot coordinates fall outside designated revenue/forest boundary polygon',
      'POSSIBLE_DUPLICATE': 'Identical claimant parameters matched to existing submission'
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

// STATE INTELLIGENCE
function renderStatesView() {
  const grid = document.getElementById('states-card-grid');
  grid.innerHTML = statesData.map(s => `
    <div onclick="drillIntoState('${s.state}')" class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between">
      <div>
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-bold text-slate-900 text-base">${s.state}</h3>
          <span class="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">${s.total} claims</span>
        </div>
        <div class="space-y-1.5 text-xs text-slate-600 mb-4">
          <div class="flex justify-between"><span>Approved:</span><strong class="text-emerald-700">${s.approved}</strong></div>
          <div class="flex justify-between"><span>Pending:</span><strong class="text-amber-700">${s.pending}</strong></div>
          <div class="flex justify-between"><span>Anomalies:</span><strong class="text-orange-700">${s.anomalies}</strong></div>
          <div class="flex justify-between"><span>High Priority:</span><strong class="text-red-700">${s.high_priority}</strong></div>
        </div>
      </div>
      <div>
        <div class="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
          <span>Approval Rate</span>
          <span>${s.approval_rate}%</span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
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
      <td class="px-4 py-2.5 font-bold text-slate-900">${d.district}</td>
      <td class="px-4 py-2.5 text-right">${d.total}</td>
      <td class="px-4 py-2.5 text-right text-emerald-700 font-semibold">${d.approved}</td>
      <td class="px-4 py-2.5 text-right text-amber-700 font-semibold">${d.pending}</td>
      <td class="px-4 py-2.5 text-right text-orange-700 font-semibold">${d.anomalies}</td>
      <td class="px-4 py-2.5 text-right text-red-700 font-bold">${d.high_priority}</td>
      <td class="px-4 py-2.5 text-center">
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
  content.innerText = 'Generating administrative state summary...';

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

  // Fallback summary
  content.innerText = `${selectedState.state} currently monitors a total of ${selectedState.total} FRA claims with ${selectedState.approved} approved (${selectedState.approval_rate}% approval rate). There are ${selectedState.pending} claims pending review, of which ${selectedState.high_priority} are classified as high or critical priority requiring immediate administrative attention. A total of ${selectedState.anomalies} claims exhibit anomaly signals (processing delay or cadastral record discrepancies). Recommended next step: deploy specialized verification task forces to high-density anomaly districts.`;
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
