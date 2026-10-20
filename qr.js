/* Cartelera: generador de códigos QR (modo byte, corrección M).
   Basado en el algoritmo público de la norma ISO/IEC 18004. Sin dependencias. */
(function (global) {
  'use strict';

  var ECC_PER_BLOCK_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
  var BLOCKS_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
  var FORMAT_BITS_M = 0;

  function rawModules(ver) {
    var r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var n = Math.floor(ver / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (ver >= 7) r -= 36;
    }
    return r;
  }
  function dataCodewords(ver) { return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK_M[ver] * BLOCKS_M[ver]; }

  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xFF;
  }
  function rsDivisor(degree) {
    var res = [];
    for (var i = 0; i < degree - 1; i++) res.push(0);
    res.push(1);
    var root = 1;
    for (var k = 0; k < degree; k++) {
      for (var j = 0; j < res.length; j++) {
        res[j] = gfMul(res[j], root);
        if (j + 1 < res.length) res[j] ^= res[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return res;
  }
  function rsRemainder(data, div) {
    var res = div.map(function () { return 0; });
    data.forEach(function (b) {
      var f = b ^ res.shift();
      res.push(0);
      div.forEach(function (c, i) { res[i] ^= gfMul(c, f); });
    });
    return res;
  }
  function utf8(str) {
    var out = [];
    var s = unescape(encodeURIComponent(str));
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  function encode(text) {
    var bytes = utf8(text);
    var ver, cap;
    for (ver = 1; ver <= 40; ver++) {
      var ccBits = ver <= 9 ? 8 : 16;
      cap = dataCodewords(ver) * 8;
      if (4 + ccBits + bytes.length * 8 <= cap) break;
    }
    if (ver > 40) throw new Error('El texto es demasiado largo para un código QR.');
    var ccb = ver <= 9 ? 8 : 16;

    var bits = [];
    var push = function (val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    push(4, 4); push(bytes.length, ccb);
    bytes.forEach(function (b) { push(b, 8); });
    push(0, Math.min(4, cap - bits.length));
    push(0, (8 - bits.length % 8) % 8);
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) push(pad, 8);
    var data = [];
    for (var i = 0; i < bits.length; i += 8) {
      var v = 0; for (var j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
      data.push(v);
    }

    /* bloques + corrección de errores, intercalados */
    var nb = BLOCKS_M[ver], eccLen = ECC_PER_BLOCK_M[ver];
    var rawCw = Math.floor(rawModules(ver) / 8);
    var nShort = nb - rawCw % nb, shortLen = Math.floor(rawCw / nb);
    var div = rsDivisor(eccLen), blocks = [];
    for (var bi = 0, k = 0; bi < nb; bi++) {
      var dat = data.slice(k, k + shortLen - eccLen + (bi < nShort ? 0 : 1));
      k += dat.length;
      var ecc = rsRemainder(dat, div);
      if (bi < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var all = [];
    for (var c = 0; c < blocks[0].length; c++) {
      blocks.forEach(function (blk, bj) {
        if (c !== shortLen - eccLen || bj >= nShort) all.push(blk[c]);
      });
    }

    var size = ver * 4 + 17;
    var mods = [], fn = [];
    for (var y = 0; y < size; y++) { mods.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
    var set = function (x, yy, dark) { mods[yy][x] = dark; fn[yy][x] = true; };

    for (var t = 0; t < size; t++) { set(6, t, t % 2 === 0); set(t, 6, t % 2 === 0); }
    var finder = function (cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = cx + dx, yy = cy + dy;
        if (xx >= 0 && xx < size && yy >= 0 && yy < size) set(xx, yy, d !== 2 && d !== 4);
      }
    };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);

    var align = [];
    if (ver > 1) {
      var na = Math.floor(ver / 7) + 2;
      var step = Math.floor((ver * 8 + na * 3 + 5) / (na * 4 - 4)) * 2;
      for (var pos = size - 7; align.length < na - 1; pos -= step) align.unshift(pos);
      align.unshift(6);
    }
    for (var ai = 0; ai < align.length; ai++) for (var aj = 0; aj < align.length; aj++) {
      if ((ai === 0 && aj === 0) || (ai === 0 && aj === align.length - 1) || (ai === align.length - 1 && aj === 0)) continue;
      for (var ady = -2; ady <= 2; ady++) for (var adx = -2; adx <= 2; adx++) set(align[ai] + adx, align[aj] + ady, Math.max(Math.abs(adx), Math.abs(ady)) !== 1);
    }

    var drawFormat = function (mask) {
      var d = FORMAT_BITS_M << 3 | mask, rem = d;
      for (var q = 0; q < 10; q++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var fb = (d << 10 | rem) ^ 0x5412;
      var bit = function (n) { return ((fb >>> n) & 1) !== 0; };
      for (var a = 0; a <= 5; a++) set(8, a, bit(a));
      set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
      for (var b = 9; b < 15; b++) set(14 - b, 8, bit(b));
      for (var e = 0; e < 8; e++) set(size - 1 - e, 8, bit(e));
      for (var f = 8; f < 15; f++) set(8, size - 15 + f, bit(f));
      set(8, size - 8, true);
    };
    drawFormat(0);
    if (ver >= 7) {
      var vr = ver;
      for (var vq = 0; vq < 12; vq++) vr = (vr << 1) ^ ((vr >>> 11) * 0x1F25);
      var vb = ver << 12 | vr;
      for (var vi = 0; vi < 18; vi++) {
        var on = ((vb >>> vi) & 1) !== 0, va = size - 11 + vi % 3, vbb = Math.floor(vi / 3);
        set(va, vbb, on); set(vbb, va, on);
      }
    }

    var bi2 = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) for (var jj = 0; jj < 2; jj++) {
        var x = right - jj, up = ((right + 1) & 2) === 0, yy2 = up ? size - 1 - vert : vert;
        if (!fn[yy2][x] && bi2 < all.length * 8) {
          mods[yy2][x] = ((all[bi2 >>> 3] >>> (7 - (bi2 & 7))) & 1) !== 0;
          bi2++;
        }
      }
    }

    var maskFn = [
      function (x, y) { return (x + y) % 2 === 0; },
      function (x, y) { return y % 2 === 0; },
      function (x) { return x % 3 === 0; },
      function (x, y) { return (x + y) % 3 === 0; },
      function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
      function (x, y) { return x * y % 2 + x * y % 3 === 0; },
      function (x, y) { return (x * y % 2 + x * y % 3) % 2 === 0; },
      function (x, y) { return ((x + y) % 2 + x * y % 3) % 2 === 0; }
    ];
    var applyMask = function (m) {
      for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) if (!fn[y][x] && maskFn[m](x, y)) mods[y][x] = !mods[y][x];
    };
    var penalty = function () {
      var p = 0, dark = 0, lines = [];
      for (var y = 0; y < size; y++) {
        var row = '', col = '';
        for (var x = 0; x < size; x++) { row += mods[y][x] ? '1' : '0'; col += mods[x][y] ? '1' : '0'; if (mods[y][x]) dark++; }
        lines.push(row, col);
      }
      lines.forEach(function (ln) {
        var re = /(0{5,}|1{5,})/g, m;
        while ((m = re.exec(ln))) p += 3 + m[0].length - 5;
        var padded = '0000' + ln + '0000';
        for (var i = 0; i + 11 <= padded.length; i++) {
          var s = padded.substr(i, 11);
          if (s === '10111010000' || s === '00001011101') p += 40;
        }
      });
      for (var y2 = 0; y2 < size - 1; y2++) for (var x2 = 0; x2 < size - 1; x2++) {
        var cc = mods[y2][x2];
        if (cc === mods[y2][x2 + 1] && cc === mods[y2 + 1][x2] && cc === mods[y2 + 1][x2 + 1]) p += 3;
      }
      var total = size * size;
      p += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
      return p;
    };
    var best = 0, bestP = Infinity;
    for (var mk = 0; mk < 8; mk++) {
      applyMask(mk); drawFormat(mk);
      var pp = penalty();
      if (pp < bestP) { bestP = pp; best = mk; }
      applyMask(mk);
    }
    applyMask(best); drawFormat(best);
    return { size: size, version: ver, modules: mods };
  }

  function toSvg(text, opts) {
    opts = opts || {};
    var qr = encode(text), border = 4, n = qr.size + border * 2, d = '';
    for (var y = 0; y < qr.size; y++) for (var x = 0; x < qr.size; x++) if (qr.modules[y][x]) d += 'M' + (x + border) + ' ' + (y + border) + 'h1v1h-1z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges" role="img" aria-label="' + (opts.label || 'Código QR') + '">' +
      '<rect width="' + n + '" height="' + n + '" fill="#ffffff"/><path d="' + d + '" fill="#000000"/></svg>';
  }

  global.CarteleraQR = { encode: encode, toSvg: toSvg };
})(typeof window !== 'undefined' ? window : this);
