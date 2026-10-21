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
