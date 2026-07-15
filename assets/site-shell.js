/* Shared navigation and accessibility behavior for the IKANDY marketing site. */
(function () {
  'use strict';

  var releaseAt = Date.parse('2026-07-31T00:00:00-07:00');
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
     static meta descriptions still need a manual pass on this date. */
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

  if (!links.id) links.id = 'rail-menu';
  toggle.setAttribute('aria-controls', links.id);
  toggle.setAttribute('aria-expanded', 'false');

  Array.prototype.forEach.call(links.querySelectorAll('a.active'), function (link) {
    link.setAttribute('aria-current', 'page');
  });

  var desktopCta = nav.querySelector('.rail-cta-group .rail-cta');
  if (desktopCta && !links.querySelector('.rail-mobile-actions')) {
    var mobileActions = document.createElement('div');
    mobileActions.className = 'rail-mobile-actions';

    var mobileCta = desktopCta.cloneNode(true);
    mobileCta.classList.remove('rail-cta');
    mobileCta.classList.add('rail-mobile-cta');
    mobileActions.appendChild(mobileCta);

    var betaNote = document.createElement('span');
    betaNote.className = 'rail-beta-note';
    betaNote.textContent = isReleased ? 'Available now' : 'Beta now closed';
    mobileActions.appendChild(betaNote);
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
