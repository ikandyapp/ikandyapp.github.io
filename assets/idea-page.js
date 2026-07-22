/* Interactive story path for idea.html. Content remains in the HTML. */
(function () {
  'use strict';

  var board = document.querySelector('[data-signal-board]');
  if (!board) return;

  var nodes = Array.prototype.slice.call(board.querySelectorAll('.signal-node'));
  var step = board.querySelector('[data-signal-step]');
  var title = board.querySelector('[data-signal-title]');
  var copy = board.querySelector('[data-signal-copy]');
  var meter = board.querySelector('[data-signal-meter]');

  function selectNode(node, focus) {
    var index = nodes.indexOf(node);
    if (index < 0) return;

    nodes.forEach(function (candidate) {
      candidate.setAttribute('aria-pressed', candidate === node ? 'true' : 'false');
    });

    if (step) step.textContent = 'Entry ' + String(index + 1).padStart(2, '0') + ' / ' + String(nodes.length).padStart(2, '0');
    if (title) title.textContent = node.getAttribute('data-title') || '';
    if (copy) copy.textContent = node.getAttribute('data-copy') || '';
    if (meter) meter.style.width = (((index + 1) / nodes.length) * 100) + '%';
    if (focus) node.focus();
  }

  nodes.forEach(function (node) {
    node.addEventListener('click', function () { selectNode(node, false); });
    node.addEventListener('keydown', function (event) {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      var index = nodes.indexOf(node);
      if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = nodes.length - 1;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') index = (index - 1 + nodes.length) % nodes.length;
      else index = (index + 1) % nodes.length;
      selectNode(nodes[index], true);
    });
  });

  selectNode(nodes[0], false);
})();
