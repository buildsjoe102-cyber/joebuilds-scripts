/**
 * Joe Builds Home Intelligence Platform
 * Unified Dashboard Controller
 */
const JoeBuildsDashboard = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  let supabase;

  const DOM = {
    opLabel: document.getElementById('jbOperatorLabel'),
    opEmail: document.getElementById('jbOperatorEmail'),
    dropBtn: document.getElementById('jbOperatorDropdown'),
    opMenu: document.getElementById('jbOperatorMenu'),
    logoutBtn: document.getElementById('jbLogoutBtn'),
    integrityValue: document.querySelector('.jb-integrity-value'),
    heroProjectDate: document.querySelector('.jb-hero-left .jb-font-mono'),
    footerProject: document.querySelector('.jb-footer-project'),
    desktopAsset: document.querySelectorAll('.jb-desktop-telemetry .jb-text-foreground')[0],
    metricCards: document.querySelectorAll('.jb-matrix-card'),
    modal: document.getElementById('jbTelemetryModal'),
    modalForensicBtn: document.querySelector('.jb-btn-primary'),
    mTitle: document.getElementById('modalTitle'),
    mStatusBadge: document.getElementById('modalStatusBadge'),
    mStatusDot: document.getElementById('modalStatusDot'),
    mStatusText: document.getElementById('modalStatusText'),
    mCurrent: document.getElementById('mMetricCurrent'),
    mDelta7: document.getElementById('mMetricDelta7'),
    mDelta30: document.getElementById('mMetricDelta30'),
    mThreshold: document.getElementById('mMetricThreshold'),
    mCommentary: document.getElementById('modalCommentary'),
    mRec: document.getElementById('modalRecommendations'),
    closeBtns: [document.getElementById('modalHeaderCloseBtn'), document.getElementById('modalFooterCloseBtn')]
  };

  const initUIEvents = () => {
    if (DOM.dropBtn && DOM.opMenu) {
      DOM.dropBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExp = DOM.dropBtn.getAttribute('aria-expanded') === 'true';
        DOM.dropBtn.setAttribute('aria-expanded', !isExp);
        DOM.opMenu.classList.toggle('jb-hidden');
      });
      document.addEventListener('click', () => {
        DOM.dropBtn.setAttribute('aria-expanded', 'false');
        DOM.opMenu.classList.add('jb-hidden');
      });
    }
    if (DOM.logoutBtn) {
      DOM.logoutBtn.addEventListener('click', async () => {
        try { await window.$memberstackDom.logout(); window.location.href = '/login'; } catch (err) {}
      });
    }
    DOM.metricCards.forEach(card => {
      card.addEventListener('click', () => {
        DOM.mTitle.textContent = card.getAttribute('data-title');
        DOM.mStatusText.textContent = card.getAttribute('data-badge');
        DOM.mCurrent.textContent = card.getAttribute('data-current');
        DOM.mDelta7.textContent = card.getAttribute('data-delta7');
        DOM.mDelta30.textContent = card.getAttribute('data-delta30');
        DOM.mThreshold.textContent = card.getAttribute('data-threshold');
        DOM.mCommentary.textContent = card.getAttribute('data-commentary');
        DOM.mRec.textContent = card.getAttribute('data-rec');
        const status = card.getAttribute('data-status');
        DOM.mStatusBadge.className = `jb-status-badge jb-status-${status}`;
        DOM.mStatusDot.className = `jb-badge-dot bg-${status}`;
        DOM.modal.classList.remove('jb-hidden');
      });
    });
    DOM.closeBtns.forEach(btn => { if (btn) btn.addEventListener('click', () => DOM.modal.classList.add('jb-hidden')); });
    if(DOM.modal) DOM.modal.addEventListener('click', (e) => { if (e.target === DOM.modal) DOM.modal.classList.add('jb-hidden'); });
  };

  const authAndGetProfile = async () => {
    const member = await window.$memberstackDom.getCurrentMember();
    if (!member || !member.data) throw new Error("No Memberstack session.");
    if (DOM.opLabel) DOM.opLabel.textContent = member.data.customFields?.first_name || 'Client';
    if (DOM.opEmail) DOM.opEmail.textContent = `Logged in as: ${member.data.auth.email}`;
    
    const { data: profile } = await supabase.from('profiles').select('id, building_id, role').eq('memberstack_id', member.data.id).single();
    
    // NEW CODE: Reveal Admin and Properties links ONLY for Operators/Admins
    if (profile && (profile.role === 'admin' || profile.role === 'operator')) {
      const hideStyle = document.getElementById('rbac-hide-admin');
      if (hideStyle) hideStyle.remove(); // Deletes the CSS rule, instantly revealing the buttons
    }
    
    return profile;
  };

  const fetchData = async (buildingId) => {
    const [buildingRes, projectsRes, diagnosticsRes, measurementsRes] = await Promise.all([
      supabase.from('buildings').select('*').eq('id', buildingId).single(),
      supabase.from('projects').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }),
      supabase.from('diagnostic_events').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }).limit(1),
      supabase.from('measurements').select(`*, measurement_points(zone_code, element_code)`).eq('building_id', buildingId)
    ]);
    return { building: buildingRes.data, currentProject: projectsRes.data?.[0], latestDiagnostic: diagnosticsRes.data?.[0], measurements: measurementsRes.data };
  };

  const populateDashboard = (data) => {
    if (!data.building) return;
    if (DOM.modalForensicBtn && DOM.modalForensicBtn.textContent.includes('Forensic')) DOM.modalForensicBtn.textContent = 'Open Diagnostic Record';
    const assetName = `${data.currentProject?.project_code || 'PRJ-000'} — ${data.building.address_line_1}`;
    if (DOM.footerProject) DOM.footerProject.textContent = assetName;
    if (DOM.desktopAsset) DOM.desktopAsset.textContent = assetName;
    if (DOM.heroProjectDate && data.latestDiagnostic) DOM.heroProjectDate.textContent = new Date(data.latestDiagnostic.created_at).toISOString().split('T')[0];

    const moistureData = data.measurements?.find(m => m.measurement_points?.element_code === 'MOISTURE');
    if (moistureData) {
      updateCardAttributes('Structural Moisture Risk', {
        status: moistureData.status_flag,
        badge: moistureData.status_flag === 'risk' ? 'At Risk' : 'Stable',
        current: `${moistureData.value} ${moistureData.unit}`,
        commentary: moistureData.client_facing_wording,
        rec: "Resolve environmental vectors based on diagnostic guidelines."
      });
    }
  };

  const updateCardAttributes = (title, mappedData) => {
    const card = Array.from(DOM.metricCards).find(c => c.getAttribute('data-title') === title);
    if (!card) return;
    card.setAttribute('data-status', mappedData.status);
    card.setAttribute('data-badge', mappedData.badge);
    card.setAttribute('data-current', mappedData.current);
    card.setAttribute('data-commentary', mappedData.commentary);
    card.setAttribute('data-rec', mappedData.rec);
    const valueEl = card.querySelector('.jb-metric-string');
    const descEl = card.querySelector('.jb-metric-description');
    if (valueEl) valueEl.textContent = mappedData.current;
    if (descEl) descEl.textContent = mappedData.commentary;
    const badgeEl = card.querySelector('.jb-status-badge');
    const dotEl = card.querySelector('.jb-badge-dot');
    if (badgeEl && dotEl) {
      badgeEl.className = `jb-status-badge jb-status-${mappedData.status}`;
      dotEl.className = `jb-badge-dot bg-${mappedData.status}`;
      badgeEl.innerHTML = `<span class="${dotEl.className}"></span>${mappedData.badge}`;
    }
  };

  const init = async () => {
    initUIEvents();
    if (!window.supabase) return;
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    try {
      const profile = await authAndGetProfile();
      if (profile?.building_id) {
        const dashboardData = await fetchData(profile.building_id);
        populateDashboard(dashboardData);
      }
    } catch (error) {
      console.error(error);
      window.location.href = '/login';
    }
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsDashboard.init); } else { JoeBuildsDashboard.init(); }
