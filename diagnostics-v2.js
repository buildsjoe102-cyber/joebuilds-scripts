/**
 * Joe Builds Home Intelligence Platform
 * Diagnostics Controller (v2 - Skeleton Loader, Dynamic Headers, Full Mapping)
 */
const JoeBuildsDiagnostics = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  let supabase, measurementsStore = {};

  const DOM = {
    opLabel: document.getElementById('jbOperatorLabel'),
    opEmail: document.getElementById('jbOperatorEmail'),
    dropBtn: document.getElementById('jbOperatorDropdown'),
    opMenu: document.getElementById('jbOperatorMenu'),
    logoutBtn: document.getElementById('jbLogoutBtn'),
    
    // Top Context
    desktopSidebarAsset: document.getElementById('desktopSidebarAsset'),
    desktopHeaderAsset: document.getElementById('desktopHeaderAsset'),
    headerClimateText: document.querySelectorAll('.jb-desktop-telemetry .jb-tabular')[1],
    headerSysText: document.querySelectorAll('.jb-desktop-telemetry .jb-tabular')[2],
    
    // Tables
    tbodyThermal: document.getElementById('tbody-thermal'),
    mgridThermal: document.getElementById('mgrid-thermal'),
    countThermal: document.getElementById('count-thermal'),
    tbodyAir: document.getElementById('tbody-air'),
    mgridAir: document.getElementById('mgrid-air'),
    countAir: document.getElementById('count-air'),
    
    // Modal
    modal: document.getElementById('jbDiagnosticModal'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    mTitle: document.getElementById('modalMetricTitle'),
    mLabel: document.getElementById('modalMetricLabel'),
    mValue: document.getElementById('modalValueLabel'),
    mCapture: document.getElementById('modalCapture'),
    mOp: document.getElementById('modalOperator'),
    mInst: document.getElementById('modalInstrument'),
    mNotes: document.getElementById('modalNotes'),
    mCameraMeta: document.getElementById('modalCameraMeta')
  };

  /**
   * SKELETON LOADER ENGINE
   */
  const injectSkeletonCSS = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      .jb-skeleton-block { position: relative; overflow: hidden; background-color: rgba(165, 179, 154, 0.2) !important; color: transparent !important; border-color: transparent !important; pointer-events: none; border-radius: 4px; }
      .jb-skeleton-block::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform: translateX(-100%); background-image: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%); animation: jb-shimmer 1.5s infinite; }
      .jb-skeleton-block * { visibility: hidden !important; }
      @keyframes jb-shimmer { 100% { transform: translateX(100%); } }
    `;
    document.head.appendChild(style);
  };

  const toggleSkeletonState = (isLoading) => {
    const elementsToToggle = [
      DOM.desktopSidebarAsset, DOM.desktopHeaderAsset, DOM.headerClimateText, DOM.headerSysText, DOM.countThermal, DOM.countAir
    ];

    elementsToToggle.forEach(el => {
      if (!el) return;
      if (isLoading) el.classList.add('jb-skeleton-block');
      else el.classList.remove('jb-skeleton-block');
    });

    if (isLoading && DOM.tbodyThermal) {
      DOM.tbodyThermal.innerHTML = `<tr><td colspan="5"><div class="jb-skeleton-block" style="height: 40px; width: 100%;"></div></td></tr>`;
      DOM.mgridThermal.innerHTML = `<div class="jb-skeleton-block" style="height: 100px; width: 100%; margin-bottom: 4px;"></div>`;
      if(DOM.tbodyAir) DOM.tbodyAir.innerHTML = `<tr><td colspan="5"><div class="jb-skeleton-block" style="height: 40px; width: 100%;"></div></td></tr>`;
      if(DOM.mgridAir) DOM.mgridAir.innerHTML = `<div class="jb-skeleton-block" style="height: 100px; width: 100%; margin-bottom: 4px;"></div>`;
    }
  };

  const initUIEvents = () => {
    if (DOM.dropBtn && DOM.opMenu) {
      DOM.dropBtn.addEventListener('click', (e) => { e.stopPropagation(); DOM.dropBtn.setAttribute('aria-expanded', !(DOM.dropBtn.getAttribute('aria-expanded') === 'true')); DOM.opMenu.classList.toggle('jb-hidden'); });
      document.addEventListener('click', () => { DOM.dropBtn.setAttribute('aria-expanded', 'false'); DOM.opMenu.classList.add('jb-hidden'); });
    }
    if (DOM.logoutBtn) {
      DOM.logoutBtn.addEventListener('click', async () => { try { await window.$memberstackDom.logout(); window.location.href = '/login'; } catch (err) {} });
    }
    if (DOM.modalCloseBtn) DOM.modalCloseBtn.addEventListener('click', () => DOM.modal.classList.add('jb-hidden'));
    if (DOM.modal) DOM.modal.addEventListener('click', (e) => { if (e.target === DOM.modal) DOM.modal.classList.add('jb-hidden'); });
  };

  const authAndGetProfile = async () => {
    const member = await window.$memberstackDom.getCurrentMember();
    if (!member || !member.data) throw new Error("No Memberstack session.");
    if (DOM.opLabel) DOM.opLabel.textContent = member.data.customFields?.first_name || 'Client';
    if (DOM.opEmail) DOM.opEmail.textContent = `Logged in as: ${member.data.auth.email}`;
    const { data: profile } = await supabase.from('profiles').select('id, building_id, role').eq('memberstack_id', member.data.id).single();
    
    if (profile && (profile.role === 'admin' || profile.role === 'operator')) {
      const hideStyle = document.getElementById('rbac-hide-admin');
      if (hideStyle) hideStyle.remove(); 
    }
    return profile;
  };

  const fetchDiagnosticsData = async (buildingId) => {
    const [buildingRes, projectsRes, measurementsRes] = await Promise.all([
      supabase.from('buildings').select('*').eq('id', buildingId).single(),
      supabase.from('projects').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }),
      supabase.from('measurements').select(`id, created_at, value, unit, status_flag, client_facing_wording, measurement_points(element_code)`).eq('building_id', buildingId)
    ]);
    return { building: buildingRes.data, currentProject: projectsRes.data?.[0], measurements: measurementsRes.data || [] };
  };

  const renderRowHTML = (m, metricName) => {
    const statusCap = m.status_flag ? (m.status_flag.charAt(0).toUpperCase() + m.status_flag.slice(1)) : 'Unknown';
    return `<tr data-id="${m.id}" style="cursor: pointer;"><td><button class="jb-img-btn"><svg style="width:14px;height:14px"><use href="#i-img"/></svg></button></td><td>${metricName}</td><td class="jb-font-mono jb-tabular">${m.value || '-'} ${m.unit || ''}</td><td><span class="jb-status-badge jb-status-${m.status_flag}"><span class="jb-badge-dot"></span>${statusCap}</span></td><td style="color:var(--muted-foreground)">${m.client_facing_wording || '-'}</td></tr>`;
  };

  const renderMobileCardHTML = (m, metricName) => {
    const statusCap = m.status_flag ? (m.status_flag.charAt(0).toUpperCase() + m.status_flag.slice(1)) : 'Unknown';
    return `<div class="jb-mobile-data-card" data-id="${m.id}" style="cursor: pointer;"><div class="jb-mobile-card-header"><div style="font-size:12.5px;font-weight:500">${metricName}</div><span class="jb-status-badge jb-status-${m.status_flag}"><span class="jb-badge-dot"></span>${statusCap}</span></div><div class="jb-font-mono jb-tabular" style="font-size:13px">${m.value || '-'} ${m.unit || ''}</div><div style="font-size:11px;color:var(--muted-foreground)">${m.client_facing_wording || '-'}</div><button class="jb-mobile-img-btn"><svg style="width:12px;height:12px"><use href="#i-img"/></svg> View imagery</button></div>`;
  };

  const mapToDOM = (data) => {
    const assetName = `${data.currentProject?.project_code || 'PRJ-000'} — ${data.building.address_line_1}`;
    if (DOM.desktopSidebarAsset) DOM.desktopSidebarAsset.textContent = assetName;
    if (DOM.desktopHeaderAsset) DOM.desktopHeaderAsset.textContent = assetName;
    if (DOM.headerSysText) DOM.headerSysText.textContent = data.building.status || 'Pending';
    if (DOM.headerClimateText) {
      const state = data.building.state || 'WA';
      DOM.headerClimateText.textContent = state === 'WA' ? 'Zone 5 — Warm Temperate' : 'Zone 6 — Mild Temperate';
    }

    // Clear loading skeletons
    if (DOM.tbodyThermal) DOM.tbodyThermal.innerHTML = '';
    if (DOM.mgridThermal) DOM.mgridThermal.innerHTML = '';
    if (DOM.tbodyAir) DOM.tbodyAir.innerHTML = '';
    if (DOM.mgridAir) DOM.mgridAir.innerHTML = '';

    const thermalCodes = ['U-VALUE', 'THERMAL_BRIDGE', 'ENVELOPE'];
    const airCodes = ['ACH50', 'ELA', 'CO2'];
    const thermals = [], airTights = [];
    
    data.measurements.forEach(m => {
      measurementsStore[m.id] = m;
      const code = m.measurement_points?.element_code;
      if (thermalCodes.includes(code)) thermals.push(m);
      if (airCodes.includes(code)) airTights.push(m);
    });

    if (DOM.tbodyThermal && DOM.mgridThermal && DOM.countThermal) {
      DOM.countThermal.textContent = `${thermals.length} entries`;
      thermals.forEach(m => {
        let title = 'Metric';
        if(m.measurement_points.element_code === 'U-VALUE') title = 'Assembly U-Value';
        if(m.measurement_points.element_code === 'THERMAL_BRIDGE') title = 'Linear Thermal Bridging (ψ)';
        if(m.measurement_points.element_code === 'ENVELOPE') title = 'Envelope Integrity Index';
        DOM.tbodyThermal.insertAdjacentHTML('beforeend', renderRowHTML(m, title));
        DOM.mgridThermal.insertAdjacentHTML('beforeend', renderMobileCardHTML(m, title));
      });
    }

    if (DOM.tbodyAir && DOM.mgridAir && DOM.countAir) {
      DOM.countAir.textContent = `${airTights.length} entries`;
      airTights.forEach(m => {
        let title = 'Metric';
        if(m.measurement_points.element_code === 'ACH50') title = 'ACH50 Air Infiltration Rate';
        if(m.measurement_points.element_code === 'ELA') title = 'Envelope Leakage Area (ELA)';
        if(m.measurement_points.element_code === 'CO2') title = 'Indoor Air Quality (IAQ)';
        DOM.tbodyAir.insertAdjacentHTML('beforeend', renderRowHTML(m, title));
        DOM.mgridAir.insertAdjacentHTML('beforeend', renderMobileCardHTML(m, title));
      });
    }

    document.querySelectorAll('tr[data-id], .jb-mobile-data-card[data-id]').forEach(el => {
      el.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        const metricName = el.querySelector('td:nth-child(2)')?.textContent || el.querySelector('.jb-mobile-card-header div').textContent;
        openModal(el.getAttribute('data-id'), metricName); 
      });
    });

    toggleSkeletonState(false);
  };

  const openModal = (id, metricName) => {
    const m = measurementsStore[id];
    if (!m) return;
    DOM.mTitle.textContent = metricName; 
    DOM.mLabel.textContent = metricName.toUpperCase(); 
    DOM.mValue.textContent = `${m.value || ''} ${m.unit || ''}`.trim();
    
    const d = new Date(m.created_at);
    DOM.mCapture.textContent = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    
    // Future expansion: Tie this to real user profiles
    DOM.mOp.textContent = 'J. Builds Analyst';
    
    const code = m.measurement_points?.element_code;
    if (code === 'ACH50' || code === 'ELA' || code === 'CO2') {
        DOM.mInst.textContent = 'Retrotec 3000 / Awair';
        DOM.mCameraMeta.textContent = 'RETROTEC · diff pressure / IAQ';
    } else {
        DOM.mInst.textContent = 'FLIR E76';
        DOM.mCameraMeta.textContent = 'FLIR · 320x240 · ε 0.95';
    }
    
    DOM.mNotes.textContent = m.client_facing_wording || 'Data captured during audit cycle.';
    DOM.modal.classList.remove('jb-hidden');
  };

  const init = async () => {
    injectSkeletonCSS();
    toggleSkeletonState(true);
    initUIEvents();
    if (!window.supabase) return;
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    try {
      const profile = await authAndGetProfile();
      if (profile?.building_id) {
        const diagnosticsData = await fetchDiagnosticsData(profile.building_id);
        mapToDOM(diagnosticsData);
      } else {
        toggleSkeletonState(false);
      }
    } catch (error) {
      console.error(error);
      window.location.href = '/login';
    }
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsDiagnostics.init);
} else { JoeBuildsDiagnostics.init(); }
