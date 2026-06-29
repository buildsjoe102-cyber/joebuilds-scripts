/**
 * Joe Builds Home Intelligence Platform
 * Dashboard Controller (v15 - Admin Data Fallback)
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
    ctaTitle: document.querySelector('.jb-cta-title'), 
    sidebarMeta: document.querySelector('.jb-footer-meta, .sidebar-footer > div:last-child') 
  };

  const toggleSkeletonState = (isLoading) => { 
    const elementsToToggle = [DOM.integrityValue, DOM.desktopAsset, DOM.heroProjectDate, DOM.ctaTitle, DOM.sidebarMeta]; 
    DOM.metricCards.forEach(card => { elementsToToggle.push(card.querySelector('.jb-metric-string'), card.querySelector('.jb-metric-description'), card.querySelector('.jb-status-badge')); }); 
    elementsToToggle.forEach(el => { if (!el) return; if (isLoading) el.classList.add('jb-skeleton-block'); else el.classList.remove('jb-skeleton-block'); }); 
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
      
      // ADMIN FALLBACK
      if (!targetBuildingId && (profile?.role === 'admin' || profile?.role === 'operator')) {
         const { data: fallbackB } = await supabase.from('buildings').select('id').order('created_at', { ascending: false }).limit(1).single();
         if (fallbackB) targetBuildingId = fallbackB.id;
      }
      
      // DEMO OVERRIDE
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
      }
      toggleSkeletonState(false);
    } catch (error) {}
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsDashboard.init); } else { JoeBuildsDashboard.init(); }
