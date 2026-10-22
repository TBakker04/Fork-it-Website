/**
 * InquiryEdits.gs — onEdit(e) is a reserved function name Apps Script
 * runs automatically as a "simple trigger" on any edit made by a human
 * in the Sheet UI. No installTriggers() needed, nothing to deploy —
 * it's live as soon as this file is saved.
 *
 * Only job here: the moment someone sets a row's status to "quoted",
 * stamp quoted_at, so LeadFollowUp.gs can measure "a few days after
 * being quoted" accurately instead of falling back to received_at.
 *
 * Simple triggers run with restricted authorization (no MailApp,
 * UrlFetchApp, etc.) and must never throw back at the person editing
 * the sheet — so this stays minimal and fails silently.
 */

function onEdit(e){
  try {
    var sheet = e.range.getSheet();
    if (sheet.getName() !== 'Inquiries') return;

    var statusCol = INQUIRY_COLUMNS.indexOf('status') + 1;
    var quotedAtCol = INQUIRY_COLUMNS.indexOf('quoted_at') + 1;
    if (!statusCol || !quotedAtCol) return;

    var editedCol = e.range.getColumn();
    var editedColEnd = editedCol + e.range.getNumColumns() - 1;
    if (statusCol < editedCol || statusCol > editedColEnd) return;

    var startRow = Math.max(e.range.getRow(), 2);
    var numRows = e.range.getRow() + e.range.getNumRows() - startRow;
    if (numRows <= 0) return;

    var statusValues = sheet.getRange(startRow, statusCol, numRows, 1).getValues();
    var quotedAtValues = sheet.getRange(startRow, quotedAtCol, numRows, 1).getValues();
    statusValues.forEach(function(row, i){
      if (row[0] !== 'quoted') return;
      if (quotedAtValues[i][0]) return; // don't overwrite an existing timestamp
      sheet.getRange(startRow + i, quotedAtCol).setValue(new Date());
    });
  } catch (err){
    // Swallow — see note above.
  }
}
