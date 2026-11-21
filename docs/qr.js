/* Tiny QR code maker: version 1, error level L, text up to 17 characters (enough for a mobile number). */
(function (root) {
  'use strict';
  const N = 21, DATA_CW = 19, ECC_CW = 7;
  const EXP = new Array(512), LOG = new Array(256);
  (function () { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  const mul = (a, b) => (a && b) ? EXP[LOG[a] + LOG[b]] : 0;
  function rsGen(deg) { let g = [1]; for (let i = 0; i < deg; i++) { const n = new Array(g.length + 1).fill(0); for (let j = 0; j < g.length; j++) { n[j] ^= g[j]; n[j + 1] ^= mul(g[j], EXP[i]); } g = n; } return g; }
  function rsEcc(data, deg) { const g = rsGen(deg), r = new Array(deg).fill(0); data.forEach(b => { const f = b ^ r.shift(); r.push(0); for (let i = 0; i < deg; i++) r[i] ^= mul(g[i + 1], f); }); return r; }
  function make(text) {
    const bytes = Array.from(unescape(encodeURIComponent(String(text))), c => c.charCodeAt(0));
    if (bytes.length > 17) throw new Error('QR text too long');
    let bits = [];
    const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
    put(4, 4); put(bytes.length, 8); bytes.forEach(b => put(b, 8));
    put(0, Math.min(4, DATA_CW * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    const cw = []; for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    for (let p = 0xec; cw.length < DATA_CW; p ^= 0xec ^ 0x11) cw.push(p);
    const all = cw.concat(rsEcc(cw, ECC_CW));
    const stream = []; all.forEach(b => { for (let i = 7; i >= 0; i--) stream.push((b >>> i) & 1); });
    const best = (() => {
      let bestM = null, bestP = 1e9;
      for (let mask = 0; mask < 8; mask++) { const m = build(stream, mask), p = penalty(m); if (p < bestP) { bestP = p; bestM = m; } }
      return bestM;
    })();
    return best;
  }
  function build(stream, mask) {
    const m = [], fn = [];
    for (let i = 0; i < N; i++) { m.push(new Array(N).fill(false)); fn.push(new Array(N).fill(false)); }
    const set = (r, c, v) => { m[r][c] = v; fn[r][c] = true; };
    const finder = (r0, c0) => { for (let dr = -1; dr <= 7; dr++) for (let dc = -1; dc <= 7; dc++) { const r = r0 + dr, c = c0 + dc; if (r < 0 || c < 0 || r >= N || c >= N) continue; const d = Math.max(Math.abs(dr - 3), Math.abs(dc - 3)); set(r, c, d !== 2 && d !== 4); } };
    finder(0, 0); finder(0, N - 7); finder(N - 7, 0);
    for (let i = 8; i < N - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    set(N - 8, 8, true);
    for (let i = 0; i < 9; i++) { fn[8][i] = true; fn[i][8] = true; }
    for (let i = 0; i < 8; i++) { fn[8][N - 1 - i] = true; fn[N - 1 - i][8] = true; }
    let k = 0;
    for (let right = N - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let v = 0; v < N; v++) for (let j = 0; j < 2; j++) {
        const c = right - j, up = ((right + 1) & 2) === 0, r = up ? N - 1 - v : v;
        if (fn[r][c]) continue;
        let bit = k < stream.length ? stream[k] === 1 : false; k++;
        const inv = [(r + c) % 2 === 0, r % 2 === 0, c % 3 === 0, (r + c) % 3 === 0, (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r * c) % 2 + (r * c) % 3 === 0, ((r * c) % 2 + (r * c) % 3) % 2 === 0, ((r + c) % 2 + (r * c) % 3) % 2 === 0][mask];
        m[r][c] = bit !== inv;
      }
    }
    // format bits: error level L = 01
    let data = (1 << 3) | mask, rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const f = ((data << 10) | rem) ^ 0x5412, bit = i => ((f >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) m[i][8] = bit(i);
    m[7][8] = bit(6); m[8][8] = bit(7); m[8][7] = bit(8);
    for (let i = 9; i < 15; i++) m[8][14 - i] = bit(i);
    for (let i = 0; i < 8; i++) m[8][N - 1 - i] = bit(i);
    for (let i = 8; i < 15; i++) m[N - 15 + i][8] = bit(i);
    m[N - 8][8] = true;
    return m;
  }
  function penalty(m) {
    let p = 0;
    for (let a = 0; a < N; a++) for (const row of [true, false]) {
      let run = 1;
      for (let b = 1; b < N; b++) { const x = row ? m[a][b] === m[a][b - 1] : m[b][a] === m[b - 1][a]; if (x) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; }
    }
    for (let r = 0; r < N - 1; r++) for (let c = 0; c < N - 1; c++) if (m[r][c] === m[r][c + 1] && m[r][c] === m[r + 1][c] && m[r][c] === m[r + 1][c + 1]) p += 3;
    let dark = 0; m.forEach(r => r.forEach(v => { if (v) dark++; }));
    p += Math.floor(Math.abs(dark * 20 - N * N * 10) / (N * N)) * 10;
    return p;
  }
  root.QR = { make, size: N };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.QR;
})(typeof window !== 'undefined' ? window : globalThis);
