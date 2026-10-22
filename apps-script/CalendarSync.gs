/**
 * CalendarSync.gs — daily 08:00. Creates a calendar event for each
 * "booked" inquiry with an event_date, and keeps it updated if the
 * date or details change later (re-synced every run by event ID, not
 * just created once).
 */

function syncCalendarEvents(){
  var records = getAllInquiryRecords();
  var calendar = CalendarApp.getDefaultCalendar();

  records.forEach(function(r){
    if (r.status !== 'booked' || !r.event_date) return;
    var eventDate = toDateOnly(r.event_date);
    if (!eventDate) return;

    var title = 'ForkIt: ' + r.inquiry_type + ' – ' + r.name + ' (' + r.group_size + ' ppl)';
    var description = buildEventDescription(r);

    if (r.calendar_event_id){
      var existing = tryGetCalendarEvent(r.calendar_event_id);
      if (existing){
        existing.setTitle(title);
        existing.setDescription(description);
        if (!isSameDay(existing.getStartTime(), eventDate)){
          existing.setAllDayDate(eventDate);
        }
        return;
      }
      /* calendar_event_id was set but the event is gone (deleted by
         hand in Calendar) — fall through and recreate it below. */
    }

    var created = calendar.createAllDayEvent(title, eventDate, { description: description });
    setInquiryField(r._rowIndex, 'calendar_event_id', created.getId());
  });
}

function buildEventDescription(r){
  return [
    'Contact: ' + r.name + ' — ' + r.email + ' — ' + (r.phone || '—'),
    'Group size: ' + r.group_size,
    'Notes: ' + (r.notes || r.message || '—')
  ].join('\n');
}

function tryGetCalendarEvent(id){
  try { return CalendarApp.getEventById(id); }
  catch (e){ return null; }
}

function isSameDay(a, b){
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function job_calendarSync(){ runJob('calendarSync', syncCalendarEvents); }
