/**
 * Joe Builds Home Intelligence Platform
 * Unified Digital Twin Controller (v3 - Full Skeleton Loader, Dynamic Climate Header)
 */
const JoeBuildsDigitalTwin = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  let supabase, activeZonesData = {};

  const DOM = {
    opLabel: document.getElementById('jbOperatorLabel'),
    opEmail: document.getElementById('jbOperatorEmail'),
    dropBtn: document.getElementById('jbOperatorDropdown'),
    opMenu: document.getElementById('jbOperatorMenu'),
    logoutBtn: document.getElementById('jbLogoutBtn'),
    
    // Top Context
    desktopSidebarAsset: document.getElementById('desktopSidebarAsset'),
    desktopHeaderAsset: document.getElementById('desktopHeaderAsset'),
    headerClimateText: document.querySelectorAll('.jb-desktop-telemetry .jb-tabular')[1], // Climate Node
    headerSysText: document.querySelectorAll('.jb-desktop-telemetry .jb-tabular')[2],     // System Status Node
    
    // Twin Elements
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
    aNotes: document.getElementById('asideNotes')
  };

  /**
   * SKELETON LOADER ENGINE
   */
  const injectSkeletonCSS = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      .jb-skeleton-block { position: relative; overflow: hidden; background-color: rgba(165, 179, 154, 0.2) !important; color: transparent !important; border-color: transparent !important; pointer-events: none; }
      .jb-skeleton-block::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform: translateX(-100%); background-image: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%); animation: jb-shimmer 1.5s infinite; }
      .jb-skeleton-block * { visibility: hidden !important; }
      @keyframes jb-shimmer { 100% { transform: translateX(100%); } }
    `;
    document.head.appendChild(style);
  };

  const toggleSkeletonState = (isLoading) => {
    const elementsToToggle = [
      DOM.desktopSidebarAsset,
      DOM.desktopHeaderAsset,
      DOM.headerClimateText,
      DOM.headerSysText,
      DOM.zonesCountLabel
    ];

    elementsToToggle.forEach(el => {
      if (!el) return;
      if (isLoading) el.classList.add('jb-skeleton-block');
      else el.classList.remove('jb-skeleton-block');
    });

    // Inject fake "ghost" rows into the side panel while loading
    if (isLoading && DOM.zonesListContainer) {
      DOM.zonesListContainer.innerHTML = `
        <div class="jb-zone-row-item jb-skeleton-block" style="height: 48px; margin-bottom: 1px;"></div>
        <div class="jb-zone-row-item jb-skeleton-block" style="height: 48px; margin-bottom: 1px;"></div>
        <div class="jb-zone-row-item jb-skeleton-block" style="height: 48px; margin-bottom: 1px;"></div>
      `;
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
    document.addEventListener('click', (e) => {
      if (DOM.aside && !DOM.aside.classList.contains('jb-hidden') && !DOM.aside.contains(e.target) && !e.target.closest('.jb-hotspot') && !e.target.closest('.jb-zone-row-item')) {
        DOM.aside.classList.add('jb-hidden'); clearActiveStates();
      }
    });
    if (DOM.closeBtn) DOM.closeBtn.addEventListener('click', () => { DOM.aside.classList.add('jb-hidden'); clearActiveStates(); });
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

  const fetchTwinData = async (buildingId) => {
    const [buildingRes, projectsRes, roomsRes, measurementsRes] = await Promise.all([
      supabase.from('buildings').select('*').eq('id', buildingId).single(),
      supabase.from('projects').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }),
      supabase.from('rooms').select('*').eq('building_id', buildingId),
      supabase.from('measurements').select(`*, measurement_points(zone_code, element_code)`).eq('building_id', buildingId)
    ]);
    return { building: buildingRes.data, currentProject: projectsRes.data?.[0], rooms: roomsRes.data || [], measurements: measurementsRes.data || [] };
  };

  const processZoneData = (rooms, measurements) => {
    const zones = {};
    rooms.forEach(room => {
      const roomMs = measurements.filter(m => m.room_id === room.id);
      const getVal = (code) => { const m = roomMs.find(x => x.measurement_points?.element_code === code); return m ? `${m.value} ${m.unit}` : '--'; };
      const statuses = roomMs.map(m => m.status_flag);
      let overallStatus = 'stable';
      if (statuses.includes('review')) overallStatus = 'review';
      else if (statuses.includes('risk')) overallStatus = 'risk';
      else if (statuses.includes('measured')) overallStatus = 'measured';
      
      const criticalM = roomMs.find(m => m.status_flag === overallStatus) || roomMs[0];
      const targetZoneCode = room.room_code.toLowerCase();
      
      zones[targetZoneCode] = {
        title: room.room_name_current, 
        rh: getVal('RH'), 
        tvoc: getVal('VOC'), 
        co2: getVal('CO2'), 
        status: overallStatus,
        badge: overallStatus === 'risk' ? 'At Risk' : overallStatus === 'review' ? 'Review Required' : overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1),
        notes: criticalM?.client_facing_wording || 'All systems operating within baseline parameters.'
      };
    });
    return zones;
  };

  const renderDashboard = (data) => {
    // 1. Map Header Context & Remove Skeleton
    const assetName = `${data.currentProject?.project_code || 'PRJ-000'} — ${data.building.address_line_1}`;
    if (DOM.desktopSidebarAsset) DOM.desktopSidebarAsset.textContent = assetName;
    if (DOM.desktopHeaderAsset) DOM.desktopHeaderAsset.textContent = assetName;
    
    // Dynamic System Status
    if (DOM.headerSysText) DOM.headerSysText.textContent = data.building.status || 'Pending';
    
    // Dynamic Climate mapping based on state
    if (DOM.headerClimateText) {
      const state = data.building.state || 'WA';
      // Simple lookup, easily expanded later
      DOM.headerClimateText.textContent = state === 'WA' ? 'Zone 5 — Warm Temperate' : 'Zone 6 — Mild Temperate';
    }

    // 2. Map Zone Data
    activeZonesData = processZoneData(data.rooms, data.measurements);
    const zoneKeys = Object.keys(activeZonesData);
    if (DOM.zonesCountLabel) DOM.zonesCountLabel.textContent = `Zones · ${zoneKeys.length}`;
    
    // 3. Render Right-Hand Sidebar
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
    
    // 4. SMART HOTSPOTS: Hide hotspots that do not exist in the database!
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

    // Remove the skeleton loader now that data is painted!
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
    DOM.aTitle.textContent = data.title; DOM.aRH.textContent = data.rh; DOM.aTVOC.textContent = data.tvoc;
    DOM.aCO2.textContent = data.co2; DOM.aTxt.textContent = data.badge; DOM.aNotes.textContent = data.notes;
    DOM.aBadge.className = `jb-status-badge jb-status-${data.status}`; DOM.aDot.className = `jb-badge-dot bg-${data.status}`;
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
