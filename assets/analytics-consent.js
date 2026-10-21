/* ---------- Consent-gated analytics (GA4 + Microsoft Clarity) ----------
   Loads nothing until the visitor accepts the "analytics" cookie
   category in the CookieConsent banner (assets/vendor/cookieconsent).
   Runs only on the production domain, never on localhost/preview, and
   can be fully disabled per-device with ?notrack=1. No personal data
   (names, emails, phone numbers, message text) is ever sent to GA4 or
   Clarity — this file only loads/unloads the two trackers and relays
   consent state to them. */
(function(){
  'use strict';

  var cfg = window.FORKIT_CONFIG || {};

  function isProductionHost(){
    var host = location.hostname;
    var list = cfg.productionHostnames || [];
    for (var i = 0; i < list.length; i++){
      if (list[i] === host) return true;
    }
    return false;
  }

  /* ---------- owner opt-out: ?notrack=1 / ?notrack=0 ---------- */
  function readOptOut(){
    try { return localStorage.getItem('forkit_notrack') === '1'; }
    catch (e){ return false; }
  }
  function writeOptOut(on){
    try {
      if (on) localStorage.setItem('forkit_notrack', '1');
      else localStorage.removeItem('forkit_notrack');
    } catch (e){ /* localStorage unavailable (private mode, etc.) — ignore */ }
  }
  (function handleOptOutParam(){
    var params = new URLSearchParams(location.search);
    if (params.has('notrack')){
      writeOptOut(params.get('notrack') === '1');
    }
  })();

  function showTrackingOffBadge(){
    var badge = document.createElement('div');
    badge.textContent = 'Tracking off';
    badge.setAttribute('style',
      'position:fixed;bottom:16px;left:16px;z-index:9999;' +
      'background:#161311;color:#fff;font:700 11px/1 Karla,sans-serif;' +
      'letter-spacing:.04em;text-transform:uppercase;padding:8px 12px;' +
      'border-radius:999px;opacity:.85;pointer-events:none;');
    document.addEventListener('DOMContentLoaded', function(){
      document.body.appendChild(badge);
    });
  }

  var optedOut = readOptOut();
  if (optedOut) showTrackingOffBadge();

  /* ?forcecc=1 lets us QA the banner/analytics loading off the production
     domain (e.g. the local dev server) without permanently turning it on
     there. Never needed by real visitors. */
  var forceForTesting = /[?&]forcecc=1\b/.test(location.search);

  if (!isProductionHost() && !forceForTesting){
    return; /* no banner, no analytics, no cookies — dev/preview is inert */
  }
  if (optedOut){
    return; /* owner opt-out device: inert, badge already shown above */
  }

  /* ---------- Consent Mode v2 defaults (denied), set before gtag.js loads ---------- */
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });

  /* ---------- load GA4 + Clarity only after "analytics" consent ---------- */
  var ga4Loaded = false;
  function loadGA4(){
    if (ga4Loaded || !cfg.ga4MeasurementId) return;
    ga4Loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + cfg.ga4MeasurementId;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', cfg.ga4MeasurementId);
  }

  var clarityLoaded = false;
  function loadClarity(){
    if (clarityLoaded || !cfg.clarityProjectId) return;
    clarityLoaded = true;
    (function(c,l,a,r,i,t,y){
      c[a] = c[a] || function(){ (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', cfg.clarityProjectId);
  }

  function eraseCookie(name){
    var hostname = location.hostname;
    var domains = ['', '; domain=' + hostname];
    if (hostname.slice(0, 4) !== 'www.'){
      domains.push('; domain=.' + hostname);
    }
    for (var i = 0; i < domains.length; i++){
      document.cookie = name + '=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT' + domains[i];
    }
  }
  function eraseTrackingCookies(){
    var all = document.cookie.split(/;\s*/);
    for (var i = 0; i < all.length; i++){
      var name = all[i].split('=')[0];
      if (/^_ga/.test(name) || /^_gid$/.test(name) || /^_clck$/.test(name) || /^_clsk$/.test(name)){
        eraseCookie(name);
      }
    }
  }

  function applyConsent(){
    var granted = false;
    try { granted = window.CookieConsent.acceptedCategory('analytics'); }
    catch (e){ granted = false; }

    if (granted){
      gtag('consent', 'update', { analytics_storage: 'granted' });
      loadGA4();
      loadClarity();
      if (clarityLoaded && window.clarity) window.clarity('consent', true);
    } else {
      gtag('consent', 'update', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied'
      });
      if (clarityLoaded && window.clarity) window.clarity('consent', false);
      eraseTrackingCookies();
    }
  }

  /* ---------- CookieConsent banner ---------- */
  function initBanner(){
    window.CookieConsent.run({
      guiOptions: {
        consentModal: { layout: 'box', position: 'bottom left', equalWeightButtons: true, flipButtons: false },
        preferencesModal: { layout: 'box', equalWeightButtons: true }
      },
      categories: {
        necessary: { readOnly: true },
        analytics: {
          autoClear: {
            cookies: [
              { name: /^_ga/ },
              { name: '_gid' },
              { name: /^_clck/ },
              { name: /^_clsk/ }
            ]
          }
        }
      },
      language: {
        default: 'en',
        translations: {
          en: {
            consentModal: {
              title: 'We use cookies',
              description: 'We use cookies to see how visitors use this site, so we can improve it. Necessary cookies keep the site running and are always on. Analytics cookies are optional.',
              acceptAllBtn: 'Accept',
              acceptNecessaryBtn: 'Reject',
              showPreferencesBtn: 'Manage preferences',
              footer: '<a href="privacy.html">Privacy &amp; Cookies</a>'
            },
            preferencesModal: {
              title: 'Cookie preferences',
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Reject all',
              savePreferencesBtn: 'Save preferences',
              closeIconLabel: 'Close',
              sections: [
                {
                  title: 'Necessary',
                  description: 'Required for the site to work. Always on.',
                  linkedCategory: 'necessary'
                },
                {
                  title: 'Analytics',
                  description: 'Helps us understand how visitors use the site (Google Analytics, Microsoft Clarity), so we can improve it. Off by default, and no names, emails, phone numbers or message text are ever sent to these tools.',
                  linkedCategory: 'analytics'
                }
              ]
            }
          }
        }
      },
      onFirstConsent: applyConsent,
      onConsent: applyConsent,
      onChange: applyConsent
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initBanner);
  } else {
    initBanner();
  }
})();
