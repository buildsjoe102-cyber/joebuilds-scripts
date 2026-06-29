/**
 * Joe Builds Home Intelligence Platform
 * Dashboard Controller (v13 - JWT Security Lockdown)
 */
const JoeBuildsDashboard = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_xla-awjgU2npKzrWHdYKDQ_2ox0CWmC';
  let supabase;

  const DOM = { 
    integrityValue: document.querySelector('.jb-integrity-value'), 
    integrityBadge: document.querySelector('.jb-integrity-badge'), 
    heroProjectDate: document.querySelector('.jb-hero-left .jb-font-mono'), 
    footerProject: document.querySelector('.jb-footer-project'), 
    desktopAsset: document.querySelectorAll('.jb-desktop-telemetry .jb-text-foreground')[0], 
    matrixContainer: document.querySelector('.jb-telemetry-matrix'), 
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
    modalGraph: document.querySelector('.jb-modal-graph-panel'), 
    closeBtns: [document.getElementById('modalHeaderCloseBtn'), document.getElementById('modalFooterCloseBtn')], 
    ctaTitle: document.querySelector('.jb-cta-title'), 
    ctaBtn: document.querySelector('.jb-cta-action-btn'), 
    sidebarMeta: document.querySelector('.jb-footer-meta, .sidebar-footer > div:last-child') 
  };

  const toggleSkeletonState = (isLoading) => { 
    const elementsToToggle = [DOM.integrityValue, DOM.desktopAsset, DOM.heroProjectDate, DOM.ctaTitle, DOM.sidebarMeta]; 
    DOM.metricCards.forEach(card => { elementsToToggle.push(card.querySelector('.jb-metric-string'), card.querySelector('.jb-metric-description'), card.querySelector('.jb-status-badge')); }); 
    elementsToToggle.forEach(el => { if (!el) return; if (isLoading) el.classList.add('jb-skeleton-block'); else el.classList.remove('jb-skeleton-block'); }); 
  };

  const renderEmptyState = () => {
    if (DOM.integrityBadge) DOM.integrityBadge.classList.add('jb-hidden');
    if (DOM.desktopAsset) DOM.desktopAsset.textContent = "Unassigned Home";
    if (DOM.footerProject) DOM.footerProject.textContent = "No Property Linked";
    if (DOM.heroProjectDate) DOM.heroProjectDate.textContent = "Pending Assignment";
    if (DOM.sidebarMeta) DOM.sidebarMeta.textContent = "Pending Assignment";
    
    const pageTitle = document.querySelector('.jb-page-title'); 
    const pageDesc = document.querySelector('.jb-page-description');
    if (pageTitle) pageTitle.textContent = "Account Pending Assignment";
    if (pageDesc) pageDesc.textContent = "Your profile has been successfully created. However, no physical property has been linked to your account yet.";
    
    if (DOM.matrixContainer) { 
      DOM.matrixContainer.style.display = 'block'; DOM.matrixContainer.style.background = 'transparent'; DOM.matrixContainer.style.border = 'none'; 
      DOM.matrixContainer.innerHTML = `<div style="text-align:center; padding: 6rem 2rem; background: var(--surface); border: 1px dashed var(--border); margin-bottom: 3rem;"><h3 style="font-size: 20px; font-weight: 500; margin-bottom: 0.5rem; color: var(--foreground);">Dashboard Empty</h3><p style="color: var(--muted-foreground); font-size: 14px; max-width: 400px; margin: 0 auto;">Your dashboard will be populated with live measurement data once an administrator assigns a property to your account.</p></div>`; 
    }
  };

  const initUIEvents = () => {
    if (DOM.modalForensicBtn) DOM.modalForensicBtn.addEventListener('click', () => { window.location.href = '/diagnostics'; });
    if (DOM.ctaBtn) DOM.ctaBtn.addEventListener('click', () => { window.location.href = '/pathway'; });
    DOM.metricCards.forEach(card => { 
      card.addEventListener('click', () => { 
        const status = card.getAttribute('data-status') || 'unknown'; 
        DOM.mTitle.textContent = card.getAttribute('data-title'); 
        DOM.mStatusText.textContent = card.getAttribute('data-badge'); 
        DOM.mCurrent.textContent = card.getAttribute('data-current'); 
        DOM.mCommentary.textContent = card.getAttribute('data-commentary'); 
        DOM.mRec.textContent = card.getAttribute('data-rec'); 
        DOM.mStatusBadge.className = `jb-status-badge jb-status-${status}`; 
        DOM.mStatusDot.className = `jb-badge-dot bg-${status}`; 
        DOM.modal.classList.remove('jb-hidden'); 
      }); 
    });
    DOM.closeBtns.forEach(btn => { if (btn) btn.addEventListener('click', () => DOM.modal.classList.add('jb-hidden')); });
    if(DOM.modal) DOM.modal.addEventListener('click', (e) => { if (e.target === DOM.modal) DOM.modal.classList.add('jb-hidden'); });
  };

  const fetchData = async (buildingId) => {
    const [buildingRes, projectsRes, diagnosticsRes, measurementsRes, scenariosRes] = await Promise.all([ 
      supabase.from('buildings').select('*').eq('id', buildingId).single(), 
      supabase.from('projects').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }), 
      supabase.from('diagnostic_events').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }).limit(1), 
      supabase.from('measurements').select(`*, measurement_points(zone_code, element_code)`).eq('building_id', buildingId), 
      supabase.from('upgrade_scenarios').select('*').eq('building_id', buildingId).order('step_number', { ascending: true }) 
    ]);
    return { building: buildingRes.data, currentProject: projectsRes.data?.[0], latestDiagnostic: diagnosticsRes.data?.[0], measurements: measurementsRes.data, scenarios: scenariosRes.data };
  };

  const getBadgeText = (status) => { if(status === 'risk') return 'At Risk'; if(status === 'review') return 'Review Required'; if(!status) return 'Unknown'; return status.charAt(0).toUpperCase() + status.slice(1); };

  const mapMeasurementToCard = (data, elementCode, cardTitle, prefixText = '') => {
    const m = data.measurements?.find(x => x.measurement_points?.element_code === elementCode);
    if (m) {
      const card = Array.from(DOM.metricCards).find(c => c.getAttribute('data-title') === cardTitle); if (!card) return;
      card.setAttribute('data-status', m.status_flag || 'unknown'); 
      card.setAttribute('data-badge', getBadgeText(m.status_flag)); 
      card.setAttribute('data-current', `${prefixText} ${m.value || ''} ${m.unit || ''}`.trim()); 
      card.setAttribute('data-commentary', m.client_facing_wording || 'Ongoing measurement active.'); 
      card.setAttribute('data-rec', "Consult pathway for recommended next actions.");
      
      const valueEl = card.querySelector('.jb-metric-string'); 
      const descEl = card.querySelector('.jb-metric-description');
      if (valueEl) valueEl.textContent = `${prefixText} ${m.value || ''} ${m.unit || ''}`.trim(); 
      if (descEl) descEl.textContent = m.client_facing_wording || 'Ongoing measurement active.';
      
      const badgeEl = card.querySelector('.jb-status-badge'); 
      const dotEl = card.querySelector('.jb-badge-dot');
      if (badgeEl && dotEl) { 
        badgeEl.className = `jb-status-badge jb-status-${m.status_flag || 'unknown'}`; 
        dotEl.className = `jb-badge-dot bg-${m.status_flag || 'unknown'}`; 
        badgeEl.innerHTML = `<span class="${dotEl.className}"></span>${getBadgeText(m.status_flag)}`; 
      }
    }
  };

  const init = async () => {
    toggleSkeletonState(true); 
    initUIEvents();
    
    const pageTitle = document.querySelector('.jb-page-title');
    if (pageTitle) pageTitle.textContent = "Your Measured Home Record";
    const pageDesc = document.querySelector('.jb-page-description');
    if (pageDesc) pageDesc.innerHTML = `Latest baseline assessment conducted <span class="jb-font-mono jb-text-foreground">2026-05-18</span>. Measurement data below reflects the most recent condition across the building envelope, mechanical systems, and habitable zones.`;
    if (DOM.modalForensicBtn) DOM.modalForensicBtn.textContent = 'Open Measurement Log';

    if (!window.supabase) return; 

    // SECURE TOKEN HANDSHAKE VIA CUSTOM FIELD
    let supabaseToken = '';
      try { 
        const memberReq = await window.$memberstackDom.getCurrentMember();
        if (memberReq && memberReq.data && memberReq.data.customFields && memberReq.data.customFields['supabase-jwt']) {
            supabaseToken = memberReq.data.customFields['supabase-jwt'];
        }
      } catch(e) { console.warn("No Supabase token found"); }

    // 2. Initialize Supabase with the Publishable Key AND the Token
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: supabaseToken ? { Authorization: `Bearer ${supabaseToken}` } : {} }
    });
    
    try {
      const member = await window.$memberstackDom.getCurrentMember();
      const { data: profile } = await supabase.from('profiles').select('building_id').eq('memberstack_id', member.data.id).single();
      
      let targetBuildingId = profile?.building_id;
      
      // THE DEMO OVERRIDE (Protected by DB RLS)
      if (!targetBuildingId && localStorage.getItem('jb_demo_mode') === 'true') { 
        const { data: demoB } = await supabase.from('buildings').select('id').eq('building_code', 'DEMO-001').single(); 
        if (demoB) targetBuildingId = demoB.id; 
      }
      
      if (targetBuildingId) {
        const data = await fetchData(targetBuildingId);
        if (data.building) {
          const assetName = `${data.currentProject?.project_code || 'PRJ-000'} — ${data.building.address_line_1}`;
          if (DOM.footerProject) DOM.footerProject.textContent = assetName; 
          if (DOM.desktopAsset) DOM.desktopAsset.textContent = assetName;
          
          const state = data.building.state || 'WA'; 
          if (DOM.sidebarMeta) DOM.sidebarMeta.textContent = state === 'WA' ? 'Zone 5 — Warm Temperate' : 'Zone 6 — Mild Temperate';
          
          const envMetric = data.measurements?.find(x => x.measurement_points?.element_code === 'ENVELOPE'); 
          if (envMetric && DOM.integrityValue) DOM.integrityValue.innerHTML = `${envMetric.value}<span class="jb-integrity-fraction">/1.00</span>`;
          
          if (data.scenarios && DOM.ctaTitle) { 
            const nextAction = data.scenarios.find(s => s.status === 'in-progress' || s.status === 'locked'); 
            if (nextAction) DOM.ctaTitle.textContent = nextAction.title; 
            else DOM.ctaTitle.textContent = "All Current Pathways Completed"; 
          }
          
          mapMeasurementToCard(data, 'ENVELOPE', 'Envelope Integrity', 'Integrity Index'); 
          mapMeasurementToCard(data, 'U-VALUE', 'Thermal Enclosure Performance', 'U-value'); 
          mapMeasurementToCard(data, 'MOISTURE', 'Structural Moisture Risk', 'Subfloor RH'); 
          mapMeasurementToCard(data, 'CO2', 'Indoor Air Quality (IAQ)', 'CO₂ avg'); 
          mapMeasurementToCard(data, 'READINESS', 'Upgrade Sequence Readiness', ''); 
          mapMeasurementToCard(data, 'PRIORITY', 'Active Priority Recommendation', '');
        }
      } else { 
        renderEmptyState(); 
      }
      toggleSkeletonState(false);
    } catch (error) {}
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsDashboard.init); } else { JoeBuildsDashboard.init(); }
