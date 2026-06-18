/**
 * Joe Builds Home Intelligence Platform
 * Administrative Data Controller (v3 - Foolproof Sidebar Reveal)
 */
const JoeBuildsAdmin = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  let supabase, currentBuildingId = null;

  const DOM = {
    opLabel: document.getElementById('jbOperatorLabel'),
    opEmail: document.getElementById('jbOperatorEmail'),
    dropBtn: document.getElementById('jbOperatorDropdown'),
    opMenu: document.getElementById('jbOperatorMenu'),
    logoutBtn: document.getElementById('jbLogoutBtn'),
    desktopSidebarAsset: document.getElementById('desktopSidebarAsset'),
    desktopHeaderAsset: document.getElementById('desktopHeaderAsset'),
    headerClimateText: document.querySelectorAll('.header-telemetry-cluster .tabular')[1],
    headerSysText: document.querySelectorAll('.header-telemetry-cluster .tabular')[2],
    assetSelect: document.getElementById('asset-select'),
    assetCount: document.getElementById('asset-count'),
    telemetryContainer: document.getElementById('telemetry-container'),
    twinNodesContainer: document.getElementById('twin-nodes-container'),
    pathwayContainer: document.getElementById('pathway-container'),
    reportInput: document.getElementById('report-upload-input'),
    uploadStatusText: document.getElementById('upload-status-text'),
    archiveCount: document.getElementById('archive-count')
  };

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
    const elementsToToggle = [DOM.desktopSidebarAsset, DOM.desktopHeaderAsset, DOM.headerClimateText, DOM.headerSysText, DOM.assetCount, DOM.archiveCount];
    elementsToToggle.forEach(el => {
      if (!el) return;
      if (isLoading) el.classList.add('jb-skeleton-block');
      else el.classList.remove('jb-skeleton-block');
    });
    if (isLoading && DOM.telemetryContainer) {
      DOM.telemetryContainer.innerHTML = `<div class="card-surface jb-skeleton-block" style="height: 150px;"></div><div class="card-surface jb-skeleton-block" style="height: 150px;"></div>`;
    }
  };

  const initUIEvents = () => {
    if (DOM.dropBtn && DOM.opMenu) {
      DOM.dropBtn.addEventListener('click', (e) => { e.stopPropagation(); DOM.dropBtn.setAttribute('aria-expanded', !(DOM.dropBtn.getAttribute('aria-expanded') === 'true')); DOM.opMenu.classList.toggle('jb-hidden'); });
      document.addEventListener('click', () => { DOM.dropBtn.setAttribute('aria-expanded', 'false'); DOM.opMenu.classList.add('jb-hidden'); });
    }
    if (DOM.logoutBtn) DOM.logoutBtn.addEventListener('click', async () => { try { await window.$memberstackDom.logout(); window.location.href = '/login'; } catch (err) {} });
    DOM.assetSelect?.addEventListener('change', (e) => { 
      currentBuildingId = e.target.value; 
      toggleSkeletonState(true);
      loadAssetContext(currentBuildingId); 
    });
    DOM.reportInput?.addEventListener('change', handleReportUpload);
  };

  const authenticateAdmin = async () => {
    const member = await window.$memberstackDom.getCurrentMember();
    if (!member || !member.data) throw new Error("No session.");
    const { data: profile, error } = await supabase.from('profiles').select('id, role').eq('memberstack_id', member.data.id).single();
    if (error || !profile) throw new Error("Profile error");
    
    if (profile.role === 'client' || profile.role === 'demo') { window.location.href = '/dashboard'; return null; }
    
    if (DOM.opLabel) DOM.opLabel.textContent = member.data.customFields?.first_name || 'Admin';
    if (DOM.opEmail) DOM.opEmail.textContent = `Role: ${profile.role.toUpperCase()}`;
    
    // FOOLPROOF REVEAL: Physically delete the CSS hiding the sidebar links
    const hideStyle = document.getElementById('rbac-hide-admin');
    if (hideStyle) hideStyle.remove();

    return profile;
  };

  const loadGlobalAssets = async () => {
    const { data: buildings } = await supabase.from('buildings').select('id, building_code, address_line_1').order('created_at', { ascending: false });
    if (!buildings) return;
    DOM.assetCount.textContent = `${buildings.length} managed assets`;
    DOM.assetSelect.innerHTML = '';
    buildings.forEach(b => {
      const opt = document.createElement('option'); opt.value = b.id; opt.textContent = `${b.building_code || 'PRJ'} — ${b.address_line_1}`;
      DOM.assetSelect.appendChild(opt);
    });
    if (buildings.length > 0) { currentBuildingId = buildings[0].id; loadAssetContext(currentBuildingId); }
  };

  const loadAssetContext = async (buildingId) => {
    const [buildingRes, measurementsRes, roomsRes, scenariosRes, reportsRes] = await Promise.all([
      supabase.from('buildings').select('*').eq('id', buildingId).single(),
      supabase.from('measurements').select(`*, measurement_points(*)`).eq('building_id', buildingId),
      supabase.from('rooms').select('*').eq('building_id', buildingId),
      supabase.from('upgrade_scenarios').select('*').eq('building_id', buildingId).order('step_number', { ascending: true }),
      supabase.from('reports').select('id').eq('building_id', buildingId)
    ]);
    
    const bData = buildingRes.data; if (!bData) return;
    const bTitle = `${bData.building_code || 'PRJ'} — ${bData.address_line_1}`;
    
    DOM.desktopSidebarAsset.textContent = bTitle; 
    DOM.desktopHeaderAsset.textContent = bTitle;
    if (DOM.headerSysText) DOM.headerSysText.textContent = bData.status || 'Pending';
    if (DOM.headerClimateText) DOM.headerClimateText.textContent = bData.state === 'WA' ? 'Zone 5 — Warm Temperate' : 'Zone 6 — Mild Temperate';
    DOM.archiveCount.textContent = `Archive currently holds ${reportsRes.data?.length || 0} reports.`;
    
    renderTelemetryEditor(measurementsRes.data || []);
    renderTwinEditor(roomsRes.data || [], measurementsRes.data || []);
    renderPathwayEditor(scenariosRes.data || []);

    toggleSkeletonState(false);
  };

  const generateStatusOptions = (currentStatus) => {
    const options = ['unknown', 'measured', 'stable', 'risk', 'review'];
    return options.map(opt => `<option value="${opt}" ${opt === currentStatus ? 'selected' : ''}>${opt === 'risk' ? 'At Risk' : opt === 'review' ? 'Review Required' : opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`).join('');
  };

  const autoSaveData = async (table, id, payload, elementToFlash) => {
    if (!id || id === 'new') return; 
    elementToFlash.classList.add('saving');
    await supabase.from(table).update(payload).eq('id', id);
    setTimeout(() => elementToFlash.classList.remove('saving'), 500);
  };

  const renderTelemetryEditor = (measurements) => {
    DOM.telemetryContainer.innerHTML = '';
    ['ENVELOPE', 'U-VALUE', 'MOISTURE', 'CO2', 'READINESS', 'PRIORITY'].forEach(code => {
      const m = measurements.find(x => x.measurement_points?.element_code === code); if (!m) return;
      const cardHTML = `<div class="card-surface" id="card-${m.id}"><div class="card-header"><div class="card-title">${code.replace(/-/g, ' ')} Metric</div><span class="status-badge status-${m.status_flag}"><span class="badge-dot"></span>${m.status_flag}</span></div><div class="metrics-input-grid"><select class="control-select" data-table="measurements" data-id="${m.id}" data-col="status_flag">${generateStatusOptions(m.status_flag)}</select><input class="control-input" value="${m.value}" data-table="measurements" data-id="${m.id}" data-col="value"></div><textarea rows="2" class="control-textarea" data-table="measurements" data-id="${m.id}" data-col="client_facing_wording">${m.client_facing_wording || ''}</textarea></div>`;
      DOM.telemetryContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
    attachAutoSaveListeners(DOM.telemetryContainer);
  };

  const renderTwinEditor = (rooms, measurements) => {
    DOM.twinNodesContainer.innerHTML = '';
    rooms.forEach(room => {
      const roomMs = measurements.filter(x => x.room_id === room.id || (x.measurement_points && x.measurement_points.room_id === room.id));
      const overallM = roomMs.find(x => x.status_flag === 'risk' || x.status_flag === 'review') || roomMs[0] || { status_flag: 'unknown', id: 'new' };
      
      const getValInput = (code) => { 
        // Handles fallback gracefully if a specific sensor is missing or misnamed in DB
        let sm = roomMs.find(x => x.measurement_points?.element_code === code); 
        // Fallback catch for MOISTURE mapping from dummy data
        if(!sm && code === 'RH') sm = roomMs.find(x => x.measurement_points?.element_code === 'MOISTURE');
        
        if(!sm) return `<input class="control-input tabular" disabled placeholder="-" title="No sensor assigned">`; 
        return `<input step="any" class="control-input tabular" type="number" value="${sm.value}" data-table="measurements" data-id="${sm.id}" data-col="value">`; 
      };

      const cardHTML = `<div class="card-surface" id="card-${room.id}"><div class="card-title">${room.room_name_current}</div><div class="node-input-grid"><label><div class="eyebrow" style="margin-bottom: 0.25rem;">RH%</div>${getValInput('RH')}</label><label><div class="eyebrow" style="margin-bottom: 0.25rem;">CO₂</div>${getValInput('CO2')}</label><label><div class="eyebrow" style="margin-bottom: 0.25rem;">VOC</div>${getValInput('VOC')}</label></div><select class="control-select" style="margin-top: 0.25rem;" data-table="measurements" data-id="${overallM.id}" data-col="status_flag">${generateStatusOptions(overallM.status_flag)}</select></div>`;
      DOM.twinNodesContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
    attachAutoSaveListeners(DOM.twinNodesContainer);
  };

  const renderPathwayEditor = (scenarios) => {
    DOM.pathwayContainer.innerHTML = '';
    scenarios.forEach(scen => {
      const cardHTML = `<div class="pathway-row" id="row-${scen.id}"><div class="pathway-title"><span class="font-mono text-muted-foreground" style="font-size: 10px; text-transform: uppercase; letter-spacing: var(--tracking-widest); margin-right: 0.5rem;">Phase 0${scen.phase}</span>${scen.title}</div><select class="control-select" data-table="upgrade_scenarios" data-id="${scen.id}" data-col="status"><option value="completed" ${scen.status === 'completed' ? 'selected' : ''}>Completed</option><option value="in-progress" ${scen.status === 'in-progress' ? 'selected' : ''}>In Progress</option><option value="locked" ${scen.status === 'locked' ? 'selected' : ''}>Locked Phase</option></select></div>`;
      DOM.pathwayContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
    attachAutoSaveListeners(DOM.pathwayContainer);
  };

  const attachAutoSaveListeners = (container) => {
    container.querySelectorAll('input:not([disabled]), select, textarea').forEach(input => {
      input.addEventListener('change', (e) => {
        const payload = {}; payload[e.target.getAttribute('data-col')] = e.target.value;
        autoSaveData(e.target.getAttribute('data-table'), e.target.getAttribute('data-id'), payload, e.target.closest('.card-surface, .pathway-row'));
      });
    });
  };

  const handleReportUpload = async (e) => {
    if (!currentBuildingId) return;
    const file = e.target.files[0]; if (!file) return;
    DOM.uploadStatusText.textContent = `Uploading ${file.name}...`;
    const fileName = `${currentBuildingId}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: uploadErr } = await supabase.storage.from('reports').upload(fileName, file);
    if (uploadErr) { DOM.uploadStatusText.textContent = `Upload failed. Try again.`; return; }
    const { data: urlData } = supabase.storage.from('reports').getPublicUrl(fileName);
    const { error: dbErr } = await supabase.from('reports').insert([{ building_id: currentBuildingId, report_title: file.name, report_url: urlData.publicUrl, report_type: file.name.split('.').pop().toUpperCase(), client_visible: true }]);
    DOM.uploadStatusText.textContent = `Drag & Drop Diagnostic Reports`; DOM.reportInput.value = '';
    if (!dbErr) DOM.archiveCount.textContent = `Archive currently holds ${(parseInt(DOM.archiveCount.textContent.match(/\d+/)[0]) || 0) + 1} reports.`;
  };

  const init = async () => {
    injectSkeletonCSS();
    toggleSkeletonState(true);
    initUIEvents();
    if (!window.supabase) return;
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    try { 
      const profile = await authenticateAdmin(); 
      if (profile) await loadGlobalAssets(); 
    } catch (error) {
      console.error(error);
      window.location.href = '/login';
    }
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsAdmin.init);
} else { JoeBuildsAdmin.init(); }
