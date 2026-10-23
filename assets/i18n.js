/**
 * i18n.js — EN/NL toggle. The Dutch translation for each element lives
 * right on that element as a data-nl / data-nl-html / data-nl-<attr>
 * attribute; English is simply whatever is already in the HTML. The
 * English original is cached into a data-en-cache-* attribute the
 * first time a given element is switched, so switching back to English
 * is lossless and needs no separate English copy stored anywhere.
 *
 * Language choice: a ?lang=nl|en URL param (shareable link) wins, then
 * a saved localStorage preference, then the browser's language,
 * defaulting to English. Switching updates the URL (no reload) and
 * saves the preference.
 */
(function(){
  function detectLang(){
    try {
      var params = new URLSearchParams(location.search);
      var fromUrl = params.get('lang');
      if (fromUrl === 'nl' || fromUrl === 'en') return fromUrl;
    } catch(e){}
    try {
      var saved = localStorage.getItem('forkit_lang');
      if (saved === 'nl' || saved === 'en') return saved;
    } catch(e){}
    return (navigator.language || '').toLowerCase().indexOf('nl') === 0 ? 'nl' : 'en';
  }

  function swapText(el, lang){
    if (el.dataset.enCache === undefined) el.dataset.enCache = el.textContent;
    el.textContent = lang === 'nl' ? el.dataset.nl : el.dataset.enCache;
  }
  function swapHtml(el, lang){
    if (el.dataset.enCacheHtml === undefined) el.dataset.enCacheHtml = el.innerHTML;
    el.innerHTML = lang === 'nl' ? el.dataset.nlHtml : el.dataset.enCacheHtml;
  }
  function swapAttr(el, lang, attrName, dataKey, cacheKey){
    if (el.dataset[cacheKey] === undefined) el.dataset[cacheKey] = el.getAttribute(attrName) || '';
    el.setAttribute(attrName, lang === 'nl' ? el.dataset[dataKey] : el.dataset[cacheKey]);
  }

  function applyLang(lang){
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-nl]').forEach(function(el){ swapText(el, lang); });
    document.querySelectorAll('[data-nl-html]').forEach(function(el){ swapHtml(el, lang); });
    document.querySelectorAll('[data-nl-placeholder]').forEach(function(el){
      swapAttr(el, lang, 'placeholder', 'nlPlaceholder', 'enCachePlaceholder');
    });
    document.querySelectorAll('[data-nl-alt]').forEach(function(el){
      swapAttr(el, lang, 'alt', 'nlAlt', 'enCacheAlt');
    });
    document.querySelectorAll('[data-nl-aria-label]').forEach(function(el){
      swapAttr(el, lang, 'aria-label', 'nlAriaLabel', 'enCacheAriaLabel');
    });
    document.querySelectorAll('meta[data-nl-content]').forEach(function(el){
      swapAttr(el, lang, 'content', 'nlContent', 'enCacheContent');
    });

    document.querySelectorAll('[data-lang-label]').forEach(function(el){
      el.textContent = lang === 'nl' ? 'EN' : 'NL';
    });
    document.querySelectorAll('[data-lang-toggle]').forEach(function(el){
      el.setAttribute('aria-label', lang === 'nl' ? 'Switch to English' : 'Overschakelen naar Nederlands');
    });

    try { localStorage.setItem('forkit_lang', lang); } catch(e){}

    try {
      var url = new URL(location.href);
      url.searchParams.set('lang', lang);
      history.replaceState(null, '', url);
    } catch(e){}
  }

  function toggleLang(){
    applyLang(document.documentElement.lang === 'nl' ? 'en' : 'nl');
  }

  window.FORKIT_I18N = { applyLang: applyLang, toggleLang: toggleLang, detectLang: detectLang };

  function init(){
    applyLang(detectLang());
    document.querySelectorAll('[data-lang-toggle]').forEach(function(btn){
      btn.addEventListener('click', toggleLang);
    });
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
