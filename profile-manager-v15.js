/**
 * Joe Builds Home Intelligence Platform
 * Global Profile Manager (v15 - Sticky Header, Universal Mobile Nav, Logo Fix)
 */
const JoeBuildsProfileManager = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  
  let supabaseClient;
  let currentMember = null;
  let currentUserRole = 'client';

  // ==========================================
  // MODULE 1: MASTER LAYOUT & MODAL CSS
  // ==========================================
  const injectGlobalCSS = () => {
    if (document.getElementById('jb-global-injected-styles')) return;
    const style = document.createElement('style');
    style.id = 'jb-global-injected-styles';
    style.innerHTML = `
      /* OVERRIDE OVERFLOW HIDDEN SO STICKY HEADERS WORK ON MOBILE */
      body, html { overflow-x: clip !important; }
      .jb-dashboard-root, .min-h-screen, .jb-main-view-wrapper, .main-wrapper { overflow-x: visible !important; clip-path: inset(0); }

      /* INSTANT RBAC HIDE */
      a[href="/properties"], a[href="/admin"], .jb-admin-only { display: none !important; }

      /* MASTER LAYOUT ENFORCEMENT */
      .sidebar, .jb-sidebar { position: fixed !important; top: 0 !important; bottom: 0 !important; left: 0 !important; width: 220px !important; display: flex !important; flex-direction: column !important; background-color: var(--accent, #2A3C30) !important; color: var(--background, #EBEBE6) !important; border-right: 1px solid var(--accent, #2A3C30) !important; z-index: 40 !important; text-align: left !important; font-family: var(--font-sans, "Inter", sans-serif) !important; }
      .sidebar-brand, .jb-sidebar-brand { display: flex !important; height: 4rem !important; align-items: center !important; gap: 0.75rem !important; border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important; padding: 0 1.25rem !important; }
      .sidebar-nav a, .jb-sidebar-nav a { font-family: var(--font-sans, "Inter", sans-serif) !important; font-size: 13px !important; }
      .sticky-header, .jb-header { position: sticky !important; top: 0 !important; z-index: 30 !important; background-color: rgba(42, 60, 48, 0.95) !important; color: var(--background, #EBEBE6) !important; backdrop-filter: blur(8px) !important; -webkit-backdrop-filter: blur(8px) !important; border-bottom: 1px solid var(--border, #C8CCC4) !important; width: 100% !important; }
      .header-container, .jb-header-container { display: flex !important; height: 4rem !important; align-items: center !important; justify-content: space-between !important; padding: 0 2rem !important; width: 100% !important; }
      .main-wrapper, .jb-main-view-wrapper { padding-left: 220px !important; width: 100% !important; max-width: 100% !important; }
      .nav-indicator-pipe, .jb-nav-indicator { height: 16px !important; width: 2px !important; background-color: var(--color-white, #fff) !important; margin-left: auto !important; border-radius: 2px; display: block !important; }
      .nav-item:not(.active) .nav-indicator-pipe, .jb-nav-item:not(.jb-nav-item-active) .jb-nav-indicator { display: none !important; }

      /* MODALS & FORMS CSS */
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
      .jb-prof-del-btn { width: 100%; background: transparent; color: var(--status-review, #A64444); padding: 0.75rem 1rem; border: 1px solid var(--status-review, #A64444); font-family: var(--font-mono, monospace); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; transition: background-color 0.2s; }
      .jb-prof-del-btn:hover { background-color: rgba(166, 68, 68, 0.05); }

      /* HELP FAB & ACCORDION */
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
      
      /* UNIVERSAL MOBILE NAV BUTTON STYLES */
      .jb-mobile-nav-btn { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px 4px; gap: 6px; font-family: var(--font-mono, monospace); font-size: 8px !important; text-transform: uppercase; letter-spacing: 0.05em; background: transparent; color: var(--surface-2, #A5B39A); text-decoration: none; border: none; text-align: center; transition: color 0.15s ease; }
      .jb-mobile-nav-btn.active { color: var(--color-white, #fff); }
      .jb-mobile-nav-btn svg { height: 1.25rem; width: 1.25rem; margin-bottom: 0; }

      /* MOBILE OVERRIDES */
      @media (max-width: 768px) {
        .sidebar, .jb-sidebar { display: none !important; }
        .main-wrapper, .jb-main-view-wrapper { padding-left: 0 !important; }
        .header-container, .jb-header-container { padding: 0 1rem !important; }
      }
      @media (min-width: 769px) {
        .mobile-brand, .jb-mobile-brand, .jb-universal-mobile-nav { display: none !important; }
        .header-telemetry-cluster, .jb-desktop-telemetry { display: flex !important; align-items: center !important; gap: 1.5rem !important; margin-right: auto !important; }
      }

      /* OPERATOR BADGE & HEADER TYPOGRAPHY ENFORCEMENT */
      .operator-badge, #jbOperatorDropdown { font-family: var(--font-mono, "JetBrains Mono", monospace) !important; font-size: 11px !important; font-weight: 500 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; color: var(--background, #EBEBE6) !important; }
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

  // ==========================================
  // MODULE 2: UI FIXES (MOBILE NAV & LOGOS)
  // ==========================================
  const fixMobileUI = () => {
    // 1. Fix missing logos
    const mobileBrands = document.querySelectorAll('.mobile-brand, .jb-mobile-brand');
    mobileBrands.forEach(brand => {
      if (!brand.querySelector('img')) {
        brand.innerHTML = `<img src="https://cdn.prod.website-files.com/6a2045cc1c7e7eee7fe5ef16/6a20510745a9edb28e4a4330_1-p-500.webp" style="height: 1.5rem; width: auto; object-fit: contain; margin-right: 0.5rem;"><span style="font-size: 12px; font-weight: 600; letter-spacing: -0.025em;">JOE BUILDS</span>`;
        brand.style.display = 'flex';
        brand.style.alignItems = 'center';
      }
    });

    // 2. Erase any hardcoded, broken, or empty mobile navbars
    document.querySelectorAll('.mobile-nav, .jb-bottom-bar, .jb-mobile-overlay, .jb-hamburger-btn').forEach(el => el.remove());

    // 3. Inject the Universal Sticky Bottom Nav
    const currentPath = window.location.pathname;
    const navHtml = `
      <nav class="jb-universal-mobile-nav" style="display: flex; width: 100vw; justify-content: space-evenly; background-color: var(--accent, #2A3C30); position: fixed; bottom: 0; left: 0; z-index: 99999; padding-top: 8px; padding-bottom: calc(8px + env(safe-area-inset-bottom)); box-shadow: 0 -4px 12px rgba(0,0,0,0.15);">
        <a href="/dashboard" class="jb-mobile-nav-btn ${currentPath.includes('dashboard') ? 'active' : ''}">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect></svg>Dashboard
        </a>
        <a href="/digital-twin" class="jb-mobile-nav-btn ${currentPath.includes('twin') ? 'active' : ''}">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"></path><path d="M15 5.764v15"></path><path d="M9 3.236v15"></path></svg>Twin
        </a>
        <a href="/diagnostics" class="jb-mobile-nav-btn ${currentPath.includes('diagnostics') ? 'active' : ''}">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"></path><path d="M6.453 15h11.094"></path><path d="M8.5 2h7"></path></svg>Diagnostics
        </a>
        <a href="/pathway" class="jb-mobile-nav-btn ${currentPath.includes('pathway') ? 'active' : ''}">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6a9 9 0 0 0-9 9V3"></path><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle></svg>Pathway
        </a>
        <a href="/properties" class="jb-mobile-nav-btn jb-admin-only ${currentPath.includes('properties') ? 'active' : ''}">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 7h2"></path><path d="M14 7h2"></path><path d="M8 11h2"></path><path d="M14 11h2"></path></svg>Properties
        </a>
        <a href="/reports" class="jb-mobile-nav-btn ${currentPath.includes('reports') ? 'active' : ''}">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>Reports
        </a>
        <a href="/admin" class="jb-mobile-nav-btn jb-admin-only ${currentPath.includes('admin') ? 'active' : ''}">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 17H5"></path><path d="M19 7h-9"></path><circle cx="17" cy="17" r="3"></circle><circle cx="7" cy="7" r="3"></circle></svg>Admin
        </a>
      </nav>
    `;
    document.body.insertAdjacentHTML('beforeend', navHtml);
  };

  // ==========================================
  // MODULE 3: PROFILE EDITOR
  // ==========================================
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
            <div style="margin-top: 1rem; padding-top: 1.5rem; border-top: 1px solid var(--border, #C8CCC4);">
              <div class="jb-prof-label" style="color:var(--status-review, #A64444); margin-bottom:0.75rem;">Danger Zone</div>
              <button id="btnDeleteAccount" class="jb-prof-del-btn">Delete Account & Data</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  };

  const bindProfileEvents = () => {
    const operatorMenu = document.getElementById('jbOperatorMenu');
    const logoutBtn = document.getElementById('jbLogoutBtn');
    
    if (operatorMenu && logoutBtn && !document.getElementById('jbTriggerEditProfile')) {
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
    if(!modal) return;
    document.getElementById('closeProfileModal').addEventListener('click', () => { modal.classList.add('jb-hidden'); document.getElementById('profileStatusMsg').style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target === modal) { modal.classList.add('jb-hidden'); document.getElementById('profileStatusMsg').style.display = 'none'; } });

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
        const opLabel = document.getElementById('jbOperatorLabel'); if (opLabel) opLabel.textContent = newName;
        statusMsg.textContent = "Profile updated successfully!"; statusMsg.style.color = "var(--status-stable, #3A6B48)"; statusMsg.style.display = "block";
        setTimeout(() => modal.classList.add('jb-hidden'), 1500);
      } catch (err) {
        statusMsg.textContent = err.message || "Failed to update profile."; statusMsg.style.color = "var(--status-review, #A64444)"; statusMsg.style.display = "block";
      }
      saveBtn.textContent = 'Save Changes'; saveBtn.disabled = false;
    });

    document.getElementById('btnDeleteAccount').addEventListener('click', async () => {
      const isConfirmed = confirm("Are you absolutely sure? This will permanently delete your account and revoke your access to the platform.");
      if (isConfirmed && currentMember && currentMember.data) {
        document.getElementById('btnDeleteAccount').textContent = "Deleting...";
        try {
          await supabaseClient.from('profiles').delete().eq('memberstack_id', currentMember.data.id);
          try { await window.$memberstackDom.deleteMember(); } catch(e) {}
          await window.$memberstackDom.logout(); window.location.href = '/login';
        } catch (err) { alert("An error occurred. Please contact support."); document.getElementById('btnDeleteAccount').textContent = "Delete Account & Data"; }
      }
    });
  };

  // ==========================================
  // MODULE 4: ROLE-BASED HELP SYSTEM
  // ==========================================
  const getHelpContent = (role) => {
    if (role === 'admin' || role === 'operator') {
      return `
        <div class="jb-accordion-item is-open"><button class="jb-accordion-header">Continuous Auto-Save Mechanics <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content">This platform uses continuous sync architecture. <strong>There are no "Save" buttons</strong> for telemetry inputs, statuses, or pathway milestones.<br><br><strong>How to save:</strong> Type your value or select a status, and simply <strong>click anywhere outside the field</strong> (or tap outside on mobile), or press <strong>Enter</strong>. <br><br>The background of the card will briefly pulse green to confirm the data has been securely written to the database and instantly published to the client.</div></div>
        <div class="jb-accordion-item"><button class="jb-accordion-header">Asset Initialization & Rooms <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content">Navigate to the <strong>Properties</strong> page to register new assets. If a property is entirely blank, use the <strong>Generate Baseline Data Profile</strong> button on the Admin page to automatically deploy the foundational engineering pathway and core metrics.<br><br><strong>Spatial Nodes:</strong> Adding a room on the Properties page automatically generates internal RH%, CO₂, and VOC sensors for that specific zone. If the Room Code matches our spatial library (e.g., 'bathroom'), a mapped hotspot will instantly appear on the Digital Twin floorplan.</div></div>
        <div class="jb-accordion-item"><button class="jb-accordion-header">Contextual Diagnostic Uploads <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content">Files dragged into the <strong>Admin Page Uploader</strong> are published directly to the client's Reports center.<br><br><strong>Target Context:</strong> If you select a specific room from the dropdown before uploading an image (JPG/PNG), the system will attach it to that room's Digital Twin node instead of the general reports center. This allows clients to click a room on their map and see the thermal imagery for that exact space.<br><br>Files uploaded on the <strong>Properties Page</strong> are considered internal evidence and are completely hidden from the client view.</div></div>
        ${role === 'admin' ? `<div class="jb-accordion-item"><button class="jb-accordion-header">User & Access Management <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content">Click the <strong>Users</strong> button in the top header. Here, you can assign clients to their properties so their dashboard populates.<br><br>As an Admin, you are the only role permitted to elevate a user's permissions from "Client" to "Operator" or "Admin". Operators can view this menu to assign properties, but cannot change user roles.</div></div>` : ''}
        <div class="jb-accordion-item"><button class="jb-accordion-header">Profile Management <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content">Click the <strong>Operator Dropdown</strong> in the top right to access <strong>Edit Profile</strong>. From here, you can update your name and email, or completely delete your account and data from the system.</div></div>
      `;
    } else {
      return `
        <div class="jb-accordion-item is-open"><button class="jb-accordion-header">Understanding Your Dashboard <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content">Your dashboard provides a high-level health summary of your building. <br><br><strong>Integrity Index:</strong> The badge in the top right is a composite score out of 1.00 indicating the overall resilience of your building envelope.<br><br><strong>Next Action:</strong> The dark green panel at the bottom highlights the exact next step required in your engineering sequence. Clicking "Review Plan" will show you the full roadmap.</div></div>
        <div class="jb-accordion-item"><button class="jb-accordion-header">Digital Twin & Diagnostics <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content"><strong>Digital Twin:</strong> An interactive 2D map of your property. Tap any circular room node to open the side-drawer and inspect live sensor telemetry (like bedroom CO₂ levels), analyst notes, and room-specific thermal imagery.<br><br><strong>Diagnostics:</strong> The raw data ledger. This logs the exact measurements captured by our analysts. Clicking any row will pull up the specific instrument record (like thermal camera imagery or blower door logs).</div></div>
        <div class="jb-accordion-item"><button class="jb-accordion-header">Building Science Glossary <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content"><ul><li><strong>ACH50:</strong> Air Changes per Hour at 50 Pascals. This measures how drafty or airtight your home is. Lower is better.</li><li><strong>U-Value:</strong> Measures thermal transmittance. It tells us how effectively your walls and roof prevent heat from escaping. Lower is better.</li><li><strong>VOC (Volatile Organic Compounds):</strong> Harmful gasses emitted by paints, glues, and materials that impact indoor air quality.</li><li><strong>RH (Relative Humidity):</strong> The amount of moisture in the air. High RH leads to condensation and structural mold risk.</li></ul></div></div>
        <div class="jb-accordion-item"><button class="jb-accordion-header">Profile & Mobile Navigation <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content"><strong>Mobile Users:</strong> Use the bottom navigation bar to switch between views.<br><br><strong>Account Management:</strong> Click the <strong>Operator Dropdown</strong> in the top right to access <strong>Edit Profile</strong>. You can update your information or delete your account to remove your data from our systems for privacy compliance.</div></div>
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

  // ==========================================
  // INITIALIZATION
  // ==========================================
  const init = async () => {
    fixMobileUI(); // Instantly fix logos, overscroll, and build the unified mobile nav

    if (!document.getElementById('jbOperatorDropdown')) return;

    if (window.supabase) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      injectGlobalCSS();
      injectProfileHTML();
      bindProfileEvents();

      try {
        const member = await window.$memberstackDom.getCurrentMember();
        if (member && member.data) {
          const { data: profile } = await supabaseClient.from('profiles').select('role').eq('memberstack_id', member.data.id).single();
          currentUserRole = profile?.role || 'client';
          
          injectHelpSystem(currentUserRole);

          if (currentUserRole === 'admin' || currentUserRole === 'operator') {
             // Reveal admin links in desktop and mobile nav
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
