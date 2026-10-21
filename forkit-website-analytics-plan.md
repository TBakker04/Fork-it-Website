# ForkIt website: automation & analytics plan v2 (copy-paste for Claude Code)

**How to use:** put this file in the root of your website repo. Paste the **Starter prompt** once, then paste one phase prompt at a time. Finish each phase's checks before starting the next. Cost: €0. Everything runs on free tiers.

---

## Priorities: what matters most for a small business

| Priority | What | Why it matters for you |
|---|---|---|
| 🔴 Must (week 1) | Booking form → Sheet + instant alert to you + automatic confirmation to the customer | Speed of reply is the #1 reason small event businesses win or lose a booking |
| 🔴 Must | Know which channel brings **bookings** (not just visits): conversion tracking + UTM links | Tells you whether Instagram, Google or word-of-mouth is worth your time |
| 🔴 Must | Google Business Profile + basic SEO + nice link previews | Free local visibility; most WhatsApp/Instagram shares show a preview image |
| 🟠 Should (week 2) | Lead pipeline + reminder for unanswered inquiries | No lead forgotten while you're busy in Milan |
| 🟠 Should | Automatic review request after each event | Reviews are the cheapest marketing a small business has |
| 🟠 Should | Weekly report (visitors, leads, sources, open inquiries) | 5 minutes on Monday instead of checking 4 dashboards |
| 🟡 Nice | Heatmaps (Clarity), uptime alerts, quality checks on every update | Improve the site and catch problems early |

**If you only do three things:** Phase 3 (form backend), Phase 2 (conversion tracking) and Phase 4 (Google Business Profile + SEO).

---

## Architecture: one free "business backend"

Instead of a mix of GitHub Actions, service accounts and keys, everything runs in **one Google Apps Script attached to one Google Sheet**. It lives in your Google account, Claude Code writes and deploys it with `clasp` (Google's command-line tool), and Claude on claude.ai can read the Sheet and your Gmail through the connectors you already have.

```
Website visitor
 ├─ Cookie banner ──(only after consent)──> GA4 + Microsoft Clarity
 └─ Booking form ──> Apps Script web app
                       ├─ row in Sheet "Inquiries" (status: new)
                       ├─ instant email to you: "[ForkIt booking] ..."
                       └─ confirmation email to customer

Apps Script timed jobs (same script)
 ├─ hourly:   uptime check of the site → email if down
 ├─ daily:    digest of unanswered leads (> 24 h) · calendar events for "booked" · review requests after "done" events
 ├─ weekly:   GA4 numbers → Sheet "Weekly analytics" (Tuesday, when last week's data is complete)
 └─ monthly:  anonymise old inquiries (privacy)

Claude (claude.ai scheduled task, Tuesday morning)
 └─ reads Sheet + Gmail + Calendar → weekly report + drafts replies in Gmail (you review and send)
```

---

## Starter prompt (paste once into Claude Code)

```text
Read forkit-website-analytics-plan.md completely. This is my automation and analytics plan for the ForkIt website (ForkIt: cooking workshops like paella, dinner experiences and catering-style events; main audience: students and groups in Leiden, the Netherlands).

Working rules for all phases:
- Work one phase at a time, only when I paste that phase's prompt. Start each phase by telling me in a few lines what you will change.
- Keep all IDs and URLs (GA4 measurement ID, GA4 property ID, Clarity ID, Apps Script web-app URL, domain) in ONE config file. Never hard-code them in several places. Never commit secrets.
- Never send personal data (names, emails, phone numbers, message text) to GA4 or Clarity.
- No analytics on localhost or preview deployments, only on the production domain.
- Use the languages the site already has. Don't add new languages unless I ask.
- Customer-facing text from ForkIt: warm, enthusiastic, with a light Spanish flair (an occasional "¡Hola!" or "¡Hasta pronto!"), short and clear.
- After each phase: give me a short test checklist, and commit with a clear message.

First task: inspect the repo and report the framework/stack, where the shared layout/<head> lives, how and where the site is deployed, existing pages (especially booking/contact and privacy), and existing forms. Don't change anything yet.
```

---

## Phase 0: Things only you can do (≈30–45 min)

1. **GA4** (analytics.google.com): create a property "ForkIt Website", time zone Amsterdam, currency EUR → add a Web stream for your domain. Note two IDs: the **Measurement ID** (`G-…`, in the stream) and the **Property ID** (number, in Admin → Property settings).
   Then, for privacy (important under Dutch rules): Admin → Data collection → **Google signals OFF**; Data retention → **14 months**; Account settings → accept the **data processing terms**; leave data sharing with Google off.
2. **Microsoft Clarity** (clarity.microsoft.com): new project → note the **Project ID**. In Settings → Masking, choose **Strict** (hides everything typed in forms).
3. **Google Business Profile** (business.google.com): create "ForkIt" as a service-area business (no public address needed), category e.g. "Cooking class" / "Caterer", add photos and your website. After approval, copy your **review link** ("Ask for reviews").
4. **Apps Script API:** open script.google.com/home/usersettings and switch **Google Apps Script API** ON (needed so Claude Code can deploy for you).
5. **Search Console:** done later, in Phase 4, once the site is live.

---

## Phase 1: Cookie banner + GA4 + Clarity (🔴/🟡, ≈1–2 h)

```text
Phase 1 of forkit-website-analytics-plan.md.

1. Cookie banner with the open-source "vanilla-cookieconsent" v3 (orestbida/cookieconsent). Categories: "necessary" (always on, read-only) and "analytics" (off by default). Equal-weight "Accept" and "Reject" buttons on the first layer (required in the Netherlands). Footer link "Cookie settings" that reopens the preferences.
2. Basic consent mode (strictest, simplest): set Google Consent Mode v2 defaults to denied for ad_storage, ad_user_data, ad_personalization and analytics_storage, and only LOAD gtag.js (GA4) and the Clarity script after the visitor accepts "analytics". On accept: update analytics_storage to granted (ads signals stay denied, we run no ads) and send Clarity its consent via its consent API (check Clarity's current docs for the consentv2 syntax). On revoke: set denied, call Clarity's consent API with denied, and remove _ga / _clck / _clsk cookies.
3. Owner opt-out: visiting the site with ?notrack=1 stores a flag (localStorage, wrapped in try/catch) that disables all analytics on that device; ?notrack=0 removes it. Show a tiny "tracking off" badge while it's active so I know.
4. Privacy & Cookies page (create or update): who we are and contact, what we collect (GA4, Clarity, booking-form data stored in Google Sheets/Gmail), why, how long (GA4 14 months, inquiries max 18 months then anonymised), and how to ask for deletion. Plain language, short.

Ask me for the GA4 Measurement ID and Clarity Project ID when needed.
```

**Checks:** "Reject" → no `_ga` or `_clck` cookies and no requests to google-analytics.com or clarity.ms (DevTools → Network). "Accept" → you appear in GA4 → Realtime (do this before turning on `?notrack=1`). Then visit `?notrack=1` on your phone and laptop.

---

## Phase 2: Conversion tracking + UTM links (🔴, ≈1–2 h)

**Tracking plan**

| GA4 event | Fires when | Parameters (no personal data) |
|---|---|---|
| `book_click` | Any "Book / Reserve" button is clicked | `location` (hero, workshop_page, footer…), `workshop` |
| `form_start` | First interaction with the booking form | `form` |
| `generate_lead` | Booking form **successfully** submitted | `inquiry_type` (workshop, dinner, catering, other), `group_size_band` (1–5, 6–10, 11–20, 20+) |
| `contact_click` | Click on WhatsApp, Instagram, email or phone link | `method` |
| `workshop_view` | Workshop/experience page viewed | `workshop` (e.g. paella) |

`form_start` vs `generate_lead` shows how many people start but abandon the form.

```text
Phase 2 of forkit-website-analytics-plan.md: implement the tracking plan table exactly.

1. One helper track(eventName, params) that only sends when analytics consent is granted, gtag exists and the owner opt-out flag is not set. No gtag calls anywhere else.
2. Tag elements with data attributes (data-track, data-location, data-workshop…) and use one delegated click listener, so new buttons are easy to tag.
3. form_start fires once per page view on the first focus in the booking form. generate_lead fires only after the backend confirms success (Phase 3) — leave a clearly marked TODO at the success point if the backend isn't there yet.
4. Tag every WhatsApp, Instagram, email and phone link on the site.
5. Add scripts/utm.js: `node scripts/utm.js instagram story paella-nov` prints the full tagged URL (domain from the config). Lowercase everything, replace spaces with hyphens.
6. README section: "How to tag a new button" and "How to make a tracked link".
7. Tell me how to check each event in GA4 DebugView, and remind me to mark generate_lead as a key event in GA4 (Admin → Events).
```

**UTM convention from now on**
- `utm_source`: instagram, whatsapp, google_business, flyer, email
- `utm_medium`: bio, story, post, reel, dm, qr
- `utm_campaign`: short event slug, e.g. `paella-nov`, `always-on` (bio link)

---

## Phase 3: Business backend: Sheet + form + alerts + confirmation (🔴, ≈2–3 h)

```text
Phase 3 of forkit-website-analytics-plan.md: build the free business backend with Google Apps Script, managed from this repo with clasp.

Setup:
1. Install @google/clasp, run `clasp login` (I'll approve in the browser), then create a new Google Sheet with a bound script: title "ForkIt Website Data". Keep the Apps Script source in /apps-script in this repo (Code.gs plus separate files per job, and appsscript.json). Add .clasp.json to .gitignore if it contains IDs I don't want public; ask me if the repo is public.
2. A setup() function that creates these tabs with headers, frozen header rows and data validation:
   - Inquiries: id, received_at, name, email, phone, inquiry_type, preferred_date, group_size, message, language, utm_source, utm_medium, utm_campaign, landing_page, newsletter_opt_in, status (dropdown: new, replied, quoted, booked, done, lost), event_date, notes, calendar_event_id, review_requested_at
   - Weekly analytics (filled in Phase 5)
   - Settings: key/value rows I can edit without code — owner_email, business_name, reply_to_email, site_url, google_review_link, instagram_url, ga4_property_id, retention_months (18), alert_slack_webhook (optional, empty)
   - Log: timestamp, job, level, message
   All code reads settings from the Settings tab.

Form intake (doPost):
3. Validate required fields (name, email, inquiry_type, preferred_date, group_size). Spam protection: hidden honeypot field + reject submissions completed in under 3 seconds (the page sends the form render time). Escape any value starting with =, +, - or @ so it can't run as a spreadsheet formula. Use LockService so simultaneous submissions don't collide. Write errors to the Log tab.
4. Append the row with status "new".
5. Instantly email the owner: subject "[ForkIt booking] {inquiry_type} – {name} – {group_size} ppl – {preferred_date}", all fields, plus a direct link to the Sheet. If alert_slack_webhook is filled, also post a short message there.
6. Send the customer a confirmation in the form's language from "ForkIt", reply-to = reply_to_email: thank them, summarise their request, say I reply within 24 hours, link to Instagram. 4–6 sentences, ForkIt tone. Only send it if the submission passed all spam checks, and at most one per email address per hour.
7. Return JSON {ok:true} / {ok:false,error}.
8. appsscript.json: web app executeAs USER_DEPLOYING, access ANYONE_ANONYMOUS, time zone Europe/Amsterdam.

Website side:
9. Build or update the booking form with those fields, the honeypot, a render-time field, and an optional unchecked checkbox "Keep me updated about new workshops" (newsletter_opt_in — explicit consent). Capture UTM parameters and landing page on the first page of the visit (sessionStorage, try/catch) and send them with the form. Submit with fetch, Content-Type text/plain (avoids CORS preflight with Apps Script). Clear success and error states; on error show my email/WhatsApp as fallback. Fire generate_lead only on success.

Deploy:
10. Push with clasp. Then tell me to open the script (clasp open), run setup() once and approve the permissions. Deploy the web app and put its URL in the config. IMPORTANT: for later updates, redeploy to the SAME deployment ID (clasp deploy -i <id>) so the URL never changes — write this command in the README.
```

**Things only you do:** approve the clasp login and the script permissions. In Gmail, create a filter: subject contains `[ForkIt booking]` → label **ForkIt/Bookings**, "Never send to spam", mark important. Turn on Gmail notifications on your phone for important mail.

**Checks:** a test booking gives a Sheet row, your alert email (labelled), a customer confirmation, and `generate_lead` in DebugView. A submission with the honeypot filled, or one sent in under 3 seconds, does nothing. A name like `=1+1` shows as text in the Sheet.

---

## Phase 4: Get found: SEO, link previews, Google (🔴, ≈1–2 h)

```text
Phase 4 of forkit-website-analytics-plan.md.

1. Every page: unique <title> (max ~60 chars) and meta description (max ~155 chars), canonical URL, lang attribute.
2. Open Graph + Twitter card tags with a good 1200×630 image per main page (use existing site photos only — never generated images), so links shared on WhatsApp and Instagram show a nice preview.
3. JSON-LD structured data: LocalBusiness (or FoodEstablishment) for ForkIt with area served Leiden, site URL, Instagram, and Google Business Profile link; Event markup for upcoming workshops with a fixed date, if the site lists them.
4. sitemap.xml (auto-generated if the framework supports it) and robots.txt pointing to it. Friendly 404 page with a link to the booking page.
5. Quick performance pass: compress/resize images, lazy-load below-the-fold images, no layout shift on the hero.
6. Give me the steps to add the site to Google Search Console (DNS or HTML verification), submit the sitemap, and link Search Console to GA4.
```

**Things only you do:** verify Search Console and submit the sitemap. Put your website link with UTM (`utm_source=google_business&utm_medium=profile`) in your Google Business Profile.

**Checks:** paste a page URL into WhatsApp and see the preview. Run search.google.com/test/rich-results on the homepage with no errors.

---

## Phase 5: Automations: follow-up, calendar, reviews, reports, uptime (🟠, ≈2–3 h)

```text
Phase 5 of forkit-website-analytics-plan.md: add timed jobs to the Apps Script backend. A function installTriggers() creates all triggers (deleting old ones first so it's safe to re-run). Every job logs to the Log tab and catches its own errors; if a job fails, email the owner one short error message (max once per job per day).

1. Daily 08:00 – lead digest: email the owner a list of inquiries with status "new" older than 24 h and "quoted" older than 4 days, each with name, type, date, group size. Skip the email if the list is empty.
2. Daily 08:00 – calendar: for rows with status "booked", an event_date and no calendar_event_id, create an event in my default Google Calendar ("ForkIt: {inquiry_type} – {name} ({group_size} ppl)", details incl. contact info and notes), and store the event ID. If event_date changes later, update the event.
3. Daily 10:00 – review request: for rows with status "done", event_date 1–3 days ago and empty review_requested_at, send the customer a thank-you email in their language (ForkIt tone) with the google_review_link and an invitation to tag ForkIt on Instagram; then fill review_requested_at. Never send twice.
4. Hourly – uptime: fetch site_url and the booking page (muteHttpExceptions). If either isn't HTTP 200, or the page doesn't contain an expected text marker, retry once after a short pause; if it still fails, email the owner "ForkIt website is DOWN" — then max one alert every 6 hours, plus a "back up" email when it recovers.
5. Weekly, Tuesday 06:00 – GA4 export (Tuesday, because last week's GA4 data is only complete after a day or two): enable the AnalyticsData advanced service in appsscript.json (check the current version in Google's docs). For last week Mon–Sun and the week before, get: active users, sessions, engagement rate, average engagement time, generate_lead, form_start, book_click, contact_click by method, sessions by sessionSource/sessionMedium (top 8), sessions and leads by sessionCampaignName (top 8), top 5 pages. Append one row to "Weekly analytics" with clear columns (top lists as compact text). Also add the week's inquiry count from the Inquiries tab, so both sources sit side by side.
6. Monthly, 1st at 03:00 – privacy cleanup: for inquiries older than retention_months, replace name, email, phone and message with "anonymised" but keep type, date, group size, source and status for statistics.
7. Show me how to run each job manually once to test it, then run installTriggers().
```

**Checks:** set a test row to "booked" with a date → event appears in Calendar after running the job manually. Set it to "done" with yesterday's date → review email arrives (use your own email). Run the GA4 export manually → a row appears. Temporarily change `site_url` to a wrong URL → you get a DOWN email.

---

## Phase 6: Weekly report + draft replies (🟠, in claude.ai, ≈5 min)

Not in Claude Code. Once Phases 3 and 5 work, say in a normal Claude chat:

> "Set up the ForkIt weekly report as a scheduled task every Tuesday morning (Amsterdam time). Read the 'ForkIt Website Data' sheet (tabs Inquiries and Weekly analytics), my Gmail label ForkIt/Bookings and my Google Calendar. Report: visitors and leads vs the previous week, conversion (leads ÷ sessions), which source/campaign brought leads, form starts vs submissions, open inquiries and upcoming booked events, and 2–3 concrete suggestions. Draft (don't send) a Gmail reply for each unanswered inquiry, in my ForkIt tone."

Needed connectors: Gmail, Google Drive, Google Calendar. All three are already connected.

---

## Phase 7: Quality gate on every update (🟡, ≈1 h, optional)

```text
Phase 7 of forkit-website-analytics-plan.md: add a GitHub Actions workflow that runs on every push and pull request to main:
1. Build the site.
2. Check for broken internal links.
3. Run Lighthouse CI on the homepage and booking page (mobile). Fail if accessibility or SEO drops below 90; only warn on performance.
4. Keep it within the free GitHub Actions minutes (no scheduled runs, cache dependencies).
Explain in the README how to read a failed run.
```

---

## Monthly routine (≈1 hour)

1. **Clarity:** watch 5–10 recordings of visitors who didn't book; check the scroll heatmap of the homepage and your top workshop page. Where do they stop?
2. **GA4:** Reports → Acquisition → Traffic acquisition, with `generate_lead` as the metric. Which source brings bookings, not just visits?
3. **Search Console:** queries with many impressions but few clicks → improve that page's title and description.
4. **Sheet:** count of "lost" leads and why (notes column). Price? Date? Slow reply?
5. Take the top 1–2 findings to Claude Code, for example:

```text
Clarity shows most mobile visitors stop scrolling before the booking button on the paella workshop page. Add a booking button above the fold on mobile and shorten the intro. Keep all tracking attributes intact.
```

---

## Troubleshooting

| Problem | Likely cause / fix |
|---|---|
| Form submits but no Sheet row | Web app redeployed to a new URL → use `clasp deploy -i <id>`; check the Log tab |
| "Authorization required" errors | A new feature needs new permissions → open the script, run any function once, approve |
| No data in GA4 | Consent rejected, `?notrack=1` still on, or you're on localhost/preview |
| Clarity shows no heatmaps | Consent not passed to Clarity → check the consent API call after "Accept" |
| Customer says no confirmation arrived | Check their spam folder; Gmail sends max ~100 script emails/day on a free account |
| Timed jobs stopped | Apps Script → Triggers: re-run installTriggers() |
