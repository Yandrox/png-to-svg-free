/* Registers the offline service worker; harmless when opened via file:// */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function (err) {
      console.warn('[PNG->SVG] service worker not registered:', err);
    });
  });
})();
