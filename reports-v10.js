/**
 * Joe Builds Home Intelligence Platform
 * Reports Controller (v10 - Custom JWT Security Fix & True Table Read)
 */
const JoeBuildsReports = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_xla-awjgU2npKzrWHdYKDQ_2ox0CWmC';
  let supabase;

  const DOM = {
    desktopSidebarAsset: document.getElementById('desktopSidebarAsset'),
    desktopHeaderAsset: document.getElementById('desktopHeaderAsset'),
    headerClimateText: document.querySelectorAll('.header-telemetry-cluster .tabular')[1],
    headerSysText: document.querySelectorAll('.header-telemetry-cluster .tabular')[2],
    sidebarMeta: document.querySelector('.jb-footer-meta, .sidebar-footer > div:last-child'),
    reportsGrid: document.getElementById('reportsGrid'),
    reportsCountLabel: document.getElementById('reportsCountLabel')
  };

  const toggleSkeletonState = (isLoading) => {
    const elementsToToggle = [DOM.desktopSidebarAsset, DOM.desktopHeaderAsset, DOM.headerClimateText, DOM.headerSysText, DOM.sidebarMeta];
    elementsToToggle.forEach(el => { if (!el) return; if (isLoading) el.classList.add('jb-skeleton-block'); else el.classList.remove('jb-skeleton-block'); });
  };

  const fetchReportsData = async (buildingId) => {
    const [buildingRes, projectsRes, reportsRes] = await Promise.all([
      supabase.from('buildings').select('*').eq('id', buildingId).single(),
      supabase.from('projects').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }),
      supabase.from('reports').select('*').eq('building_id', buildingId).eq('client_visible', true).order('created_at', { ascending: false })
    ]);
    return { building: buildingRes.data, currentProject: projectsRes.data?.[0], reports: reportsRes.data || [] };
  };

  const populateReportsUI = (data) => {
    if (!data.building) return;

    // Set textual context
    const assetName = `${data.currentProject?.project_code || 'PRJ-000'} — ${data.building.address_line_1}`;
    if (DOM.desktopSidebarAsset) DOM.desktopSidebarAsset.textContent = assetName; 
    if (DOM.desktopHeaderAsset) DOM.desktopHeaderAsset.textContent = assetName; 
    if (DOM.headerSysText) DOM.headerSysText.textContent = data.building.status || 'Pending';
    
    const state = data.building.state || 'WA'; 
    const climateText = state === 'WA' ? 'Zone 5 — Warm Temperate' : 'Zone 6 — Mild Temperate';
    if (DOM.headerClimateText) DOM.headerClimateText.textContent = climateText; 
    if (DOM.sidebarMeta) DOM.sidebarMeta.textContent = climateText;

    // Render reports
    if (DOM.reportsGrid) {
        DOM.reportsGrid.innerHTML = '';
        if (DOM.reportsCountLabel) {
            DOM.reportsCountLabel.textContent = `${data.reports.length} documents`;
        }
        
        if (data.reports.length === 0) {
           DOM.reportsGrid.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--muted-foreground)">No reports available yet.</div>';
        } else {
           data.reports.forEach(rep => {
              const dateStr = new Date(rep.created_at).toLocaleDateString('en-GB');
              const fileType = rep.report_type || 'PDF';
              const html = `
              <div class="archive-row">
                <div class="icon-square">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="height:1.25rem;width:1.25rem;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div class="file-details">
                  <div class="file-title">${rep.report_title}</div>
                  <div class="file-meta-tags"><span>${fileType}</span><span>${dateStr}</span></div>
                </div>
                <a href="${rep.report_url}" target="_blank" class="action-btn-sm" style="text-decoration:none;">
                  Download 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="height:14px;width:14px;margin-left:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </a>
              </div>`;
              DOM.reportsGrid.insertAdjacentHTML('beforeend', html);
           });
        }
    }

    // Populate fake visual calendar
    if (document.getElementById('calendarMatrix')) {
        const cal = document.getElementById('calendarMatrix');
        // Clear old visual cells
        const oldCells = cal.querySelectorAll('.calendar-cell-btn');
        oldCells.forEach(c => c.remove());
        
        document.getElementById('calendarMonthLabel').textContent = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        
        for (let i = 1; i <= 31; i++) {
           const isEvent = (i === 12 || i === 25) ? 'active-event' : '';
           const dot = (i === 12 || i === 25) ? `<div class="calendar-event-dot"></div>` : '';
           cal.insertAdjacentHTML('beforeend', `<button class="calendar-cell-btn ${isEvent}">${i}${dot}</button>`);
        }

        const agenda = document.getElementById('agendaContainer');
        if (agenda) {
            agenda.innerHTML = `
              <div class="agenda-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="height: 1.25rem; width: 1.25rem;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <div class="agenda-title">Continuous Diagnostics Pull</div>
                <div class="agenda-date-tag">12th</div>
              </div>
              <div class="agenda-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="height: 1.25rem; width: 1.25rem;"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                <div class="agenda-title">Upgrade Consultation Call</div>
                <div class="agenda-date-tag">25th</div>
              </div>
            `;
        }
    }

    toggleSkeletonState(false);
  };

  const init = async () => {
    toggleSkeletonState(true);

    if (!window.supabase) return;

    // SECURE TOKEN HANDSHAKE VIA CUSTOM FIELD
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

    try {
      const member = await window.$memberstackDom.getCurrentMember();
      const { data: profile } = await supabase.from('profiles').select('building_id').eq('memberstack_id', member.data.id).single();
      
      let targetBuildingId = profile?.building_id;
      if (!targetBuildingId && localStorage.getItem('jb_demo_mode') === 'true') { 
        const { data: demoB } = await supabase.from('buildings').select('id').eq('building_code', 'DEMO-001').single(); 
        if (demoB) targetBuildingId = demoB.id; 
      }
      
      if (targetBuildingId) { 
        const reportsData = await fetchReportsData(targetBuildingId); 
        populateReportsUI(reportsData); 
      } else { 
        toggleSkeletonState(false); 
      }
    } catch (error) {
      console.error(error);
    }
  };

  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsReports.init); } else { JoeBuildsReports.init(); }
