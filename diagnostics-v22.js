/**
 * Joe Builds Home Intelligence Platform
 * Diagnostics Controller (v22 - Bulletproof Auto-Fallback & Crash Protection)
 */
console.log("JB Diagnostics Controller v22 initializing...");

const JoeBuildsDiagnostics = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_xla-awjgU2npKzrWHdYKDQ_2ox0CWmC';
  let supabase;

  // Safe DOM Manipulator (Prevents silent crashes if a Webflow ID is missing)
  const setTxt = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const setHTML = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  const addHTML = (id, html) => { const el = document.getElementById(id); if (el) el.insertAdjacentHTML('beforeend', html); };

  const toggleSkeletonState = (isLoading) => {
    document.querySelectorAll('.jb-skeleton-block').forEach(el => {
      if (!isLoading) el.classList.remove('jb-skeleton-block');
    });
  };

  const mapToDOM = (bData, mData, pData) => {
    // 1. Clear out tables immediately
    setHTML('tbody-thermal', ''); setHTML('tbody-air', '');
    setHTML('mgrid-thermal', ''); setHTML('mgrid-air', '');

    if (!bData) {
       setTxt('desktopHeaderAsset', "Unassigned Property");
       setTxt('desktopSidebarAsset', "Unassigned Property");
       setHTML('tbody-thermal', `<tr><td colspan="5" style="color:#A64444; padding: 2rem;">No property assigned or RLS access blocked.</td></tr>`);
       toggleSkeletonState(false);
       return;
    }

    // 2. Set Header text
    const assetName = `${bData.building_code || 'PRJ-000'} — ${bData.address_line_1}`;
    setTxt('desktopSidebarAsset', assetName); 
    setTxt('desktopHeaderAsset', assetName); 
    
    const climateText = bData.state === 'WA' ? 'Zone 5 — Warm Temperate' : 'Zone 6 — Mild Temperate';
    setTxt('desktopSidebarMeta', climateText);

    // 3. COMBINE DATA (The Fix for your SQL Insert)
    // If you have measurement_points but no measurements, we auto-generate the UI rows so you can see them!
    let measurements = mData || [];
    const points = pData || [];

    if (measurements.length === 0 && points.length > 0) {
        console.log("No measurements found, but points exist. Auto-generating UI rows from points.");
        measurements = points.map(pt => ({
            id: pt.id, // Using point ID for DOM tracking
            value: '-',
            unit: '',
            status_flag: 'unknown',
            client_facing_wording: 'Awaiting Operator Input',
            extracted_code: pt.element_code || 'UNKNOWN'
        }));
    } else {
        measurements.forEach(m => { 
            let code = 'UNKNOWN';
            if (m.measurement_points) { 
                code = Array.isArray(m.measurement_points) ? m.measurement_points[0]?.element_code : m.measurement_points.element_code; 
            }
            m.extracted_code = code || 'UNKNOWN';
        });
    }

    if (measurements.length === 0) {
      setHTML('tbody-thermal', `<tr><td colspan="5" style="color:#637066; padding: 2rem;">No data found in database.</td></tr>`);
      toggleSkeletonState(false);
      return;
    }
    
    const thermals = [], airTightsAndOthers = [];
    
    measurements.forEach(m => { 
      if (['U-VALUE', 'THERMAL_BRIDGE', 'ENVELOPE'].includes(m.extracted_code)) {
         thermals.push(m);
      } else {
         airTightsAndOthers.push(m);
      }
    });

    // 4. Inject Thermal Rows
    if (thermals.length === 0) {
      setHTML('tbody-thermal', `<tr><td colspan="5" style="color:#637066; padding:1rem;">No thermal envelope data logged yet.</td></tr>`);
    } else {
      setTxt('count-thermal', `${thermals.length} entries`); 
      thermals.forEach(m => { 
        let title = m.extracted_code.replace(/-/g, ' ') + ' Metric';
        if (m.extracted_code === 'U-VALUE') title = 'Assembly U-Value';
        if (m.extracted_code === 'ENVELOPE') title = 'Envelope Integrity';
        
        const row = `<tr data-id="${m.id}" style="cursor: pointer;"><td><button class="jb-img-btn"><svg style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg></button></td><td>${title}</td><td class="jb-font-mono jb-tabular">${m.value || '-'} ${m.unit || ''}</td><td><span class="jb-status-badge jb-status-${m.status_flag || 'unknown'}"><span class="jb-badge-dot"></span>${m.status_flag || 'unknown'}</span></td><td style="color:var(--muted-foreground)">${m.client_facing_wording || '-'}</td></tr>`;
        addHTML('tbody-thermal', row); 
        
        const card = `<div class="jb-mobile-data-card" data-id="${m.id}" style="cursor: pointer;"><div class="jb-mobile-card-header"><div style="font-size:12.5px;font-weight:500">${title}</div><span class="jb-status-badge jb-status-${m.status_flag || 'unknown'}">${m.status_flag || 'unknown'}</span></div><div class="jb-font-mono jb-tabular" style="font-size:13px">${m.value || '-'} ${m.unit || ''}</div><div style="font-size:11px;color:var(--muted-foreground)">${m.client_facing_wording || '-'}</div></div>`;
        addHTML('mgrid-thermal', card);
      }); 
    }
    
    // 5. Inject Air Tightness & IAQ Rows
    if (airTightsAndOthers.length === 0) {
      setHTML('tbody-air', `<tr><td colspan="5" style="color:#637066; padding:1rem;">No air or environment data logged yet.</td></tr>`);
    } else {
      setTxt('count-air', `${airTightsAndOthers.length} entries`); 
      
      const airTitle = document.querySelector('#section-air .jb-section-title');
      if (airTitle) airTitle.textContent = "Air Tightness & Environment";

      airTightsAndOthers.forEach(m => { 
        let title = m.extracted_code.replace(/-/g, ' ') + ' Metric';
        if (m.extracted_code === 'ACH50') title = 'Air Infiltration Rate (ACH50)';
        if (m.extracted_code === 'CO2') title = 'Indoor Air Quality (CO₂)';
        if (m.extracted_code === 'RH') title = 'Relative Humidity';
        if (m.extracted_code === 'VOC') title = 'Volatile Organic Compounds (VOC)';
        if (m.extracted_code === 'PRIORITY') title = 'Active Priority Vector';
        if (m.extracted_code === 'READINESS') title = 'Upgrade Readiness';

        const row = `<tr data-id="${m.id}" style="cursor: pointer;"><td><button class="jb-img-btn"><svg style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg></button></td><td>${title}</td><td class="jb-font-mono jb-tabular">${m.value || '-'} ${m.unit || ''}</td><td><span class="jb-status-badge jb-status-${m.status_flag || 'unknown'}"><span class="jb-badge-dot"></span>${m.status_flag || 'unknown'}</span></td><td style="color:var(--muted-foreground)">${m.client_facing_wording || '-'}</td></tr>`;
        addHTML('tbody-air', row); 
        
        const card = `<div class="jb-mobile-data-card" data-id="${m.id}" style="cursor: pointer;"><div class="jb-mobile-card-header"><div style="font-size:12.5px;font-weight:500">${title}</div><span class="jb-status-badge jb-status-${m.status_flag || 'unknown'}">${m.status_flag || 'unknown'}</span></div><div class="jb-font-mono jb-tabular" style="font-size:13px">${m.value || '-'} ${m.unit || ''}</div><div style="font-size:11px;color:var(--muted-foreground)">${m.client_facing_wording || '-'}</div></div>`;
        addHTML('mgrid-air', card);
      }); 
    }

    // 6. Bind Modal
    document.querySelectorAll('tr[data-id], .jb-mobile-data-card[data-id]').forEach(el => { 
      el.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        const metricName = el.querySelector('td:nth-child(2)')?.textContent || el.querySelector('.jb-mobile-card-header div').textContent; 
        setTxt('modalMetricTitle', metricName);
        const modal = document.getElementById('jbDiagnosticModal');
        if(modal) modal.classList.remove('jb-hidden'); 
      }); 
    });
    
    toggleSkeletonState(false);
  };

  const init = async () => {
    try {
      const pageTitle = document.querySelector('.jb-page-title, .hero-title');
      if (pageTitle) pageTitle.textContent = "Diagnostic Record";
      const pageDesc = document.querySelector('.jb-page-description, .hero-desc');
      if (pageDesc) pageDesc.textContent = "Measurement records, indexed by discipline. Each row references the analyst record and source evidence where applicable.";
      const eyebrow = document.querySelector('.jb-eyebrow, .eyebrow');
      if (eyebrow && eyebrow.textContent.toUpperCase().includes('DIAGNOSTIC LOG')) eyebrow.textContent = 'Measurement Log / 03';

      toggleSkeletonState(true); 
      
      const closeBtn = document.getElementById('modalCloseBtn');
      const modal = document.getElementById('jbDiagnosticModal');
      if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.add('jb-hidden'));
      if (modal) modal.addEventListener('click', (e) => { if(e.target === modal) modal.classList.add('jb-hidden'); });

      if (!window.supabase) { console.error("Supabase SDK not found."); return; }

      // SECURE TOKEN HANDSHAKE
      let supabaseToken = '';
      try { 
        const memberReq = await window.$memberstackDom.getCurrentMember();
        if (memberReq && memberReq.data && memberReq.data.customFields && memberReq.data.customFields['supabase-jwt']) {
            supabaseToken = memberReq.data.customFields['supabase-jwt'];
        }
      } catch(e) { console.warn("No Supabase token found"); }

      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: supabaseToken ? { Authorization: `Bearer ${supabaseToken}` } : {} }
      });
      
      const member = await window.$memberstackDom.getCurrentMember();
      if(!member || !member.data) { console.error("No member logged in."); return; }
      
      const { data: profile } = await supabase.from('profiles').select('building_id, role').eq('memberstack_id', member.data.id).single();
      let targetBuildingId = profile?.building_id;
      
      // ADMIN FALLBACK
      if (!targetBuildingId && (profile?.role === 'admin' || profile?.role === 'operator' || profile?.role === 'Admin')) {
         const { data: fallbackB } = await supabase.from('buildings').select('id').order('created_at', { ascending: false }).limit(1).single();
         if (fallbackB) targetBuildingId = fallbackB.id;
      }
      
      if (targetBuildingId) { 
        const [bRes, mRes, pRes] = await Promise.all([ 
          supabase.from('buildings').select('*').eq('id', targetBuildingId).single(), 
          supabase.from('measurements').select(`*, measurement_points(*)`).eq('building_id', targetBuildingId),
          supabase.from('measurement_points').select('*').eq('building_id', targetBuildingId)
        ]); 
        mapToDOM(bRes.data, mRes.data, pRes.data); 
      } else { 
        setHTML('tbody-thermal', `<tr><td colspan="5" style="padding:2rem; color:#A64444;">No property assigned.</td></tr>`);
        toggleSkeletonState(false); 
      }
    } catch (error) {
      console.error("Init Error crashed the script", error.message || error);
      toggleSkeletonState(false);
    }
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsDiagnostics.init); } else { JoeBuildsDiagnostics.init(); }
