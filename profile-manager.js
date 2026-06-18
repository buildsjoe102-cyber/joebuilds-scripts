/**
 * Joe Builds Home Intelligence Platform
 * Global Profile Manager (Dynamic Modal Injection, Memberstack Sync, Supabase Sync)
 */
const JoeBuildsProfileManager = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  
  let supabaseClient;
  let currentMember = null;

  // 1. Inject the HTML for the Profile Modal directly into the page
  const injectModalHTML = () => {
    const modalHTML = `
      <div id="jbGlobalProfileModal" class="jb-modal-backdrop jb-hidden" style="z-index: 9999;">
        <div class="jb-modal-frame" style="max-width: 28rem;">
          <div class="jb-modal-header" style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div class="eyebrow" style="font-family:var(--font-mono); font-size:9px; color:var(--muted-foreground); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:0.25rem;">Account Settings</div>
              <h2 style="font-size:18px; font-weight:500;">Edit Profile</h2>
            </div>
            <button id="closeProfileModal" style="background:transparent; border:none; cursor:pointer; color:var(--muted-foreground);">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.25rem; height:1.25rem;"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>
          </div>
          <div class="jb-modal-body" style="padding: 1.5rem;">
            <form id="jbProfileForm" style="display: flex; flex-direction: column; gap: 1.25rem;">
              <label style="display:block;">
                <div class="eyebrow" style="font-family:var(--font-mono); font-size:9px; color:var(--muted-foreground); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:0.375rem;">Full Name</div>
                <input type="text" id="profileName" required style="width:100%; border:1px solid var(--border); padding:0.625rem 0.75rem; background:var(--surface); font-family:var(--font-mono); font-size:13px; outline:none;">
              </label>
              <label style="display:block;">
                <div class="eyebrow" style="font-family:var(--font-mono); font-size:9px; color:var(--muted-foreground); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:0.375rem;">Email Address</div>
                <input type="email" id="profileEmail" required style="width:100%; border:1px solid var(--border); padding:0.625rem 0.75rem; background:var(--surface); font-family:var(--font-mono); font-size:13px; outline:none;">
              </label>
              <div id="profileStatusMsg" style="font-size:12px; display:none;"></div>
              <button type="submit" id="btnSaveProfile" style="width:100%; background:var(--foreground); color:var(--background); padding:0.75rem 1rem; border:1px solid var(--foreground); font-family:var(--font-mono); font-size:11px; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer; margin-top:0.5rem; transition: background 0.2s;">
                Save Changes
              </button>
            </form>
            
            <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
              <div class="eyebrow" style="font-family:var(--font-mono); font-size:9px; color:var(--status-review); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:0.75rem;">Danger Zone</div>
              <button id="btnDeleteAccount" style="width:100%; background:transparent; color:var(--status-review); padding:0.75rem 1rem; border:1px solid var(--status-review); font-family:var(--font-mono); font-size:11px; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer; transition: background 0.2s;">
                Delete Account & Data
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  };

  // 2. Inject "Edit Profile" button into the existing Dropdown Menu
  const injectDropdownButton = () => {
    const operatorMenu = document.getElementById('jbOperatorMenu');
    const logoutBtn = document.getElementById('jbLogoutBtn');
    
    if (operatorMenu && logoutBtn) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'jb-menu-item';
      editBtn.textContent = 'Edit Profile';
      editBtn.style.borderBottom = '1px solid var(--background)';
      
      // Insert it right above the logout button
      operatorMenu.insertBefore(editBtn, logoutBtn);

      // Bind Click Event to Open Modal
      editBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        operatorMenu.classList.add('jb-hidden'); // Close dropdown
        
        // Fetch current data to pre-fill the form
        currentMember = await window.$memberstackDom.getCurrentMember();
        if (currentMember && currentMember.data) {
          document.getElementById('profileName').value = currentMember.data.customFields?.['first-name'] || '';
          document.getElementById('profileEmail').value = currentMember.data.auth.email || '';
          document.getElementById('jbGlobalProfileModal').classList.remove('jb-hidden');
        }
      });
    }
  };

  // 3. Bind Modal Actions (Save & Delete)
  const bindModalEvents = () => {
    const modal = document.getElementById('jbGlobalProfileModal');
    const closeBtn = document.getElementById('closeProfileModal');
    const profileForm = document.getElementById('jbProfileForm');
    const saveBtn = document.getElementById('btnSaveProfile');
    const deleteBtn = document.getElementById('btnDeleteAccount');
    const statusMsg = document.getElementById('profileStatusMsg');

    // Close Modal
    const closeModal = () => {
      modal.classList.add('jb-hidden');
      statusMsg.style.display = 'none';
    };
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Handle Form Save
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      saveBtn.textContent = 'Saving...';
      saveBtn.disabled = true;

      const newName = document.getElementById('profileName').value;
      const newEmail = document.getElementById('profileEmail').value;

      try {
        // 1. Update Memberstack
        await window.$memberstackDom.updateMember({
          email: newEmail,
          customFields: { "first-name": newName }
        });

        // 2. Update Supabase Profile Table
        if (currentMember && currentMember.data) {
          await supabaseClient.from('profiles').update({
            first_name: newName,
            email: newEmail
          }).eq('memberstack_id', currentMember.data.id);
        }

        // 3. Update DOM Labels instantly
        const opLabel = document.getElementById('jbOperatorLabel');
        if (opLabel) opLabel.textContent = newName;

        statusMsg.textContent = "Profile updated successfully!";
        statusMsg.style.color = "var(--status-stable)";
        statusMsg.style.display = "block";
        
        setTimeout(() => closeModal(), 1500);

      } catch (err) {
        statusMsg.textContent = err.message || "Failed to update profile.";
        statusMsg.style.color = "var(--status-review)";
        statusMsg.style.display = "block";
      }

      saveBtn.textContent = 'Save Changes';
      saveBtn.disabled = false;
    });

    // Handle Account Deletion
    deleteBtn.addEventListener('click', async () => {
      const isConfirmed = confirm("Are you absolutely sure? This will permanently delete your account and revoke your access to the platform.");
      
      if (isConfirmed && currentMember && currentMember.data) {
        deleteBtn.textContent = "Deleting...";
        try {
          // 1. Wipe their Supabase Profile (This permanently locks them out of the UI)
          await supabaseClient.from('profiles').delete().eq('memberstack_id', currentMember.data.id);
          
          // 2. Attempt Memberstack Deletion (If permitted by MS settings)
          try { await window.$memberstackDom.deleteMember(); } catch(e) { console.log("MS Delete skipped."); }
          
          // 3. Force Logout & Redirect
          await window.$memberstackDom.logout();
          window.location.href = '/login';
        } catch (err) {
          alert("An error occurred. Please contact support.");
          deleteBtn.textContent = "Delete Account & Data";
        }
      }
    });
  };

  const init = () => {
    // Only run this if we are inside the portal (Not on the public home page or login page)
    const operatorDropdown = document.getElementById('jbOperatorDropdown');
    if (!operatorDropdown) return;

    if (window.supabase) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      injectModalHTML();
      injectDropdownButton();
      bindModalEvents();
    }
  };

  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsProfileManager.init);
} else { JoeBuildsProfileManager.init(); }
