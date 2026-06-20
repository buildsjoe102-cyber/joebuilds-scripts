/**
 * Joe Builds Home Intelligence Platform
 * Digital Twin Controller (v8 - Static Blueprint & Email Header Fix)
 */
const JoeBuildsDigitalTwin = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  let supabase, activeZonesData = {}, globalImages = [];

  const DOM = {
    opLabel: document.getElementById('jbOperatorLabel'),
    opEmail: document.getElementById('jbOperatorEmail'),
    dropBtn: document.getElementById('jbOperatorDropdown'),
    opMenu: document.getElementById('jbOperatorMenu'),
    logoutBtn: document.getElementById('jbLogoutBtn'),
    desktopSidebarAsset: document.getElementById('desktopSidebarAsset'),
    desktopHeaderAsset: document.getElementById('desktopHeaderAsset'),
    headerClimateText: document.getElementById('desktopHeaderClimate'),
    headerSysText: document.getElementById('desktopHeaderSys'),
    sidebarMeta: document.getElementById('sidebarMeta'),
    zonesListContainer: document.getElementById('zonesListContainer'),
    zonesCountLabel: document.getElementById('zonesCountLabel'),
    hotspots: document.querySelectorAll('.jb-hotspot'),
    
    // Aside Modal
    aside: document.getElementById('jbDiagnosticAside'),
    closeBtn: document.getElementById('asideCloseBtn'),
    aTitle: document.getElementById('asideZoneTitle'),
    aRH: document.getElementById('asideMetricRH'),
    aTVOC: document.getElementById('asideMetricTVOC'),
    aCO2: document.getElementById('asideMetricCO2'),
    aBadge: document.getElementById('asideStatusBadge'),
    aDot: document.getElementById('asideStatusDot'),
    aTxt: document.getElementById('asideStatusText'),
    aNotes: document.getElementById('asideNotes'),
    imageryGrid: document.getElementById('imageryGridContainer'),
    aMonitoringText: document.getElementById('asideMonitoringText')
  };

  const injectSkeletonCSS = () => {
    if(document.getElementById('jb-skeleton-css')) return;
    const style = document.createElement('style');
    style.id = 'jb-skeleton-css';
    style.innerHTML = `.jb-skeleton-block { position: relative; overflow: hidden; background-color: rgba(165, 179, 154, 0.2) !important; color: transparent !important; border-color: transparent !important; pointer-events: none; border-radius: 4px; } .jb-skeleton-block::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform: translateX(-100%); background-image: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%); animation: jb-shimmer 1.5s infinite; } .jb-skeleton-block * { visibility: hidden !important; } @keyframes jb-shimmer { 100% { transform: translateX(100%); } }`;
    document.head.appendChild(style);
  };

  const toggleSkeletonState = (isLoading) => {
    const elementsToToggle = [DOM.desktopSidebarAsset, DOM.desktopHeaderAsset, DOM.headerClimateText, DOM.headerSysText, DOM.zonesCountLabel, DOM.sidebarMeta];
    elementsToToggle.forEach(el => { if (!el) return; if (isLoading) el.classList.add('jb-skeleton-block'); else el.classList.remove('jb-skeleton-block'); });
    if (isLoading && DOM.zonesListContainer) DOM.zonesListContainer.innerHTML = `<div class="jb-zone-row-item jb-skeleton-block" style="height: 48px; margin-bottom: 1px;"></div><div class="jb-zone-row-item jb-skeleton-block" style="height: 48px; margin-bottom: 1px;"></div>`;
  };

  const initUIEvents = () => {
    if (DOM.dropBtn && DOM.opMenu) {
      DOM.dropBtn.addEventListener('click', (e) => { e.stopPropagation(); DOM.dropBtn.setAttribute('aria-expanded', !(DOM.dropBtn.getAttribute('aria-expanded') === 'true')); DOM.opMenu.classList.toggle('jb-hidden'); });
      document.addEventListener('click', () => { DOM.dropBtn.setAttribute('aria-expanded', 'false'); DOM.opMenu.classList.add('jb-hidden'); });
    }
    if (DOM.logoutBtn) DOM.logoutBtn.addEventListener('click', async () => { try { await window.$memberstackDom.logout(); window.location.href = '/login'; } catch (err) {} });
    
    const closeAside = () => {
      DOM.aside.classList.add('jb-hidden');
      document.querySelectorAll('.jb-hotspot').forEach(el => el.classList.remove('jb-active-node'));
      document.querySelectorAll('.jb-zone-row-item').forEach(el => el.classList.remove('jb-active-node'));
    };
    if (DOM.closeBtn) DOM.closeBtn.addEventListener('click', closeAside);
  };

  const authAndGetProfile = async () => {
    const member = await window.$memberstackDom.getCurrentMember();
    if (!member || !member.data) throw new Error("No Memberstack session.");
    if (DOM.opLabel) DOM.opLabel.textContent = member.data.customFields?.first_name || 'Client';
    
    // RESTORED EMAIL CONSISTENCY!
    if (DOM.opEmail) DOM.opEmail.textContent = `Logged in as: ${member.data.auth.email}`;
    
    const { data: profile } = await supabase.from('profiles').select('id, building_id, role').eq('memberstack_id', member.data.id).single();
    if (profile && (profile.role === 'admin' || profile.role === 'operator')) {
      const hideStyle = document.getElementById('rbac-hide-admin');
      if (hideStyle) hideStyle.remove(); 
    }
    return profile;
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

  const processZoneData = (rooms, measurements) => {
    const zones = {};
    rooms.forEach(room => {
      const roomMs = measurements.filter(m => m.room_id === room.id);
      
      const getVal = (code) => { 
        const m = roomMs.find(x => x.measurement_points?.element_code === code); 
        if (!m) return '--';
        let unit = m.unit;
        if (!unit) { if (code === 'RH') unit = '%'; if (code === 'CO2') unit = 'ppm'; if (code === 'VOC') unit = 'mg/m³'; }
        return `${m.value || 0} ${unit || ''}`.trim(); 
      };

      const statuses = roomMs.map(m => m.status_flag);
      let overallStatus = 'stable';
      if (statuses.includes('review')) overallStatus = 'review';
      else if (statuses.includes('risk')) overallStatus = 'risk';
      else if (statuses.includes('measured')) overallStatus = 'measured';
      
      const criticalM = roomMs.find(m => m.status_flag === overallStatus) || roomMs[0];
      const targetZoneCode = room.room_code.toLowerCase();
      
      const activeSensors = [];
      if(getVal('RH') !== '--') activeSensors.push('RH');
      if(getVal('CO2') !== '--') activeSensors.push('CO₂');
      if(getVal('VOC') !== '--') activeSensors.push('VOC');
      let monitoringText = activeSensors.length > 0 ? `Active Sensors: ${activeSensors.join(', ')} · 30s interval` : `No active telemetry nodes linked.`;

      zones[targetZoneCode] = { 
        id: room.id,
        title: room.room_name_current,
        code: targetZoneCode,
        rh: getVal('RH'), 
        tvoc: getVal('VOC'), 
        co2: getVal('CO2'), 
        status: overallStatus,
        badge: overallStatus === 'risk' ? 'At Risk' : overallStatus === 'review' ? 'Review Required' : overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1),
        notes: room.notes || 'No active analyst notes for this zone.', 
        monitoring: monitoringText
      };
    });
    return zones;
  };

  const renderDashboard = (data) => {
    if (!data.building) return;
    const assetName = `${data.currentProject?.project_code || 'PRJ-000'} — ${data.building.address_line_1}`;
    if (DOM.desktopSidebarAsset) DOM.desktopSidebarAsset.textContent = assetName;
    if (DOM.desktopHeaderAsset) DOM.desktopHeaderAsset.textContent = assetName;
    if (DOM.headerSysText) DOM.headerSysText.textContent = data.building.status || 'Pending';
    
    const state = data.building.state || 'WA';
    const climateText = state === 'WA' ? 'Zone 5 — Warm Temperate' : 'Zone 6 — Mild Temperate';
    if (DOM.headerClimateText) DOM.headerClimateText.textContent = climateText;
    if (DOM.sidebarMeta) DOM.sidebarMeta.textContent = climateText;

    activeZonesData = processZoneData(data.rooms, data.measurements);
    const zoneKeys = Object.keys(activeZonesData);
    if (DOM.zonesCountLabel) DOM.zonesCountLabel.textContent = `Zones · ${zoneKeys.length}`;
    
    if (DOM.zonesListContainer) {
      DOM.zonesListContainer.innerHTML = '';
      zoneKeys.forEach(key => {
        const zone = activeZonesData[key];
        const btn = document.createElement('button');
        btn.className = 'jb-zone-row-item';
        btn.setAttribute('data-zone', key);
        btn.innerHTML = `<span class="jb-zone-label">${zone.title}</span><span class="jb-status-badge jb-status-${zone.status}"><span class="jb-badge-dot bg-${zone.status}"></span>${zone.badge}</span>`;
        btn.addEventListener('click', (e) => { e.stopPropagation(); openDiagnosticPanel(key); });
        DOM.zonesListContainer.appendChild(btn);
      });
    }

    // STATIC HOTSPOT MAPPING: Only show hotspots that match a room code in the DB
    DOM.hotspots.forEach(h => { 
      const code = h.getAttribute('data-zone');
      if (!activeZonesData[code]) {
        h.style.display = 'none'; 
      } else {
        h.style.display = 'flex'; 
        const newH = h.cloneNode(true);
        h.parentNode.replaceChild(newH, h);
        newH.addEventListener('click', (e) => { e.stopPropagation(); openDiagnosticPanel(code); });
      }
    });

    toggleSkeletonState(false);
  };

  const clearActiveStates = () => {
    document.querySelectorAll('.jb-hotspot').forEach(el => el.classList.remove('jb-active-node'));
    document.querySelectorAll('.jb-zone-row-item').forEach(el => el.classList.remove('jb-active-node'));
  };

  const openDiagnosticPanel = (zoneId) => {
    clearActiveStates();
    const data = activeZonesData[zoneId];
    if (!data) return;

    DOM.aTitle.textContent = data.title; 
    DOM.aRH.textContent = data.rh; 
    DOM.aTVOC.textContent = data.tvoc;
    DOM.aCO2.textContent = data.co2; 
    DOM.aTxt.textContent = data.badge; 
    DOM.aNotes.textContent = data.notes;
    DOM.aMonitoringText.textContent = data.monitoring;
    
    DOM.aBadge.className = `jb-status-badge jb-status-${data.status}`; 
    DOM.aDot.className = `jb-badge-dot bg-${data.status}`;

    // DYNAMIC ROOM-SPECIFIC IMAGERY
    if (DOM.imageryGrid) {
      const roomImages = globalImages.filter(img => img.room_id === data.id);
      
      DOM.imageryGrid.innerHTML = '';
      if (roomImages.length > 0) {
        roomImages.slice(0, 2).forEach(img => {
          DOM.imageryGrid.innerHTML += `<div class="jb-imagery-box" style="padding:0; overflow:hidden; border:none; background:var(--border);"><img src="${img.file_url}" alt="Diagnostic Image" style="width:100%; height:100%; object-fit:cover;"></div>`;
        });
        if (roomImages.length === 1) DOM.imageryGrid.innerHTML += `<div class="jb-imagery-box"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="width:1.25rem;height:1.25rem;"><path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"></path><circle cx="12" cy="13" r="3"></circle></svg></div>`;
      } else {
        DOM.imageryGrid.innerHTML = `
          <div class="jb-imagery-box"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="width:1.25rem;height:1.25rem;"><path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"></path><circle cx="12" cy="13" r="3"></circle></svg></div>
          <div class="jb-imagery-box"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="width:1.25rem;height:1.25rem;"><path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"></path><circle cx="12" cy="13" r="3"></circle></svg></div>
        `;
      }
    }

    const tHotspot = document.querySelector(`.jb-hotspot[data-zone="${zoneId}"]`);
    const tRow = document.querySelector(`.jb-zone-row-item[data-zone="${zoneId}"]`);
    if (tHotspot) tHotspot.classList.add('jb-active-node');
    if (tRow) { tRow.classList.add('jb-active-node'); tRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    
    DOM.aside.classList.remove('jb-hidden');
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
        const twinData = await fetchTwinData(profile.building_id);
        renderDashboard(twinData);
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

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsDigitalTwin.init);
} else { JoeBuildsDigitalTwin.init(); }
