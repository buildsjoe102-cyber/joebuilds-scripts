/**
 * Joe Builds - Admin Controller (v25 - Uncut & Fully Rendered)
 */
console.log("JB Admin Controller v25 initializing...");
const JoeBuildsAdmin = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_xla-awjgU2npKzrWHdYKDQ_2ox0CWmC';
  let supabase, currentBuildingId = null, currentUserRole = null, globalBuildings = [];
  let currentRooms = []; 
  
  let DOM = {}; 

  const showToast = (message, type = 'success') => { const toast = document.createElement('div'); const color = type === 'success' ? 'var(--status-stable, #3A6B48)' : 'var(--status-review, #A64444)'; toast.style.cssText = `position: fixed; bottom: 24px; right: 24px; background: var(--surface, #FFF); color: var(--foreground, #1A241D); border-left: 4px solid ${color}; padding: 12px 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); font-family: var(--font-mono, monospace); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; z-index: 999999; transform: translateX(120%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; gap: 8px;`; const icon = type === 'success' ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>` : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`; toast.innerHTML = `${icon} <span>${message}</span>`; document.body.appendChild(toast); requestAnimationFrame(() => toast.style.transform = 'translateX(0)'); setTimeout(() => { toast.style.transform = 'translateX(120%)'; setTimeout(() => toast.remove(), 300); }, 3000); };
  
  const toggleSkeletonState = (isLoading) => { 
    try {
      const elementsToToggle = [DOM.desktopSidebarAsset, DOM.desktopHeaderAsset, DOM.headerClimateText, DOM.headerSysText, DOM.assetCount, DOM.archiveCount]; 
      elementsToToggle.forEach(el => { if (!el) return; if (isLoading) el.classList.add('jb-skeleton-block'); else el.classList.remove('jb-skeleton-block'); }); 
      if (isLoading && DOM.telemetryContainer) DOM.telemetryContainer.innerHTML = `<div class="card-surface jb-skeleton-block" style="height: 150px;"></div>`; 
    } catch(err) {}
  };

  const initUIEvents = () => {
    if (DOM.assetSelect) { DOM.assetSelect.addEventListener('change', (e) => { currentBuildingId = e.target.value; toggleSkeletonState(true); loadAssetContext(currentBuildingId); }); }
    if (DOM.reportInput) DOM.reportInput.addEventListener('change', handleReportUpload);
    if (DOM.btnInitializeAsset) { DOM.btnInitializeAsset.addEventListener('click', async () => { DOM.btnInitializeAsset.textContent = "Deploying Baseline..."; DOM.btnInitializeAsset.disabled = true; await initializeBuildingData(currentBuildingId); }); }
    if (DOM.btnUserManagement) DOM.btnUserManagement.addEventListener('click', openUsersModal);
    if (DOM.closeUsersModal) DOM.closeUsersModal.addEventListener('click', () => { if(DOM.usersModal) DOM.usersModal.classList.add('jb-hidden'); });
    if (DOM.usersModal) DOM.usersModal.addEventListener('click', (e) => { if (e.target === DOM.usersModal) DOM.usersModal.classList.add('jb-hidden'); });
    
    if (DOM.btnNewAssessment) {
      DOM.btnNewAssessment.addEventListener('click', async () => {
         if(!currentBuildingId) return;
         DOM.btnNewAssessment.textContent = "Adding..."; DOM.btnNewAssessment.disabled = true;
         await supabase.from('assessment_sessions').insert([{ building_id: currentBuildingId, assessment_type: 'Home Performance Baseline', status: 'Scheduled' }]);
         showToast('Session created'); 
         await loadAssetContext(currentBuildingId);
         DOM.btnNewAssessment.textContent = "+ Add Session"; DOM.btnNewAssessment.disabled = false;
      });
    }
    
    if (DOM.btnNewIssue) {
      DOM.btnNewIssue.addEventListener('click', async () => {
         if(!currentBuildingId) return;
         DOM.btnNewIssue.textContent = "Adding..."; DOM.btnNewIssue.disabled = true;
         await supabase.from('issues_findings').insert([{ building_id: currentBuildingId, issue_type: 'New Diagnostic Finding', status: 'Monitor' }]);
         showToast('Finding created'); 
         await loadAssetContext(currentBuildingId);
         DOM.btnNewIssue.textContent = "+ Log Finding"; DOM.btnNewIssue.disabled = false;
      });
    }
  };

  const authenticateAdmin = async () => {
    const member = await window.$memberstackDom.getCurrentMember(); if (!member || !member.data) { window.location.href = '/login'; return null; }
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('memberstack_id', member.data.id).single();
    if (error || !profile) { window.location.href = '/login'; return null; }
    currentUserRole = profile.role || 'client'; if (currentUserRole === 'client' || currentUserRole === 'demo' || currentUserRole === 'suspended') { window.location.href = '/dashboard'; return null; }
    if ((currentUserRole === 'admin' || currentUserRole === 'operator') && DOM.btnUserManagement) { DOM.btnUserManagement.classList.remove('jb-hidden'); }
    return profile;
  };

  const loadGlobalAssets = async () => {
    const { data: buildings, error } = await supabase.from('buildings').select('id, building_code, address_line_1').order('created_at', { ascending: false });
    if (error || !buildings || buildings.length === 0) { if(DOM.assetCount) DOM.assetCount.textContent = `0 managed records`; if(DOM.assetSelect) DOM.assetSelect.innerHTML = `<option>No properties found</option>`; toggleSkeletonState(false); return; }
    globalBuildings = buildings; if(DOM.assetCount) DOM.assetCount.textContent = `${buildings.length} managed records`; if(DOM.assetSelect) DOM.assetSelect.innerHTML = '';
    buildings.forEach(b => { const opt = document.createElement('option'); opt.value = b.id; opt.textContent = `${b.building_code || 'PRJ'} — ${b.address_line_1}`; if(DOM.assetSelect) DOM.assetSelect.appendChild(opt); });
    currentBuildingId = buildings[0].id; loadAssetContext(currentBuildingId); 
  };

  const loadAssetContext = async (buildingId) => {
    try {
      const [buildingRes, measurementsRes, roomsRes, scenariosRes, reportsRes, sessRes, issuesRes] = await Promise.all([ 
        supabase.from('buildings').select('*').eq('id', buildingId).single(),
        supabase.from('measurements').select(`*, measurement_points(*)`).eq('building_id', buildingId), 
        supabase.from('rooms').select('*').eq('building_id', buildingId).order('created_at', { ascending: true }), 
        supabase.from('upgrade_scenarios').select('*').eq('building_id', buildingId).order('step_number', { ascending: true }), 
        supabase.from('reports').select('id').eq('building_id', buildingId),
        supabase.from('assessment_sessions').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }),
        supabase.from('issues_findings').select('*').eq('building_id', buildingId).order('created_at', { ascending: false })
      ]);
      
      const bData = buildingRes.data; 
      const mData = measurementsRes.data || []; currentRooms = roomsRes.data || []; const sData = scenariosRes.data || []; const repData = reportsRes.data || [];
      const sessData = sessRes.data || []; const issueData = issuesRes.data || [];
      
      if (bData) {
        const bTitle = `${bData.building_code || 'PRJ'} — ${bData.address_line_1}`;
        if(DOM.desktopSidebarAsset) DOM.desktopSidebarAsset.textContent = bTitle; 
        if(DOM.desktopHeaderAsset) DOM.desktopHeaderAsset.textContent = bTitle;
        if(DOM.headerSysText) DOM.headerSysText.textContent = bData.status || 'Pending';
        if(DOM.headerClimateText) DOM.headerClimateText.textContent = bData.state === 'WA' ? 'Zone 5 — Warm Temperate' : 'Zone 6 — Mild Temperate';
      }

      if(DOM.archiveCount) DOM.archiveCount.textContent = `Archive currently holds ${repData.length} reports.`;
      
      if (DOM.uploadTargetRoom) { 
        DOM.uploadTargetRoom.innerHTML = '<option value="">Entire Building (General Report)</option>'; 
        currentRooms.forEach(r => { const opt = document.createElement('option'); opt.value = r.id; opt.textContent = r.room_name_current; DOM.uploadTargetRoom.appendChild(opt); }); 
      }
      
      if (mData.length === 0 && sData.length === 0 && sessData.length === 0) { 
        if(DOM.editorsWrap) DOM.editorsWrap.classList.add('jb-hidden'); if(DOM.emptyStateContainer) DOM.emptyStateContainer.classList.remove('jb-hidden'); 
      } else { 
        if(DOM.emptyStateContainer) DOM.emptyStateContainer.classList.add('jb-hidden'); if(DOM.editorsWrap) DOM.editorsWrap.classList.remove('jb-hidden'); 
        
        // Render all the internal cards
        renderAssessments(sessData); 
        renderIssues(issueData);
        renderTelemetryEditor(mData); 
        renderTwinEditor(currentRooms, mData); 
        renderPathwayEditor(sData); 
      }
    } catch(err) { console.error("Error loading context:", err); }
    toggleSkeletonState(false);
  };

  const initializeBuildingData = async (bId) => {
    try {
      await supabase.from('upgrade_scenarios').insert([
        {building_id: bId, step_number: 1, phase: 1, phase_name: 'Measure', title: 'Home Performance Baseline', status: 'completed'},
        {building_id: bId, step_number: 2, phase: 1, phase_name: 'Measure', title: 'Internal Environment Baseline', status: 'completed'},
        {building_id: bId, step_number: 3, phase: 2, phase_name: 'Understand', title: 'Moisture + Thermal Walkthrough', status: 'in-progress'},
        {building_id: bId, step_number: 4, phase: 2, phase_name: 'Understand', title: 'Room-Level Risk Review', status: 'locked'},
        {building_id: bId, step_number: 5, phase: 2, phase_name: 'Understand', title: 'Triggered Investigation', status: 'locked'},
        {building_id: bId, step_number: 6, phase: 3, phase_name: 'Control', title: 'Controlled Upgrade Pathway', status: 'locked'},
        {building_id: bId, step_number: 7, phase: 3, phase_name: 'Control', title: 'Verification / Retest', status: 'locked'},
        {building_id: bId, step_number: 8, phase: 3, phase_name: 'Control', title: 'Home Stability Report', status: 'locked'}
      ]);
      const {data: rooms} = await supabase.from('rooms').insert([
        {building_id: bId, room_code: 'primary', room_name_current: 'Primary Suite'}, {building_id: bId, room_code: 'kitchen', room_name_current: 'Kitchen'}, {building_id: bId, room_code: 'plant', room_name_current: 'Plant Room'}, {building_id: bId, room_code: 'subfloor', room_name_current: 'Subfloor Void (E)'}, {building_id: bId, room_code: 'living', room_name_current: 'Living Volume'}
      ]).select();
      const {data: basePts} = await supabase.from('measurement_points').insert([
        {building_id: bId, element_code: 'ENVELOPE'}, {building_id: bId, element_code: 'U-VALUE'}, {building_id: bId, element_code: 'READINESS'}, {building_id: bId, element_code: 'PRIORITY'}, {building_id: bId, element_code: 'ACH50'}, {building_id: bId, element_code: 'ELA'}, {building_id: bId, element_code: 'THERMAL_BRIDGE'}
      ]).select();
      
      await supabase.from('assessment_sessions').insert([{ building_id: bId, assessment_type: 'Home Performance Baseline', status: 'Completed', assessor: 'System Auto-Gen' }]);

      if(rooms) { 
        const rPtsInsert = []; rooms.forEach(r => { rPtsInsert.push({building_id: bId, room_id: r.id, element_code: 'RH'}); rPtsInsert.push({building_id: bId, room_id: r.id, element_code: 'CO2'}); rPtsInsert.push({building_id: bId, room_id: r.id, element_code: 'VOC'}); }); 
        const {data: roomPts} = await supabase.from('measurement_points').insert(rPtsInsert).select(); const allPts = [...(basePts||[]), ...(roomPts||[])]; const mInserts = allPts.map(pt => ({ building_id: bId, measurement_point_id: pt.id, room_id: pt.room_id || null, status_flag: 'unknown', value: 0 })); await supabase.from('measurements').insert(mInserts); 
      }
      if(DOM.btnInitializeAsset) { DOM.btnInitializeAsset.textContent = "Generate Home Performance Baseline"; DOM.btnInitializeAsset.disabled = false; }
      loadAssetContext(bId);
    } catch(err) {}
  };

  const openUsersModal = async () => {
    if(!DOM.usersTableBody || !DOM.usersModal) return; 
    const theadRow = document.querySelector('#usersTableBody').previousElementSibling?.querySelector('tr');
    if(theadRow && theadRow.children.length === 4) { theadRow.children[3].style.width = '40%'; }

    DOM.usersTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 2rem;">Loading security records...</td></tr>`; 
    DOM.usersModal.classList.remove('jb-hidden');
    
    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if(!profiles) { DOM.usersTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Failed to load users.</td></tr>`; return; }
    DOM.usersTableBody.innerHTML = '';
    
    const bOptions = `<option value="">Unassigned (Null)</option>` + globalBuildings.map(b => `<option value="${b.id}">${b.building_code} — ${b.address_line_1.split(',')[0]}</option>`).join('');
    
    profiles.forEach(p => {
      const nameStr = p.first_name || 'User'; 
      const emailStr = p.email || (p.memberstack_id ? p.memberstack_id.substring(0,8) : 'Unknown'); 
      const roleDisabled = currentUserRole !== 'admin' ? 'disabled title="Only Admins can modify roles"' : '';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 500;">${nameStr}</td>
        <td style="color:var(--muted-foreground); font-size:11px;">${emailStr}</td>
        <td>
          <select class="control-select" data-pid="${p.id}" data-mem="${p.memberstack_id}" data-role="${p.role || 'client'}" data-type="role" style="padding: 0.25rem;" ${roleDisabled}>
            <option value="client" ${p.role === 'client' ? 'selected' : ''}>Client</option>
            <option value="demo" ${p.role === 'demo' ? 'selected' : ''}>Demo</option>
            <option value="operator" ${p.role === 'operator' ? 'selected' : ''}>Operator</option>
            <option value="admin" ${p.role === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="suspended" ${p.role === 'suspended' ? 'selected' : ''}>Suspended</option>
          </select>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <select class="control-select" data-pid="${p.id}" data-mem="${p.memberstack_id}" data-role="${p.role || 'client'}" data-type="building" style="padding: 0.25rem; flex:1;">${bOptions}</select>
            <button type="button" class="btn-delete-user" style="background:transparent; border:none; color:var(--status-review); cursor:pointer; padding:0.25rem;" title="Delete User DB Profile">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      `;
      
      if (p.building_id) { const bSelect = tr.querySelector(`select[data-type="building"]`); if(bSelect) bSelect.value = p.building_id; }
      
      tr.querySelectorAll('select').forEach(sel => { 
        sel.addEventListener('change', async (e) => { 
          e.target.style.borderColor = 'var(--status-stable)'; 
          const payload = {}; 
          const isRole = e.target.dataset.type === 'role';
          const isBuilding = e.target.dataset.type === 'building';
          
          if (isRole) payload.role = e.target.value; 
          if (isBuilding) payload.building_id = e.target.value || null; 
          
          await supabase.from('profiles').update(payload).eq('id', e.target.dataset.pid); 
          
          if (isBuilding && payload.building_id) {
             const uId = e.target.dataset.mem;
             const rCheck = await supabase.from('user_property_access').select('id').eq('user_id', uId).eq('building_id', payload.building_id).single();
             if (!rCheck.data) {
                await supabase.from('user_property_access').insert([{ user_id: uId, building_id: payload.building_id, role: e.target.dataset.role, access_status: 'active', visibility_level: 'full' }]);
             }
          }
          setTimeout(() => e.target.style.borderColor = 'var(--border)', 500); 
        }); 
      }); 

      tr.querySelector('.btn-delete-user').addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete ${emailStr}? This removes their database connection.`)) {
          await supabase.from('user_property_access').delete().eq('user_id', p.memberstack_id);
          const { error } = await supabase.from('profiles').delete().eq('id', p.id);
          if (!error) { showToast('User profile deleted'); openUsersModal(); } else { showToast('Failed to delete user', 'error'); }
        }
      });
      DOM.usersTableBody.appendChild(tr);
    });
  };

  const autoSaveData = async (table, colIdName, id, payload, elementToFlash) => {
    if (!id || id === 'new') return; 
    if(elementToFlash) elementToFlash.classList.add('saving');
    await supabase.from(table).update(payload).eq(colIdName, id);
    if(elementToFlash) setTimeout(() => elementToFlash.classList.remove('saving'), 500);
  };

  const bindAutoSave = (container, table, colIdName) => {
    container.querySelectorAll('input:not([disabled]), select, textarea').forEach(input => { 
      input.addEventListener('change', (e) => { 
        const p = {}; p[e.target.getAttribute('data-col')] = e.target.value; 
        autoSaveData(table, colIdName, e.target.getAttribute('data-id'), p, e.target.closest('.card-surface, .pathway-row')); 
      }); 
    });
  };

  const bindDeleteBtns = (container) => {
    container.querySelectorAll('.btn-del-record').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id'); const table = btn.getAttribute('data-table'); const col = btn.getAttribute('data-colid');
        if(confirm("Permanently delete this record?")) {
           btn.disabled = true;
           await supabase.from(table).delete().eq(col, id);
           showToast('Record deleted'); loadAssetContext(currentBuildingId);
        }
      });
    });
  };

  const renderAssessments = (sessions) => {
    if(!DOM.assessmentsContainer) return; DOM.assessmentsContainer.innerHTML = '';
    sessions.forEach(s => {
      const cardHTML = `<div class="card-surface" id="sess-${s.assessment_id}"><div class="card-header"><div class="card-title">Assessment Session</div><button class="btn-del-record" data-table="assessment_sessions" data-colid="assessment_id" data-id="${s.assessment_id}" style="background:transparent;border:none;color:var(--status-review);cursor:pointer;padding:0.25rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></div><div class="metrics-input-grid"><select class="control-select" data-table="assessment_sessions" data-id="${s.assessment_id}" data-col="assessment_type"><option value="Home Performance Baseline" ${s.assessment_type === 'Home Performance Baseline' ? 'selected' : ''}>Baseline Check</option><option value="90-Day Stability Check" ${s.assessment_type === '90-Day Stability Check' ? 'selected' : ''}>90-Day Check</option><option value="Triggered Event Check" ${s.assessment_type === 'Triggered Event Check' ? 'selected' : ''}>Triggered Event</option><option value="Verification" ${s.assessment_type === 'Verification' ? 'selected' : ''}>Verification</option></select><select class="control-select" data-table="assessment_sessions" data-id="${s.assessment_id}" data-col="status"><option value="Scheduled" ${s.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option><option value="In Progress" ${s.status === 'In Progress' ? 'selected' : ''}>In Progress</option><option value="Completed" ${s.status === 'Completed' ? 'selected' : ''}>Completed</option></select></div><div class="metrics-input-grid" style="grid-template-columns: 1fr;"><input class="control-input" placeholder="Assessor Name" value="${s.assessor || ''}" data-table="assessment_sessions" data-id="${s.assessment_id}" data-col="assessor"></div></div>`;
      DOM.assessmentsContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
    bindAutoSave(DOM.assessmentsContainer, 'assessment_sessions', 'assessment_id');
    bindDeleteBtns(DOM.assessmentsContainer);
  };

  const renderIssues = (issues) => {
    if(!DOM.issuesContainer) return; DOM.issuesContainer.innerHTML = '';
    const roomOpts = `<option value="">Entire Property (Global)</option>` + currentRooms.map(r => `<option value="${r.id}">${r.room_name_current}</option>`).join('');

    issues.forEach(i => {
      const rSelected = i.room_id ? roomOpts.replace(`value="${i.room_id}"`, `value="${i.room_id}" selected`) : roomOpts;
      const cardHTML = `<div class="card-surface" id="issue-${i.issue_id}"><div class="card-header"><div class="card-title">Diagnostic Finding</div><button class="btn-del-record" data-table="issues_findings" data-colid="issue_id" data-id="${i.issue_id}" style="background:transparent;border:none;color:var(--status-review);cursor:pointer;padding:0.25rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></div><div class="metrics-input-grid"><input class="control-input" placeholder="Issue Title" value="${i.issue_type || ''}" data-table="issues_findings" data-id="${i.issue_id}" data-col="issue_type"><select class="control-select" data-table="issues_findings" data-id="${i.issue_id}" data-col="status"><option value="Monitor" ${i.status === 'Monitor' ? 'selected' : ''}>Monitor</option><option value="At Risk" ${i.status === 'At Risk' ? 'selected' : ''}>At Risk</option><option value="Action Required" ${i.status === 'Action Required' ? 'selected' : ''}>Action Required</option><option value="Closed" ${i.status === 'Closed' ? 'selected' : ''}>Closed</option></select></div><select class="control-select" data-table="issues_findings" data-id="${i.issue_id}" data-col="room_id">${rSelected}</select><textarea rows="2" class="control-textarea" placeholder="Client facing finding description..." data-table="issues_findings" data-id="${i.issue_id}" data-col="client_facing_wording">${i.client_facing_wording || ''}</textarea></div>`;
      DOM.issuesContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
    bindAutoSave(DOM.issuesContainer, 'issues_findings', 'issue_id');
    bindDeleteBtns(DOM.issuesContainer);
  };

  const generateStatusOptions = (currentStatus) => { const options = ['unknown', 'measured', 'stable', 'risk', 'review']; return options.map(opt => `<option value="${opt}" ${opt === currentStatus ? 'selected' : ''}>${opt === 'risk' ? 'At Risk' : opt === 'review' ? 'Review Required' : opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`).join(''); };

  const renderTelemetryEditor = (measurements) => {
    if(!DOM.telemetryContainer) return; DOM.telemetryContainer.innerHTML = '';
    ['ENVELOPE', 'U-VALUE', 'MOISTURE', 'CO2', 'READINESS', 'PRIORITY', 'ACH50', 'ELA', 'THERMAL_BRIDGE'].forEach(code => {
      const m = measurements.find(x => x.measurement_points?.element_code === code); if (!m) return;
      const cardHTML = `<div class="card-surface" id="card-${m.id}"><div class="card-header"><div class="card-title">${code.replace(/-/g, ' ')} Metric</div><span class="status-badge status-${m.status_flag}"><span class="badge-dot"></span>${m.status_flag}</span></div><div class="metrics-input-grid"><select class="control-select" data-table="measurements" data-id="${m.id}" data-col="status_flag">${generateStatusOptions(m.status_flag)}</select><input class="control-input" value="${m.value}" data-table="measurements" data-id="${m.id}" data-col="value"></div><textarea rows="2" class="control-textarea" data-table="measurements" data-id="${m.id}" data-col="client_facing_wording">${m.client_facing_wording || ''}</textarea></div>`;
      DOM.telemetryContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
    bindAutoSave(DOM.telemetryContainer, 'measurements', 'id');
  };

  const renderTwinEditor = (rooms, measurements) => {
    if(!DOM.twinNodesContainer) return; DOM.twinNodesContainer.innerHTML = '';
    rooms.forEach(room => {
      const roomMs = measurements.filter(x => x.room_id === room.id || (x.measurement_points && x.measurement_points.room_id === room.id));
      const overallM = roomMs.find(x => x.status_flag === 'risk' || x.status_flag === 'review') || roomMs[0] || { status_flag: 'unknown', id: 'new' };
      const getValInput = (code) => { let sm = roomMs.find(x => x.measurement_points?.element_code === code); if(!sm && code === 'RH') sm = roomMs.find(x => x.measurement_points?.element_code === 'MOISTURE'); if(!sm) return `<input class="control-input tabular" disabled placeholder="-" title="No sensor assigned">`; return `<input step="any" class="control-input tabular" type="number" value="${sm.value}" data-table="measurements" data-id="${sm.id}" data-col="value">`; };
      const cardHTML = `<div class="card-surface" id="card-${room.id}"><div class="card-title" style="display:flex; justify-content:space-between; align-items:center;">${room.room_name_current}<select class="control-select" style="width: auto; padding: 0.25rem;" data-table="measurements" data-id="${overallM.id}" data-col="status_flag">${generateStatusOptions(overallM.status_flag)}</select></div><div class="node-input-grid"><label><div class="eyebrow" style="margin-bottom: 0.25rem;">RH%</div>${getValInput('RH')}</label><label><div class="eyebrow" style="margin-bottom: 0.25rem;">CO₂</div>${getValInput('CO2')}</label><label><div class="eyebrow" style="margin-bottom: 0.25rem;">VOC</div>${getValInput('VOC')}</label></div><textarea rows="2" class="control-textarea" data-table="rooms" data-id="${room.id}" data-col="notes" placeholder="Analyst Notes for this room...">${room.notes || ''}</textarea></div>`;
      DOM.twinNodesContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
    bindAutoSave(DOM.twinNodesContainer, 'rooms', 'id');
    DOM.twinNodesContainer.querySelectorAll('input[data-table="measurements"], select[data-table="measurements"]').forEach(input => { 
      input.addEventListener('change', (e) => { 
        const p = {}; p[e.target.getAttribute('data-col')] = e.target.value; 
        autoSaveData('measurements', 'id', e.target.getAttribute('data-id'), p, e.target.closest('.card-surface')); 
      }); 
    });
  };

  const renderPathwayEditor = (scenarios) => {
    if(!DOM.pathwayContainer) return; DOM.pathwayContainer.innerHTML = '';
    scenarios.forEach(scen => {
      const cardHTML = `<div class="pathway-row" id="row-${scen.id}"><div class="pathway-title"><span class="font-mono text-muted-foreground" style="font-size: 10px; text-transform: uppercase; letter-spacing: var(--tracking-widest); margin-right: 0.5rem;">Phase 0${scen.phase}</span>${scen.title}</div><select class="control-select" data-table="upgrade_scenarios" data-id="${scen.id}" data-col="status"><option value="completed" ${scen.status === 'completed' ? 'selected' : ''}>Completed</option><option value="in-progress" ${scen.status === 'in-progress' ? 'selected' : ''}>In Progress</option><option value="locked" ${scen.status === 'locked' ? 'selected' : ''}>Locked Phase</option></select></div>`;
      DOM.pathwayContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
    bindAutoSave(DOM.pathwayContainer, 'upgrade_scenarios', 'id');
  };

  const handleReportUpload = async (e) => {
    if (!currentBuildingId) return;
    const file = e.target.files[0]; if (!file) return;
    
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast('File exceeds 50MB limit', 'error');
        if(DOM.reportInput) DOM.reportInput.value = '';
        return;
    }

    const targetRoomId = DOM.uploadTargetRoom ? DOM.uploadTargetRoom.value : null;
    const isClientVisible = DOM.uploadClientVisible ? DOM.uploadClientVisible.checked : true;
    const fileExt = file.name.split('.').pop().toLowerCase();

    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExt);
    const isDoc = ['pdf', 'csv', 'doc', 'docx', 'xls', 'xlsx'].includes(fileExt);

    let bucket = ''; let table = ''; let insertPayload = {};

    if (targetRoomId) {
        if (!isImage) { showToast('Room evidence must be an image', 'error'); DOM.reportInput.value = ''; return; }
        bucket = 'property_assets'; table = 'evidence_assets';
        insertPayload = { building_id: currentBuildingId, room_id: targetRoomId, file_name: file.name, client_visible: isClientVisible };
    } else {
        if (!isDoc && !isImage) { showToast('Invalid file type for report', 'error'); DOM.reportInput.value = ''; return; }
        bucket = 'reports'; table = 'reports';
        insertPayload = { building_id: currentBuildingId, report_title: file.name, report_type: fileExt.toUpperCase(), client_visible: isClientVisible };
    }

    if(DOM.uploadStatusText) DOM.uploadStatusText.textContent = `Uploading ${file.name}...`;
    const fileName = `${currentBuildingId}-${Date.now()}.${fileExt}`;
    
    const storageClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error: uploadErr } = await storageClient.storage.from(bucket).upload(fileName, file);
    
    if (uploadErr) { 
      if(DOM.uploadStatusText) DOM.uploadStatusText.textContent = `Drop or click to upload`; 
      showToast('Upload failed: ' + uploadErr.message, 'error'); 
      return; 
    }
    
    const { data: urlData } = storageClient.storage.from(bucket).getPublicUrl(fileName);
    if (table === 'evidence_assets') { insertPayload.file_url = urlData.publicUrl; } 
    else { insertPayload.report_url = urlData.publicUrl; }
    
    await supabase.from(table).insert([insertPayload]);
    
    if(DOM.uploadStatusText) DOM.uploadStatusText.textContent = `Drop or click to upload`; 
    if(DOM.reportInput) DOM.reportInput.value = ''; 
    showToast('File uploaded successfully'); loadAssetContext(currentBuildingId);
  };

  const init = async () => {
    // Map DOM safely inside init
    DOM.assetSelect = document.getElementById('asset-select');
    DOM.assetCount = document.getElementById('asset-count');
    DOM.editorsWrap = document.getElementById('admin-editors-wrap');
    DOM.emptyStateContainer = document.getElementById('empty-state-container');
    DOM.btnInitializeAsset = document.getElementById('btnInitializeAsset');
    DOM.telemetryContainer = document.getElementById('telemetry-container');
    DOM.twinNodesContainer = document.getElementById('twin-nodes-container');
    DOM.pathwayContainer = document.getElementById('pathway-container');
    DOM.reportInput = document.getElementById('report-upload-input');
    DOM.uploadStatusText = document.getElementById('upload-status-text');
    DOM.archiveCount = document.getElementById('archive-count');
    DOM.uploadTargetRoom = document.getElementById('upload-target-room');
    DOM.btnUserManagement = document.getElementById('btnUserManagement');
    DOM.usersModal = document.getElementById('jbUsersModal');
    DOM.closeUsersModal = document.getElementById('closeUsersModal');
    DOM.usersTableBody = document.getElementById('usersTableBody');
    DOM.uploadClientVisible = document.getElementById('upload-client-visible');
    DOM.desktopSidebarAsset = document.getElementById('desktopSidebarAsset');
    DOM.desktopHeaderAsset = document.getElementById('desktopHeaderAsset');
    
    const headerTabs = document.querySelectorAll('.header-telemetry-cluster .tabular');
    DOM.headerClimateText = headerTabs[1] || null;
    DOM.headerSysText = headerTabs[2] || null;
    
    DOM.assessmentsContainer = document.getElementById('assessments-container');
    DOM.issuesContainer = document.getElementById('issues-container');
    DOM.btnNewAssessment = document.getElementById('btnNewAssessment');
    DOM.btnNewIssue = document.getElementById('btnNewIssue');

    toggleSkeletonState(true); 
    initUIEvents();
    
    if (!window.supabase) return; 

    let supabaseToken = '';
    try { 
      const memberReq = await window.$memberstackDom.getCurrentMember();
      if (memberReq && memberReq.data && memberReq.data.customFields && memberReq.data.customFields['supabase-jwt']) {
          supabaseToken = memberReq.data.customFields['supabase-jwt'];
      }
    } catch(e) { console.warn("No Supabase token found"); }

    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: supabaseToken ? { Authorization: `Bearer ${supabaseToken}` } : {} }
    });

    try { const profile = await authenticateAdmin(); if (profile) await loadGlobalAssets(); } catch (error) { console.error(error); window.location.href = '/login'; }
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsAdmin.init); } else { JoeBuildsAdmin.init(); }
