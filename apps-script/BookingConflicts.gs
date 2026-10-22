/**
 * BookingConflicts.gs — installable onEdit trigger, set up by
 * installTriggers() (unlike a restricted simple onEdit trigger, an
 * installable one is allowed to send email). The moment a row ends up
 * with status "booked" on a day another row is already "booked" for,
 * the newer one is reverted to "quoted" and the owner gets an email —
 * so two jobs never silently end up confirmed for the same day.
 *
 * Fires on every edit to the Inquiries sheet, but only acts when the
 * edit touches the status or event_date column. That includes the
 * revert this function makes to its own edit — safe from looping,
 * since the revert sets status to "quoted", and checkRowForBookingConflict
 * only acts when status is "booked".
 */

function onInquiryStatusEdit(e){
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    if (sheet.getName() !== 'Inquiries') return;

    var statusCol = INQUIRY_COLUMNS.indexOf('status') + 1;
    var eventDateCol = INQUIRY_COLUMNS.indexOf('event_date') + 1;
    if (!statusCol || !eventDateCol) return;

    var editedCol = e.range.getColumn();
    var editedColEnd = editedCol + e.range.getNumColumns() - 1;
    var touchesStatus = statusCol >= editedCol && statusCol <= editedColEnd;
    var touchesEventDate = eventDateCol >= editedCol && eventDateCol <= editedColEnd;
    if (!touchesStatus && !touchesEventDate) return;

    var startRow = Math.max(e.range.getRow(), 2);
    var numRows = e.range.getRow() + e.range.getNumRows() - startRow;
    if (numRows <= 0) return;

    for (var i = 0; i < numRows; i++){
      checkRowForBookingConflict(sheet, startRow + i, statusCol);
    }
  } catch (err){
    try { logEvent('onInquiryStatusEdit', 'ERROR', (err && err.stack) || err); } catch (e2){ }
  }
}

function checkRowForBookingConflict(sheet, row, statusCol){
  var status = sheet.getRange(row, statusCol).getValue();
  if (status !== 'booked') return;

  var records = getAllInquiryRecords();
  var thisRecord = records.filter(function(r){ return r._rowIndex === row; })[0];
  if (!thisRecord) return;

  var eventDate = toDateOnly(thisRecord.event_date);
  if (!eventDate) return;

  var conflict = records.filter(function(r){
    if (r._rowIndex === row) return false;
    if (r.status !== 'booked') return false;
    var otherDate = toDateOnly(r.event_date);
    return otherDate && isSameDay(otherDate, eventDate);
  })[0];
  if (!conflict) return;

  sheet.getRange(row, statusCol).setValue('quoted');

  var dateLabel = Utilities.formatDate(eventDate, 'Europe/Amsterdam', 'yyyy-MM-dd');
  logEvent('onInquiryStatusEdit', 'WARN',
    'Booking conflict on ' + dateLabel + ': row ' + row + ' (' + thisRecord.name +
    ') reverted to quoted — ' + conflict.name + ' (row ' + conflict._rowIndex + ') is already booked that day.');

  var ownerEmail = getSetting('owner_email', '');
  if (!ownerEmail) return;

  var lines = [
    'Two bookings ended up "booked" for the same day: ' + dateLabel + '.',
    '',
    'Already booked: ' + conflict.name + ' — ' + conflict.inquiry_type + ' (row ' + conflict._rowIndex + ')',
    'Just tried: ' + thisRecord.name + ' — ' + thisRecord.inquiry_type + ' (row ' + row + ')',
    '',
    'I reverted the second one back to "quoted" so it doesn’t count as confirmed — open the Sheet to sort out which one actually gets the date:',
    SpreadsheetApp.getActiveSpreadsheet().getUrl()
  ];
  MailApp.sendEmail(ownerEmail, '[ForkIt] Double booking on ' + dateLabel, lines.join('\n'));
}
