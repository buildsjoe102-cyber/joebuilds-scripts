/**
 * Joe Builds Home Intelligence Platform
 * Diagnostics Controller (v3 - Dynamic Contextual SVGs & Smart Operators)
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
    desktopSidebarAsset: document.getElementById('desktopSidebarAsset'),
    desktopHeaderAsset: document.getElementById('desktopHeaderAsset'),
    headerClimateText: document.querySelectorAll('.jb-desktop-telemetry .jb-tabular')[1],
    headerSysText: document.querySelectorAll('.jb-desktop-telemetry .jb-tabular')[2],
    tbodyThermal: document.getElementById('tbody-thermal'),
    mgridThermal: document.getElementById('mgrid-thermal'),
    countThermal: document.getElementById('count-thermal'),
    tbodyAir: document.getElementById('tbody-air'),
    mgridAir: document.getElementById('mgrid-air'),
    countAir: document.getElementById('count-air'),
    modal: document.getElementById('jbDiagnosticModal'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    mTitle: document.getElementById('modalMetricTitle'),
    mCapture: document.getElementById('modalCapture'),
    mOp: document.getElementById('modalOperator'),
    mInst: document.getElementById('modalInstrument'),
    mNotes: document.getElementById('modalNotes'),
    
    // We will target the parent container of the SVG to swap the graphics
    modalGraphicWrapper: document.querySelector('#jbDiagnosticModal > div > div:nth-child(2) > div:nth-child(1)')
  };

  /**
   * SVG GRAPHIC GENERATORS
   */
  const generateThermalSVG = (metric, value) => {
    return `
      <svg viewBox="0 0 400 250" style="height:100%;width:100%" preserveAspectRatio="none">
        <defs>
          <radialGradient id="th" cx="35%" cy="55%" r="55%">
            <stop offset="0%" stop-color="oklch(0.72 0.18 60)"/>
            <stop offset="35%" stop-color="oklch(0.55 0.16 30)"/>
            <stop offset="65%" stop-color="oklch(0.35 0.14 280)"/>
            <stop offset="100%" stop-color="oklch(0.18 0.06 260)"/>
          </radialGradient>
        </defs>
        <rect width="400" height="250" fill="url(#th)"/>
        <text x="12" y="18" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.7)">FLIR · 320x240 · ε 0.95</text>
        <text x="12" y="240" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.7)">${metric}</text>
        <text x="328" y="240" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.7)">${value}</text>
      </svg>
      <div style="position:absolute;right:.75rem;top:.75rem;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.4);padding:.25rem .5rem;color:rgba(255,255,255,.8);font-size:9px;text-transform:uppercase" class="jb-font-mono"><svg style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:.25rem"><use href="#i-zoom"/></svg>1× zoom</div>
    `;
  };

  const generateIAQSVG = (metric, value) => {
    return `
      <svg viewBox="0 0 400 250" style="height:100%;width:100%" preserveAspectRatio="none">
        <defs>
          <linearGradient id="iaq-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(132, 197, 148, 0.4)"/>
            <stop offset="100%" stop-color="rgba(132, 197, 148, 0)"/>
          </linearGradient>
        </defs>
        <rect width="400" height="250" fill="#111512"/>
        <path d="M 0 50 L 400 50 M 0 100 L 400 100 M 0 150 L 400 150 M 0 200 L 400 200" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <path d="M 0 160 L 50 130 L 100 145 L 150 110 L 200 125 L 250 90 L 300 105 L 350 80 L 400 95 L 400 250 L 0 250 Z" fill="url(#iaq-grad)"/>
        <path d="M 0 160 L 50 130 L 100 145 L 150 110 L 200 125 L 250 90 L 300 105 L 350 80 L 400 95" fill="none" stroke="#84C594" stroke-width="2"/>
        <text x="12" y="18" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.7)">AWAIR OMNI · CONTINUOUS TELEMETRY</text>
        <text x="12" y="240" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.7)">${metric}</text>
        <text x="328" y="240" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.7)">${value}</text>
      </svg>
      <div style="position:absolute;right:.75rem;top:.75rem;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.4);padding:.25rem .5rem;color:rgba(255,255,255,.8);font-size:9px;text-transform:uppercase" class="jb-font-mono"><svg style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:.25rem"><use href="#i-zoom"/></svg>Live Node</div>
    `;
  };

  const generateAirflowSVG = (metric, value) => {
    return `
      <svg viewBox="0 0 400 250" style="height:100%;width:100%" preserveAspectRatio="none">
        <rect width="400" height="250" fill="#161c18"/>
        <path d="M -50 125 Q 100 50 200 125 T 450 125" fill="none" stroke="rgba(66, 117, 138, 0.15)" stroke-width="30"/>
        <path d="M -50 125 Q 100 80 200 125 T 450 125" fill="none" stroke="rgba(66, 117, 138, 0.4)" stroke-width="10"/>
        <path d="M -50 125 Q 100 100 200 125 T 450 125" fill="none" stroke="#42758A" stroke-width="3"/>
        <text x="12" y="18" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.7)">RETROTEC · 50 PA DEPRESSURIZATION</text>
        <text x="12" y="240" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.7)">${metric}</text>
        <text x="328" y="240" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.7)">${value}</text>
      </svg>
      <div style="position:absolute;right:.75rem;top:.75rem;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.4);padding:.25rem .5rem;color:rgba(255,255,255,.8);font-size:9px;text-transform:uppercase" class="jb-font-mono"><svg style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:.25rem"><use href="#i-zoom"/></svg>Flow Vector</div>
    `;
  };

  /**
   * SKELETON LOADER
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
    
    const code = m.measurement_points?.element_code;
    const valString = `${m.value || ''} ${m.unit || ''}`.trim();
    
    DOM.mTitle.textContent = metricName; 
    
    // Format timestamp securely
    const d = new Date(m.created_at);
    DOM.mCapture.textContent = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    
    // Dynamic Contextual Injection
    if (DOM.modalGraphicWrapper) {
      if (code === 'CO2') {
        DOM.modalGraphicWrapper.innerHTML = generateIAQSVG(metricName.toUpperCase(), valString);
        DOM.mInst.textContent = 'Awair Element';
        DOM.mOp.textContent = 'Automated Telemetry Node';
      } else if (code === 'ACH50' || code === 'ELA') {
        DOM.modalGraphicWrapper.innerHTML = generateAirflowSVG(metricName.toUpperCase(), valString);
        DOM.mInst.textContent = 'Retrotec 3000';
        DOM.mOp.textContent = 'Airtightness Technician';
      } else {
        DOM.modalGraphicWrapper.innerHTML = generateThermalSVG(metricName.toUpperCase(), valString);
        DOM.mInst.textContent = 'FLIR E76';
        DOM.mOp.textContent = 'Thermography Specialist';
      }
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
