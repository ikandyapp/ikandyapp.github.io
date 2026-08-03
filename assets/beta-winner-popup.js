// Beta contest winner call-out popup.
// Shows once per browser (dismiss is remembered in localStorage) and asks the
// winners to claim their prize by email with proof of identity.
// CSP note: this site allows no inline <script>, so all logic lives here; the
// markup and styles are injected from this file.
(function () {
  var KEY = 'ikandy_beta_winner_popup_dismissed_v1';
  try { if (localStorage.getItem(KEY) === '1') return; } catch (e) { /* still show */ }

  var WINNERS = [
    ['Powder', 'Velvet-Curtain-Caped River Calloway'],
    ['Snake', 'Walmart-Werewolf Dwayne Throckmorton'],
    ['Volley', 'The Junior-Pirate-Associate'],
    ['Bricked', 'The Wattpad-Necromancer'],
    ['Pinball', 'Buried-Treasure-And-Forgot Phoenix Bumgarner'],
    ['Partition', 'The Plague-Carrier'],
    ['Spread the Word', 'Mildly-Cursed Earl, Quartermaster of the Limp Sail']
  ];

  // Styled with the site shell ("THE RIG") tokens from assets/ik.css.
  var css = [
    '#bw-pop-overlay{position:fixed;inset:0;background:rgba(6,6,8,.78);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px}',
    '#bw-pop{max-width:560px;width:100%;max-height:86vh;overflow:auto;background:var(--panel,#17171b);border:1px solid var(--rule,#282830);border-radius:var(--radius,3px);color:var(--ink,#eae5d9);font-family:var(--body,Archivo,sans-serif);padding:26px 26px 22px;position:relative;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 18px 60px rgba(0,0,0,.65)}',
    '#bw-pop .bw-tag{font-family:var(--mono,monospace);color:var(--vu-amber,#ff5a1f);font-size:11px;letter-spacing:.16em;text-transform:uppercase}',
    '#bw-pop h2{font-family:var(--display,Impact,sans-serif);font-size:42px;letter-spacing:.02em;line-height:.95;margin:10px 0 12px;text-transform:uppercase}',
    '#bw-pop p{line-height:1.6;color:var(--ink-2,#b5ae9c);font-size:14px;margin:10px 0}',
    '#bw-pop p strong{color:var(--ink,#eae5d9)}',
    '#bw-pop .bw-list{background:var(--well,#060608);border:1px solid var(--rule-soft,#1f1f26);border-radius:var(--radius,3px);padding:6px 14px;margin:12px 0}',
    '#bw-pop .bw-row{display:flex;justify-content:space-between;gap:14px;padding:8px 0;border-bottom:1px solid var(--rule-soft,#1f1f26);font-size:13px}',
    '#bw-pop .bw-row:last-child{border-bottom:0}',
    '#bw-pop .bw-game{font-family:var(--mono,monospace);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--vu-green,#46d96b);white-space:nowrap;padding-top:2px}',
    '#bw-pop .bw-name{color:var(--ink,#eae5d9);text-align:right}',
    '#bw-pop ol{color:var(--ink-2,#b5ae9c);font-size:13px;line-height:1.7;padding-left:20px;margin:8px 0}',
    '#bw-pop a.bw-mail{display:inline-block;margin-top:8px;font-family:var(--mono,monospace);font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:#0e0e11;background:var(--vu-amber,#ff5a1f);border:1px solid #c23f10;border-radius:var(--radius,3px);text-decoration:none;padding:10px 16px;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 1px 0 rgba(0,0,0,.5)}',
    '#bw-pop a.bw-mail:hover{background:#ff7a42;text-decoration:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 0 22px rgba(255,90,31,.45)}',
    '#bw-close{position:absolute;top:10px;right:12px;background:none;border:0;color:var(--ink-3,#8a8371);font-size:20px;cursor:pointer;font-family:inherit;line-height:1}',
    '#bw-close:hover{color:var(--ink,#eae5d9)}',
    '#bw-later{display:block;background:none;border:0;color:var(--ink-3,#8a8371);text-decoration:underline;cursor:pointer;font-family:var(--mono,monospace);font-size:11px;letter-spacing:.08em;margin-top:14px;padding:0}',
    '#bw-later:hover{color:var(--ink-2,#b5ae9c)}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;

  var overlay = document.createElement('div');
  overlay.id = 'bw-pop-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'bw-title');

  var rows = WINNERS.map(function (w) {
    return '<div class="bw-row"><span class="bw-game"></span><span class="bw-name"></span></div>';
  }).join('');

  overlay.innerHTML =
    '<div id="bw-pop">' +
      '<button id="bw-close" aria-label="Close">&times;</button>' +
      '<div class="bw-tag">IKANDY Beta Contest &middot; Results</div>' +
      '<h2 id="bw-title">We have winners!</h2>' +
      '<p>The beta contest is over, and these champions took the crown:</p>' +
      '<div class="bw-list">' + rows + '</div>' +
      '<p><strong>Are you on this list?</strong> Claim your prize by emailing us. Include:</p>' +
      '<ol>' +
        '<li>Your Author ID (your full handle, including the #NNNNN suffix)</li>' +
        '<li>A screenshot of our message to you (the in-app IKQ congratulations note)</li>' +
      '</ol>' +
      '<a class="bw-mail" href="mailto:support@ikandy.app?subject=Beta%20Contest%20Winner%20Claim">Email support@ikandy.app</a><br>' +
      '<button id="bw-later">Dismiss (do not show again)</button>' +
    '</div>';

  // Fill winner names via textContent so no handle text is ever parsed as HTML.
  var rowEls = overlay.querySelectorAll('.bw-row');
  WINNERS.forEach(function (w, i) {
    rowEls[i].querySelector('.bw-game').textContent = w[0];
    rowEls[i].querySelector('.bw-name').textContent = w[1];
  });

  function dismiss() {
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    overlay.remove();
  }

  function mount() {
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    overlay.querySelector('#bw-close').addEventListener('click', dismiss);
    overlay.querySelector('#bw-later').addEventListener('click', dismiss);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) dismiss(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { dismiss(); document.removeEventListener('keydown', esc); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
