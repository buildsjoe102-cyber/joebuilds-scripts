/**
 * Joe Builds Home Intelligence Platform
 * Unified Dashboard Controller (Shimmer, Dynamic Graphs, Routing)
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
    modalGraphSVG: document.querySelector('.jb-modal-graph-panel svg'),
    closeBtns: [document.getElementById('modalHeaderCloseBtn'), document.getElementById('modalFooterCloseBtn')]
  };

  // Inject Shimmer CSS dynamically so you don't have to touch Webflow
  const injectStyles = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      .jb-shimmer {
        animation: jb-shimmer 1.5s infinite linear;
        background: linear-gradient(to right, rgba(165,179,154,0.1) 4%, rgba(165,179,154,0.3) 25%, rgba(165,179,154,0.1) 36%);
        background-size: 1000px 100%;
        color: transparent !important;
        border-radius: 4px;
        pointer-events: none;
      }
      .jb-shimmer * { opacity: 0; }
      @keyframes jb-shimmer {
        0% { background-position: -1000px 0; }
        100% { background-position: 1000px 0; }
      }
    `;
    document.head.appendChild(style);
  };

  // Math Engine to generate a unique SVG graph curve based on the metric's value
  const generateDynamicGraph = (currentValueString) => {
    let base = parseFloat(currentValueString);
    if (isNaN(base) || base === 0) base = 50; 

    // Generate 11 historical points with slight variance, 12th is current
    let points = [];
    for(let i=0; i<11; i++) {
       let variance = base * 0.12; // 12% fluctuation
       points.push(base + (Math.random() * variance * 2) - variance);
    }
    points.push(base); 

    let min = Math.min(...points);
    let max = Math.max(...points);
    let range = max - min || 1;
    let stepX = 300 / 11;

    let pathD = "";
    let circles = "";

    points.forEach((p, i) => {
       // Normalize to SVG height (64px) with padding
       let y = 64 - (((p - min) / range) * 50 + 7); 
       let x = i * stepX;
       if(i === 0) pathD += `M ${x} ${y} `;
       else pathD += `L ${x} ${y} `;
       circles += `<circle cx="${x}" cy="${y}" r="1.6" fill="currentColor"></circle>`;
    });

    return `
      <defs><pattern id="dgrid" width="25" height="16" patternUnits="userSpaceOnUse"><path d="M 25 0 L 0 0 0 16" fill="none" stroke="currentColor" stroke-opacity="0.08" stroke-width="0.5"></path></pattern></defs>
      <rect width="300" height="64" fill="url(#dgrid)"></rect>
      <path d="${pathD}" fill="none" stroke="currentColor" stroke-width="1.2"></path>
      ${circles}
    `;
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

    // Modal Routing Button
    if (DOM.modalForensicBtn) {
      DOM.modalForensicBtn.addEventListener('click', () => {
        window.location.href = '/diagnostics';
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
        
        // Inject Dynamic Graph
        if(DOM.modalGraphSVG) {
          DOM.modalGraphSVG.innerHTML = generateDynamicGraph(card.getAttribute('data-current'));
        }

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
    
    if (profile && (profile.role === 'admin' || profile.role === 'operator')) {
      const hideStyle = document.getElementById('rbac-hide-admin');
      if (hideStyle) hideStyle.remove(); 
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

  const getBadgeText = (status) => {
    if(status === 'risk') return 'At Risk';
    if(status === 'review') return 'Review Required';
    if(!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const mapMeasurementToCard = (data, elementCode, cardTitle, prefixText = '') => {
    const m = data.measurements?.find(x => x.measurement_points?.element_code === elementCode);
    if (m) {
      updateCardAttributes(cardTitle, {
        status: m.status_flag || 'unknown',
        badge: getBadgeText(m.status_flag),
        current: `${prefixText} ${m.value || ''} ${m.unit || ''}`.trim(),
        commentary: m.client_facing_wording || 'System tracking active.',
        rec: "Consult pathway for recommended next actions." 
      });

      // Update Top Right Integrity Index Badge specifically
      if (elementCode === 'ENVELOPE' && DOM.integrityValue) {
        DOM.integrityValue.innerHTML = `${m.value}<span class="jb-integrity-fraction">/1.00</span>`;
      }
    }
  };

  const populateDashboard = (data) => {
    if (!data.building) return;
    
    if (DOM.modalForensicBtn && DOM.modalForensicBtn.textContent.includes('Forensic')) {
      DOM.modalForensicBtn.textContent = 'Open Diagnostic Record';
    }

    const assetName = `${data.currentProject?.project_code || 'PRJ-000'} — ${data.building.address_line_1}`;
    if (DOM.footerProject) DOM.footerProject.textContent = assetName;
    if (DOM.desktopAsset) DOM.desktopAsset.textContent = assetName;
    if (DOM.heroProjectDate && data.latestDiagnostic) {
      DOM.heroProjectDate.textContent = new Date(data.latestDiagnostic.created_at).toISOString().split('T')[0];
    }

    mapMeasurementToCard(data, 'ENVELOPE', 'Building Envelope Condition', 'Integrity Index');
    mapMeasurementToCard(data, 'U-VALUE', 'Thermal Enclosure Performance', 'U-value');
    mapMeasurementToCard(data, 'MOISTURE', 'Structural Moisture Risk', 'Subfloor RH');
    mapMeasurementToCard(data, 'CO2', 'Indoor Air Quality (IAQ)', 'CO₂ avg');
    mapMeasurementToCard(data, 'READINESS', 'Upgrade Sequence Readiness', '');
    mapMeasurementToCard(data, 'PRIORITY', 'Active Priority Recommendation', '');

    // Remove Shimmer Effect once data is mapped
    DOM.metricCards.forEach(c => c.classList.remove('jb-shimmer'));
    if (DOM.integrityValue) DOM.integrityValue.classList.remove('jb-shimmer');
  };

  const init = async () => {
    injectStyles();
    initUIEvents();
    
    // Apply Shimmer immediately on load
    DOM.metricCards.forEach(c => c.classList.add('jb-shimmer'));
    if (DOM.integrityValue) DOM.integrityValue.classList.add('jb-shimmer');

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
