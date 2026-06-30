/**
 * Joe Builds Home Intelligence Platform
 * Diagnostics Controller (v30 - Demo Mode Override Restored)
 */
console.log("JB Diagnostics Controller v30 initializing...");

const JoeBuildsDiagnostics = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_xla-awjgU2npKzrWHdYKDQ_2ox0CWmC';
  let supabase;

  const setTxt = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const setHTML = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  const addHTML = (id, html) => { const el = document.getElementById(id); if (el) el.insertAdjacentHTML('beforeend', html); };

  const toggleSkeletonState = (isLoading) => {
    const tabs = document.querySelectorAll('.header-telemetry-cluster .tabular, .header-telemetry-cluster .jb-tabular, .jb-desktop-telemetry .tabular, .jb-desktop-telemetry .jb-tabular');
    tabs.forEach(el => { if (isLoading) el.classList.add('jb-skeleton-block'); else el.classList.remove('jb-skeleton-block'); });
    const specificElements = [ document.getElementById('desktopSidebarAsset'), document.getElementById('desktopSidebarMeta') ];
    specificElements.forEach(el => { if (!el) return; if (isLoading) el.classList.add('jb-skeleton-block'); else el.classList.remove('jb-skeleton-block'); });

    if (isLoading) {
      setHTML('tbody-thermal', `<tr><td colspan="5"><div class="jb-skeleton-block" style="height: 40px; width: 100%;"></div></td></tr>`);
      setHTML('tbody-air', `<tr><td colspan="5"><div class="jb-skeleton-block" style="height: 40px; width: 100%;"></div></td></tr>`);
    } else {
      document.querySelectorAll('.jb-skeleton-block').forEach(el => el.classList.remove('jb-skeleton-block'));
    }
  };

  const mapToDOM = (bData, mData, rData, sData, iData) => {
    setHTML('tbody-thermal', ''); setHTML('tbody-air', '');
    setHTML('mgrid-thermal', ''); setHTML('mgrid-air', '');

    if (!bData) {
       setTxt('desktopSidebarAsset', "Unassigned Property");
       const tabs = document.querySelectorAll('.header-telemetry-cluster .tabular, .header-telemetry-cluster .jb-tabular');
       if(tabs[0]) tabs[0].textContent = "Unassigned Property";
       setHTML('tbody-thermal', `<tr><td colspan="5" style="color:#A64444; padding: 2rem;">No property assigned or database access blocked.</td></tr>`);
       toggleSkeletonState(false);
       return;
    }

    const assetName = `${bData.building_code || 'PRJ-000'} — ${bData.address_line_1}`;
    setTxt('desktopSidebarAsset', assetName); 
    const climateText = bData.state === 'WA' ? 'Zone 5 — Warm Temperate' : 'Zone 6 — Mild Temperate';
    setTxt('desktopSidebarMeta', climateText);

    const headerTabs = document.querySelectorAll('.header-telemetry-cluster .tabular, .header-telemetry-cluster .jb-tabular');
    if (headerTabs[0]) headerTabs[0].textContent = assetName;
    if (headerTabs[1]) headerTabs[1].textContent = climateText;
    if (headerTabs[2]) headerTabs[2].textContent = bData.status || "Active Home Record";

    const roomsMap = {};
    if (rData) { rData.forEach(r => { roomsMap[r.id] = r.room_name_current; }); }
    
    const sessionsMap = {};
    if (sData) { sData.forEach(s => { sessionsMap[s.assessment_id] = s.assessment_type; }); }

    // --- DYNAMICALLY INJECT ANALYST FINDINGS SECTION ---
    if (iData && iData.length > 0) {
        const findingsSectionHtml = `
        <section id="section-findings" style="margin-bottom: 3rem;">
          <div class="jb-section-header">
            <h2 class="jb-section-title">Analyst Findings & Risks</h2><span class="jb-font-mono" style="font-size:10px;color:var(--muted-foreground)">${iData.length} entries</span>
          </div>
          <div class="jb-desktop-only"><table class="jb-data-table">
            <thead><tr><th style="width:3rem">Img</th><th>Finding / Issue</th><th>Room / Zone</th><th>Status</th><th>Analyst Notes</th></tr></thead>
            <tbody id="tbody-findings"></tbody>
          </table></div>
          <div class="jb-mobile-only jb-mobile-data-grid" id="mgrid-findings"></div>
        </section>`;
        
        // Insert right above the thermal section
        const thermalSec = document.getElementById('section-thermal');
        if (thermalSec && !document.getElementById('section-findings')) {
            thermalSec.insertAdjacentHTML('beforebegin', findingsSectionHtml);
        }

        iData.forEach(issue => {
            let statusClass = 'measured';
            if (issue.status === 'At Risk') statusClass = 'risk';
            if (issue.status === 'Action Required') statusClass = 'review';
            if (issue.status === 'Closed') statusClass = 'stable';
            
            const roomName = issue.room_id && roomsMap[issue.room_id] ? roomsMap[issue.room_id] : 'Global / Entire Home';

            const row = `<tr data-title="${issue.issue_type}" style="cursor: pointer;"><td><button class="jb-img-btn"><svg style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg></button></td><td>${issue.issue_type}</td><td class="jb-font-mono jb-tabular">${roomName}</td><td><span class="jb-status-badge jb-status-${statusClass}"><span class="jb-badge-dot"></span>${issue.status}</span></td><td style="color:var(--muted-foreground)">${issue.client_facing_wording || '-'}</td></tr>`;
            addHTML('tbody-findings', row); 
            
            const card = `<div class="jb-mobile-data-card" data-title="${issue.issue_type}" style="cursor: pointer;"><div class="jb-mobile-card-header"><div style="font-size:12.5px;font-weight:500">${issue.issue_type}</div><span class="jb-status-badge jb-status-${statusClass}">${issue.status}</span></div><div class="jb-font-mono jb-tabular" style="font-size:13px">${roomName}</div><div style="font-size:11px;color:var(--muted-foreground)">${issue.client_facing_wording || '-'}</div></div>`;
            addHTML('mgrid-findings', card);
        });
    }

    const rawMeasurements = mData || [];
    if (rawMeasurements.length === 0) {
      setHTML('tbody-thermal', `<tr><td colspan="5" style="color:#637066; padding: 2rem;">No diagnostic measurements found for this property.</td></tr>`);
      toggleSkeletonState(false);
      return;
    }
    
    const thermals = [], airTightsAndOthers = [];
    rawMeasurements.forEach(m => {
      let code = 'UNKNOWN';
      if (m.measurement_points) { code = Array.isArray(m.measurement_points) ? m.measurement_points[0]?.element_code : m.measurement_points.element_code; }
      m.extracted_code = code || 'UNKNOWN';

      if (['U-VALUE', 'THERMAL_BRIDGE', 'ENVELOPE'].includes(m.extracted_code)) { thermals.push(m); } 
      else { airTightsAndOthers.push(m); }
    });

    if (thermals.length === 0) {
      setHTML('tbody-thermal', `<tr><td colspan="5" style="color:#637066; padding:1rem;">No thermal envelope data logged yet.</td></tr>`);
    } else {
      setTxt('count-thermal', `${thermals.length} entries`); 
      thermals.forEach(m => { 
        let title = m.extracted_code.replace(/-/g, ' ') + ' Metric';
        if (m.extracted_code === 'U-VALUE') title = 'Assembly U-Value';
        if (m.extracted_code === 'ENVELOPE') title = 'Envelope Integrity';
        
        // Append Zone Tag
        if (m.room_id && roomsMap[m.room_id]) { title += ` <span style="color:var(--muted-foreground); font-family:var(--font-mono); font-size:9px; letter-spacing:0.05em; margin-left:6px; padding-left:6px; border-left:1px solid var(--border);">ZONE: ${roomsMap[m.room_id]}</span>`; }
        // Append Session Tag
        if (m.assessment_id && sessionsMap[m.assessment_id]) { title += ` <span style="color:var(--status-measured); font-family:var(--font-mono); font-size:9px; letter-spacing:0.05em; margin-left:6px; padding-left:6px; border-left:1px solid var(--border);">SESSION: ${sessionsMap[m.assessment_id]}</span>`; }

        const row = `<tr data-title="${m.extracted_code}" style="cursor: pointer;"><td><button class="jb-img-btn"><svg style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg></button></td><td>${title}</td><td class="jb-font-mono jb-tabular">${m.value || '-'} ${m.unit || ''}</td><td><span class="jb-status-badge jb-status-${m.status_flag || 'unknown'}"><span class="jb-badge-dot"></span>${m.status_flag || 'unknown'}</span></td><td style="color:var(--muted-foreground)">${m.client_facing_wording || '-'}</td></tr>`;
        addHTML('tbody-thermal', row); 
        
        const card = `<div class="jb-mobile-data-card" data-title="${m.extracted_code}" style="cursor: pointer;"><div class="jb-mobile-card-header"><div style="font-size:12.5px;font-weight:500">${title}</div><span class="jb-status-badge jb-status-${m.status_flag || 'unknown'}">${m.status_flag || 'unknown'}</span></div><div class="jb-font-mono jb-tabular" style="font-size:13px">${m.value || '-'} ${m.unit || ''}</div><div style="font-size:11px;color:var(--muted-foreground)">${m.client_facing_wording || '-'}</div></div>`;
        addHTML('mgrid-thermal', card);
      }); 
    }
    
    if (airTightsAndOthers.length === 0) {
      setHTML('tbody-air', `<tr><td colspan="5" style="color:#637066; padding:1rem;">No air or environment data logged yet.</td></tr>`);
    } else {
      setTxt('count-air', `${airTightsAndOthers.length} entries`); 

      airTightsAndOthers.forEach(m => { 
        let title = m.extracted_code.replace(/-/g, ' ') + ' Metric';
        if (m.extracted_code === 'ACH50') title = 'Air Infiltration Rate (ACH50)';
        if (m.extracted_code === 'CO2') title = 'Indoor Air Quality (CO₂)';
        if (m.extracted_code === 'RH') title = 'Relative Humidity';
        if (m.extracted_code === 'VOC') title = 'Volatile Organic Compounds (VOC)';
        if (m.extracted_code === 'MOISTURE') title = 'Structural Moisture Risk';
        if (m.extracted_code === 'PRIORITY') title = 'Active Priority Vector';
        if (m.extracted_code === 'READINESS') title = 'Upgrade Readiness';

        if (m.room_id && roomsMap[m.room_id]) { title += ` <span style="color:var(--muted-foreground); font-family:var(--font-mono); font-size:9px; letter-spacing:0.05em; margin-left:6px; padding-left:6px; border-left:1px solid var(--border);">ZONE: ${roomsMap[m.room_id]}</span>`; }
        if (m.assessment_id && sessionsMap[m.assessment_id]) { title += ` <span style="color:var(--status-measured); font-family:var(--font-mono); font-size:9px; letter-spacing:0.05em; margin-left:6px; padding-left:6px; border-left:1px solid var(--border);">SESSION: ${sessionsMap[m.assessment_id]}</span>`; }

        const row = `<tr data-title="${m.extracted_code}" style="cursor: pointer;"><td><button class="jb-img-btn"><svg style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg></button></td><td>${title}</td><td class="jb-font-mono jb-tabular">${m.value || '-'} ${m.unit || ''}</td><td><span class="jb-status-badge jb-status-${m.status_flag || 'unknown'}"><span class="jb-badge-dot"></span>${m.status_flag || 'unknown'}</span></td><td style="color:var(--muted-foreground)">${m.client_facing_wording || '-'}</td></tr>`;
        addHTML('tbody-air', row); 
        
        const card = `<div class="jb-mobile-data-card" data-title="${m.extracted_code}" style="cursor: pointer;"><div class="jb-mobile-card-header"><div style="font-size:12.5px;font-weight:500">${title}</div><span class="jb-status-badge jb-status-${m.status_flag || 'unknown'}">${m.status_flag || 'unknown'}</span></div><div class="jb-font-mono jb-tabular" style="font-size:13px">${m.value || '-'} ${m.unit || ''}</div><div style="font-size:11px;color:var(--muted-foreground)">${m.client_facing_wording || '-'}</div></div>`;
        addHTML('mgrid-air', card);
      }); 
    }

    document.querySelectorAll('tr[data-title], .jb-mobile-data-card[data-title]').forEach(el => { 
      el.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        let metricName = el.querySelector('td:nth-child(2)')?.textContent || el.querySelector('.jb-mobile-card-header div').textContent; 
        if (metricName.includes('ZONE:')) { metricName = metricName.split('ZONE:')[0].trim(); }
        if (metricName.includes('SESSION:')) { metricName = metricName.split('SESSION:')[0].trim(); }
        setTxt('modalMetricTitle', metricName);
        const modal = document.getElementById('jbDiagnosticModal');
        if(modal) modal.classList.remove('jb-hidden'); 
      }); 
    });
    
    toggleSkeletonState(false);
  };

  const init = async () => {
    try {
      document.body.classList.add('jb-data-ready');
      const forceStyle = document.createElement('style');
      forceStyle.innerHTML = `.jb-tabular, .jb-metric-string, .jb-status-badge, .header-telemetry-cluster { opacity: 1 !important; visibility: visible !important; }`;
      document.head.appendChild(forceStyle);

      const closeBtn = document.getElementById('modalCloseBtn');
      const modal = document.getElementById('jbDiagnosticModal');
      if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.add('jb-hidden'));
      if (modal) modal.addEventListener('click', (e) => { if(e.target === modal) modal.classList.add('jb-hidden'); });

      if (!window.supabase) return;

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
      
      // RESTORED DEMO FALLBACK
      if (localStorage.getItem('jb_demo_mode') === 'true') { 
        const { data: demoB } = await supabase.from('buildings').select('id').eq('building_code', 'DEMO-001').single(); 
        if (demoB) targetBuildingId = demoB.id; 
      }
      
      if (targetBuildingId) { 
        const [bRes, mRes, rRes, sRes, iRes] = await Promise.all([ 
          supabase.from('buildings').select('*').eq('id', targetBuildingId).single(), 
          supabase.from('measurements').select(`*, measurement_points(*)`).eq('building_id', targetBuildingId).order('created_at', { ascending: false }),
          supabase.from('rooms').select('id, room_name_current').eq('building_id', targetBuildingId),
          supabase.from('assessment_sessions').select('assessment_id, assessment_type').eq('building_id', targetBuildingId),
          supabase.from('issues_findings').select('*').eq('building_id', targetBuildingId).order('created_at', { ascending: false })
        ]); 
        mapToDOM(bRes.data, mRes.data, rRes.data, sRes.data, iRes.data); 
      } else { 
        setHTML('tbody-thermal', `<tr><td colspan="5" style="padding:2rem; color:#A64444;">No property assigned.</td></tr>`);
        toggleSkeletonState(false);
      }
    } catch (error) { console.error("Init Error", error); }
  };
  return { init };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', JoeBuildsDiagnostics.init); } else { JoeBuildsDiagnostics.init(); }
