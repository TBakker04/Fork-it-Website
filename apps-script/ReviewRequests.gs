/**
 * ReviewRequests.gs — daily 10:00. Thanks customers 1-3 days after a
 * "done" event and asks for a review. If they haven't left one a week
 * later (we can't actually detect that, so: haven't been reminded
 * yet), sends one reminder — and only one, ever, per inquiry.
 */

function sendReviewRequests(){
  var records = getAllInquiryRecords();
  var now = new Date();

  records.forEach(function(r){
    if (r.status !== 'done') return;

    if (!r.review_requested_at){
      var eventDate = toDateOnly(r.event_date);
      if (!eventDate) return;
      var daysAgo = daysSince(eventDate, now);
      if (daysAgo < 1 || daysAgo > 3) return;
      sendReviewRequest(r);
      setInquiryField(r._rowIndex, 'review_requested_at', now);
      return;
    }

    if (r.review_reminder_sent_at) return;
    var requestedAt = toDateOnly(r.review_requested_at);
    if (!requestedAt) return;
    if (daysSince(requestedAt, now) < 7) return;
    sendReviewReminder(r);
    setInquiryField(r._rowIndex, 'review_reminder_sent_at', now);
  });
}

function job_reviewRequests(){ runJob('reviewRequests', sendReviewRequests); }
