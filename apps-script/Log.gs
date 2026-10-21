/**
 * Log.gs — every job writes here instead of throwing silently.
 */
function logEvent(job, level, message){
  try {
    var sheet = getSheet('Log');
    sheet.appendRow([new Date(), job, level, String(message)]);
  } catch (e){
    // If the Log tab itself is missing/locked, don't let logging break
    // the actual request — just drop it.
  }
}
