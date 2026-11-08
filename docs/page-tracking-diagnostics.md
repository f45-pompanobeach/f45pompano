# Leads/Trials tracking diagnostics (F45 Pompano Beach)

## Purpose

Identify where a landing-page visit *might* have originated, separate known automated request signals from ordinary traffic, and understand visitor journeys. Diagnostics belong in **Page Tracking → View Activity**, not in the main visit table or notification emails.

## Data sources

- **Cloudflare HTML GET audit**: the existing page middleware records a successful landing HTML request (not a lead or an email) and places an ephemeral request ID in the HTML. The browser submits the ID with its first visit POST; the activity detail looks up the matching server audit row. A missing match is *inconclusive* (e.g. old visits, uncached scripts, blocked JS, or unavailable storage).
- **Cloudflare visit POST**: server-provided ASN/network organization/country, optional bot-management score or verified bot, and a short-lived HMAC token derived from IP with a secret. Raw IP and full User-Agent are never persisted in page-tracking tables.
- **Browser visit POST**: random first-party sessionStorage session and localStorage browser identifier, page path, navigation type (navigate/reload/back_forward), device screen bucket, UTM fields, allowlisted query *keys*, click ID *types*, and first-touch source/medium/campaign.
- **Browser activity POST**: form field changes, checkbox changes, unlock, actual Mindbody link click, scroll milestones, video play/pause/completion, approximate visible seconds, and generic script-error markers. No recorded video, cursor movements, passwords, card data, or full error messages.

## Interpret carefully

- **Direct / Unknown** = no UTM and no available referrer. Not proof of a direct type-in, a QR scan, a person, or a bot.
- A known QR UTM is *attribution*, not independently verified evidence of a physical QR scan. A validated QRsenal redirect match would require a separate integration.
- **Navigation: navigate** includes typed URLs, bookmarks, and ordinary links; it does not tell these apart.
- **HTML request matched** proves the server delivered a qualifying landing-page document to a requesting client, but not that a human read it.
- **No interaction** is not evidence of automation.
- **Network burst** flags at least four recent diagnostic records using the same short-lived network token within 60 seconds. NAT/shared carrier networks can produce false positives. It does not suppress visit records or emails.
- Cloudflare Bot Management signals are optional; an unavailable score is not a score of zero.
- An independent browser identifier identifies one browser storage context, *not* a person.
- Mindbody link clicked does not imply a completed purchase or reservation.

## Retention and privacy

- Raw IP addresses and complete browser User-Agent strings are **not stored** in these tracking tables.
- HMAC network correlation tokens are cleared after **7 days** (when diagnostics/audits run). The token uses PAGE_TRACKING_HASH_KEY if configured, otherwise EMAIL_GATEWAY_APP_KEY; no new secret is created automatically.
- HTML request audit entries are deleted after **30 days** (opportunistically, when auditing runs). Contact values typed into incomplete lead forms are already limited to **30 days** under the existing policy.
- **View Activity** is authorization-protected. Saved contact values and full network correlation tokens are Super-Admin-only. The **Copy troubleshooting report** button excludes saved field values, raw identifiers and network hashes.

## Troubleshooting a mystery root visit

1. In Page Tracking, filter to **root** and the target date. Open the exact record with milliseconds.
2. Expand **Traffic diagnostics** and **Actual HTML page request**. Check for browser/OS, navigation type, first-touch attribution, query keys, network operator, bot signal, and a matching server request.
3. Read the timeline and **Other visits from this browser**. Check durations, scroll/video activity, and meaningful form/checkout events.
4. Use **Copy troubleshooting report** and provide the text for interpretation; it omits entered lead contact details.
5. Check QRsenal's own redirect log separately. Absent QR attribution and a missing QR scan email alone cannot establish how a public root URL was opened.

## Email contract (unchanged)

- One new-visit email per *new page/browser session*; no email for page reload, reopen, checkbox-only changes, scroll/video/visible-time/error events, or server request audits.
- At most one consolidated **New Activity** email per page/browser session, sent on a meaningful button/form action or when leaving after edited contact fields. Later activity is logged on the existing visit without further email.
- Known automated browser signatures are excluded from new-visit notifications; other suspicious traffic is **flagged for review**, not automatically deleted or silently throttled.

## Limits

This is not forensic proof of user identity, true geographic location, or physical QR scanning. Server metadata may be absent in local tests or on Cloudflare plans without bot scores. The system does not verify purchases inside Mindbody.
