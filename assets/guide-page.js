// Preserve the guide's legacy deep links.
(function () {
  var map = {
    'first-launch': 'getting-started',
    'layout': 'getting-started',
    'sources': 'audio-sources',
    'per-process': 'audio-sources.html#per-process',
    'presets': 'visualizers',
    'scenes': 'scenes',
    'fx': 'fx',
    'lyrics': 'lyrics',
    'controls': 'controls',
    'tips': 'controls',
    'troubleshooting': 'troubleshooting',
    'help': 'troubleshooting',
    'spout': 'spout'
  };
  var hash = (location.hash || '').replace('#', '');
  if (map[hash]) {
    location.replace('guide/' + (map[hash].indexOf('.html') > -1 ? map[hash] : map[hash] + '.html'));
  }
})();

// Filter guide cards using card keywords first and the deep index when available.
(function () {
  var input = document.getElementById('gsearch');
  var grid = document.getElementById('tgrid');
  var noResults = document.getElementById('nores');
  var status = document.getElementById('gstatus');
  var cards = [].slice.call(grid.children);
  var deepIndex = null;

  fetch('assets/guide-index.json')
    .then(function (response) { return response.json(); })
    .then(function (index) { deepIndex = index; })
    .catch(function () {});

  function runSearch() {
    var query = input.value.trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (card) {
      var hit = !query || card.getAttribute('data-k').indexOf(query) > -1;
      if (!hit && deepIndex) {
        var slug = card.getAttribute('href').replace('guide/', '').replace('.html', '');
        var entry = deepIndex.find(function (candidate) { return candidate.slug === slug; });
        if (entry && entry.text.indexOf(query) > -1) hit = true;
      }
      card.classList.toggle('hide', !hit);
      if (hit) shown++;
    });
    noResults.style.display = shown ? 'none' : 'block';
    if (status) status.textContent = shown + ' guide topic' + (shown === 1 ? '' : 's') + ' shown';
  }

  var timer;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(runSearch, 140);
  });
})();
