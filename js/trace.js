/* Pure-JavaScript bitmap -> vector engine. No external libraries.
   Marching squares + Douglas-Peucker + Catmull-Rom to cubic Bézier. */
(function () {
  'use strict';
  var NS = window.P2S = window.P2S || {};

  var NEIGH = [ // cell offsets relative to a corner for each heading E,S,W,N
    { fx: 0,  fy: 0,  bx: -1, by: 0 },
    { fx: -1, fy: 0,  bx: -1, by: -1 },
    { fx: -1, fy: -1, bx: 0,  by: -1 },
    { fx: 0,  fy: -1, bx: 0,  by: 0 }
  ];
  var STEP = [[1, 0], [0, 1], [-1, 0], [0, -1]];

  // Segment pairs for marching-squares cases (bits TL=8 TR=4 BR=2 BL=1).
  // Edge names: T=top, R=right, B=bottom, L=left midpoints.
  var CASES = [
    [],       [['L', 'B']], [['B', 'R']], [['L', 'R']],
    [['T', 'R']], [['T', 'R'], ['B', 'L']], [['T', 'B']], [['T', 'L']],
    [['T', 'L']], [['T', 'B']], [['T', 'L'], ['R', 'B']], [['T', 'R']],
    [['L', 'R']], [['B', 'R']], [['L', 'B']], []
  ];

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function fmt(v, precision) {
    var s = Number(v.toFixed(precision));
    return Object.is(s, -0) ? '0' : String(s);
  }

  /* ---------- mask creation ---------- */

  function toGrayscale(imageData, alphaCut) {
    var w = imageData.width, h = imageData.height, d = imageData.data;
    var gray = new Uint8Array(w * h);
    var cut = alphaCut == null ? 128 : alphaCut;
    for (var i = 0, p = 0; i < gray.length; i++, p += 4) {
      if (d[p + 3] < cut) { gray[i] = 255; continue; }
      gray[i] = clamp(Math.round(0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2]), 0, 255);
    }
    return gray;
  }

  function thresholdMask(gray, threshold, invert) {
    var mask = new Uint8Array(gray.length);
    for (var i = 0; i < gray.length; i++) {
      var dark = gray[i] < threshold;
      mask[i] = (invert ? !dark : dark) ? 1 : 0;
    }
    return mask;
  }

  /* ---------- color quantization (median cut) ---------- */

  function quantizeRGB(imageData, count, alphaCut) {
    var w = imageData.width, h = imageData.height, d = imageData.data;
    var cut = alphaCut == null ? 128 : alphaCut;
    var hist = new Map();
    var index = new Uint8Array(w * h);
    index.fill(255);

    for (var y = 0, i = 0, p = 0; y < h; y++) {
      for (var x = 0; x < w; x++, i++, p += 4) {
        if (d[p + 3] < cut) continue;
        var r = d[p], g = d[p + 1], b = d[p + 2];
        var key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
        var e = hist.get(key);
        if (!e) { e = { key: key, n: 0, sr: 0, sg: 0, sb: 0 }; hist.set(key, e); }
        e.n++; e.sr += r; e.sg += g; e.sb += b;
      }
    }

    var entries = Array.from(hist.values());
    if (!entries.length) return { palette: [], index: index };

    function spread(list) {
      var min = [255, 255, 255], max = [0, 0, 0];
      for (var k = 0; k < list.length; k++) {
        var e = list[k];
        var c = [e.sr / e.n, e.sg / e.n, e.sb / e.n];
        for (var ch = 0; ch < 3; ch++) { if (c[ch] < min[ch]) min[ch] = c[ch]; if (c[ch] > max[ch]) max[ch] = c[ch]; }
      }
      return [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
    }

    var boxes = [entries];
    while (boxes.length < count) {
      var bestAt = -1, bestScore = -1, bestCh = 0, bestSpread = null;
      for (var bi = 0; bi < boxes.length; bi++) {
        var sp = spread(boxes[bi]);
        var range = Math.max(sp[0], sp[1], sp[2]);
        var n = boxes[bi].reduce(function (s, e) { return s + e.n; }, 0);
        var score = range * Math.sqrt(n);
        if (boxes[bi].length > 1 && score > bestScore) {
          bestScore = score; bestAt = bi;
          bestCh = sp[0] >= sp[1] && sp[0] >= sp[2] ? 0 : (sp[1] >= sp[2] ? 1 : 2);
          bestSpread = sp;
        }
      }
      if (bestAt < 0 || bestSpread[bestCh] <= 0) break;
      var box = boxes[bestAt];
      var field = ['sr', 'sg', 'sb'][bestCh];
      box.sort(function (a, b) { return (a[field] / a.n) - (b[field] / b.n); });
      var total = box.reduce(function (s, e) { return s + e.n; }, 0);
      var acc = 0, split = 0;
      for (var si = 0; si < box.length - 1; si++) {
        acc += box[si].n;
        if (acc >= total / 2) { split = si + 1; break; }
      }
      if (split <= 0 || split >= box.length) break;
      boxes.splice(bestAt, 1, box.slice(0, split), box.slice(split));
    }

    boxes.sort(function (a, b) {
      var na = a.reduce(function (s, e) { return s + e.n; }, 0);
      var nb = b.reduce(function (s, e) { return s + e.n; }, 0);
      return nb - na;
    });

    var palette = boxes.map(function (box) {
      var n = 0, sr = 0, sg = 0, sb = 0;
      box.forEach(function (e) { n += e.n; sr += e.sr; sg += e.sg; sb += e.sb; });
      var r = Math.round(sr / n), g = Math.round(sg / n), b = Math.round(sb / n);
      return { r: r, g: g, b: b, hex: hex(r, g, b), count: n };
    });

    var cache = new Int16Array(32768);
    cache.fill(-1);
    entries.forEach(function (e) {
      var r = e.sr / e.n, g = e.sg / e.n, b = e.sb / e.n;
      var best = 0, bestD = Infinity;
      for (var c = 0; c < palette.length; c++) {
        var dr = r - palette[c].r, dg = g - palette[c].g, db = b - palette[c].b;
        var dist = 0.30 * dr * dr + 0.59 * dg * dg + 0.11 * db * db;
        if (dist < bestD) { bestD = dist; best = c; }
      }
      cache[e.key] = best;
    });

    for (var y2 = 0, j = 0, p2 = 0; y2 < h; y2++) {
      for (var x2 = 0; x2 < w; x2++, j++, p2 += 4) {
        if (d[p2 + 3] < cut) continue;
        var k2 = ((d[p2] >> 3) << 10) | ((d[p2 + 1] >> 3) << 5) | (d[p2 + 2] >> 3);
        index[j] = cache[k2] >= 0 ? cache[k2] : 0;
      }
    }
    return { palette: palette, index: index };
  }

  function quantizeGray(imageData, levels, alphaCut) {
    var gray = toGrayscale(imageData, alphaCut);
    var index = new Uint8Array(gray.length);
    var palette = [];
    for (var l = 0; l < levels; l++) {
      var v = Math.round(l * 255 / (levels - 1));
      palette.push({ r: v, g: v, b: v, hex: hex(v, v, v), count: 0 });
    }
    for (var i = 0; i < gray.length; i++) {
      var g = Math.round(gray[i] / 255 * (levels - 1));
      index[i] = g;
      palette[g].count++;
    }
    return { palette: palette, index: index };
  }

  function hex(r, g, b) {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ---------- marching squares contour extraction ---------- */

  function contoursFromMask(mask, w, h) {
    // Pad with a background ring so every contour closes.
    var pw = w + 2, ph = h + 2;
    var pad = new Uint8Array(pw * ph);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) pad[(y + 1) * pw + (x + 1)] = mask[y * w + x];
    }

    var edges = new Map(); // point key -> segment indices
    var segs = [];

    function pointKey(px, py) { return px + ':' + py; }

    function edgePoint(name, x, y) {
      if (name === 'T') return [x + 0.5, y];
      if (name === 'R') return [x + 1, y + 0.5];
      if (name === 'B') return [x + 0.5, y + 1];
      return [x, y + 0.5]; // L
    }

    function addSegment(aName, bName, x, y) {
      var a = edgePoint(aName, x, y), b = edgePoint(bName, x, y);
      var s = { a: a, b: b, used: false };
      var id = segs.push(s) - 1;
      [a, b].forEach(function (pt) {
        var key = pointKey(pt[0], pt[1]);
        var list = edges.get(key);
        if (!list) { list = []; edges.set(key, list); }
        list.push(id);
      });
    }

    for (var cy = 0; cy < ph - 1; cy++) {
      for (var cx = 0; cx < pw - 1; cx++) {
        var tl = pad[cy * pw + cx], tr = pad[cy * pw + cx + 1];
        var br = pad[(cy + 1) * pw + cx + 1], bl = pad[(cy + 1) * pw + cx];
        var code = (tl << 3) | (tr << 2) | (br << 1) | bl;
        var pairs = CASES[code];
        for (var q = 0; q < pairs.length; q++) addSegment(pairs[q][0], pairs[q][1], cx, cy);
      }
    }

    var contours = [];
    for (var si = 0; si < segs.length; si++) {
      if (segs[si].used) continue;
      var first = segs[si];
      first.used = true;
      var startKey = pointKey(first.a[0], first.a[1]);
      var pts = [first.a, first.b];
      var endpoint = first.b; // point where the walk currently stands
      var guard = 0;
      while (guard++ < 2000000) {
        var endKey = pointKey(endpoint[0], endpoint[1]);
        if (endKey === startKey) break;
        var candidates = edges.get(endKey) || [];
        var next = null;
        for (var ci = 0; ci < candidates.length; ci++) {
          var cand = segs[candidates[ci]];
          if (!cand.used) { next = cand; break; }
        }
        if (!next) break;
        next.used = true;
        endpoint = pointKey(next.a[0], next.a[1]) === endKey ? next.b : next.a;
        pts.push(endpoint);
      }
      if (pts.length >= 4) {
        // Shift from padded grid coordinates back to pixel coordinates.
        contours.push(pts.map(function (p) { return [p[0] - 0.5, p[1] - 0.5]; }));
      }
    }
    return contours;
  }

  /* ---------- polygon helpers ---------- */

  function area(pts) {
    var a = 0;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
    }
    return Math.abs(a / 2);
  }

  function perpendicularDistance(p, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1];
    if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    var t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
    t = clamp(t, 0, 1);
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }

  function simplify(pts, tolerance) {
    if (tolerance <= 0 || pts.length < 4) return pts.slice();
    var n = pts.length;
    var closed = pts.concat([pts[0]]);
    var keep = new Uint8Array(n + 1);
    keep[0] = 1; keep[n] = 1;
    var stack = [[0, n]];
    while (stack.length) {
      var range = stack.pop(), a = range[0], b = range[1];
      var maxD = -1, idx = -1;
      for (var i = a + 1; i < b; i++) {
        var dist = perpendicularDistance(closed[i], closed[a], closed[b]);
        if (dist > maxD) { maxD = dist; idx = i; }
      }
      if (maxD > tolerance && idx > 0) {
        keep[idx] = 1;
        stack.push([a, idx], [idx, b]);
      }
    }
    var out = [];
    for (var k = 0; k < n; k++) if (keep[k]) out.push(pts[k]);
    return out;
  }

  function pathFromPoints(pts, smooth, precision) {
    if (!pts.length) return '';
    var tension = (smooth / 100) * 0.9;
    var d = 'M' + fmt(pts[0][0], precision) + ' ' + fmt(pts[0][1], precision);
    var n = pts.length;
    if (n < 3 || tension <= 0) {
      for (var i = 1; i < n; i++) d += 'L' + fmt(pts[i][0], precision) + ' ' + fmt(pts[i][1], precision);
      return d + 'Z';
    }
    for (var j = 0; j < n; j++) {
      var p0 = pts[(j - 1 + n) % n], p1 = pts[j], p2 = pts[(j + 1) % n], p3 = pts[(j + 2) % n];
      var c1x = p1[0] + (p2[0] - p0[0]) * tension / 6;
      var c1y = p1[1] + (p2[1] - p0[1]) * tension / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) * tension / 6;
      var c2y = p2[1] - (p3[1] - p1[1]) * tension / 6;
      d += 'C' + fmt(c1x, precision) + ' ' + fmt(c1y, precision) + ' ' +
        fmt(c2x, precision) + ' ' + fmt(c2y, precision) + ' ' +
        fmt(p2[0], precision) + ' ' + fmt(p2[1], precision);
    }
    return d + 'Z';
  }

  function maskToPaths(mask, w, h, settings, color) {
    var contours = contoursFromMask(mask, w, h);
    var tolerance = (settings.simplify || 0) / 10;
    var precision = settings.precision == null ? 2 : settings.precision;
    var smooth = settings.smooth == null ? 40 : settings.smooth;
    var minArea = settings.minArea == null ? 0.5 : settings.minArea;
    var paths = [];
    for (var i = 0; i < contours.length; i++) {
      var c = contours[i];
      if (area(c) < minArea) continue;
      var simplified = simplify(c, tolerance);
      if (simplified.length < 3) continue;
      paths.push({ d: pathFromPoints(simplified, smooth, precision), color: color });
    }
    return paths;
  }

  /* ---------- public vectorizer ---------- */

  function vectorize(imageData, settings) {
    settings = settings || {};
    var w = imageData.width, h = imageData.height;
    var mode = settings.mode || 'mono';
    var paths = [];
    var colors = 0;

    if (mode === 'mono') {
      var gray = toGrayscale(imageData);
      var mask = thresholdMask(gray, settings.threshold == null ? 128 : settings.threshold, !!settings.invert);
      paths = maskToPaths(mask, w, h, settings, settings.invert ? '#ffffff' : '#000000');
      colors = 1;
    } else if (mode === 'color' || mode === 'gray') {
      var count = clamp(settings.colors || 8, 2, 24);
      var q = mode === 'gray' ? quantizeGray(imageData, count) : quantizeRGB(imageData, count);
      colors = q.palette.length;
      for (var c = 0; c < q.palette.length; c++) {
        var cmask = new Uint8Array(w * h);
        var any = false;
        for (var i = 0; i < cmask.length; i++) {
          if (q.index[i] === c) { cmask[i] = 1; any = true; }
        }
        if (!any) continue;
        paths = paths.concat(maskToPaths(cmask, w, h, settings, q.palette[c].hex));
      }
    } else {
      return { paths: [], width: w, height: h, colors: 0, mode: mode };
    }

    return { paths: paths, width: w, height: h, colors: colors, mode: mode };
  }

  NS.Trace = {
    vectorize: vectorize,
    contoursFromMask: contoursFromMask,
    simplify: simplify,
    pathFromPoints: pathFromPoints,
    quantizeRGB: quantizeRGB,
    quantizeGray: quantizeGray,
    thresholdMask: thresholdMask,
    toGrayscale: toGrayscale,
    fmt: fmt
  };
})();
