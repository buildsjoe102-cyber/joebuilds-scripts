/**
 * Joe Builds Home Intelligence Platform
 * Global Profile Manager (v21 - Unified Role, Demo Mode, and Global Dropdown Fix)
 */
const JoeBuildsProfileManager = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  
  let supabaseClient, currentMember = null, currentUserRole = 'client';

  const injectGlobalCSS = () => {
    if (document.getElementById('jb-global-injected-styles')) return;
    const style = document.createElement('style'); style.id = 'jb-global-injected-styles';
    style.innerHTML = `
      body, html { overflow-x: clip !important; }
      .jb-dashboard-root, .min-h-screen, .jb-main-view-wrapper, .main-wrapper { overflow-x: visible !important; clip-path: inset(0); }
      a[href="/properties"], a[href="/admin"], .jb-admin-only { display: none !important; }
      .sidebar, .jb-sidebar { position: fixed !important; top: 0 !important; bottom: 0 !important; left: 0 !important; width: 220px !important; display: flex !important; flex-direction: column !important; background-color: var(--accent, #2A3C30) !important; color: var(--background, #EBEBE6) !important; border-right: 1px solid var(--accent, #2A3C30) !important; z-index: 40 !important; text-align: left !important; font-family: var(--font-sans, "Inter", sans-serif) !important; }
      .sidebar-brand, .jb-sidebar-brand { display: flex !important; height: 4rem !important; align-items: center !important; gap: 0.75rem !important; border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important; padding: 0 1.25rem !important; }
      .sidebar-nav a, .jb-sidebar-nav a { font-family: var(--font-sans, "Inter", sans-serif) !important; font-size: 13px !important; }
      .sticky-header, .jb-header { position: sticky !important; top: 0 !important; z-index: 30 !important; background-color: rgba(42, 60, 48, 0.95) !important; color: var(--background, #EBEBE6) !important; backdrop-filter: blur(8px) !important; -webkit-backdrop-filter: blur(8px) !important; border-bottom: 1px solid var(--border, #C8CCC4) !important; width: 100% !important; }
      .header-container, .jb-header-container { display: flex !important; height: 4rem !important; align-items: center !important; justify-content: space-between !important; padding: 0 2rem !important; width: 100% !important; }
      .main-wrapper, .jb-main-view-wrapper { padding-left: 220px !important; width: 100% !important; max-width: 100% !important; }
      .nav-indicator-pipe, .jb-nav-indicator { height: 16px !important; width: 2px !important; background-color: var(--color-white, #fff) !important; margin-left: auto !important; border-radius: 2px; display: block !important; }
      .nav-item:not(.active) .nav-indicator-pipe, .jb-nav-item:not(.jb-nav-item-active) .jb-nav-indicator { display: none !important; }
      #jbGlobalProfileModal, #jbHelpModal { position: fixed; inset: 0; background-color: rgba(26,36,29,0.7); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 1rem; }
      .jb-hidden { display: none !important; }
      .jb-prof-frame { width: 100%; max-width: 32rem; background-color: var(--surface, #FFFFFF); border: 1px solid var(--border, #C8CCC4); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); display: flex; flex-direction: column; max-height: 90vh; }
      .jb-prof-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border, #C8CCC4); flex-shrink: 0; }
      .jb-prof-close { background: transparent; border: none; cursor: pointer; color: var(--muted-foreground, #637066); padding: 0.25rem; display: flex; align-items: center; justify-content: center; transition: color 0.15s; }
      .jb-prof-close:hover { color: var(--foreground, #1A241D); }
      .jb-prof-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; overflow-y: auto; }
      .jb-prof-label { font-family: var(--font-mono, monospace); font-size: 9px; color: var(--muted-foreground, #637066); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.375rem; display: block; font-weight: 700; }
      .jb-prof-input { width: 100%; border: 1px solid var(--border, #C8CCC4); padding: 0.625rem 0.75rem; background: var(--surface, #FFFFFF); color: var(--foreground, #1A241D); font-family: var(--font-mono, monospace); font-size: 13px; outline: none; transition: border-color 0.15s; }
      .jb-prof-input:focus { border-color: var(--accent, #2A3C30); }
      .jb-prof-btn { width: 100%; background: var(--foreground, #1A241D); color: var(--background, #EBEBE6); padding: 0.75rem 1rem; border: 1px solid var(--foreground, #1A241D); font-family: var(--font-mono, monospace); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; transition: background-color 0.2s; }
      .jb-prof-btn:hover { background-color: var(--accent, #2A3C30); }
      .jb-help-fab { position: fixed; bottom: 6rem; right: 1.5rem; width: 3rem; height: 3rem; background-color: var(--accent, #2A3C30); color: var(--background, #EBEBE6); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer; border: none; z-index: 9000; transition: transform 0.2s ease, background-color 0.2s ease; }
      .jb-help-fab:hover { transform: scale(1.05); background-color: var(--foreground, #1A241D); }
      @media (min-width: 769px) { .jb-help-fab { bottom: 2rem; right: 2rem; } }
      .jb-accordion-item { border: 1px solid var(--border, #C8CCC4); margin-bottom: 0.5rem; background: var(--surface, #FFFFFF); }
      .jb-accordion-header { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: transparent; border: none; cursor: pointer; text-align: left; font-size: 14px; font-weight: 500; color: var(--foreground, #1A241D); font-family: var(--font-sans, sans-serif); }
      .jb-accordion-header:hover { background: rgba(165,179,154,0.05); }
      .jb-accordion-header svg { width: 1rem; height: 1rem; color: var(--muted-foreground, #637066); transition: transform 0.2s ease; }
      .jb-accordion-item.is-open .jb-accordion-header svg { transform: rotate(180deg); }
      .jb-accordion-content { display: none; padding: 0 1rem 1rem 1rem; font-size: 13px; line-height: 1.6; color: var(--muted-foreground, #637066); }
      .jb-accordion-item.is-open .jb-accordion-content { display: block; }
      .jb-mobile-nav-btn { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px 4px; gap: 6px; font-family: var(--font-mono, monospace); font-size: 8px !important; text-transform: uppercase; letter-spacing: 0.05em; background: transparent; color: var(--surface-2, #A5B39A); text-decoration: none; border: none; text-align: center; transition: color 0.15s ease; }
      .jb-mobile-nav-btn.active { color: var(--color-white, #fff); }
      .jb-mobile-nav-btn svg { height: 1.25rem; width: 1.25rem; margin-bottom: 0; }
      @media (max-width: 768px) { .sidebar, .jb-sidebar { display: none !important; } .main-wrapper, .jb-main-view-wrapper { padding-left: 0 !important; } .header-container, .jb-header-container { padding: 0 1rem !important; } }
      @media (min-width: 769px) { .mobile-brand, .jb-mobile-brand, .jb-universal-mobile-nav { display: none !important; } .header-telemetry-cluster, .jb-desktop-telemetry { display: flex !important; align-items: center !important; gap: 1.5rem !important; margin-right: auto !important; } }
      .operator-badge, #jbOperatorDropdown { font-family: var(--font-mono, "JetBrains Mono", monospace) !important; font-size: 11px !important; font-weight: 500 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; color: var(--background, #EBEBE6) !important; border-radius: 4px; }
      #jbOperatorLabel { font-family: var(--font-mono, "JetBrains Mono", monospace) !important; font-size: 11px !important; text-transform: uppercase !important; }
      .jb-operator-menu, .jb-menu-item { font-family: var(--font-mono, "JetBrains Mono", monospace) !important; font-size: 11px !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; }
      #jbOperatorEmail { font-size: 10.5px !important; text-transform: none !important; letter-spacing: normal !important; color: var(--muted-foreground, #637066) !important; }
      .header-telemetry-cluster .eyebrow, .jb-desktop-telemetry .jb-eyebrow, .telemetry-node .eyebrow { font-family: var(--font-mono, "JetBrains Mono", monospace) !important; font-size: 10px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; color: var(--surface-2, #A5B39A) !important; }
      .header-telemetry-cluster .tabular, .jb-desktop-telemetry .jb-tabular, .telemetry-node .tabular { font-family: var(--font-mono, "JetBrains Mono", monospace) !important; font-size: 11px !important; font-weight: 400 !important; color: var(--background, #EBEBE6) !important; }
      .eyebrow, .jb-eyebrow { font-family: var(--font-mono, "JetBrains Mono", monospace) !important; font-size: 8.5px !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; font-weight: 700 !important; }
      .tabular, .jb-tabular { font-variant-numeric: tabular-nums !important; font-family: var(--font-mono, "JetBrains Mono", monospace) !important; }
    `;
    document.head.appendChild(style);
  };

  const fixTerminologyAndUI = () => {
    document.querySelectorAll('.mobile-brand, .jb-mobile-brand').forEach(brand => {
      if (!brand.querySelector('img')) {
        brand.innerHTML = `<img src="https://cdn.prod.website-files.com/6a2045cc1c7e7eee7fe5ef16/6a20510745a9edb28e4a4330_1-p-500.webp" style="height: 1.5rem; width: auto; object-fit: contain; margin-right: 0.5rem;"><span style="font-size: 12px; font-weight: 600; letter-spacing: -0.025em;">JOE BUILDS</span>`;
        brand.style.display = 'flex'; brand.style.alignItems = 'center';
      }
    });

    document.querySelectorAll('.header-telemetry-cluster .eyebrow, .jb-desktop-telemetry .jb-eyebrow, .telemetry-node .eyebrow').forEach(el => {
      if(el.textContent.includes('ASSET')) el.textContent = 'PROPERTY';
      if(el.textContent.includes('SYS')) el.textContent = 'STATUS';
    });

    document.querySelectorAll('.sidebar-footer .eyebrow').forEach(el => {
      if(el.textContent.includes('Asset')) el.textContent = 'Measured Home';
    });

    document.querySelectorAll('.sidebar-nav a, .jb-sidebar-nav a').forEach(el => {
      const href = el.getAttribute('href');
      if (href && href.includes('/digital-twin')) { el.innerHTML = el.innerHTML.replace('Digital Twin', 'Zones & Rooms'); }
    });

    document.querySelectorAll('.mobile-nav, .jb-bottom-bar, .jb-mobile-overlay, .jb-hamburger-btn').forEach(el => el.remove());

    const currentPath = window.location.pathname;
    const navHtml = `
      <nav class="jb-universal-mobile-nav" style="display: flex; width: 100vw; justify-content: space-evenly; background-color: var(--accent, #2A3C30); position: fixed; bottom: 0; left: 0; z-index: 99999; padding-top: 8px; padding-bottom: calc(8px + env(safe-area-inset-bottom)); box-shadow: 0 -4px 12px rgba(0,0,0,0.15);">
        <a href="/dashboard" class="jb-mobile-nav-btn ${currentPath.includes('dashboard') ? 'active' : ''}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect></svg>Dashboard</a>
        <a href="/digital-twin" class="jb-mobile-nav-btn ${currentPath.includes('twin') ? 'active' : ''}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"></path><path d="M15 5.764v15"></path><path d="M9 3.236v15"></path></svg>Zones</a>
        <a href="/diagnostics" class="jb-mobile-nav-btn ${currentPath.includes('diagnostics') ? 'active' : ''}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"></path><path d="M6.453 15h11.094"></path><path d="M8.5 2h7"></path></svg>Diagnostics</a>
        <a href="/pathway" class="jb-mobile-nav-btn ${currentPath.includes('pathway') ? 'active' : ''}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6a9 9 0 0 0-9 9V3"></path><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle></svg>Pathway</a>
        <a href="/properties" class="jb-mobile-nav-btn jb-admin-only ${currentPath.includes('properties') ? 'active' : ''}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 7h2"></path><path d="M14 7h2"></path><path d="M8 11h2"></path><path d="M14 11h2"></path></svg>Properties</a>
        <a href="/reports" class="jb-mobile-nav-btn ${currentPath.includes('reports') ? 'active' : ''}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>Reports</a>
        <a href="/admin" class="jb-mobile-nav-btn jb-admin-only ${currentPath.includes('admin') ? 'active' : ''}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 17H5"></path><path d="M19 7h-9"></path><circle cx="17" cy="17" r="3"></circle><circle cx="7" cy="7" r="3"></circle></svg>Admin</a>
      </nav>
    `;
    document.body.insertAdjacentHTML('beforeend', navHtml);
  };

  // ==========================================
  // GLOBAL DROPDOWN HANDLER FIX
  // ==========================================
  const fixOperatorDropdown = () => {
    let dropBtn = document.getElementById('jbOperatorDropdown');
    const opMenu = document.getElementById('jbOperatorMenu');
    
    if (!dropBtn || !opMenu) return;

    // Clone the button to completely wipe out any broken/duplicate event listeners from older page scripts
    const newBtn = dropBtn.cloneNode(true);
    dropBtn.parentNode.replaceChild(newBtn, dropBtn);
    dropBtn = newBtn; // Reassign our variable to the clean button

    // Attach the master global listener
    dropBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = dropBtn.getAttribute('aria-expanded') === 'true';
      dropBtn.setAttribute('aria-expanded', !isExpanded);
      opMenu.classList.toggle('jb-hidden');
    });

    document.addEventListener('click', (e) => {
      if (!dropBtn.contains(e.target) && !opMenu.contains(e.target)) {
        dropBtn.setAttribute('aria-expanded', 'false');
        opMenu.classList.add('jb-hidden');
      }
    });

    // Take global control of the Logout button as well
    const logoutBtn = document.getElementById('jbLogoutBtn');
    if (logoutBtn) {
      const newLogout = logoutBtn.cloneNode(true);
      logoutBtn.parentNode.replaceChild(newLogout, logoutBtn);
      newLogout.addEventListener('click', async () => {
        try { await window.$memberstackDom.logout(); window.location.href = '/login'; } catch (err) {}
      });
    }
  };

  const injectProfileHTML = () => {
    if (document.getElementById('jbGlobalProfileModal')) return;
    const modalHTML = `
      <div id="jbGlobalProfileModal" class="jb-hidden">
        <div class="jb-prof-frame" style="max-width: 28rem;">
          <div class="jb-prof-header">
            <div>
              <div class="jb-prof-label" style="margin-bottom:0.25rem;">Account Settings</div>
              <h2 style="font-size:18px; font-weight:500; font-family:var(--font-sans, sans-serif); color:var(--foreground, #1A241D); margin:0;">Edit Profile</h2>
            </div>
            <button id="closeProfileModal" class="jb-prof-close"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.25rem; height:1.25rem;"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg></button>
          </div>
          <div class="jb-prof-body">
            <form id="jbProfileForm" style="display: flex; flex-direction: column; gap: 1.25rem; margin:0;">
              <label style="display:block; margin:0;"><span class="jb-prof-label">Full Name</span><input type="text" id="profileName" required class="jb-prof-input"></label>
              <label style="display:block; margin:0;"><span class="jb-prof-label">Email Address</span><input type="email" id="profileEmail" required class="jb-prof-input"></label>
              <div id="profileStatusMsg" style="font-family:var(--font-sans, sans-serif); font-size:12px; display:none; margin:0;"></div>
              <button type="submit" id="btnSaveProfile" class="jb-prof-btn" style="margin-top:0.5rem;">Save Changes</button>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  };

  const bindProfileEvents = (profile) => {
    const operatorMenu = document.getElementById('jbOperatorMenu');
    const logoutBtn = document.getElementById('jbLogoutBtn'); // Note: we cloned this earlier, but getElementById still works to find it
    
    if (!operatorMenu || !logoutBtn) return;

    // 1. EDIT PROFILE INJECTION
    if (!document.getElementById('jbTriggerEditProfile')) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button'; editBtn.id = 'jbTriggerEditProfile'; editBtn.className = 'jb-menu-item';
      editBtn.textContent = 'Edit Profile'; editBtn.style.borderBottom = '1px solid var(--background)';
      operatorMenu.insertBefore(editBtn, logoutBtn);

      editBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); operatorMenu.classList.add('jb-hidden'); 
        currentMember = await window.$memberstackDom.getCurrentMember();
        if (currentMember && currentMember.data) {
          document.getElementById('profileName').value = currentMember.data.customFields?.['first-name'] || '';
          document.getElementById('profileEmail').value = currentMember.data.auth.email || '';
          document.getElementById('jbGlobalProfileModal').classList.remove('jb-hidden');
        }
      });
    }

    const modal = document.getElementById('jbGlobalProfileModal');
    if(modal) {
      document.getElementById('closeProfileModal').addEventListener('click', () => modal.classList.add('jb-hidden'));
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('jb-hidden'); });

      document.getElementById('jbProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const saveBtn = document.getElementById('btnSaveProfile');
        const statusMsg = document.getElementById('profileStatusMsg');
        saveBtn.textContent = 'Saving...'; saveBtn.disabled = true;
        const newName = document.getElementById('profileName').value;
        const newEmail = document.getElementById('profileEmail').value;
        try {
          await window.$memberstackDom.updateMember({ email: newEmail, customFields: { "first-name": newName } });
          if (currentMember && currentMember.data) {
            await supabaseClient.from('profiles').update({ first_name: newName, email: newEmail }).eq('memberstack_id', currentMember.data.id);
          }
          statusMsg.textContent = "Profile updated successfully!"; statusMsg.style.color = "var(--status-stable, #3A6B48)"; statusMsg.style.display = "block";
          setTimeout(() => modal.classList.add('jb-hidden'), 1500);
        } catch (err) {
          statusMsg.textContent = err.message || "Failed to update profile."; statusMsg.style.color = "var(--status-review, #A64444)"; statusMsg.style.display = "block";
        }
        saveBtn.textContent = 'Save Changes'; saveBtn.disabled = false;
      });
    }

    // 2. DEMO INJECTION LOGIC
    const isDemoActive = localStorage.getItem('jb_demo_mode') === 'true';
    
    // Show demo button if user has NO building_id OR if their role is explicitly 'demo'
    const needsDemoBtn = (!profile.building_id || profile.role === 'demo');

    if (needsDemoBtn && !document.getElementById('jbTriggerDemo')) {
      const demoBtn = document.createElement('button');
      demoBtn.type = 'button'; demoBtn.id = 'jbTriggerDemo'; demoBtn.className = 'jb-menu-item';
      demoBtn.textContent = isDemoActive ? 'Exit Demo Mode' : 'Explore Demo Property';
      demoBtn.style.borderBottom = '1px solid var(--background)';
      demoBtn.style.color = 'var(--status-stable)';
      operatorMenu.insertBefore(demoBtn, logoutBtn);

      demoBtn.addEventListener('click', () => {
        if (isDemoActive) localStorage.removeItem('jb_demo_mode');
        else localStorage.setItem('jb_demo_mode', 'true');
        window.location.reload();
      });
    }

    // 3. DEMO BANNER
    if (isDemoActive && !document.getElementById('jbDemoBanner')) {
      const demoBannerHtml = `<div id="jbDemoBanner" style="position:fixed; top: 1rem; left: 50%; transform: translateX(-50%); background: var(--surface, #fff); color: var(--foreground, #000); padding: 12px 24px; border: 1px solid var(--status-review); z-index: 100000; display:flex; align-items:center; gap: 12px; font-family: var(--font-mono); font-size: 10px; text-transform:uppercase; letter-spacing: 0.1em; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-radius: 4px;">
         <span style="display:inline-block; width:8px; height:8px; background:var(--status-review); border-radius:50%; box-shadow: 0 0 0 3px rgba(166,68,68,0.3); animation: ping 2s infinite;"></span>
         Demo Mode Active
      </div>`;
      document.body.insertAdjacentHTML('beforeend', demoBannerHtml);
    }
  };

  const getHelpContent = (role) => {
    if (role === 'admin' || role === 'operator') {
      return `
        <div class="jb-accordion-item is-open"><button class="jb-accordion-header">Continuous Auto-Save Mechanics <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content">This platform uses continuous sync architecture. <strong>There are no "Save" buttons</strong> for measurement data inputs, statuses, or pathway milestones.<br><br><strong>How to save:</strong> Type your value or select a status, and simply <strong>click anywhere outside the field</strong> (or tap outside on mobile), or press <strong>Enter</strong>. The background of the card will briefly pulse green to confirm the data has been securely written to the database.</div></div>
        <div class="jb-accordion-item"><button class="jb-accordion-header">Home Performance Baseline & Rooms <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content">Navigate to the <strong>Properties</strong> page to register new homes. If a property is entirely blank, use the <strong>Generate Baseline Data Profile</strong> button on the Admin page to automatically deploy the foundational engineering pathway and core metrics.<br><br><strong>Rooms & Zones:</strong> Adding a room on the Properties page automatically generates internal RH%, CO₂, and VOC inputs for that specific zone. If you map it on the floorplan, a hotspot will instantly appear for the client.</div></div>
        <div class="jb-accordion-item"><button class="jb-accordion-header">Contextual Diagnostic Uploads <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content">Files dragged into the <strong>Admin Page Uploader</strong> are published directly to the client's Reports center.<br><br><strong>Target Context:</strong> If you select a specific room from the dropdown before uploading an image (JPG/PNG), the system will attach it to that room's Zone node instead of the general reports center.</div></div>
      `;
    } else {
      return `
        <div class="jb-accordion-item is-open"><button class="jb-accordion-header">Understanding Your Measured Home Record <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content">Your dashboard provides a high-level health summary of your building. <br><br><strong>Integrity Index:</strong> The badge in the top right is a composite score out of 1.00 indicating the overall resilience of your building envelope.<br><br><strong>Next Action:</strong> The dark green panel at the bottom highlights the exact next step required in your controlled upgrade sequence.</div></div>
        <div class="jb-accordion-item"><button class="jb-accordion-header">Rooms & Diagnostics <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content"><strong>Zones:</strong> An interactive 2D map of your property. Tap any circular room node to open the side-drawer and inspect measurement data (like bedroom CO₂ levels), analyst notes, and room-specific thermal imagery.<br><br><strong>Diagnostics:</strong> The raw data ledger. This logs the exact measurements captured by our analysts. Clicking any row will pull up the specific instrument record.</div></div>
        <div class="jb-accordion-item"><button class="jb-accordion-header">Building Science Glossary <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content"><ul><li><strong>ACH50:</strong> Air Changes per Hour at 50 Pascals. This measures how drafty or airtight your home is. Lower is better.</li><li><strong>U-Value:</strong> Measures thermal transmittance. It tells us how effectively your walls and roof prevent heat from escaping. Lower is better.</li><li><strong>VOC (Volatile Organic Compounds):</strong> Harmful gasses emitted by paints, glues, and materials that impact indoor air quality.</li><li><strong>RH (Relative Humidity):</strong> The amount of moisture in the air. High RH leads to condensation and structural mold risk.</li></ul></div></div>
      `;
    }
  };

  const injectHelpSystem = (role) => {
    if (document.getElementById('jbHelpFab')) return;
    const fabHTML = `<button id="jbHelpFab" class="jb-help-fab" title="Platform Guide"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></button>`;
    document.body.insertAdjacentHTML('beforeend', fabHTML);

    const titleText = (role === 'admin' || role === 'operator') ? 'Operator Manual' : 'Client Guide';
    const helpModalHTML = `<div id="jbHelpModal" class="jb-hidden"><div class="jb-prof-frame" style="max-height: 85vh;"><div class="jb-prof-header"><div><div class="jb-prof-label" style="margin-bottom:0.25rem;">Knowledge Base</div><h2 style="font-size:18px; font-weight:500; font-family:var(--font-sans, sans-serif); color:var(--foreground, #1A241D); margin:0;">${titleText}</h2></div><button id="closeHelpModal" class="jb-prof-close"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.25rem; height:1.25rem;"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg></button></div><div class="jb-prof-body" style="padding: 1rem; gap: 0;">${getHelpContent(role)}</div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', helpModalHTML);

    const fab = document.getElementById('jbHelpFab');
    const helpModal = document.getElementById('jbHelpModal');
    const closeHelp = document.getElementById('closeHelpModal');

    fab.addEventListener('click', () => helpModal.classList.remove('jb-hidden'));
    closeHelp.addEventListener('click', () => helpModal.classList.add('jb-hidden'));
    helpModal.addEventListener('click', (e) => { if (e.target === helpModal) helpModal.classList.add('jb-hidden'); });

    document.querySelectorAll('.jb-accordion-item').forEach(acc => {
      acc.querySelector('.jb-accordion-header').addEventListener('click', () => {
        const isOpen = acc.classList.contains('is-open');
        document.querySelectorAll('.jb-accordion-item').forEach(a => a.classList.remove('is-open'));
        if (!isOpen) acc.classList.add('is-open');
      });
    });
  };

  const init = async () => {
    // 1. EXIT IMMEDIATELY IF WE ARE NOT IN THE APP
    if (!document.getElementById('jbOperatorDropdown')) return;

    // 2. We are in the app. Proceed with UI injections.
    fixTerminologyAndUI(); 

    // 3. Take global control of the header dropdown
    fixOperatorDropdown();

    if (window.supabase) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      injectGlobalCSS();
      injectProfileHTML();

      try {
        const member = await window.$memberstackDom.getCurrentMember();
        if (member && member.data) {
          const { data: profile } = await supabaseClient.from('profiles').select('*').eq('memberstack_id', member.data.id).single();
          currentUserRole = profile?.role || 'client';

          // ==========================================
          // ENFORCE ROLE IN DROPDOWN GLOBALLY
          // ==========================================
          const displayRole = currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1);
          const opLabel = document.getElementById('jbOperatorLabel');
          
          if (opLabel) {
            opLabel.textContent = displayRole;
            // Background observer to stop other older scripts from changing it back
            const observer = new MutationObserver(() => {
              if (opLabel.textContent !== displayRole) {
                opLabel.textContent = displayRole;
              }
            });
            observer.observe(opLabel, { characterData: true, childList: true, subtree: true });
          }
          
          bindProfileEvents(profile);
          injectHelpSystem(currentUserRole);

          if (currentUserRole === 'admin' || currentUserRole === 'operator') {
             document.querySelectorAll('a[href*="/properties"], a[href*="/admin"], .jb-admin-only').forEach(el => {
                el.style.setProperty('display', 'flex', 'important');
                el.style.setProperty('visibility', 'visible', 'important');
                el.classList.remove('jb-hidden');
             });
          }
        }
      } catch (err) {
        console.error("Profile Manager Auth Check Failed:", err);
      }
    }
  };

  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsProfileManager.init);
} else { JoeBuildsProfileManager.init(); }
