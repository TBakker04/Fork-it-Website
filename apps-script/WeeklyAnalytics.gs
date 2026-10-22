/**
 * WeeklyAnalytics.gs — Tuesday 06:00 (Tuesday because last week's GA4
 * data is only fully processed after a day or two). Pulls last week's
 * numbers from the GA4 Data API and appends one row to the "Weekly
 * analytics" tab, alongside that week's inquiry count from the
 * Inquiries tab.
 *
 * Requires the "AnalyticsData" advanced service enabled — it's
 * already declared in appsscript.json, but Apps Script also needs you
 * to turn it on once from the editor (Services: + icon) the first
 * time; see the README.
 */

function exportWeeklyAnalytics(){
  var propertyId = getSetting('ga4_property_id', '');
  if (!propertyId){
    logEvent('exportWeeklyAnalytics', 'ERROR', 'ga4_property_id is not set in the Settings tab');
    return;
  }
  var property = 'properties/' + propertyId;
  var range = getLastWeekRange();

  /* Each report is fetched independently through safeRunReport, so one
     bad/unavailable dimension (e.g. a custom dimension that isn't
     registered in GA4 yet) only blanks that one column — it can't
     abort the whole export and skip the row entirely. */
  var overview = safeRunReport('overview', property, {
    dateRanges: [{ startDate: range.start, endDate: range.end }],
    metrics: [
      { name: 'activeUsers' },
      { name: 'sessions' },
      { name: 'engagementRate' },
      { name: 'averageSessionDuration' }
    ]
  });

  var customEvents = safeRunReport('customEvents', property, {
    dateRanges: [{ startDate: range.start, endDate: range.end }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: { values: ['generate_lead', 'form_start', 'book_click'] }
      }
    }
  });

  /* Requires a GA4 custom dimension registered for the "method" event
     parameter (Admin -> Custom definitions -> Custom dimensions,
     scope "Event", parameter name "method") — see the README. Until
     that's registered (and has had a little time to start collecting
     data), this column comes back empty rather than failing the job. */
  var contactByMethod = safeRunReport('contactByMethod', property, {
    dateRanges: [{ startDate: range.start, endDate: range.end }],
    dimensions: [{ name: 'customEvent:method' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: { fieldName: 'eventName', stringFilter: { value: 'contact_click' } }
    },
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }]
  });

  var sourceMedium = safeRunReport('sourceMedium', property, {
    dateRanges: [{ startDate: range.start, endDate: range.end }],
    dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 8
  });

  var campaignLeads = safeRunReport('campaignLeads', property, {
    dateRanges: [{ startDate: range.start, endDate: range.end }],
    dimensions: [{ name: 'sessionCampaignName' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 8
  });

  var topPages = safeRunReport('topPages', property, {
    dateRanges: [{ startDate: range.start, endDate: range.end }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 5
  });

  var inquiriesCount = countInquiriesReceivedBetween(range.start, range.end);

  appendWeeklyAnalyticsRow(range, {
    overview: overview,
    customEvents: customEvents,
    contactByMethod: contactByMethod,
    sourceMedium: sourceMedium,
    campaignLeads: campaignLeads,
    topPages: topPages,
    inquiriesCount: inquiriesCount
  });
}

function runReport(property, requestBody){
  return AnalyticsData.Properties.runReport(requestBody, property);
}

/* Logs and swallows a single report's failure instead of letting it
   abort the whole weekly export. Returns {} on failure, which every
   formatter here already treats the same as "no data this week". */
function safeRunReport(label, property, requestBody){
  try {
    return runReport(property, requestBody);
  } catch (err){
    logEvent('exportWeeklyAnalytics', 'ERROR', label + ' report failed: ' + err);
    return {};
  }
}

function getLastWeekRange(){
  var tz = 'Europe/Amsterdam';
  var now = new Date();
  var isoDayOfWeek = Number(Utilities.formatDate(now, tz, 'u')); // 1=Mon .. 7=Sun
  var thisMonday = new Date(now.getTime());
  thisMonday.setDate(thisMonday.getDate() - (isoDayOfWeek - 1));
  var lastMonday = new Date(thisMonday.getTime());
  lastMonday.setDate(lastMonday.getDate() - 7);
  var lastSunday = new Date(thisMonday.getTime());
  lastSunday.setDate(lastSunday.getDate() - 1);
  return {
    start: Utilities.formatDate(lastMonday, tz, 'yyyy-MM-dd'),
    end: Utilities.formatDate(lastSunday, tz, 'yyyy-MM-dd')
  };
}

function extractEventCount(report, eventName){
  if (!report.rows) return 0;
  for (var i = 0; i < report.rows.length; i++){
    if (report.rows[i].dimensionValues[0].value === eventName){
      return Number(report.rows[i].metricValues[0].value);
    }
  }
  return 0;
}

function formatDimensionMetricRows(report, limit){
  if (!report.rows) return '';
  return report.rows.slice(0, limit || report.rows.length).map(function(row){
    var dims = row.dimensionValues.map(function(d){ return d.value; }).join('/');
    return dims + ': ' + row.metricValues[0].value;
  }).join(', ');
}

function countInquiriesReceivedBetween(startStr, endStr){
  var start = new Date(startStr + 'T00:00:00');
  var end = new Date(endStr + 'T23:59:59');
  var records = getAllInquiryRecords();
  return records.filter(function(r){
    return r.received_at instanceof Date && r.received_at >= start && r.received_at <= end;
  }).length;
}

function appendWeeklyAnalyticsRow(range, data){
  var sheet = getSheet('Weekly analytics');
  var overviewValues = (data.overview.rows && data.overview.rows[0] && data.overview.rows[0].metricValues) || [];

  var row = WEEKLY_ANALYTICS_COLUMNS.map(function(col){
    switch (col){
      case 'week_start': return range.start;
      case 'week_end': return range.end;
      case 'active_users': return overviewValues[0] ? Number(overviewValues[0].value) : 0;
      case 'sessions': return overviewValues[1] ? Number(overviewValues[1].value) : 0;
      case 'engagement_rate': return overviewValues[2] ? Number(overviewValues[2].value) : 0;
      case 'avg_engagement_time': return overviewValues[3] ? Number(overviewValues[3].value) : 0;
      case 'generate_lead': return extractEventCount(data.customEvents, 'generate_lead');
      case 'form_start': return extractEventCount(data.customEvents, 'form_start');
      case 'book_click': return extractEventCount(data.customEvents, 'book_click');
      case 'contact_click_by_method': return formatDimensionMetricRows(data.contactByMethod);
      case 'sessions_by_source_medium': return formatDimensionMetricRows(data.sourceMedium);
      case 'leads_by_campaign': return formatDimensionMetricRows(data.campaignLeads);
      case 'top_pages': return formatDimensionMetricRows(data.topPages);
      case 'inquiries_count': return data.inquiriesCount;
      default: return '';
    }
  });
  sheet.appendRow(row);
}

function job_weeklyAnalytics(){ runJob('weeklyAnalytics', exportWeeklyAnalytics); }
