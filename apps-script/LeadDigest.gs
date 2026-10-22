/**
 * LeadDigest.gs — daily 08:00. Emails the owner a list of inquiries
 * that have been sitting too long without a reply.
 *
 * Note: the Inquiries sheet only has one timestamp (received_at) —
 * there's no separate "status last changed" column — so "quoted
 * older than 4 days" is measured from received_at too, same as "new
 * older than 24h". Good enough for a small business; if that ever
 * becomes misleading, add a status_changed_at column and update this.
 */

function sendLeadDigest(){
  var records = getAllInquiryRecords();
  var now = new Date();

  var stale = records.filter(function(r){
    if (r.status === 'new') return hoursSince(r.received_at, now) > 24;
    if (r.status === 'quoted') return daysSince(r.received_at, now) > 4;
    return false;
  });

  if (stale.length === 0) return;

  var lines = [stale.length + ' inquiries are waiting on a reply:', ''];
  stale.forEach(function(r){
    lines.push('- [' + r.status + '] ' + r.name + ' — ' + r.inquiry_type +
      ', ' + r.preferred_date + ', ' + r.group_size + ' ppl');
  });
  lines.push('');
  lines.push('Open the Sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());

  var ownerEmail = getSetting('owner_email', '');
  if (!ownerEmail) return;
  MailApp.sendEmail(ownerEmail, '[ForkIt] ' + stale.length + ' inquiries waiting on a reply', lines.join('\n'));
}

function job_leadDigest(){ runJob('leadDigest', sendLeadDigest); }
