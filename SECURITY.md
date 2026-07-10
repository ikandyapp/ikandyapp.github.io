# Website Security Controls

Reviewed: 2026-07-10

## Implemented in the static site

- A Content Security Policy is delivered as the first `<meta http-equiv="Content-Security-Policy">` element on all 41 HTML pages, including every arcade game.
- Marketing, guide, legal, and utility pages prohibit executable inline JavaScript and HTML event-handler attributes. Page behavior is loaded from same-origin JavaScript files.
- The self-contained arcade games retain their inline game engines, but each permitted script is locked to an exact CSP SHA-256 hash. HTML event-handler attributes are prohibited.
- Scripts are limited to the same origin plus the consent-loaded Google tag.
- Frames are limited to the privacy-enhanced YouTube player loaded only after a visitor clicks Play.
- Object embeds are disabled; base URLs and form submissions are restricted to the same origin.
- Images, fonts, media, workers, and network connections are restricted to the sources required by the site.
- A strict-origin referrer policy, responsible-disclosure page, and `/.well-known/security.txt` are present.

## Arcade compatibility exception

`arcade/index.html` permits `unsafe-eval` in its page-specific CSP because the locally shipped legacy Webamp bundle uses a Function-constructor compatibility shim. The exception is isolated to that one page; the Webamp bundle is same-origin and is loaded only after a visitor opens IKAMP. Other arcade pages do not permit `unsafe-eval`.

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
