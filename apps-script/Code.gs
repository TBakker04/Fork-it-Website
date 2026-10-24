/**
 * Code.gs — web app entry point. Receives the booking form's POST,
 * validates it, logs it to the Inquiries tab, and sends the owner
 * alert + customer confirmation emails.
 *
 * Deploy as a web app: executeAs "Me" (the account that owns this
 * script), access "Anyone". See the README in this folder.
 */

function doPost(e){
  var lock = LockService.getScriptLock();
  var gotLock = lock.tryLock(10000);
  if (!gotLock){
    return jsonResponse({ ok: false, error: 'busy_try_again' });
  }
  try {
    var data = parseRequest(e);
    var result = data.formType === 'newsletter' ? handleNewsletterSignup(data) : handleBooking(data);
    return jsonResponse(result);
  } catch (err){
    logEvent('doPost', 'ERROR', (err && err.stack) || err);
    return jsonResponse({ ok: false, error: 'server_error' });
  } finally {
    lock.releaseLock();
  }
}

/* The website posts with Content-Type: text/plain (to avoid a CORS
   preflight against the Apps Script endpoint) and a JSON string body. */
function parseRequest(e){
  if (!e || !e.postData || !e.postData.contents){
    throw new Error('empty_request');
  }
  return JSON.parse(e.postData.contents);
}

function jsonResponse(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleBooking(data){
  var check = validateSubmission(data);

  if (check.spam){
    // Pretend success so a bot doesn't learn to adjust its behavior.
    logEvent('handleBooking', 'INFO', 'blocked spam submission: ' + check.reason);
    return { ok: true };
  }
  if (check.error){
    return { ok: false, error: check.error };
  }

  var id = Utilities.getUuid();
  appendInquiryRow(id, data);
  sendOwnerAlert(id, data);
  maybeSendCustomerConfirmation(data);

  return { ok: true, id: id };
}

function handleNewsletterSignup(data){
  var check = validateNewsletterSubmission(data);

  if (check.spam){
    // Pretend success so a bot doesn't learn to adjust its behavior.
    logEvent('handleNewsletterSignup', 'INFO', 'blocked spam submission: ' + check.reason);
    return { ok: true };
  }
  if (check.error){
    return { ok: false, error: check.error };
  }

  var id = Utilities.getUuid();
  appendNewsletterRow(id, data);
  maybeSendNewsletterConfirmation(data);

  return { ok: true, id: id };
}

function appendNewsletterRow(id, data){
  var sheet = getSheet('Newsletter');
  var row = NEWSLETTER_COLUMNS.map(function(col){
    switch (col){
      case 'id': return id;
      case 'received_at': return new Date();
      case 'email': return sanitizeCell(data.email);
      case 'language': return sanitizeCell(data.language || 'en');
      case 'utm_source': return sanitizeCell(data.utmSource);
      case 'utm_medium': return sanitizeCell(data.utmMedium);
      case 'utm_campaign': return sanitizeCell(data.utmCampaign);
      case 'landing_page': return sanitizeCell(data.landingPage);
      case 'status': return 'subscribed';
      default: return '';
    }
  });
  sheet.appendRow(row);
}

function appendInquiryRow(id, data){
  var sheet = getSheet('Inquiries');
  var row = INQUIRY_COLUMNS.map(function(col){
    switch (col){
      case 'id': return id;
      case 'received_at': return new Date();
      case 'name': return sanitizeCell(data.name);
      case 'email': return sanitizeCell(data.email);
      case 'phone': return sanitizeCell(data.phone);
      case 'inquiry_type': return sanitizeCell(data.inquiryType);
      case 'preferred_date': return sanitizeCell(data.preferredDate);
      case 'group_size': return sanitizeCell(data.groupSize);
      case 'message': return sanitizeCell(data.message);
      case 'language': return sanitizeCell(data.language || 'en');
      case 'utm_source': return sanitizeCell(data.utmSource);
      case 'utm_medium': return sanitizeCell(data.utmMedium);
      case 'utm_campaign': return sanitizeCell(data.utmCampaign);
      case 'landing_page': return sanitizeCell(data.landingPage);
      case 'newsletter_opt_in': return !!data.newsletterOptIn;
      case 'status': return 'new';
      default: return '';
    }
  });
  sheet.appendRow(row);
}

/* Quick manual test from the Apps Script editor: select this function
   in the toolbar dropdown and click Run. Writes a test row and sends
   real emails to whatever owner_email is set to, so use an address
   you can check. */
function manualTestSubmission(){
  var fakeEvent = {
    postData: {
      contents: JSON.stringify({
        name: 'Test Visitor',
        email: 'test@example.com',
        phone: '0600000000',
        inquiryType: 'Private Dinner',
        preferredDate: '2026-12-24',
        groupSize: '8',
        message: 'This is a manual test submission.',
        language: 'en',
        utmSource: 'manual-test',
        utmMedium: 'manual-test',
        utmCampaign: 'manual-test',
        landingPage: '/home.html',
        newsletterOptIn: true,
        company: '',
        renderedAt: Date.now() - 5000
      })
    }
  };
  var result = doPost(fakeEvent);
  Logger.log(result.getContent());
}
