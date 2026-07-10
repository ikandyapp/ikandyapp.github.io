/* IKANDY consent-first website analytics.
   Google Analytics is loaded only after an affirmative choice on the live
   marketing site. Local files, previews, the arcade, scores, and jukebox do
   not load Google Analytics or display the analytics choice UI. */
(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-FEJJH5VN5S';
  var CONSENT_KEY = 'ikandy_analytics_consent_v1';
  var CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
  var COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;
  var DISABLE_KEY = 'ga-disable-' + MEASUREMENT_ID;
  var path = window.location.pathname || '/';
  var isLiveSite = window.location.protocol === 'https:' &&
    /^(?:www\.)?ikandy\.app$/i.test(window.location.hostname);
  var isExcluded = /^\/arcade(?:\/|$)/i.test(path) ||
    /^\/(?:scores|jukebox)\.html$/i.test(path);
  var analyticsReady = false;
  var googleTagLoaded = false;
  var pageViewSent = false;
  var errorCount = 0;
  var banner = null;

  window.ikandyTrack = function () {};
  if (!isLiveSite || isExcluded) return;

  function safePagePath() {
    return (window.location.pathname || '/').slice(0, 200);
  }

  function safePageLocation() {
    return window.location.origin + safePagePath();
  }

  function safeReferrerOrigin() {
    if (!document.referrer) return '';
    try { return new URL(document.referrer).origin; } catch (e) { return ''; }
  }

  function readConsent() {
    try {
      var saved = JSON.parse(window.localStorage.getItem(CONSENT_KEY) || 'null');
      if (!saved || !/^(granted|denied)$/.test(saved.choice) ||
          typeof saved.savedAt !== 'number' ||
          Date.now() - saved.savedAt > CONSENT_MAX_AGE_MS) {
        window.localStorage.removeItem(CONSENT_KEY);
        return null;
      }
      return saved.choice;
    } catch (e) { return null; }
  }

  function saveConsent(choice) {
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify({
        choice: choice,
        savedAt: Date.now()
      }));
    } catch (e) {}
  }

  function clearAnalyticsCookies() {
    document.cookie.split(';').forEach(function (part) {
      var name = part.split('=')[0].trim();
      if (name.indexOf('_ga') !== 0) return;
      document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax';
      document.cookie = name + '=; Max-Age=0; Path=/; Domain=.ikandy.app; SameSite=Lax';
    });
  }

  function sendEvent(name, params) {
    if (!analyticsReady || typeof window.gtag !== 'function') return;
    var allowed = name === 'page_view' || name === 'wishlist_click' || name === 'site_error';
    if (!allowed) return;
    try { window.gtag('event', name, params || {}); } catch (e) {}
  }

  window.ikandyTrack = sendEvent;

  function sendPageView() {
    if (pageViewSent) return;
    pageViewSent = true;
    sendEvent('page_view', {
      page_path: safePagePath(),
      page_location: safePageLocation(),
      page_referrer: safeReferrerOrigin(),
      page_title: (document.title || 'IKANDY').slice(0, 100)
    });
  }

  function loadGoogleAnalytics() {
    window[DISABLE_KEY] = false;

    if (!googleTagLoaded) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };

      // Basic consent mode: commands are queued locally, and the Google tag
      // itself is not requested until after the visitor grants consent.
      window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
      window.gtag('js', new Date());
      window.gtag('set', 'ads_data_redaction', true);
      window.gtag('config', MEASUREMENT_ID, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_expires: COOKIE_MAX_AGE_SECONDS,
        cookie_flags: 'SameSite=Lax;Secure',
        page_location: safePageLocation(),
        page_referrer: safeReferrerOrigin()
      });

      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' +
        encodeURIComponent(MEASUREMENT_ID);
      script.referrerPolicy = 'strict-origin-when-cross-origin';
      document.head.appendChild(script);
      googleTagLoaded = true;
    } else {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    }

    analyticsReady = true;
    sendPageView();
  }

  function denyAnalytics() {
    saveConsent('denied');
    window[DISABLE_KEY] = true;
    analyticsReady = false;
    clearAnalyticsCookies();
  }

  function grantAnalytics() {
    saveConsent('granted');
    loadGoogleAnalytics();
  }

  function injectStyles() {
    if (document.getElementById('ikandy-analytics-style')) return;
    var style = document.createElement('style');
    style.id = 'ikandy-analytics-style';
    style.textContent =
      '.ikandy-consent{position:fixed;z-index:10000;left:18px;right:18px;bottom:18px;' +
      'max-width:620px;margin:auto;padding:18px;background:#17171b;color:#eae5d9;' +
      'border:1px solid #45454f;border-top:3px solid #ff5a1f;box-shadow:0 12px 40px rgba(0,0,0,.55);' +
      'font:14px/1.55 Archivo,system-ui,sans-serif}' +
      '.ikandy-consent[hidden]{display:none}.ikandy-consent strong{display:block;margin-bottom:5px;' +
      'font:700 15px/1.3 "Martian Mono",Consolas,monospace;letter-spacing:.05em;text-transform:uppercase}' +
      '.ikandy-consent p{margin:0;color:#b5ae9c}.ikandy-consent a{color:#ff7a42}' +
      '.ikandy-consent-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}' +
      '.ikandy-consent button,.ikandy-analytics-settings{border:1px solid #666;background:#232329;color:#eae5d9;' +
      'padding:9px 13px;font:700 10px/1 "Martian Mono",Consolas,monospace;letter-spacing:.08em;' +
      'text-transform:uppercase;cursor:pointer}.ikandy-consent button:hover,.ikandy-analytics-settings:hover{' +
      'border-color:#ff5a1f;color:#ff7a42}' +
      '.ikandy-analytics-settings{padding:0;border:0;background:none;color:inherit;text-align:left}' +
      '.ikandy-analytics-fixed{position:fixed;z-index:9998;left:12px;bottom:12px;padding:7px 9px!important;' +
      'background:#17171b!important;border:1px solid #45454f!important;color:#b5ae9c!important}';
    document.head.appendChild(style);
  }

  function installSettingsControl() {
    var existing = document.getElementById('ikandy-analytics-settings');
    if (existing) {
      if (!existing.getAttribute('data-analytics-bound')) {
        existing.setAttribute('data-analytics-bound', 'true');
        existing.addEventListener('click', showPreferences);
      }
      return;
    }

    var button = document.createElement('button');
    button.type = 'button';
    button.id = 'ikandy-analytics-settings';
    button.className = 'ikandy-analytics-settings';
    button.textContent = 'Analytics choices';
    button.setAttribute('data-analytics-bound', 'true');
    button.addEventListener('click', showPreferences);

    var legalList = null;
    Array.prototype.some.call(document.querySelectorAll('footer h4'), function (heading) {
      if (!/^legal/i.test((heading.textContent || '').trim())) return false;
      legalList = heading.parentElement && heading.parentElement.querySelector('ul');
      return !!legalList;
    });

    if (legalList) {
      var item = document.createElement('li');
      item.appendChild(button);
      legalList.appendChild(item);
    } else {
      button.className += ' ikandy-analytics-fixed';
      document.body.appendChild(button);
    }
  }

  function hidePreferences() {
    if (banner) banner.hidden = true;
  }

  function showPreferences() {
    injectStyles();
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'ikandy-consent';
      banner.setAttribute('role', 'dialog');
      banner.setAttribute('aria-label', 'Analytics choices');
      banner.innerHTML =
        '<strong>Optional website analytics</strong>' +
        '<p>Allow basic Google Analytics so we can count page visits, diagnose website errors, and measure Steam wishlist clicks. We do not send names, emails, usernames, passwords, form entries, music activity, or URL query text. Declining does not limit the site. <a href="/privacy.html#website-analytics">Details</a>.</p>' +
        '<div class="ikandy-consent-actions">' +
          '<button type="button" class="allow" data-choice="granted">Allow analytics</button>' +
          '<button type="button" data-choice="denied">Decline</button>' +
        '</div>';
      banner.addEventListener('click', function (event) {
        var choiceButton = event.target.closest && event.target.closest('[data-choice]');
        if (!choiceButton) return;
        if (choiceButton.getAttribute('data-choice') === 'granted') grantAnalytics();
        else denyAnalytics();
        hidePreferences();
        installSettingsControl();
      });
      document.body.appendChild(banner);
    }
    banner.hidden = false;
    var firstButton = banner.querySelector('button');
    if (firstButton) firstButton.focus();
  }

  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;
    var destination;
    try { destination = new URL(link.href, window.location.href); } catch (e) { return; }
    if (destination.hostname !== 'store.steampowered.com' ||
        !/^\/app\/4813240(?:\/|$)/.test(destination.pathname)) return;

    var placement = link.closest('.rail-cta-group, .rail-mobile-actions') ? 'header' :
      link.closest('.hero-cta') ? 'hero' :
      link.closest('footer') ? 'footer' : 'page';
    sendEvent('wishlist_click', {
      page_path: safePagePath(),
      placement: placement,
      destination: 'steam_store',
      transport_type: 'beacon'
    });
  }, true);

  window.addEventListener('error', function (event) {
    if (!analyticsReady || errorCount >= 5 || !event.filename) return;
    errorCount++;
    var scriptName = event.filename.split('/').pop().split('?')[0].slice(0, 80);
    sendEvent('site_error', {
      page_path: safePagePath(),
      error_type: 'javascript_error',
      script_name: scriptName,
      line_number: Math.max(0, Math.min(Number(event.lineno) || 0, 1000000)),
      column_number: Math.max(0, Math.min(Number(event.colno) || 0, 1000000))
    });
  });

  window.addEventListener('unhandledrejection', function () {
    if (!analyticsReady || errorCount >= 5) return;
    errorCount++;
    sendEvent('site_error', {
      page_path: safePagePath(),
      error_type: 'unhandled_promise_rejection'
    });
  });

  function initializeConsent() {
    injectStyles();
    var choice = readConsent();
    if (choice === 'granted') loadGoogleAnalytics();
    else if (choice === 'denied') {
      window[DISABLE_KEY] = true;
      analyticsReady = false;
      clearAnalyticsCookies();
    }
    else showPreferences();
    if (choice) installSettingsControl();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeConsent, { once: true });
  } else {
    initializeConsent();
  }
})();
