// Click-to-load YouTube: no third-party request is made until the visitor asks.
document.getElementById('vid-load').addEventListener('click', function () {
  var box = document.getElementById('vid');
  var frame = document.createElement('iframe');
  frame.src = 'https://www.youtube-nocookie.com/embed/GmMpX47Zdgs?autoplay=1&rel=0';
  frame.title = 'IKANDY teaser video';
  frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
  frame.allowFullscreen = true;
  box.innerHTML = '';
  box.appendChild(frame);
  if (window.ikandyTrack) window.ikandyTrack('video_play', { video: 'demo' });
});

// The brand sting is intentionally opt-in: the slogan stays visible, but the
// attached theme never surprises a visitor with autoplay audio.
(function () {
  var button = document.getElementById('theme-song-button');
  var audio = document.getElementById('theme-song');
  var status = document.getElementById('theme-song-status');
  if (!button || !audio || !status) return;

  function setPlaying(playing) {
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', (playing ? 'Pause' : 'Play') + ' the IKANDY theme song');
    status.textContent = playing ? 'Reacting live' : 'Paused';
  }

  button.addEventListener('click', function () {
    if (!audio.paused) {
      audio.pause();
      return;
    }

    audio.muted = false;
    audio.volume = 1;
    var playback = audio.play();
    if (window.IKANDY_HERO_CONNECT_THEME) window.IKANDY_HERO_CONNECT_THEME(audio);
    playback.then(function () {
      if (window.ikandyTrack) window.ikandyTrack('theme_song_play');
    }).catch(function (error) {
      console.warn('[IKANDY theme] playback failed:', error && error.name ? error.name : error);
      status.textContent = 'Sound unavailable';
    });
  });

  audio.addEventListener('play', function () { setPlaying(true); });
  audio.addEventListener('pause', function () {
    if (!audio.ended) setPlaying(false);
  });
  audio.addEventListener('ended', function () {
    audio.currentTime = 0;
    setPlaying(false);
    status.textContent = 'Play again';
  });
})();

// Display controls stay independent: fullscreen changes the browser surface,
// while Hide All removes every page layer except the live canvases. The small
// escape tab is the only control that survives visual-only mode.
(function () {
  var hideButton = document.getElementById('hide-all-btn');
  var fullscreenButton = document.getElementById('fullscreen-btn');
  var exitButton = document.getElementById('immersive-exit');
  var exitLabel = document.getElementById('immersive-exit-label');
  if (!hideButton || !fullscreenButton || !exitButton || !exitLabel) return;

  var root = document.documentElement;
  var requestFullscreen = root.requestFullscreen || root.webkitRequestFullscreen;
  var exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
  var wakeTimer = 0;
  var wasFullscreen = false;

  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function isVisualOnly() {
    return document.body.classList.contains('visual-only');
  }

  function updateExit() {
    var full = !!fullscreenElement();
    fullscreenButton.setAttribute('aria-pressed', String(full));
    fullscreenButton.setAttribute('aria-label', full ? 'Exit fullscreen' : 'Enter fullscreen');
    if (full) fullscreenButton.removeAttribute('title');
    exitLabel.textContent = full ? 'Exit fullscreen' : 'Show UI';
    exitButton.setAttribute('aria-label', full ? 'Exit fullscreen and show the website controls' : 'Show the website controls');
  }

  function wakeExit() {
    if (!isVisualOnly()) return;
    document.body.classList.add('immersive-awake');
    window.clearTimeout(wakeTimer);
    wakeTimer = window.setTimeout(function () {
      document.body.classList.remove('immersive-awake');
    }, 1800);
  }

  function setVisualOnly(on, restoreFocus, focusExit) {
    document.body.classList.toggle('visual-only', on);
    hideButton.setAttribute('aria-pressed', String(on));
    exitButton.setAttribute('aria-hidden', String(!on));
    updateExit();
    if (on) {
      wakeExit();
      if (focusExit) exitButton.focus({ preventScroll: true });
      else hideButton.blur();
    } else {
      document.body.classList.remove('immersive-awake');
      window.clearTimeout(wakeTimer);
      if (restoreFocus) hideButton.focus({ preventScroll: true });
    }
  }

  function leaveImmersive() {
    setVisualOnly(false, true);
    if (fullscreenElement() && exitFullscreen) {
      var result = exitFullscreen.call(document);
      if (result && result.catch) result.catch(function () {});
    }
  }

  hideButton.addEventListener('click', function (event) {
    var next = !isVisualOnly();
    // A keyboard activation moves focus to the surviving exit control. Pointer
    // users get the cleaner, auto-dimming version immediately.
    setVisualOnly(next, !next, event.detail === 0);
    if (next && window.ikandyTrack) window.ikandyTrack('hero_hide_all');
  });

  if (!requestFullscreen || !exitFullscreen) {
    fullscreenButton.disabled = true;
    fullscreenButton.setAttribute('aria-disabled', 'true');
    fullscreenButton.title = 'Fullscreen is not available in this browser';
  } else {
    fullscreenButton.addEventListener('click', function () {
      fullscreenButton.removeAttribute('title');
      var action;
      try {
        action = fullscreenElement() ? exitFullscreen.call(document) : requestFullscreen.call(root);
      } catch (error) {
        console.warn('[IKANDY display] fullscreen failed:', error && error.name ? error.name : error);
        fullscreenButton.title = 'Fullscreen was blocked by the browser';
        updateExit();
        return;
      }
      if (action && action.catch) {
        action.catch(function (error) {
          console.warn('[IKANDY display] fullscreen failed:', error && error.name ? error.name : error);
          fullscreenButton.title = 'Fullscreen was blocked by the browser';
          updateExit();
        });
      }
      if (!fullscreenElement() && window.ikandyTrack) window.ikandyTrack('hero_fullscreen');
    });
  }

  exitButton.addEventListener('click', leaveImmersive);
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !isVisualOnly()) return;
    event.preventDefault();
    leaveImmersive();
  }, true);
  document.addEventListener('pointermove', wakeExit, { passive: true });
  document.addEventListener('pointerdown', wakeExit, { passive: true });

  function fullscreenChanged() {
    var full = !!fullscreenElement();
    // Native Escape exits fullscreen before some browsers deliver keydown.
    // If visual-only mode was paired with fullscreen, restore the whole page.
    if (!full && wasFullscreen && isVisualOnly()) setVisualOnly(false, true);
    wasFullscreen = full;
    updateExit();
  }
  document.addEventListener('fullscreenchange', fullscreenChanged);
  document.addEventListener('webkitfullscreenchange', fullscreenChanged);
  wasFullscreen = !!fullscreenElement();
  updateExit();
})();
