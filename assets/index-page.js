// Click-to-load YouTube: no third-party request is made until the visitor asks.
document.getElementById('vid-load').addEventListener('click', function () {
  var box = document.getElementById('vid');
  var frame = document.createElement('iframe');
  frame.src = 'https://www.youtube-nocookie.com/embed/bOp0aDZlmeQ?autoplay=1&rel=0';
  frame.title = 'IKANDY demo video';
  frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
  frame.allowFullscreen = true;
  box.innerHTML = '';
  box.appendChild(frame);
  if (window.ikandyTrack) window.ikandyTrack('video_play', { video: 'demo' });
});
