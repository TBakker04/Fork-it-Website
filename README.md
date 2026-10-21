# Fork It Leiden — website

Static HTML/CSS/JS, no build step, deployed to GitHub Pages on push (`.github/workflows/deploy.yml`). Custom domain: `forkit.nl`.

See `forkit-website-analytics-plan.md` for the full analytics/automation rollout plan this README supports.

## Booking form backend

The booking form (WhatsApp/email buttons) also posts to a Google Apps Script backend — a Sheet row, an instant owner alert, and a customer confirmation email — once it's deployed. Setup and deploy instructions: `apps-script/README.md`. Until `assets/analytics-config.js`'s `appsScriptUrl` is set, this is a silent no-op and the WhatsApp/email buttons work exactly as before.

## Analytics & tracking

All IDs (GA4 measurement ID, Clarity project ID, production hostnames) live in one place: `assets/analytics-config.js`. Nothing else should hard-code them.

`assets/analytics-consent.js` handles the cookie banner and only loads GA4/Clarity after the visitor accepts the "analytics" category. `assets/analytics-events.js` is the only place `gtag('event', ...)` gets called — everything else goes through its `track()` helper or `data-track` attributes.

### How to tag a new button

Add `data-track="<event name>"` to any clickable element, plus whichever of these apply:

```html
<a href="#book" data-track="book_click" data-location="hero">Book Now</a>
<a href="https://wa.me/..." data-track="contact_click" data-method="whatsapp">WhatsApp</a>
```

- `data-location` — where on the site the button lives (`nav`, `hero`, `workshop_page`, `menu_page`, `menu_flipbook`, `footer`, …)
- `data-workshop` — which event type, using the same slugs as the URL router: `date-dinner`, `private-dinner`, `paella-workshop`, `borrel-catering`
- `data-method` — for `contact_click` only: `whatsapp`, `instagram`, `email`

One delegated click listener in `analytics-events.js` picks these up automatically — no JS changes needed for a new button. The event only actually sends if the visitor has accepted analytics cookies.

### How to make a tracked link

For links you hand out elsewhere (Instagram bio, a story, a flyer QR code, Google Business Profile), use the UTM generator so traffic shows up correctly in GA4's acquisition reports:

```
node scripts/utm.js <source> <medium> <campaign>
node scripts/utm.js instagram story paella-nov
→ https://forkit.nl/?utm_source=instagram&utm_medium=story&utm_campaign=paella-nov
```

Convention:
- `source`: `instagram`, `whatsapp`, `google_business`, `flyer`, `email`
- `medium`: `bio`, `story`, `post`, `reel`, `dm`, `qr`
- `campaign`: a short slug, e.g. `paella-nov`, or `always-on` for a permanent link (bio link)

### Current event set (Phase 2)

| Event | Fires when |
|---|---|
| `book_click` | Any Book/Reserve/Get a Quote button is clicked |
| `form_start` | First focus inside the booking form, once per page view |
| `contact_click` | WhatsApp, Instagram, or email link clicked |
| `workshop_view` | A Date Dinner / Private Dinner / Paella Workshop / Borrel Catering page is opened |
| `generate_lead` | Fires once the Apps Script backend confirms a booking was actually saved (not just that a WhatsApp/email tab opened). Only active once `appsScriptUrl` is set — see "Booking form backend" above. |

### Checking it works (GA4 DebugView)

1. On the live site (not localhost — analytics is a no-op there), install the [GA Debugger extension](https://chromewebstore.google.com/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna) or add `?forcecc=1` locally and accept the cookie banner.
2. In GA4, go to **Admin → DebugView**.
3. Click around the site — `book_click`, `contact_click`, `workshop_view`, `form_start` should appear in the DebugView stream within a few seconds, each with its parameters.
4. Once you've confirmed `generate_lead` is live (Phase 3), mark it as a **key event**: **Admin → Events → find `generate_lead` → toggle "Mark as key event"**. This is what makes it show up in GA4's conversion reports.
