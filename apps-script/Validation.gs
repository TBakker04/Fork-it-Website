/**
 * Validation.gs — spam checks and input sanitizing for the booking form.
 */

var REQUIRED_FIELDS = ['name', 'email', 'inquiryType', 'preferredDate', 'groupSize'];
var MIN_SUBMIT_MS = 3000; // reject anything submitted faster than this after the form rendered

function validateSubmission(data){
  // Honeypot: a real visitor never fills this hidden field in.
  if (data.company){
    return { spam: true, reason: 'honeypot' };
  }

  var renderedAt = Number(data.renderedAt);
  var elapsed = Date.now() - renderedAt;
  if (!renderedAt || elapsed < MIN_SUBMIT_MS){
    return { spam: true, reason: 'too_fast:' + elapsed + 'ms' };
  }

  for (var i = 0; i < REQUIRED_FIELDS.length; i++){
    var field = REQUIRED_FIELDS[i];
    if (!data[field] || !String(data[field]).trim()){
      return { spam: false, error: 'missing_field:' + field };
    }
  }

  if (!isValidEmail(data.email)){
    return { spam: false, error: 'invalid_email' };
  }

  return { spam: false };
}

function isValidEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
}

/* Same honeypot/timing checks as a booking, but only email is required —
   the newsletter popup never asks for a name, date or group size. */
function validateNewsletterSubmission(data){
  if (data.company){
    return { spam: true, reason: 'honeypot' };
  }

  var renderedAt = Number(data.renderedAt);
  var elapsed = Date.now() - renderedAt;
  if (!renderedAt || elapsed < MIN_SUBMIT_MS){
    return { spam: true, reason: 'too_fast:' + elapsed + 'ms' };
  }

  if (!data.email || !String(data.email).trim()){
    return { spam: false, error: 'missing_field:email' };
  }
  if (!isValidEmail(data.email)){
    return { spam: false, error: 'invalid_email' };
  }

  return { spam: false };
}

/* Google Sheets (and Excel) treat a cell starting with =, +, - or @ as
   a formula. A booking form is exactly the kind of untrusted input
   that formula-injection attacks target — prefixing with an
   apostrophe forces it to stay plain text. */
function sanitizeCell(value){
  var s = (value === undefined || value === null) ? '' : String(value);
  if (/^[=+\-@]/.test(s)){
    return "'" + s;
  }
  return s;
}

function groupSizeBand(groupSize){
  var n = Number(groupSize);
  if (!n || n < 1) return 'unknown';
  if (n <= 5) return '1-5';
  if (n <= 10) return '6-10';
  if (n <= 20) return '11-20';
  return '20+';
}
