/* Shared navigation and accessibility behavior for the IKANDY marketing site. */
(function () {
  'use strict';

  /* Release flip. 10:00 Pacific, not midnight, because that is when Steam actually
     turns a release over — and because the two possible errors here are NOT equal.
     Flipping LATE is harmless: the page keeps saying "Out July 31, 2026", which is
     true. Flipping EARLY says "Available now on Steam" and links to a store page
     that cannot be bought from yet, on the highest-traffic morning of the year.
     Midnight was the early/dangerous side of that trade for up to ten hours.
     If Steam is configured to release at a different hour, match it here — the
     partner site is authoritative, this constant is the copy. */
  var releaseAt = Date.parse('2026-07-31T10:00:00-07:00');
  var isReleased = Date.now() >= releaseAt;

  if (isReleased) {
    Array.prototype.forEach.call(document.querySelectorAll('a.btn-steam[href*="/app/4813240/"]'), function (link) {
      if (link.classList.contains('rail-cta')) {
        link.textContent = 'Get IKANDY on Steam · Available now';
      } else {
        link.textContent = 'Get IKANDY on Steam';
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll('.rail-beta-note'), function (note) {
      note.textContent = 'Available now';
    });
    Array.prototype.forEach.call(document.querySelectorAll('.hero-date, .cta-date'), function (date) {
      date.innerHTML = 'Available <b>now on Steam</b>';
    });
    Array.prototype.forEach.call(document.querySelectorAll('.ftr-plate .amber'), function (plate) {
      plate.textContent = 'AVAILABLE NOW ON STEAM';
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-post-release-text]'), function (el) {
      el.textContent = el.getAttribute('data-post-release-text');
    });
  }

  /* Steam launch offer ends 14 days after release: swap to regular prices and
     hide the launch-offer copy. JSON-LD offers self-expire via priceValidUntil;
     static meta descriptions still need a manual pass on this date (see the
     LAUNCH TODO block at the top of pricing/index.html).

     The window is Jul 31 through Aug 13 inclusive, which is exactly 14 days, so
     midnight on the 14th is the correct arithmetic. Midnight is also deliberately
     the SAFE side here, and for the opposite reason to the release flip above:
     showing the regular price a few hours early only ever undersells us, whereas
     advertising $4.95 after Steam has stopped honouring it is advertising a price
     we do not charge. Do not "align" this to 10:00 to match the release flip —
     the asymmetry is the point. */
  var offerEndsAt = Date.parse('2026-08-14T00:00:00-07:00');
  if (Date.now() >= offerEndsAt) {
    Array.prototype.forEach.call(document.querySelectorAll('.tier-price[data-regular]'), function (price) {
      price.textContent = price.getAttribute('data-regular');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.tier-launch, .tier-flag'), function (el) {
      el.style.display = 'none';
    });
  }

  var nav = document.querySelector('nav.rail');
  if (!nav) return;

  var main = document.querySelector('main');
  if (main && !main.id) main.id = 'main-content';

  if (main && !document.querySelector('.skip-link')) {
    var skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#main-content';
    skip.textContent = 'Skip to content';
    nav.parentNode.insertBefore(skip, nav);
  }

  var toggle = nav.querySelector('.rail-toggle');
  var links = nav.querySelector('.rail-links');
  if (!toggle || !links) return;

  /* The rail is duplicated in static HTML for resilient first paint, but this
     shared contract is authoritative. It keeps root and nested pages aligned
     even if an older page's fallback markup has not been refreshed. */
  var shellScript = document.currentScript;
  if (!shellScript || !shellScript.src) {
    shellScript = document.querySelector('script[src$="assets/site-shell.js"]');
  }
  var siteRoot = shellScript && shellScript.src
    ? new URL('../', shellScript.src)
    : new URL('./', window.location.href);
  var pagePath = (window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
  var onPricing = pagePath.indexOf('/pricing/') !== -1;
  var onHome = !onPricing && (pagePath.slice(-11) === '/index.html' || pagePath.slice(-1) === '/');
  var railItems = [
    { label: 'Why IKANDY', href: 'idea.html', current: pagePath.slice(-10) === '/idea.html' },
    { label: 'The app', href: 'index.html#product', current: onHome },
    { label: 'Pricing', href: 'pricing/index.html', current: onPricing },
    { label: 'Artists', href: 'artists.html', current: pagePath.slice(-13) === '/artists.html' }
  ];

  while (links.firstChild) links.removeChild(links.firstChild);
  railItems.forEach(function (item) {
    var link = document.createElement('a');
    link.href = new URL(item.href, siteRoot).href;
    link.textContent = item.label;
    if (item.current) {
      link.className = 'active';
      link.setAttribute('aria-current', 'page');
    }
    links.appendChild(link);
  });

  var logo = nav.querySelector('.rail-logo');
  if (logo) logo.href = new URL('index.html', siteRoot).href;

  Array.prototype.forEach.call(nav.querySelectorAll('.rail-beta-note'), function (note) {
    note.parentNode.removeChild(note);
  });

  if (!links.id) links.id = 'rail-menu';
  toggle.setAttribute('aria-controls', links.id);
  toggle.setAttribute('aria-expanded', 'false');

  Array.prototype.forEach.call(links.querySelectorAll('a.active'), function (link) {
    link.setAttribute('aria-current', 'page');
  });

  var desktopCta = nav.querySelector('.rail-cta-group .rail-cta');
  if (desktopCta) desktopCta.textContent = isReleased ? 'Get IKANDY on Steam' : 'Wishlist on Steam';
  if (desktopCta && !links.querySelector('.rail-mobile-actions')) {
    var mobileActions = document.createElement('div');
    mobileActions.className = 'rail-mobile-actions';

    var mobileCta = desktopCta.cloneNode(true);
    mobileCta.classList.remove('rail-cta');
    mobileCta.classList.add('rail-mobile-cta');
    mobileActions.appendChild(mobileCta);

    links.appendChild(mobileActions);
  }

  function setOpen(open, returnFocus) {
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (returnFocus) toggle.focus();
  }

  toggle.addEventListener('click', function () {
    setOpen(!links.classList.contains('open'), false);
  });

  links.addEventListener('click', function (event) {
    if (event.target.closest && event.target.closest('a')) setOpen(false, false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && links.classList.contains('open')) setOpen(false, true);
  });

  document.addEventListener('click', function (event) {
    if (links.classList.contains('open') && !nav.contains(event.target)) setOpen(false, false);
  });

  if (window.matchMedia) {
    var desktop = window.matchMedia('(min-width: 861px)');
    var closeForDesktop = function (event) { if (event.matches) setOpen(false, false); };
    if (desktop.addEventListener) desktop.addEventListener('change', closeForDesktop);
    else if (desktop.addListener) desktop.addListener(closeForDesktop);
  }
})();
