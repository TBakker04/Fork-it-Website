/**
 * Triggers.gs — run installTriggers() once, manually, after testing
 * each job (see the README). Deletes any existing triggers first, so
 * it's always safe to re-run after a code update without ending up
 * with duplicates.
 */

function installTriggers(){
  deleteAllTriggers();

  ScriptApp.newTrigger('job_leadDigest')
    .timeBased().atHour(8).everyDays(1).inTimezone('Europe/Amsterdam').create();

  ScriptApp.newTrigger('job_calendarSync')
    .timeBased().atHour(8).everyDays(1).inTimezone('Europe/Amsterdam').create();

  ScriptApp.newTrigger('job_reviewRequests')
    .timeBased().atHour(10).everyDays(1).inTimezone('Europe/Amsterdam').create();

  ScriptApp.newTrigger('job_uptimeCheck')
    .timeBased().everyHours(1).create();

  ScriptApp.newTrigger('job_weeklyAnalytics')
    .timeBased().onWeekDay(ScriptApp.WeekDay.TUESDAY).atHour(6).inTimezone('Europe/Amsterdam').create();

  ScriptApp.newTrigger('job_monthlyCleanup')
    .timeBased().onMonthDay(1).atHour(3).inTimezone('Europe/Amsterdam').create();

  /* Installable (not simple) onEdit trigger — needs MailApp access to
     warn about a double booking, which a plain onEdit(e) can't do. */
  ScriptApp.newTrigger('onInquiryStatusEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  Logger.log('Installed ' + ScriptApp.getProjectTriggers().length + ' triggers.');
}

function deleteAllTriggers(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    ScriptApp.deleteTrigger(t);
  });
}
