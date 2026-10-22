/**
 * SheetRecords.gs — shared helpers for reading/writing the Inquiries
 * tab as plain objects instead of raw row/column indexes.
 */

function getAllInquiryRecords(){
  var sheet = getSheet('Inquiries');
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var records = [];
  for (var i = 1; i < values.length; i++){
    var row = values[i];
    if (!row[0]) continue; // blank row
    var record = {};
    headers.forEach(function(h, idx){ record[h] = row[idx]; });
    record._rowIndex = i + 1; // 1-based sheet row, for writing back
    records.push(record);
  }
  return records;
}

function setInquiryField(rowIndex, columnName, value){
  var sheet = getSheet('Inquiries');
  var col = INQUIRY_COLUMNS.indexOf(columnName) + 1;
  if (col < 1) throw new Error('unknown_column:' + columnName);
  sheet.getRange(rowIndex, col).setValue(value);
}

function hoursSince(date, now){
  if (!(date instanceof Date)) return 0;
  return (now.getTime() - date.getTime()) / 3600000;
}

function daysSince(date, now){
  return hoursSince(date, now) / 24;
}

/* Sheet date cells usually come back as real Date objects already;
   this just guards against a stray string value. */
function toDateOnly(value){
  if (value instanceof Date) return value;
  if (!value) return null;
  var d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
