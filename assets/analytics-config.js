/* Single source of truth for analytics/consent IDs and settings.
   Referenced by assets/analytics-consent.js on every page. Nothing in
   this file is secret — the GA4 measurement ID and Clarity project ID
   are client-side identifiers, safe to be public. */
window.FORKIT_CONFIG = {
  ga4MeasurementId: 'G-WG8CTZZBGB',
  clarityProjectId: 'z15u1rb2gc',
  productionHostnames: ['forkit.nl', 'www.forkit.nl']
};
