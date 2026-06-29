/**
 * Joe Builds Home Intelligence Platform
 * Dashboard Controller (v16 - Assessment & Issues Integration)
 */
const JoeBuildsDashboard = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_xla-awjgU2npKzrWHdYKDQ_2ox0CWmC';
  let supabase;

  const DOM = { 
    integrityValue: document.querySelector('.jb-integrity-value'), 
    integrityBadge: document.querySelector('.jb-integrity-badge'), 
    heroProjectDate: document.querySelector('.jb-page-description .jb-font-mono'), 
    desktopAsset: document.getElementById('desktopHeaderAsset'), 
    sidebarAsset: document.getElementById('desktopSidebarAsset'),
    metricCards: document.querySelectorAll('.jb-matrix-card'), 
    ctaTitle: document.querySelector('.jb-cta-title'), 
    sidebarMeta: document.querySelector('.sidebar-footer .text-muted-foreground') 
  };

  const toggleSkeletonState = (isLoading) => { 
    const elementsToToggle = [DOM.integrityValue, DOM.desktopAsset, DOM.sidebarAsset, DOM.heroProjectDate, DOM.ctaTitle, DOM.sidebarMeta]; 
    DOM.metricCards.forEach(card => { elementsToToggle.push(card.querySelector('.jb-metric-string'), card.querySelector('.jb-metric-description'), card.querySelector('.jb-status-badge')); }); 
    elementsToToggle.forEach(el => { if (!el) return; if (isLoading) el.classList.add('jb-skeleton-block'); else el.classList.remove('jb-skeleton-block'); }); 
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

  const mapIssueToPriorityCard = (issues) => {
    const card = Array.from(DOM.metricCards).find(c => c.getAttribute('data-title') === 'Active Priority Recommendation'); if (!card) return;
    
    // Find the most severe issue that is NOT closed
    const activeIssue = issues?.find(i => i.status !== 'Closed') || null;
    
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
    } else {
        // No active issues
        const valueEl = card.querySelector('.jb-metric-string'); 
        const descEl = card.querySelector('.jb-metric-description');
        if (valueEl) valueEl.textContent = 'No Action Required'; 
        if (descEl) descEl.textContent = 'All diagnostic parameters within safe limits.';
        const badgeEl = card.querySelector('.jb-status-badge'); 
        if (badgeEl) { badgeEl.className = `jb-status-badge jb-status-stable`; badgeEl.innerHTML = `<span class="jb-badge-dot bg-stable"></span>Stable`; }
    }
  };

  const init = async () => {
    toggleSkeletonState(true); 

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
          const assetName = `${data.currentProject?.project_code || 'PRJ-000'} — ${data.building.address_line_1}`;
          if (DOM.sidebarAsset) DOM.sidebarAsset.textContent = assetName; 
          if (DOM.desktopAsset) DOM.desktopAsset.textContent = assetName;
          
          const state = data.building.state || 'WA'; 
          if (DOM.sidebarMeta) DOM.sidebarMeta.textContent = state === 'WA' ? 'Zone 5 — Warm Temperate' : 'Zone 6 — Mild Temperate';

          // Inject latest assessment date dynamically
          if (DOM.heroProjectDate && data.sessions && data.sessions.length > 0) {
              const latestDate = new Date(data.sessions[0].created_at).toLocaleDateString('en-GB');
              DOM.heroProjectDate.textContent = latestDate;
          }
          
          const envMetric = data.measurements?.find(x => x.measurement_points?.element_code === 'ENVELOPE'); 
          if (envMetric && DOM.integrityValue) DOM.integrityValue.innerHTML = `${envMetric.value || '0.00'}<span class="jb-integrity-fraction">/1.00</span>`;
          
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
          
          // Use the new Findings engine for the Priority card
          mapIssueToPriorityCard(data.issues);
        }
      }
      toggleSkeletonState(false);
    } catch (error) {}
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsDashboard.init); } else { JoeBuildsDashboard.init(); }
