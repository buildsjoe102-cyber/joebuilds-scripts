/**
 * Joe Builds Home Intelligence Platform
 * Global Profile Manager (v28 - CSS Flashing Fixed)
 */
const JoeBuildsProfileManager = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_xla-awjgU2npKzrWHdYKDQ_2ox0CWmC';
  
  let supabaseClient, currentMember = null, currentUserRole = 'client';

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

    document.querySelectorAll('.sidebar-nav, .jb-sidebar-nav').forEach(nav => {
      const propLink = nav.querySelector('a[href*="/properties"]');
      const repLink = nav.querySelector('a[href*="/reports"]');
      if (propLink && repLink) { nav.insertBefore(repLink, propLink); }
    });

    document.querySelectorAll('.mobile-nav, .jb-bottom-bar, .jb-mobile-overlay, .jb-hamburger-btn').forEach(el => el.remove());

    const currentPath = window.location.pathname;
    const navHtml = `
      <nav class="jb-universal-mobile-nav">
        <a href="/dashboard" class="jb-mobile-nav-btn ${currentPath.includes('dashboard') ? 'active' : ''}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect></svg>Dashboard</a>
        <a href="/digital-twin" class="jb-mobile-nav-btn ${currentPath.includes('twin') ? 'active' : ''}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"></path><path d="M15 5.764v15"></path><path d="M9 3.236v15"></path></svg>Home Map</a>
        <a href="/diagnostics" class="jb-mobile-nav-btn ${currentPath.includes('diagnostics') ? 'active' : ''}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"></path><path d="M6.453 15h11.094"></path><path d="M8.5 2h7"></path></svg>Records</a>
        <a href="/pathway" class="jb-mobile-nav-btn ${currentPath.includes('pathway') ? 'active' : ''}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6a9 9 0 0 0-9 9V3"></path><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle></svg>Pathway</a>
        <a href="/reports" class="jb-mobile-nav-btn ${currentPath.includes('reports') ? 'active' : ''}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>Reports</a>
        <a href="/properties" class="jb-mobile-nav-btn jb-admin-only ${currentPath.includes('properties') ? 'active' : ''}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 7h2"></path><path d="M14 7h2"></path><path d="M8 11h2"></path><path d="M14 11h2"></path></svg>Properties</a>
        <a href="/admin" class="jb-mobile-nav-btn jb-admin-only ${currentPath.includes('admin') ? 'active' : ''}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 17H5"></path><path d="M19 7h-9"></path><circle cx="17" cy="17" r="3"></circle><circle cx="7" cy="7" r="3"></circle></svg>Admin</a>
      </nav>
    `;
    document.body.insertAdjacentHTML('beforeend', navHtml);
  };

  const fixOperatorDropdown = () => {
    let dropBtn = document.getElementById('jbOperatorDropdown');
    const opMenu = document.getElementById('jbOperatorMenu');
    if (!dropBtn || !opMenu) return;

    const newBtn = dropBtn.cloneNode(true);
    dropBtn.parentNode.replaceChild(newBtn, dropBtn);
    dropBtn = newBtn; 

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

    const logoutBtn = document.getElementById('jbLogoutBtn');
    if (logoutBtn) {
      const newLogout = logoutBtn.cloneNode(true);
      logoutBtn.parentNode.replaceChild(newLogout, logoutBtn);
      newLogout.addEventListener('click', async () => {
        try { await window.$memberstackDom.logout(); window.location.href = '/login'; } catch (err) {}
      });
    }
  };

  const bindProfileEvents = (profile) => {
    const operatorMenu = document.getElementById('jbOperatorMenu');
    const logoutBtn = document.getElementById('jbLogoutBtn'); 
    if (!operatorMenu || !logoutBtn) return;

    const isDemoActive = localStorage.getItem('jb_demo_mode') === 'true';
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
  };

  const init = async () => {
    if (!document.getElementById('jbOperatorDropdown')) return;

    fixTerminologyAndUI(); 
    fixOperatorDropdown();

    if (window.supabase) {
      let supabaseToken = '';
      try { 
        const memberReq = await window.$memberstackDom.getCurrentMember();
        if (memberReq?.data?.customFields?.['supabase-jwt']) {
            supabaseToken = memberReq.data.customFields['supabase-jwt'];
        }
      } catch(e) { console.warn("No Supabase token found"); }

      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: supabaseToken ? { Authorization: `Bearer ${supabaseToken}` } : {} }
      });
      
      try {
        currentMember = await window.$memberstackDom.getCurrentMember();
        if (currentMember && currentMember.data) {
          
          const opEmail = document.getElementById('jbOperatorEmail');
          if (opEmail) opEmail.textContent = `Logged in as: ${currentMember.data.auth.email.toLowerCase()}`;

          const { data: profile } = await supabaseClient.from('profiles').select('role, building_id').eq('memberstack_id', currentMember.data.id).single();
          currentUserRole = profile?.role || 'client';

          const displayRole = currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1);
          const opLabel = document.getElementById('jbOperatorLabel');
          if (opLabel) opLabel.textContent = displayRole;
          
          bindProfileEvents(profile);

          if (currentUserRole === 'admin' || currentUserRole === 'operator') {
             document.querySelectorAll('a[href*="/properties"], a[href*="/admin"], .jb-admin-only').forEach(el => {
                el.style.setProperty('display', 'flex', 'important');
                el.style.setProperty('visibility', 'visible', 'important');
                el.classList.remove('jb-hidden');
             });
          }

          // Unhide all data elements!
          document.body.classList.add('jb-data-ready');
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
