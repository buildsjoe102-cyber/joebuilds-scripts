/**
 * Joe Builds Home Intelligence Platform
 * Diagnostics Controller
 */
const JoeBuildsDiagnostics = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  let supabase, measurementsStore = {};

  const DOM = {
    opLabel: document.getElementById('jbOperatorLabel'),
    opEmail: document.getElementById('jbOperatorEmail'),
    dropBtn: document.getElementById('jbOperatorDropdown'),
    opMenu: document.getElementById('jbOperatorMenu'),
    logoutBtn: document.getElementById('jbLogoutBtn'),
    desktopSidebarAsset: document.getElementById('desktopSidebarAsset'),
    desktopHeaderAsset: document.getElementById('desktopHeaderAsset'),
    tbodyThermal: document.getElementById('tbody-thermal'),
    mgridThermal: document.getElementById('mgrid-thermal'),
    countThermal: document.getElementById('count-thermal'),
    tbodyAir: document.getElementById('tbody-air'),
    mgridAir: document.getElementById('mgrid-air'),
    countAir: document.getElementById('count-air'),
    modal: document.getElementById('jbDiagnosticModal'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    mTitle: document.getElementById('modalMetricTitle'),
    mLabel: document.getElementById('modalMetricLabel'),
    mValue: document.getElementById('modalValueLabel'),
    mCapture: document.getElementById('modalCapture'),
    mOp: document.getElementById('modalOperator'),
    mInst: document.getElementById('modalInstrument'),
    mNotes: document.getElementById('modalNotes'),
    mCameraMeta: document.getElementById('modalCameraMeta')
  };

  const initUIEvents = () => {
    if (DOM.dropBtn && DOM.opMenu) {
      DOM.dropBtn.addEventListener('click', (e) => { e.stopPropagation(); DOM.dropBtn.setAttribute('aria-expanded', !(DOM.dropBtn.getAttribute('aria-expanded') === 'true')); DOM.opMenu.classList.toggle('jb-hidden'); });
      document.addEventListener('click', () => { DOM.dropBtn.setAttribute('aria-expanded', 'false'); DOM.opMenu.classList.add('jb-hidden'); });
    }
    if (DOM.logoutBtn) {
      DOM.logoutBtn.addEventListener('click', async () => { try { await window.$memberstackDom.logout(); window.location.href = '/login'; } catch (err) {} });
    }
    if (DOM.modalCloseBtn) DOM.modalCloseBtn.addEventListener('click', () => DOM.modal.classList.add('jb-hidden'));
    if (DOM.modal) DOM.modal.addEventListener('click', (e) => { if (e.target === DOM.modal) DOM.modal.classList.add('jb-hidden'); });
  };

  const authAndGetProfile = async () => {
    const member = await window.$memberstackDom.getCurrentMember();
    if (!member || !member.data) throw new Error("No Memberstack session.");
    if (DOM.opLabel) DOM.opLabel.textContent = member.data.customFields?.first_name || 'Client';
    if (DOM.opEmail) DOM.opEmail.textContent = `Logged in as: ${member.data.auth.email}`;
    
    const { data: profile } = await supabase.from('profiles').select('id, building_id, role').eq('memberstack_id', member.data.id).single();
    
    // NEW CODE: Hide Admin and Properties links for Clients/Demo users
    if (profile && (profile.role === 'client' || profile.role === 'demo')) {
      document.querySelectorAll('a[href="/properties"], a[href="/admin"]').forEach(el => el.classList.add('jb-hidden'));
    }
    
    return profile;
  };

  const fetchDiagnosticsData = async (buildingId) => {
    const [buildingRes, projectsRes, measurementsRes] = await Promise.all([
      supabase.from('buildings').select('*').eq('id', buildingId).single(),
      supabase.from('projects').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }),
      supabase.from('measurements').select(`id, created_at, value, unit, status_flag, client_facing_wording, measurement_points(element_code)`).eq('building_id', buildingId)
    ]);
    return { building: buildingRes.data, currentProject: projectsRes.data?.[0], measurements: measurementsRes.data || [] };
  };

  const renderRowHTML = (m, metricName) => {
    const statusCap = m.status_flag.charAt(0).toUpperCase() + m.status_flag.slice(1);
    return `<tr data-id="${m.id}"><td><button class="jb-img-btn"><svg style="width:14px;height:14px"><use href="#i-img"/></svg></button></td><td>${metricName}</td><td class="jb-font-mono jb-tabular">${m.value} ${m.unit}</td><td><span class="jb-status-badge jb-status-${m.status_flag}"><span class="jb-badge-dot"></span>${statusCap}</span></td><td style="color:var(--muted-foreground)">${m.client_facing_wording || '-'}</td></tr>`;
  };

  const renderMobileCardHTML = (m, metricName) => {
    const statusCap = m.status_flag.charAt(0).toUpperCase() + m.status_flag.slice(1);
    return `<div class="jb-mobile-data-card" data-id="${m.id}"><div class="jb-mobile-card-header"><div style="font-size:12.5px;font-weight:500">${metricName}</div><span class="jb-status-badge jb-status-${m.status_flag}"><span class="jb-badge-dot"></span>${statusCap}</span></div><div class="jb-font-mono jb-tabular" style="font-size:13px">${m.value} ${m.unit}</div><div style="font-size:11px;color:var(--muted-foreground)">${m.client_facing_wording || '-'}</div><button class="jb-mobile-img-btn"><svg style="width:12px;height:12px"><use href="#i-img"/></svg> View imagery</button></div>`;
  };

  const mapToDOM = (data) => {
    const assetName = `${data.currentProject?.project_code || 'PRJ-000'} — ${data.building.address_line_1}`;
    if (DOM.desktopSidebarAsset) DOM.desktopSidebarAsset.textContent = assetName;
    if (DOM.desktopHeaderAsset) DOM.desktopHeaderAsset.textContent = assetName;
    const thermalCodes = ['U-VALUE', 'THERMAL_BRIDGE'];
    const airCodes = ['ACH50', 'ELA'];
    const thermals = [], airTights = [];
    data.measurements.forEach(m => {
      measurementsStore[m.id] = m;
      const code = m.measurement_points?.element_code;
      if (thermalCodes.includes(code)) thermals.push(m);
      if (airCodes.includes(code)) airTights.push(m);
    });

    if (DOM.tbodyThermal && DOM.mgridThermal && DOM.countThermal) {
      DOM.countThermal.textContent = `${thermals.length} entries`;
      thermals.forEach(m => {
        const title = m.measurement_points.element_code === 'U-VALUE' ? 'Assembly U-Value' : 'Linear Thermal Bridging (ψ)';
        DOM.tbodyThermal.insertAdjacentHTML('beforeend', renderRowHTML(m, title));
        DOM.mgridThermal.insertAdjacentHTML('beforeend', renderMobileCardHTML(m, title));
      });
    }

    if (DOM.tbodyAir && DOM.mgridAir && DOM.countAir) {
      DOM.countAir.textContent = `${airTights.length} entries`;
      airTights.forEach(m => {
        const title = m.measurement_points.element_code === 'ACH50' ? 'ACH50 Air Infiltration Rate' : 'Envelope Leakage Area (ELA)';
        DOM.tbodyAir.insertAdjacentHTML('beforeend', renderRowHTML(m, title));
        DOM.mgridAir.insertAdjacentHTML('beforeend', renderMobileCardHTML(m, title));
      });
    }

    document.querySelectorAll('tr[data-id], .jb-mobile-data-card[data-id]').forEach(el => {
      const btn = el.querySelector('button');
      if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); openModal(el.getAttribute('data-id'), el.querySelector('td:nth-child(2)')?.textContent || el.querySelector('.jb-mobile-card-header div').textContent); });
    });
  };

  const openModal = (id, metricName) => {
    const m = measurementsStore[id];
    if (!m) return;
    DOM.mTitle.textContent = metricName; DOM.mLabel.textContent = metricName.toUpperCase(); DOM.mValue.textContent = `${m.value} ${m.unit}`;
    const d = new Date(m.created_at);
    DOM.mCapture.textContent = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    DOM.mOp.textContent = 'J. Builds Analyst';
    DOM.mInst.textContent = m.measurement_points.element_code === 'ACH50' ? 'Retrotec 3000' : 'FLIR E76';
    DOM.mCameraMeta.textContent = m.measurement_points.element_code === 'ACH50' ? 'RETROTEC · diff pressure' : 'FLIR · 320x240 · ε 0.95';
    DOM.mNotes.textContent = m.client_facing_wording;
    DOM.modal.classList.remove('jb-hidden');
  };

  const init = async () => {
    initUIEvents();
    if (!window.supabase) return;
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    try {
      const profile = await authAndGetProfile();
      if (profile?.building_id) {
        const diagnosticsData = await fetchDiagnosticsData(profile.building_id);
        mapToDOM(diagnosticsData);
      }
    } catch (error) {
      console.error(error);
      window.location.href = '/login';
    }
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsDiagnostics.init);
} else { JoeBuildsDiagnostics.init(); }
