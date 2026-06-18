/**
 * Joe Builds Home Intelligence Platform
 * Reports & Bookings Controller (v3 - Dynamic Sidebar Meta)
 */
const JoeBuildsReports = (() => {
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
    headerClimateText: document.querySelectorAll('.header-telemetry-cluster .tabular')[1],
    headerSysText: document.querySelectorAll('.header-telemetry-cluster .tabular')[2],
    sidebarMeta: document.querySelector('.jb-footer-meta, .sidebar-footer > div:last-child'),
    reportsGrid: document.getElementById('reportsGrid'),
    reportsCountLabel: document.getElementById('reportsCountLabel'),
    calendarMonthLabel: document.getElementById('calendarMonthLabel'),
    calendarMatrix: document.getElementById('calendarMatrix'),
    agendaContainer: document.getElementById('agendaContainer')
  };

  const injectSkeletonCSS = () => {
    const style = document.createElement('style');
    style.innerHTML = `.jb-skeleton-block { position: relative; overflow: hidden; background-color: rgba(165, 179, 154, 0.2) !important; color: transparent !important; border-color: transparent !important; pointer-events: none; border-radius: 4px; } .jb-skeleton-block::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform: translateX(-100%); background-image: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%); animation: jb-shimmer 1.5s infinite; } .jb-skeleton-block * { visibility: hidden !important; } @keyframes jb-shimmer { 100% { transform: translateX(100%); } }`;
    document.head.appendChild(style);
  };

  const toggleSkeletonState = (isLoading) => {
    const elementsToToggle = [DOM.desktopSidebarAsset, DOM.desktopHeaderAsset, DOM.headerClimateText, DOM.headerSysText, DOM.reportsCountLabel, DOM.calendarMonthLabel, DOM.sidebarMeta];
    elementsToToggle.forEach(el => { if (!el) return; if (isLoading) el.classList.add('jb-skeleton-block'); else el.classList.remove('jb-skeleton-block'); });
    if (isLoading) {
      if (DOM.reportsGrid) DOM.reportsGrid.innerHTML = `<div class="archive-row jb-skeleton-block" style="height: 70px;"></div><div class="archive-row jb-skeleton-block" style="height: 70px;"></div>`;
      if (DOM.calendarMatrix) DOM.calendarMatrix.innerHTML = `<div class="jb-skeleton-block" style="height: 200px; width: 100%; grid-column: span 7;"></div>`;
      if (DOM.agendaContainer) DOM.agendaContainer.innerHTML = `<div class="agenda-item jb-skeleton-block" style="height: 48px;"></div><div class="agenda-item jb-skeleton-block" style="height: 48px;"></div>`;
    }
  };

  const initUIEvents = () => {
    if (DOM.dropBtn && DOM.opMenu) { DOM.dropBtn.addEventListener('click', (e) => { e.stopPropagation(); DOM.dropBtn.setAttribute('aria-expanded', !(DOM.dropBtn.getAttribute('aria-expanded') === 'true')); DOM.opMenu.classList.toggle('jb-hidden'); }); document.addEventListener('click', () => { DOM.dropBtn.setAttribute('aria-expanded', 'false'); DOM.opMenu.classList.add('jb-hidden'); }); }
    if (DOM.logoutBtn) { DOM.logoutBtn.addEventListener('click', async () => { try { await window.$memberstackDom.logout(); window.location.href = '/login'; } catch (err) {} }); }
  };

  const authAndGetProfile = async () => {
    const member = await window.$memberstackDom.getCurrentMember();
    if (!member || !member.data) throw new Error("No Memberstack session.");
    if (DOM.opLabel) DOM.opLabel.textContent = member.data.customFields?.first_name || 'Client';
    if (DOM.opEmail) DOM.opEmail.textContent = `Logged in as: ${member.data.auth.email}`;
    const { data: profile } = await supabase.from('profiles').select('id, building_id, role').eq('memberstack_id', member.data.id).single();
    if (profile && (profile.role === 'admin' || profile.role === 'operator')) { const hideStyle = document.getElementById('rbac-hide-admin'); if (hideStyle) hideStyle.remove(); }
    return profile;
  };

  const fetchPageData = async (buildingId) => {
    const [buildingRes, projectsRes, reportsRes, eventsRes] = await Promise.all([
      supabase.from('buildings').select('*').eq('id', buildingId).single(),
      supabase.from('projects').select('*').eq('building_id', buildingId).order('created_at', { ascending: false }),
      supabase.from('reports').select('*').eq('building_id', buildingId).eq('client_visible', true).order('created_at', { ascending: false }),
      supabase.from('diagnostic_events').select('*').eq('building_id', buildingId).order('created_at', { ascending: true })
    ]);
    return { building: buildingRes.data, currentProject: projectsRes.data?.[0], reports: reportsRes.data || [], events: eventsRes.data || [] };
  };

  const renderReports = (reports) => {
    if (!DOM.reportsGrid || !DOM.reportsCountLabel) return;
    DOM.reportsCountLabel.textContent = `${reports.length} document${reports.length === 1 ? '' : 's'}`;
    DOM.reportsGrid.innerHTML = '';
    if (reports.length === 0) { DOM.reportsGrid.innerHTML = `<div class="archive-row" style="color:var(--muted-foreground); font-size:12px;">No reports available for this asset yet.</div>`; return; }
    reports.forEach(report => {
      const dateStr = new Date(report.created_at).toISOString().split('T')[0];
      const type = (report.report_type || 'PDF').toUpperCase();
      const html = `<div class="archive-row"><div class="icon-square"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="height: 1rem; width: 1rem;"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg></div><div class="file-details"><div class="file-title">${report.report_title}</div><div class="file-meta-tags"><span>${type}</span><span class="tabular">${dateStr}</span></div></div><a href="${report.report_url}" target="_blank" class="action-btn-sm"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="height: 0.75rem; width: 0.75rem;"><path d="M12 15V3"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path></svg>Download</a></div>`;
      DOM.reportsGrid.insertAdjacentHTML('beforeend', html);
    });
  };

  const renderCalendarAndAgenda = (events) => {
    if (!DOM.calendarMatrix || !DOM.agendaContainer || !DOM.calendarMonthLabel) return;
    const today = new Date(); const year = today.getFullYear(); const month = today.getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    DOM.calendarMonthLabel.textContent = `${monthNames[month]} ${year}`;

    const activeDates = new Set(); const upcomingEvents = [];
    events.forEach(ev => {
      const eDate = new Date(ev.created_at);
      if (eDate.getFullYear() === year && eDate.getMonth() === month) activeDates.add(eDate.getDate());
      if (eDate >= today.setHours(0,0,0,0)) upcomingEvents.push(ev);
    });

    const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    let calendarHTML = `<div class="calendar-day-label">M</div><div class="calendar-day-label">T</div><div class="calendar-day-label">W</div><div class="calendar-day-label">T</div><div class="calendar-day-label">F</div><div class="calendar-day-label">S</div><div class="calendar-day-label">S</div>`;
    for (let i = 0; i < startOffset; i++) calendarHTML += `<button disabled class="calendar-cell-btn"></button>`;
    for (let day = 1; day <= daysInMonth; day++) {
      const hasEvent = activeDates.has(day);
      calendarHTML += `<button class="calendar-cell-btn tabular ${hasEvent ? 'active-event' : ''}">${day}${hasEvent ? '<span class="calendar-event-dot"></span>' : ''}</button>`;
    }
    const totalCells = startOffset + daysInMonth; const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) calendarHTML += `<button disabled class="calendar-cell-btn"></button>`;
    DOM.calendarMatrix.innerHTML = calendarHTML;

    DOM.agendaContainer.innerHTML = '';
    if (upcomingEvents.length === 0) { DOM.agendaContainer.innerHTML = `<div style="font-size:12px; color:var(--muted-foreground);">No upcoming events scheduled.</div>`; return; }
    upcomingEvents.slice(0, 4).forEach(ev => {
      const eDate = new Date(ev.created_at); const formattedDate = `${eDate.getDate()} ${monthNames[eDate.getMonth()].substring(0,3)}`;
      const html = `<div class="agenda-item"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="height: 0.875rem; width: 0.875rem;"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path></svg><div class="agenda-title">${ev.event_type}</div><div class="agenda-date-tag tabular">${formattedDate}</div></div>`;
      DOM.agendaContainer.insertAdjacentHTML('beforeend', html);
    });
  };

  const populateHeaders = (data) => {
    const assetName = `${data.currentProject?.project_code || 'PRJ-000'} — ${data.building.address_line_1}`;
    if (DOM.desktopSidebarAsset) DOM.desktopSidebarAsset.textContent = assetName;
    if (DOM.desktopHeaderAsset) DOM.desktopHeaderAsset.textContent = assetName;
    if (DOM.headerSysText) DOM.headerSysText.textContent = data.building.status || 'Pending';
    
    const state = data.building.state || 'WA';
    const climateText = state === 'WA' ? 'Zone 5 — Warm Temperate' : 'Zone 6 — Mild Temperate';
    if (DOM.headerClimateText) DOM.headerClimateText.textContent = climateText;
    if (DOM.sidebarMeta) DOM.sidebarMeta.textContent = climateText;
  };

  const init = async () => {
    injectSkeletonCSS(); toggleSkeletonState(true); initUIEvents();
    if (!window.supabase) return;
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    try {
      const profile = await authAndGetProfile();
      if (profile?.building_id) {
        const pageData = await fetchPageData(profile.building_id);
        populateHeaders(pageData);
        renderReports(pageData.reports);
        renderCalendarAndAgenda(pageData.events);
      }
      toggleSkeletonState(false);
    } catch (error) { window.location.href = '/login'; }
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsReports.init);
} else { JoeBuildsReports.init(); }
