/**
 * Joe Builds Home Intelligence Platform
 * Properties Registry Controller (v8 - Edit Property & Room Management)
 */
const JoeBuildsProperties = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  let supabase, currentBuildingContext = null;

  const DOM = {
    opLabel: document.getElementById('jbOperatorLabel'),
    opEmail: document.getElementById('jbOperatorEmail'),
    dropBtn: document.getElementById('jbOperatorDropdown'),
    opMenu: document.getElementById('jbOperatorMenu'),
    logoutBtn: document.getElementById('jbLogoutBtn'),
    
    views: { 
      registry: document.getElementById('view-registry'), 
      newForm: document.getElementById('view-new-property'), 
      detail: document.getElementById('view-property-detail') 
    },
    
    sidebarAssetTitle: document.getElementById('sidebar-asset-title'),
    headerTelemetry: document.getElementById('header-telemetry-cluster'),
    propertyGrid: document.getElementById('propertyGridContainer'),
    
    // Create Forms
    formNewProperty: document.getElementById('form-new-property'),
    btnSubmitProperty: document.getElementById('btn-submit-property'),
    
    // Detail View Elements
    detailEyebrow: document.getElementById('detail-eyebrow'),
    detailTitle: document.getElementById('detail-title'),
    detailAddress: document.getElementById('detail-address'),
    detailStatus: document.getElementById('detail-status'),
    
    detailFilesList: document.getElementById('detail-files-list'),
    detailFilesCount: document.getElementById('detail-files-count'),
    fileInput: document.getElementById('file-upload-input'),
    uploadStatusText: document.getElementById('upload-status-text'),
    
    detailRoomsList: document.getElementById('detail-rooms-list'),

    // Edit Property Modal
    btnOpenEditProperty: document.getElementById('btnOpenEditProperty'),
    modalEditProperty: document.getElementById('modalEditProperty'),
    closeEditProperty: document.getElementById('closeEditProperty'),
    formEditProperty: document.getElementById('formEditProperty'),
    btnSaveProperty: document.getElementById('btnSaveProperty'),

    // Room Modal
    btnOpenAddRoom: document.getElementById('btnOpenAddRoom'),
    modalRoomManage: document.getElementById('modalRoomManage'),
    closeRoomModal: document.getElementById('closeRoomModal'),
    formRoomManage: document.getElementById('formRoomManage'),
    btnSaveRoom: document.getElementById('btnSaveRoom'),
    roomModalTitle: document.getElementById('roomModalTitle')
  };

  const injectSkeletonCSS = () => {
    if(document.getElementById('jb-skeleton-css')) return;
    const style = document.createElement('style');
    style.id = 'jb-skeleton-css';
    style.innerHTML = `.jb-skeleton-block { position: relative; overflow: hidden; background-color: rgba(165, 179, 154, 0.2) !important; color: transparent !important; border-color: transparent !important; pointer-events: none; border-radius: 4px; } .jb-skeleton-block::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform: translateX(-100%); background-image: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%); animation: jb-shimmer 1.5s infinite; } .jb-skeleton-block * { visibility: hidden !important; } @keyframes jb-shimmer { 100% { transform: translateX(100%); } }`;
    document.head.appendChild(style);
  };

  const toggleSkeletonState = (isLoading) => {
    const elementsToToggle = [DOM.sidebarAssetTitle, DOM.detailEyebrow, DOM.detailTitle, DOM.detailAddress, DOM.detailStatus];
    elementsToToggle.forEach(el => { if (!el) return; if (isLoading) el.classList.add('jb-skeleton-block'); else el.classList.remove('jb-skeleton-block'); });
    if (isLoading && DOM.propertyGrid && !DOM.views.detail.classList.contains('jb-hidden') && !DOM.views.newForm.classList.contains('jb-hidden') === false) {
      DOM.propertyGrid.innerHTML = `<div class="property-card jb-skeleton-block" style="height: 180px;"></div><div class="property-card jb-skeleton-block" style="height: 180px;"></div>`;
    }
  };

  const authenticateOperator = async () => {
    const member = await window.$memberstackDom.getCurrentMember();
    if (!member || !member.data) { window.location.href = '/login'; return null; }
    const { data: profile } = await supabase.from('profiles').select('id, role').eq('memberstack_id', member.data.id).single();
    if (!profile) { window.location.href = '/login'; return null; }
    
    if (profile.role === 'client' || profile.role === 'demo') { window.location.href = '/dashboard'; return null; }
    
    if (DOM.opLabel) DOM.opLabel.textContent = member.data.customFields?.first_name || 'Operator';
    if (DOM.opEmail) DOM.opEmail.textContent = `Role: ${profile.role.toUpperCase()}`;
    
    document.querySelectorAll('a[href="/properties"], a[href="/admin"]').forEach(el => { el.style.display = 'flex'; el.classList.remove('jb-hidden'); });
    const hideStyle = document.getElementById('rbac-hide-admin'); if (hideStyle) hideStyle.remove();
    return profile;
  };

  const switchView = (viewName) => {
    Object.values(DOM.views).forEach(el => { if(el) el.classList.add('jb-hidden'); });
    if(DOM.views[viewName]) DOM.views[viewName].classList.remove('jb-hidden');
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (viewName === 'registry' || viewName === 'newForm') {
      if(DOM.sidebarAssetTitle) DOM.sidebarAssetTitle.textContent = "Project Registry View";
      if(DOM.headerTelemetry) DOM.headerTelemetry.innerHTML = `<div class="telemetry-node"><span class="eyebrow text-muted-foreground">SCOPE</span><span class="tabular">All Managed Assets</span></div>`;
    }
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
    if(DOM.fileInput) DOM.fileInput.addEventListener('change', handleFileUpload);

    // Bind Edit Property Modal
    if(DOM.btnOpenEditProperty) DOM.btnOpenEditProperty.addEventListener('click', openEditPropertyModal);
    if(DOM.closeEditProperty) DOM.closeEditProperty.addEventListener('click', () => DOM.modalEditProperty.classList.add('jb-hidden'));
    if(DOM.formEditProperty) DOM.formEditProperty.addEventListener('submit', async (e) => { e.preventDefault(); await handleSaveProperty(); });
    
    // Bind Add Room Modal
    if(DOM.btnOpenAddRoom) DOM.btnOpenAddRoom.addEventListener('click', () => openRoomModal());
    if(DOM.closeRoomModal) DOM.closeRoomModal.addEventListener('click', () => DOM.modalRoomManage.classList.add('jb-hidden'));
    if(DOM.formRoomManage) DOM.formRoomManage.addEventListener('submit', async (e) => { e.preventDefault(); await handleSaveRoom(); });
  };

  const fetchAndRenderBuildings = async () => {
    toggleSkeletonState(true);
    const { data: buildings } = await supabase.from('buildings').select('*').order('created_at', { ascending: false });
    if (!buildings) return;
    DOM.propertyGrid.innerHTML = '';
    buildings.forEach(b => {
      const html = `<button class="property-card" data-id="${b.id}"><div class="property-card-header"><div class="eyebrow">${b.building_code || 'N/A'}</div><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground" style="height:.875rem;width:.875rem"><path d="m9 18 6-6-6-6"></path></svg></div><div class="property-card-title">${b.address_line_1}</div><div class="property-card-meta"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="height:.75rem;width:.75rem"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx="12" cy="10" r="3"></circle></svg> ${b.suburb || ''} ${b.state || ''}</div><div class="card-stats-grid"><div class="card-stat-block"><div class="eyebrow" style="font-size:8px;margin-bottom:.125rem">Status</div><div class="font-mono tabular" style="font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.status || 'Pending'}</div></div><div class="card-stat-block" style="grid-column: span 2;"><div class="eyebrow" style="font-size:8px;margin-bottom:.125rem">Property Type</div><div class="font-mono tabular" style="font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.property_type || '-'}</div></div></div></button>`;
      DOM.propertyGrid.insertAdjacentHTML('beforeend', html);
    });
    document.querySelectorAll('.property-card[data-id]').forEach(card => {
      card.addEventListener('click', () => { const bData = buildings.find(x => x.id === card.getAttribute('data-id')); if (bData) openPropertyDetail(bData); });
    });
    toggleSkeletonState(false);
  };

  const handleNewPropertySubmit = async () => {
    DOM.btnSubmitProperty.textContent = "Registering..."; DOM.btnSubmitProperty.disabled = true;
    const bCode = document.getElementById('input-building-code').value; 
    const address = document.getElementById('input-address').value; 
    const state = document.getElementById('input-state').value; 
    const status = document.getElementById('input-status').value;
    const { error } = await supabase.from('buildings').insert([{ building_code: bCode, address_line_1: address, state: state, status: status }]);
    DOM.btnSubmitProperty.textContent = "Register Property"; DOM.btnSubmitProperty.disabled = false;
    if (!error) { DOM.formNewProperty.reset(); switchView('registry'); fetchAndRenderBuildings(); }
  };

  const openPropertyDetail = async (building) => {
    currentBuildingContext = building;
    switchView('detail'); toggleSkeletonState(true);
    
    if(DOM.detailEyebrow) DOM.detailEyebrow.textContent = `Asset · ${building.building_code || building.id.substring(0,8)}`;
    if(DOM.detailTitle) DOM.detailTitle.textContent = building.address_line_1;
    if(DOM.detailAddress) DOM.detailAddress.textContent = `${building.suburb || ''} ${building.state || ''}`;
    if(DOM.detailStatus) DOM.detailStatus.textContent = `Status: ${building.status}`;
    if(DOM.sidebarAssetTitle) DOM.sidebarAssetTitle.textContent = building.building_code || 'Selected Asset';
    
    if(DOM.headerTelemetry) {
      DOM.headerTelemetry.innerHTML = `<div class="telemetry-node"><span class="eyebrow text-muted-foreground">ASSET</span><span class="tabular">${building.building_code || 'Selected'}</span></div><div class="telemetry-node"><span class="eyebrow text-muted-foreground">SYS</span><span class="tabular">${building.status}</span><span class="pulse-container"><span class="pulse-ping status-dot-stable"></span><span class="pulse-core status-dot-stable"></span></span></div>`;
    }
    
    await fetchBuildingDetails(building.id);
    toggleSkeletonState(false);
  };

  const fetchBuildingDetails = async (buildingId) => {
    // Parallel fetch: Evidence Files AND Rooms
    const [filesRes, roomsRes] = await Promise.all([
      supabase.from('evidence_assets').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }),
      supabase.from('rooms').select('*').eq('building_id', buildingId).order('created_at', { ascending: true })
    ]);

    // 1. Render Files
    if (DOM.detailFilesList) {
      const files = filesRes.data || [];
      if (files.length === 0) {
        if(DOM.detailFilesCount) DOM.detailFilesCount.textContent = "0 attached";
        DOM.detailFilesList.innerHTML = `<div style="border:1px dashed var(--border);background-color:var(--surface);padding:1.5rem;text-align:center;font-family:var(--font-mono);font-size:10px;text-transform:uppercase;color:var(--muted-foreground)">No documents attached to this property</div>`;
      } else {
        if(DOM.detailFilesCount) DOM.detailFilesCount.textContent = `${files.length} attached`;
        DOM.detailFilesList.innerHTML = '';
        files.forEach(f => {
          const dateStr = new Date(f.created_at).toISOString().split('T')[0];
          const html = `<div class="archive-item"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground" style="height:1rem;width:1rem"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg><div class="archive-details"><div style="font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.file_name || 'Asset Document'}</div><div class="font-mono text-muted-foreground" style="margin-top:.125rem;font-size:10px;text-transform:uppercase;letter-spacing:var(--tracking-wider)">${dateStr}</div></div><a href="${f.file_url}" target="_blank" class="btn-secondary" style="padding:.5rem .75rem;gap:.375rem; text-decoration:none;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="height:.75rem;width:.75rem"><path d="M12 15V3"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path></svg></a></div>`;
          DOM.detailFilesList.insertAdjacentHTML('beforeend', html);
        });
      }
    }

    // 2. Render Rooms
    if (DOM.detailRoomsList) {
      const rooms = roomsRes.data || [];
      if (rooms.length === 0) {
        DOM.detailRoomsList.innerHTML = `<div style="border:1px dashed var(--border);background-color:var(--surface);padding:1.5rem;text-align:center;font-family:var(--font-mono);font-size:10px;text-transform:uppercase;color:var(--muted-foreground)">No rooms initialized yet</div>`;
      } else {
        DOM.detailRoomsList.innerHTML = '';
        rooms.forEach(r => {
          const html = `
            <div class="archive-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground" style="height:1rem;width:1rem"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              <div class="archive-details">
                <div style="font-size:12.5px;font-weight:500;">${r.room_name_current}</div>
                <div class="font-mono text-muted-foreground" style="margin-top:.125rem;font-size:10px;text-transform:uppercase;letter-spacing:var(--tracking-wider)">Code: ${r.room_code}</div>
              </div>
              <button class="btn-secondary btn-edit-room" data-id="${r.id}" data-code="${r.room_code}" data-name="${r.room_name_current}" style="padding:.5rem .75rem;">Edit</button>
            </div>
          `;
          DOM.detailRoomsList.insertAdjacentHTML('beforeend', html);
        });
        
        // Bind edit buttons
        document.querySelectorAll('.btn-edit-room').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const code = e.target.getAttribute('data-code');
            const name = e.target.getAttribute('data-name');
            openRoomModal(id, code, name);
          });
        });
      }
    }
  };

  const handleFileUpload = async (e) => {
    if (!currentBuildingContext) return;
    const file = e.target.files[0]; if (!file) return;
    if(DOM.uploadStatusText) DOM.uploadStatusText.textContent = `Uploading ${file.name}...`;
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentBuildingContext.id}-${Date.now()}.${fileExt}`;
    const { error: uploadErr } = await supabase.storage.from('property_assets').upload(fileName, file);
    if (uploadErr) { if(DOM.uploadStatusText) DOM.uploadStatusText.textContent = `Upload failed.`; return; }
    const { data: urlData } = supabase.storage.from('property_assets').getPublicUrl(fileName);
    const { error: dbErr } = await supabase.from('evidence_assets').insert([{ building_id: currentBuildingContext.id, file_name: file.name, file_url: urlData.publicUrl }]);
    if(DOM.uploadStatusText) DOM.uploadStatusText.textContent = `Drop or click to upload`; 
    if(DOM.fileInput) DOM.fileInput.value = '';
    if (!dbErr) await fetchBuildingDetails(currentBuildingContext.id);
  };

  // --- EDIT PROPERTY MODAL ---
  const openEditPropertyModal = () => {
    if(!currentBuildingContext) return;
    document.getElementById('edit-building-code').value = currentBuildingContext.building_code || '';
    document.getElementById('edit-address').value = currentBuildingContext.address_line_1 || '';
    document.getElementById('edit-state').value = currentBuildingContext.state || 'WA';
    document.getElementById('edit-status').value = currentBuildingContext.status || 'Baseline Pending';
    DOM.modalEditProperty.classList.remove('jb-hidden');
  };

  const handleSaveProperty = async () => {
    if(!currentBuildingContext) return;
    DOM.btnSaveProperty.textContent = 'Saving...'; DOM.btnSaveProperty.disabled = true;
    
    const payload = {
      building_code: document.getElementById('edit-building-code').value,
      address_line_1: document.getElementById('edit-address').value,
      state: document.getElementById('edit-state').value,
      status: document.getElementById('edit-status').value
    };

    const { error } = await supabase.from('buildings').update(payload).eq('id', currentBuildingContext.id);
    
    DOM.btnSaveProperty.textContent = 'Save Changes'; DOM.btnSaveProperty.disabled = false;
    DOM.modalEditProperty.classList.add('jb-hidden');
    
    if(!error) {
      // Update local context and re-render header
      currentBuildingContext = { ...currentBuildingContext, ...payload };
      openPropertyDetail(currentBuildingContext); 
    }
  };

  // --- ADD/EDIT ROOM MODAL ---
  const openRoomModal = (id = null, code = '', name = '') => {
    DOM.roomModalTitle.textContent = id ? "Edit Room" : "Add Room";
    document.getElementById('edit-room-id').value = id || '';
    document.getElementById('edit-room-code').value = code;
    document.getElementById('edit-room-name').value = name;
    DOM.modalRoomManage.classList.remove('jb-hidden');
  };

  const handleSaveRoom = async () => {
    if(!currentBuildingContext) return;
    DOM.btnSaveRoom.textContent = 'Saving...'; DOM.btnSaveRoom.disabled = true;

    const roomId = document.getElementById('edit-room-id').value;
    const rCode = document.getElementById('edit-room-code').value;
    const rName = document.getElementById('edit-room-name').value;

    if (roomId) {
      // UPDATE EXISTING
      await supabase.from('rooms').update({ room_code: rCode, room_name_current: rName }).eq('id', roomId);
    } else {
      // INSERT NEW
      const { data: newRoom } = await supabase.from('rooms').insert({
        building_id: currentBuildingContext.id,
        room_code: rCode,
        room_name_current: rName
      }).select().single();

      if (newRoom) {
        // Automatically provision sensors for this new room!
        const { data: pts } = await supabase.from('measurement_points').insert([
          { building_id: currentBuildingContext.id, room_id: newRoom.id, element_code: 'RH' },
          { building_id: currentBuildingContext.id, room_id: newRoom.id, element_code: 'CO2' },
          { building_id: currentBuildingContext.id, room_id: newRoom.id, element_code: 'VOC' }
        ]).select();
        
        if (pts) {
          const mInserts = pts.map(pt => ({
            building_id: currentBuildingContext.id,
            measurement_point_id: pt.id,
            room_id: newRoom.id,
            status_flag: 'unknown',
            value: 0
          }));
          await supabase.from('measurements').insert(mInserts);
        }
      }
    }

    DOM.btnSaveRoom.textContent = 'Save Node'; DOM.btnSaveRoom.disabled = false;
    DOM.modalRoomManage.classList.add('jb-hidden');
    await fetchBuildingDetails(currentBuildingContext.id); // Refresh Room List
  };

  const init = async () => {
    injectSkeletonCSS(); bindUIEvents();
    if (!window.supabase) return;
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    try { const profile = await authenticateOperator(); if (profile) await fetchAndRenderBuildings(); } catch (error) { window.location.href = '/login'; }
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsProperties.init);
} else { JoeBuildsProperties.init(); }
