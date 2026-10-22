/**
 * JobRunner.gs — every scheduled job runs through runJob() so errors
 * are logged and the owner gets at most one failure email per job
 * per day (not six hourly uptime-check failure emails in a row, etc).
 */

function runJob(jobName, fn){
  try {
    fn();
  } catch (err){
    logEvent(jobName, 'ERROR', (err && err.stack) || err);
    alertJobFailureOncePerDay(jobName, err);
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
