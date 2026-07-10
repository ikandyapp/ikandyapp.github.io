# Website Security Controls

Reviewed: 2026-07-10

## Implemented in the static site

- A Content Security Policy is delivered as the first `<meta http-equiv="Content-Security-Policy">` element on each marketing, guide, legal, and utility page.
- Executable inline JavaScript and HTML event-handler attributes are prohibited. Page behavior is loaded from same-origin JavaScript files.
- Scripts are limited to the same origin plus the consent-loaded Google tag.
- Frames are limited to the privacy-enhanced YouTube player loaded only after a visitor clicks Play.
- Object embeds are disabled; base URLs and form submissions are restricted to the same origin.
- Images, fonts, media, workers, and network connections are restricted to the sources required by the site.
- A strict-origin referrer policy, responsible-disclosure page, and `/.well-known/security.txt` are present.

## GitHub Pages limitation

GitHub Pages does not provide repository-level control over arbitrary HTTP response headers. A meta-delivered CSP protects resource loading and blocks inline executable scripts, but it cannot enforce `frame-ancestors`, and it cannot set response-only headers such as `X-Content-Type-Options` or `Permissions-Policy`.

If the site later moves behind a configurable CDN or reverse proxy, mirror the current CSP as an HTTP response header and add:

```text
Content-Security-Policy: <current policy>; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
Referrer-Policy: strict-origin-when-cross-origin
```

Test any header migration against the consent flow, Steam click tracking, hero renderer, guide search, and click-to-load YouTube player before enabling it globally.
