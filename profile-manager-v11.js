/**
 * Joe Builds Home Intelligence Platform
 * Global Profile Manager (v10 - Master Global Layout & Mobile Nav Auto-Trimmer)
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
      /* 1. INSTANT RBAC HIDE (Prevents Flashing) */
      a[href="/properties"], a[href="/admin"] { display: none !important; }

      /* 2. MASTER LAYOUT ENFORCEMENT */
      .sidebar, .jb-sidebar { position: fixed !important; top: 0 !important; bottom: 0 !important; left: 0 !important; width: 220px !important; display: flex !important; flex-direction: column !important; background-color: var(--accent, #2A3C30) !important; color: var(--background, #EBEBE6) !important; border-right: 1px solid var(--accent, #2A3C30) !important; z-index: 40 !important; text-align: left !important; font-family: var(--font-sans, "Inter", sans-serif) !important; }
      .sidebar-brand, .jb-sidebar-brand { display: flex !important; height: 4rem !important; align-items: center !important; gap: 0.75rem !important; border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important; padding: 0 1.25rem !important; }
      .sidebar-nav a, .jb-sidebar-nav a { font-family: var(--font-sans, "Inter", sans-serif) !important; font-size: 13px !important; }
      
      .sticky-header, .jb-header { position: sticky !important; top: 0 !important; z-index: 30 !important; background-color: rgba(42, 60, 48, 0.95) !important; color: var(--background, #EBEBE6) !important; backdrop-filter: blur(8px) !important; -webkit-backdrop-filter: blur(8px) !important; border-bottom: 1px solid var(--border, #C8CCC4) !important; width: 100% !important; }
      .header-container, .jb-header-container { display: flex !important; height: 4rem !important; align-items: center !important; justify-content: space-between !important; padding: 0 2rem !important; width: 100% !important; }
      .main-wrapper, .jb-main-view-wrapper { padding-left: 220px !important; width: 100% !important; max-width: 100% !important; }
      
      /* 3. ACTIVE NAV LINE FIX */
      .nav-indicator-pipe, .jb-nav-indicator { height: 16px !important; width: 2px !important; background-color: var(--color-white, #fff) !important; margin-left: auto !important; border-radius: 2px; display: block !important; }
      .nav-item:not(.active) .nav-indicator-pipe, .jb-nav-item:not(.jb-nav-item-active) .jb-nav-indicator { display: none !important; }

      /* 4. MODALS & FORMS CSS */
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
      .jb-help-fab { position: fixed; bottom: 2rem; right: 2rem; width: 3rem; height: 3rem; background-color: var(--accent, #2A3C30); color: var(--background, #EBEBE6); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer; border: none; z-index: 9000; transition: transform 0.2s ease, background-color 0.2s ease; }
      .jb-help-fab:hover { transform: scale(1.05); background-color: var(--foreground, #1A241D); }
      .jb-accordion-item { border: 1px solid var(--border, #C8CCC4); margin-bottom: 0.5rem; background: var(--surface, #FFFFFF); }
      .jb-accordion-header { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: transparent; border: none; cursor: pointer; text-align: left; font-size: 14px; font-weight: 500; color: var(--foreground, #1A241D); font-family: var(--font-sans, sans-serif); }
      .jb-accordion-header:hover { background: rgba(165,179,154,0.05); }
      .jb-accordion-header svg { width: 1rem; height: 1rem; color: var(--muted-foreground, #637066); transition: transform 0.2s ease; }
      .jb-accordion-item.is-open .jb-accordion-header svg { transform: rotate(180deg); }
      .jb-accordion-content { display: none; padding: 0 1rem 1rem 1rem; font-size: 13px; line-height: 1.6; color: var(--muted-foreground, #637066); }
      .jb-accordion-item.is-open .jb-accordion-content { display: block; }
      
      /* 5. HAMBURGER MENU CSS */
      .jb-hamburger-btn { display: flex; align-items: center; justify-content: center; background: transparent; border: none; color: var(--background, #EBEBE6); cursor: pointer; padding: 0.25rem; margin-right: 0.5rem; transition: color 0.15s ease; }
      .jb-hamburger-btn:hover { color: var(--surface-2, #A5B39A); }
      .jb-mobile-overlay { position: fixed; top: 4rem; left: 0; right: 0; bottom: 0; background-color: rgba(42, 60, 48, 0.98); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); z-index: 25; display: flex; flex-direction: column; padding: 1.5rem; transform: translateX(-100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); overflow-y: auto; }
      .jb-mobile-overlay.is-open { transform: translateX(0); }
      .jb-mobile-overlay .nav-item, .jb-mobile-overlay .jb-nav-item { font-size: 16px; padding: 1.25rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--surface-2, #A5B39A); text-decoration: none; display: flex; align-items: center; gap: 1rem; }
      .jb-mobile-overlay .nav-item.active, .jb-mobile-overlay .jb-nav-item-active { color: var(--color-white, #fff); background-color: rgba(165, 179, 154, 0.15); border-radius: 4px; border-bottom: none; }
      .jb-mobile-overlay svg { width: 1.25rem; height: 1.25rem; }

      /* 6. MOBILE OVERRIDES */
      @media (max-width: 768px) {
        .sidebar, .jb-sidebar { display: none !important; }
        .main-wrapper, .jb-main-view-wrapper { padding-left: 0 !important; }
        .header-container, .jb-header-container { padding: 0 1rem !important; }
        .jb-help-fab { bottom: 5.5rem; right: 1.5rem; width: 2.5rem; height: 2.5rem; }
        body.use-hamburger .mobile-nav, body.use-hamburger .jb-bottom-bar { display: none !important; }
        body.use-hamburger main { padding-bottom: 2rem !important; }
      }
      @media (min-width: 769px) {
        .mobile-brand, .jb-mobile-brand { display: none !important; }
        .header-telemetry-cluster, .jb-desktop-telemetry { display: flex !important; align-items: center !important; gap: 1.5rem !important; margin-right: auto !important; }
        .mobile-nav, .jb-bottom-bar, .jb-hamburger-btn, .jb-mobile-overlay { display: none !important; }
      }

      /* 7. OPERATOR BADGE & HEADER TYPOGRAPHY ENFORCEMENT */
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
  // MODULE 2: AUTO-TRIM MOBILE NAV TEXT
  // ==========================================
  const fixMobileNavText = () => {
    // Finds all mobile nav buttons globally and ensures the text is short
    document.querySelectorAll('.mobile-nav-btn, .jb-bottom-item').forEach(btn => {
      const href = btn.getAttribute('href');
      
      // Shorten Pathway and Digital Twin
      if (href === '/pathway' || href === '/digital-twin') {
        const svg = btn.querySelector('svg');
        const newText = href === '/pathway' ? ' Pathway' : ' Twin';
        if (svg) {
          btn.innerHTML = ''; 
          btn.appendChild(svg);
          btn.appendChild(document.createTextNode(newText));
        }
      }
    });
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
  };

  // ==========================================
  // MODULE 4: ROLE-BASED HELP SYSTEM
  // ==========================================
  const getHelpContent = (role) => {
    if (role === 'admin' || role === 'operator') {
      return `
        <div class="jb-accordion-item is-open"><button class="jb-accordion-header">Continuous Auto-Save Mechanics <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content">This platform uses continuous sync architecture. <strong>There are no "Save" buttons</strong> for telemetry inputs, statuses, or pathway milestones.<br><br><strong>How to save:</strong> Type your value or select a status, and simply <strong>click anywhere outside the field</strong> (or tap outside on mobile), or press <strong>Enter</strong>. <br><br>The background of the card will briefly pulse green to confirm the data has been securely written to the database and instantly published to the client.</div></div>
        <div class="jb-accordion-item"><button class="jb-accordion-header">Managing Properties & Rooms <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content">Navigate to the <strong>Properties</strong> page to register new assets. When viewing a property's details, you can add <strong>Spatial Nodes (Rooms)</strong>.<br><br><strong>Automation:</strong> Creating a new room automatically generates blank RH%, CO₂, and VOC sensors in the database for that specific room, instantly making them editable on the Admin page and viewable on the Digital Twin.</div></div>
        <div class="jb-accordion-item"><button class="jb-accordion-header">Diagnostic Report Uploads <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content">Files dragged into the <strong>Admin Page Uploader</strong> are immediately published to the client's Reports center. Files uploaded on the <strong>Properties Page</strong> are considered internal evidence and are hidden from the client view.</div></div>
        ${role === 'admin' ? `<div class="jb-accordion-item"><button class="jb-accordion-header">User & Access Management <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content">Click the <strong>Users</strong> button in the top header. Here, you can assign clients to their properties so their dashboard populates.<br><br>As an Admin, you are the only role permitted to elevate a user's permissions from "Client" to "Operator" or "Admin". Changes save automatically when a new dropdown value is selected.</div></div>` : ''}
      `;
    } else {
      return `
        <div class="jb-accordion-item is-open"><button class="jb-accordion-header">Understanding Your Dashboard <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content">Your dashboard provides a high-level health summary of your building. <br><br><strong>Integrity Index:</strong> The badge in the top right is a composite score out of 1.00 indicating the overall resilience of your building envelope.<br><br><strong>Next Action:</strong> The dark green panel at the bottom highlights the exact next step required in your engineering sequence. Clicking "Review Plan" will show you the full roadmap.</div></div>
        <div class="jb-accordion-item"><button class="jb-accordion-header">Building Science Glossary <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content"><ul><li><strong>ACH50:</strong> Air Changes per Hour at 50 Pascals. This measures how drafty or airtight your home is. Lower is better.</li><li><strong>U-Value:</strong> Measures thermal transmittance. It tells us how effectively your walls and roof prevent heat from escaping. Lower is better.</li><li><strong>VOC (Volatile Organic Compounds):</strong> Harmful gasses emitted by paints, glues, and materials that impact indoor air quality.</li><li><strong>RH (Relative Humidity):</strong> The amount of moisture in the air. High RH leads to condensation and structural mold risk.</li></ul></div></div>
        <div class="jb-accordion-item"><button class="jb-accordion-header">Digital Twin & Diagnostics <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></button><div class="jb-accordion-content"><strong>Digital Twin:</strong> An interactive map of your property. Tap any room to view live, localized sensor telemetry (like bedroom CO₂ levels).<br><br><strong>Diagnostics:</strong> The raw data ledger. This logs the exact measurements captured by our analysts. Clicking any row will pull up the specific instrument record (like thermal camera imagery or blower door logs).</div></div>
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
  // MODULE 5: SMART HAMBURGER MENU
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
        body.use-hamburger main { padding-bottom: 2rem !important; }
      }
      @media (min-width: 769px) { .jb-hamburger-btn, .jb-mobile-overlay { display: none !important; } }
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

  const init = async () => {
    fixMobileNavText(); // Instantly trims long nav text

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

          if (currentUserRole === 'client' || currentUserRole === 'demo') {
            document.querySelectorAll('.mobile-nav, .jb-bottom-bar').forEach(el => el.remove());
            
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
