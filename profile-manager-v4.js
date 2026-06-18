/**
 * Joe Builds Home Intelligence Platform
 * Global Profile Manager (v4 - Deterministic Smart Hamburger Menu & Profile Edit)
 */
const JoeBuildsProfileManager = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  
  let supabaseClient;
  let currentMember = null;

  // ==========================================
  // MODULE 1: PROFILE MODAL
  // ==========================================
  const injectModalCSS = () => {
    if (document.getElementById('jb-profile-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'jb-profile-modal-styles';
    style.innerHTML = `
      #jbGlobalProfileModal { position: fixed; inset: 0; background-color: rgba(26,36,29,0.7); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 1rem; }
      #jbGlobalProfileModal.jb-hidden { display: none !important; }
      .jb-prof-frame { width: 100%; max-width: 28rem; background-color: var(--surface, #FFFFFF); border: 1px solid var(--border, #C8CCC4); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); display: flex; flex-direction: column; }
      .jb-prof-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border, #C8CCC4); }
      .jb-prof-close { background: transparent; border: none; cursor: pointer; color: var(--muted-foreground, #637066); padding: 0.25rem; display: flex; align-items: center; justify-content: center; transition: color 0.15s; }
      .jb-prof-close:hover { color: var(--foreground, #1A241D); }
      .jb-prof-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
      .jb-prof-label { font-family: var(--font-mono, monospace); font-size: 9px; color: var(--muted-foreground, #637066); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.375rem; display: block; font-weight: 700; }
      .jb-prof-input { width: 100%; border: 1px solid var(--border, #C8CCC4); padding: 0.625rem 0.75rem; background: var(--surface, #FFFFFF); color: var(--foreground, #1A241D); font-family: var(--font-mono, monospace); font-size: 13px; outline: none; transition: border-color 0.15s; }
      .jb-prof-input:focus { border-color: var(--accent, #2A3C30); }
      .jb-prof-btn { width: 100%; background: var(--foreground, #1A241D); color: var(--background, #EBEBE6); padding: 0.75rem 1rem; border: 1px solid var(--foreground, #1A241D); font-family: var(--font-mono, monospace); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; transition: background-color 0.2s; }
      .jb-prof-btn:hover { background-color: var(--accent, #2A3C30); }
      .jb-prof-btn:disabled { opacity: 0.7; cursor: not-allowed; }
      .jb-prof-del-btn { width: 100%; background: transparent; color: var(--status-review, #A64444); padding: 0.75rem 1rem; border: 1px solid var(--status-review, #A64444); font-family: var(--font-mono, monospace); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; transition: background-color 0.2s; }
      .jb-prof-del-btn:hover { background-color: rgba(166, 68, 68, 0.05); }
    `;
    document.head.appendChild(style);
  };

  const injectModalHTML = () => {
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

  const injectDropdownButton = () => {
    const operatorMenu = document.getElementById('jbOperatorMenu');
    const logoutBtn = document.getElementById('jbLogoutBtn');
    if (document.getElementById('jbTriggerEditProfile')) return;
    if (operatorMenu && logoutBtn) {
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
  };

  const bindModalEvents = () => {
    const modal = document.getElementById('jbGlobalProfileModal');
    const closeBtn = document.getElementById('closeProfileModal');
    const profileForm = document.getElementById('jbProfileForm');
    const saveBtn = document.getElementById('btnSaveProfile');
    const deleteBtn = document.getElementById('btnDeleteAccount');
    const statusMsg = document.getElementById('profileStatusMsg');

    const closeModal = () => { modal.classList.add('jb-hidden'); statusMsg.style.display = 'none'; };
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault(); saveBtn.textContent = 'Saving...'; saveBtn.disabled = true;
      const newName = document.getElementById('profileName').value;
      const newEmail = document.getElementById('profileEmail').value;
      try {
        await window.$memberstackDom.updateMember({ email: newEmail, customFields: { "first-name": newName } });
        if (currentMember && currentMember.data) {
          await supabaseClient.from('profiles').update({ first_name: newName, email: newEmail }).eq('memberstack_id', currentMember.data.id);
        }
        const opLabel = document.getElementById('jbOperatorLabel'); if (opLabel) opLabel.textContent = newName;
        statusMsg.textContent = "Profile updated successfully!"; statusMsg.style.color = "var(--status-stable, #3A6B48)"; statusMsg.style.display = "block";
        setTimeout(() => closeModal(), 1500);
      } catch (err) {
        statusMsg.textContent = err.message || "Failed to update profile."; statusMsg.style.color = "var(--status-review, #A64444)"; statusMsg.style.display = "block";
      }
      saveBtn.textContent = 'Save Changes'; saveBtn.disabled = false;
    });

    deleteBtn.addEventListener('click', async () => {
      const isConfirmed = confirm("Are you absolutely sure? This will permanently delete your account and revoke your access to the platform.");
      if (isConfirmed && currentMember && currentMember.data) {
        deleteBtn.textContent = "Deleting...";
        try {
          await supabaseClient.from('profiles').delete().eq('memberstack_id', currentMember.data.id);
          try { await window.$memberstackDom.deleteMember(); } catch(e) {}
          await window.$memberstackDom.logout(); window.location.href = '/login';
        } catch (err) { alert("An error occurred. Please contact support."); deleteBtn.textContent = "Delete Account & Data"; }
      }
    });
  };

  // ==========================================
  // MODULE 2: SMART MOBILE HAMBURGER MENU
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
      .jb-mobile-overlay .nav-item { font-size: 16px; padding: 1.25rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--surface-2, #A5B39A); text-decoration: none; display: flex; align-items: center; gap: 1rem; }
      .jb-mobile-overlay .nav-item.active { color: var(--color-white, #fff); background-color: rgba(165, 179, 154, 0.15); border-radius: 4px; border-bottom: none; }
      .jb-mobile-overlay .nav-item svg { width: 1.25rem; height: 1.25rem; }
      
      @media (max-width: 768px) {
        body.use-hamburger .mobile-nav { display: none !important; }
        body.use-hamburger main { padding-bottom: 2rem !important; }
      }
      @media (min-width: 769px) {
        .jb-hamburger-btn, .jb-mobile-overlay { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  };

  const setupHamburgerMenu = () => {
    if (document.querySelector('.jb-hamburger-btn')) return; // Already exists
    
    document.body.classList.add('use-hamburger'); // This class completely vaporizes the bottom bar

    const headerContainer = document.querySelector('.header-container');
    const mobileBrand = document.querySelector('.mobile-brand');
    
    if (headerContainer && mobileBrand) {
      const leftWrap = document.createElement('div');
      leftWrap.style.display = 'flex';
      leftWrap.style.alignItems = 'center';
      
      const btn = document.createElement('button');
      btn.className = 'jb-hamburger-btn';
      btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
      
      headerContainer.insertBefore(leftWrap, mobileBrand);
      leftWrap.appendChild(btn);
      leftWrap.appendChild(mobileBrand);

      const overlay = document.createElement('div');
      overlay.className = 'jb-mobile-overlay';
      
      // Clone the links from the desktop sidebar
      const desktopNav = document.querySelector('.sidebar-nav');
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
    if (!document.getElementById('jbOperatorDropdown')) return;

    if (window.supabase) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      injectModalCSS();
      injectModalHTML();
      injectDropdownButton();
      bindModalEvents();

      // Deterministic Role Check for Hamburger Menu
      try {
        const member = await window.$memberstackDom.getCurrentMember();
        if (member && member.data) {
          const { data: profile } = await supabaseClient.from('profiles').select('role').eq('memberstack_id', member.data.id).single();
          const role = profile?.role || 'client';
          
          if (role === 'client' || role === 'demo') {
            injectHamburgerCSS();
            setupHamburgerMenu();
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
