/* ---------- Phase 2 tracking plan ----------
   book_click, form_start, contact_click, workshop_view — see
   forkit-website-analytics-plan.md for the full table. generate_lead
   is wired in Phase 3, once the booking form has a backend that can
   confirm a submission actually succeeded (see the TODOs in site.js).

   Every event goes through track() below, the only place gtag('event', ...)
   is called anywhere on the site. It sends nothing unless analytics
   consent is granted, gtag exists, and the owner opt-out isn't set. */
(function(){
  'use strict';

  function isOptedOut(){
    try { return localStorage.getItem('forkit_notrack') === '1'; }
    catch (e){ return false; }
  }

  function track(eventName, params){
    try {
      if (!eventName) return;
      if (typeof window.gtag !== 'function') return;
      if (!window.CookieConsent || !window.CookieConsent.acceptedCategory('analytics')) return;
      if (isOptedOut()) return;
      window.gtag('event', eventName, params || {});
    } catch (e){ /* never let tracking break the page */ }
  }
  window.FORKIT_TRACK = track;

  /* ---------- delegated click tracking ---------- */
  /* Tag any clickable element with data-track="<event name>" and, as
     needed, data-location / data-workshop / data-method. New buttons
     just need the attributes — no JS changes required. */
  document.addEventListener('click', function(e){
    var el = e.target.closest('[data-track]');
    if (!el) return;
    var eventName = el.getAttribute('data-track');
    var params = {};
    if (el.hasAttribute('data-location')) params.location = el.getAttribute('data-location');
    if (el.hasAttribute('data-workshop')) params.workshop = el.getAttribute('data-workshop');
    if (el.hasAttribute('data-method')) params.method = el.getAttribute('data-method');
    track(eventName, params);
  });

  /* ---------- form_start: once per page view, first focus inside #bookingForm ---------- */
  var formStarted = false;
  document.addEventListener('focusin', function(e){
    if (formStarted) return;
    var form = document.getElementById('bookingForm');
    if (form && form.contains(e.target)){
      formStarted = true;
      track('form_start', { form: 'booking' });
    }
  });
})();
