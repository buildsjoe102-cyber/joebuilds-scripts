/**
 * Joe Builds Home Intelligence Platform
 * Diagnostics Controller (v12 - Aggressive Cache Busting & Error Handling)
 */
console.log("JB Diagnostics Controller v12 initializing...");

const JoeBuildsDiagnostics = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  let supabase, measurementsStore = {};
  
  let DOM = {};

  const toggleSkeletonState = (isLoading) => { 
    try {
      const elementsToToggle = [ DOM.desktopSidebarAsset, DOM.desktopHeaderAsset, DOM.headerClimateText, DOM.headerSysText, DOM.countThermal, DOM.countAir, DOM.sidebarMeta ]; 
      elementsToToggle.forEach(el => { if (!el) return; if (isLoading) el.classList.add('jb-skeleton-block'); else el.classList.remove('jb-skeleton-block'); }); 
      if (isLoading && DOM.tbodyThermal) { DOM.tbodyThermal.innerHTML = `<tr><td colspan="5"><div class="jb-skeleton-block" style="height: 40px; width: 100%;"></div></td></tr>`; } 
      if (isLoading && DOM.tbodyAir) { DOM.tbodyAir.innerHTML = `<tr><td colspan="5"><div class="jb-skeleton-block" style="height: 40px; width: 100%;"></div></td></tr>`; }
    } catch(err) { console.error(err); }
  };

  const fetchDiagnosticsData = async (buildingId) => { 
    const [buildingRes, projectsRes, measurementsRes] = await Promise.all([ 
      supabase.from('buildings').select('*').eq('id', buildingId).single(), 
      supabase.from('projects').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }), 
      supabase.from('measurements').select(`id, created_at, value, unit, status_flag, client_facing_wording, measurement_points(element_code)`).eq('building_id', buildingId) 
    ]); 
    return { building: buildingRes.data, currentProject: projectsRes.data?.[0], measurements: measurementsRes.data || [] }; 
  };

  const mapToDOM = (data) => {
    if (!data.building) return;
    const assetName = `${data.currentProject?.project_code || 'PRJ-000'} — ${data.building.address_line_1}`;
    if (DOM.desktopSidebarAsset) DOM.desktopSidebarAsset.textContent = assetName; 
    if (DOM.desktopHeaderAsset) DOM.desktopHeaderAsset.textContent = assetName; 
    if (DOM.headerSysText) DOM.headerSysText.textContent = data.building.status || 'Pending';
    
    const state = data.building.state || 'WA'; 
    const climateText = state === 'WA' ? 'Zone 5 — Warm Temperate' : 'Zone 6 — Mild Temperate';
    if (DOM.headerClimateText) DOM.headerClimateText.textContent = climateText; 
    if (DOM.sidebarMeta) DOM.sidebarMeta.textContent = climateText;
    
    if (DOM.tbodyThermal) DOM.tbodyThermal.innerHTML = ''; 
    if (DOM.tbodyAir) DOM.tbodyAir.innerHTML = '';
    if (DOM.mgridThermal) DOM.mgridThermal.innerHTML = '';
    if (DOM.mgridAir) DOM.mgridAir.innerHTML = '';
    
    const thermals = [], airTights = [];
    
    data.measurements.forEach(m => { 
      measurementsStore[m.id] = m; 
      
      // Failsafe: Handle Supabase returning an array or an object
      let code = null;
      if (m.measurement_points) {
        code = Array.isArray(m.measurement_points) ? m.measurement_points[0]?.element_code : m.measurement_points.element_code;
      }
      m.extracted_code = code;

      if (['U-VALUE', 'THERMAL_BRIDGE', 'ENVELOPE'].includes(code)) thermals.push(m); 
      if (['ACH50', 'ELA', 'CO2'].includes(code)) airTights.push(m); 
    });

    if (DOM.tbodyThermal && DOM.countThermal) { 
      DOM.countThermal.textContent = `${thermals.length} entries`; 
      thermals.forEach(m => { 
        let title = 'Metric';
        if (m.extracted_code === 'U-VALUE') title = 'Assembly U-Value';
        if (m.extracted_code === 'ENVELOPE') title = 'Envelope Integrity';
        if (m.extracted_code === 'THERMAL_BRIDGE') title = 'Linear Thermal Bridging (ψ)';

        const trHtml = `<tr data-id="${m.id}" style="cursor: pointer;"><td><button class="jb-img-btn"><svg style="width:14px;height:14px"><use href="#i-img"/></svg></button></td><td>${title}</td><td class="jb-font-mono jb-tabular">${m.value || '-'} ${m.unit || ''}</td><td><span class="jb-status-badge jb-status-${m.status_flag}">${m.status_flag}</span></td><td style="color:var(--muted-foreground)">${m.client_facing_wording || '-'}</td></tr>`;
        DOM.tbodyThermal.insertAdjacentHTML('beforeend', trHtml); 
        if(DOM.mgridThermal) DOM.mgridThermal.insertAdjacentHTML('beforeend', `<div class="jb-mobile-data-card" data-id="${m.id}" style="cursor: pointer;"><div class="jb-mobile-card-header"><div style="font-size:12.5px;font-weight:500">${title}</div><span class="jb-status-badge jb-status-${m.status_flag}">${m.status_flag}</span></div><div class="jb-font-mono jb-tabular" style="font-size:13px">${m.value || '-'} ${m.unit || ''}</div><div style="font-size:11px;color:var(--muted-foreground)">${m.client_facing_wording || '-'}</div></div>`);
      }); 
    }
    
    if (DOM.tbodyAir && DOM.countAir) { 
      DOM.countAir.textContent = `${airTights.length} entries`; 
      airTights.forEach(m => { 
        let title = 'Metric';
        if (m.extracted_code === 'ACH50') title = 'ACH50 Air Infiltration Rate';
        if (m.extracted_code === 'CO2') title = 'Indoor Air Quality';
        if (m.extracted_code === 'ELA') title = 'Envelope Leakage Area (ELA)';

        const trHtml = `<tr data-id="${m.id}" style="cursor: pointer;"><td><button class="jb-img-btn"><svg style="width:14px;height:14px"><use href="#i-img"/></svg></button></td><td>${title}</td><td class="jb-font-mono jb-tabular">${m.value || '-'} ${m.unit || ''}</td><td><span class="jb-status-badge jb-status-${m.status_flag}">${m.status_flag}</span></td><td style="color:var(--muted-foreground)">${m.client_facing_wording || '-'}</td></tr>`;
        DOM.tbodyAir.insertAdjacentHTML('beforeend', trHtml); 
        if(DOM.mgridAir) DOM.mgridAir.insertAdjacentHTML('beforeend', `<div class="jb-mobile-data-card" data-id="${m.id}" style="cursor: pointer;"><div class="jb-mobile-card-header"><div style="font-size:12.5px;font-weight:500">${title}</div><span class="jb-status-badge jb-status-${m.status_flag}">${m.status_flag}</span></div><div class="jb-font-mono jb-tabular" style="font-size:13px">${m.value || '-'} ${m.unit || ''}</div><div style="font-size:11px;color:var(--muted-foreground)">${m.client_facing_wording || '-'}</div></div>`);
      }); 
    }

    document.querySelectorAll('tr[data-id], .jb-mobile-data-card[data-id]').forEach(el => { 
      el.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        const metricName = el.querySelector('td:nth-child(2)')?.textContent || el.querySelector('.jb-mobile-card-header div').textContent; 
        if(DOM.mTitle) DOM.mTitle.textContent = metricName; 
        if(DOM.modal) DOM.modal.classList.remove('jb-hidden'); 
      }); 
    });
    toggleSkeletonState(false);
  };

  const init = async () => {
    // 1. Text Replacements First
    const eyebrow = document.querySelector('.jb-eyebrow, .eyebrow');
    if (eyebrow && eyebrow.textContent.toUpperCase().includes('DIAGNOSTIC LOG')) eyebrow.textContent = 'Measurement Log / 03';
    const pageTitle = document.querySelector('.jb-page-title, .hero-title');
    if (pageTitle) pageTitle.textContent = "Diagnostic Record";
    const pageDesc = document.querySelector('.jb-page-description, .hero-desc');
    if (pageDesc) pageDesc.textContent = "Measurement records, indexed by discipline. Each row references the analyst record and source evidence where applicable.";

    // 2. DOM Assignment
    DOM.desktopSidebarAsset = document.getElementById('desktopSidebarAsset');
    DOM.desktopHeaderAsset = document.getElementById('desktopHeaderAsset');
    const headerTabs = document.querySelectorAll('.jb-desktop-telemetry .jb-tabular, .header-telemetry-cluster .tabular');
    DOM.headerClimateText = headerTabs[1];
    DOM.headerSysText = headerTabs[2];
    DOM.sidebarMeta = document.getElementById('desktopSidebarMeta') || document.querySelector('.sidebar-footer > div:last-child');
    DOM.tbodyThermal = document.getElementById('tbody-thermal');
    DOM.mgridThermal = document.getElementById('mgrid-thermal');
    DOM.countThermal = document.getElementById('count-thermal');
    DOM.tbodyAir = document.getElementById('tbody-air');
    DOM.mgridAir = document.getElementById('mgrid-air');
    DOM.countAir = document.getElementById('count-air');
    DOM.modal = document.getElementById('jbDiagnosticModal');
    DOM.modalCloseBtn = document.getElementById('modalCloseBtn');
    DOM.mTitle = document.getElementById('modalMetricTitle');

    toggleSkeletonState(true); 
    if (DOM.modalCloseBtn) DOM.modalCloseBtn.addEventListener('click', () => DOM.modal.classList.add('jb-hidden'));
    if (DOM.modal) DOM.modal.addEventListener('click', (e) => { if(e.target === DOM.modal) DOM.modal.classList.add('jb-hidden'); });

    if (!window.supabase) return; 
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    try {
      const member = await window.$memberstackDom.getCurrentMember();
      const { data: profile } = await supabase.from('profiles').select('building_id').eq('memberstack_id', member.data.id).single();
      let targetBuildingId = profile?.building_id;
      
      if (!targetBuildingId && localStorage.getItem('jb_demo_mode') === 'true') { 
        const { data: demoB } = await supabase.from('buildings').select('id').eq('building_code', 'DEMO-001').single(); 
        if (demoB) targetBuildingId = demoB.id; 
      }
      
      if (targetBuildingId) { 
        const diagnosticsData = await fetchDiagnosticsData(targetBuildingId); 
        mapToDOM(diagnosticsData); 
      } else { 
        toggleSkeletonState(false); 
      }
    } catch (error) {
      console.error("Diagnostic Init Error:", error);
      if(DOM.tbodyThermal) DOM.tbodyThermal.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Error loading data.</td></tr>`;
    }
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsDiagnostics.init); } else { JoeBuildsDiagnostics.init(); }
