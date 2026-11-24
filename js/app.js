/* UI wiring: loading, settings, conversion, preview and export. */
(function () {
  'use strict';
  var NS = window.P2S = window.P2S || {};
  var I = NS.I18n, T = NS.Trace, B = NS.SvgBuilder;
  var MAX_SIDE = 1600;

  function $(id) { return document.getElementById(id); }

  var state = {
    name: 'image', size: 0, width: 0, height: 0, scaled: false,
    imageData: null, embedUrl: '', originalUrl: '', svgUrl: '',
    svg: '', result: null, status: null
  };
  var toastTimer = null, deferredPrompt = null;

  function setStatus(key, kind, vars) {
    state.status = { key: key, kind: kind || '', vars: vars || null };
    var el = $('status');
    el.textContent = I.t(key, vars || {});
    el.className = 'status ' + (kind || '');
  }

  function toast(key) {
    var el = $('toast');
    el.textContent = I.t(key);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  function remember(key, value) {
    try { localStorage.setItem('p2s.' + key, value); } catch (e) { /* ignore */ }
  }
  function recall(key) {
    try { return localStorage.getItem('p2s.' + key); } catch (e) { return null; }
  }

  /* ---------- theme and language ---------- */

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    $('themeToggle').title = I.t(theme === 'dark' ? 'themeLight' : 'themeDark');
    remember('theme', theme);
  }

  function refreshText() {
    I.apply();
    var lang = I.get();
    $('langToggle').textContent = lang === 'es' ? 'EN' : 'ES';
    $('langToggle').title = lang === 'es' ? 'Switch to English' : 'Cambiar a español';
    applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    syncModeUI();
    if (state.status) setStatus(state.status.key, state.status.kind, state.status.vars);
    if (state.result && state.svg) renderStats(state.result, new Blob([state.svg]).size, state.size);
    updateFileBadge();
  }

  /* ---------- settings ---------- */

  function getSettings() {
    return {
      mode: $('mode').value,
      threshold: Number($('threshold').value),
      colors: Number($('colors').value),
      simplify: Number($('simplify').value) / 10,
      minArea: Number($('minArea').value),
      smooth: Number($('smooth').value),
      precision: Number($('precision').value),
      invert: $('invert').checked,
      outline: $('outline').checked,
      background: $('background').checked
    };
  }

  function syncOutputs() {
    $('thresholdOut').textContent = $('threshold').value;
    $('colorsOut').textContent = $('colors').value;
    $('simplifyOut').textContent = (Number($('simplify').value) / 10).toFixed(1);
    $('minAreaOut').textContent = $('minArea').value;
    $('smoothOut').textContent = $('smooth').value + '%';
  }

  function syncModeUI() {
    var mode = $('mode').value;
    var fields = document.querySelectorAll('.mode-field');
    for (var i = 0; i < fields.length; i++) {
      var modes = fields[i].getAttribute('data-mode').split(' ');
      fields[i].hidden = modes.indexOf(mode) < 0;
    }
    var vectorOnly = ['simplify', 'minArea', 'smooth', 'invert', 'outline'];
    vectorOnly.forEach(function (id) {
      var el = $(id);
      var wrap = el.closest('.field') || el.closest('.check');
      if (wrap) wrap.hidden = mode === 'embed';
    });
    $('modeHint').textContent = I.t('modeHint' + mode.charAt(0).toUpperCase() + mode.slice(1));
  }

  function persistSettings() {
    var s = getSettings();
    Object.keys(s).forEach(function (k) { remember(k, typeof s[k] === 'boolean' ? (s[k] ? '1' : '') : String(s[k])); });
  }

  function restoreSettings() {
    var defaults = getSettings();
    Object.keys(defaults).forEach(function (k) {
      var v = recall(k);
      if (v === null) return;
      var el = $(k);
      if (!el) return;
      if (typeof defaults[k] === 'boolean') el.checked = !!v;
      else el.value = v;
    });
    syncOutputs();
    syncModeUI();
  }

  /* ---------- image loading ---------- */

  function updateFileBadge() {
    var badge = $('fileBadge');
    if (!state.name || state.name === 'image' && !state.imageData) {
      badge.classList.add('hidden');
      return;
    }
    badge.textContent = I.t('fileLabel') + ': ' + state.name +
      (state.size ? ' · ' + B.humanSize(state.size) : '');
    badge.classList.remove('hidden');
  }

  function showOriginal(dataUrl) {
    if (state.originalUrl) URL.revokeObjectURL(state.originalUrl);
    state.originalUrl = null;
    $('originalPreview').innerHTML = '<img alt="" src="' + dataUrl + '">';
  }

  function prepareImage(img, sourceUrl, name, size) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if (!w || !h) { setStatus('errorInvalid', 'error'); return; }
    var scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
    var canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);

    state.name = name || 'image';
    state.size = size || 0;
    state.width = cw; state.height = ch;
    state.scaled = scale < 1;
    state.imageData = ctx.getImageData(0, 0, cw, ch);
    state.embedUrl = canvas.toDataURL('image/png');
    state.svg = ''; state.result = null;
    clearPreview();

    showOriginal(state.embedUrl);
    updateFileBadge();
    $('convertBtn').disabled = false;
    setStatus('statusLoaded');
    if (state.scaled) {
      setStatus('downscaled', '', { w: cw, h: ch });
      toast('errorTooBig');
    }
  }

  function loadFile(file) {
    if (!file) return;
    if (file.type && file.type.indexOf('image/') !== 0 && !/\.png$/i.test(file.name)) {
      setStatus('errorInvalid', 'error');
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      var dataUrl = String(e.target.result);
      var img = new Image();
      img.onload = function () {
        var dot = file.name.lastIndexOf('.');
        prepareImage(img, dataUrl, dot > 0 ? file.name.slice(0, dot) : file.name, file.size);
      };
      img.onerror = function () { setStatus('errorInvalid', 'error'); };
      img.src = dataUrl;
    };
    reader.onerror = function () { setStatus('errorInvalid', 'error'); };
    reader.readAsDataURL(file);
  }

  function makeSample(kind) {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    var x = c.getContext('2d');
    if (kind === 'logo') {
      x.fillStyle = '#2f81f7';
      x.beginPath(); x.arc(128, 128, 96, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#ffffff';
      x.beginPath(); x.moveTo(128, 58); x.lineTo(196, 178); x.lineTo(60, 178); x.closePath(); x.fill();
      x.fillStyle = '#f7b955';
      x.beginPath(); x.arc(128, 128, 30, 0, Math.PI * 2); x.fill();
    } else if (kind === 'badge') {
      x.translate(128, 128);
      x.fillStyle = '#e3a008';
      x.beginPath();
      for (var i = 0; i < 10; i++) {
        var r = i % 2 ? 48 : 104, a = -Math.PI / 2 + i * Math.PI / 5;
        var px = Math.cos(a) * r, py = Math.sin(a) * r;
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.closePath(); x.fill();
      x.fillStyle = '#1f6feb';
      x.beginPath(); x.arc(0, 0, 42, 0, Math.PI * 2); x.fill();
    } else {
      var g = x.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, '#2b6cb0'); g.addColorStop(1, '#f6ad55');
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      x.fillStyle = '#fff3b0';
      x.beginPath(); x.arc(190, 66, 34, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#2c5282';
      x.beginPath(); x.moveTo(0, 190); x.lineTo(90, 80); x.lineTo(170, 190); x.closePath(); x.fill();
      x.fillStyle = '#276749';
      x.beginPath(); x.moveTo(90, 200); x.lineTo(180, 100); x.lineTo(256, 200); x.lineTo(256, 256); x.lineTo(0, 256); x.lineTo(0, 200); x.closePath(); x.fill();
    }
    var url = c.toDataURL('image/png');
    var img = new Image();
    img.onload = function () { prepareImage(img, url, 'sample-' + kind, 0); };
    img.src = url;
  }

  /* ---------- conversion and export ---------- */

  function clearPreview() {
    if (state.svgUrl) URL.revokeObjectURL(state.svgUrl);
    state.svgUrl = '';
    $('svgPreview').innerHTML = '<span class="empty">' + I.t('emptyPreview') + '</span>';
    $('stats').classList.add('hidden');
    $('stats').innerHTML = '';
    $('codeDetails').hidden = true;
    $('svgCode').textContent = '';
    $('downloadBtn').disabled = true;
    $('copyBtn').disabled = true;
  }

  function renderStats(result, svgSize, originalSize) {
    var cells = [
      [I.t('statDimensions'), result.width + '×' + result.height],
      [I.t('statColors'), String(result.colors)],
      [I.t('statPaths'), String(result.paths.length)],
      [I.t('statSize'), B.humanSize(svgSize)],
      [I.t('statPixels'), String(result.width * result.height)]
    ];
    if (originalSize) cells.splice(1, 0, [I.t('statOriginal'), B.humanSize(originalSize)]);
    $('stats').innerHTML = cells.map(function (c) {
      return '<div class="stat"><span>' + c[0] + '</span><strong>' + c[1] + '</strong></div>';
    }).join('');
    $('stats').classList.remove('hidden');
  }

  function convert() {
    if (!state.imageData) { setStatus('errorInvalid', 'error'); return; }
    var s = getSettings();
    $('convertBtn').disabled = true;
    setStatus('statusConverting');
    setTimeout(function () {
      try {
        var result = T.vectorize(state.imageData, s);
        if (s.mode !== 'embed' && !result.paths.length) {
          setStatus('noPaths', 'error');
          $('convertBtn').disabled = false;
          return;
        }
        var title = I.t('appName') + ' · ' + state.name;
        var desc = $('mode').selectedOptions[0].textContent + ' · ' + result.width + '×' + result.height;
        var svg = B.build(result, s, { title: title, desc: desc, dataUrl: state.embedUrl });
        clearPreview();
        state.svg = svg;
        state.result = result;
        var blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        state.svgUrl = URL.createObjectURL(blob);
        $('svgPreview').innerHTML = '<img alt="SVG result" src="' + state.svgUrl + '">';
        $('svgCode').textContent = svg;
        $('codeDetails').hidden = false;
        renderStats(result, blob.size, state.size);
        $('downloadBtn').disabled = false;
        $('copyBtn').disabled = false;
        setStatus(s.mode === 'embed' ? 'embedNote' : 'statusConverted', 'ok');
      } catch (err) {
        console.error('[PNG->SVG]', err);
        setStatus('errorConvert', 'error');
      } finally {
        $('convertBtn').disabled = false;
      }
    }, 25);
  }

  function download() {
    if (!state.svg) return;
    var blob = new Blob([state.svg], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = state.name.replace(/[^\w\-À-ÿ.]+/g, '_') + '.svg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast('downloaded');
  }

  function copyCode() {
    if (!state.svg) return;
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = state.svg;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ }
      ta.remove();
      toast(ok ? 'copied' : 'errorClipboard');
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(state.svg).then(function () { toast('copied'); }).catch(fallback);
    } else fallback();
  }

  function reset() {
    state.name = 'image'; state.size = 0; state.imageData = null;
    state.embedUrl = ''; state.svg = ''; state.result = null;
    if (state.originalUrl) { URL.revokeObjectURL(state.originalUrl); state.originalUrl = ''; }
    $('originalPreview').innerHTML = '<span class="empty">' + I.t('emptyPreview') + '</span>';
    $('fileInput').value = '';
    clearPreview();
    updateFileBadge();
    $('convertBtn').disabled = true;
    setStatus('statusReady');
  }

  /* ---------- events ---------- */

  function bind() {
    $('langToggle').addEventListener('click', function () { I.toggle(); refreshText(); });
    $('themeToggle').addEventListener('click', function () {
      applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });

    $('dropZone').addEventListener('click', function () { $('fileInput').click(); });
    $('dropZone').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('fileInput').click(); }
    });
    $('fileInput').addEventListener('change', function (e) { loadFile(e.target.files[0]); });

    ['dragenter', 'dragover'].forEach(function (type) {
      $('dropZone').addEventListener(type, function (e) { e.preventDefault(); $('dropZone').classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (type) {
      $('dropZone').addEventListener(type, function (e) { e.preventDefault(); $('dropZone').classList.remove('dragover'); });
    });
    $('dropZone').addEventListener('drop', function (e) {
      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) loadFile(files[0]);
    });

    document.addEventListener('paste', function (e) {
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image/') === 0) {
          var file = items[i].getAsFile();
          if (file) { loadFile(file); e.preventDefault(); return; }
        }
      }
    });

    var samples = document.querySelectorAll('[data-sample]');
    for (var i = 0; i < samples.length; i++) {
      samples[i].addEventListener('click', function (e) { makeSample(e.currentTarget.getAttribute('data-sample')); });
    }

    ['threshold', 'colors', 'simplify', 'minArea', 'smooth', 'precision', 'mode', 'invert', 'outline', 'background'].forEach(function (id) {
      $(id).addEventListener('input', function () {
        syncOutputs(); syncModeUI(); persistSettings();
      });
    });

    $('convertBtn').addEventListener('click', convert);
    $('downloadBtn').addEventListener('click', download);
    $('copyBtn').addEventListener('click', copyCode);
    $('resetBtn').addEventListener('click', reset);

    $('installBtn').addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; $('installBtn').classList.add('hidden'); });
    });
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      $('installBtn').classList.remove('hidden');
      $('installBtn').title = I.t('installHint');
    });
    window.addEventListener('appinstalled', function () { $('installBtn').classList.add('hidden'); });
  }

  function init() {
    applyTheme(recall('theme') || 'dark');
    restoreSettings();
    bind();
    refreshText();
    $('convertBtn').disabled = true;
  }

  NS.App = { init: init, state: state };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
