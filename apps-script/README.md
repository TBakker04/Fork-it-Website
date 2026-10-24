# Fork It — booking form backend (Google Apps Script)

Receives the booking form's submission, writes it to a Google Sheet, emails you instantly, and confirms with the customer. Runs entirely on Google's free tier.

## One-time setup (you do this — Claude Code can't complete Google's login flow from its sandbox)

1. Go to **sheets.google.com** → create a new blank spreadsheet. Name it **"ForkIt Website Data"**.
2. In the Sheet: **Extensions → Apps Script**. This opens the bound script editor.
3. Delete the default empty `Code.gs` content.
4. For each file in this folder (`Code.gs`, `Setup.gs`, `Settings.gs`, `Log.gs`, `Validation.gs`, `Email.gs`), create a matching file in the Apps Script editor (**+ → Script**) and paste the contents in. File names must match (without `.gs` when naming in the editor — it adds the extension itself).
5. Click the **appsscript.json** icon in the left sidebar — if you don't see it, click the gear icon (**Project Settings**) and tick **"Show appsscript.json manifest file in editor"**. Paste in the contents of `appsscript.json` from this folder, replacing what's there.
6. Save all files (**Ctrl+S** / **Cmd+S**, or the save icon).
7. In the function dropdown at the top (next to the Run/Debug buttons), select **setup**, then click **Run**. The first time, Google will ask you to authorize the script — click through **Advanced → Go to ForkIt Website Data (unsafe)** (this warning is normal for your own scripts; "unsafe" just means Google hasn't reviewed it, not that it's actually unsafe).
8. Go back to the Sheet — you should now see 4 tabs: **Inquiries**, **Weekly analytics**, **Settings**, **Log**.
9. Fill in the **Settings** tab, at minimum:
   - `owner_email` — your email address (where booking alerts go)
   - `reply_to_email` — same, unless you want replies to go somewhere else
   - `google_review_link` — can leave empty for now (Phase 5)
10. Back in the Apps Script editor: **Deploy → New deployment**. Click the gear next to "Select type" → **Web app**. Settings:
    - Execute as: **Me**
    - Who has access: **Anyone**
    Click **Deploy**, authorize again if asked, then **copy the Web app URL** it gives you.
11. Send me that URL — I'll put it in `assets/analytics-config.js` as `appsScriptUrl`, which turns on the live submissions from the website.

## Testing before you deploy

In the Apps Script editor, select **manualTestSubmission** from the function dropdown and click **Run**. This writes a test row to **Inquiries** and sends real emails (owner alert + customer confirmation) — the customer one goes to `test@example.com` so you won't see it, but the owner alert goes to your real `owner_email`, so you'll know it worked.

## Updating the code later

Any time I change these files, you'll need to re-paste the changed one(s) into the Apps Script editor and save — then **Deploy → Manage deployments → (pencil/edit icon on your deployment) → New version → Deploy**. Using "Manage deployments" to add a new version (rather than creating a brand new deployment) keeps the same Web app URL, so nothing on the website needs to change.

If you'd rather manage this with `clasp` (Google's CLI) instead of copy-pasting through the editor — useful once you're comfortable with it, since it pushes all files in one command — run this from your own computer (not this sandbox, since `clasp login` needs a real browser):

```
npm install -g @google/clasp
clasp login
cd apps-script
clasp clone <scriptId>   # scriptId is in the Apps Script editor: Project Settings → Script ID
clasp push                # pushes local files to the script
clasp deploy -i <deploymentId>   # redeploys to the SAME url — find deploymentId via `clasp deployments`
```

## What each file does

- `Code.gs` — the `doPost` entry point: validates, writes the row, sends emails
- `Setup.gs` — `setup()`, run once to create the sheet tabs; also the column definitions
- `Settings.gs` — reads the Settings tab so nothing is hard-coded
- `Validation.gs` — spam checks (honeypot, timing), required-field checks, formula-injection escaping
- `Email.gs` — every outbound email template: owner alert, customer confirmation, review ask + reminder
- `Log.gs` — every job writes errors/info here instead of failing silently
- `JobRunner.gs` — wraps every scheduled job so a failure gets logged, the **Status** tab is updated, and you get at most one failure email per job per day, not once per hour
- `SheetRecords.gs` — shared helpers for reading/writing Inquiries rows as plain objects
- `LeadDigest.gs` — daily 08:00, emails you inquiries that have gone too long without a reply
- `CalendarSync.gs` — daily 08:00, creates/updates a Calendar event for each "booked" row
- `ReviewRequests.gs` — daily 10:00, thanks customers 1-3 days after a "done" event and asks for a review; one reminder 7 days later if they haven't been reminded yet
- `BookingConflicts.gs` — fires the instant you set a row to "booked" (or edit its `event_date`); if another row is already "booked" for that same day, reverts this one back to "quoted" and emails you — see "Double-booking protection" below
- `Uptime.gs` — hourly, checks the site's actually up; alerts if not, alerts again when it recovers
- `WeeklyAnalytics.gs` — Tuesday 06:00, pulls last week's GA4 numbers into the Weekly analytics tab
- `PrivacyCleanup.gs` — monthly, anonymises inquiries older than `retention_months`
- `Triggers.gs` — `installTriggers()`, run once to schedule all six time-based jobs above, plus the `BookingConflicts.gs` edit-trigger

## Phase 5: adding the scheduled jobs (follow-ups, calendar, reviews, reports, uptime)

You already have the Phase 3 files in place. Now add the Phase 5 ones the same way:

1. In the Apps Script editor, create 8 new files (**+ → Script**, same as before): `JobRunner`, `SheetRecords`, `LeadDigest`, `CalendarSync`, `ReviewRequests`, `Uptime`, `WeeklyAnalytics`, `PrivacyCleanup`, `Triggers` — paste each one's contents in, delete the `myFunction` placeholder first.
2. Update `appsscript.json` (the one already in your editor) with the new version from this folder — it now declares the GA4 **AnalyticsData** advanced service, needed for the weekly report.
3. Save everything (**Ctrl+S**).
4. **Test each job manually first**, one at a time, from the function dropdown at the top — select the function, click **Run**, check the result, before scheduling anything automatically:
   - **`sendLeadDigest`** — only emails you if there's something stale in Inquiries; add a test row with status "new" and an old `received_at` if you want to see it fire.
   - **`syncCalendarEvents`** — set a test row's status to "booked" with an `event_date`, run this, then check your Google Calendar for a new "ForkIt: ..." event.
   - **`sendReviewRequests`** — set a test row's status to "done" with `event_date` 2 days ago and `review_requested_at` empty, run this, check that row's email inbox.
   - **`checkUptime`** — should run with no errors and (if the site's up) do nothing visible. To test the alert itself, temporarily change `site_url` in Settings to something broken, run it, confirm you get a "DOWN" email, then change it back and run again to confirm the "back up" email.
   - **`exportWeeklyAnalytics`** — run this one last, since it needs the GA4 API connection. See "If exportWeeklyAnalytics fails" below if it errors. On success, a new row appears in the **Weekly analytics** tab.
   - **`anonymizeOldInquiries`** — safe to run anytime; it only touches rows older than `retention_months` (18 by default), so on a fresh sheet it'll just log "anonymized 0 inquiries" and do nothing visible.
5. Once each job above ran cleanly: select **`installTriggers`** from the dropdown and click **Run**. This schedules all six jobs and removes any old triggers first, so it's always safe to re-run after a code update.
6. Check it worked: **Triggers** icon (clock icon) in the left sidebar — you should see 6 triggers listed, one per job.
7. Redeploy the web app so the live site picks up the latest code: **Deploy → Manage deployments → pencil icon → New version → Deploy** (same as any other code update — keeps the same URL).

## Phase 5.1: Status tab + review reminders

Two small additions on top of Phase 5 — same copy-paste workflow:

1. Re-paste the updated `Setup.gs`, `JobRunner.gs`, `ReviewRequests.gs`, and `Email.gs` over their existing contents (all four changed).
2. Save everything (**Ctrl+S**), then re-run **`setup`** from the function dropdown. It's safe to re-run — it only adds the new columns/tabs, never touches existing data. You should now see a **Status** tab with 6 rows (one per job, all "never run" until their first run), and the **Inquiries** tab should have 1 new column at the end: `review_reminder_sent_at`.
3. Test it: **`sendReviewRequests`** now also covers reminders — set a test row's status to `done` with `review_requested_at` 7+ days ago and `review_reminder_sent_at` empty, run it, check for a "One more thing, ... — how did we do?" email.
4. No need to re-run `installTriggers` — the trigger count didn't change (reminders ride along inside the existing `reviewRequests` job).
5. Redeploy the web app (**Deploy → Manage deployments → pencil icon → New version → Deploy**) so the live site picks up the latest code — strictly speaking this phase didn't touch `doPost`, but it's good habit to keep the deployed version in sync with what's in the editor.

(A fourth idea from this round — an automatic "still interested?" nudge for leads stuck on "quoted" — is on hold for now, not built.)

## Phase 5.2: double-booking protection

You already manually control which rows become "booked" — nothing on the site books anything automatically. This adds a safety net for that manual step: if you ever set two rows to "booked" on the *same day*, the second one gets silently reverted and you get warned, instead of it just sitting there as two confirmed jobs on one day.

1. Create 1 new file (**+ → Script**): `BookingConflicts` — paste its contents in.
2. Re-paste the updated `Triggers.gs` (it now also installs an edit-trigger, not just the six time-based ones).
3. Save everything (**Ctrl+S**), then re-run **`installTriggers`**. Check the **Triggers** panel — you should now see **7** entries: the six jobs, plus one event-driven trigger (`onInquiryStatusEdit`, type "On edit", instead of "Time-driven").
4. Test it: pick two different rows, set an `event_date` on both to the same day, then set both rows' `status` to `booked` (one at a time). The second one should flip back to `quoted` within a second or two, and you should get an email titled "[ForkIt] Double booking on ...". Set them to different dates and repeat — this time both should stay `booked`.

Notes:
- It only compares `booked` rows against other `booked` rows — a `quoted` or `lost` row on the same day never blocks anything.
- It checks on edits to either `status` or `event_date`, so it also catches the case where you book something first and only fill in the date afterwards.
- There's currently no override: if you genuinely want two things booked on the same day, setting the reverted row back to `booked` will just get reverted again. Say the word if you ever need an exception path (e.g. a bigger crew day) and we'll add one.

### Reading the Status tab

One row per scheduled job: `job`, `last_run_at`, `last_status` (`OK` / `ERROR` / `never run`), `last_message` (the error, when there is one). Updated automatically by every job run through `JobRunner.gs`'s `runJob()` — which is all of them. If a job's `last_run_at` looks stale (hasn't updated when it should have), check the **Triggers** panel first (maybe it got deleted or disabled), then the **Log** tab for details.

### If `exportWeeklyAnalytics` fails

This is the one job that talks to a different Google API (GA4's Analytics Data API), so it needs one extra authorization step the others don't:

1. Run `exportWeeklyAnalytics` once from the dropdown — if it fails with something like "API not enabled" or "AnalyticsData is not defined", that's expected the first time.
2. In the Apps Script editor, click **Project Settings** (gear icon) → find the **Google Cloud Platform (GCP) Project** section → click the project number link. This opens the Cloud Console.
3. In the Cloud Console, search for **"Google Analytics Data API"** → click **Enable**.
4. Go back to the Apps Script editor, run `exportWeeklyAnalytics` again. It may ask you to re-authorize (same "unsafe" warning flow as before) — click through it.
5. If it still fails, check the **Log** tab for the exact error and send it to me.

### Getting the "contact method" breakdown to populate (`contact_click_by_method`)

This one column needs a one-time setup step in GA4 itself, separate from the API-enabling step above — GA4 only lets you query a custom event parameter (here, `method` on `contact_click` events — whatsapp/instagram/email) through the API once it's registered as a **custom dimension**:

1. In GA4: **Admin** (gear icon) → **Custom definitions** → **Custom dimensions** tab → **Create custom dimension**.
2. Dimension name: `Contact Method` (or anything you'll recognize).
3. Scope: **Event**.
4. Event parameter: `method`.
5. Save.

This only applies going forward — it can take up to a day or two after registering before GA4 has collected enough data for it to show up. Until then (or if you skip this step entirely), that one column in the Weekly analytics tab just comes back empty — every other column, and the row itself, are unaffected. A single report failing like this never blocks the whole weekly export from running; it only blanks that one piece.

## Phase 6: newsletter popup

The "stay in the loop" popup on the website (home, menu, wines, FAQ pages) now submits to this same backend, tagged so it's handled separately from booking inquiries. This changed 4 existing files — no new files this time.

1. Re-paste the updated `Code.gs`, `Setup.gs`, `Validation.gs` and `Email.gs` into the Apps Script editor (same as any other code update).
2. Save everything (**Ctrl+S**).
3. Run **`setup`** again from the function dropdown (safe to re-run — it only adds what's missing). This creates a new **Newsletter** tab in the Sheet, alongside the existing ones.
4. **Deploy → Manage deployments → pencil icon → New version → Deploy** — this picks up the code change on the same Web app URL, so nothing on the website needs to change.

What happens on a signup: a row goes into the **Newsletter** tab (email, when, language, where they signed up), and the subscriber gets a short "thanks for subscribing" email (see `sendNewsletterConfirmation` in `Email.gs` if you want to tweak the wording). There's no owner alert for this one — check the Newsletter tab whenever you like instead of getting an email per signup.

Unsubscribing right now is manual: the confirmation email asks people to just reply if they want off the list, and you'd then mark that row `unsubscribed` (or delete it) yourself. That's fine at low volume. Once you're actually sending regular campaigns off this list, move it into a proper mailing tool (Mailchimp, Brevo, Mailerlite — all have a free tier) instead of BCC-ing from the Sheet — they handle one-click unsubscribe automatically, which Dutch law (Telecommunicatiewet art. 11.7) requires on every marketing email.
