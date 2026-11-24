/* Motor tests, no dependencies: node tests/trace.test.js */
'use strict';
global.window = {};
require('../js/trace.js');
var T = global.window.P2S.Trace;
var failures = 0;

function image(w, h, fn) {
  var data = new Uint8ClampedArray(w * h * 4);
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var c = fn(x, y), p = (y * w + x) * 4;
    data[p] = c[0]; data[p + 1] = c[1]; data[p + 2] = c[2]; data[p + 3] = c[3] === undefined ? 255 : c[3];
  }
  return { width: w, height: h, data: data };
}
function check(cond, label) {
  console.log((cond ? 'ok   ' : 'FAIL ') + label);
  if (!cond) failures++;
}
var WHITE = [255, 255, 255, 255], BLACK = [0, 0, 0, 255];
var base = { mode: 'mono', threshold: 128, simplify: 0, smooth: 0, precision: 2 };

var img = image(10, 10, function (x, y) { return (x >= 2 && x <= 7 && y >= 2 && y <= 7) ? BLACK : WHITE; });
var r = T.vectorize(img, base);
check(r.paths.length === 1, 'square produces one closed path');
check(/^M/.test(r.paths[0].d) && /Z$/.test(r.paths[0].d), 'path data is closed');

img = image(12, 12, function (x, y) {
  var edge = x >= 2 && x <= 9 && y >= 2 && y <= 9;
  var hole = x >= 4 && x <= 7 && y >= 4 && y <= 7;
  return edge && !hole ? BLACK : WHITE;
});
r = T.vectorize(img, base);
check(r.paths.length === 2, 'ring produces outer contour and hole');

img = image(8, 8, function (x, y) { return x < 4 ? [255, 0, 0, 255] : [0, 0, 255, 255]; });
r = T.vectorize(img, { mode: 'color', colors: 2, simplify: 0, smooth: 0 });
check(r.paths.length === 2, 'two color regions produce two paths');
check(new Set(r.paths.map(function (p) { return p.color; })).size === 2, 'palette has two distinct colors');

img = image(4, 4, function (x, y) { return [x * 60, x * 60, x * 60, 255]; });
r = T.vectorize(img, { mode: 'gray', colors: 4, simplify: 0, smooth: 0 });
check(r.colors === 4, 'grayscale quantization returns four levels');

img = image(6, 6, function (x, y) { return x < 3 ? BLACK : WHITE; });
check(T.vectorize(img, base).paths.length === 1 &&
      T.vectorize(img, Object.assign({}, base, { invert: true })).paths.length === 1, 'invert keeps one shape');

img = image(8, 8, function (x, y) { return x === 4 && y === 4 ? BLACK : WHITE; });
check(T.vectorize(img, base).paths.length === 1, 'single pixel is traced');
check(T.vectorize(img, Object.assign({}, base, { minArea: 2 })).paths.length === 0, 'min area filters speckles');

var circle = [];
for (var i = 0; i < 64; i++) circle.push([50 + 40 * Math.cos(i * Math.PI / 32), 50 + 40 * Math.sin(i * Math.PI / 32)]);
check(T.simplify(circle, 1.5).length < circle.length, 'simplification removes points');
check(T.pathFromPoints([[0, 0], [10, 0], [10, 10], [0, 10]], 60, 2).indexOf('C') >= 0, 'smoothing emits Bézier curves');

img = image(6, 6, function (x, y) { return x < 3 ? BLACK : [0, 0, 0, 0]; });
check(T.vectorize(img, base).paths.length === 1, 'transparent pixels are ignored');

console.log(failures ? '\n' + failures + ' failure(s)' : '\nAll tests passed.');
process.exitCode = failures ? 1 : 0;
