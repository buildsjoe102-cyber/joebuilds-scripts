/**
 * Joe Builds - Diagnostics Controller (v8 - Demo Support)
 */
const JoeBuildsDiagnostics = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  let supabase, measurementsStore = {};
  const DOM = { desktopSidebarAsset: document.getElementById('desktopSidebarAsset'), desktopHeaderAsset: document.getElementById('desktopHeaderAsset'), headerClimateText: document.querySelectorAll('.jb-desktop-telemetry .jb-tabular')[1], headerSysText: document.querySelectorAll('.jb-desktop-telemetry .jb-tabular')[2], sidebarMeta: document.getElementById('desktopSidebarMeta'), tbodyThermal: document.getElementById('tbody-thermal'), mgridThermal: document.getElementById('mgrid-thermal'), countThermal: document.getElementById('count-thermal'), tbodyAir: document.getElementById('tbody-air'), mgridAir: document.getElementById('mgrid-air'), countAir: document.getElementById('count-air'), modal: document.getElementById('jbDiagnosticModal'), modalCloseBtn: document.getElementById('modalCloseBtn'), mTitle: document.getElementById('modalMetricTitle'), mCapture: document.getElementById('modalCapture'), mOp: document.getElementById('modalOperator'), mInst: document.getElementById('modalInstrument'), mNotes: document.getElementById('modalNotes'), modalGraphicWrapper: document.querySelector('#jbDiagnosticModal > div > div:nth-child(2) > div:nth-child(1)') };

  const toggleSkeletonState = (isLoading) => { const elementsToToggle = [ DOM.desktopSidebarAsset, DOM.desktopHeaderAsset, DOM.headerClimateText, DOM.headerSysText, DOM.countThermal, DOM.countAir, DOM.sidebarMeta ]; elementsToToggle.forEach(el => { if (!el) return; if (isLoading) el.classList.add('jb-skeleton-block'); else el.classList.remove('jb-skeleton-block'); }); if (isLoading && DOM.tbodyThermal) { DOM.tbodyThermal.innerHTML = `<tr><td colspan="5"><div class="jb-skeleton-block" style="height: 40px;"></div></td></tr>`; } };

  const fetchDiagnosticsData = async (buildingId) => { const [buildingRes, projectsRes, measurementsRes] = await Promise.all([ supabase.from('buildings').select('*').eq('id', buildingId).single(), supabase.from('projects').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }), supabase.from('measurements').select(`id, created_at, value, unit, status_flag, client_facing_wording, measurement_points(element_code)`).eq('building_id', buildingId) ]); return { building: buildingRes.data, currentProject: projectsRes.data?.[0], measurements: measurementsRes.data || [] }; };

  const mapToDOM = (data) => {
    if (!data.building) return;
    const assetName = `${data.currentProject?.project_code || 'PRJ-000'} — ${data.building.address_line_1}`;
    if (DOM.desktopSidebarAsset) DOM.desktopSidebarAsset.textContent = assetName; if (DOM.desktopHeaderAsset) DOM.desktopHeaderAsset.textContent = assetName; if (DOM.headerSysText) DOM.headerSysText.textContent = data.building.status || 'Pending';
    const state = data.building.state || 'WA'; const climateText = state === 'WA' ? 'Zone 5 — Warm Temperate' : 'Zone 6 — Mild Temperate';
    if (DOM.headerClimateText) DOM.headerClimateText.textContent = climateText; if (DOM.sidebarMeta) DOM.sidebarMeta.textContent = climateText;
    if (DOM.tbodyThermal) DOM.tbodyThermal.innerHTML = ''; if (DOM.tbodyAir) DOM.tbodyAir.innerHTML = '';
    
    const thermals = [], airTights = [];
    data.measurements.forEach(m => { measurementsStore[m.id] = m; const code = m.measurement_points?.element_code; if (['U-VALUE', 'THERMAL_BRIDGE', 'ENVELOPE'].includes(code)) thermals.push(m); if (['ACH50', 'ELA', 'CO2'].includes(code)) airTights.push(m); });

    if (DOM.tbodyThermal && DOM.countThermal) { DOM.countThermal.textContent = `${thermals.length} entries`; thermals.forEach(m => { const title = m.measurement_points.element_code === 'U-VALUE' ? 'Assembly U-Value' : m.measurement_points.element_code === 'ENVELOPE' ? 'Envelope Integrity' : 'Metric'; DOM.tbodyThermal.insertAdjacentHTML('beforeend', `<tr data-id="${m.id}" style="cursor: pointer;"><td><button class="jb-img-btn">Img</button></td><td>${title}</td><td class="jb-font-mono jb-tabular">${m.value || '-'}</td><td><span class="jb-status-badge jb-status-${m.status_flag}">${m.status_flag}</span></td><td style="color:var(--muted-foreground)">${m.client_facing_wording || '-'}</td></tr>`); }); }
    if (DOM.tbodyAir && DOM.countAir) { DOM.countAir.textContent = `${airTights.length} entries`; airTights.forEach(m => { const title = m.measurement_points.element_code === 'ACH50' ? 'ACH50 Air Infiltration Rate' : m.measurement_points.element_code === 'CO2' ? 'Indoor Air Quality' : 'Metric'; DOM.tbodyAir.insertAdjacentHTML('beforeend', `<tr data-id="${m.id}" style="cursor: pointer;"><td><button class="jb-img-btn">Img</button></td><td>${title}</td><td class="jb-font-mono jb-tabular">${m.value || '-'}</td><td><span class="jb-status-badge jb-status-${m.status_flag}">${m.status_flag}</span></td><td style="color:var(--muted-foreground)">${m.client_facing_wording || '-'}</td></tr>`); }); }

    document.querySelectorAll('tr[data-id]').forEach(el => { el.addEventListener('click', (e) => { e.stopPropagation(); const metricName = el.querySelector('td:nth-child(2)')?.textContent; DOM.mTitle.textContent = metricName; DOM.modal.classList.remove('jb-hidden'); }); });
    toggleSkeletonState(false);
  };

  const init = async () => {
    toggleSkeletonState(true); if (DOM.modalCloseBtn) DOM.modalCloseBtn.addEventListener('click', () => DOM.modal.classList.add('jb-hidden'));
    if (!window.supabase) return; supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    try {
      const member = await window.$memberstackDom.getCurrentMember();
      const { data: profile } = await supabase.from('profiles').select('building_id').eq('memberstack_id', member.data.id).single();
      let targetBuildingId = profile?.building_id;
      if (!targetBuildingId && localStorage.getItem('jb_demo_mode') === 'true') { const { data: demoB } = await supabase.from('buildings').select('id').eq('building_code', 'DEMO-001').single(); if (demoB) targetBuildingId = demoB.id; }
      if (targetBuildingId) { const diagnosticsData = await fetchDiagnosticsData(targetBuildingId); mapToDOM(diagnosticsData); } else { toggleSkeletonState(false); }
    } catch (error) {}
  };
  return { init };
})();
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsDiagnostics.init); } else { JoeBuildsDiagnostics.init(); }
