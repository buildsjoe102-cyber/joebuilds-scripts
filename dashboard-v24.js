/**
 * Joe Builds Home Intelligence Platform
 * Dashboard Controller (v24 - Dynamic Date Injection Fix)
 */
const JoeBuildsDashboard = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_xla-awjgU2npKzrWHdYKDQ_2ox0CWmC';
  let supabase;
  let DOM = {}; 

  const toggleSkeletonState = (isLoading) => { 
    if(!DOM.metricCards) return;
    const elementsToToggle = [
        DOM.integrityValue, 
        DOM.desktopAsset, 
        DOM.headerClimateText, 
        DOM.headerSysText, 
        DOM.sidebarAsset, 
        DOM.ctaTitle, 
        DOM.sidebarMeta
    ]; 
    DOM.metricCards.forEach(card => { 
        elementsToToggle.push(card.querySelector('.jb-metric-string'), card.querySelector('.jb-metric-description'), card.querySelector('.jb-status-badge')); 
    }); 
    elementsToToggle.forEach(el => { 
        if (!el) return; 
        if (isLoading) el.classList.add('jb-skeleton-block'); 
        else el.classList.remove('jb-skeleton-block'); 
    }); 
  };

  const initUIEvents = () => {
    if (DOM.modalForensicBtn) DOM.modalForensicBtn.addEventListener('click', () => { window.location.href = '/diagnostics'; });
    if (DOM.ctaBtn) DOM.ctaBtn.addEventListener('click', () => { window.location.href = '/pathway'; });
    
    if (DOM.metricCards) {
      DOM.metricCards.forEach(card => { 
        card.addEventListener('click', () => { 
          const status = card.getAttribute('data-status') || 'unknown'; 
          if(DOM.mTitle) DOM.mTitle.textContent = card.getAttribute('data-title'); 
          if(DOM.mStatusBadge) DOM.mStatusBadge.className = `jb-status-badge jb-status-${status}`; 
          if(DOM.mStatusDot) DOM.mStatusDot.className = `jb-badge-dot bg-${status}`; 
          if(DOM.mStatusText) DOM.mStatusText.textContent = card.getAttribute('data-badge'); 
          
          const modalBody = document.querySelector('.jb-modal-body');
          if (modalBody) {
             modalBody.innerHTML = `
              <div style="padding: 2.5rem 1.5rem; background: var(--border); border-radius: 4px; text-align: center; margin-bottom: 1.5rem;">
                  <div class="jb-eyebrow">Current Record</div>
                  <div style="font-size: 28px; font-family: var(--font-mono); color: var(--foreground); font-weight: 500; margin-top: 0.5rem; letter-spacing:-0.02em;">${card.getAttribute('data-current') || '-'}</div>
              </div>
              <div style="display:flex; flex-direction:column; gap: 1.5rem; padding: 0 0.5rem;">
                  <div>
                      <div class="jb-eyebrow" style="color:var(--muted-foreground);">Analyst Commentary</div>
                      <p style="font-size: 13.5px; color: var(--foreground); line-height: 1.6; margin-top: 0.5rem;">${card.getAttribute('data-commentary')}</p>
                  </div>
                  <div style="padding-top: 1rem; border-top: 1px solid var(--border);">
                      <div class="jb-eyebrow" style="color:var(--muted-foreground);">Recommended Action</div>
                      <p style="font-size: 13px; color: var(--muted-foreground); line-height: 1.6; margin-top: 0.5rem;">${card.getAttribute('data-rec')}</p>
                  </div>
              </div>
              <div class="jb-modal-footer" style="margin-top: 2.5rem; padding:0; border-top:none; background:transparent;">
                  <button class="jb-btn-secondary" id="modalFooterCloseBtn">Close Details</button>
                  <button class="jb-btn-primary" onclick="window.location.href='/diagnostics'">View Raw Logs</button>
              </div>`;
             
             document.getElementById('modalFooterCloseBtn').addEventListener('click', () => DOM.modal.classList.add('jb-hidden'));
          }

          if(DOM.modal) DOM.modal.classList.remove('jb-hidden'); 
        }); 
      });
    }

    if (DOM.closeBtns) { DOM.closeBtns.forEach(btn => { if (btn) btn.addEventListener('click', () => DOM.modal.classList.add('jb-hidden')); }); }
    if(DOM.modal) DOM.modal.addEventListener('click', (e) => { if (e.target === DOM.modal) DOM.modal.classList.add('jb-hidden'); });
  };

  const fetchData = async (buildingId) => {
    const [bRes, pRes, mRes, sRes, sessRes, issueRes] = await Promise.all([ 
      supabase.from('buildings').select('*').eq('id', buildingId).single(), 
      supabase.from('projects').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }), 
      supabase.from('measurements').select(`*, measurement_points(zone_code, element_code)`).eq('building_id', buildingId), 
      supabase.from('upgrade_scenarios').select('*').eq('building_id', buildingId).order('step_number', { ascending: true }),
      supabase.from('assessment_sessions').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }),
      supabase.from('issues_findings').select('*').eq('building_id', buildingId).order('created_at', { ascending: false })
    ]);
    return { building: bRes.data, currentProject: pRes.data?.[0], measurements: mRes.data, scenarios: sRes.data, sessions: sessRes.data, issues: issueRes.data };
  };

  const getBadgeText = (status) => { if(status === 'risk') return 'At Risk'; if(status === 'review') return 'Review Required'; if(!status) return 'Unknown'; return status.charAt(0).toUpperCase() + status.slice(1); };

  const mapMeasurementToCard = (data, elementCode, cardTitle, prefixText = '') => {
    const m = data.measurements?.find(x => x.measurement_points?.element_code === elementCode);
    if (m) {
      const card = Array.from(DOM.metricCards).find(c => c.getAttribute('data-title') === cardTitle); if (!card) return;
      card.setAttribute('data-status', m.status_flag || 'unknown'); 
      card.setAttribute('data-badge', getBadgeText(m.status_flag)); 
      
      let displayString = `${m.value || ''} ${m.unit || ''}`.trim();
      if (prefixText) { displayString = `${prefixText} ${displayString}`; }
      
      card.setAttribute('data-current', displayString); 
      card.setAttribute('data-commentary', m.client_facing_wording || 'Ongoing measurement active.'); 
      card.setAttribute('data-rec', "Consult pathway for recommended next actions.");
      
      const valueEl = card.querySelector('.jb-metric-string'); 
      const descEl = card.querySelector('.jb-metric-description');
      if (valueEl) valueEl.textContent = displayString; 
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

  const mapIssueToPriorityCard = (issues) => {
    if (!DOM.metricCards) return;
    const card = Array.from(DOM.metricCards).find(c => c.getAttribute('data-title') === 'Active Priority Recommendation'); if (!card) return;
    
    const activeIssue = issues?.find(i => i.status !== 'Closed' && i.status !== 'Stable') || null;
    
    if (activeIssue) {
        let statusClass = 'measured';
        if (activeIssue.status === 'At Risk') statusClass = 'risk';
        if (activeIssue.status === 'Action Required') statusClass = 'review';

        const valueEl = card.querySelector('.jb-metric-string'); 
        const descEl = card.querySelector('.jb-metric-description');
        if (valueEl) valueEl.textContent = activeIssue.issue_type || 'Investigation Required'; 
        if (descEl) descEl.textContent = activeIssue.client_facing_wording || 'Requires immediate operator review.';
        
        const badgeEl = card.querySelector('.jb-status-badge'); 
        const dotEl = card.querySelector('.jb-badge-dot');
        if (badgeEl && dotEl) { 
            badgeEl.className = `jb-status-badge jb-status-${statusClass}`; 
            dotEl.className = `jb-badge-dot bg-${statusClass}`; 
            badgeEl.innerHTML = `<span class="${dotEl.className}"></span>${activeIssue.status}`; 
        }

        card.setAttribute('data-status', statusClass);
        card.setAttribute('data-badge', activeIssue.status);
        card.setAttribute('data-current', activeIssue.issue_type || 'Review Action');
        card.setAttribute('data-commentary', activeIssue.client_facing_wording || 'Operator intervention requested.');
        card.setAttribute('data-rec', activeIssue.recommended_action || "Coordinate with operator via Controlled Upgrade Pathway.");

    } else {
        const valueEl = card.querySelector('.jb-metric-string'); 
        const descEl = card.querySelector('.jb-metric-description');
        if (valueEl) valueEl.textContent = 'No Action Required'; 
        if (descEl) descEl.textContent = 'All diagnostic parameters within safe limits.';
        const badgeEl = card.querySelector('.jb-status-badge'); 
        if (badgeEl) { badgeEl.className = `jb-status-badge jb-status-stable`; badgeEl.innerHTML = `<span class="jb-badge-dot bg-stable"></span>Stable`; }
        
        card.setAttribute('data-status', 'stable');
        card.setAttribute('data-badge', 'Stable');
        card.setAttribute('data-current', 'Stable');
        card.setAttribute('data-commentary', 'All structural and environmental diagnostics report stable.');
        card.setAttribute('data-rec', 'No intervention required.');
    }
  };

  const mapHistoricalLog = (sessions) => {
    if (!DOM.metricCards) return;
    const card = Array.from(DOM.metricCards).find(c => c.getAttribute('data-title') === 'Historical Diagnostic Log');
    if (!card) return;
    const valueEl = card.querySelector('.jb-metric-string');
    const descEl = card.querySelector('.jb-metric-description');
    const count = sessions?.length || 0;
    
    if (valueEl) valueEl.textContent = `${count} entries`;
    
    let histDate = 'No historical sessions logged.';
    if (count > 0 && sessions[0].assessment_date) {
        histDate = `Last entry: ${new Date(sessions[0].assessment_date).toLocaleDateString('en-GB')}.`;
    }
    if (descEl) descEl.textContent = histDate;
    
    card.setAttribute('data-status', 'stable');
    card.setAttribute('data-badge', 'Stable');
    card.setAttribute('data-current', `${count} Total Assessments`);
    card.setAttribute('data-commentary', 'The system maintains a secure log of all operator visits and calibration cycles.');
    card.setAttribute('data-rec', histDate);
  };

  const mapReadiness = (scenarios) => {
    if (!DOM.metricCards) return;
    const card = Array.from(DOM.metricCards).find(c => c.getAttribute('data-title') === 'Upgrade Sequence Readiness');
    if (!card) return;
    
    const valueEl = card.querySelector('.jb-metric-string');
    const descEl = card.querySelector('.jb-metric-description');
    if (!scenarios || scenarios.length === 0) return;
    
    const completed = scenarios.filter(s => s.status === 'completed').length;
    const total = scenarios.length;
    if (valueEl) valueEl.textContent = `${completed} / ${total} Phases`;
    
    const active = scenarios.find(s => s.status === 'in-progress');
    const descText = active ? `Currently active: ${active.title}` : 'All pathways completed.';
    if (descEl) descEl.textContent = descText;
    
    const badgeEl = card.querySelector('.jb-status-badge');
    const dotEl = card.querySelector('.jb-badge-dot');
    if (badgeEl && dotEl) {
        badgeEl.className = `jb-status-badge jb-status-measured`;
        dotEl.className = `jb-badge-dot bg-measured`;
        badgeEl.innerHTML = `<span class="${dotEl.className}"></span>Measured`;
    }

    card.setAttribute('data-status', 'measured');
    card.setAttribute('data-badge', 'Measured');
    card.setAttribute('data-current', `${completed} of ${total} Phases Unlocked`);
    card.setAttribute('data-commentary', 'This metric ensures capital is only deployed when underlying physics permit it.');
    card.setAttribute('data-rec', descText);
  };

  const init = async () => {
    DOM = { 
      integrityValue: document.querySelector('.jb-integrity-value'), 
      integrityBadge: document.querySelector('.jb-integrity-badge'), 
      heroDesc: document.querySelector('.jb-page-description'), // The anchor for the dynamic date!
      desktopAsset: document.getElementById('desktopHeaderAsset'), 
      sidebarAsset: document.getElementById('desktopSidebarAsset') || document.querySelector('.jb-footer-project'),
      sidebarMeta: document.getElementById('desktopSidebarMeta') || document.querySelector('.jb-footer-meta') || document.querySelector('.sidebar-footer .text-muted-foreground'),
      metricCards: document.querySelectorAll('.jb-matrix-card'), 
      ctaTitle: document.querySelector('.jb-cta-title'), 
      ctaBtn: document.querySelector('.jb-cta-action-btn'),
      
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
      closeBtns: [document.getElementById('modalHeaderCloseBtn'), document.getElementById('modalFooterCloseBtn')]
    };

    toggleSkeletonState(true); 
    initUIEvents();

    if (!window.supabase) return; 

    let supabaseToken = '';
      try { 
        const memberReq = await window.$memberstackDom.getCurrentMember();
        if (memberReq?.data?.customFields?.['supabase-jwt']) {
            supabaseToken = memberReq.data.customFields['supabase-jwt'];
        }
      } catch(e) { }

    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: supabaseToken ? { Authorization: `Bearer ${supabaseToken}` } : {} }
    });
    
    try {
      const member = await window.$memberstackDom.getCurrentMember();
      const { data: profile } = await supabase.from('profiles').select('building_id, role').eq('memberstack_id', member.data.id).single();
      
      let targetBuildingId = profile?.building_id;
      
      if (!targetBuildingId && (profile?.role === 'admin' || profile?.role === 'operator')) {
         const { data: fallbackB } = await supabase.from('buildings').select('id').order('created_at', { ascending: false }).limit(1).single();
         if (fallbackB) targetBuildingId = fallbackB.id;
      }
      if (!targetBuildingId && localStorage.getItem('jb_demo_mode') === 'true') { 
        const { data: demoB } = await supabase.from('buildings').select('id').eq('building_code', 'DEMO-001').single(); 
        if (demoB) targetBuildingId = demoB.id; 
      }
      
      if (targetBuildingId) {
        const data = await fetchData(targetBuildingId);
        if (data.building) {
          const assetName = `${data.building.building_code || data.currentProject?.project_code || 'PRJ'} — ${data.building.address_line_1}`;
          if (DOM.sidebarAsset) DOM.sidebarAsset.textContent = assetName; 
          
          if (DOM.desktopAsset && !document.getElementById('clientPropertySwitcher')) {
              DOM.desktopAsset.textContent = assetName;
          }
          
          const state = data.building.state || 'WA'; 
          const climateText = state === 'WA' ? 'Zone 5 — Warm Temperate' : 'Zone 6 — Mild Temperate';
          
          const headerTabs = document.querySelectorAll('.header-telemetry-cluster .tabular, .header-telemetry-cluster .jb-tabular, .jb-desktop-telemetry .tabular, .jb-desktop-telemetry .jb-tabular');
          if (headerTabs[1]) headerTabs[1].textContent = climateText;
          if (headerTabs[2]) headerTabs[2].textContent = data.building.status || "Pending";
          
          if (DOM.sidebarMeta) DOM.sidebarMeta.textContent = climateText;

          // INJECT DYNAMIC LATEST ASSESSMENT DATE (FIXED ANCHOR)
          if (DOM.heroDesc && data.sessions && data.sessions.length > 0 && data.sessions[0].assessment_date) {
              const latestDate = new Date(data.sessions[0].assessment_date).toLocaleDateString('en-GB');
              let dateInsert = document.getElementById('jb-dynamic-date');
              if (!dateInsert) {
                  dateInsert = document.createElement('div');
                  dateInsert.id = 'jb-dynamic-date';
                  dateInsert.className = 'jb-font-mono';
                  dateInsert.style.cssText = 'margin-top: 1rem; color: var(--status-stable); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold;';
                  DOM.heroDesc.parentNode.insertBefore(dateInsert, DOM.heroDesc.nextSibling);
              }
              dateInsert.textContent = `LATEST ASSESSMENT CONDUCTED: ${latestDate}`;
          }
          
          const envMetric = data.measurements?.find(x => x.measurement_points?.element_code === 'ENVELOPE'); 
          if (envMetric && DOM.integrityValue) DOM.integrityValue.innerHTML = `${envMetric.value || '0.00'}<span class="jb-integrity-fraction">/1.00</span>`;
          
          if (data.scenarios && DOM.ctaTitle) { 
            const nextAction = data.scenarios.find(s => s.status === 'in-progress' || s.status === 'locked'); 
            if (nextAction) DOM.ctaTitle.textContent = nextAction.title; 
            else DOM.ctaTitle.textContent = "All Current Pathways Completed"; 
          }
          
          mapMeasurementToCard(data, 'ENVELOPE', 'Building Envelope Condition', 'Integrity Index'); 
          mapMeasurementToCard(data, 'U-VALUE', 'Thermal Enclosure Performance', 'U-value'); 
          mapMeasurementToCard(data, 'MOISTURE', 'Structural Moisture Risk', 'Subfloor RH'); 
          mapMeasurementToCard(data, 'CO2', 'Indoor Air Quality (IAQ)', 'CO₂ avg'); 
          
          mapReadiness(data.scenarios);
          mapHistoricalLog(data.sessions);
          mapIssueToPriorityCard(data.issues);
        }
      }
      toggleSkeletonState(false);
    } catch (error) {}
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsDashboard.init); } else { JoeBuildsDashboard.init(); }
