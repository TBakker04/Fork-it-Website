/**
 * Setup.gs — run setup() once, manually, from the Apps Script editor
 * after creating the bound Sheet. Safe to re-run: it only creates
 * tabs/headers that don't already exist and never overwrites rows
 * you've already filled in (Settings values included).
 */

var INQUIRY_COLUMNS = [
  'id', 'received_at', 'name', 'email', 'phone', 'inquiry_type',
  'preferred_date', 'group_size', 'message', 'language',
  'utm_source', 'utm_medium', 'utm_campaign', 'landing_page',
  'newsletter_opt_in', 'status', 'event_date', 'notes',
  'calendar_event_id', 'review_requested_at', 'review_reminder_sent_at'
];

var WEEKLY_ANALYTICS_COLUMNS = [
  'week_start', 'week_end', 'active_users', 'sessions', 'engagement_rate',
  'avg_engagement_time', 'generate_lead', 'form_start', 'book_click',
  'contact_click_by_method', 'sessions_by_source_medium',
  'leads_by_campaign', 'top_pages', 'inquiries_count'
];

var STATUS_COLUMNS = ['job', 'last_run_at', 'last_status', 'last_message'];

/* One row per scheduled job, seeded by setup() and kept current by
   JobRunner.gs's recordJobStatus() on every run — see the Status tab. */
var JOB_NAMES = [
  'leadDigest', 'calendarSync', 'reviewRequests', 'uptimeCheck',
  'weeklyAnalytics', 'monthlyCleanup'
];

var DEFAULT_SETTINGS = [
  ['owner_email', ''],
  ['business_name', 'Fork It'],
  ['reply_to_email', ''],
  ['site_url', 'https://forkit.nl'],
  ['google_review_link', ''],
  ['instagram_url', 'https://instagram.com/fork_it_leiden'],
  ['ga4_property_id', '559964645'],
  ['retention_months', '18'],
  ['alert_slack_webhook', '']
];

function setup(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  setupInquiriesSheet(ss);
  setupWeeklyAnalyticsSheet(ss);
  setupSettingsSheet(ss);
  setupLogSheet(ss);
  setupStatusSheet(ss);
  SpreadsheetApp.flush();
  Logger.log('Setup complete. Fill in the Settings tab (owner_email at least), then deploy as a web app.');
}

function getOrCreateSheet(ss, name){
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function setupInquiriesSheet(ss){
  var sheet = getOrCreateSheet(ss, 'Inquiries');
  sheet.getRange(1, 1, 1, INQUIRY_COLUMNS.length).setValues([INQUIRY_COLUMNS]);
  sheet.setFrozenRows(1);

  var statusCol = INQUIRY_COLUMNS.indexOf('status') + 1;
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['new', 'replied', 'quoted', 'booked', 'done', 'lost'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, statusCol, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(rule);
}

function setupWeeklyAnalyticsSheet(ss){
  var sheet = getOrCreateSheet(ss, 'Weekly analytics');
  sheet.getRange(1, 1, 1, WEEKLY_ANALYTICS_COLUMNS.length).setValues([WEEKLY_ANALYTICS_COLUMNS]);
  sheet.setFrozenRows(1);
}

function setupSettingsSheet(ss){
  var sheet = getOrCreateSheet(ss, 'Settings');
  if (sheet.getLastRow() === 0){
    sheet.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
  }
  sheet.setFrozenRows(1);

  var existingKeys = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().map(function(r){ return r[0]; })
    : [];
  DEFAULT_SETTINGS.forEach(function(pair){
    if (existingKeys.indexOf(pair[0]) === -1){
      sheet.appendRow(pair);
    }
  });
}

function setupLogSheet(ss){
  var sheet = getOrCreateSheet(ss, 'Log');
  sheet.getRange(1, 1, 1, 4).setValues([['timestamp', 'job', 'level', 'message']]);
  sheet.setFrozenRows(1);
}

/* One row per scheduled job, so "is everything still running?" is a
   glance at this tab instead of hunting through old emails. Pre-seeded
   with "never run" rows so it's useful even before the first run; after
   that, JobRunner.gs's recordJobStatus() keeps each row current. */
function setupStatusSheet(ss){
  var sheet = getOrCreateSheet(ss, 'Status');
  sheet.getRange(1, 1, 1, STATUS_COLUMNS.length).setValues([STATUS_COLUMNS]);
  sheet.setFrozenRows(1);

  var existingJobs = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().map(function(r){ return r[0]; })
    : [];
  JOB_NAMES.forEach(function(job){
    if (existingJobs.indexOf(job) === -1){
      sheet.appendRow([job, '', 'never run', '']);
    }
  });
}

function getSheet(name){
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('missing_sheet:' + name);
  return sheet;
}
