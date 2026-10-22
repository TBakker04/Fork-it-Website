/**
 * JobRunner.gs — every scheduled job runs through runJob() so errors
 * are logged, the Status tab stays current, and the owner gets at most
 * one failure email per job per day (not six hourly uptime-check
 * failure emails in a row, etc).
 */

function runJob(jobName, fn){
  try {
    fn();
    recordJobStatus(jobName, 'OK', '');
  } catch (err){
    logEvent(jobName, 'ERROR', (err && err.stack) || err);
    recordJobStatus(jobName, 'ERROR', String((err && err.message) || err));
    alertJobFailureOncePerDay(jobName, err);
  }
}

/* Upserts one row per job in the Status tab. Never throws — a problem
   recording status should never be the reason a job's own error
   handling (or the job itself) breaks. */
function recordJobStatus(jobName, status, message){
  try {
    var sheet = getSheet('Status');
    var jobCol = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 1).getValues();
    for (var i = 0; i < jobCol.length; i++){
      if (jobCol[i][0] === jobName){
        sheet.getRange(i + 2, 2, 1, 3).setValues([[new Date(), status, message]]);
        return;
      }
    }
    sheet.appendRow([jobName, new Date(), status, message]);
  } catch (e){
    // Status tab missing or locked — don't let that break the job.
  }
}

function alertJobFailureOncePerDay(jobName, err){
  var today = Utilities.formatDate(new Date(), 'Europe/Amsterdam', 'yyyy-MM-dd');
  var props = PropertiesService.getScriptProperties();
  var key = 'job_fail_' + jobName + '_' + today;
  if (props.getProperty(key)) return;
  props.setProperty(key, '1');

  var ownerEmail = getSetting('owner_email', '');
  if (!ownerEmail) return;
  MailApp.sendEmail(
    ownerEmail,
    '[ForkIt] ' + jobName + ' job failed',
    'The "' + jobName + '" scheduled job failed with:\n\n' + err +
    '\n\nCheck the Log tab in the Sheet for details. This alert only sends once per day per job, even if it keeps failing.'
  );
}
