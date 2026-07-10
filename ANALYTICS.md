# IKANDY Website Analytics

The live marketing site uses GA4 measurement ID `G-FEJJH5VN5S` through
`analytics.js`. The tag is not loaded until a visitor selects **Allow
analytics**. Local files, previews, the arcade, browser games, scores, and the
jukebox are excluded.

## Required GA4 settings before deployment

These dashboard settings cannot be enforced by the website code. Keep them in
sync with `privacy.html`:

1. In **Admin → Data streams → IKANDY web stream → Enhanced measurement**, turn
   off Enhanced Measurement. IKANDY sends its own limited `page_view`,
   `wishlist_click`, and `site_error` events.
2. In **Admin → Data retention**, select the shortest available event-data
   retention period (currently 2 months for a standard GA4 property).
3. Do not enable Google Signals, advertising personalization, User-ID, or
   collection of granular location/device data. Do not link the property to an
   advertising account unless the Privacy Policy and consent implementation are
   reviewed again first.
4. In **Admin → Account details**, review and accept Google's current Data
   Processing Terms and keep the legal-entity and privacy contact information
   accurate.
5. Never create event parameters, user properties, custom dimensions, or URL
   rules that collect names, usernames, email addresses, passwords, account
   identifiers, form values, music activity, prompts, bug-report text, or other
   user-created content.

## Verification after deployment

Use a fresh private browser window with no stored choice:

- Before choosing, confirm that no request is made to `googletagmanager.com` or
  `google-analytics.com`.
- Choose **Decline** and confirm the site remains functional and no Google
  Analytics request appears.
- In a second fresh window, choose **Allow analytics** and confirm `page_view`
  appears in GA4 Realtime.
- Click each Steam CTA placement and confirm `wishlist_click` appears with only
  `page_path`, `placement`, and `destination` parameters.
- Open **Analytics choices**, switch to **Decline**, and confirm future events
  stop and the site's `_ga` cookies are removed.

The Website Privacy Policy is the public description of this implementation.
If collection behavior changes, update the code and policy together before
deployment.
