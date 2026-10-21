/* Single source of truth for analytics/consent IDs and settings.
   Referenced by assets/analytics-consent.js and assets/site.js on
   every page. Nothing in this file is secret — the GA4 measurement
   ID, Clarity project ID and the Apps Script web app URL are all
   client-side identifiers, safe to be public (the backend validates
   and rate-limits every request itself; see /apps-script). */
window.FORKIT_CONFIG = {
  ga4MeasurementId: 'G-WG8CTZZBGB',
  clarityProjectId: 'z15u1rb2gc',
  productionHostnames: ['forkit.nl', 'www.forkit.nl'],
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbwsCKZRLSwwNhsuQUYXknyOgPzNwDFFxlgVG7X22uMgkOOZhAGylafUQ2fcHG6v9W99wg/exec'
};
