/**
 * PrivacyCleanup.gs — monthly, 1st at 03:00. Anonymises inquiries
 * older than retention_months (Settings tab), keeping type, date,
 * group size and status for statistics but clearing anything that
 * identifies the person.
 */

function anonymizeOldInquiries(){
  var months = Number(getSetting('retention_months', 18));
  var cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  var records = getAllInquiryRecords();
  var anonymized = 0;

  records.forEach(function(r){
    if (!(r.received_at instanceof Date)) return;
    if (r.received_at >= cutoff) return;
    if (r.name === 'anonymised') return; // already done

    setInquiryField(r._rowIndex, 'name', 'anonymised');
    setInquiryField(r._rowIndex, 'email', 'anonymised');
    setInquiryField(r._rowIndex, 'phone', 'anonymised');
    setInquiryField(r._rowIndex, 'message', 'anonymised');
    anonymized++;
  });

  logEvent('anonymizeOldInquiries', 'INFO', 'anonymized ' + anonymized + ' inquiries older than ' + months + ' months');
}

function job_monthlyCleanup(){ runJob('monthlyCleanup', anonymizeOldInquiries); }
