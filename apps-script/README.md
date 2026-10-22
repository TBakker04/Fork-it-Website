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
- `Email.gs` — the owner alert and the customer confirmation (rate-limited to 1/hour/email)
- `Log.gs` — every job writes errors/info here instead of failing silently
- `JobRunner.gs` — wraps every scheduled job so a failure gets logged and emails you at most once per day, not once per hour
- `SheetRecords.gs` — shared helpers for reading/writing Inquiries rows as plain objects
- `LeadDigest.gs` — daily 08:00, emails you inquiries that have gone too long without a reply
- `CalendarSync.gs` — daily 08:00, creates/updates a Calendar event for each "booked" row
- `ReviewRequests.gs` — daily 10:00, thanks customers 1-3 days after a "done" event and asks for a review
- `Uptime.gs` — hourly, checks the site's actually up; alerts if not, alerts again when it recovers
- `WeeklyAnalytics.gs` — Tuesday 06:00, pulls last week's GA4 numbers into the Weekly analytics tab
- `PrivacyCleanup.gs` — monthly, anonymises inquiries older than `retention_months`
- `Triggers.gs` — `installTriggers()`, run once to schedule all six jobs above

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

### If `exportWeeklyAnalytics` fails

This is the one job that talks to a different Google API (GA4's Analytics Data API), so it needs one extra authorization step the others don't:

1. Run `exportWeeklyAnalytics` once from the dropdown — if it fails with something like "API not enabled" or "AnalyticsData is not defined", that's expected the first time.
2. In the Apps Script editor, click **Project Settings** (gear icon) → find the **Google Cloud Platform (GCP) Project** section → click the project number link. This opens the Cloud Console.
3. In the Cloud Console, search for **"Google Analytics Data API"** → click **Enable**.
4. Go back to the Apps Script editor, run `exportWeeklyAnalytics` again. It may ask you to re-authorize (same "unsafe" warning flow as before) — click through it.
5. If it still fails, check the **Log** tab for the exact error and send it to me.
