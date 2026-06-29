/**
 * Joe Builds Home Intelligence Platform
 * Diagnostics Controller (v23 - Nuclear Un-Hide & Auto-Fallback)
 */
console.log("JB Diagnostics Controller v23 initializing...");

const JoeBuildsDiagnostics = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_xla-awjgU2npKzrWHdYKDQ_2ox0CWmC';
  let supabase;

  // Safe DOM Manipulator
  const setTxt = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const setHTML = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  const addHTML = (id, html) => { const el = document.getElementById(id); if (el) el.insertAdjacentHTML('beforeend', html); };

  const mapToDOM = (bData, mData, pData) => {
    setHTML('tbody-thermal', ''); setHTML('tbody-air', '');
    setHTML('mgrid-thermal', ''); setHTML('mgrid-air', '');

    if (!bData) {
       setTxt('desktopHeaderAsset', "Unassigned Property");
       setTxt('desktopSidebarAsset', "Unassigned Property");
       setHTML('tbody-thermal', `<tr><td colspan="5" style="color:#A64444; padding: 2rem;">No property assigned or database access blocked.</td></tr>`);
       return;
    }

    // Set Header text
    const assetName = `${bData.building_code || 'PRJ-000'} — ${bData.address_line_1}`;
    setTxt('desktopSidebarAsset', assetName); 
    setTxt('desktopHeaderAsset', assetName); 
    
    const climateText = bData.state === 'WA' ? 'Zone 5 — Warm Temperate' : 'Zone 6 — Mild Temperate';
    setTxt('desktopSidebarMeta', climateText);

    // Combine Measurements and Points
    let measurements = mData || [];
    const points = pData || [];

    // Auto-generate UI rows if you have points but no actual readings yet
    if (measurements.length === 0 && points.length > 0) {
        console.log("Found Points but no Measurements. Auto-generating UI rows.");
        measurements = points.map(pt => ({
            id: pt.id, 
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
      setHTML('tbody-thermal', `<tr><td colspan="5" style="color:#637066; padding: 2rem;">No diagnostic sensors or data found for this property.</td></tr>`);
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

    // Inject Thermal Rows
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
    
    // Inject Air & Other Rows
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

    // Bind Modals
    document.querySelectorAll('tr[data-id], .jb-mobile-data-card[data-id]').forEach(el => { 
      el.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        const metricName = el.querySelector('td:nth-child(2)')?.textContent || el.querySelector('.jb-mobile-card-header div').textContent; 
        setTxt('modalMetricTitle', metricName);
        const modal = document.getElementById('jbDiagnosticModal');
        if(modal) modal.classList.remove('jb-hidden'); 
      }); 
    });
  };

  const init = async () => {
    try {
      // NUCLEAR UN-HIDE: Force the opacity to 1 immediately overriding the global CSS
      document.body.classList.add('jb-data-ready');
      const forceStyle = document.createElement('style');
      forceStyle.innerHTML = `.jb-tabular, .jb-metric-string, .jb-status-badge, .header-telemetry-cluster { opacity: 1 !important; visibility: visible !important; }`;
      document.head.appendChild(forceStyle);

      setTxt('desktopSidebarAsset', "Loading...");
      setTxt('desktopHeaderAsset', "Loading...");

      const closeBtn = document.getElementById('modalCloseBtn');
      const modal = document.getElementById('jbDiagnosticModal');
      if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.add('jb-hidden'));
      if (modal) modal.addEventListener('click', (e) => { if(e.target === modal) modal.classList.add('jb-hidden'); });

      if (!window.supabase) { console.error("Supabase SDK not found."); return; }

      let supabaseToken = '';
      try { 
        const memberReq = await window.$memberstackDom.getCurrentMember();
        if (memberReq && memberReq.data && memberReq.data.customFields && memberReq.data.customFields['supabase-jwt']) {
            supabaseToken = memberReq.data.customFields['supabase-jwt'];
        }
      } catch(e) {}

      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: supabaseToken ? { Authorization: `Bearer ${supabaseToken}` } : {} }
      });
      
      const member = await window.$memberstackDom.getCurrentMember();
      if(!member || !member.data) return;
      
      const { data: profile } = await supabase.from('profiles').select('building_id, role').eq('memberstack_id', member.data.id).single();
      let targetBuildingId = profile?.building_id;
      
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
      }
    } catch (error) {
      console.error("Init Error", error);
    }
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsDiagnostics.init); } else { JoeBuildsDiagnostics.init(); }
