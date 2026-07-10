// Block Escape and F4 from dismissing the required first-launch agreement.
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' || event.key === 'F4') {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

var scrollEl = document.getElementById('eula-scroll');
var eulaText = document.getElementById('eula-text');
var scrollHint = document.getElementById('scroll-hint');
var rowRead = document.getElementById('row-read');
var rowPrivacy = document.getElementById('row-privacy');
var chkRead = document.getElementById('chk-read');
var chkPrivacy = document.getElementById('chk-privacy');
var btnAccept = document.getElementById('btn-accept');
var btnDecline = document.getElementById('btn-decline');
var statusLine = document.getElementById('status-line');
var scrolledToBottom = false;
var busy = false;

function updateAcceptState() {
  btnAccept.disabled = !(scrolledToBottom && chkRead.checked && chkPrivacy.checked);
}

function onScrolled() {
  var remaining = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;
  if (!scrolledToBottom && remaining < 48) {
    scrolledToBottom = true;
    scrollHint.classList.add('hidden');
    rowRead.classList.add('enabled');
    rowPrivacy.classList.add('enabled');
    chkRead.disabled = false;
    chkPrivacy.disabled = false;
  }
  updateAcceptState();
}

scrollEl.addEventListener('scroll', onScrolled);
chkRead.addEventListener('change', updateAcceptState);
chkPrivacy.addEventListener('change', updateAcceptState);

rowRead.addEventListener('click', function (event) {
  if (!chkRead.disabled && event.target !== chkRead) chkRead.click();
});
rowPrivacy.addEventListener('click', function (event) {
  if (event.target.closest && event.target.closest('a')) return;
  if (!chkPrivacy.disabled && event.target !== chkPrivacy) chkPrivacy.click();
});

btnAccept.addEventListener('click', async function () {
  if (busy || btnAccept.disabled) return;
  busy = true;
  btnAccept.disabled = true;
  btnDecline.disabled = true;
  statusLine.textContent = 'Recording acceptance…';
  statusLine.classList.remove('error');
  try {
    await window.EULA.accept();
    statusLine.textContent = '✓ Accepted. Starting IKANDY…';
  } catch (error) {
    statusLine.textContent = 'Error recording acceptance. Please try again.';
    statusLine.classList.add('error');
    busy = false;
    btnAccept.disabled = false;
    btnDecline.disabled = false;
  }
});

btnDecline.addEventListener('click', async function () {
  if (busy) return;
  if (!confirm('Decline the License Agreement and quit IKANDY?')) return;
  busy = true;
  btnAccept.disabled = true;
  btnDecline.disabled = true;
  statusLine.textContent = 'Closing…';
  try { await window.EULA.decline(); } catch (error) {}
});

(async function () {
  try {
    var agreement = await window.EULA.getEulaText();
    eulaText.textContent = agreement.text;
    setTimeout(function () {
      var remaining = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;
      if (remaining < 8) onScrolled();
    }, 100);
  } catch (error) {
    eulaText.textContent = 'This page is shown inside the IKANDY application on first launch.\n\nTo read the full IKANDY License Agreement online, visit:\nhttps://ikandy.app/license.html';
    statusLine.textContent = 'Error loading agreement text.';
    statusLine.classList.add('error');
  }
})();
