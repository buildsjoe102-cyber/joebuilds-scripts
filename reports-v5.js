/**
 * Joe Builds - Reports Controller (v5 - Demo Support)
 */
const JoeBuildsReports = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  let supabase;
  const DOM = { desktopSidebarAsset: document.getElementById('desktopSidebarAsset'), desktopHeaderAsset: document.getElementById('desktopHeaderAsset'), headerClimateText: document.querySelectorAll('.header-telemetry-cluster .tabular')[1], headerSysText: document.querySelectorAll('.header-telemetry-cluster .tabular')[2], sidebarMeta: document.querySelector('.jb-footer-meta, .sidebar-footer > div:last-child'), reportsGrid: document.getElementById('reportsGrid'), reportsCountLabel: document.getElementById('reportsCountLabel'), calendarMonthLabel: document.getElementById('calendarMonthLabel'), calendarMatrix: document.getElementById('calendarMatrix'), agendaContainer: document.getElementById('agendaContainer') };

  const toggleSkeletonState = (isLoading) => { const elementsToToggle = [DOM.desktopSidebarAsset, DOM.desktopHeaderAsset, DOM.headerClimateText, DOM.headerSysText, DOM.reportsCountLabel, DOM.calendarMonthLabel, DOM.sidebarMeta]; elementsToToggle.forEach(el => { if (!el) return; if (isLoading) el.classList.add('jb-skeleton-block'); else el.classList.remove('jb-skeleton-block'); }); if (isLoading) { if (DOM.reportsGrid) DOM.reportsGrid.innerHTML = `<div class="archive-row jb-skeleton-block" style="height: 70px;"></div>`; } };

  const fetchPageData = async (buildingId) => {
    const [buildingRes, projectsRes, reportsRes, eventsRes] = await Promise.all([ supabase.from('buildings').select('*').eq('id', buildingId).single(), supabase.from('projects').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }), supabase.from('reports').select('*').eq('building_id', buildingId).eq('client_visible', true).order('created_at', { ascending: false }), supabase.from('diagnostic_events').select('*').eq('building_id', buildingId).order('created_at', { ascending: true }) ]);
    return { building: buildingRes.data, currentProject: projectsRes.data?.[0], reports: reportsRes.data || [], events: eventsRes.data || [] };
  };

  const populateHeaders = (data) => {
    if(!data.building) return;
    const assetName = `${data.currentProject?.project_code || 'PRJ-000'} — ${data.building.address_line_1}`;
    if (DOM.desktopSidebarAsset) DOM.desktopSidebarAsset.textContent = assetName; if (DOM.desktopHeaderAsset) DOM.desktopHeaderAsset.textContent = assetName; if (DOM.headerSysText) DOM.headerSysText.textContent = data.building.status || 'Pending';
    const state = data.building.state || 'WA'; const climateText = state === 'WA' ? 'Zone 5 — Warm Temperate' : 'Zone 6 — Mild Temperate';
    if (DOM.headerClimateText) DOM.headerClimateText.textContent = climateText; if (DOM.sidebarMeta) DOM.sidebarMeta.textContent = climateText;
    
    if (DOM.reportsGrid) {
      DOM.reportsCountLabel.textContent = `${data.reports.length} documents`; DOM.reportsGrid.innerHTML = '';
      if (data.reports.length === 0) DOM.reportsGrid.innerHTML = `<div class="archive-row" style="color:var(--muted-foreground); font-size:12px;">No reports available for this asset yet.</div>`;
      data.reports.forEach(report => { const dateStr = new Date(report.created_at).toISOString().split('T')[0]; const type = (report.report_type || 'PDF').toUpperCase(); DOM.reportsGrid.insertAdjacentHTML('beforeend', `<div class="archive-row"><div class="icon-square">Doc</div><div class="file-details"><div class="file-title">${report.report_title}</div><div class="file-meta-tags"><span>${type}</span><span class="tabular">${dateStr}</span></div></div><a href="${report.report_url}" target="_blank" class="action-btn-sm">Download</a></div>`); });
    }
  };

  const init = async () => {
    toggleSkeletonState(true);
    if (!window.supabase) return; supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    try {
      const member = await window.$memberstackDom.getCurrentMember();
      const { data: profile } = await supabase.from('profiles').select('building_id').eq('memberstack_id', member.data.id).single();
      let targetBuildingId = profile?.building_id;
      if (!targetBuildingId && localStorage.getItem('jb_demo_mode') === 'true') { const { data: demoB } = await supabase.from('buildings').select('id').eq('building_code', 'DEMO-001').single(); if (demoB) targetBuildingId = demoB.id; }
      if (targetBuildingId) { const pageData = await fetchPageData(targetBuildingId); populateHeaders(pageData); }
      toggleSkeletonState(false);
    } catch (error) {}
  };
  return { init };
})();
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsReports.init); } else { JoeBuildsReports.init(); }
