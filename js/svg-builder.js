/* Serializes traced paths (or an embedded PNG) into a standalone SVG document. */
(function () {
  'use strict';
  var NS = window.P2S = window.P2S || {};

  function escapeXml(s) {
    return String(s).replace(/[<>&"']/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c];
    });
  }

  function humanSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function header(width, height, title, desc) {
    var out = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
      'viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '">\n';
    if (title) out += '  <title>' + escapeXml(title) + '</title>\n';
    if (desc) out += '  <desc>' + escapeXml(desc) + '</desc>\n';
    return out;
  }

  function build(result, settings, meta) {
    settings = settings || {};
    meta = meta || {};
    var w = result.width, h = result.height;
    var out = header(w, h, meta.title, meta.desc);

    if (settings.background) {
      out += '  <rect width="' + w + '" height="' + h + '" fill="#ffffff"/>\n';
    }

    if (result.mode === 'embed') {
      var href = meta.dataUrl || '';
      out += '  <image x="0" y="0" width="' + w + '" height="' + h + '" ' +
        'preserveAspectRatio="none" href="' + escapeXml(href) + '" xlink:href="' + escapeXml(href) + '"/>\n';
    } else {
      var outline = !!settings.outline;
      result.paths.forEach(function (p) {
        var style = outline
          ? 'fill="none" stroke="' + p.color + '" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"'
          : 'fill="' + p.color + '"';
        out += '  <path ' + style + ' fill-rule="evenodd" d="' + p.d + '"/>\n';
      });
    }

    out += '</svg>\n';
    return out;
  }

  NS.SvgBuilder = {
    build: build,
    escapeXml: escapeXml,
    humanSize: humanSize
  };
})();
