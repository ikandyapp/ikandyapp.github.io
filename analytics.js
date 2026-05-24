/* IKANDY website analytics — GA4 event helpers.
   The official gtag.js loader + config lives inline in each page's <head>;
   this file adds the fire-and-forget helper and a single delegated click
   listener so individual buttons/links don't need per-element handlers.

   Privacy: no PII ever leaves here. download_click derives its platform
   from the link URL (not the user); cta_click sends only the button's
   visible text, whitespace-collapsed and capped at 50 chars. */
(function () {
  'use strict';

  function track(event, params) {
    if (typeof window.gtag === 'undefined') return;
    try { window.gtag('event', event, params || {}); } catch (e) {}
  }
  window.ikandyTrack = track;

  // One capture-phase listener for the whole page. Closest a/button so clicks
  // on inner spans/icons still resolve to the actionable element.
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('a, button') : null;
    if (!t) return;

    var href = t.getAttribute('href') || '';

    // download_click — any installer link. Platform comes from the file
    // extension / release path, so it's accurate even on the in-page CTA.
    if (/\.exe(\?|#|$)|\.dmg(\?|#|$)|releases\/latest\/download/i.test(href)) {
      var platform = /\.dmg/i.test(href) ? 'mac'
                   : /\.exe/i.test(href) ? 'win'
                   : 'unknown';
      track('download_click', { platform: platform });
      return; // a download link is not also a generic CTA
    }

    // cta_click — primary call-to-action buttons (the site's .btn-primary).
    if (t.classList && t.classList.contains('btn-primary')) {
      var label = (t.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50);
      track('cta_click', { label: label });
    }
  }, true);
})();
