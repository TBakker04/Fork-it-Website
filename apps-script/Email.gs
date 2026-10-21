/**
 * Email.gs — the instant owner alert and the customer confirmation.
 */

function sendOwnerAlert(id, data){
  var ownerEmail = getSetting('owner_email', '');
  if (!ownerEmail){
    logEvent('sendOwnerAlert', 'ERROR', 'owner_email is not set in the Settings tab');
    return;
  }

  var sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  var subject = '[ForkIt booking] ' + data.inquiryType + ' – ' + data.name +
    ' – ' + data.groupSize + ' ppl – ' + data.preferredDate;

  var source = [data.utmSource, data.utmMedium, data.utmCampaign].filter(function(v){ return v; }).join(' / ');

  var lines = [
    'New booking inquiry (id: ' + id + ')',
    '',
    'Name: ' + data.name,
    'Email: ' + data.email,
    'Phone: ' + (data.phone || '—'),
    'Event type: ' + data.inquiryType,
    'Preferred date: ' + data.preferredDate,
    'Group size: ' + data.groupSize,
    'Message: ' + (data.message || '—'),
    'Newsletter opt-in: ' + (data.newsletterOptIn ? 'yes' : 'no'),
    'Source: ' + (source || 'direct'),
    'Landing page: ' + (data.landingPage || '—'),
    '',
    'Open the Sheet: ' + sheetUrl
  ];

  MailApp.sendEmail(ownerEmail, subject, lines.join('\n'));

  var webhook = getSetting('alert_slack_webhook', '');
  if (webhook){
    try {
      UrlFetchApp.fetch(webhook, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ text: subject })
      });
    } catch (e){
      logEvent('sendOwnerAlert', 'ERROR', 'Slack webhook failed: ' + e);
    }
  }
}

/* At most one confirmation per email address per hour, per the plan. */
function maybeSendCustomerConfirmation(data){
  var cache = CacheService.getScriptCache();
  var cacheKey = 'confirm_' + String(data.email).toLowerCase();
  if (cache.get(cacheKey)){
    logEvent('maybeSendCustomerConfirmation', 'INFO', 'rate-limited: ' + data.email);
    return;
  }
  cache.put(cacheKey, '1', 3600);
  sendCustomerConfirmation(data);
}

function sendCustomerConfirmation(data){
  var businessName = getSetting('business_name', 'Fork It');
  var replyTo = getSetting('reply_to_email', getSetting('owner_email', ''));
  var instagramUrl = getSetting('instagram_url', 'https://instagram.com/fork_it_leiden');

  var subject = 'We got your request, ' + data.name + '!';
  var body = [
    'Hi ' + data.name + ',',
    '',
    'Thanks for reaching out to ' + businessName + '! Here’s what you sent us:',
    '',
    '- Event: ' + data.inquiryType,
    '- Date: ' + data.preferredDate,
    '- Group size: ' + data.groupSize,
    '',
    'We read every message ourselves and get back to you within 24 hours with next steps.',
    '',
    'In the meantime, follow along here: ' + instagramUrl,
    '',
    'Talk soon,',
    businessName
  ].join('\n');

  var options = { name: businessName };
  if (replyTo) options.replyTo = replyTo;

  MailApp.sendEmail(data.email, subject, body, options);
}
