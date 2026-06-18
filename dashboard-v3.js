/**
 * Joe Builds Home Intelligence Platform
 * Unified Dashboard Controller (v3 - Dynamic Graphs, Global Integrity & Routing)
 */
const JoeBuildsDashboard = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  let supabase;

  const DOM = {
    opLabel: document.getElementById('jbOperatorLabel'),
    opEmail: document.getElementById('jbOperatorEmail'),
    dropBtn: document.getElementById('jbOperatorDropdown'),
    opMenu: document.getElementById('jbOperatorMenu'),
    logoutBtn: document.getElementById('jbLogoutBtn'),
    
    // Top Context
    integrityValue: document.querySelector('.jb-integrity-value'),
    heroProjectDate: document.querySelector('.jb-hero-left .jb-font-mono'),
    footerProject: document.querySelector('.jb-footer-project'),
    desktopAsset: document.querySelectorAll('.jb-desktop-telemetry .jb-text-foreground')[0],
    
    // Cards & Modal
    metricCards: document.querySelectorAll('.jb-matrix-card'),
    modal: document.getElementById('jbTelemetryModal'),
    modalForensicBtn: document.querySelector('.jb-btn-primary'),
    mTitle: document.getElementById('modalTitle'),
    mStatusBadge: document.getElementById('modalStatusBadge'),
    mStatusDot: document.getElementById('modalStatusDot'),
    mStatusText: document.getElementById('modalStatusText'),
    mCurrent: document.getElementById('mMetricCurrent'),
    mDelta7: document.getElementById('mMetricDelta7'),
    mDelta30: document.getElementById('mMetricDelta30'),
    mThreshold: document.getElementById('mMetricThreshold'),
    mCommentary: document.getElementById('modalCommentary'),
    mRec: document.getElementById('modalRecommendations'),
    modalGraph: document.querySelector('.jb-modal-graph-panel'), // Dynamic Graph Target
    closeBtns: [document.getElementById('modalHeaderCloseBtn'), document.getElementById('modalFooterCloseBtn')]
  };

  // Helper: Generate dynamic pseudo-historical SVG graph based on card status
  const generateSparkline = (status) => {
    let points = [];
    let currentY = 32; // start in middle
    for(let i=0; i<12; i++) {
       // If at risk/review, make the graph spiky. If stable, keep it smooth.
       let jitter = (status === 'risk' || status === 'review') ? (Math.random() * 30 - 15) : (Math.random() * 10 - 5);
       currentY = Math.max(5, Math.min(59, currentY + jitter));
       points.push(currentY);
    }
    const stepX = 300 / 11;
    const pathD = points.map((y, i) => `${i===0?'M':'L'} ${i*stepX} ${y}`).join(' ');
    const circles = points.map((y, i) => `<circle cx="${i*stepX}" cy="${y}" r="1.6" fill="currentColor"></circle>`).join('');
    
    return `
      <svg viewBox="0 0 300 64" preserveAspectRatio="none" style="width:100%;height:6rem;display:block;color:var(--f
