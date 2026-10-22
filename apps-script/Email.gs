/**
 * Email.gs — every outbound email template: owner alert, customer
 * confirmation, and the review request + its one reminder.
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

/* First review ask, sent 1-3 days after a "done" event. */
function sendReviewRequest(r){
  var reviewLink = getSetting('google_review_link', '');
  var instagramUrl = getSetting('instagram_url', 'https://instagram.com/fork_it_leiden');
  var businessName = getSetting('business_name', 'Fork It');

  var lines = [
    'Hi ' + r.name + ',',
    '',
    'Thanks again for having ' + businessName + ' cook for your ' + r.inquiry_type + '! We hope it was a great night.',
    '',
    'If you have a minute, a quick review helps us a lot:'
  ];
  if (reviewLink) lines.push(reviewLink);
  lines.push('');
  lines.push('And if you snapped any photos, tag us on Instagram — we love seeing them: ' + instagramUrl);
  lines.push('');
  lines.push('Talk soon,');
  lines.push(businessName);

  MailApp.sendEmail(r.email, 'How was your ' + r.inquiry_type + ', ' + r.name + '?', lines.join('\n'), { name: businessName });
}

/* One reminder, 7 days after the first ask, only if review_requested_at
   is set and review_reminder_sent_at isn't yet (see ReviewRequests.gs).
   We have no way to know if they actually left a review — this fires
   regardless, but never more than once. */
function sendReviewReminder(r){
  var reviewLink = getSetting('google_review_link', '');
  var businessName = getSetting('business_name', 'Fork It');

  var lines = [
    'Hi ' + r.name + ',',
    '',
    'Just a quick one — we asked last week how your ' + r.inquiry_type + ' with ' + businessName + ' went. No worries if you missed it!',
    '',
    'If you have 30 seconds, a review really helps us out:'
  ];
  if (reviewLink) lines.push(reviewLink);
  lines.push('');
  lines.push('Thanks either way — it was a pleasure cooking for you.');
  lines.push('');
  lines.push(businessName);

  MailApp.sendEmail(r.email, 'One more thing, ' + r.name + ' — how did we do?', lines.join('\n'), { name: businessName });
}
