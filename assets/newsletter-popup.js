/**
 * newsletter-popup.js — a dismissible "join our newsletter" popup that
 * appears once, a few seconds after a visitor lands on the page.
 *
 * Submits to the same Apps Script backend as the booking form (see
 * assets/site.js + /apps-script), tagged with formType: 'newsletter' so
 * the backend logs it to its own "Newsletter" sheet instead of
 * "Inquiries" and skips the booking-only required fields.
 */
(function(){
  var SHOW_DELAY_MS = 8000;
  var DISMISS_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000; // don't re-ask for 30 days after a dismiss
  var SUBSCRIBED_KEY = 'forkit_newsletter_subscribed';
  var DISMISSED_AT_KEY = 'forkit_newsletter_dismissed_at';

  function alreadyHandled(){
    try {
      if (localStorage.getItem(SUBSCRIBED_KEY) === '1') return true;
      var dismissedAt = Number(localStorage.getItem(DISMISSED_AT_KEY));
      if (dismissedAt && (Date.now() - dismissedAt) < DISMISS_SNOOZE_MS) return true;
    } catch(e){ /* localStorage unavailable — just show it */ }
    return false;
  }

  function getAttribution(){
    try {
      var raw = sessionStorage.getItem('forkit_attribution');
      if (raw) return JSON.parse(raw);
    } catch(e){ /* ignore */ }
    return { utmSource:'', utmMedium:'', utmCampaign:'', landingPage: window.location.pathname };
  }

  function buildPopup(){
    var overlay = document.createElement('div');
    overlay.className = 'newsletter-popup-overlay';
    overlay.id = 'newsletterPopupOverlay';
    overlay.innerHTML =
      '<div class="newsletter-popup" role="dialog" aria-modal="true" aria-labelledby="newsletterPopupTitle">' +
        '<button type="button" class="newsletter-popup-close" aria-label="Close" data-nl-aria-label="Sluiten">&times;</button>' +
        '<h3 id="newsletterPopupTitle" data-nl="Blijf op de hoogte">Stay in the loop</h3>' +
        '<p data-nl-html="Af en toe een update over nieuwe seizoensmenu&rsquo;s en acties &mdash; geen spam, beloofd.">Every now and then, news about new seasonal menus and special offers &mdash; no spam, promise.</p>' +
        '<form id="newsletterPopupForm" novalidate>' +
          '<label class="sr-only" for="newsletterPopupEmail" data-nl="E-mailadres">Email address</label>' +
          '<input id="newsletterPopupEmail" type="email" required placeholder="you@email.com" data-nl-placeholder="jouw@email.nl">' +
          '<div class="field-honeypot" aria-hidden="true">' +
            '<label for="newsletterPopupCompany">Company</label>' +
            '<input id="newsletterPopupCompany" type="text" tabindex="-1" autocomplete="off">' +
          '</div>' +
          '<input type="hidden" id="newsletterPopupRenderedAt" value="">' +
          '<button type="submit" class="btn btn-dark" data-nl="Ja, hou me op de hoogte">Yes, keep me posted</button>' +
        '</form>' +
        '<p class="newsletter-popup-status" id="newsletterPopupStatus" hidden></p>' +
        '<p class="newsletter-popup-fine" data-nl-html="Je kunt je altijd afmelden. Zie onze <a href=&quot;privacy.html&quot;>privacyverklaring</a>.">You can unsubscribe anytime. See our <a href="privacy.html">privacy policy</a>.</p>' +
        '<button type="button" class="newsletter-popup-dismiss" id="newsletterPopupDismiss" data-nl="Nee, bedankt">No thanks</button>' +
      '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function showPopup(){
    if (alreadyHandled()) return;

    var overlay = buildPopup();
    if (window.FORKIT_I18N){
      window.FORKIT_I18N.applyLang(document.documentElement.lang || window.FORKIT_I18N.detectLang());
    }

    var emailInput = overlay.querySelector('#newsletterPopupEmail');
    var renderedAtField = overlay.querySelector('#newsletterPopupRenderedAt');
    renderedAtField.value = String(Date.now());

    overlay.hidden = false;
    window.requestAnimationFrame(function(){
      overlay.classList.add('is-visible');
      emailInput.focus();
    });

    function dismiss(){
      overlay.classList.remove('is-visible');
      try { localStorage.setItem(DISMISSED_AT_KEY, String(Date.now())); } catch(e){}
      window.setTimeout(function(){ overlay.remove(); }, 250);
    }

    overlay.querySelector('.newsletter-popup-close').addEventListener('click', dismiss);
    overlay.querySelector('#newsletterPopupDismiss').addEventListener('click', dismiss);
    overlay.addEventListener('click', function(e){
      if (e.target === overlay) dismiss();
    });
    document.addEventListener('keydown', function escHandler(e){
      if (e.key === 'Escape' && document.body.contains(overlay)){
        dismiss();
        document.removeEventListener('keydown', escHandler);
      }
    });

    var statusEl = overlay.querySelector('#newsletterPopupStatus');
    function showStatus(kind, textEn, textNl){
      var lang = document.documentElement.lang === 'nl' ? 'nl' : 'en';
      statusEl.textContent = lang === 'nl' ? textNl : textEn;
      statusEl.hidden = false;
      statusEl.className = 'newsletter-popup-status ' + (kind === 'success' ? 'is-success' : 'is-error');
    }

    overlay.querySelector('#newsletterPopupForm').addEventListener('submit', function(e){
      e.preventDefault();
      var email = emailInput.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
        showStatus('error', 'Please enter a valid email address.', 'Vul een geldig e-mailadres in.');
        return;
      }

      var attribution = getAttribution();
      var lang = document.documentElement.lang === 'nl' ? 'nl' : 'en';
      var payload = {
        formType: 'newsletter',
        email: email,
        language: lang,
        utmSource: attribution.utmSource,
        utmMedium: attribution.utmMedium,
        utmCampaign: attribution.utmCampaign,
        landingPage: attribution.landingPage,
        company: overlay.querySelector('#newsletterPopupCompany').value, /* honeypot */
        renderedAt: Number(renderedAtField.value || 0)
      };

      try { localStorage.setItem(SUBSCRIBED_KEY, '1'); } catch(e){}
      showStatus('success', 'You’re in — thanks for subscribing!', 'Je staat op de lijst — bedankt voor je inschrijving!');
      overlay.querySelector('#newsletterPopupForm').hidden = true;

      var url = (window.FORKIT_CONFIG && window.FORKIT_CONFIG.appsScriptUrl) || '';
      if (url){
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' }, /* avoids a CORS preflight against Apps Script */
          body: JSON.stringify(payload)
        }).then(function(res){ return res.json(); }).then(function(data){
          if (data && data.ok && window.FORKIT_TRACK){
            window.FORKIT_TRACK('newsletter_signup', { source: 'popup' });
          }
        }).catch(function(){ /* silent — subscription already recorded locally */ });
      }

      window.setTimeout(dismiss, 2500);
    });
  }

  function init(){
    if (alreadyHandled()) return;
    window.setTimeout(showPopup, SHOW_DELAY_MS);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
