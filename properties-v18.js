/**
 * Joe Builds Home Intelligence Platform
 * Properties Registry Controller (v18 - Anti-Cache & Bulletproof Error Handling)
 */
console.log("JB Properties Controller v18 initializing...");

const JoeBuildsProperties = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  let supabase, currentBuildingContext = null;
  let currentBuildingRooms = [];
  
  let DOM = {};

  const toggleSkeletonState = (isLoading) => {
    try {
      const elementsToToggle = [DOM.sidebarAssetTitle, DOM.detailEyebrow, DOM.detailTitle, DOM.detailAddress, DOM.detailStatus];
      elementsToToggle.forEach(el => { if (el) { if (isLoading) el.classList.add('jb-skeleton-block'); else el.classList.remove('jb-skeleton-block'); }});
      if (isLoading && DOM.propertyGrid && DOM.views && DOM.views.registry && !DOM.views.registry.classList.contains('jb-hidden')) {
        DOM.propertyGrid.innerHTML = `<div class="property-card jb-skeleton-block" style="height: 180px;"></div><div class="property-card jb-skeleton-block" style="height: 180px;"></div>`;
      }
    } catch(err) { console.error("Skeleton error:", err); }
  };

  const authenticateOperator = async () => {
    const member = await window.$memberstackDom.getCurrentMember();
    if (!member || !member.data) { window.location.href = '/login'; return null; }
    const { data: profile, error } = await supabase.from('profiles').select('id, role').eq('memberstack_id', member.data.id).single();
    if (error || !profile) { window.location.href = '/login'; return null; }
    if (profile.role === 'client' || profile.role === 'demo') { window.location.href = '/dashboard'; return null; }
    if (DOM.opLabel) DOM.opLabel.textContent = member.data.customFields?.first_name || 'Operator';
    if (DOM.opEmail) DOM.opEmail.textContent = `Logged in as: ${member.data.auth.email.toLowerCase()}`;
    return profile;
  };

  const switchView = (viewName) => {
    if(!DOM.views) return;
    Object.values(DOM.views).forEach(el => { if(el) el.classList.add('jb-hidden'); });
    if(DOM.views[viewName]) DOM.views[viewName].classList.remove('jb-hidden');
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (viewName === 'registry' || viewName === 'newForm') {
      if(DOM.sidebarAssetTitle) DOM.sidebarAssetTitle.textContent = "Project Registry View";
      if(DOM.headerTelemetry) DOM.headerTelemetry.innerHTML = `<div class="telemetry-node"><span class="eyebrow text-muted-foreground">SCOPE</span><span class="tabular">All Managed Assets</span></div>`;
    }
  };

  const updateDatalist = (id, items, defaults) => {
    const dl = document.getElementById(id);
    if(dl) {
      const combined = [...new Set([...defaults, ...items])].filter(Boolean);
      dl.innerHTML = combined.map(i => `<option value="${i}">`).join('');
    }
  };

  const handleNewPropertySubmit = async () => {
    if(DOM.btnSubmitProperty) { DOM.btnSubmitProperty.textContent = 'Saving...'; DOM.btnSubmitProperty.disabled = true; }
    const payload = { 
      building_code: document.getElementById('input-building-code').value, 
      address_line_1: document.getElementById('input-address').value, 
      state: document.getElementById('input-state').value, 
      status: document.getElementById('input-status').value,
      property_type: document.getElementById('input-property-type').value
    };

    const { data, error } = await supabase.from('buildings').insert(payload).select().single();
    if(DOM.btnSubmitProperty) { DOM.btnSubmitProperty.textContent = 'Register Property'; DOM.btnSubmitProperty.disabled = false; }
    
    if(!error) {
      document.getElementById('form-new-property').reset();
      currentBuildingContext = null;
      switchView('registry');
      await fetchAndRenderBuildings();
    } else { alert("Error creating property: " + error.message); }
  };

  const openEditPropertyModal = () => {
    if(!currentBuildingContext) return;
    document.getElementById('edit-building-code').value = currentBuildingContext.building_code || '';
    document.getElementById('edit-address').value = currentBuildingContext.address_line_1 || '';
    document.getElementById('edit-state').value = currentBuildingContext.state || '';
    document.getElementById('edit-status').value = currentBuildingContext.status || '';
    document.getElementById('edit-property-type').value = currentBuildingContext.property_type || '';
    if(DOM.modalEditProperty) DOM.modalEditProperty.classList.remove('jb-hidden');
  };

  const handleSaveProperty = async () => {
    if(!currentBuildingContext) return;
    if(DOM.btnSaveProperty) { DOM.btnSaveProperty.textContent = 'Saving...'; DOM.btnSaveProperty.disabled = true; }
    
    const payload = { 
      building_code: document.getElementById('edit-building-code').value, 
      address_line_1: document.getElementById('edit-address').value, 
      state: document.getElementById('edit-state').value, 
      status: document.getElementById('edit-status').value,
      property_type: document.getElementById('edit-property-type').value
    };

    const { error } = await supabase.from('buildings').update(payload).eq('id', currentBuildingContext.id);
    if(DOM.btnSaveProperty) { DOM.btnSaveProperty.textContent = 'Save Changes'; DOM.btnSaveProperty.disabled = false; }
    if(DOM.modalEditProperty) DOM.modalEditProperty.classList.add('jb-hidden');
    
    if(!error) { 
      currentBuildingContext = { ...currentBuildingContext, ...payload }; 
      openPropertyDetail(currentBuildingContext); 
      supabase.from('buildings').select('*').then(({data}) => {
        if(data) {
          updateDatalist('state-options', data.map(b => b.state), ['WA', 'VIC', 'NSW']);
          updateDatalist('status-options', data.map(b => b.status), ['Baseline Pending', 'Monitoring', 'Calibrated']);
          updateDatalist('type-options', data.map(b => b.property_type), ['Residential', 'Commercial', 'Passive House']);
        }
      });
    }
  };

  const bindMapClick = () => {
    if (!DOM.mapContainer) return;
    DOM.mapContainer.addEventListener('click', (e) => {
      const rect = DOM.mapContainer.getBoundingClientRect();
      let x = ((e.clientX - rect.left) / rect.width) * 100;
      let y = ((e.clientY - rect.top) / rect.height) * 100;
      x = Math.round(x * 10) / 10; y = Math.round(y * 10) / 10;

      document.getElementById('edit-room-x').value = x;
      document.getElementById('edit-room-y').value = y;
      if (DOM.mapCoordsText) DOM.mapCoordsText.textContent = `Node set at: X ${x}%, Y ${y}%`;

      let activePin = document.getElementById('modal-active-pin');
      if (!activePin) {
        activePin = document.createElement('div'); activePin.id = 'modal-active-pin';
        activePin.className = 'modal-map-pin active'; DOM.mapPins.appendChild(activePin);
      }
      activePin.style.left = `${x}%`; activePin.style.top = `${y}%`;
    });
  };

  const openRoomModal = (id = null, code = '', name = '', x = '', y = '') => {
    if(DOM.roomModalTitle) DOM.roomModalTitle.textContent = id ? "Edit Node" : "Add Node";
    document.getElementById('edit-room-id').value = id || '';
    document.getElementById('edit-room-code').value = code;
    document.getElementById('edit-room-name').value = name;
    document.getElementById('edit-room-x').value = x || '';
    document.getElementById('edit-room-y').value = y || '';
    if (DOM.mapCoordsText) DOM.mapCoordsText.textContent = (x && y) ? `Node set at: X ${x}%, Y ${y}%` : "Click map to set location";

    if (DOM.mapPins) {
      DOM.mapPins.innerHTML = '';
      currentBuildingRooms.forEach(r => {
        if (r.id === id) return; 
        if (r.map_x != null && r.map_y != null) {
          const pin = document.createElement('div'); pin.className = 'modal-map-pin existing';
          pin.style.left = `${r.map_x}%`; pin.style.top = `${r.map_y}%`; pin.title = r.room_name_current;
          DOM.mapPins.appendChild(pin);
        }
      });
      if (x && y) {
        const activePin = document.createElement('div'); activePin.id = 'modal-active-pin';
        activePin.className = 'modal-map-pin active'; activePin.style.left = `${x}%`; activePin.style.top = `${y}%`;
        DOM.mapPins.appendChild(activePin);
      }
    }
    if(DOM.modalRoomManage) DOM.modalRoomManage.classList.remove('jb-hidden');
  };

  const handleSaveRoom = async () => {
    if(!currentBuildingContext) return;
    if(DOM.btnSaveRoom) { DOM.btnSaveRoom.textContent = 'Saving...'; DOM.btnSaveRoom.disabled = true; }

    const roomId = document.getElementById('edit-room-id')?.value;
    const xVal = document.getElementById('edit-room-x')?.value;
    const yVal = document.getElementById('edit-room-y')?.value;
    
    const payload = { 
      room_code: document.getElementById('edit-room-code')?.value, 
      room_name_current: document.getElementById('edit-room-name')?.value,
      map_x: (xVal === '' || !xVal) ? null : Number(xVal),
      map_y: (yVal === '' || !yVal) ? null : Number(yVal)
    };

    if (roomId) {
      await supabase.from('rooms').update(payload).eq('id', roomId);
    } else {
      const { data: newRoom } = await supabase.from('rooms').insert({ building_id: currentBuildingContext.id, ...payload }).select().single();
      if (newRoom) {
        const { data: pts } = await supabase.from('measurement_points').insert([
          { building_id: currentBuildingContext.id, room_id: newRoom.id, element_code: 'RH' },
          { building_id: currentBuildingContext.id, room_id: newRoom.id, element_code: 'CO2' },
          { building_id: currentBuildingContext.id, room_id: newRoom.id, element_code: 'VOC' }
        ]).select();
        if (pts) {
          const mInserts = pts.map(pt => ({ building_id: currentBuildingContext.id, measurement_point_id: pt.id, room_id: newRoom.id, status_flag: 'unknown', value: 0 }));
          await supabase.from('measurements').insert(mInserts);
        }
      }
    }
    if(DOM.btnSaveRoom) { DOM.btnSaveRoom.textContent = 'Save Node'; DOM.btnSaveRoom.disabled = false; }
    if(DOM.modalRoomManage) DOM.modalRoomManage.classList.add('jb-hidden');
    await fetchBuildingDetails(currentBuildingContext.id); 
  };

  const bindUIEvents = () => {
    if (DOM.dropBtn && DOM.opMenu) {
      DOM.dropBtn.addEventListener('click', (e) => { e.stopPropagation(); DOM.dropBtn.setAttribute('aria-expanded', !(DOM.dropBtn.getAttribute('aria-expanded') === 'true')); DOM.opMenu.classList.toggle('jb-hidden'); });
      document.addEventListener('click', () => { DOM.dropBtn.setAttribute('aria-expanded', 'false'); DOM.opMenu.classList.add('jb-hidden'); });
    }
    if(DOM.logoutBtn) DOM.logoutBtn.addEventListener('click', async () => { try { await window.$memberstackDom.logout(); window.location.href = '/login'; } catch (err) {} });
    
    document.getElementById('btn-create-new')?.addEventListener('click', () => switchView('newForm'));
    document.querySelectorAll('.btn-back').forEach(btn => { btn.addEventListener('click', () => { currentBuildingContext = null; switchView('registry'); fetchAndRenderBuildings(); }); });
    
    if(DOM.formNewProperty) DOM.formNewProperty.addEventListener('submit', async (e) => { e.preventDefault(); await handleNewPropertySubmit(); });

    if(DOM.btnOpenEditProperty) DOM.btnOpenEditProperty.addEventListener('click', openEditPropertyModal);
    if(DOM.closeEditProperty) DOM.closeEditProperty.addEventListener('click', () => { if(DOM.modalEditProperty) DOM.modalEditProperty.classList.add('jb-hidden'); });
    if(DOM.formEditProperty) DOM.formEditProperty.addEventListener('submit', async (e) => { e.preventDefault(); await handleSaveProperty(); });
    
    if(DOM.btnOpenAddRoom) DOM.btnOpenAddRoom.addEventListener('click', () => openRoomModal());
    if(DOM.closeRoomModal) DOM.closeRoomModal.addEventListener('click', () => { if(DOM.modalRoomManage) DOM.modalRoomManage.classList.add('jb-hidden'); });
    if(DOM.formRoomManage) DOM.formRoomManage.addEventListener('submit', async (e) => { e.preventDefault(); await handleSaveRoom(); });

    bindMapClick();
  };

  const fetchAndRenderBuildings = async () => {
    toggleSkeletonState(true);
    try {
      const { data: buildings, error } = await supabase.from('buildings').select('*').order('created_at', { ascending: false });
      
      if (error) throw error;

      if (!buildings || buildings.length === 0) { 
        if(DOM.propertyGrid) DOM.propertyGrid.innerHTML = `<div style="padding:3rem; text-align:center; color:var(--muted-foreground); border: 1px dashed var(--border); font-size:13px;">No properties found. Please create one to initialize the registry.</div>`;
        toggleSkeletonState(false); 
        return; 
      }

      // Dynamic Datalist Population
      updateDatalist('state-options', buildings.map(b => b.state), ['WA', 'VIC', 'NSW']);
      updateDatalist('status-options', buildings.map(b => b.status), ['Baseline Pending', 'Monitoring', 'Calibrated']);
      updateDatalist('type-options', buildings.map(b => b.property_type), ['Residential', 'Commercial', 'Passive House']);
      
      if(DOM.propertyGrid) DOM.propertyGrid.innerHTML = '';
      buildings.forEach(b => {
        const html = `<button class="property-card" data-id="${b.id}"><div class="property-card-header"><div class="eyebrow">${b.building_code || 'N/A'}</div><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground" style="height:.875rem;width:.875rem"><path d="m9 18 6-6-6-6"></path></svg></div><div class="property-card-title">${b.address_line_1 || 'No Address'}</div><div class="property-card-meta"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="height:.75rem;width:.75rem"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx="12" cy="10" r="3"></circle></svg> ${b.suburb || ''} ${b.state || ''}</div><div class="card-stats-grid"><div class="card-stat-block"><div class="eyebrow" style="font-size:8px;margin-bottom:.125rem">Status</div><div class="font-mono tabular" style="font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.status || 'Pending'}</div></div><div class="card-stat-block" style="grid-column: span 2;"><div class="eyebrow" style="font-size:8px;margin-bottom:.125rem">Property Type</div><div class="font-mono tabular" style="font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.property_type || '-'}</div></div></div></button>`;
        if(DOM.propertyGrid) DOM.propertyGrid.insertAdjacentHTML('beforeend', html);
      });

      document.querySelectorAll('.property-card[data-id]').forEach(card => {
        card.addEventListener('click', () => { 
          const bData = buildings.find(x => x.id === card.getAttribute('data-id')); 
          if (bData) openPropertyDetail(bData); 
        });
      });
    } catch (err) {
      console.error(err);
      if(DOM.propertyGrid) DOM.propertyGrid.innerHTML = `<div style="padding:3rem; text-align:center; color:var(--status-review); border: 1px dashed var(--border); font-size:13px;">Error loading properties: ${err.message}</div>`;
    }
    toggleSkeletonState(false);
  };

  const openPropertyDetail = async (building) => {
    currentBuildingContext = building; switchView('detail'); toggleSkeletonState(true);
    if(DOM.detailEyebrow) DOM.detailEyebrow.textContent = `Asset · ${building.building_code || building.id.substring(0,8)}`;
    if(DOM.detailTitle) DOM.detailTitle.textContent = building.address_line_1;
    if(DOM.detailAddress) DOM.detailAddress.textContent = `${building.suburb || ''} ${building.state || ''}`;
    if(DOM.detailStatus) DOM.detailStatus.textContent = `Status: ${building.status}`;
    if(DOM.sidebarAssetTitle) DOM.sidebarAssetTitle.textContent = building.building_code || 'Selected Asset';
    if(DOM.headerTelemetry) DOM.headerTelemetry.innerHTML = `<div class="telemetry-node"><span class="eyebrow text-muted-foreground">ASSET</span><span class="tabular">${building.building_code || 'Selected'}</span></div><div class="telemetry-node"><span class="eyebrow text-muted-foreground">SYS</span><span class="tabular">${building.status}</span><span class="pulse-container"><span class="pulse-ping status-dot-stable"></span><span class="pulse-core status-dot-stable"></span></span></div>`;
    await fetchBuildingDetails(building.id); toggleSkeletonState(false);
  };

  const fetchBuildingDetails = async (buildingId) => {
    const [filesRes, roomsRes] = await Promise.all([
      supabase.from('evidence_assets').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }),
      supabase.from('rooms').select('*').eq('building_id', buildingId).order('created_at', { ascending: true })
    ]);

    if (DOM.detailRoomsList) {
      currentBuildingRooms = roomsRes.data || [];
      if (currentBuildingRooms.length === 0) {
        DOM.detailRoomsList.innerHTML = `<div style="border:1px dashed var(--border);background-color:var(--surface);padding:1.5rem;text-align:center;font-family:var(--font-mono);font-size:10px;text-transform:uppercase;color:var(--muted-foreground)">No rooms initialized yet</div>`;
      } else {
        DOM.detailRoomsList.innerHTML = '';
        currentBuildingRooms.forEach(r => {
          const mapData = (r.map_x != null && r.map_y != null) ? `Mapped (${r.map_x}%, ${r.map_y}%)` : `Not Mapped`;
          const html = `
            <div class="archive-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground" style="height:1rem;width:1rem"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              <div class="archive-details">
                <div style="font-size:12.5px;font-weight:500;">${r.room_name_current}</div>
                <div class="font-mono text-muted-foreground" style="margin-top:.125rem;font-size:10px;text-transform:uppercase;letter-spacing:var(--tracking-wider)">Code: ${r.room_code} | ${mapData}</div>
              </div>
              <button class="btn-secondary btn-edit-room" data-id="${r.id}" data-code="${r.room_code}" data-name="${r.room_name_current}" data-x="${r.map_x !== null ? r.map_x : ''}" data-y="${r.map_y !== null ? r.map_y : ''}" style="padding:.5rem .75rem;">Edit</button>
            </div>
          `;
          DOM.detailRoomsList.insertAdjacentHTML('beforeend', html);
        });
        
        document.querySelectorAll('.btn-edit-room').forEach(btn => {
          btn.addEventListener('click', (e) => {
            openRoomModal(
              e.target.getAttribute('data-id'), 
              e.target.getAttribute('data-code'), 
              e.target.getAttribute('data-name'),
              e.target.getAttribute('data-x'),
              e.target.getAttribute('data-y')
            );
          });
        });
      }
    }
  };

  const init = async () => {
    try {
      console.log("DOM Mapping Initialization...");
      DOM.views = { registry: document.getElementById('view-registry'), newForm: document.getElementById('view-new-property'), detail: document.getElementById('view-property-detail') };
      DOM.opLabel = document.getElementById('jbOperatorLabel'); DOM.opEmail = document.getElementById('jbOperatorEmail'); DOM.dropBtn = document.getElementById('jbOperatorDropdown'); DOM.opMenu = document.getElementById('jbOperatorMenu'); DOM.logoutBtn = document.getElementById('jbLogoutBtn');
      DOM.sidebarAssetTitle = document.getElementById('sidebar-asset-title'); DOM.headerTelemetry = document.getElementById('header-telemetry-cluster');
      DOM.propertyGrid = document.getElementById('propertyGridContainer'); DOM.formNewProperty = document.getElementById('form-new-property'); DOM.btnSubmitProperty = document.getElementById('btn-submit-property');
      DOM.detailEyebrow = document.getElementById('detail-eyebrow'); DOM.detailTitle = document.getElementById('detail-title'); DOM.detailAddress = document.getElementById('detail-address'); DOM.detailStatus = document.getElementById('detail-status');
      DOM.detailRoomsList = document.getElementById('detail-rooms-list');
      DOM.btnOpenEditProperty = document.getElementById('btnOpenEditProperty'); DOM.modalEditProperty = document.getElementById('modalEditProperty'); DOM.closeEditProperty = document.getElementById('closeEditProperty'); DOM.formEditProperty = document.getElementById('formEditProperty'); DOM.btnSaveProperty = document.getElementById('btnSaveProperty');
      DOM.btnOpenAddRoom = document.getElementById('btnOpenAddRoom'); DOM.modalRoomManage = document.getElementById('modalRoomManage'); DOM.closeRoomModal = document.getElementById('closeRoomModal'); DOM.formRoomManage = document.getElementById('formRoomManage'); DOM.btnSaveRoom = document.getElementById('btnSaveRoom'); DOM.roomModalTitle = document.getElementById('roomModalTitle');
      DOM.mapContainer = document.getElementById('modal-map-container'); DOM.mapPins = document.getElementById('modal-map-pins'); DOM.mapCoordsText = document.getElementById('modal-map-coords');

      if (!DOM.propertyGrid) {
        console.error("CRITICAL: propertyGridContainer element is missing from HTML.");
        document.body.insertAdjacentHTML('afterbegin', '<div style="background:red;color:white;padding:1rem;text-align:center;z-index:99999;position:relative;">Critical Error: HTML container missing. Please ensure HTML matches latest version.</div>');
        return;
      }

      bindUIEvents();
      
      if (!window.supabase) {
        console.error("Supabase script not loaded.");
        return;
      }

      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      const profile = await authenticateOperator(); 
      if (profile) await fetchAndRenderBuildings(); 
    } catch (error) { 
      console.error("Init Error:", error);
      window.location.href = '/login'; 
    }
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsProperties.init);
} else { JoeBuildsProperties.init(); }
