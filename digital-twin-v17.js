/**
 * Joe Builds Home Intelligence Platform
 * Digital Twin Controller (v17 - Language Recalibration & Demo Mode)
 */
const JoeBuildsDigitalTwin = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  let supabase, activeZonesData = {}, globalImages = [];
  
  const roomCoordinates = { 'primary': { left: '22%', top: '28%' }, 'kitchen': { left: '60%', top: '32%' }, 'plant': { left: '78%', top: '62%' }, 'subfloor': { left: '40%', top: '78%' }, 'living': { left: '45%', top: '50%' } };
  
  const DOM = { 
    desktopSidebarAsset: document.getElementById('desktopSidebarAsset'), desktopHeaderAsset: document.getElementById('desktopHeaderAsset'), headerClimateText: document.getElementById('desktopHeaderClimate'), headerSysText: document.getElementById('desktopHeaderSys'), sidebarMeta: document.getElementById('sidebarMeta'), 
    zonesListContainer: document.getElementById('zonesListContainer'), zonesCountLabel: document.getElementById('zonesCountLabel'), dynamicHotspots: document.getElementById('dynamic-hotspots'), 
    aside: document.getElementById('jbDiagnosticAside'), backdrop: document.getElementById('jbAsideBackdrop'), closeBtn: document.getElementById('asideCloseBtn'), aTitle: document.getElementById('asideZoneTitle'), aRH: document.getElementById('asideMetricRH'), aTVOC: document.getElementById('asideMetricTVOC'), aCO2: document.getElementById('asideMetricCO2'), aBadge: document.getElementById('asideStatusBadge'), aDot: document.getElementById('asideStatusDot'), aTxt: document.getElementById('asideStatusText'), aNotes: document.getElementById('asideNotes'), imageryGrid: document.getElementById('imageryGridContainer'), aMonitoringText: document.getElementById('asideMonitoringText') 
  };

  const toggleSkeletonState = (isLoading) => { 
    const elementsToToggle = [DOM.desktopSidebarAsset, DOM.desktopHeaderAsset, DOM.headerClimateText, DOM.headerSysText, DOM.zonesCountLabel, DOM.sidebarMeta]; 
    elementsToToggle.forEach(el => { if (!el) return; if (isLoading) el.classList.add('jb-skeleton-block'); else el.classList.remove('jb-skeleton-block'); }); 
    if (isLoading && DOM.zonesListContainer) DOM.zonesListContainer.innerHTML = `<div class="jb-zone-row-item jb-skeleton-block" style="height: 48px; margin-bottom: 1px;"></div>`; 
  };

  const initUIEvents = () => {
    const closeAside = () => { DOM.aside.classList.remove('is-open'); DOM.backdrop.classList.remove('is-open'); document.querySelectorAll('.jb-hotspot, .jb-zone-row-item').forEach(el => el.classList.remove('jb-active-node')); setTimeout(() => { DOM.aside.classList.add('jb-hidden'); }, 300); };
    if (DOM.closeBtn) DOM.closeBtn.addEventListener('click', closeAside); 
    if (DOM.backdrop) DOM.backdrop.addEventListener('click', closeAside);
  };

  const fetchTwinData = async (buildingId) => {
    const [buildingRes, projectsRes, roomsRes, measurementsRes, evidenceRes] = await Promise.all([ 
      supabase.from('buildings').select('*').eq('id', buildingId).single(), 
      supabase.from('projects').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }), 
      supabase.from('rooms').select('*').eq('building_id', buildingId).order('created_at', { ascending: true }), 
      supabase.from('measurements').select(`*, measurement_points(zone_code, element_code)`).eq('building_id', buildingId), 
      supabase.from('evidence_assets').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }) 
    ]);
    if (evidenceRes.data) globalImages = evidenceRes.data.filter(f => f.file_name.match(/\.(jpg|jpeg|png|webp|gif)$/i));
    return { building: buildingRes.data, currentProject: projectsRes.data?.[0], rooms: roomsRes.data || [], measurements: measurementsRes.data || [] };
  };

  const renderDashboard = (data) => {
    if (!data.building) return;
    const assetName = `${data.currentProject?.project_code || 'PRJ-000'} — ${data.building.address_line_1}`;
    if (DOM.desktopSidebarAsset) DOM.desktopSidebarAsset.textContent = assetName; 
    if (DOM.desktopHeaderAsset) DOM.desktopHeaderAsset.textContent = assetName;
    if (DOM.headerSysText) DOM.headerSysText.textContent = data.building.status || 'Pending';
    const climateText = (data.building.state || 'WA') === 'WA' ? 'Zone 5 — Warm Temperate' : 'Zone 6 — Mild Temperate';
    if (DOM.headerClimateText) DOM.headerClimateText.textContent = climateText; 
    if (DOM.sidebarMeta) DOM.sidebarMeta.textContent = climateText;

    activeZonesData = {};
    data.rooms.forEach(room => {
      const roomMs = data.measurements.filter(m => m.room_id === room.id);
      const getVal = (code) => { const m = roomMs.find(x => x.measurement_points?.element_code === code); if (!m) return '--'; let unit = m.unit || ''; return `${m.value || 0} ${unit}`.trim(); };
      const statuses = roomMs.map(m => m.status_flag); 
      let overallStatus = 'stable'; if (statuses.includes('review')) overallStatus = 'review'; else if (statuses.includes('risk')) overallStatus = 'risk'; else if (statuses.includes('measured')) overallStatus = 'measured';
      const activeSensors = []; if(getVal('RH') !== '--') activeSensors.push('RH'); if(getVal('CO2') !== '--') activeSensors.push('CO₂'); if(getVal('VOC') !== '--') activeSensors.push('VOC');
      activeZonesData[room.id] = { id: room.id, title: room.room_name_current, code: room.room_code.toLowerCase(), map_x: room.map_x, map_y: room.map_y, rh: getVal('RH'), tvoc: getVal('VOC'), co2: getVal('CO2'), status: overallStatus, badge: overallStatus === 'risk' ? 'At Risk' : overallStatus === 'review' ? 'Review Required' : overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1), notes: room.notes || 'No active analyst notes for this zone.', monitoring: activeSensors.length > 0 ? `Active Sensors: ${activeSensors.join(', ')}` : `No active nodes linked.` };
    });

    const zoneKeys = Object.keys(activeZonesData);
    if (DOM.zonesCountLabel) DOM.zonesCountLabel.textContent = `Zones · ${zoneKeys.length}`;
    if (DOM.zonesListContainer) { 
      DOM.zonesListContainer.innerHTML = ''; 
      zoneKeys.forEach(key => { 
        const zone = activeZonesData[key]; 
        const btn = document.createElement('button'); btn.className = 'jb-zone-row-item'; btn.setAttribute('data-id', key); 
        btn.innerHTML = `<span class="jb-zone-label">${zone.title}</span><span class="jb-status-badge jb-status-${zone.status}"><span class="jb-badge-dot bg-${zone.status}"></span>${zone.badge}</span>`; 
        btn.addEventListener('click', (e) => { e.stopPropagation(); openDiagnosticPanel(key); }); 
        DOM.zonesListContainer.appendChild(btn); 
      }); 
    }
    
    if (DOM.dynamicHotspots) { 
      DOM.dynamicHotspots.innerHTML = ''; let unknownOffset = 10; 
      zoneKeys.forEach(key => { 
        const zone = activeZonesData[key]; let coords = null; 
        if (zone.map_x != null && zone.map_y != null) { coords = { left: `${zone.map_x}%`, top: `${zone.map_y}%` }; } 
        else if (roomCoordinates[zone.code]) { coords = roomCoordinates[zone.code]; } 
        else { coords = { left: `${unknownOffset}%`, top: '90%' }; unknownOffset += 15; } 
        const hotspotHTML = `<button class="jb-hotspot" style="left:${coords.left}; top:${coords.top};" data-id="${key}"><span class="jb-hotspot-pulse"><span class="jb-hotspot-ping-wave bg-${zone.status}"></span><span class="jb-hotspot-core-ring" style="border-color: var(--status-${zone.status});"></span></span><span class="jb-hotspot-tag">${zone.title}</span></button>`; 
        DOM.dynamicHotspots.insertAdjacentHTML('beforeend', hotspotHTML); 
      }); 
      document.querySelectorAll('.jb-hotspot').forEach(node => { node.addEventListener('click', (e) => { e.stopPropagation(); openDiagnosticPanel(node.getAttribute('data-id')); }); }); 
    }
    toggleSkeletonState(false);
  };

  const openDiagnosticPanel = (zoneId) => {
    document.querySelectorAll('.jb-hotspot, .jb-zone-row-item').forEach(el => el.classList.remove('jb-active-node'));
    const data = activeZonesData[zoneId]; if (!data) return;
    DOM.aTitle.textContent = data.title; DOM.aRH.textContent = data.rh; DOM.aTVOC.textContent = data.tvoc; DOM.aCO2.textContent = data.co2; DOM.aTxt.textContent = data.badge; DOM.aNotes.textContent = data.notes; DOM.aMonitoringText.textContent = data.monitoring; DOM.aBadge.className = `jb-status-badge jb-status-${data.status}`; DOM.aDot.className = `jb-badge-dot bg-${data.status}`;
    
    if (DOM.imageryGrid) { 
      const roomImages = globalImages.filter(img => img.room_id === data.id); 
      DOM.imageryGrid.innerHTML = ''; 
      if (roomImages.length > 0) { 
        roomImages.slice(0, 2).forEach(img => { DOM.imageryGrid.innerHTML += `<div class="jb-imagery-box" style="padding:0; overflow:hidden; border:none; background:var(--border);"><img src="${img.file_url}" style="width:100%; height:100%; object-fit:cover;"></div>`; }); 
      } else { 
        DOM.imageryGrid.innerHTML = `<div class="jb-imagery-box">No Evidence</div>`; 
      } 
    }
    const tNode = document.querySelector(`.jb-hotspot[data-id="${zoneId}"]`); const tRow = document.querySelector(`.jb-zone-row-item[data-id="${zoneId}"]`); 
    if (tNode) tNode.classList.add('jb-active-node'); 
    if (tRow) { tRow.classList.add('jb-active-node'); tRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    DOM.aside.classList.remove('jb-hidden'); setTimeout(() => { DOM.aside.classList.add('is-open'); DOM.backdrop.classList.add('is-open'); }, 10);
  };

  const init = async () => {
    toggleSkeletonState(true); initUIEvents();
    
    // Quick DOM text swaps for recalibration
    const eyebrow = document.querySelector('.eyebrow');
    if (eyebrow && eyebrow.textContent.includes('Digital Twin')) eyebrow.textContent = 'Home Map / 02';
    const pageTitle = document.querySelector('.hero-title');
    if (pageTitle) pageTitle.textContent = "Measured Home Map";
    const pageDesc = document.querySelector('.hero-desc');
    if (pageDesc) pageDesc.textContent = "Interactive home map showing room-level readings, risk flags, reports, and stability changes over time.";

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
        const twinData = await fetchTwinData(targetBuildingId); 
        renderDashboard(twinData); 
      } else { 
        toggleSkeletonState(false); 
      }
    } catch (error) {}
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsDigitalTwin.init); } else { JoeBuildsDigitalTwin.init(); }
