/**
 * Joe Builds Home Intelligence Platform
 * Diagnostics Controller (v21 - Bulletproof Data Renderer)
 */
console.log("JB Diagnostics Controller v21 initializing...");

const JoeBuildsDiagnostics = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_xla-awjgU2npKzrWHdYKDQ_2ox0CWmC';
  let supabase, measurementsStore = {};
  let DOM = {};

  const toggleSkeletonState = (isLoading) => { 
    try {
      const elementsToToggle = [ DOM.desktopSidebarAsset, DOM.desktopHeaderAsset, DOM.headerClimateText, DOM.headerSysText, DOM.countThermal, DOM.countAir, DOM.sidebarMeta ]; 
      elementsToToggle.forEach(el => { if (!el) return; if (isLoading) el.classList.add('jb-skeleton-block'); else el.classList.remove('jb-skeleton-block'); }); 
      if (isLoading && DOM.tbodyThermal) DOM.tbodyThermal.innerHTML = `<tr><td colspan="5"><div class="jb-skeleton-block" style="height: 40px; width: 100%;"></div></td></tr>`;
      if (isLoading && DOM.tbodyAir) DOM.tbodyAir.innerHTML = `<tr><td colspan="5"><div class="jb-skeleton-block" style="height: 40px; width: 100%;"></div></td></tr>`;
    } catch(err) { console.warn("Skeleton UI toggle failed:", err); }
  };

  const fetchDiagnosticsData = async (buildingId) => { 
    // Ask for everything to ensure no data is left behind
    const [buildingRes, projectsRes, measurementsRes] = await Promise.all([ 
      supabase.from('buildings').select('*').eq('id', buildingId).single(), 
      supabase.from('projects').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }), 
      supabase.from('measurements').select(`*, measurement_points(*)`).eq('building_id', buildingId) 
    ]); 

    return { 
      building: buildingRes.data, 
      currentProject: projectsRes.data?.[0], 
      measurements: measurementsRes.data || [],
      error: buildingRes.error || measurementsRes.error
    }; 
  };

  const mapToDOM = (data) => {
    // 1. Force the UI to unfreeze immediately
    if (DOM.tbodyThermal) DOM.tbodyThermal.innerHTML = ''; 
    if (DOM.tbodyAir) DOM.tbodyAir.innerHTML = '';
    if (DOM.mgridThermal) DOM.mgridThermal.innerHTML = '';
    if (DOM.mgridAir) DOM.mgridAir.innerHTML = '';

    // 2. If no building was found, stop and show error
    if (!data.building) {
       if (DOM.desktopHeaderAsset) DOM.desktopHeaderAsset.textContent = "Unassigned Property";
       if (DOM.desktopSidebarAsset) DOM.desktopSidebarAsset.textContent = "Unassigned Property";
       if (DOM.tbodyThermal) DOM.tbodyThermal.innerHTML = `<tr><td colspan="5" style="color:var(--status-review); padding: 2rem;">No property assigned or RLS access blocked.</td></tr>`;
       toggleSkeletonState(false);
       return;
    }

    // 3. Update the Header UI with actual data
    const assetName = `${data.currentProject?.project_code || 'PRJ-000'} — ${data.building.address_line_1}`;
    if (DOM.desktopSidebarAsset) DOM.desktopSidebarAsset.textContent = assetName; 
    if (DOM.desktopHeaderAsset) DOM.desktopHeaderAsset.textContent = assetName; 
    if (DOM.headerSysText) DOM.headerSysText.textContent = data.building.status || 'Pending';
    
    const state = data.building.state || 'WA'; 
    const climateText = state === 'WA' ? 'Zone 5 — Warm Temperate' : 'Zone 6 — Mild Temperate';
    if (DOM.headerClimateText) DOM.headerClimateText.textContent = climateText; 
    if (DOM.sidebarMeta) DOM.sidebarMeta.textContent = climateText;

    // 4. Handle Empty Measurements Gracefully
    if (data.measurements.length === 0) {
      if (DOM.tbodyThermal) DOM.tbodyThermal.innerHTML = `<tr><td colspan="5" style="color:var(--status-review); padding: 2rem;">No diagnostic measurements found in the database.</td></tr>`;
      toggleSkeletonState(false);
      return;
    }
    
    const thermals = [], airTightsAndOthers = [];
    
    // 5. Catch ALL codes, even ones we didn't explicitly plan for
    data.measurements.forEach(m => { 
      measurementsStore[m.id] = m; 
      let code = 'UNKNOWN';
      if (m.measurement_points) { 
        code = Array.isArray(m.measurement_points) ? m.measurement_points[0]?.element_code : m.measurement_points.element_code; 
      }
      m.extracted_code = code || 'UNKNOWN';
      
      // Categorize
      if (['U-VALUE', 'THERMAL_BRIDGE', 'ENVELOPE'].includes(m.extracted_code)) {
         thermals.push(m);
      } else {
         // EVERYTHING else (CO2, RH, VOC, PRIORITY, READINESS, etc) goes here so it shows on screen!
         airTightsAndOthers.push(m);
      }
    });

    // 6. Inject Thermal Rows
    if (thermals.length === 0 && DOM.tbodyThermal) {
      DOM.tbodyThermal.innerHTML = `<tr><td colspan="5" style="color:var(--muted-foreground); padding:1rem;">No thermal envelope data logged yet.</td></tr>`;
    } else if (DOM.tbodyThermal && DOM.countThermal) { 
      DOM.countThermal.textContent = `${thermals.length} entries`; 
      thermals.forEach(m => { 
        let title = m.extracted_code.replace(/-/g, ' ') + ' Metric';
        if (m.extracted_code === 'U-VALUE') title = 'Assembly U-Value';
        if (m.extracted_code === 'ENVELOPE') title = 'Envelope Integrity';
        
        const trHtml = `<tr data-id="${m.id}" style="cursor: pointer;"><td><button class="jb-img-btn"><svg style="width:14px;height:14px"><use href="#i-img"/></svg></button></td><td>${title}</td><td class="jb-font-mono jb-tabular">${m.value || '-'} ${m.unit || ''}</td><td><span class="jb-status-badge jb-status-${m.status_flag || 'unknown'}">${m.status_flag || 'unknown'}</span></td><td style="color:var(--muted-foreground)">${m.client_facing_wording || '-'}</td></tr>`;
        DOM.tbodyThermal.insertAdjacentHTML('beforeend', trHtml); 
        if(DOM.mgridThermal) DOM.mgridThermal.insertAdjacentHTML('beforeend', `<div class="jb-mobile-data-card" data-id="${m.id}" style="cursor: pointer;"><div class="jb-mobile-card-header"><div style="font-size:12.5px;font-weight:500">${title}</div><span class="jb-status-badge jb-status-${m.status_flag || 'unknown'}">${m.status_flag || 'unknown'}</span></div><div class="jb-font-mono jb-tabular" style="font-size:13px">${m.value || '-'} ${m.unit || ''}</div><div style="font-size:11px;color:var(--muted-foreground)">${m.client_facing_wording || '-'}</div></div>`);
      }); 
    }
    
    // 7. Inject Air Tightness & IAQ Rows
    if (airTightsAndOthers.length === 0 && DOM.tbodyAir) {
      DOM.tbodyAir.innerHTML = `<tr><td colspan="5" style="color:var(--muted-foreground); padding:1rem;">No air or IAQ data logged yet.</td></tr>`;
    } else if (DOM.tbodyAir && DOM.countAir) { 
      DOM.countAir.textContent = `${airTightsAndOthers.length} entries`; 
      
      // Update the section title so it makes sense for the mixed data
      const airTitle = document.querySelector('#section-air .jb-section-title');
      if (airTitle) airTitle.textContent = "Air Tightness & Environment";

      airTightsAndOthers.forEach(m => { 
        let title = m.extracted_code.replace(/-/g, ' ') + ' Metric';
        if (m.extracted_code === 'ACH50') title = 'Air Infiltration Rate (ACH50)';
        if (m.extracted_code === 'CO2') title = 'Indoor Air Quality (CO₂)';
        if (m.extracted_code === 'RH') title = 'Relative Humidity';
        if (m.extracted_code === 'VOC') title = 'Volatile Organic Compounds (VOC)';
        if (m.extracted_code === 'PRIORITY') title = 'Active Priority Vector';
        if (m.extracted_code === 'READINESS') title = 'Upgrade Readiness';

        const trHtml = `<tr data-id="${m.id}" style="cursor: pointer;"><td><button class="jb-img-btn"><svg style="width:14px;height:14px"><use href="#i-img"/></svg></button></td><td>${title}</td><td class="jb-font-mono jb-tabular">${m.value || '-'} ${m.unit || ''}</td><td><span class="jb-status-badge jb-status-${m.status_flag || 'unknown'}">${m.status_flag || 'unknown'}</span></td><td style="color:var(--muted-foreground)">${m.client_facing_wording || '-'}</td></tr>`;
        DOM.tbodyAir.insertAdjacentHTML('beforeend', trHtml); 
        if(DOM.mgridAir) DOM.mgridAir.insertAdjacentHTML('beforeend', `<div class="jb-mobile-data-card" data-id="${m.id}" style="cursor: pointer;"><div class="jb-mobile-card-header"><div style="font-size:12.5px;font-weight:500">${title}</div><span class="jb-status-badge jb-status-${m.status_flag || 'unknown'}">${m.status_flag || 'unknown'}</span></div><div class="jb-font-mono jb-tabular" style="font-size:13px">${m.value || '-'} ${m.unit || ''}</div><div style="font-size:11px;color:var(--muted-foreground)">${m.client_facing_wording || '-'}</div></div>`);
      }); 
    }

    // 8. Bind Modal Click Events
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
    try {
      const pageTitle = document.querySelector('.jb-page-title, .hero-title');
      if (pageTitle) pageTitle.textContent = "Diagnostic Record";
      
      const pageDesc = document.querySelector('.jb-page-description, .hero-desc');
      if (pageDesc) pageDesc.textContent = "Measurement records, indexed by discipline. Each row references the analyst record and source evidence where applicable.";
      
      const eyebrow = document.querySelector('.jb-eyebrow, .eyebrow');
      if (eyebrow && eyebrow.textContent.toUpperCase().includes('DIAGNOSTIC LOG')) eyebrow.textContent = 'Measurement Log / 03';

      // Safe Map DOM
      DOM.desktopSidebarAsset = document.getElementById('desktopSidebarAsset');
      DOM.desktopHeaderAsset = document.getElementById('desktopHeaderAsset');
      const headerTabs = document.querySelectorAll('.jb-desktop-telemetry .jb-tabular, .header-telemetry-cluster .tabular');
      DOM.headerClimateText = headerTabs[1] || null;
      DOM.headerSysText = headerTabs[2] || null;
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

      if (!window.supabase) { console.error("Supabase SDK not found."); return; }

      // SECURE TOKEN HANDSHAKE
      let supabaseToken = '';
      try { 
        const memberReq = await window.$memberstackDom.getCurrentMember();
        if (memberReq && memberReq.data && memberReq.data.customFields && memberReq.data.customFields['supabase-jwt']) {
            supabaseToken = memberReq.data.customFields['supabase-jwt'];
        }
      } catch(e) { console.warn("No Supabase token found"); }

      // Initialize Supabase
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: supabaseToken ? { Authorization: `Bearer ${supabaseToken}` } : {} }
      });
      
      const member = await window.$memberstackDom.getCurrentMember();
      if(!member || !member.data) { console.error("No member logged in."); return; }
      
      // Grab profile and building ID
      const { data: profile } = await supabase.from('profiles').select('building_id, role').eq('memberstack_id', member.data.id).single();
      let targetBuildingId = profile?.building_id;
      
      // ADMIN FALLBACK: Load the newest property if admin has no assignment
      if (!targetBuildingId && (profile?.role === 'admin' || profile?.role === 'operator' || profile?.role === 'Admin')) {
         const { data: fallbackB } = await supabase.from('buildings').select('id').order('created_at', { ascending: false }).limit(1).single();
         if (fallbackB) targetBuildingId = fallbackB.id;
      }
      
      // DEMO FALLBACK
      if (!targetBuildingId && localStorage.getItem('jb_demo_mode') === 'true') { 
        const { data: demoB } = await supabase.from('buildings').select('id').eq('building_code', 'DEMO-001').single(); 
        if (demoB) targetBuildingId = demoB.id; 
      }
      
      // Fetch and Map Data
      if (targetBuildingId) { 
        const diagnosticsData = await fetchDiagnosticsData(targetBuildingId); 
        mapToDOM(diagnosticsData); 
      } else { 
        if (DOM.tbodyThermal) DOM.tbodyThermal.innerHTML = `<tr><td colspan="5" style="padding:2rem; color:var(--status-review);">No property assigned.</td></tr>`;
        toggleSkeletonState(false); 
      }
    } catch (error) {
      console.error("Init Error crashed the script", error.message || error);
      toggleSkeletonState(false);
    }
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsDiagnostics.init); } else { JoeBuildsDiagnostics.init(); }
