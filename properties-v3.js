/**
 * Joe Builds Home Intelligence Platform
 * Properties Registry Controller (v3 - Foolproof Sidebar Reveal)
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
    views: { registry: document.getElementById('view-registry'), newForm: document.getElementById('view-new-property'), detail: document.getElementById('view-property-detail') },
    sidebarAssetTitle: document.getElementById('sidebar-asset-title'),
    headerTelemetry: document.getElementById('header-telemetry-cluster'),
    propertyGrid: document.getElementById('propertyGridContainer'),
    formNewProperty: document.getElementById('form-new-property'),
    btnSubmitProperty: document.getElementById('btn-submit-property'),
    detailEyebrow: document.getElementById('detail-eyebrow'),
    detailTitle: document.getElementById('detail-title'),
    detailAddress: document.getElementById('detail-address'),
    detailStatus: document.getElementById('detail-status'),
    detailFilesList: document.getElementById('detail-files-list'),
    detailFilesCount: document.getElementById('detail-files-count'),
    fileInput: document.getElementById('file-upload-input'),
    uploadStatusText: document.getElementById('upload-status-text')
  };

  const authenticateOperator = async () => {
    const member = await window.$memberstackDom.getCurrentMember();
    if (!member || !member.data) throw new Error("No session.");
    
    const { data: profile, error } = await supabase.from('profiles').select('id, role').eq('memberstack_id', member.data.id).single();
    if (error || !profile) throw new Error("Profile missing");

    if (profile.role === 'client' || profile.role === 'demo') { 
      window.location.href = '/dashboard'; 
      return null; 
    }
    
    if (DOM.opLabel) DOM.opLabel.textContent = member.data.customFields?.first_name || 'Operator';
    if (DOM.opEmail) DOM.opEmail.textContent = `Logged in as: ${member.data.auth.email}`;
    
    // FOOLPROOF REVEAL: Physically delete the CSS hiding the sidebar links
    const hideStyle = document.getElementById('rbac-hide-admin');
    if (hideStyle) hideStyle.remove();

    return profile;
  };

  const switchView = (viewName) => {
    Object.values(DOM.views).forEach(el => el.classList.add('jb-hidden'));
    DOM.views[viewName].classList.remove('jb-hidden');
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (viewName === 'registry' || viewName === 'newForm') {
      DOM.sidebarAssetTitle.textContent = "Project Registry View";
      DOM.headerTelemetry.innerHTML = `<div class="telemetry-node"><span class="eyebrow text-muted-foreground">SCOPE</span><span class="tabular">All Managed Assets</span></div>`;
    }
  };

  const bindUIEvents = () => {
    if (DOM.dropBtn && DOM.opMenu) {
      DOM.dropBtn.addEventListener('click', (e) => { e.stopPropagation(); DOM.dropBtn.setAttribute('aria-expanded', !(DOM.dropBtn.getAttribute('aria-expanded') === 'true')); DOM.opMenu.classList.toggle('jb-hidden'); });
      document.addEventListener('click', () => { DOM.dropBtn.setAttribute('aria-expanded', 'false'); DOM.opMenu.classList.add('jb-hidden'); });
    }
    if(DOM.logoutBtn) DOM.logoutBtn.addEventListener('click', async () => { try { await window.$memberstackDom.logout(); window.location.href = '/login'; } catch (err) {} });
    document.getElementById('btn-create-new')?.addEventListener('click', () => switchView('newForm'));
    document.querySelectorAll('.btn-back').forEach(btn => {
      btn.addEventListener('click', () => { currentBuildingContext = null; switchView('registry'); fetchAndRenderBuildings(); });
    });
    DOM.formNewProperty?.addEventListener('submit', async (e) => { e.preventDefault(); await handleNewPropertySubmit(); });
    DOM.fileInput?.addEventListener('change', handleFileUpload);
  };

  const fetchAndRenderBuildings = async () => {
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
  };

  const handleNewPropertySubmit = async () => {
    DOM.btnSubmitProperty.textContent = "Registering..."; DOM.btnSubmitProperty.disabled = true;
    const bCode = document.getElementById('input-building-code').value;
    const address = document.getElementById('input-address').value;
    const status = document.getElementById('input-status').value;
    const { error } = await supabase.from('buildings').insert([{ building_code: bCode, address_line_1: address, status: status }]);
    DOM.btnSubmitProperty.textContent = "Register Property"; DOM.btnSubmitProperty.disabled = false;
    if (!error) { DOM.formNewProperty.reset(); switchView('registry'); fetchAndRenderBuildings(); }
  };

  const openPropertyDetail = async (building) => {
    currentBuildingContext = building;
    DOM.detailEyebrow.textContent = `Asset · ${building.building_code || building.id.substring(0,8)}`;
    DOM.detailTitle.textContent = building.address_line_1;
    DOM.detailAddress.textContent = `${building.suburb || ''} ${building.state || ''}`;
    DOM.detailStatus.textContent = `Status: ${building.status}`;
    DOM.sidebarAssetTitle.textContent = building.building_code || 'Selected Asset';
    DOM.headerTelemetry.innerHTML = `<div class="telemetry-node"><span class="eyebrow text-muted-foreground">ASSET</span><span class="tabular">${building.building_code || 'Selected'}</span></div><div class="telemetry-node"><span class="eyebrow text-muted-foreground">SYS</span><span class="tabular">${building.status}</span><span class="pulse-container"><span class="pulse-ping status-dot-stable"></span><span class="pulse-core status-dot-stable"></span></span></div>`;
    switchView('detail');
    await fetchBuildingAssets(building.id);
  };

  const fetchBuildingAssets = async (buildingId) => {
    DOM.detailFilesList.innerHTML = `<div style="padding:1.5rem;text-align:center;font-family:var(--font-mono);font-size:10px;text-transform:uppercase;color:var(--muted-foreground)">Fetching assets...</div>`;
    const { data: files } = await supabase.from('evidence_assets').select('*').eq('building_id', buildingId).order('created_at', { ascending: false });
    if (!files || files.length === 0) {
      DOM.detailFilesCount.textContent = "0 attached";
      DOM.detailFilesList.innerHTML = `<div style="border:1px dashed var(--border);background-color:var(--surface);padding:1.5rem;text-align:center;font-family:var(--font-mono);font-size:10px;text-transform:uppercase;color:var(--muted-foreground)">No documents attached to this property</div>`;
      return;
    }
    DOM.detailFilesCount.textContent = `${files.length} attached`;
    DOM.detailFilesList.innerHTML = '';
    files.forEach(f => {
      const dateStr = new Date(f.created_at).toISOString().split('T')[0];
      const html = `<div class="archive-item"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground" style="height:1rem;width:1rem"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg><div class="archive-details"><div style="font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.file_name || 'Asset Document'}</div><div class="font-mono text-muted-foreground" style="margin-top:.125rem;font-size:10px;text-transform:uppercase;letter-spacing:var(--tracking-wider)">${dateStr}</div></div><a href="${f.file_url}" target="_blank" class="btn-secondary" style="padding:.5rem .75rem;gap:.375rem; text-decoration:none;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="height:.75rem;width:.75rem"><path d="M12 15V3"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path></svg></a></div>`;
      DOM.detailFilesList.insertAdjacentHTML('beforeend', html);
    });
  };

  const handleFileUpload = async (e) => {
    if (!currentBuildingContext) return;
    const file = e.target.files[0]; if (!file) return;
    DOM.uploadStatusText.textContent = `Uploading ${file.name}...`;
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentBuildingContext.id}-${Date.now()}.${fileExt}`;
    const { error: uploadErr } = await supabase.storage.from('property_assets').upload(fileName, file);
    if (uploadErr) { DOM.uploadStatusText.textContent = `Upload failed.`; return; }
    const { data: urlData } = supabase.storage.from('property_assets').getPublicUrl(fileName);
    const { error: dbErr } = await supabase.from('evidence_assets').insert([{ building_id: currentBuildingContext.id, file_name: file.name, file_url: urlData.publicUrl }]);
    DOM.uploadStatusText.textContent = `Drop or click to upload`; DOM.fileInput.value = '';
    if (!dbErr) await fetchBuildingAssets(currentBuildingContext.id);
  };

  const init = async () => {
    bindUIEvents();
    if (!window.supabase) return;
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    try { 
      const profile = await authenticateOperator(); 
      if (profile) await fetchAndRenderBuildings(); 
    } catch (error) {
      console.error(error);
      window.location.href = '/login';
    }
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsProperties.init);
} else { JoeBuildsProperties.init(); }
