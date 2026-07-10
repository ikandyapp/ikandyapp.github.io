/* Shared navigation and accessibility behavior for the IKANDY marketing site. */
(function () {
  'use strict';

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
    betaNote.textContent = 'Beta now closed';
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
