/**
 * ReviewRequests.gs — daily 10:00. Thanks customers 1-3 days after a
 * "done" event and asks for a review. Never sends twice (checks and
 * sets review_requested_at).
 */

function sendReviewRequests(){
  var records = getAllInquiryRecords();
  var now = new Date();
  var reviewLink = getSetting('google_review_link', '');
  var instagramUrl = getSetting('instagram_url', 'https://instagram.com/fork_it_leiden');
  var businessName = getSetting('business_name', 'Fork It');

  records.forEach(function(r){
    if (r.status !== 'done') return;
    if (r.review_requested_at) return;
    var eventDate = toDateOnly(r.event_date);
    if (!eventDate) return;

    var daysAgo = daysSince(eventDate, now);
    if (daysAgo < 1 || daysAgo > 3) return;

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
    setInquiryField(r._rowIndex, 'review_requested_at', now);
  });
}

function job_reviewRequests(){ runJob('reviewRequests', sendReviewRequests); }
