/**
 * Joe Builds Home Intelligence Platform
 * Pathway Controller
 */
const JoeBuildsPathway = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  let supabase;

  const DOM = {
    opLabel: document.getElementById('jbOperatorLabel'),
    opEmail: document.getElementById('jbOperatorEmail'),
    dropBtn: document.getElementById('jbOperatorDropdown'),
    opMenu: document.getElementById('jbOperatorMenu'),
    logoutBtn: document.getElementById('jbLogoutBtn'),
    desktopSidebarAsset: document.getElementById('desktopSidebarAsset'),
    desktopHeaderAsset: document.getElementById('desktopHeaderAsset'),
    p1Count: document.getElementById('p1-count'), p1Bar: document.getElementById('p1-bar'), p1Icon: document.getElementById('p1-icon'),
    p2Count: document.getElementById('p2-count'), p2Bar: document.getElementById('p2-bar'), p2Icon: document.getElementById('p2-icon'),
    p3Count: document.getElementById('p3-count'), p3Bar: document.getElementById('p3-bar'),
    sequenceStack: document.getElementById('sequenceStackContainer')
  };

  const initUIEvents = () => {
    if (DOM.dropBtn && DOM.opMenu) {
      DOM.dropBtn.addEventListener('click', (e) => { e.stopPropagation(); DOM.dropBtn.setAttribute('aria-expanded', !(DOM.dropBtn.getAttribute('aria-expanded') === 'true')); DOM.opMenu.classList.toggle('jb-hidden'); });
      document.addEventListener('click', () => { DOM.dropBtn.setAttribute('aria-expanded', 'false'); DOM.opMenu.classList.add('jb-hidden'); });
    }
    if (DOM.logoutBtn) {
      DOM.logoutBtn.addEventListener('click', async () => { try { await window.$memberstackDom.logout(); window.location.href = '/login'; } catch (err) {} });
    }
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

  const fetchPathwayData = async (buildingId) => {
    const [buildingRes, projectsRes, scenariosRes] = await Promise.all([
      supabase.from('buildings').select('*').eq('id', buildingId).single(),
      supabase.from('projects').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }),
      supabase.from('upgrade_scenarios').select('*').eq('building_id', buildingId).order('step_number', { ascending: true })
    ]);
    return { building: buildingRes.data, currentProject: projectsRes.data?.[0], scenarios: scenariosRes.data || [] };
  };

  const getStatusIcon = (status) => {
    if (status === 'completed') return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="height: 0.75rem; width: 0.75rem;"><path d="M20 6 9 17l-5-5"></path></svg>`;
    if (status === 'in-progress') return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="height: 0.75rem; width: 0.75rem;"><path d="M12 2v4"></path><path d="m16.2 7.8 2.9-2.9"></path><path d="M18 12h4"></path><path d="m16.2 16.2 2.9 2.9"></path><path d="M12 18v4"></path><path d="m4.9 19.1 2.9-2.9"></path><path d="M2 12h4"></path><path d="m4.9 4.9 2.9 2.9"></path></svg>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="height: 0.75rem; width: 0.75rem;"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
  };

  const renderScenarioRow = (scenario) => {
    const safeTitle = scenario.title.replace(/Forensic/g, "Diagnostic");
    const safeDesc = (scenario.client_facing_wording || '').replace(/Forensic/g, "Diagnostic");
    const isLocked = scenario.status === 'locked';
    const statusClass = scenario.status === 'completed' ? 'stable' : (scenario.status === 'in-progress' ? 'measured' : 'locked');
    const statusText = scenario.status === 'in-progress' ? 'In Progress' : (scenario.status === 'completed' ? 'Completed' : 'Locked Phase');
    let btnText = isLocked ? 'Locked' : (scenario.status === 'completed' ? 'View Report' : 'Open Phase');
    const dependencyHtml = scenario.dependency_text ? `<div class="dependency-chip"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="height: 0.75rem; width: 0.75rem;"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Depends on: <span class="dependency-target">${scenario.dependency_text}</span></div>` : '';

    return `<div class="sequence-row ${isLocked ? 'locked-state' : ''}"><div class="row-metric-id"><div>${scenario.phase_name}</div><div class="row-number tabular">${String(scenario.step_number).padStart(2, '0')}</div></div><div><div class="row-header-inline"><h3 class="row-title">${safeTitle}</h3><span class="status-badge ${statusClass}">${getStatusIcon(scenario.status)} ${statusText}</span></div><p class="row-desc">${safeDesc}</p>${dependencyHtml}</div><div class="action-cell"><button ${isLocked ? 'disabled' : ''} class="action-btn">${btnText}</button></div></div>`;
  };

  const updatePhaseUI = (phaseNum, elements, scenarios) => {
    const phaseScenarios = scenarios.filter(s => s.phase === phaseNum);
    const total = phaseScenarios.length;
    if (total === 0) return;
    const completed = phaseScenarios.filter(s => s.status === 'completed').length;
    const progressPerc = Math.round((completed / total) * 100);
    if (elements.count) elements.count.textContent = `${completed}/${total}`;
    if (elements.bar) elements.bar.style.width = `${progressPerc}%`;
    if (elements.icon && progressPerc === 100) elements.icon.style.color = 'var(--accent)';
  };

  const populatePathwayUI = (data) => {
    const assetName = `${data.currentProject?.project_code || 'PRJ-000'} — ${data.building.address_line_1}`;
    if (DOM.desktopSidebarAsset) DOM.desktopSidebarAsset.textContent = assetName;
    if (DOM.desktopHeaderAsset) DOM.desktopHeaderAsset.textContent = assetName;
    if (DOM.sequenceStack) {
      DOM.sequenceStack.innerHTML = '';
      data.scenarios.forEach(scen => DOM.sequenceStack.insertAdjacentHTML('beforeend', renderScenarioRow(scen)));
    }
    updatePhaseUI(1, { count: DOM.p1Count, bar: DOM.p1Bar, icon: DOM.p1Icon }, data.scenarios);
    updatePhaseUI(2, { count: DOM.p2Count, bar: DOM.p2Bar, icon: DOM.p2Icon }, data.scenarios);
    updatePhaseUI(3, { count: DOM.p3Count, bar: DOM.p3Bar }, data.scenarios);
  };

  const init = async () => {
    initUIEvents();
    if (!window.supabase) return;
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    try {
      const profile = await authAndGetProfile();
      if (profile?.building_id) {
        const pathwayData = await fetchPathwayData(profile.building_id);
        populatePathwayUI(pathwayData);
      }
    } catch (error) {
      console.error(error);
      window.location.href = '/login';
    }
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsPathway.init);
} else { JoeBuildsPathway.init(); }
