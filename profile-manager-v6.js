/**
 * Joe Builds Home Intelligence Platform
 * Global Profile Manager (v6 - Includes Global Role-Based Help System)
 */
const JoeBuildsProfileManager = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  
  let supabaseClient;
  let currentMember = null;
  let currentUserRole = 'client';

  // ==========================================
  // MODULE 1: GLOBAL CSS (Profiles & Help)
  // ==========================================
  const injectGlobalCSS = () => {
    if (document.getElementById('jb-global-injected-styles')) return;
    const style = document.createElement('style');
    style.id = 'jb-global-injected-styles';
    style.innerHTML = `
      /* Profile Modal */
      #jbGlobalProfileModal, #jbHelpModal { position: fixed; inset: 0; background-color: rgba(26,36,29,0.7); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 1rem; }
      .jb-hidden { display: none !important; }
      .jb-prof-frame { width: 100%; max-width: 28rem; background-color: var(--surface, #FFFFFF); border: 1px solid var(--border, #C8CCC4); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); display: flex; flex-direction: column; max-height: 90vh; }
      .jb-prof-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border, #C8CCC4); }
      .jb-prof-close { background: transparent; border: none; cursor: pointer; color: var(--muted-foreground, #637066); padding: 0.25rem; display: flex; align-items: center; justify-content: center; transition: color 0.15s; }
      .jb-prof-close:hover { color: var(--foreground, #1A241D); }
      .jb-prof-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; overflow-y: auto; }
      .jb-prof-label { font-family: var(--font-mono, monospace); font-size: 9px; color: var(--muted-foreground, #637066); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.375rem; display: block; font-weight: 700; }
      .jb-prof-input { width: 100%; border: 1px solid var(--border, #C8CCC4); padding: 0.625rem 0.75rem; background: var(--surface, #FFFFFF); color: var(--foreground, #1A241D); font-family: var(--font-mono, monospace); font-size: 13px; outline: none; transition: border-color 0.15s; }
      .jb-prof-input:focus { border-color: var(--accent, #2A3C30); }
      .jb-prof-btn { width: 100%; background: var(--foreground, #1A241D); color: var(--background, #EBEBE6); padding: 0.75rem 1rem; border: 1px solid var(--foreground, #1A241D); font-family: var(--font-mono, monospace); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; transition: background-color 0.2s; }
      .jb-prof-btn:hover { background-color: var(--accent, #2A3C30); }
      
      /* Floating Action Button (Help) */
      .jb-help-fab { position: fixed; bottom: 2rem; right: 2rem; width: 3rem; height: 3rem; background-color: var(--accent, #2A3C30); color: var(--background, #EBEBE6); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer; border: none; z-index: 9000; transition: transform 0.2s ease, background-color 0.2s ease; }
      .jb-help-fab:hover { transform: scale(1.05); background-color: var(--foreground, #1A241D); }
      
      /* Help Modal Specifics */
      .jb-help-item { border-bottom: 1px solid var(--border, #C8CCC4); padding-bottom: 1rem; margin-bottom: 1rem; }
      .jb-help-item:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0; }
      .jb-help-item h4 { font-size: 13px; font-weight: 600; margin-bottom: 0.25rem; color: var(--foreground, #1A241D); }
      .jb-help-item p { font-size: 12px; color: var(--muted-foreground, #637066); line-height: 1.5; }

      @media (max-width: 768px) {
        .jb-help-fab { bottom: 5.5rem; right: 1.5rem; width: 2.5rem; height: 2.5rem; } /* Lifted above mobile nav */
        .jb-help-fab svg { width: 1.25rem; height: 1.25rem; }
      }
    `;
    document.head.appendChild(style);
  };

  // ==========================================
  // MODULE 2: PROFILE EDITOR
  // ==========================================
  const injectProfileHTML = () => {
    if (document.getElementById('jbGlobalProfileModal')) return;
    const modalHTML = `
      <div id="jbGlobalProfileModal" class="jb-hidden">
        <div class="jb-prof-frame">
          <div class="jb-prof-header">
            <div>
              <div class="jb-prof-label" style="margin-bottom:0.25rem;">Account Settings</div>
              <h2 style="font-size:18px; font-weight:500; font-family:var(--font-sans, sans-serif); color:var(--foreground, #1A241D); margin:0;">Edit Profile</h2>
            </div>
            <button id="closeProfileModal" class="jb-prof-close">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.25rem; height:1.25rem;"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>
          </div>
          <div class="jb-prof-body">
            <form id="jbProfileForm" style="display: flex; flex-direction: column; gap: 1.25rem; margin:0;">
              <label style="display:block; margin:0;">
                <span class="jb-prof-label">Full Name</span>
                <input type="text" id="profileName" required class="jb-prof-input">
              </label>
              <label style="display:block; margin:0;">
                <span class="jb-prof-label">Email Address</span>
                <input type="email" id="profileEmail" required class="jb-prof-input">
              </label>
              <div id="profileStatusMsg" style="font-family:var(--font-sans, sans-serif); font-size:12px; display:none; margin:0;"></div>
              <button type="submit" id="btnSaveProfile" class="jb-prof-btn" style="margin-top:0.5rem;">Save Changes</button>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  };

  const bindProfileEvents = () => {
    const operatorMenu = document.getElementById('jbOperatorMenu');
    const logoutBtn = document.getElementById('jbLogoutBtn');
    
    // Inject Dropdown Button
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

    // Bind Modal Saves
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
  };

  // ==========================================
  // MODULE 3: ROLE-BASED HELP SYSTEM
  // ==========================================
  const getHelpContent = (role) => {
    if (role === 'admin') {
      return `
        <div class="jb-help-item"><h4>Global Properties</h4><p>Navigate to the <strong>Properties</strong> page to register new assets and upload internal, non-client-facing evidence.</p></div>
        <div class="jb-help-item"><h4>User Management</h4><p>On the <strong>Admin</strong> page, click the 'Users' button in the top right to assign clients to their properties and manage Operator roles.</p></div>
        <div class="jb-help-item"><h4>Data Editing</h4><p>On the <strong>Admin</strong> page, changes to telemetry, twin nodes, or pathway dropdowns save automatically when you click outside the box.</p></div>
      `;
    } else if (role === 'operator') {
      return `
        <div class="jb-help-item"><h4>Asset Switching</h4><p>On the <strong>Admin</strong> page, use the top dropdown to switch between client properties before entering data.</p></div>
        <div class="jb-help-item"><h4>Data Entry</h4><p>Update telemetry and pathway milestones directly in the <strong>Admin</strong> panel. Changes save automatically and sync instantly to the client's dashboard.</p></div>
        <div class="jb-help-item"><h4>Report Uploads</h4><p>Drag and drop PDF or CSV files into the Diagnostic Report Uploader to securely transfer them to the client's Reports center.</p></div>
      `;
    } else {
      // Client / Demo User
      return `
        <div class="jb-help-item"><h4>Dashboard</h4><p>View high-level health metrics for your building. Click any card to view detailed historical sparklines and analyst notes.</p></div>
        <div class="jb-help-item"><h4>Digital Twin</h4><p>Interact with the 2D spatial map of your property. Tap any room node to inspect live sensor telemetry and zone statuses.</p></div>
        <div class="jb-help-item"><h4>Diagnostics & Reports</h4><p>Explore the raw building science data in the Diagnostics tab, or visit the Reports tab to download official documentation and view upcoming service bookings.</p></div>
      `;
    }
  };

  const injectHelpSystem = (role) => {
    // 1. Inject the FAB (Floating Action Button)
    const fabHTML = `
      <button id="jbHelpFab" class="jb-help-fab" title="Platform Guide">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      </button>
    `;
    document.body.insertAdjacentHTML('beforeend', fabHTML);

    // 2. Inject the Help Modal
    const helpModalHTML = `
      <div id="jbHelpModal" class="jb-hidden">
        <div class="jb-prof-frame">
          <div class="jb-prof-header">
            <div>
              <div class="jb-prof-label" style="margin-bottom:0.25rem;">Platform Guide</div>
              <h2 style="font-size:18px; font-weight:500; font-family:var(--font-sans, sans-serif); color:var(--foreground, #1A241D); margin:0;">How to use this portal</h2>
            </div>
            <button id="closeHelpModal" class="jb-prof-close">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.25rem; height:1.25rem;"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>
          </div>
          <div class="jb-prof-body">
            ${getHelpContent(role)}
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', helpModalHTML);

    // 3. Bind Events
    const fab = document.getElementById('jbHelpFab');
    const helpModal = document.getElementById('jbHelpModal');
    const closeHelp = document.getElementById('closeHelpModal');

    fab.addEventListener('click', () => helpModal.classList.remove('jb-hidden'));
    closeHelp.addEventListener('click', () => helpModal.classList.add('jb-hidden'));
    helpModal.addEventListener('click', (e) => { if (e.target === helpModal) helpModal.classList.add('jb-hidden'); });
  };

  // ==========================================
  // MODULE 4: SMART HAMBURGER MENU (For Clients)
  // ==========================================
  const injectHamburgerCSS = () => {
    if (document.getElementById('jb-hamburger-styles')) return;
    const style = document.createElement('style');
    style.id = 'jb-hamburger-styles';
    style.innerHTML = `
      .jb-hamburger-btn { display: flex; align-items: center; justify-content: center; background: transparent; border: none; color: var(--background, #EBEBE6); cursor: pointer; padding: 0.25rem; margin-right: 0.5rem; transition: color 0.15s ease; }
      .jb-hamburger-btn:hover { color: var(--surface-2, #A5B39A); }
      .jb-mobile-overlay { position: fixed; top: 4rem; left: 0; right: 0; bottom: 0; background-color: rgba(42, 60, 48, 0.98); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); z-index: 25; display: flex; flex-direction: column; padding: 1.5rem; transform: translateX(-100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); overflow-y: auto; }
      .jb-mobile-overlay.is-open { transform: translateX(0); }
      .jb-mobile-overlay .nav-item, .jb-mobile-overlay .jb-nav-item { font-size: 16px; padding: 1.25rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--surface-2, #A5B39A); text-decoration: none; display: flex; align-items: center; gap: 1rem; }
      .jb-mobile-overlay .nav-item.active, .jb-mobile-overlay .jb-nav-item-active { color: var(--color-white, #fff); background-color: rgba(165, 179, 154, 0.15); border-radius: 4px; border-bottom: none; }
      .jb-mobile-overlay svg { width: 1.25rem; height: 1.25rem; }
      
      @media (max-width: 768px) {
        body.use-hamburger .mobile-nav, 
        body.use-hamburger .jb-bottom-bar { display: none !important; }
        body.use-hamburger main { padding-bottom: 2rem !important; }
      }
      @media (min-width: 769px) {
        .jb-hamburger-btn, .jb-mobile-overlay { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  };

  const setupHamburgerMenu = () => {
    if (document.querySelector('.jb-hamburger-btn')) return; 
    document.body.classList.add('use-hamburger'); 

    const headerContainer = document.querySelector('.header-container') || document.querySelector('.jb-header-container');
    const mobileBrand = document.querySelector('.mobile-brand') || document.querySelector('.jb-mobile-brand');
    
    if (headerContainer && mobileBrand) {
      const leftWrap = document.createElement('div');
      leftWrap.style.display = 'flex'; leftWrap.style.alignItems = 'center';
      
      const btn = document.createElement('button'); btn.className = 'jb-hamburger-btn';
      btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
      
      headerContainer.insertBefore(leftWrap, mobileBrand);
      leftWrap.appendChild(btn); leftWrap.appendChild(mobileBrand);

      const overlay = document.createElement('div'); overlay.className = 'jb-mobile-overlay';
      const desktopNav = document.querySelector('.sidebar-nav') || document.querySelector('.jb-sidebar-nav');
      if (desktopNav) overlay.innerHTML = desktopNav.innerHTML;
      document.body.appendChild(overlay);

      let isOpen = false;
      btn.addEventListener('click', () => {
        isOpen = !isOpen;
        if (isOpen) {
          overlay.classList.add('is-open');
          btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        } else {
          overlay.classList.remove('is-open');
          btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
        }
      });
    }
  };

  // ==========================================
  // INITIALIZATION
  // ==========================================
  const init = async () => {
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
          
          // Inject the FAB Help System based on Role
          injectHelpSystem(currentUserRole);

          if (currentUserRole === 'client' || currentUserRole === 'demo') {
            injectHamburgerCSS();
            setupHamburgerMenu();
            const observer = new MutationObserver(() => {
              if (document.querySelector('.header-container') || document.querySelector('.jb-header-container')) {
                setupHamburgerMenu();
                observer.disconnect(); 
              }
            });
            observer.observe(document.body, { childList: true, subtree: true });
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
