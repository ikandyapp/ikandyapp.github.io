/* Client-side unlock for a passphrase-protected page (see scripts/build-protected-page.mjs).
   PBKDF2-SHA256 derives an AES-256-GCM key from the passphrase; the payload in
   #pk-payload is decrypted in the browser and rendered into #pk-content. The
   passphrase itself is never stored. A successfully derived key is kept in
   sessionStorage so a reload in the same tab does not re-prompt; closing the tab
   forgets it. Nothing here talks to the network (the page CSP has connect-src 'none'). */
(function () {
  'use strict';
  var form = document.getElementById('pk-gate');
  var input = document.getElementById('pk-pass');
  var button = document.getElementById('pk-open');
  var status = document.getElementById('pk-status');
  var content = document.getElementById('pk-content');
  var payloadEl = document.getElementById('pk-payload');
  if (!form || !input || !status || !content || !payloadEl) return;

  var payload;
  try { payload = JSON.parse(payloadEl.textContent); } catch (e) { payload = null; }
  var SESSION_KEY = 'ikandy-protected-page:' + location.pathname;

  function say(msg, isErr) {
    status.textContent = msg;
    status.className = 'pk-status' + (isErr ? ' err' : '');
  }
  function b64ToBytes(b64) {
    var bin = atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function bytesToB64(u8) {
    var s = '';
    for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
  }

  if (!payload || !window.crypto || !window.crypto.subtle) {
    say('This browser cannot open the page (no Web Crypto). Try a current Chrome, Edge, Firefox or Safari.', true);
    if (button) button.disabled = true;
    return;
  }

  var subtle = window.crypto.subtle;
  var salt = b64ToBytes(payload.salt), iv = b64ToBytes(payload.iv), ct = b64ToBytes(payload.ct);

  function deriveKey(passphrase) {
    return subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: payload.iterations }, base,
          { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
      });
  }
  function decryptWith(key) {
    return subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct).then(function (buf) {
      return new TextDecoder().decode(buf);
    });
  }
  function reveal(html, key) {
    content.innerHTML = html;
    content.hidden = false;
    form.hidden = true;
    if (key) {
      subtle.exportKey('raw', key).then(function (raw) {
        try { sessionStorage.setItem(SESSION_KEY, bytesToB64(new Uint8Array(raw))); } catch (e) {}
      }).catch(function () {});
    }
    if (location.hash) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    }
  }

  /* Admin-portal convenience: a link of the form <page>#unlock=<passphrase> opens
     the page without the prompt. The fragment never reaches the server, and it is
     stripped from the address bar immediately; it does remain in the browser
     history of the machine that clicked it, which is why only the admin portal
     generates such links. */
  var hashMatch = /(?:^|[#&])unlock=([^&]*)/.exec(location.hash || '');
  if (hashMatch) {
    var fromHash = '';
    try { fromHash = decodeURIComponent(hashMatch[1]); } catch (e) { fromHash = ''; }
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    if (fromHash) {
      if (button) button.disabled = true;
      say('Opening from the admin link.');
      var hashKey;
      deriveKey(fromHash)
        .then(function (k) { hashKey = k; return decryptWith(k); })
        .then(function (html) { reveal(html, hashKey); })
        .catch(function () { say('The link\'s passphrase did not open the page. Enter it below.', true); })
        .then(function () { if (button) button.disabled = false; });
      return;
    }
  }

  /* Same-tab reload: reuse the derived key without re-prompting. */
  try {
    var cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) {
      subtle.importKey('raw', b64ToBytes(cached), { name: 'AES-GCM' }, false, ['decrypt'])
        .then(decryptWith)
        .then(function (html) { reveal(html, null); })
        .catch(function () { try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {} });
    }
  } catch (e) {}

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var pass = input.value;
    if (!pass) { say('Enter the passphrase to open the page.', true); input.focus(); return; }
    button.disabled = true;
    say('Opening. This takes a second or two on purpose.');
    var key;
    deriveKey(pass)
      .then(function (k) { key = k; return decryptWith(k); })
      .then(function (html) { reveal(html, key); })
      .catch(function () {
        say('That passphrase did not open the page. Check it and try again.', true);
        input.select();
      })
      .then(function () { button.disabled = false; });
  });
})();
