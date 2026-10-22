/**
 * LeadFollowUp.gs — daily 09:00. Nudges "quoted" leads that haven't
 * moved to "booked" (or "lost") a few days after being quoted, with a
 * friendly "still interested?" email pointing back to the site. Sent
 * at most once per inquiry (lead_follow_up_sent_at).
 *
 * "Quoted a few days ago" is measured from quoted_at, which
 * InquiryEdits.gs stamps automatically the moment someone sets a
 * row's status to "quoted" in the Sheet. Rows that were already
 * "quoted" before that tracking existed fall back to received_at.
 */

function sendLeadFollowUps(){
  var records = getAllInquiryRecords();
  var now = new Date();

  records.forEach(function(r){
    if (r.status !== 'quoted') return;
    if (r.lead_follow_up_sent_at) return;

    var quotedAt = toDateOnly(r.quoted_at) || toDateOnly(r.received_at);
    if (!quotedAt) return;
    if (daysSince(quotedAt, now) < 3) return;

    sendLeadFollowUp(r);
    setInquiryField(r._rowIndex, 'lead_follow_up_sent_at', now);
  });
}

function job_leadFollowUp(){ runJob('leadFollowUp', sendLeadFollowUps); }
