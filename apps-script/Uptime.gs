/**
 * Uptime.gs — hourly. Checks the homepage loads and the booking form
 * is actually present. Retries once before alerting. Max one DOWN
 * alert every 6 hours while it stays down, plus one "back up" email
 * on recovery.
 */

function checkUptime(){
  var siteUrl = getSetting('site_url', 'https://forkit.nl').replace(/\/$/, '');
  var homeUrl = siteUrl + '/home.html';

  var ok = checkUrlOk(siteUrl, 'Fork It') && checkUrlOk(homeUrl, 'id="bookingForm"');

  var props = PropertiesService.getScriptProperties();
  var wasDown = props.getProperty('uptime_is_down') === '1';
  var ownerEmail = getSetting('owner_email', '');

  if (!ok){
    var lastAlertMs = Number(props.getProperty('uptime_last_alert_ms') || 0);
    var sixHoursMs = 6 * 3600000;
    if (Date.now() - lastAlertMs > sixHoursMs){
      if (ownerEmail){
        MailApp.sendEmail(
          ownerEmail,
          'ForkIt website is DOWN',
          'The site did not respond correctly as of ' + new Date() +
          '.\n\nChecked: ' + siteUrl + ' and ' + homeUrl +
          '\n\nThis alert repeats at most once every 6 hours while it stays down.'
        );
      }
      props.setProperty('uptime_last_alert_ms', String(Date.now()));
    }
    props.setProperty('uptime_is_down', '1');
  } else if (wasDown){
    if (ownerEmail){
      MailApp.sendEmail(ownerEmail, 'ForkIt website is back up', 'The site is responding normally again as of ' + new Date() + '.');
    }
    props.deleteProperty('uptime_is_down');
    props.deleteProperty('uptime_last_alert_ms');
  }
}

function checkUrlOk(url, expectedMarker){
  if (fetchAndCheck(url, expectedMarker)) return true;
  Utilities.sleep(2000);
  return fetchAndCheck(url, expectedMarker);
}

function fetchAndCheck(url, expectedMarker){
  try {
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() !== 200) return false;
    if (expectedMarker && res.getContentText().indexOf(expectedMarker) === -1) return false;
    return true;
  } catch (e){
    logEvent('checkUptime', 'ERROR', 'fetch failed for ' + url + ': ' + e);
    return false;
  }
}

function job_uptimeCheck(){ runJob('uptimeCheck', checkUptime); }
