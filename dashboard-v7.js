/**
 * Joe Builds Home Intelligence Platform
 * Unified Dashboard Controller (v7 - Dynamic Next Action CTA, Sparklines, Skeleton Loader)
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
    
    // Top Context
    integrityValue: document.querySelector('.jb-integrity-value'),
    heroProjectDate: document.querySelector('.jb-hero-left .jb-font-mono'),
    footerProject: document.querySelector('.jb-footer-project'),
    desktopAsset: document.querySelectorAll('.jb-desktop-telemetry .jb-text-foreground')[0],
    
    // Cards & Modal
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

    // Next Action CTA Card
    ctaTitle: document.querySelector('.jb-cta-title'),
    ctaBtn: document.querySelector('.jb-cta-action-btn')
  };

  /**
   * SKELETON LOADER ENGINE
   */
  const injectSkeletonCSS = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      .jb-skeleton-block {
        position: relative;
        overflow: hidden;
        background-color: rgba(165, 179, 154, 0.2) !important;
        color: transparent !important;
        border-color: transparent !important;
        border-radius: 4px;
        pointer-events: none;
      }
      .jb-skeleton-block::after {
        content: '';
        position: absolute;
        top: 0; right: 0; bottom: 0; left: 0;
        transform: translateX(-100%);
        background-image: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%);
        animation: jb-shimmer 1.5s infinite;
      }
      .jb-skeleton-block * {
         visibility: hidden !important;
      }
      @keyframes jb-shimmer {
        100% { transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);
  };

  const toggleSkeletonState = (isLoading) => {
    const elementsToToggle = [];
    
    if (DOM.integrityValue) elementsToToggle.push(DOM.integrityValue);
    if (DOM.desktopAsset) elementsToToggle.push(DOM.desktopAsset);
    if (DOM.heroProjectDate) elementsToToggle.push(DOM.heroProjectDate);
    if (DOM.ctaTitle) elementsToToggle.push(DOM.ctaTitle); // Shimmer the Next Action text
    
    DOM.metricCards.forEach(card => {
      elementsToToggle.push(card.querySelector('.jb-metric-string'));
      elementsToToggle.push(card.querySelector('.jb-metric-description'));
      elementsToToggle.push(card.querySelector('.jb-status-badge'));
    });

    elementsToToggle.forEach(el => {
      if (!el) return;
      if (isLoading) {
        el.classList.add('jb-skeleton-block');
      } else {
        el.classList.remove('jb-skeleton-block');
      }
    });
  };

  const generateSparkline = (status) => {
    let points = [];
    let currentY = 32; 
    for(let i=0; i<12; i++) {
       let jitter = (status === 'risk' || status === 'review') ? (Math.random() * 30 - 15) : (Math.random() * 10 - 5);
       currentY = Math.max(5, Math.min(59, currentY + jitter));
       points.push(currentY);
    }
    const stepX = 300 / 11;
    const pathD = points.map((y, i) => `${i===0?'M':'L'} ${i*stepX} ${y}`).join(' ');
    const circles = points.map((y, i) => `<circle cx="${i*stepX}" cy="${y}" r="1.6" fill="currentColor"></circle>`).join('');
    
    return `
      <svg viewBox="0 0 300 64" preserveAspectRatio="none" style="width:100%;height:6rem;display:block;color:var(--foreground);">
         <defs><pattern id="dgrid" width="25" height="16" patternUnits="userSpaceOnUse"><path d="M 25 0 L 0 0 0 16" fill="none" stroke="currentColor" stroke-opacity="0.08" stroke-width="0.5"></path></pattern></defs>
         <rect width="300" height="64" fill="url(#dgrid)"></rect>
         <path d="${pathD}" fill="none" stroke="currentColor" stroke-width="1.2"></path>
         ${circles}
       </svg>
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

    if (DOM.modalForensicBtn) {
      DOM.modalForensicBtn.addEventListener('click', () => {
        window.location.href = '/diagnostics';
      });
    }

    // Connect the "Review Plan" CTA Button to the Pathway Page
    if (DOM.ctaBtn) {
      DOM.ctaBtn.addEventListener('click', () => {
        window.location.href = '/pathway';
      });
    }

    DOM.metricCards.forEach(card => {
      card.addEventListener('click', () => {
        const status = card.getAttribute('data-status') || 'unknown';
        
        DOM.mTitle.textContent = card.getAttribute('data-title');
        DOM.mStatusText.textContent = card.getAttribute('data-badge');
        DOM.mCurrent.textContent = card.getAttribute('data-current');
        DOM.mDelta7.textContent = card.getAttribute('data-delta7');
        DOM.mDelta30.textContent = card.getAttribute('data-delta30');
        DOM.mThreshold.textContent = card.getAttribute('data-threshold');
        DOM.mCommentary.textContent = card.getAttribute('data-commentary');
        DOM.mRec.textContent = card.getAttribute('data-rec');
        
        DOM.mStatusBadge.className = `jb-status-badge jb-status-${status}`;
        DOM.mStatusDot.className = `jb-badge-dot bg-${status}`;

        if (DOM.modalGraph) {
          DOM.modalGraph.innerHTML = generateSparkline(status);
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
    // Added scenariosRes to the Promise.all fetch block!
    const [buildingRes, projectsRes, diagnosticsRes, measurementsRes, scenariosRes] = await Promise.all([
      supabase.from('buildings').select('*').eq('id', buildingId).single(),
      supabase.from('projects').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }),
      supabase.from('diagnostic_events').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }).limit(1),
      supabase.from('measurements').select(`*, measurement_points(zone_code, element_code)`).eq('building_id', buildingId),
      supabase.from('upgrade_scenarios').select('*').eq('building_id', buildingId).order('step_number', { ascending: true })
    ]);
    return { 
      building: buildingRes.data, 
      currentProject: projectsRes.data?.[0], 
      latestDiagnostic: diagnosticsRes.data?.[0], 
      measurements: measurementsRes.data,
      scenarios: scenariosRes.data // Mapped new table data
    };
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

    const envMetric = data.measurements?.find(x => x.measurement_points?.element_code === 'ENVELOPE');
    if (envMetric && DOM.integrityValue) {
      DOM.integrityValue.innerHTML = `${envMetric.value}<span class="jb-integrity-fraction">/1.00</span>`;
    }

    // MAP DYNAMIC NEXT ACTION CTA
    if (data.scenarios && DOM.ctaTitle) {
      // Find the very first milestone that is NOT completed
      const nextAction = data.scenarios.find(s => s.status === 'in-progress' || s.status === 'locked');
      if (nextAction) {
        // Enforce Brand Dictates
        DOM.ctaTitle.textContent = nextAction.title.replace(/Forensic/g, "Diagnostic");
      } else {
        DOM.ctaTitle.textContent = "All Current Pathways Completed";
      }
    }

    mapMeasurementToCard(data, 'ENVELOPE', 'Building Envelope Condition', 'Integrity Index');
    mapMeasurementToCard(data, 'U-VALUE', 'Thermal Enclosure Performance', 'U-value');
    mapMeasurementToCard(data, 'MOISTURE', 'Structural Moisture Risk', 'Subfloor RH');
    mapMeasurementToCard(data, 'CO2', 'Indoor Air Quality (IAQ)', 'CO₂ avg');
    mapMeasurementToCard(data, 'READINESS', 'Upgrade Sequence Readiness', '');
    mapMeasurementToCard(data, 'PRIORITY', 'Active Priority Recommendation', '');

    toggleSkeletonState(false);
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
    injectSkeletonCSS();
    toggleSkeletonState(true);

    initUIEvents();
    if (!window.supabase) return;
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    try {
      const profile = await authAndGetProfile();
      if (profile?.building_id) {
        const dashboardData = await fetchData(profile.building_id);
        populateDashboard(dashboardData);
      } else {
        toggleSkeletonState(false);
      }
    } catch (error) {
      console.error(error);
      window.location.href = '/login';
    }
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsDashboard.init); } else { JoeBuildsDashboard.init(); }
