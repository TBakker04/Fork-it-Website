/**
 * Settings.gs — reads the "Settings" tab (key/value) so the owner can
 * change things like the alert email or the review link without
 * touching code. Every other file reads config through here.
 */

function getSettings() {
  var sheet = getSheet('Settings');
  var values = sheet.getDataRange().getValues();
  var settings = {};
  for (var i = 1; i < values.length; i++) {
    var key = values[i][0];
    var value = values[i][1];
    if (key) settings[key] = value;
  }
  return settings;
}

function getSetting(key, fallback) {
  var settings = getSettings();
  var value = settings[key];
  if (value === undefined || value === null || value === '') return fallback;
  return value;
}
