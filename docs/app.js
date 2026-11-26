/* ECOLaver Business - screens and interaction */
(function () {
  'use strict';
  const D = window.DB;
  D.load();

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = D.money, qf = D.qtyFmt;
  const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = s => { if (!s) return ''; const p = s.split('-'); return +p[2] + ' ' + MONTHS[+p[1] - 1] + ' ' + p[0]; };

  /* ---------- icons ---------- */
  const IC = {
    home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14.5c2.5 0 4 1.5 4.5 4.5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11L21 7H6"/>',
    pack: '<path d="M7 3h10v3H7z"/><path d="M6 6h12v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z"/><path d="M9 11h6"/>',
    clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    check: '<path d="M5 13l4 4L19 7"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    truck: '<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="16.5" cy="13.5" r="1.2"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 11l7.6-4M8.2 13l7.6 4"/>',
    print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4.5 4-6.5 8-6.5s7.3 2 8 6.5"/>'
  };
  const ic = n => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (IC[n] || '') + '</svg>';

  /* ---------- state ---------- */
  const S = { stack: [], bill: null, order: null, buy: null, pack: null, pick: null, conf: null, formDone: null,
    flt: { stock: 'all', people: 'customers', orders: 'all', ordk: 'all', rep: 'today' }, q: {} };
  let cur = { n: 'home', p: {} };
  const pl = (n, w, p) => n + ' ' + (n === 1 ? w : (p || w + 's'));
  const kindName = i => i.manual ? 'Item' : KIND[i.kind].n;
  const KIND = { raw: { n: 'Raw material', c: '' }, pack: { n: 'Packaging', c: 'gold' }, product: { n: 'Packed product', c: 'blue' } };

  /* ---------- small helpers ---------- */
  let toastT;
  function toast(msg, err) {
    const t = $('#toast');
    t.textContent = msg; t.className = 'show' + (err ? ' err' : '');
    clearTimeout(toastT); toastT = setTimeout(() => { t.className = ''; }, err ? 3400 : 2200);
  }
  function openSheet(html) {
    closeSheet();
    const w = document.createElement('div');
    w.className = 'sheet-wrap';
    w.innerHTML = '<div class="sheet"><div class="grab"></div>' + html + '</div>';
    w.addEventListener('click', e => { if (e.target === w) closeSheet(); });
    document.body.appendChild(w);
    const f = $('input:not([type=file]):not([disabled])', w);
    if (f && !f.dataset.nofocus) setTimeout(() => f.focus(), 120);
  }
  function closeSheet() {
    const w = $('.sheet-wrap');
    if (w) w.remove();
    if (S.conf) { const r = S.conf; S.conf = null; r(false); }
  }
  function confirmSheet(o) {
    return new Promise(res => {
      openSheet('<h2>' + esc(o.title) + '</h2><p class="mut" style="margin-bottom:14px;white-space:pre-line">' + esc(o.text) + '</p>' +
        '<div class="btns"><button class="btn ghost" data-act="confNo">Cancel</button><button class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-act="confYes">' + esc(o.ok || 'OK') + '</button></div>');
      S.conf = res;
    });
  }
  const waLink = (phone, text) => {
    let d = String(phone || '').replace(/\D/g, '');
    if (d.length === 10) d = '91' + d;
    return 'https://wa.me/' + d + '?text=' + encodeURIComponent(text);
  };
  /* ---------- native Android app support (Capacitor) ---------- */
  const NATIVE = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  const plug = n => (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins[n]) || null;
  const GH_REPO = 'mdabdulazizsaikh-eco/ECOLaver-system-app';
  const BUILD = window.APP_BUILD || 0;
  const openLink = url => { if (NATIVE) window.location.href = url; else window.open(url, '_blank'); };
  async function shareNative(o) {
    const sh = plug('Share');
    if (sh) { try { await sh.share(o); return true; } catch (e) { return false; } }
    return false;
  }
  const BK_DIR = 'ECOLaver Business Management System/Backup';
  async function shareFile(name, data, isText, title) {
    const fs = plug('Filesystem');
    if (!fs) throw new Error('File sharing is not available');
    const w = await fs.writeFile(isText ? { path: name, data, directory: 'CACHE', encoding: 'utf8' } : { path: name, data, directory: 'CACHE' });
    await shareNative({ title, files: [w.uri], dialogTitle: title });
  }
  async function checkUpdate(manual) {
    if (!NATIVE) return;
    try {
      const r = await fetch('https://api.github.com/repos/' + GH_REPO + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' } });
      if (r.status === 404) throw new Error('Cannot read updates. Make the GitHub repo public.');
      if (!r.ok) throw new Error('Update check failed (' + r.status + ')');
      const j = await r.json();
      const n = parseInt(String(j.tag_name).replace(/\D/g, ''), 10) || 0;
      const a = (j.assets || []).find(x => /\.apk$/i.test(x.name));
      S.upd = (n > BUILD && a) ? { build: n, url: a.browser_download_url } : null;
      if (manual) toast(S.upd ? 'New update found' : 'You have the latest version');
      if (cur.n === 'home' || cur.n === 'settings') draw(true);
    } catch (e) { if (manual) toast(/fetch/i.test(e.message) ? 'No internet connection' : e.message, 1); }
  }
  async function installUpdate() {
    const u = S.upd; if (!u) return;
    try {
      const fs = plug('Filesystem'), fo = plug('FileOpener');
      if (!fs || !fo) throw new Error('installer missing');
      toast('Downloading update...');
      const d = await fs.downloadFile({ url: u.url, path: 'ECOLaver-update.apk', directory: 'CACHE' });
      await fo.open({ filePath: d.path, contentType: 'application/vnd.android.package-archive' });
    } catch (e) { toast('Opening the download...'); openLink(u.url); }
  }
  function billCanvas(inv) {
    const s = D.state.settings, W = 720, P = 36, rows = inv.lines.length;
    const extra = (inv.discount ? 1 : 0) + (inv.memberDiscount && inv.discount - inv.memberDiscount > 0.005 ? 1 : 0) + (inv.advanceUsed ? 1 : 0) + (Math.abs(inv.billBalance) > 0.005 ? 1 : 0);
    const H = 330 + rows * 56 + 170 + extra * 40 + 90 + (inv.kind === 'receipt' ? 50 : 0);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), F = 'system-ui, -apple-system, Roboto, Arial, sans-serif';
    const fit = (t, mw) => { t = String(t); if (x.measureText(t).width <= mw) return t; while (t.length > 1 && x.measureText(t + '…').width > mw) t = t.slice(0, -1); return t + '…'; };
    const draw = img => {
      x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
      const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#011a0d'); g.addColorStop(1, '#0e7a42');
      x.fillStyle = g; x.fillRect(0, 0, W, 150); x.fillStyle = '#eec32f'; x.fillRect(0, 150, W, 6);
      x.save(); x.beginPath(); x.arc(P + 50, 75, 50, 0, 7); x.closePath(); x.fillStyle = '#fff'; x.fill(); x.clip();
      if (img) x.drawImage(img, P, 25, 100, 100); else { x.fillStyle = '#00552c'; x.font = 'bold 34px ' + F; x.textAlign = 'center'; x.fillText((s.name || 'E').slice(0, 2).toUpperCase(), P + 50, 88); }
      x.restore();
      x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = 'bold 34px ' + F; x.fillText(fit(s.name, W - P * 2 - 130), P + 126, 62);
      x.font = '19px ' + F; x.globalAlpha = .9;
      if (s.address) x.fillText(fit(s.address, W - P * 2 - 130), P + 126, 92);
      x.fillText(fit([s.phone ? 'Ph: ' + s.phone : '', s.email].filter(Boolean).join('  ·  '), W - P * 2 - 130), P + 126, 120);
      x.globalAlpha = 1;
      let y = 200;
      x.fillStyle = '#111'; x.font = 'bold 26px ' + F; x.fillText((inv.kind === 'receipt' ? 'Pre-order Receipt ' : 'Bill ') + inv.no, P, y);
      x.font = '22px ' + F; x.fillStyle = '#555'; x.fillText(fmtDate(inv.date) + (inv.orderNo ? '  ·  Pre-order ' + inv.orderNo : ''), P, y + 32);
      x.textAlign = 'right'; x.fillStyle = '#111'; x.font = 'bold 24px ' + F; x.fillText(fit(inv.customerName, 330), W - P, y);
      if (inv.customerPhone) { x.font = '20px ' + F; x.fillStyle = '#555'; x.fillText(inv.customerPhone, W - P, y + 30); }
      y = 270;
      x.fillStyle = '#e4f2ea'; x.fillRect(P, y, W - P * 2, 44);
      x.fillStyle = '#00331a'; x.font = 'bold 19px ' + F;
      x.textAlign = 'left'; x.fillText('Item', P + 10, y + 29);
      x.textAlign = 'right'; x.fillText('Qty', 410, y + 29); x.fillText('Rate', 530, y + 29); x.fillText('Amount', W - P - 10, y + 29);
      y += 44;
      inv.lines.forEach(l => {
        x.fillStyle = '#111'; x.font = '21px ' + F; x.textAlign = 'left'; x.fillText(fit(l.name, 230), P + 10, y + 36);
        x.textAlign = 'right'; x.fillText(qf(l.qty) + ' ' + l.unit, 410, y + 36); x.fillText(money(l.rate), 530, y + 36); x.fillText(money(l.amount), W - P - 10, y + 36);
        x.fillStyle = '#e6e6e6'; x.fillRect(P, y + 55, W - P * 2, 1);
        y += 56;
      });
      y += 20;
      const row = (a, b, big) => { x.font = (big ? 'bold 28px ' : '22px ') + F; x.fillStyle = big ? '#00552c' : '#111'; x.textAlign = 'left'; x.fillText(a, 330, y); x.textAlign = 'right'; x.fillText(b, W - P, y); y += big ? 46 : 38; };
      row('Subtotal', money(inv.subtotal));
      if (inv.memberDiscount) row('Family member discount', '-' + money(inv.memberDiscount));
      if (inv.discount - (inv.memberDiscount || 0) > 0.005) row('Discount', '-' + money(D.r2(inv.discount - (inv.memberDiscount || 0))));
      x.fillStyle = '#00552c'; x.fillRect(330, y - 26, W - P - 330, 2); y += 12;
      row('Total', money(inv.total), true);
      if (inv.advanceUsed) row('Pre-order advance', money(inv.advanceUsed));
      row((inv.kind === 'receipt' ? 'Advance received (' : 'Paid (') + inv.method + ')', money(inv.paid));
      if (Math.abs(inv.billBalance) > 0.005) row(inv.kind === 'receipt' ? 'Balance on delivery' : (inv.billBalance > 0 ? 'Balance due' : 'Advance balance'), money(Math.abs(inv.billBalance)));
      if (inv.kind === 'receipt') { y += 14; x.textAlign = 'center'; x.fillStyle = '#555'; x.font = '19px ' + F; x.fillText(fit((inv.deliveryDate ? 'Delivery date: ' + fmtDate(inv.deliveryDate) + '. ' : '') + 'Advance receipt, final bill at delivery', W - P * 2), W / 2, y); y += 20; }
      y += 20;
      x.textAlign = 'center'; x.fillStyle = '#555'; x.font = '20px ' + F; x.fillRect(P, y - 26, W - P * 2, 1);
      x.fillText(fit(s.footer, W - P * 2), W / 2, y + 12);
      if (inv.void) { x.save(); x.translate(W / 2, H / 2); x.rotate(-.3); x.strokeStyle = '#d64545'; x.fillStyle = '#d64545'; x.lineWidth = 6; x.font = 'bold 70px ' + F; x.strokeRect(-190, -50, 380, 90); x.fillText('CANCELLED', 0, 22); x.restore(); }
      return c;
    };
    return new Promise(res => {
      const im = new Image(); im.onload = () => res(draw(im)); im.onerror = () => res(draw(null)); im.src = logoSrc();
    });
  }
  const empty = (icon, t, s, btn) => '<div class="empty">' + ic(icon) + '<b>' + esc(t) + '</b>' + esc(s || '') + (btn || '') + '</div>';
  const logoSrc = () => D.state.settings.logo || window.DEFAULT_LOGO || 'logo.png';
  const logoHtml = () => '<img src="' + logoSrc() + '" alt="">';
  const maskNo = n => { n = String(n || ''); return n.length > 3 ? 'X'.repeat(n.length - 3) + n.slice(-3) : n; };
  function qrSvg(text, px) {
    const m = QR.make(text), q = 2, n = m.length;
    let r = '';
    m.forEach((row, y) => row.forEach((v, x) => { if (v) r += 'M' + (x + q) + ' ' + (y + q) + 'h1v1h-1z'; }));
    return '<svg viewBox="0 0 ' + (n + q * 2) + ' ' + (n + q * 2) + '" width="' + px + '" height="' + px + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="' + r + '" fill="#111"/></svg>';
  }
  function cardCanvas(c) {
    const W = 1011, H = 636, x0 = document.createElement('canvas'); x0.width = W; x0.height = H;
    const x = x0.getContext('2d'), F = 'system-ui, -apple-system, Roboto, Arial, sans-serif', s = D.state.settings;
    const draw = img => {
      const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#011a0d'); g.addColorStop(.6, '#00552c'); g.addColorStop(1, '#0e7a42');
      x.fillStyle = g; x.beginPath(); x.roundRect(0, 0, W, H, 44); x.fill();
      x.strokeStyle = '#eec32f'; x.lineWidth = 6; x.beginPath(); x.roundRect(14, 14, W - 28, H - 28, 34); x.stroke();
      x.save(); x.beginPath(); x.arc(110, 110, 58, 0, 7); x.closePath(); x.fillStyle = '#fff'; x.fill(); x.clip();
      if (img) x.drawImage(img, 52, 52, 116, 116); x.restore();
      x.fillStyle = '#fff'; x.textAlign = 'left'; x.font = 'bold 50px ' + F; x.fillText(s.name || 'ECOLaver', 190, 104);
      x.fillStyle = '#eec32f'; x.font = '30px ' + F; x.fillText('Family Membership Card', 190, 148);
      x.fillStyle = '#fff'; x.font = 'bold 66px ' + F; x.fillText(maskNo(c.member.no), 60, 370);
      x.font = 'bold 40px ' + F; x.fillText(String(c.name).toUpperCase().slice(0, 24), 60, 470);
      x.fillStyle = '#d6e8dc'; x.font = '26px ' + F; x.fillText('Member since ' + fmtDate(c.member.since), 60, 520);
      const m = QR.make(c.member.no), n = m.length, q = 2, cell = 7, bx = W - 60 - (n + q * 2) * cell, by = H - 60 - (n + q * 2) * cell;
      x.fillStyle = '#fff'; x.beginPath(); x.roundRect(bx, by, (n + q * 2) * cell, (n + q * 2) * cell, 12); x.fill();
      x.fillStyle = '#111'; m.forEach((row, yy) => row.forEach((v, xx) => { if (v) x.fillRect(bx + (xx + q) * cell, by + (yy + q) * cell, cell, cell); }));
      return x0;
    };
    return new Promise(res => { const im = new Image(); im.onload = () => res(draw(im)); im.onerror = () => res(draw(null)); im.src = logoSrc(); });
  }
  function top(title, sub, o) {
    o = o || {};
    return '<header class="top">' + (o.home ? '<div class="logo">' + logoHtml() + '</div>' : '<button class="back" data-act="back">' + ic('back') + '</button>') +
      '<div class="tt"><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>' +
      (o.act ? '<button class="act" data-act="' + o.act + '" ' + (o.attr || '') + '>' + esc(o.label) + '</button>' : '') + '</header>';
  }
  function balLabel(kind, b) {
    if (Math.abs(b) < 0.005) return { t: 'Settled', c: 'mut' };
    if (kind === 'customers') return b > 0 ? { t: 'Due ' + money(b), c: 'neg' } : { t: 'Advance ' + money(-b), c: 'pos' };
    return b > 0 ? { t: 'You owe ' + money(b), c: 'neg' } : { t: 'Advance paid ' + money(-b), c: 'pos' };
  }

  /* ---------- navigation (own stack, so Back always goes one step back) ---------- */
  const TABOF = { home: 'home', stock: 'stock', item: 'stock', bill: 'bill', invoice: 'bill', people: 'people', person: 'people', buyMenu: 'stock', buy: 'stock', purchases: 'stock', reports: 'more', repDetail: 'more', fund: 'more', investor: 'more', head: 'more', stmt: 'more' };
  function go(n, p, replace) {
    if (!replace) S.stack.push(cur);
    cur = { n, p: p || {} };
    draw();
  }
  function tab(k) { S.stack = []; cur = { n: k, p: {} }; draw(); }
  function goBack() {
    if ($('.sheet-wrap')) { closeSheet(); return true; }
    if (S.stack.length) { cur = S.stack.pop(); draw(true); return true; }
    if (cur.n !== 'home') { cur = { n: 'home', p: {} }; draw(); return true; }
    return false;
  }
  const AppP = plug('App');
  if (AppP && AppP.addListener) {
    AppP.addListener('backButton', () => { if (!goBack() && AppP.exitApp) AppP.exitApp(); });
  } else {
    history.replaceState({}, ''); history.pushState({}, '');
    window.addEventListener('popstate', () => { history.pushState({}, ''); goBack(); });
  }
  function drawNav() {
    const t = TABOF[cur.n] || 'more';
    $('#nav').innerHTML = [['home', 'Home', 'home'], ['stock', 'Stock', 'box'], ['bill', 'Bill', 'receipt', 1], ['people', 'People', 'users'], ['more', 'More', 'grid']]
      .map(a => '<button class="' + (a[3] ? 'mid ' : '') + (t === a[0] ? 'on' : '') + '" data-act="tab" data-t="' + a[0] + '">' +
        (a[3] ? '<span class="fab">' + ic(a[2]) + '</span>' : ic(a[2])) + '<span>' + a[1] + '</span></button>').join('');
  }
  function draw(keep) {
    const y = window.scrollY;
    const fn = SCREENS[cur.n] || SCREENS.home;
    $('#view').innerHTML = fn(cur.p);
    $('#printArea').innerHTML = cur.n === 'invoice' && D.find('invoices', cur.p.id) ? paper(D.find('invoices', cur.p.id)) : '';
    drawNav();
    if (cur.n === 'home') countUps();
    window.scrollTo(0, keep ? y : 0);
  }
  function countUps() {
    $$('[data-count]').forEach(el => {
      const to = +el.dataset.count, t0 = performance.now();
      (function f(t) {
        const k = Math.min((t - t0) / 800, 1), e = 1 - Math.pow(1 - k, 3);
        el.textContent = k < 1 ? money(Math.round(to * e)) : money(to);
        if (k < 1) requestAnimationFrame(f);
      })(t0);
    });
  }

  /* ---------- pickers ---------- */
  function pickItem(kinds, cb) {
    S.pick = { kinds, cb, kind: 'item' };
    openSheet('<h2>Choose item</h2><div class="search"><input id="pq" placeholder="Search..." data-in="pq" data-nofocus="1"></div><div class="pick" id="plist">' + pickItems('') + '</div>');
  }
  function pickItems(q) {
    const list = D.state.items.filter(i => !i.archived && S.pick.kinds.includes(i.kind) && i.name.toLowerCase().includes(q.toLowerCase()));
    return list.map(i => '<div class="row" data-act="pickDo" data-id="' + i.id + '"><div class="ico ' + KIND[i.kind].c + '">' + ic('box') + '</div><div class="main"><div class="t">' + esc(i.name) +
      '</div><div class="s">' + kindName(i) + ' · Stock ' + qf(i.stock) + ' ' + i.unit + '</div></div><div class="end"><b>' + (i.price ? money(i.price) + '/' + i.unit : '') + '</b></div></div>').join('') ||
      '<div class="empty">Nothing found. Buy stock and pack products first.</div>';
  }
  function pickPerson(kind, cb, allowNone) {
    S.pick = { kind: 'person', pk: kind, cb };
    openSheet('<h2>' + (kind === 'customers' ? 'Choose customer' : 'Choose vendor') + '</h2><div class="search"><input id="pq" placeholder="Search name or phone..." data-in="pq" data-nofocus="1"></div><div class="pick" id="plist">' + pickPeople('') + '</div>' +
      '<button class="btn block" style="margin-top:12px" data-act="pickNew">' + ic('plus') + ' New ' + (kind === 'customers' ? 'customer' : 'vendor') + '</button>' +
      (allowNone ? '<button class="btn ghost block" style="margin-top:8px" data-act="pickNone">No vendor (cash purchase)</button>' : ''));
  }
  function pickPeople(q) {
    const k = S.pick.pk;
    q = q.toLowerCase();
    return D.state[k].filter(p => !p.archived && (p.name.toLowerCase().includes(q) || p.phone.includes(q))).map(p => {
      const b = balLabel(k, p.balance);
      return '<div class="row" data-act="pickDo" data-id="' + p.id + '"><div class="ico">' + esc(p.name.slice(0, 1).toUpperCase()) + '</div><div class="main"><div class="t">' + esc(p.name) + '</div><div class="s">' + esc(p.phone || 'No phone') + '</div></div><div class="end"><b class="' + b.c + '" style="font-size:13px">' + b.t + '</b></div></div>';
    }).join('') || '<div class="empty">Nobody found. Tap "New" below.</div>';
  }

  /* ---------- forms in sheets ---------- */
  function itemForm(id) {
    const it = D.item(id);
    openSheet('<h2>Edit item</h2>' +
      ((it.kind === 'raw' || it.manual) ? '<div class="field"><label>Name</label><input id="f-name" value="' + esc(it.name) + '"></div>' + (it.manual ? '<div class="field"><label>Cost per ' + it.unit + ' (₹)</label><input id="f-cost" type="number" inputmode="decimal" placeholder="0" value="' + (it.cost || '') + '"><div class="hint">Used to work out your profit.</div></div>' : '') : '<p class="mut" style="margin-bottom:12px">' + esc(it.name) + '</p>') +
      (it.kind === 'pack' ? '' : '<div class="field"><label>Selling price per ' + it.unit + ' (₹)</label><input id="f-price" type="number" inputmode="decimal" placeholder="0" value="' + (it.price || '') + '"><div class="hint">' + (it.kind === 'raw' ? 'Only fill this if you also sell the raw material.' : 'This price is filled automatically on every bill.') + '</div></div>') +
      (it.kind === 'raw' ? '<div class="field"><label>Family member discount % for this product group</label><input id="f-mp" type="number" inputmode="decimal" placeholder="Default ' + D.state.settings.memberPct + '" value="' + (it.memberPct == null ? '' : it.memberPct) + '"><div class="hint">Applies to ' + esc(it.name) + ' and everything packed from it. Leave empty to use the shop default.</div></div>' : '') +
      '<div class="field"><label>Low stock alert at (' + it.unit + ')</label><input id="f-low" type="number" inputmode="decimal" placeholder="0" value="' + (it.low || '') + '"></div>' +
      '<button class="btn primary block" data-act="itemSave" data-id="' + id + '">Save</button>');
  }
  function personForm(kind, id, opts) {
    const p = id ? D.find(kind, id) : null;
    S.formDone = opts && opts.onDone || null;
    const cust = kind === 'customers';
    openSheet('<h2>' + (p ? 'Edit ' : 'New ') + (cust ? 'customer' : 'vendor') + '</h2>' +
      '<div class="field"><label>Name</label><input id="p-name" value="' + esc(p ? p.name : '') + '"></div>' +
      '<div class="field"><label>Phone</label><input id="p-phone" type="tel" inputmode="tel" value="' + esc(p ? p.phone : '') + '"></div>' +
      '<div class="field"><label>Address (optional)</label><input id="p-addr" value="' + esc(p ? p.address : '') + '"></div>' +
      (p ? '' : '<div class="field"><label>' + (cust ? 'Old due they already owe you (₹)' : 'Old due you already owe them (₹)') + '</label><input id="p-open" type="number" inputmode="decimal" placeholder="0"><div class="hint">Optional. Use a minus (-) if they already hold your advance.</div></div>') +
      '<button class="btn primary block" data-act="personSave" data-kind="' + kind + '" data-id="' + (id || '') + '">Save</button>');
  }
  function paySheet(kind, id, advance) {
    const p = D.find(kind, id), cust = kind === 'customers';
    const title = cust ? (advance ? 'Take advance' : 'Receive payment') : (advance ? 'Pay advance' : 'Pay vendor');
    const pre = !advance && p.balance > 0 ? p.balance : '';
    openSheet('<h2>' + title + '</h2><p class="mut" style="margin-bottom:12px">' + esc(p.name) + ' · ' + balLabel(kind, p.balance).t + '</p>' +
      '<div class="field"><label>Amount (₹)</label><input id="pay-amt" type="number" inputmode="decimal" value="' + pre + '"></div>' +
      '<div class="field"><label>How?</label><select id="pay-m"><option>Cash</option><option>UPI</option><option>Bank</option><option>Card</option></select></div>' +
      '<div class="field"><label>Note (optional)</label><input id="pay-n"></div>' +
      '<button class="btn primary block" data-act="paySave" data-kind="' + kind + '" data-id="' + id + '" data-adv="' + (advance ? 1 : '') + '">Save</button>');
  }
  function fixStockSheet(id) {
    const it = D.item(id);
    openSheet('<h2>Fix stock</h2><p class="mut" style="margin-bottom:12px">' + esc(it.name) + ' · now ' + qf(it.stock) + ' ' + it.unit + '</p>' +
      '<div class="field"><label>Real stock you have (' + it.unit + ')</label><input id="fs-v" type="number" inputmode="decimal" value="' + it.stock + '"></div>' +
      '<div class="field"><label>Reason</label><select id="fs-r"><option>Stock count correction</option><option>Wastage / damaged</option><option>Gift / sample</option><option>Other</option></select></div>' +
      '<button class="btn primary block" data-act="fsSave" data-id="' + id + '">Save</button>');
  }

  /* ---------- shared line editors ---------- */
  function sellLine(d, l, i) {
    const it = l.itemId ? D.item(l.itemId) : { name: l.name, unit: l.unit, stock: 0, free: 1 };
    const us = it.free ? D.UNITS : D.compat(it.unit);
    return '<div class="line"><div class="head"><b>' + esc(it.name) + '</b><span class="mut" style="font-size:12px">' + (it.free ? 'Not in stock yet' : 'Stock ' + qf(it.stock) + ' ' + it.unit) + '</span><button class="x" data-act="lineDel" data-d="' + d + '" data-i="' + i + '">×</button></div>' +
      '<div class="three"><div class="field"><label>Qty</label><input type="number" inputmode="decimal" step="any" value="' + esc(l.qty) + '" data-in="line" data-d="' + d + '" data-i="' + i + '" data-f="qty"></div>' +
      '<div class="field"><label>Unit</label>' + (us.length > 1 ? '<select data-ch="unit" data-d="' + d + '" data-i="' + i + '">' + us.map(u => '<option' + (u === l.unit ? ' selected' : '') + '>' + u + '</option>').join('') + '</select>' : '<input value="' + l.unit + '" disabled>') + '</div>' +
      '<div class="field"><label>Rate ₹/' + l.unit + '</label><input type="number" inputmode="decimal" step="any" value="' + esc(l.rate) + '" data-in="line" data-d="' + d + '" data-i="' + i + '" data-f="rate"></div></div>' +
      '<div class="amt" data-out="amt-' + d + '-' + i + '">' + money(num(l.qty) * num(l.rate)) + '</div></div>';
  }
  const sellLines = d => S[d].lines.map((l, i) => sellLine(d, l, i)).join('') || '<div class="empty" style="padding:14px">No items yet. Tap the button below.</div>';
  function addSellLine(d, id) {
    const it = D.item(id), ls = S[d].lines;
    const ex = ls.find(l => l.itemId === id && l.unit === it.unit);
    if (ex) ex.qty = String(num(ex.qty) + 1);
    else ls.push({ itemId: id, qty: '1', unit: it.unit, rate: it.price || '' });
    $('#lines').innerHTML = sellLines(d); UPD[d](); toast(it.name + ' added');
  }

  /* ---------- BILL ---------- */
  function newBill(o) { return { customerId: o.customerId || '', walkName: '', lines: [], discount: '', paid: null, method: 'Cash', orderId: '', note: '' }; }
  function calcBill(b) {
    const ls = b.lines.filter(l => l.itemId && num(l.qty) > 0);
    const sub = D.r2(D.sum(ls.map(l => num(l.qty) * num(l.rate))));
    const cust = b.customerId ? D.find('customers', b.customerId) : null;
    const mem = cust && cust.member ? cust.member : null;
    const memberDisc = mem ? D.r2(D.sum(ls.map(l => num(l.qty) * num(l.rate) * D.memberPct(l.itemId) / 100))) : 0;
    const disc = Math.min(D.r2(memberDisc + num(b.discount)), sub);
    const total = D.r2(sub - disc);
    const ord = b.orderId ? D.find('orders', b.orderId) : null;
    const adv = ord ? ord.advance : 0;
    const auto = Math.max(D.r2(total - adv), 0);
    const paid = !cust ? total : (b.paid === null ? auto : num(b.paid));
    return { sub, disc, memberDisc, mem, total, adv, auto, paid, cust, bal: D.r2(total - adv - paid), newBal: cust ? D.r2(cust.balance + total - paid) : 0, n: ls.length };
  }
  function billTotals() {
    const c = calcBill(S.bill);
    return '<div class="r"><span>Subtotal</span><b>' + money(c.sub) + '</b></div>' +
      (c.memberDisc ? '<div class="r"><span>Family member discount</span><b>-' + money(c.memberDisc) + '</b></div>' : '') + (c.disc - c.memberDisc > 0.005 ? '<div class="r"><span>Extra discount</span><b>-' + money(D.r2(c.disc - c.memberDisc)) + '</b></div>' : '') +
      '<div class="r big"><span>Total</span><b>' + money(c.total) + '</b></div>' +
      (c.adv ? '<div class="r"><span>Advance already received</span><b>' + money(c.adv) + '</b></div>' : '') +
      '<div class="r"><span>Paid now</span><b>' + money(c.paid) + '</b></div>' +
      '<div class="r"><span>' + (c.bal < -0.005 ? 'Extra advance' : 'Balance on this bill') + '</span><b>' + money(Math.abs(c.bal)) + '</b></div>' +
      (c.cust ? '<div class="r"><span>' + esc(c.cust.name) + ' will ' + (c.newBal > 0 ? 'owe' : 'have advance') + '</span><b>' + money(Math.abs(c.newBal)) + '</b></div>' : '');
  }
  const methodSeg = (d, cur2) => '<div class="seg">' + ['Cash', 'UPI', 'Card'].map(m => '<button class="' + (cur2 === m ? 'on' : '') + '" data-act="method" data-d="' + d + '" data-v="' + m + '">' + m + '</button>').join('') + '</div>';

  /* ---------- paper (invoice view / print) ---------- */
  function paper(inv) {
    const s = D.state.settings;
    const cust = inv.customerId ? D.find('customers', inv.customerId) : null;
    return '<div class="paper"><div class="ph"><div class="lg">' + logoHtml() + '</div><div><h2>' + esc(s.name) + '</h2>' +
      (s.tagline ? '<p><i>' + esc(s.tagline) + '</i></p>' : '') + (s.address ? '<p>' + esc(s.address) + '</p>' : '') +
      '<p>' + [s.phone ? 'Ph: ' + esc(s.phone) : '', s.email ? esc(s.email) : ''].filter(Boolean).join(' · ') + '</p></div></div>' +
      '<div class="meta"><div><b>' + (inv.kind === 'receipt' ? 'Pre-order Receipt ' : 'Bill ') + esc(inv.no) + '</b>' + (inv.void ? '<span class="stamp">CANCELLED</span>' : '') + '<br>' + fmtDate(inv.date) + (inv.orderNo ? '<br><i>Pre-order ' + esc(inv.orderNo) + '</i>' : '') + '</div><div style="text-align:right"><b>' + esc(inv.customerName) + '</b>' + (inv.customerPhone ? '<br>' + esc(inv.customerPhone) : '') + (inv.memberNo ? '<br><i>Family Card ' + maskNo(inv.memberNo) + '</i>' : '') + '</div></div>' +
      '<table><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr>' +
      inv.lines.map(l => '<tr><td>' + esc(l.name) + '</td><td class="r">' + qf(l.qty) + ' ' + l.unit + '</td><td class="r">' + money(l.rate) + '</td><td class="r">' + money(l.amount) + '</td></tr>').join('') + '</table>' +
      '<div class="tot"><div><span>Subtotal</span><span>' + money(inv.subtotal) + '</span></div>' +
      (inv.memberDiscount ? '<div><span>Family member discount</span><span>-' + money(inv.memberDiscount) + '</span></div>' : '') + (inv.discount - (inv.memberDiscount || 0) > 0.005 ? '<div><span>Discount</span><span>-' + money(D.r2(inv.discount - (inv.memberDiscount || 0))) + '</span></div>' : '') +
      '<div class="g"><span>Total</span><span>' + money(inv.total) + '</span></div>' +
      (inv.advanceUsed ? '<div><span>Pre-order advance adjusted</span><span>' + money(inv.advanceUsed) + '</span></div>' : '') +
      '<div><span>' + (inv.kind === 'receipt' ? 'Advance received (' : 'Paid (') + esc(inv.method) + ')</span><span>' + money(inv.paid) + '</span></div>' +
      (Math.abs(inv.billBalance) > 0.005 ? '<div><b>' + (inv.kind === 'receipt' ? 'Balance on delivery' : (inv.billBalance > 0 ? 'Balance due' : 'Advance balance')) + '</b><b>' + money(Math.abs(inv.billBalance)) + '</b></div>' : '') + '</div>' +
      (s.upi && inv.billBalance > 0.005 ? '<p style="margin-top:10px">Pay by UPI: <b>' + esc(s.upi) + '</b></p>' : '') +
      (inv.kind === 'receipt' ? '<p style="margin-top:10px;font-size:12px;color:#555">' + (inv.deliveryDate ? 'Delivery date: <b>' + fmtDate(inv.deliveryDate) + '</b>. ' : '') + 'This is an advance receipt, not the final bill. The final bill is given at delivery.</p>' : '') + (cust && Math.abs(cust.balance) > 0.005 && !inv.void && inv.kind !== 'receipt' ? '<p style="margin-top:8px;font-size:12px;color:#555">Your account balance: ' + balLabel('customers', cust.balance).t + '</p>' : '') +
      '<div class="ft">' + esc(s.footer) + '</div></div>';
  }
  function invText(inv) {
    const s = D.state.settings;
    return '*' + s.name + '*\n' + (inv.kind === 'receipt' ? 'Pre-order Receipt ' : 'Bill ') + inv.no + ' · ' + fmtDate(inv.date) + (inv.orderNo ? '\nPre-order: ' + inv.orderNo : '') + '\nCustomer: ' + inv.customerName + '\n\n' +
      inv.lines.map((l, i) => (i + 1) + '. ' + l.name + ' × ' + qf(l.qty) + ' ' + l.unit + ' = ' + money(l.amount)).join('\n') +
      '\n\n' + (inv.memberDiscount ? 'Family member discount: -' + money(inv.memberDiscount) + '\n' : '') + (inv.discount - (inv.memberDiscount || 0) > 0.005 ? 'Discount: -' + money(D.r2(inv.discount - (inv.memberDiscount || 0))) + '\n' : '') + 'Total: ' + money(inv.total) + (inv.kind === 'receipt' ? '\nAdvance received: ' : '\nPaid: ') + money(inv.paid) +
      (inv.billBalance > 0.005 ? (inv.kind === 'receipt' ? '\nBalance on delivery: ' : '\nBalance due: ') + money(inv.billBalance) : '') + (inv.kind === 'receipt' && inv.deliveryDate ? '\nDelivery date: ' + fmtDate(inv.deliveryDate) : '') + '\n\n' + s.footer;
  }

  /* ---------- SCREENS ---------- */
  const SCREENS = {};

  SCREENS.home = () => {
    const t = D.totals(), s = D.state.settings, st = D.state;
    const days = D.lastDays(7), mx = Math.max.apply(null, days.map(d => d.total).concat([1]));
    const lastB = s.lastBackup, needBk = (st.invoices.length > 0 || st.purchases.length > 0) && (!lastB || (Date.now() - new Date(lastB).getTime()) > 7 * 864e5);
    const start = st.items.length === 0;
    const tile = (n, icon, label, cls, sub) => '<button class="tile ' + (cls || '') + '" data-act="goto" data-n="' + n + '">' + ic(icon) + '<span>' + label + '</span>' + (sub ? '<small>' + sub + '</small>' : '') + '</button>';
    return top(s.name, s.tagline, { home: true }) + '<div class="page stagger">' +
      '<div class="hero"><small>Today\'s sales</small><div class="big" data-count="' + t.todaySales + '">' + money(t.todaySales) + '</div><div class="sub"><span>' + pl(t.todayBills, 'bill') + '</span><span>Profit ' + money(t.todayProfit) + '</span></div></div>' +
      '<div class="tiles">' + tile('bill', 'receipt', 'New Bill', 'gold') + tile('pack', 'pack', 'Pack Products') + tile('stock', 'box', 'Stock') +
      tile('orders', 'clip', 'Orders', '', t.pendingOrders ? t.pendingOrders + ' waiting' : '') + tile('invoices', 'receipt', 'All Bills') + tile('cards', 'users', 'Family Cards', 'gold') + tile('reports', 'chart', 'Reports') + '</div>' +
      (start ? '<div class="card"><h3>How to start</h3>' +
        [['1', 'Buy Stock', 'Stock page > Buy stock. Raw material first, then packaging', 'buyMenu'], ['2', 'Pack Products', 'Turn raw material into packets', 'pack'], ['3', 'New Bill', 'Sell and print the bill', 'bill']]
          .map(a => '<div class="row" data-act="goto" data-n="' + a[3] + '"><div class="ico gold">' + a[0] + '</div><div class="main"><div class="t">' + a[1] + '</div><div class="s">' + a[2] + '</div></div></div>').join('') + '</div>' : '') +
      '<div class="grid2"><div class="stat red" data-act="goPeople" data-v="customers"><small>Customers owe you</small><b>' + money(t.customerDue) + '</b></div>' +
      '<div class="stat gold" data-act="goPeople" data-v="vendors"><small>You owe vendors</small><b>' + money(t.vendorDue) + '</b></div>' +
      '<div class="stat" data-act="tab" data-t="stock"><small>Stock value</small><b>' + money(t.stockValue) + '</b></div>' +
      '<div class="stat green" data-act="goto" data-n="reports"><small>Profit this month</small><b>' + money(t.monthProfit) + '</b></div></div>' +
      (S.upd ? '<div class="note green"><b>Update available</b><br>A new version of the app is ready.<br><button class="btn sm primary" style="margin-top:8px" data-act="updNow">Update now</button></div>' : '') +
      (needBk ? '<div class="note" data-act="goto" data-n="settings">Your data lives only on this phone. Tap here to download a backup.</div>' : '') +
      (t.low.length ? '<div class="card"><h3>Low stock <small>' + t.low.length + ' items</small></h3>' + t.low.slice(0, 5).map(i => '<div class="row" data-act="goto" data-n="item" data-id="' + i.id + '"><div class="ico red">' + ic('alert') + '</div><div class="main"><div class="t">' + esc(i.name) + '</div></div><div class="end"><b class="neg">' + qf(i.stock) + ' ' + i.unit + '</b></div></div>').join('') + '</div>' : '') +
      '<div class="card"><h3>Last 7 days <small>sales</small></h3><div class="bars">' + days.map((d, i) => '<div class="b"><em>' + (d.total ? Math.round(d.total) : '') + '</em><i style="height:' + Math.max(d.total / mx * 100, 3) + '%;animation-delay:' + i * 0.06 + 's"></i><span>' + d.label + '</span></div>').join('') + '</div></div></div>';
  };

  SCREENS.bill = p => {
    if (!S.bill) S.bill = newBill({});
    if (p.orderId && S.bill.orderId !== p.orderId) {
      const o = D.find('orders', p.orderId);
      S.bill = newBill({ customerId: o.customerId });
      S.bill.orderId = o.id;
      if (o.discount - (o.memberDiscount || 0) > 0.005) S.bill.discount = String(D.r2(o.discount - (o.memberDiscount || 0)));
      S.bill.unmatched = [];
      o.lines.forEach(l => {
        let it = l.itemId ? D.item(l.itemId) : null;
        if (!it || it.archived) it = D.state.items.find(x => !x.archived && x.kind !== 'pack' && D.nk(x.name) === D.nk(l.name)) || null;
        if (!it) return S.bill.unmatched.push(l.name + ' × ' + qf(l.qty) + ' ' + l.unit);
        S.bill.lines.push({ itemId: it.id, qty: String(l.qty), unit: l.unit, rate: String(l.rate) });
      });
    }
    if (p.customerId) { S.bill.customerId = p.customerId; }
    delete p.orderId; delete p.customerId;
    const b = S.bill, c = calcBill(b), ord = b.orderId ? D.find('orders', b.orderId) : null;
    return top('New Bill', ord ? 'Delivering order ' + ord.no : 'Type items, bill is ready', { act: b.lines.length ? 'billClear' : '', label: 'Clear' }) + '<div class="page">' +
      (b.unmatched && b.unmatched.length ? '<div class="note red">Not packed yet, so not added: ' + b.unmatched.map(esc).join(', ') + '. Pack it first, then tap Add item.</div>' : '') + (ord ? '<div class="note green">Pre-order <b>' + esc(ord.no) + '</b>: advance ' + money(ord.advance) + ' already received.</div>' : '') + '<div class="card"><h3>Customer</h3>' + (c.cust ?
        '<div class="row" style="cursor:default"><div class="ico">' + esc(c.cust.name.slice(0, 1).toUpperCase()) + '</div><div class="main"><div class="t">' + esc(c.cust.name) + '</div><div class="s ' + balLabel('customers', c.cust.balance).c + '">' + balLabel('customers', c.cust.balance).t + '</div></div>' + (ord ? '' : '<button class="btn sm ghost" data-act="billCust">Change</button>') + '</div>' :
        '<div class="field"><label>Name (optional)</label><input placeholder="Walk-in customer" value="' + esc(b.walkName) + '" data-in="f" data-d="bill" data-f="walkName"></div><button class="btn ghost block" data-act="billCust">' + ic('user') + 'Choose saved customer (for due / advance)</button>') + '</div>' +
      '<div class="card"><h3>Items</h3><div id="lines">' + sellLines('bill') + '</div><button class="btn block" data-act="addLine" data-d="bill">' + ic('plus') + 'Add item</button></div>' +
      '<div class="card"><div class="field"><label>' + (c.mem ? 'Extra discount on top of member discount (₹)' : 'Discount (₹)') + '</label><input type="number" inputmode="decimal" value="' + esc(b.discount) + '" placeholder="0" data-in="f" data-d="bill" data-f="discount"></div>' +
      (c.cust ? '<div class="field"><label>Paid now (₹)</label><input id="paidIn" type="number" inputmode="decimal" value="' + (b.paid === null ? c.auto : esc(b.paid)) + '" data-in="f" data-d="bill" data-f="paid"></div><div class="btns" style="margin:-4px 0 12px"><button class="btn sm ghost" data-act="paidFull">Full amount</button><button class="btn sm ghost" data-act="paidNone">Nothing (keep as due)</button></div>' : '<div class="note green">Walk-in bills are paid in full. Choose a saved customer to keep a due.</div>') +
      '<div class="field" style="margin-bottom:0"><label>Payment method</label>' + methodSeg('bill', b.method) + '</div></div>' +
      '<div class="tbox" id="btot">' + billTotals() + '</div>' +
      '<div class="sticky-save"><button class="btn primary block" id="bsave" data-act="billSave">' + (c.total ? 'Save bill · ' + money(c.total) : 'Save bill') + '</button></div></div>';
  };

  SCREENS.invoice = p => {
    const inv = D.find('invoices', p.id);
    if (!inv) return top('Bill', '') + '<div class="page">' + empty('receipt', 'Bill not found') + '</div>';
    const cust = inv.customerId ? D.find('customers', inv.customerId) : null;
    return top('Bill ' + inv.no, fmtDate(inv.date)) + '<div class="page">' +
      (p.fresh ? '<div class="success"><div class="tick">' + ic('check') + '</div><b style="font-size:18px">Bill saved</b><p class="mut">Stock updated automatically</p></div>' : '') +
      paper(inv) +
      '<div class="btns" style="margin-top:14px"><button class="btn gold" data-act="invShare" data-id="' + inv.id + '">' + ic('share') + 'WhatsApp</button><button class="btn" data-act="invPrint" data-id="' + inv.id + '">' + ic('print') + 'Print / PDF</button></div>' +
      (cust && !inv.void && cust.balance > 0.005 ? '<button class="btn primary block" style="margin-top:10px" data-act="payOpen" data-kind="customers" data-id="' + cust.id + '">' + ic('wallet') + 'Receive payment</button>' : '') +
      '<div class="btns" style="margin-top:10px"><button class="btn ghost" data-act="newBill">' + ic('plus') + 'New bill</button>' + (inv.void ? '' : '<button class="btn danger" data-act="invVoid" data-id="' + inv.id + '">Cancel bill</button>') + '</div>' +
      '<button class="btn danger block" style="margin-top:10px" data-act="invDel" data-id="' + inv.id + '">Delete this bill completely</button></div>';
  };

  const invList = () => {
    const q = (S.q.inv || '').toLowerCase();
    const l = D.state.invoices.slice().sort((a, b) => b.ts - a.ts).filter(i => !q || i.no.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q));
    return l.slice(0, 120).map(i => '<div class="row" data-act="goto" data-n="invoice" data-id="' + i.id + '"><div class="ico ' + (i.void ? 'red' : '') + '">' + ic('receipt') + '</div><div class="main"><div class="t">' + esc(i.customerName) + '</div><div class="s">' + esc(i.no) + ' · ' + fmtDate(i.date) + '</div></div><div class="end"><b>' + money(i.total) + '</b>' +
      (i.void ? '<span class="pill bad">Cancelled</span>' : i.billBalance > 0.005 ? '<span class="pill warn">Due ' + money(i.billBalance) + '</span>' : '<span class="pill">Paid</span>') + '</div></div>').join('') || empty('receipt', 'No bills yet', 'Your bills will appear here.');
  };
  SCREENS.invoices = () => top('All Bills', pl(D.state.invoices.length, 'bill')) + '<div class="page"><div class="search"><input placeholder="Search bill no or customer" data-in="q" data-k="inv" value="' + esc(S.q.inv || '') + '"></div><div class="card" id="list">' + invList() + '</div></div>';

  /* ---------- STOCK (view only: stock changes by buying, packing and selling) ---------- */
  const stockList = () => {
    const f = S.flt.stock, q = (S.q.stock || '').toLowerCase();
    const l = D.state.items.filter(i => !i.archived && (f === 'all' || i.kind === f) && i.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
    return l.map(i => {
      const low = i.stock <= 0 ? '<span class="pill bad">Out</span>' : (i.low > 0 && i.stock <= i.low ? '<span class="pill warn">Low</span>' : '');
      return '<div class="row" data-act="goto" data-n="item" data-id="' + i.id + '"><div class="ico ' + KIND[i.kind].c + '">' + ic(i.kind === 'product' ? 'pack' : 'box') + '</div><div class="main"><div class="t">' + esc(i.name) + '</div><div class="s">' + kindName(i) + ' · Cost ' + money(D.r2(i.cost)) + '/' + i.unit + '</div></div><div class="end"><b>' + qf(i.stock) + ' ' + i.unit + '</b>' + low + '</div></div>';
    }).join('') || (D.state.items.some(i => !i.archived) ? empty('box', 'Nothing in this group', 'Try another tab above.') : empty('box', 'No stock yet', 'Tap "Buy stock" above to add your first raw material.'));
  };
  SCREENS.stock = () => top('Stock', D.totals().stockValue ? 'Worth ' + money(D.totals().stockValue) : 'Everything you have') + '<div class="page">' +
    '<div class="btns" style="margin-bottom:12px"><button class="btn gold" data-act="goto" data-n="buyMenu">' + ic('cart') + 'Buy stock</button><button class="btn ghost" data-act="goto" data-n="purchases">' + ic('clip') + 'Purchase history</button></div>' +
    '<div class="seg">' + [['all', 'All'], ['raw', 'Raw'], ['pack', 'Packaging'], ['product', 'Products']].map(a => '<button class="' + (S.flt.stock === a[0] ? 'on' : '') + '" data-act="fltStock" data-v="' + a[0] + '">' + a[1] + '</button>').join('') + '</div>' +
    '<div class="search"><input placeholder="Search items" data-in="q" data-k="stock" value="' + esc(S.q.stock || '') + '"></div><div class="card" id="list">' + stockList() + '</div></div>';

  SCREENS.item = p => {
    const it = D.item(p.id);
    if (!it || it.archived) return top('Item', '') + '<div class="page">' + empty('box', 'Item not found') + '</div>';
    const mv = D.movements(it.id).slice(0, 15);
    const raw = it.rawId ? D.item(it.rawId) : null;
    let acts = '';
    if (it.kind === 'raw') acts = '<div class="btns" style="margin-bottom:12px"><button class="btn gold" data-act="buyMore" data-id="' + it.id + '">' + ic('cart') + 'Buy more</button>' + (D.packGroups(it.id).length ? '<button class="btn primary" data-act="goto" data-n="packRaw" data-id="' + it.id + '">' + ic('pack') + 'Pack</button>' : '') + '</div>';
    else if (it.kind === 'pack') acts = '<button class="btn gold block" style="margin-bottom:12px" data-act="buyMore" data-id="' + it.id + '">' + ic('cart') + 'Buy more</button>';
    else if (it.manual) acts = '<div class="note">Added by you. Change the stock with "Fix stock" whenever you get or finish goods.</div>';
    else acts = '<button class="btn primary block" style="margin-bottom:12px" data-act="goto" data-n="packRaw" data-id="' + it.rawId + '">' + ic('pack') + 'Pack more</button>';
    return top(it.name, kindName(it) + (raw ? ' · from ' + raw.name : '')) + '<div class="page stagger">' +
      '<div class="grid2"><div class="stat"><small>In stock</small><b>' + qf(it.stock) + ' ' + it.unit + '</b></div><div class="stat"><small>Cost per ' + it.unit + '</small><b>' + money(D.r2(it.cost)) + '</b></div>' +
      '<div class="stat green"><small>Selling price</small><b>' + (it.price ? money(it.price) : '—') + '</b></div><div class="stat"><small>Stock worth</small><b>' + money(D.r2(Math.max(it.stock, 0) * it.cost)) + '</b></div></div>' +
      (it.price && it.kind !== 'pack' ? '<div class="note green">Member price: <b>' + money(D.r2(it.price * (1 - D.memberPct(it.id) / 100))) + '</b> (' + D.memberPct(it.id) + '% off for Family Card holders)</div>' : '') +
      acts +
      '<div class="btns" style="margin-bottom:14px"><button class="btn ghost" data-act="itemEdit" data-id="' + it.id + '">Edit</button><button class="btn ghost" data-act="fsOpen" data-id="' + it.id + '">Fix stock</button><button class="btn danger" data-act="itemArchive" data-id="' + it.id + '">Remove</button></div>' +
      '<div class="card"><h3>Recent movement</h3>' + (mv.map(m => '<div class="row" style="cursor:default"><div class="main"><div class="t">' + esc(m.type) + '</div><div class="s">' + fmtDate(m.date) + (m.ref ? ' · ' + esc(m.ref) : '') + '</div></div><div class="end"><b class="' + (m.qty >= 0 ? 'pos' : 'neg') + '">' + (m.qty >= 0 ? '+' : '') + qf(m.qty) + ' ' + it.unit + '</b></div></div>').join('') || '<div class="empty" style="padding:14px">Nothing yet</div>') + '</div></div>';
  };
  /* ---------- BUY STOCK ---------- */
  const newBuyLine = (type, pre) => type === 'pack' ? { type: 'pack', rawName: pre || '', size: '', sizeUnit: '', pname: '', qty: '', total: '' } : { type: 'raw', name: pre || '', unit: 'kg', qty: '', rate: '' };
  const newBuy = (t, mode) => ({ mode: mode || 'buy', lines: [newBuyLine(t || 'raw')], extras: [{ label: '', amt: '' }], paid: null, from: '', method: 'Cash', orderId: '', advance: 0, advancePaid: '', expected: '' });
  const lineTotal = l => l.type === 'raw' ? num(l.qty) * num(l.rate) : num(l.total);
  /* the unit a raw material is counted in: from saved stock, or from another line in this form */
  function rawUnitOf(name) {
    const k = D.nk(name); if (!k) return '';
    const ex = D.findRaw(name); if (ex) return ex.unit;
    const l = S.buy.lines.find(x => x.type === 'raw' && D.nk(x.name) === k);
    return l ? l.unit : '';
  }
  const smallUnit = u => ({ kg: 'g', g: 'g', litre: 'ml', ml: 'ml', pcs: 'pcs' }[u] || u);
  function calcBuy(b) {
    const sub = D.r2(D.sum(b.lines.map(lineTotal))), extra = D.r2(D.sum(b.extras.map(e => num(e.amt)))), total = D.r2(sub + extra);
    const adv = b.advance || 0, paid = b.paid === null ? Math.max(D.r2(sub - adv), 0) : num(b.paid);
    return { sub, extra, total, adv, paid, bal: D.r2(sub - adv - paid), n: b.lines.length };
  }
  function buyInfo(l, c) {
    const q = num(l.qty), t = lineTotal(l);
    if (!(q > 0) || !(t > 0)) return '';
    const share = c.sub > 0 ? c.extra * t / c.sub : 0;
    const u = l.type === 'pack' ? 'piece' : l.unit;
    let s = l.type === 'raw' ? 'Total ' + money(D.r2(t)) : money(D.r2(t / q)) + ' per piece';
    if (share > 0.005) s += '<br><b>Real cost: ' + money(D.r2((t + share) / q)) + ' per ' + u + '</b> <span class="mut">(extra share ' + money(D.r2(share)) + ')</span>';
    return s;
  }
  function buyLine(l, i, c) {
    const x = '<button class="x" data-act="lineDel" data-d="buy" data-i="' + i + '">×</button>';
    const inp = (f, label, ph, step) => '<div class="field"><label>' + label + '</label><input type="number" inputmode="decimal" step="any" placeholder="' + (ph || '') + '" value="' + esc(l[f]) + '" data-in="line" data-d="buy" data-i="' + i + '" data-f="' + f + '"></div>';
    if (l.type === 'raw') {
      const ex = D.findRaw(l.name);
      const us = ex ? D.compat(ex.unit) : D.UNITS;
      if (!us.includes(l.unit)) l.unit = ex ? ex.unit : l.unit;
      return '<div class="line"><div class="head"><span class="pill">Raw material</span>' + (ex ? '<span class="mut" style="font-size:12px">Stock ' + qf(ex.stock) + ' ' + ex.unit + '</span>' : '') + x + '</div>' +
        '<div class="field"><label>Name</label><input list="rawnames" placeholder="e.g. Ajwa Dates" value="' + esc(l.name) + '" data-in="line" data-d="buy" data-i="' + i + '" data-f="name" data-ch="rname"></div>' +
        '<div class="three">' + inp('qty', 'Quantity', '0') +
        '<div class="field"><label>Unit</label><select data-ch="unit" data-d="buy" data-i="' + i + '">' + us.map(u => '<option' + (u === l.unit ? ' selected' : '') + '>' + u + '</option>').join('') + '</select></div>' +
        inp('rate', 'Price per ' + l.unit + ' ₹', '0') + '</div><div class="amt" data-out="info-' + i + '">' + buyInfo(l, c) + '</div></div>';
    }
    const names = []; D.rawItems().forEach(r => names.push(r.name));
    S.buy.lines.forEach(x2 => { if (x2.type === 'raw' && D.clean(x2.name) && !names.some(n => D.nk(n) === D.nk(x2.name))) names.push(D.clean(x2.name)); });
    const ru = rawUnitOf(l.rawName), su = ru ? D.compat(ru) : [];
    if (ru && !su.includes(l.sizeUnit)) l.sizeUnit = smallUnit(ru);
    return '<div class="line"><div class="head"><span class="pill warn">Packaging</span>' + x + '</div>' +
      '<div class="field"><label>For which raw material?</label><select data-ch="packraw" data-d="buy" data-i="' + i + '"><option value="">Choose...</option>' + names.map(n => '<option' + (D.nk(n) === D.nk(l.rawName) ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></div>' +
      '<div class="two"><div class="field"><label>Pack size</label><input type="number" inputmode="decimal" step="any" placeholder="e.g. 500" value="' + esc(l.size) + '" data-in="line" data-d="buy" data-i="' + i + '" data-f="size"></div>' +
      '<div class="field"><label>Size unit</label>' + (su.length ? '<select data-ch="sunit" data-d="buy" data-i="' + i + '">' + su.map(u => '<option' + (u === l.sizeUnit ? ' selected' : '') + '>' + u + '</option>').join('') + '</select>' : '<input value="" placeholder="Choose raw first" disabled>') + '</div></div>' +
      '<div class="field"><label>Packaging name</label><input list="packnames" placeholder="Pouch, Label, Box, Bottle..." value="' + esc(l.pname) + '" data-in="line" data-d="buy" data-i="' + i + '" data-f="pname"></div>' +
      '<div class="two">' + inp('qty', 'Pieces bought', '0') + inp('total', 'Total price ₹', '0') + '</div><div class="amt" data-out="info-' + i + '">' + buyInfo(l, c) + '</div></div>';
  }
  const buyLines = () => { const c = calcBuy(S.buy); return S.buy.lines.map((l, i) => buyLine(l, i, c)).join('') || '<div class="empty" style="padding:14px">Add what you bought.</div>'; };
  const buyTotals = c => S.buy.mode === 'order' ? '<div class="r"><span>Order value (expected)</span><b>' + money(c.sub) + '</b></div><div class="r big"><span>Advance paid now</span><b>' + money(num(S.buy.advancePaid)) + '</b></div><div class="r"><span>Balance to pay on arrival</span><b>' + money(Math.max(D.r2(c.sub - num(S.buy.advancePaid)), 0)) + '</b></div>' :
    '<div class="r"><span>Items (to pay the seller)</span><b>' + money(c.sub) + '</b></div>' + (c.adv ? '<div class="r"><span>Advance already paid</span><b>' + money(c.adv) + '</b></div>' : '') + (c.extra ? '<div class="r"><span>Extra costs (you paid yourself)</span><b>' + money(c.extra) + '</b></div><div class="r"><span>Real total cost</span><b>' + money(c.total) + '</b></div>' : '') +
    '<div class="r big"><span>Paid to seller</span><b>' + money(c.paid) + '</b></div>' +
    '<div class="r"><span>' + (c.bal < -0.005 ? 'Advance given to seller' : 'Still to pay the seller') + '</span><b>' + money(Math.abs(c.bal)) + '</b></div>';
  const extraRows = () => S.buy.extras.map((e, i) => '<div class="two" style="grid-template-columns:1.4fr 1fr auto;align-items:end"><div class="field"><label>' + (i ? 'What for' : 'What for (optional)') + '</label><input placeholder="Transport, food..." value="' + esc(e.label) + '" data-in="ex" data-i="' + i + '" data-f="label"></div><div class="field"><label>Amount ₹</label><input type="number" inputmode="decimal" placeholder="0" value="' + esc(e.amt) + '" data-in="ex" data-i="' + i + '" data-f="amt"></div>' + (S.buy.extras.length > 1 ? '<button class="x" style="position:static;margin-bottom:14px" data-act="exDel" data-i="' + i + '">×</button>' : '<span></span>') + '</div>').join('');

  SCREENS.buyMenu = () => top('Buy Stock', 'What did you buy?') + '<div class="page">' +
    '<div class="tiles"><button class="tile wide" data-act="buyStart" data-t="raw">' + ic('box') + '<span>Raw material<small>Dates, honey, oil, spices...</small></span></button>' +
    '<button class="tile wide gold" data-act="buyStart" data-t="pack">' + ic('pack') + '<span>Packaging material<small>Pouch, label, box, bottle...</small></span></button></div>' +
    '<div class="note">You can add more items in the same purchase on the next screen.</div>' +
    '<button class="btn block" style="margin-top:6px" data-act="vorderNew">' + ic('truck') + 'Pre-order to a vendor (goods come later)</button><button class="btn ghost block" style="margin-top:8px" data-act="goto" data-n="purchases">' + ic('cart') + 'Purchase history</button></div>';

  SCREENS.buy = p => {
    if (!S.buy) S.buy = newBuy('raw');
    if (p.pre) { const it = D.item(p.pre), b = S.buy; if (it) { const l = it.kind === 'raw' ? newBuyLine('raw', it.name) : Object.assign(newBuyLine('pack', D.item(it.rawId).name), { size: String(it.size), sizeUnit: it.sizeUnit, pname: it.pname }); if (it.kind === 'raw') l.unit = it.unit; b.lines = [l]; } }
    delete p.pre;
    const b = S.buy, c = calcBuy(b);
    const ord = b.mode === 'order';
    return top(ord ? 'Order to Vendor' : 'Buy Stock', ord ? 'Goods will arrive later' : (b.orderId ? 'Goods arrived from your pre-order' : 'Enter what you bought'), { act: 'buyClear', label: 'Clear' }) + '<div class="page">' +
      '<datalist id="rawnames">' + D.rawItems().map(r => '<option value="' + esc(r.name) + '">').join('') + '</datalist><datalist id="packnames">' + ['Pouch', 'Label', 'Box', 'Bottle', 'Jar', 'Lid', 'Sticker'].map(n => '<option value="' + n + '">').join('') + '</datalist>' +
      '<div class="card"><h3>' + (ord ? 'Items you ordered' : 'Items bought') + '</h3><div id="lines">' + buyLines() + '</div>' +
      '<div class="btns"><button class="btn" data-act="buyAdd" data-t="raw">' + ic('plus') + 'Raw material</button><button class="btn gold" data-act="buyAdd" data-t="pack">' + ic('plus') + 'Packaging</button></div></div>' +
      (ord ? '<div class="card"><div class="field"><label>Vendor name</label><input list="places" placeholder="Who will supply?" value="' + esc(b.from) + '" data-in="f" data-d="buy" data-f="from"><datalist id="places">' + D.places().map(n => '<option value="' + esc(n) + '">').join('') + '</datalist></div>' +
      '<div class="two"><div class="field"><label>Advance paid now (₹)</label><input type="number" inputmode="decimal" placeholder="0" value="' + esc(b.advancePaid) + '" data-in="f" data-d="buy" data-f="advancePaid"></div><div class="field"><label>Expected on</label><input type="date" value="' + esc(b.expected) + '" data-in="f" data-d="buy" data-f="expected"></div></div>' +
      '<div class="field" style="margin-bottom:0"><label>Advance paid by</label>' + methodSeg('buy', b.method) + '</div></div>' : '<div class="card"><h3>Extra costs <small>transport, food...</small></h3><div id="extras">' + extraRows() + '</div><button class="btn sm ghost" data-act="exAdd">' + ic('plus') + 'Add another cost</button><div class="hint" style="margin:8px 0 14px">You paid these yourself, so they are not added to the seller\'s bill. They are shared across the items by price, so every item shows its real cost. Add as many as you like, the total is calculated for you.</div></div><div class="card">' +
      '<div class="field"><label>Bought from (optional)</label><input list="places" placeholder="Leave empty for market / cash" value="' + esc(b.from) + '" data-in="f" data-d="buy" data-f="from"><datalist id="places">' + D.places().map(n => '<option value="' + esc(n) + '">').join('') + '</datalist><div class="hint">Type a name only if you keep a due or advance with them.</div></div>' +
      '<div class="field"><label>Paid to the seller now (₹)</label><input id="paidIn" type="number" inputmode="decimal" value="' + (b.paid === null ? c.paid : esc(b.paid)) + '" data-in="f" data-d="buy" data-f="paid"></div>' +
      '<div class="btns" style="margin:-4px 0 12px"><button class="btn sm ghost" data-act="buyPaidFull">Full amount</button><button class="btn sm ghost" data-act="buyPaidNone">Nothing (pay later)</button></div>' +
      '<div class="field" style="margin-bottom:0"><label>Paid by</label>' + methodSeg('buy', b.method) + '</div></div>') +
      '<div class="tbox" id="utot">' + buyTotals(c) + '</div><div class="sticky-save"><button class="btn primary block" data-act="buySave">' + (ord ? 'Save order' : 'Save purchase') + '</button></div></div>';
  };

  SCREENS.purchases = () => top('Purchase History', pl(D.state.purchases.length, 'entry', 'entries')) + '<div class="page"><div class="card">' +
    (D.state.purchases.slice().sort((a, b) => b.ts - a.ts).slice(0, 100).map(pu => '<div class="row" data-act="purOpen" data-id="' + pu.id + '"><div class="ico gold">' + ic('cart') + '</div><div class="main"><div class="t">' + esc(pu.vendorName) + '</div><div class="s">' + esc(pu.no) + ' · ' + fmtDate(pu.date) + ' · ' + pu.lines.map(l => esc(l.name)).join(', ') + '</div></div><div class="end"><b>' + money(pu.total) + '</b>' + ((pu.items == null ? pu.total : pu.items) - pu.paid > 0.005 ? '<span class="pill warn">Unpaid ' + money(D.r2((pu.items == null ? pu.total : pu.items) - pu.paid)) + '</span>' : '<span class="pill">Paid</span>') + '</div></div>').join('') || empty('cart', 'No purchases yet', 'Use "Buy Stock" to add one.')) + '</div></div>';
  /* ---------- PACK PRODUCTS ---------- */
  SCREENS.pack = () => {
    const ok = D.rawsWithPacks(), no = D.rawItems().filter(r => !ok.includes(r));
    return top('Pack Products', 'Choose the raw material to pack') + '<div class="page"><div class="card">' +
      (ok.map(r => '<div class="row" data-act="goto" data-n="packRaw" data-id="' + r.id + '"><div class="ico">' + ic('box') + '</div><div class="main"><div class="t">' + esc(r.name) + '</div><div class="s">Sizes: ' + D.packGroups(r.id).map(g => g.label).join(', ') + '</div></div><div class="end"><b>' + qf(r.stock) + ' ' + r.unit + '</b></div></div>').join('') ||
        (D.rawItems().length ? empty('pack', 'No packaging added yet', 'Buy packaging (pouch, label...) for your raw material in Stock > Buy stock.') : empty('pack', 'Nothing to pack yet', 'First buy a raw material and its packaging (pouch, label...).', '<br><button class="btn primary" style="margin-top:12px" data-act="goto" data-n="buyMenu">Buy Stock</button>'))) + '</div>' +
      (ok.length && no.length ? '<div class="note">No packaging bought yet for: ' + no.map(r => esc(r.name)).join(', ') + '</div>' : '') +
      '<button class="btn ghost block" style="margin-top:6px" data-act="goto" data-n="packings">' + ic('clip') + 'Packing history</button></div>';
  };
  const packEntries = () => Object.keys(S.pack.counts).map(k => ({ key: k, count: num(S.pack.counts[k]), price: num(S.pack.prices[k]) }));
  const packNow = () => D.packPlan(S.pack.rawId, packEntries(), num(S.pack.extra));
  function packTotals() {
    const pl = packNow(), raw = pl.raw;
    const sale = D.r2(D.sum(pl.rows.map(r => r.count * r.price)));
    return (pl.rawNeed ? '<div class="r"><span>' + esc(raw.name) + ' needed</span><b class="' + (raw.stock + 1e-9 < pl.rawNeed ? 'neg' : '') + '">' + qf(pl.rawNeed) + ' ' + raw.unit + ' <span class="mut" style="font-weight:400">(have ' + qf(raw.stock) + ')</span></b></div>' : '') +
      Object.keys(pl.packNeed).map(id => { const p = D.item(id); return '<div class="r"><span>' + esc(p.name) + '</span><b class="' + (p.stock + 1e-9 < pl.packNeed[id] ? 'neg' : '') + '">' + qf(pl.packNeed[id]) + ' pcs <span class="mut" style="font-weight:400">(have ' + qf(p.stock) + ')</span></b></div>'; }).join('') +
      '<div class="r big"><span>Total cost</span><b>' + money(pl.totalCost) + '</b></div>' + (sale ? '<div class="r"><span>Selling value</span><b>' + money(sale) + '</b></div><div class="r"><span>Expected profit</span><b>' + money(D.r2(sale - pl.totalCost)) + '</b></div>' : '') +
      (pl.short.length ? '<div class="note red" style="margin-top:8px">Not enough stock. Buy more or make fewer packets.</div>' : '');
  }
  function packRowInfo(g, pl) {
    const row = pl.rows.find(r => r.group === g || r.key === g.key);
    const cost = row ? row.cost : D.packetCost(S.pack.rawId, g).total, price = num(S.pack.prices[String(g.key)]);
    return 'Cost per packet ' + money(D.r2(cost)) + (price > 0 ? ' · Profit ' + money(D.r2(price - cost)) + ' (' + (cost > 0 ? Math.round((price - cost) / cost * 100) : 0) + '%)' : '');
  }
  SCREENS.packRaw = p => {
    const raw = D.item(p.id);
    if (!raw || raw.kind !== 'raw') return top('Pack', '') + '<div class="page">' + empty('pack', 'Not found') + '</div>';
    if (!S.pack || S.pack.rawId !== raw.id) {
      S.pack = { rawId: raw.id, counts: {}, prices: {}, extra: '' };
      D.packGroups(raw.id).forEach(g => { if (g.product && g.product.price) S.pack.prices[String(g.key)] = String(g.product.price); });
    }
    const gs = D.packGroups(raw.id), pl = packNow();
    return top('Pack ' + raw.name, 'In stock: ' + qf(raw.stock) + ' ' + raw.unit) + '<div class="page">' +
      gs.map(g => {
        const can = Math.floor(Math.min(raw.stock / g.key, D.packetCost ? Math.min.apply(null, g.packs.map(x => x.stock)) : 0) + 1e-9);
        const k = String(g.key);
        return '<div class="card"><h3>' + esc(raw.name) + ' ' + esc(g.label) + ' <small>can make ' + Math.max(can, 0) + '</small></h3>' +
          '<div class="s mut" style="margin-bottom:10px;font-size:13px">Uses: ' + g.packs.map(x => esc(x.pname) + ' (have ' + qf(x.stock) + ')').join(' + ') + '</div>' +
          '<div class="two"><div class="field"><label>Packets to make</label><input type="number" inputmode="numeric" placeholder="0" value="' + esc(S.pack.counts[k] || '') + '" data-in="pk" data-key="' + k + '" data-f="counts"></div>' +
          '<div class="field"><label>Selling price ₹</label><input type="number" inputmode="decimal" placeholder="0" value="' + esc(S.pack.prices[k] || '') + '" data-in="pk" data-key="' + k + '" data-f="prices"></div></div>' +
          '<div class="amt" data-out="pk-' + k + '">' + packRowInfo(g, pl) + '</div></div>';
      }).join('') +
      '<div class="card"><div class="field" style="margin-bottom:0"><label>Other cost for this packing: labour, gas... (₹)</label><input type="number" inputmode="decimal" placeholder="0" value="' + esc(S.pack.extra) + '" data-in="f" data-d="pack" data-f="extra"><div class="hint">Optional. Shared across the packets by weight.</div></div></div>' +
      '<div class="tbox" id="ptot">' + packTotals() + '</div><div class="sticky-save"><button class="btn primary block" data-act="packSave">Pack now</button></div></div>';
  };
  SCREENS.packings = () => top('Packing History', pl(D.state.batches.length, 'entry', 'entries')) + '<div class="page"><div class="card">' +
    (D.state.batches.slice().sort((a, b) => b.ts - a.ts).slice(0, 100).map(b => '<div class="row" data-act="batchOpen" data-id="' + b.id + '"><div class="ico blue">' + ic('pack') + '</div><div class="main"><div class="t">' + esc(b.rawName) + '</div><div class="s">' + fmtDate(b.date) + ' · ' + b.entries.map(e => e.count + ' × ' + esc(e.name.replace(b.rawName, '').trim())).join(', ') + '</div></div><div class="end"><b>' + money(b.total) + '</b></div></div>').join('') || empty('pack', 'Nothing packed yet', 'Use "Pack Products" to start.')) + '</div></div>';

  /* ---------- ORDERS ---------- */
  function calcOrder(o) {
    const sub = D.r2(D.sum(o.lines.map(l => num(l.qty) * num(l.rate))));
    const cust = o.customerId ? D.find('customers', o.customerId) : null, mem = cust && cust.member ? cust.member : null;
    const memberDisc = mem ? D.r2(D.sum(o.lines.map(l => num(l.qty) * num(l.rate) * (l.itemId ? D.memberPct(l.itemId) : D.state.settings.memberPct) / 100))) : 0;
    const disc = Math.min(D.r2(memberDisc + num(o.discount)), sub), total = D.r2(sub - disc);
    return { sub, disc, memberDisc, mem, total, adv: num(o.advance), bal: D.r2(total - num(o.advance)) };
  }
  const orderTotals = () => { const c = calcOrder(S.order); return (c.disc ? '<div class="r"><span>Subtotal</span><b>' + money(c.sub) + '</b></div>' : '') + (c.memberDisc ? '<div class="r"><span>Family member discount</span><b>-' + money(c.memberDisc) + '</b></div>' : '') + (c.disc - c.memberDisc > 0.005 ? '<div class="r"><span>Extra discount</span><b>-' + money(D.r2(c.disc - c.memberDisc)) + '</b></div>' : '') + '<div class="r big" style="border:0;margin:0;padding-top:0"><span>Order total</span><b>' + money(c.total) + '</b></div><div class="r"><span>Advance received</span><b>' + money(c.adv) + '</b></div><div class="r"><span>Balance on delivery</span><b>' + money(c.bal) + '</b></div>'; };
  const waiting = o => o.lines.some(l => { const it = l.itemId ? D.item(l.itemId) : null; return !it || it.stock + 1e-9 < D.conv(l.qty, l.unit, it.unit); });
  SCREENS.orders = () => {
    const k = S.flt.ordk, f = S.flt.orders;
    const norm = s => s === 'delivered' || s === 'received' ? 'done' : s;
    let l = [];
    if (k !== 'vendors') l = l.concat(D.state.orders.map(o => ({ o, cu: true })));
    if (k !== 'customers') l = l.concat(D.state.vorders.map(o => ({ o, cu: false })));
    const cnt = s => l.filter(x => s === 'all' || norm(x.o.status) === s).length;
    l = l.filter(x => f === 'all' || norm(x.o.status) === f).sort((x, y) => y.o.ts - x.o.ts);
    return top('Orders', 'All your orders in one place', { act: 'orderNew', label: '+ New' }) + '<div class="page">' +
      '<div class="seg">' + [['all', 'All'], ['customers', 'From customers'], ['vendors', 'To vendors']].map(a => '<button class="' + (k === a[0] ? 'on' : '') + '" data-act="fltOrdK" data-v="' + a[0] + '">' + a[1] + '</button>').join('') + '</div>' +
      '<div class="seg">' + [['all', 'All'], ['pending', 'Waiting'], ['done', 'Done'], ['cancelled', 'Cancelled']].map(a => '<button class="' + (f === a[0] ? 'on' : '') + '" data-act="fltOrders" data-v="' + a[0] + '">' + a[1] + '</button>').join('') + '</div><div class="card">' +
      (l.map(({ o, cu }) => {
        const st = norm(o.status), pill = st === 'pending' ? '<span class="pill warn">Waiting</span>' : st === 'done' ? '<span class="pill">' + (cu ? 'Delivered' : 'Received') + '</span>' : '<span class="pill bad">Cancelled</span>';
        return cu ?
          '<div class="row ordrow" data-act="orderOpen" data-id="' + o.id + '"><div class="ico gold">' + ic('clip') + '</div><div class="main"><div class="t">' + esc(o.customerName) + '</div></div><div class="end"><b>' + money(o.total) + '</b>' + pill + (o.advance ? '<span class="pill">Advance ' + money(o.advance) + '</span>' : '') + (o.status === 'pending' && waiting(o) ? '<span class="pill warn">Stock not ready</span>' : '') + '</div></div>' :
          '<div class="row ordrow" data-act="vorderOpen" data-id="' + o.id + '"><div class="ico blue">' + ic('truck') + '</div><div class="main"><div class="t">' + esc(o.vendorName) + '</div></div><div class="end"><b>' + money(o.total) + '</b>' + pill + (o.advance ? '<span class="pill">Advance paid ' + money(o.advance) + '</span>' : '') + '</div></div>';
      }).join('') || empty('clip', 'No orders here', 'Tap "+ New" to add an order.')) + '</div></div>';
  };
  SCREENS.orderNew = () => {
    if (!S.order) S.order = { customerId: '', lines: [], deliveryDate: '', advance: '', discount: '', method: 'Cash', note: '' };
    const o = S.order, cust = o.customerId ? D.find('customers', o.customerId) : null;
    return top('New Order', 'Customer pays advance, you deliver later') + '<div class="page">' +
      '<div class="card"><h3>Customer</h3><div class="row" data-act="orderCust"><div class="ico">' + (cust ? esc(cust.name.slice(0, 1).toUpperCase()) : ic('user')) + '</div><div class="main"><div class="t">' + (cust ? esc(cust.name) : 'Choose customer') + '</div><div class="s">' + (cust ? esc(cust.phone) : 'Required') + '</div></div><span class="lnk">' + (cust ? 'Change' : 'Choose') + '</span></div></div>' +
      '<div class="card"><h3>Items ordered</h3><div id="lines">' + sellLines('order') + '</div><div class="btns"><button class="btn" data-act="addLine" data-d="order">' + ic('plus') + 'From stock</button><button class="btn gold" data-act="ordFree">' + ic('plus') + 'Not in stock yet</button></div></div>' +
      '<div class="card"><div class="field"><label>' + (calcOrder(o).mem ? 'Extra discount on top of member discount (₹)' : 'Discount (₹)') + '</label><input type="number" inputmode="decimal" placeholder="0" value="' + esc(o.discount) + '" data-in="f" data-d="order" data-f="discount"></div><div class="two"><div class="field"><label>Advance received (₹)</label><input type="number" inputmode="decimal" placeholder="0" value="' + esc(o.advance) + '" data-in="f" data-d="order" data-f="advance"></div><div class="field"><label>Delivery date</label><input type="date" value="' + esc(o.deliveryDate) + '" data-in="f" data-d="order" data-f="deliveryDate"></div></div>' +
      '<div class="field" style="margin-bottom:0"><label>Advance paid by</label>' + methodSeg('order', o.method) + '</div></div>' +
      '<div class="tbox" id="otot">' + orderTotals() + '</div><div class="sticky-save"><button class="btn primary block" data-act="orderSave">Save order</button></div></div>';
  };

  /* pre-order advance receipt: looks like a bill, can be shared or downloaded */
  function receiptDoc(o) {
    const cust = D.find('customers', o.customerId);
    return { kind: 'receipt', id: o.id, no: o.no, date: o.date, customerId: o.customerId, customerName: o.customerName, customerPhone: (cust && cust.phone) || o.customerPhone || '', memberNo: o.memberNo || '',
      lines: o.lines, subtotal: o.subtotal == null ? o.total : o.subtotal, discount: o.discount || 0, memberDiscount: o.memberDiscount || 0, total: o.total, advanceUsed: 0, paid: o.advance, method: o.method,
      billBalance: D.r2(o.total - o.advance), deliveryDate: o.deliveryDate, void: o.status === 'cancelled' };
  }
  SCREENS.orderReceipt = p => {
    const o = D.find('orders', p.id);
    if (!o) return top('Receipt', '') + '<div class="page">' + empty('receipt', 'Order not found') + '</div>';
    return top('Advance Receipt', o.no) + '<div class="page">' +
      (p.fresh ? '<div class="success"><div class="tick">' + ic('check') + '</div><b style="font-size:18px">Order saved</b><p class="mut">Send the receipt to the customer</p></div>' : '') +
      paper(receiptDoc(o)) +
      '<div class="btns" style="margin-top:14px"><button class="btn gold" data-act="rcShare" data-id="' + o.id + '">' + ic('share') + 'WhatsApp</button><button class="btn" data-act="rcImage" data-id="' + o.id + '">' + ic('print') + 'Download / Share image</button></div>' +
      '<button class="btn ghost block" style="margin-top:10px" data-act="goto" data-n="orders">All orders</button></div>';
  };

  /* ---------- PEOPLE ---------- */
  const peopleList = () => {
    const k = S.flt.people, q = (S.q.people || '').toLowerCase();
    const l = D.state[k].filter(p => !p.archived && (p.name.toLowerCase().includes(q) || p.phone.includes(q))).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance) || a.name.localeCompare(b.name));
    return l.map(p => { const b = balLabel(k, p.balance); return '<div class="row" data-act="goto" data-n="person" data-kind="' + k + '" data-id="' + p.id + '"><div class="ico ' + (k === 'vendors' ? 'gold' : '') + '">' + esc(p.name.slice(0, 1).toUpperCase()) + '</div><div class="main"><div class="t">' + esc(p.name) + '</div><div class="s">' + esc(p.phone || 'No phone') + '</div></div><div class="end"><b class="' + b.c + '" style="font-size:14px">' + b.t + '</b></div></div>'; }).join('') ||
      empty(k === 'customers' ? 'users' : 'truck', 'No ' + k + ' yet', 'Tap "+ Add" to add one.');
  };
  SCREENS.people = () => {
    const t = D.totals(), k = S.flt.people;
    return top('People', k === 'customers' ? 'Owed to you ' + money(t.customerDue) : 'You owe ' + money(t.vendorDue), { act: 'personNew', label: '+ Add' }) + '<div class="page">' +
      '<div class="seg">' + [['customers', 'Customers'], ['vendors', 'Vendors']].map(a => '<button class="' + (k === a[0] ? 'on' : '') + '" data-act="fltPeople" data-v="' + a[0] + '">' + a[1] + '</button>').join('') + '</div>' +
      '<div class="search"><input placeholder="Search name or phone" data-in="q" data-k="people" value="' + esc(S.q.people || '') + '"></div><div class="card" id="list">' + peopleList() + '</div></div>';
  };
  SCREENS.person = p => {
    const k = p.kind, pr = D.find(k, p.id), cust = k === 'customers';
    if (!pr) return top('Person', '') + '<div class="page">' + empty('users', 'Not found') + '</div>';
    const b = balLabel(k, pr.balance);
    return top(pr.name, pr.phone || (cust ? 'Customer' : 'Vendor')) + '<div class="page stagger">' +
      '<div class="hero"><small>' + (cust ? 'Customer account' : 'Vendor account') + '</small><div class="big">' + b.t + '</div><div class="sub"><span>' + (cust ? (pr.balance > 0 ? 'They owe you' : pr.balance < 0 ? 'You hold their advance' : 'All clear') : (pr.balance > 0 ? 'You owe them' : pr.balance < 0 ? 'They hold your advance' : 'All clear')) + '</span></div></div>' +
      '<div class="btns" style="margin-bottom:10px"><button class="btn primary" data-act="payOpen" data-kind="' + k + '" data-id="' + pr.id + '">' + ic('wallet') + (cust ? 'Receive' : 'Pay') + '</button><button class="btn gold" data-act="payOpen" data-kind="' + k + '" data-id="' + pr.id + '" data-adv="1">' + (cust ? 'Take advance' : 'Pay advance') + '</button></div>' +
      '<div class="btns" style="margin-bottom:10px">' + (cust ? '<button class="btn" data-act="custBill" data-id="' + pr.id + '">' + ic('receipt') + 'New bill</button><button class="btn" data-act="custOrder" data-id="' + pr.id + '">' + ic('clip') + 'Order</button>' : '<button class="btn" data-act="vendBuy" data-id="' + pr.id + '">' + ic('cart') + 'Buy stock</button>') +
      (pr.phone ? '<a class="btn" style="text-decoration:none" href="tel:' + esc(pr.phone) + '">' + ic('phone') + 'Call</a>' : '') + '</div>' +
      (cust && pr.balance > 0.005 && pr.phone ? '<button class="btn ghost block" style="margin-bottom:10px" data-act="remind" data-id="' + pr.id + '">Send reminder on WhatsApp</button>' : '') +
      (cust ? (pr.member ? '<div class="note green" style="display:flex;gap:10px;align-items:center;justify-content:space-between"><span><b>Family Member</b><br>Card ' + maskNo(pr.member.no) + '</span><button class="btn sm primary" data-act="goto" data-n="card" data-id="' + pr.id + '">View card</button></div>' : '<button class="btn gold block" style="margin-bottom:10px" data-act="cardIssue" data-id="' + pr.id + '">Make Family Member (card)</button>') : '') +
      '<div class="btns" style="margin-bottom:14px"><button class="btn ghost" data-act="personEdit" data-kind="' + k + '" data-id="' + pr.id + '">Edit</button><button class="btn danger" data-act="personDel" data-kind="' + k + '" data-id="' + pr.id + '">Remove</button></div>' +
      '<div class="card"><h3>History</h3>' + (pr.ledger.slice().reverse().slice(0, 60).map(e => '<div class="row" style="cursor:default"><div class="main"><div class="t">' + esc(e.desc) + '</div><div class="s">' + fmtDate(e.date) + (e.method ? ' · ' + esc(e.method) : '') + '</div></div><div class="end"><b class="' + (e.amt > 0 ? 'neg' : 'pos') + '">' + (e.amt > 0 ? '+' : '-') + money(Math.abs(e.amt)) + '</b><div class="s">Balance ' + money(e.bal) + '</div>' + (['opening', 'payment', 'advance'].includes(e.type) && !e.ref ? '<button class="btn sm danger" style="margin-top:4px" data-act="ledDel" data-kind="' + k + '" data-p="' + pr.id + '" data-e="' + e.id + '">Delete</button>' : '') + '</div></div>').join('') || '<div class="empty" style="padding:14px">No history yet</div>') + '</div></div>';
  };

  /* ---------- MORE / REPORTS / SETTINGS ---------- */
  SCREENS.more = () => top('More', 'Everything else') + '<div class="page"><div class="card">' +
    [['pack', 'blue', 'Pack Products', 'Turn raw material into packets', 'pack'], ['wallet', 'green', 'Investors & Expenses', 'Investors, shop building costs, PDF statement', 'fund'], ['clip', 'gold', 'Orders', 'Customer and vendor orders, pre-orders with advance', 'orders'], ['users', 'gold', 'Family Cards', 'Members and member discount', 'cards'], ['receipt', '', 'All bills', 'Search old bills', 'invoices'], ['clip', '', 'Packing history', 'What you packed before', 'packings'], ['chart', '', 'Reports', 'Sales, profit, cash', 'reports'], ['gear', '', 'Settings & backup', 'Logo, address, backup', 'settings']]
      .map(a => '<div class="row" data-act="goto" data-n="' + a[4] + '"><div class="ico ' + a[1] + '">' + ic(a[0]) + '</div><div class="main"><div class="t">' + a[2] + '</div><div class="s">' + a[3] + '</div></div></div>').join('') + '</div></div>';

  /* ---------- INVESTORS & SHOP EXPENSES ---------- */
  const METHODS = ['Cash', 'UPI', 'Bank'];
  const WORK_HINTS = ['Mason work', 'Electric work', 'Plumbing', 'Carpentry', 'Painting', 'Flooring', 'Shutter / door', 'Furniture', 'Lighting', 'Signboard', 'Food', 'Local staff', 'Vehicle hire', 'Other'];
  const fld = (id, label, val, type, ph, extra) => '<div class="field"><label>' + label + '</label><input id="' + id + '" ' + (type === 'number' ? 'type="number" inputmode="decimal" step="any" ' : type === 'date' ? 'type="date" ' : '') + 'value="' + esc(val == null ? '' : val) + '" placeholder="' + esc(ph || '') + '" ' + (extra || '') + '></div>';
  const sel = (id, label, opts, val) => '<div class="field"><label>' + label + '</label><select id="' + id + '">' + opts.map(o => '<option value="' + esc(o[0]) + '"' + (o[0] === val ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></div>';
  const invTotal = id => D.r2(D.sum(D.state.deposits.filter(x => x.investorId === id).map(x => x.amount)));
  const headTotal = id => D.r2(D.sum(D.state.spends.filter(x => x.headId === id).map(x => x.amount)));
  const initial = n => esc(String(n || '?').trim().slice(0, 1).toUpperCase());

  SCREENS.fund = () => {
    const t = D.fundSummary(), st = D.state;
    const invs = st.investors.map(i => ({ i, tot: invTotal(i.id) })).sort((a, b) => b.tot - a.tot);
    return top('Investors & Expenses', 'Shop building and setting up costs') + '<div class="page stagger">' +
      '<div class="hero"><small>Total invested</small><div class="big">' + money(t.invested) + '</div><div class="sub"><span>Spent ' + money(t.fundSpent) + '</span><span>In hand ' + money(t.balance) + '</span></div></div>' +
      '<div class="grid2"><div class="stat ' + (t.balance < 0 ? 'red' : 'green') + '"><small>Money in hand</small><b>' + money(t.balance) + '</b><small style="margin-top:3px">Invested − spent from fund</small></div><div class="stat gold"><small>Paid from own pocket</small><b>' + money(t.pocketSpent) + '</b><small style="margin-top:3px">Not taken from fund</small></div></div>' +
      '<div class="card"><h3>Investors <small>' + pl(invs.length, 'person', 'people') + '</small></h3>' +
      (invs.map(o => '<div class="row" data-act="goto" data-n="investor" data-id="' + o.i.id + '"><div class="ico gold">' + initial(o.i.name) + '</div><div class="main"><div class="t">' + esc(o.i.name) + '</div><div class="s">' + (t.invested > 0 ? (Math.round(o.tot / t.invested * 1000) / 10) + '% of total' : 'No money yet') + (o.i.phone ? ' · ' + esc(o.i.phone) : '') + '</div></div><div class="end"><b>' + money(o.tot) + '</b></div></div>').join('') || empty('users', 'No investors yet', 'Tap "Add investor" below.')) +
      '<div class="btns" style="margin-top:12px"><button class="btn gold" data-act="invNew">' + ic('plus') + 'Add investor</button><button class="btn" data-act="depNew">' + ic('wallet') + 'Add money</button></div></div>' +
      '<div class="card"><h3>Where the money went <small>Tap a head for details</small></h3>' +
      st.heads.map(h => { const n = st.spends.filter(x => x.headId === h.id).length; return '<div class="row" data-act="goto" data-n="head" data-id="' + h.id + '"><div class="ico ' + (h.extra ? 'blue' : 'green') + '">' + ic(h.extra ? 'cart' : 'box') + '</div><div class="main"><div class="t">' + esc(h.name) + '</div><div class="s">' + pl(n, 'entry', 'entries') + '</div></div><div class="end"><b>' + money(headTotal(h.id)) + '</b></div></div>'; }).join('') +
      '<div class="btns" style="margin-top:12px"><button class="btn" data-act="headNew">' + ic('plus') + 'Add a head</button><button class="btn gold" data-act="spendNew">' + ic('plus') + 'Add expense</button></div></div>' +
      '<button class="btn primary block" data-act="goto" data-n="stmt">' + ic('clip') + 'Statement (PDF)</button></div>';
  };

  SCREENS.investor = p => {
    const i = D.find('investors', p.id); if (!i) return top('Investor', '') + '<div class="page">' + empty('users', 'Not found') + '</div>';
    const l = D.state.deposits.filter(x => x.investorId === i.id).sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts), t = D.fundSummary(), tot = invTotal(i.id);
    return top(i.name, i.phone || 'Investor', { act: 'invEdit', label: 'Edit', attr: 'data-id="' + i.id + '"' }) + '<div class="page">' +
      '<div class="hero"><small>Invested by ' + esc(i.name) + '</small><div class="big">' + money(tot) + '</div><div class="sub"><span>' + (t.invested > 0 ? (Math.round(tot / t.invested * 1000) / 10) : 0) + '% of ' + money(t.invested) + '</span></div></div>' +
      (i.note ? '<div class="note">' + esc(i.note) + '</div>' : '') +
      '<button class="btn gold block" style="margin-bottom:12px" data-act="depNew" data-id="' + i.id + '">' + ic('plus') + 'Add money from ' + esc(i.name) + '</button>' +
      '<div class="card"><h3>Investment history <small>Tap to change</small></h3>' + (l.map(x => '<div class="row" data-act="depEdit" data-id="' + x.id + '"><div class="ico green">' + ic('wallet') + '</div><div class="main"><div class="t">' + fmtDate(x.date) + '</div><div class="s">' + esc(x.method) + (x.note ? ' · ' + esc(x.note) : '') + '</div></div><div class="end"><b class="pos">' + money(x.amount) + '</b></div></div>').join('') || empty('wallet', 'No money added yet')) + '</div></div>';
  };

  SCREENS.head = p => {
    const h = D.find('heads', p.id); if (!h) return top('Head', '') + '<div class="page">' + empty('box', 'Not found') + '</div>';
    const l = D.state.spends.filter(x => x.headId === h.id).sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);
    const works = {}; l.forEach(x => { const k = x.work.toLowerCase(); const o = works[k] || (works[k] = { work: x.work, total: 0, n: 0 }); o.total = D.r2(o.total + x.amount); o.n++; });
    const wl = Object.keys(works).map(k => works[k]).sort((a, b) => b.total - a.total), sp = D.specialists().filter(x => x.headId === h.id);
    const fundT = D.r2(D.sum(l.filter(x => x.source === 'fund').map(x => x.amount))), pocT = D.r2(D.sum(l.filter(x => x.source === 'pocket').map(x => x.amount)));
    return top(h.name, pl(l.length, 'entry', 'entries'), { act: 'spendNew', label: '+ Add', attr: 'data-id="' + h.id + '"' }) + '<div class="page">' +
      '<div class="hero"><small>Total spent on ' + esc(h.name) + '</small><div class="big">' + money(headTotal(h.id)) + '</div><div class="sub"><span>From fund ' + money(fundT) + '</span>' + (pocT ? '<span>Own pocket ' + money(pocT) + '</span>' : '') + '</div></div>' +
      (wl.length ? '<div class="card"><h3>Work-wise total</h3>' + wl.map(w => '<div class="row" style="cursor:default"><div class="main"><div class="t">' + esc(w.work) + '</div><div class="s">' + pl(w.n, 'payment') + '</div></div><div class="end"><b>' + money(w.total) + '</b></div></div>').join('') + '</div>' : '') +
      (sp.length ? '<div class="card"><h3>Who was paid</h3>' + sp.sort((a, b) => b.paid - a.paid).map(x => '<div class="row" style="cursor:default"><div class="main"><div class="t">' + esc(x.who) + '</div><div class="s">' + esc(x.work) + (x.agreed > 0 ? ' · Agreed ' + money(x.agreed) : '') + '</div></div><div class="end"><b>' + money(x.paid) + '</b>' + (x.due !== null ? (x.due > 0.005 ? '<span class="pill warn">Due ' + money(x.due) + '</span>' : '<span class="pill">Fully paid</span>') : '') + '</div></div>').join('') + '</div>' : '') +
      '<div class="card"><h3>All entries <small>Tap to change</small></h3>' + (l.map(x => '<div class="row ordrow" data-act="spendEdit" data-id="' + x.id + '"><div class="ico ' + (x.source === 'pocket' ? 'gold' : 'green') + '">' + ic('receipt') + '</div><div class="main"><div class="t">' + esc(x.work) + '</div><div class="s">' + (x.who ? esc(x.who) + ' · ' : '') + fmtDate(x.date) + ' · ' + esc(x.method) + '</div></div><div class="end"><b>' + money(x.amount) + '</b>' + (x.source === 'pocket' ? '<span class="pill warn">Own pocket</span>' : '') + '</div></div>').join('') || empty('receipt', 'No expenses yet', 'Tap "+ Add" to write the first one.')) + '</div>' +
      '<div class="btns" style="margin-bottom:10px"><button class="btn primary" data-act="headPdfAsk" data-id="' + h.id + '">' + ic('clip') + 'PDF of this head</button></div><div class="btns"><button class="btn ghost" data-act="headEdit" data-id="' + h.id + '">Rename this head</button>' + (l.length ? '' : '<button class="btn danger" data-act="headDel" data-id="' + h.id + '">Delete head</button>') + '</div></div>';
  };

  const monthStart = (d) => d.slice(0, 8) + '01';
  const firstDate = () => { const a = D.state.deposits.map(x => x.date).concat(D.state.spends.map(x => x.date)).sort(); return a[0] || D.today(); };
  SCREENS.stmt = () => {
    if (!S.st) S.st = { from: firstDate(), to: D.today() };
    const st = D.fundStatement(S.st.from, S.st.to), badRange = S.st.from > S.st.to;
    const kv = (a, b, cls) => '<div class="kv"><span>' + a + '</span><b class="' + (cls || '') + '">' + b + '</b></div>';
    return top('Statement', 'Download a PDF for any dates') + '<div class="page">' +
      '<div class="card"><h3>Choose the dates</h3><div class="two">' + fld('st-from', 'From', S.st.from, 'date') + fld('st-to', 'To', S.st.to, 'date') + '</div>' +
      '<div class="seg" style="margin:4px 0 12px"><button data-act="stmtQuick" data-v="all">All time</button><button data-act="stmtQuick" data-v="month">This month</button><button data-act="stmtQuick" data-v="last">Last month</button></div>' +
      '<button class="btn block" data-act="stmtShow">Show this period</button></div>' +
      (badRange ? '<div class="note bad">The "From" date is after the "To" date.</div>' : '<div class="card"><h3>' + fmtDate(S.st.from) + ' to ' + fmtDate(S.st.to) + '</h3>' +
        kv('Opening balance (fund)', money(st.opening)) + kv('Money invested in this period', '+ ' + money(st.invested), 'pos') + kv('Spent from fund', '− ' + money(st.fundSpent), 'neg') + kv('<b>Closing balance (fund)</b>', '<b>' + money(st.closing) + '</b>') +
        '<hr style="border:none;border-top:1px solid #e3e9e5;margin:10px 0">' + kv('Total spent in this period', money(st.spent)) + kv('Of which paid from own pocket', money(st.pocketSpent)) + kv('Total invested till ' + fmtDate(S.st.to), money(st.totalInvestedToDate)) +
        '<p class="mut" style="font-size:13px;margin-top:8px">' + pl(st.rows.length, 'entry', 'entries') + ' will be listed in the PDF.</p></div>') +
      '<div class="btns"><button class="btn primary" data-act="stmtPdf" data-m="save">' + ic('clip') + 'Download PDF</button><button class="btn gold" data-act="stmtPdf" data-m="share">' + ic('share') + 'Share PDF</button></div>' +
      (NATIVE ? '<p class="mut" style="font-size:13px;margin-top:10px">PDF is saved in: ECOLaver Business Management System / Downloads</p>' : '') + '</div>';
  };

  /* ----- the statement as pictures, then a PDF ----- */
  function headStatement(from, to, headId) {
    const st = D.fundStatement(from, to), h = D.find('heads', headId), rows = []; let run = 0;
    st.rows.filter(r => r.kind === 'out' && r.headId === headId).forEach(r => { run = D.r2(run + r.debit); rows.push(Object.assign({}, r, { balance: run, title: r.title.replace(/^[^:]*:\s*/, '') })); });
    const hh = st.heads.find(x => x.id === headId) || { total: 0, fund: 0, pocket: 0, works: [] };
    return { only: true, headName: h ? h.name : '', from, to, rows, total: hh.total, fund: hh.fund, pocket: hh.pocket, heads: [hh], specialists: st.specialists.filter(x => x.headId === headId), investors: [] };
  }
  function statementPages(st) {
    const s = D.state.settings, W = 1240, H = 1754, M = 70, F = 'system-ui, -apple-system, Roboto, Arial, sans-serif', GREEN = '#0a6b3a', INK = '#16261d', MUT = '#5d6b63';
    const pages = []; let c, x, y, hdrCb = null;
    const fit = (t, mw) => { t = String(t); if (x.measureText(t).width <= mw) return t; while (t.length > 1 && x.measureText(t + '…').width > mw) t = t.slice(0, -1); return t + '…'; };
    const wrap = (t, mw, maxLines) => {
      const words = String(t).split(/\s+/), lines = []; let cur = '';
      words.forEach(w => { const tt = cur ? cur + ' ' + w : w; if (x.measureText(tt).width <= mw || !cur) cur = tt; else { lines.push(cur); cur = w; } });
      if (cur) lines.push(cur);
      if (maxLines && lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = fit(lines[maxLines - 1] + '…', mw); }
      return lines;
    };
    const put = (t, px, py, font, color, align) => { x.font = font; x.fillStyle = color || INK; x.textAlign = align || 'left'; x.fillText(t, px, py); };
    return new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = logoSrc(); }).then(logo => {
      const newPage = first => {
        c = document.createElement('canvas'); c.width = W; c.height = H; x = c.getContext('2d'); pages.push(c);
        x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
        const bh = first ? 190 : 92, g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#011a0d'); g.addColorStop(1, '#0e7a42');
        x.fillStyle = g; x.fillRect(0, 0, W, bh); x.fillStyle = '#eec32f'; x.fillRect(0, bh, W, 6);
        const r = first ? 64 : 30, cx = M + r, cy = bh / 2;
        x.save(); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.closePath(); x.fillStyle = '#fff'; x.fill(); x.clip(); if (logo) x.drawImage(logo, cx - r, cy - r, r * 2, r * 2); x.restore();
        const tx = M + r * 2 + 26;
        put(fit(s.name || 'ECOLaver', 820), tx, first ? cy - 6 : cy + 11, 'bold ' + (first ? 46 : 30) + 'px ' + F, '#fff');
        if (first) {
          x.globalAlpha = .92;
          if (s.address) put(fit(s.address, 820), tx, cy + 30, '24px ' + F, '#fff');
          put(fit([s.phone ? 'Ph: ' + s.phone : '', s.email].filter(Boolean).join('   ·   '), 820), tx, cy + 62, '24px ' + F, '#fff');
          x.globalAlpha = 1;
        } else put('Investment & Expense Statement', W - M, cy + 10, '24px ' + F, '#fff', 'right');
        y = bh + 56;
        if (!first && hdrCb) hdrCb();
      };
      const need = h => { if (y + h > H - 110) newPage(false); };
      const section = t => { need(90); put(t, M, y + 10, 'bold 30px ' + F, GREEN); x.fillStyle = '#eec32f'; x.fillRect(M, y + 22, 90, 4); y += 62; };
      // ---- title
      newPage(true);
      put(st.only ? st.headName + ' - Expense Statement' : 'Investment & Expense Statement', M, y + 8, 'bold 40px ' + F, INK);
      put(fmtDate(st.from) + '  to  ' + fmtDate(st.to), M, y + 50, '27px ' + F, MUT);
      put('Prepared on ' + fmtDate(D.today()), W - M, y + 50, '24px ' + F, MUT, 'right');
      y += 96;
      // ---- summary
      const sumRows = st.only ? [['Total spent on ' + st.headName, money(st.total), 3], ['Paid from investors\' fund', money(st.fund), 4], ['Paid from own pocket', money(st.pocket), 4], ['Number of payments', String(st.rows.length), 4]] : [['Opening balance (fund)', money(st.opening), 0], ['Money invested in this period', '+ ' + money(st.invested), 1], ['Spent from fund', '- ' + money(st.fundSpent), 2], ['Closing balance (fund)', money(st.closing), 3],
        ['Total spent in this period', money(st.spent), 4], ['Of which paid from own pocket', money(st.pocketSpent), 4], ['Total invested till ' + fmtDate(st.to), money(st.totalInvestedToDate), 4]];
      need(sumRows.length * 48 + 40);
      x.fillStyle = '#f2f7f4'; x.beginPath(); x.roundRect ? x.roundRect(M, y - 12, W - M * 2, sumRows.length * 48 + 24, 18) : x.rect(M, y - 12, W - M * 2, sumRows.length * 48 + 24); x.fill();
      sumRows.forEach((r, i) => {
        const bold = r[2] === 3, py = y + 28 + i * 48;
        put(r[0], M + 28, py, (bold ? 'bold ' : '') + '27px ' + F, INK);
        put(r[1], W - M - 28, py, 'bold 27px ' + F, r[2] === 1 ? '#0a6b3a' : r[2] === 2 ? '#b3261e' : INK, 'right');
        if (i === 3 && !st.only) { x.fillStyle = '#d6e3db'; x.fillRect(M + 28, py + 14, W - M * 2 - 56, 2); }
      });
      y += sumRows.length * 48 + 56;
      // ---- investors
      if (st.investors.length) {
        section('Investors');
        const hdr = () => { x.fillStyle = '#e4f2ea'; x.fillRect(M, y - 28, W - M * 2, 46); put('Name', M + 14, y + 4, 'bold 24px ' + F, GREEN); put('In this period', 700, y + 4, 'bold 24px ' + F, GREEN, 'right'); put('Total invested', 960, y + 4, 'bold 24px ' + F, GREEN, 'right'); put('Share', W - M - 14, y + 4, 'bold 24px ' + F, GREEN, 'right'); y += 40; };
        hdr();
        st.investors.forEach(i => {
          need(52); put(fit(i.name, 500), M + 14, y + 8, '26px ' + F, INK); put(i.inPeriod ? money(i.inPeriod) : '-', 700, y + 8, '26px ' + F, INK, 'right'); put(money(i.total), 960, y + 8, 'bold 26px ' + F, INK, 'right'); put(i.pct + '%', W - M - 14, y + 8, '26px ' + F, INK, 'right');
          x.fillStyle = '#edf2ee'; x.fillRect(M, y + 24, W - M * 2, 1.5); y += 52;
        });
        need(52); put('Total', M + 14, y + 8, 'bold 26px ' + F, INK); put(money(st.invested), 700, y + 8, 'bold 26px ' + F, INK, 'right'); put(money(st.totalInvestedToDate), 960, y + 8, 'bold 26px ' + F, INK, 'right'); y += 70;
      }
      // ---- heads
      if (st.heads.length) {
        section('Where the money went');
        st.heads.forEach(h => {
          need(60 + Math.min(h.works.length, 2) * 44);
          x.fillStyle = '#e4f2ea'; x.fillRect(M, y - 30, W - M * 2, 50);
          put(fit(h.name, 700), M + 14, y + 4, 'bold 27px ' + F, GREEN); put(money(h.total), W - M - 14, y + 4, 'bold 27px ' + F, GREEN, 'right'); y += 46;
          h.works.forEach(w => { need(44); put(fit(w.work, 640), M + 40, y + 6, '25px ' + F, INK); put(pl(w.count, 'payment'), 860, y + 6, '22px ' + F, MUT, 'right'); put(money(w.total), W - M - 14, y + 6, '25px ' + F, INK, 'right'); y += 42; });
          if (h.pocket > 0) { need(40); put('Paid from own pocket: ' + money(h.pocket) + '   ·   From fund: ' + money(h.fund), M + 40, y + 4, 'italic 22px ' + F, MUT); y += 40; }
          y += 16;
        });
        y += 4;
      }
      // ---- contracts
      if (st.specialists.length) {
        section('Specialists: agreed amount and payment');
        const hdr = () => { x.fillStyle = '#e4f2ea'; x.fillRect(M, y - 28, W - M * 2, 46); put('Who / work', M + 14, y + 4, 'bold 24px ' + F, GREEN); put('Agreed', 760, y + 4, 'bold 24px ' + F, GREEN, 'right'); put('Paid', 960, y + 4, 'bold 24px ' + F, GREEN, 'right'); put('Due', W - M - 14, y + 4, 'bold 24px ' + F, GREEN, 'right'); y += 40; };
        hdr();
        st.specialists.forEach(sp => {
          need(80); put(fit(sp.who, 560), M + 14, y + 6, 'bold 25px ' + F, INK); put(fit(sp.headName + ': ' + sp.work, 560), M + 14, y + 36, '21px ' + F, MUT);
          put(money(sp.agreed), 760, y + 6, '25px ' + F, INK, 'right'); put(money(sp.paid), 960, y + 6, '25px ' + F, INK, 'right'); put(sp.due > 0.005 ? money(sp.due) : 'Paid', W - M - 14, y + 6, 'bold 25px ' + F, sp.due > 0.005 ? '#b3261e' : '#0a6b3a', 'right');
          x.fillStyle = '#edf2ee'; x.fillRect(M, y + 50, W - M * 2, 1.5); y += 76;
        });
        y += 20;
      }
      // ---- transactions
      need(200);
      section(st.only ? 'All payments, day by day' : 'All entries, day by day');
      const thead = () => {
        x.fillStyle = '#e4f2ea'; x.fillRect(M, y - 28, W - M * 2, 46);
        put('Date', M + 14, y + 4, 'bold 23px ' + F, GREEN); put('Details', 250, y + 4, 'bold 23px ' + F, GREEN); put(st.only ? '' : 'Money in', 840, y + 4, 'bold 23px ' + F, GREEN, 'right'); put(st.only ? 'Paid' : 'Money out', 1010, y + 4, 'bold 23px ' + F, GREEN, 'right'); put(st.only ? 'Total so far' : 'Balance', W - M - 14, y + 4, 'bold 23px ' + F, GREEN, 'right'); y += 44;
      };
      hdrCb = thead; thead();
      if (!st.only) { need(60); put('Opening balance', 250, y + 6, 'italic 24px ' + F, MUT); put(money(st.opening), W - M - 14, y + 6, 'bold 24px ' + F, INK, 'right'); y += 50; }
      st.rows.forEach(r => {
        x.font = '25px ' + F; const t1 = wrap(r.title, 560, 2); x.font = '21px ' + F; const t2 = wrap(r.sub, 560, 2), h = 20 + t1.length * 32 + t2.length * 27 + 12;
        need(h);
        put(fmtDate(r.date), M + 14, y + 6, '23px ' + F, INK);
        t1.forEach((l, i) => put(l, 250, y + 6 + i * 32, '25px ' + F, INK));
        t2.forEach((l, i) => put(l, 250, y + 6 + t1.length * 32 + i * 27 - 4, '21px ' + F, MUT));
        if (r.credit) put(money(r.credit), 840, y + 6, '25px ' + F, '#0a6b3a', 'right');
        if (r.debit) put(money(r.debit), 1010, y + 6, '25px ' + F, r.pocket ? MUT : '#b3261e', 'right');
        put(money(r.balance), W - M - 14, y + 6, 'bold 25px ' + F, INK, 'right');
        x.fillStyle = '#edf2ee'; x.fillRect(M, y + h - 26, W - M * 2, 1.5); y += h;
      });
      if (!st.rows.length) { need(50); put('No entries in this period.', 250, y + 6, 'italic 25px ' + F, MUT); y += 50; }
      need(120);
      x.fillStyle = '#012313'; x.fillRect(M, y - 6, W - M * 2, 4); y += 40;
      put(st.only ? 'Total spent' : 'Closing balance (fund)', M + 14, y, 'bold 30px ' + F, INK); put(money(st.only ? st.total : st.closing), W - M - 14, y, 'bold 34px ' + F, GREEN, 'right'); y += 44;
      put('Amounts paid from the owner\'s own pocket are listed but do not reduce the fund balance.', M + 14, y, 'italic 21px ' + F, MUT);
      // ---- footers
      pages.forEach((p, i) => { const k = p.getContext('2d'); k.fillStyle = MUT; k.font = '21px ' + F; k.textAlign = 'left'; k.fillText((s.name || '') + ' · ' + (st.only ? st.headName + ' Statement' : 'Investment & Expense Statement'), M, H - 50); k.textAlign = 'right'; k.fillText('Page ' + (i + 1) + ' of ' + pages.length, W - M, H - 50); });
      return pages;
    });
  }
  const b64ToBytes = b => { const bin = atob(b), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  const bytesToB64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  async function statementPdf(from, to, headId) {
    const st = headId ? headStatement(from, to, headId) : D.fundStatement(from, to), pages = await statementPages(st);
    const jp = pages.map(p => ({ w: p.width, h: p.height, jpeg: b64ToBytes(p.toDataURL('image/jpeg', 0.92).split(',')[1]) }));
    return { bytes: window.makePdf(jp, 'Statement ' + from + ' to ' + to), pages: pages.length, name: 'ECOLaver-' + (headId ? st.headName.replace(/[^A-Za-z0-9]+/g, '-') + '-' : 'Statement-') + from + '-to-' + to + '.pdf' };
  }
  const DL_DIR = 'ECOLaver Business Management System/Downloads';
  async function saveBinaryToFolder(name, b64) {
    const fs = plug('Filesystem'), sa = plug('StorageAccess'), path = DL_DIR + '/' + name;
    if (sa) {
      let g = true; try { g = (await sa.check()).granted; } catch (e) { }
      if (!g) {
        const ok = await confirmSheet({ title: 'Allow folder access', text: 'To save the PDF in your "ECOLaver Business Management System" folder, Android needs your permission.\n\nTap Allow, then switch ON "Allow access to manage all files" for ECOLaver. Then come back and tap Download PDF again.', ok: 'Allow' });
        if (ok) { try { await sa.open(); } catch (e) { toast('Open phone Settings > Apps > ECOLaver > Permissions and allow all files access', 1); } }
        return null;
      }
    }
    try { await fs.writeFile({ path, data: b64, directory: 'EXTERNAL_STORAGE', recursive: true }); return path; }
    catch (e1) { try { await fs.writeFile({ path, data: b64, directory: 'DOCUMENTS', recursive: true }); return 'Documents/' + path; } catch (e2) { return ''; } }
  }

  /* ----- forms (sheets) ----- */
  function invSheet(id) {
    const i = id ? D.find('investors', id) : null;
    openSheet('<h2>' + (i ? 'Edit investor' : 'New investor') + '</h2>' + fld('iv-name', 'Name', i ? i.name : '', 'text') + fld('iv-phone', 'Phone (optional)', i ? i.phone : '', 'text', '', 'type="tel" inputmode="tel"') + fld('iv-note', 'Note (optional)', i ? i.note : '', 'text') +
      (i ? '' : fld('iv-amt', 'Money put in now (₹, optional)', '', 'number', '0')) +
      '<button class="btn primary block" data-act="invSave" data-id="' + (id || '') + '">Save</button>' + (i ? '<button class="btn danger block" style="margin-top:8px" data-act="invDel" data-id="' + id + '">Delete investor</button>' : ''));
  }
  function depSheet(investorId, depId) {
    const d = depId ? D.find('deposits', depId) : null, invs = D.state.investors;
    if (!invs.length) { toast('Add an investor first', 1); return; }
    const cur = d ? d.investorId : (investorId || invs[0].id);
    openSheet('<h2>' + (d ? 'Change investment' : 'Add money') + '</h2>' + sel('dp-inv', 'Investor', invs.map(i => [i.id, i.name]), cur) + fld('dp-amt', 'Amount (₹)', d ? d.amount : '', 'number', '0') + fld('dp-date', 'Date', d ? d.date : D.today(), 'date') + sel('dp-m', 'How was it paid?', METHODS.map(m => [m, m]), d ? d.method : 'Cash') + fld('dp-note', 'Note (optional)', d ? d.note : '', 'text') +
      '<button class="btn primary block" data-act="depSave" data-id="' + (depId || '') + '">Save</button>' + (d ? '<button class="btn danger block" style="margin-top:8px" data-act="depDel" data-id="' + depId + '">Delete this entry</button>' : ''));
  }
  function spendSheet(headId, id) {
    const s = id ? D.find('spends', id) : null, hs = D.state.heads, t = D.fundSummary();
    const whos = Array.from(new Set(D.state.spends.map(x => x.who).filter(Boolean)));
    openSheet('<h2>' + (s ? 'Change expense' : 'New expense') + '</h2>' + sel('sp-head', 'Head', hs.map(h => [h.id, h.name]), s ? s.headId : (headId || hs[0].id)) +
      fld('sp-work', 'Work / what for', s ? s.work : '', 'text', 'e.g. Electric work, Food', 'list="sp-wl"') + '<datalist id="sp-wl">' + WORK_HINTS.concat(Array.from(new Set(D.state.spends.map(x => x.work)))).map(w => '<option value="' + esc(w) + '">').join('') + '</datalist>' +
      fld('sp-who', 'Paid to (person / specialist)', s ? s.who : '', 'text', 'Name', 'list="sp-wh"') + '<datalist id="sp-wh">' + whos.map(w => '<option value="' + esc(w) + '">').join('') + '</datalist>' +
      '<div class="two">' + fld('sp-amt', 'Amount (₹)', s ? s.amount : '', 'number', '0') + fld('sp-date', 'Date', s ? s.date : D.today(), 'date') + '</div>' +
      '<div class="two">' + sel('sp-src', 'Paid from', [['fund', "Investors' fund"], ['pocket', 'My own pocket']], s ? s.source : 'fund') + sel('sp-m', 'How?', METHODS.map(m => [m, m]), s ? s.method : 'Cash') + '</div>' +
      '<div class="hint" style="margin:-6px 0 10px">Money in hand now: ' + money(t.balance) + '. "Own pocket" is counted as expense but does not reduce the fund.</div>' +
      fld('sp-agr', 'Agreed total for this work (₹, optional)', s && s.agreed ? s.agreed : '', 'number', 'Fix price with this person') +
      fld('sp-note', 'Note (optional)', s ? s.note : '', 'text') +
      '<button class="btn primary block" data-act="spSave" data-id="' + (id || '') + '">Save</button>' + (s ? '<button class="btn danger block" style="margin-top:8px" data-act="spDel" data-id="' + id + '">Delete this entry</button>' : ''));
  }
  function headSheet(id) {
    const h = id ? D.find('heads', id) : null;
    openSheet('<h2>' + (h ? 'Rename head' : 'New head') + '</h2>' + fld('hd-name', 'Head name', h ? h.name : '', 'text', 'e.g. Rent, Machines') + '<button class="btn primary block" data-act="hdSave" data-id="' + (id || '') + '">Save</button>');
  }

  /* ---------- FAMILY MEMBERSHIP CARD ---------- */
  SCREENS.cards = () => {
    const q = (S.q.cards || '').toLowerCase(), qd = q.replace(/\D/g, '');
    const all = D.state.customers.filter(c => c.member && !c.archived), r = D.report('0000-01-01', '9999-12-31');
    const l = all.filter(c => !q || c.name.toLowerCase().includes(q) || (qd && c.member.no.includes(qd))).sort((a, b) => b.member.since.localeCompare(a.member.since));
    return top('Family Cards', all.length + ' members · discount ' + D.state.settings.memberPct + '%') + '<div class="page">' +
      '<div class="grid2"><div class="stat green"><small>Members</small><b>' + all.length + '</b></div><div class="stat gold"><small>Card fees earned</small><b>' + money(r.cardIncome) + '</b></div></div>' +
      '<div class="search"><input placeholder="Find by name or mobile number" data-in="q" data-k="cards" value="' + esc(S.q.cards || '') + '"></div><div class="card" id="list">' + cardList(l) + '</div>' +
      '<button class="btn gold block" style="margin-top:6px" data-act="cardNew">' + ic('plus') + 'Make a new member</button></div>';
  };
  const cardList = l => l.map(c => '<div class="row" data-act="goto" data-n="card" data-id="' + c.id + '"><div class="ico gold">' + esc(c.name.slice(0, 1).toUpperCase()) + '</div><div class="main"><div class="t">' + esc(c.name) + '</div><div class="s">' + maskNo(c.member.no) + ' · since ' + fmtDate(c.member.since) + '</div></div><div class="end"><span class="pill">Member</span></div></div>').join('') || empty('users', 'No members found', 'Open a customer and tap "Make Family Member".');
  SCREENS.card = p => {
    const c = D.find('customers', p.id);
    if (!c || !c.member) return top('Family Card', '') + '<div class="page">' + empty('users', 'Not a member') + '</div>';
    const spent = D.sum(D.state.invoices.filter(i => !i.void && i.customerId === c.id).map(i => i.total)), saved = D.sum(D.state.invoices.filter(i => !i.void && i.customerId === c.id).map(i => i.memberDiscount || 0));
    return top('Family Card', c.name) + '<div class="page stagger">' +
      '<div class="fcard"><div class="fc-top"><div class="fc-logo">' + logoHtml() + '</div><div><b>' + esc(D.state.settings.name) + '</b><small>Family Membership Card</small></div></div>' +
      '<div class="fc-no">' + maskNo(c.member.no) + '</div><div class="fc-bot"><div><div class="fc-name">' + esc(c.name) + '</div><small>Member since ' + fmtDate(c.member.since) + '</small></div><div class="fc-qr">' + qrSvg(c.member.no, 92) + '</div></div></div>' +
      '<div class="grid2"><div class="stat"><small>Total bought</small><b>' + money(spent) + '</b></div><div class="stat green"><small>Member savings</small><b>' + money(saved) + '</b></div></div>' +
      '<div class="note">The QR holds only the mobile number. Staff can find the member by typing it in <b>Family Cards</b>. Discount: ' + D.state.settings.memberPct + '% on all products, or the percent set on each raw material.</div>' +
      '<div class="btns"><button class="btn gold" data-act="cardShare" data-id="' + c.id + '">' + ic('share') + 'Share card</button><button class="btn" data-act="goto" data-n="person" data-kind="customers" data-id="' + c.id + '">' + ic('user') + 'Customer</button></div>' +
      '<button class="btn danger block" style="margin-top:10px" data-act="cardRevoke" data-id="' + c.id + '">Cancel membership</button></div>';
  };

  function range(f) {
    const t = D.today();
    if (f === 'today') return [t, t];
    if (f === 'week') { const d = new Date(); d.setDate(d.getDate() - 6); return [D.localDate(d), t]; }
    if (f === 'month') return [t.slice(0, 8) + '01', t];
    return ['0000-01-01', '9999-12-31'];
  }
  const PERIOD = { today: 'Today', week: 'Last 7 days', month: 'This month', all: 'All time' };
  const periodSeg = f => '<div class="seg">' + [['today', 'Today'], ['week', '7 days'], ['month', 'This month'], ['all', 'All time']].map(a => '<button class="' + (f === a[0] ? 'on' : '') + '" data-act="fltRep" data-v="' + a[0] + '">' + a[1] + '</button>').join('') + '</div>';
  const rtile = (cls, label, val, k, hint) => '<div class="stat ' + cls + '" data-act="goto" data-n="repDetail" data-kind="' + k + '"><small>' + label + '</small><b>' + val + '</b>' + (hint ? '<small style="margin-top:3px">' + hint + '</small>' : '') + '</div>';
  const rrow = (k, label, hint, val, cls) => '<div class="row" data-act="goto" data-n="repDetail" data-kind="' + k + '"><div class="main"><div class="t">' + label + '</div><div class="s">' + hint + '</div></div><div class="end"><b class="' + (cls || '') + '">' + val + '</b></div></div>';
  SCREENS.reports = () => {
    const f = S.flt.rep, r = D.report.apply(null, range(f)), t = D.totals();
    const nOwe = D.state.customers.filter(c => c.balance > 0.005).length, nPay = D.state.vendors.filter(v => v.balance > 0.005).length;
    return top('Reports', 'Tap any number to see the details') + '<div class="page stagger">' + periodSeg(f) +
      '<div class="hero" data-act="goto" data-n="repDetail" data-kind="profit" style="cursor:pointer"><small>Profit · ' + PERIOD[f] + '</small><div class="big">' + money(r.profit) + '</div><div class="sub"><span>Sales ' + money(r.sales) + '</span><span>− Cost ' + money(r.cogs) + '</span></div></div>' +
      '<div class="grid2">' + rtile('', 'Sales', money(r.sales), 'sales', pl(r.bills, 'bill')) + rtile('green', 'Cash in', money(r.cashIn), 'cashin', 'Money received') + rtile('red', 'Cash out', money(r.cashOut), 'cashout', 'Money paid') + rtile('gold', 'Stock bought', money(r.purchases), 'bought', 'Purchase value') + '</div>' +
      '<div class="card"><h3>Money position now <small>not affected by the date above</small></h3>' +
      rrow('owe', 'Customers owe you', nOwe + (nOwe === 1 ? ' customer' : ' customers') + ' · money to receive', money(t.customerDue), 'neg') +
      rrow('payable', 'You owe vendors', nPay + (nPay === 1 ? ' vendor' : ' vendors') + ' · money to pay', money(t.vendorDue), 'neg') +
      rrow('custadv', 'Advance taken from customers', 'You must deliver goods for this', money(t.customerAdvance)) +
      rrow('vendadv', 'Advance given to vendors', 'Vendors must give you goods for this', money(t.vendorAdvance)) +
      rrow('stockval', 'Stock worth', 'All goods you hold, at your cost', money(t.stockValue)) + '</div>' +
      '<div class="card"><h3>More reports <small>' + PERIOD[f] + '</small></h3>' +
      rrow('cogs', 'Cost of goods sold', 'What the sold goods cost you', money(r.cogs)) +
      rrow('discount', 'Discount given', 'Bills where you gave discount', money(r.discount)) +
      rrow('items', 'Profit by item', 'Which item earns the most', '') +
      rrow('daily', 'Day by day sales', 'Sales and profit for each day', '') +
      rrow('custsales', 'Sales by customer', 'Who bought how much', '') +
      rrow('vendbuy', 'Buying by vendor', 'How much you bought from whom', '') +
      rrow('expenses', 'Extra costs', 'Transport, food and other costs', '') +
      rrow('cards', 'Family cards', r.cards + ' new in this period · fees ' + money(r.cardIncome), '') + '</div></div>';
  };

  function repBody(k, f, from, to) {
    const st = D.state, inv = st.invoices.filter(i => !i.void && i.date >= from && i.date <= to).sort((x, y) => y.ts - x.ts);
    const pur = st.purchases.filter(p => p.date >= from && p.date <= to).sort((x, y) => y.ts - x.ts);
    const sumTop = (label, val, cls) => '<div class="hero"><small>' + label + '</small><div class="big">' + val + '</div></div>';
    const none = (t, s) => empty('chart', t, s || '');
    const grp = (list, keyF) => { const m = {}; list.forEach(x => { const kk = keyF(x); (m[kk] || (m[kk] = [])).push(x); }); return Object.keys(m).map(kk => ({ key: kk, list: m[kk] })); };
    const bill = i => '<div class="row" data-act="goto" data-n="invoice" data-id="' + i.id + '"><div class="main"><div class="t">' + esc(i.customerName) + '</div><div class="s">' + esc(i.no) + ' · ' + fmtDate(i.date) + '</div></div><div class="end"><b>' + money(i.total) + '</b><div class="s">Profit ' + money(i.profit) + '</div></div></div>';
    const byItem = () => { const o = {}; inv.forEach(i => i.lines.forEach(l => { const x = o[l.itemId] || (o[l.itemId] = { name: l.name, amount: 0, cost: 0, qty: 0, unit: l.unit }); x.amount += (i.subtotal > 0 ? l.amount * i.total / i.subtotal : l.amount); x.cost += l.cost; x.qty += (l.qty || 0); })); return Object.values(o).sort((p, q) => (q.amount - q.cost) - (p.amount - p.cost)); };
    const person = (kk, p, hint, val, cls) => '<div class="row" data-act="goto" data-n="person" data-kind="' + kk + '" data-id="' + p.id + '"><div class="ico">' + esc(p.name.slice(0, 1).toUpperCase()) + '</div><div class="main"><div class="t">' + esc(p.name) + '</div><div class="s">' + hint + '</div></div><div class="end"><b class="' + (cls || '') + '">' + val + '</b></div></div>';
    const flow = (x, outgoing) => '<div class="row" style="cursor:default"><div class="main"><div class="t">' + esc(x.who) + '</div><div class="s">' + esc(x.what || '') + ' · ' + fmtDate(x.date) + (x.method ? ' · ' + esc(x.method) : '') + '</div></div><div class="end"><b class="' + (x.amt < 0 ? 'neg' : (outgoing ? '' : 'pos')) + '">' + (x.amt < 0 ? '−' : '') + money(Math.abs(x.amt)) + '</b></div></div>';
    let title = '', sub = PERIOD[f], h = '';
    if (k === 'sales') {
      title = 'Sales'; h = sumTop('Total sales · ' + PERIOD[f], money(D.r2(D.sum(inv.map(i => i.total))))) + '<div class="card"><h3>' + pl(inv.length, 'bill') + '</h3>' + (inv.map(bill).join('') || none('No bills in this period')) + '</div>';
    } else if (k === 'profit') {
      const sales = D.r2(D.sum(inv.map(i => i.total))), cogs = D.r2(D.sum(inv.map(i => i.cogs)));
      title = 'Profit'; h = sumTop('Profit · ' + PERIOD[f], money(D.r2(sales - cogs))) +
        '<div class="card"><h3>How profit is worked out</h3><div class="kv"><span>Sales (bills total)</span><b>' + money(sales) + '</b></div><div class="kv"><span>Cost of the goods you sold</span><b>− ' + money(cogs) + '</b></div><div class="kv"><span><b>Profit</b></span><b>' + money(D.r2(sales - cogs)) + '</b></div><p class="mut" style="font-size:13px;margin-top:10px">Cost includes the extra costs you added while buying (transport, food...) and the packing cost. Discount is already taken off the sales.</p></div>' +
        '<div class="card"><h3>Profit by item</h3>' + (byItem().map(x => '<div class="row" style="cursor:default"><div class="main"><div class="t">' + esc(x.name) + '</div><div class="s">Sold ' + money(D.r2(x.amount)) + ' · Cost ' + money(D.r2(x.cost)) + '</div></div><div class="end"><b class="' + (x.amount - x.cost < 0 ? 'neg' : 'pos') + '">' + money(D.r2(x.amount - x.cost)) + '</b></div></div>').join('') || none('No sales in this period')) + '</div>';
    } else if (k === 'items') {
      title = 'Profit by item'; h = '<div class="card">' + (byItem().map(x => '<div class="row" style="cursor:default"><div class="main"><div class="t">' + esc(x.name) + '</div><div class="s">Sold ' + money(D.r2(x.amount)) + ' · Cost ' + money(D.r2(x.cost)) + ' · ' + (x.amount > 0 ? Math.round((x.amount - x.cost) / x.amount * 100) : 0) + '% margin</div></div><div class="end"><b class="' + (x.amount - x.cost < 0 ? 'neg' : 'pos') + '">' + money(D.r2(x.amount - x.cost)) + '</b></div></div>').join('') || none('No sales in this period')) + '</div>';
    } else if (k === 'cogs') {
      title = 'Cost of goods sold'; h = sumTop('What the sold goods cost you', money(D.r2(D.sum(inv.map(i => i.cogs))))) + '<div class="card"><h3>By item</h3>' + (byItem().map(x => '<div class="row" style="cursor:default"><div class="main"><div class="t">' + esc(x.name) + '</div><div class="s">Sold for ' + money(D.r2(x.amount)) + '</div></div><div class="end"><b>' + money(D.r2(x.cost)) + '</b></div></div>').join('') || none('No sales in this period')) + '</div>';
    } else if (k === 'discount') {
      const l = inv.filter(i => i.discount > 0.005);
      title = 'Discount given'; h = sumTop('Total discount · ' + PERIOD[f], money(D.r2(D.sum(l.map(i => i.discount))))) + '<div class="card"><h3>' + pl(l.length, 'bill') + ' with discount</h3>' + (l.map(i => '<div class="row" data-act="goto" data-n="invoice" data-id="' + i.id + '"><div class="main"><div class="t">' + esc(i.customerName) + '</div><div class="s">' + esc(i.no) + ' · ' + fmtDate(i.date) + (i.memberDiscount ? ' · member ' + money(i.memberDiscount) : '') + '</div></div><div class="end"><b>' + money(i.discount) + '</b></div></div>').join('') || none('No discount in this period')) + '</div>';
    } else if (k === 'cashin' || k === 'cashout') {
      const cf = D.cashFlow(from, to), out = k === 'cashout', l = out ? cf.outs : cf.ins, tot = out ? cf.totalOut : cf.totalIn, mm = {};
      l.forEach(x => { const m = x.method || 'Other'; mm[m] = D.r2((mm[m] || 0) + x.amt); });
      title = out ? 'Cash out' : 'Cash in';
      h = sumTop((out ? 'Money you paid · ' : 'Money you received · ') + PERIOD[f], money(tot)) +
        (Object.keys(mm).length > 1 ? '<div class="card"><h3>By payment method</h3>' + Object.keys(mm).map(m => '<div class="kv"><span>' + esc(m) + '</span><b>' + money(mm[m]) + '</b></div>').join('') + '</div>' : '') +
        '<div class="card"><h3>' + pl(l.length, 'entry', 'entries') + ' · newest first</h3>' + (l.map(x => flow(x, out)).join('') || none(out ? 'No payments made in this period' : 'No money received in this period')) + '</div>';
    } else if (k === 'bought') {
      title = 'Stock bought'; h = sumTop('Purchase value · ' + PERIOD[f], money(D.r2(D.sum(pur.map(p => p.total))))) + '<div class="card"><h3>' + pl(pur.length, 'purchase') + '</h3>' + (pur.map(pu => '<div class="row" data-act="purOpen" data-id="' + pu.id + '"><div class="main"><div class="t">' + esc(pu.vendorName) + '</div><div class="s">' + esc(pu.no) + ' · ' + fmtDate(pu.date) + ' · ' + pu.lines.map(l => esc(l.name)).join(', ') + '</div></div><div class="end"><b>' + money(pu.total) + '</b></div></div>').join('') || none('No purchases in this period')) + '</div>';
    } else if (k === 'expenses') {
      const l = pur.filter(p => p.extra > 0);
      title = 'Extra costs'; h = sumTop('Transport, food and others · ' + PERIOD[f], money(D.r2(D.sum(l.map(p => p.extra))))) + '<div class="card"><h3>' + pl(l.length, 'purchase') + ' with extra cost</h3>' + (l.map(p => '<div class="row" data-act="purOpen" data-id="' + p.id + '"><div class="main"><div class="t">' + esc((p.extras || []).filter(x => x.amount > 0).map(x => x.label || 'Extra').join(', ') || 'Extra cost') + '</div><div class="s">' + esc(p.no) + ' · ' + fmtDate(p.date) + '</div></div><div class="end"><b>' + money(p.extra) + '</b></div></div>').join('') || none('No extra costs in this period')) + '</div>';
    } else if (k === 'daily') {
      title = 'Day by day sales'; h = '<div class="card">' + (grp(inv, i => i.date).sort((x, y) => y.key.localeCompare(x.key)).map(g => '<div class="row" style="cursor:default"><div class="main"><div class="t">' + fmtDate(g.key) + '</div><div class="s">' + pl(g.list.length, 'bill') + ' · Profit ' + money(D.r2(D.sum(g.list.map(i => i.profit)))) + '</div></div><div class="end"><b>' + money(D.r2(D.sum(g.list.map(i => i.total)))) + '</b></div></div>').join('') || none('No sales in this period')) + '</div>';
    } else if (k === 'custsales') {
      title = 'Sales by customer'; h = '<div class="card">' + (grp(inv, i => i.customerName).sort((x, y) => D.sum(y.list.map(i => i.total)) - D.sum(x.list.map(i => i.total))).map(g => '<div class="row" style="cursor:default"><div class="main"><div class="t">' + esc(g.key) + '</div><div class="s">' + pl(g.list.length, 'bill') + '</div></div><div class="end"><b>' + money(D.r2(D.sum(g.list.map(i => i.total)))) + '</b></div></div>').join('') || none('No sales in this period')) + '</div>';
    } else if (k === 'vendbuy') {
      title = 'Buying by vendor'; h = '<div class="card">' + (grp(pur, p => p.vendorName).sort((x, y) => D.sum(y.list.map(p => p.total)) - D.sum(x.list.map(p => p.total))).map(g => '<div class="row" style="cursor:default"><div class="main"><div class="t">' + esc(g.key) + '</div><div class="s">' + pl(g.list.length, 'purchase') + '</div></div><div class="end"><b>' + money(D.r2(D.sum(g.list.map(p => p.total)))) + '</b></div></div>').join('') || none('No purchases in this period')) + '</div>';
    } else if (k === 'cards') {
      const l = st.customers.filter(c => c.member && c.member.since >= from && c.member.since <= to);
      title = 'Family cards'; h = sumTop('Card fees received · ' + PERIOD[f], money(D.r2(D.sum(l.map(c => c.member.fee))))) + '<div class="card"><h3>' + pl(l.length, 'new member') + '</h3>' + (l.map(c => person('customers', c, 'Card since ' + fmtDate(c.member.since), money(c.member.fee))).join('') || none('No new cards in this period')) + '</div>';
      sub = PERIOD[f];
    } else if (k === 'owe' || k === 'custadv') {
      const owe = k === 'owe', l = st.customers.filter(c => owe ? c.balance > 0.005 : c.balance < -0.005).sort((x, y) => Math.abs(y.balance) - Math.abs(x.balance));
      title = owe ? 'Customers owe you' : 'Advance from customers'; sub = 'Right now'; h = sumTop(owe ? 'Money to receive' : 'Advance you hold', money(D.r2(D.sum(l.map(c => Math.abs(c.balance)))))) + '<div class="card">' + (l.map(c => person('customers', c, esc(c.phone || 'No phone'), money(Math.abs(c.balance)), owe ? 'neg' : '')).join('') || none('Nobody')) + '</div>';
    } else if (k === 'payable' || k === 'vendadv') {
      const pay = k === 'payable', l = st.vendors.filter(v => pay ? v.balance > 0.005 : v.balance < -0.005).sort((x, y) => Math.abs(y.balance) - Math.abs(x.balance));
      title = pay ? 'You owe vendors' : 'Advance given to vendors'; sub = 'Right now'; h = sumTop(pay ? 'Money to pay' : 'Advance you gave', money(D.r2(D.sum(l.map(v => Math.abs(v.balance)))))) + '<div class="card">' + (l.map(v => person('vendors', v, esc(v.phone || 'No phone'), money(Math.abs(v.balance)), pay ? 'neg' : '')).join('') || none('Nobody')) + '</div>';
    } else if (k === 'stockval') {
      title = 'Stock worth'; sub = 'Right now';
      const val = i => Math.max(i.stock, 0) * i.cost, act = st.items.filter(i => !i.archived && i.stock > 0);
      h = sumTop('All goods at your cost', money(D.r2(D.sum(act.map(val))))) +
        [['raw', 'Raw material'], ['pack', 'Packaging'], ['product', 'Products and items']].map(g => { const l = act.filter(i => i.kind === g[0]).sort((x, y) => val(y) - val(x)); return l.length ? '<div class="card"><h3>' + g[1] + ' <small>' + money(D.r2(D.sum(l.map(val)))) + '</small></h3>' + l.map(i => '<div class="row" data-act="goto" data-n="item" data-id="' + i.id + '"><div class="main"><div class="t">' + esc(i.name) + '</div><div class="s">' + qf(i.stock) + ' ' + i.unit + ' × ' + money(D.r2(i.cost)) + '</div></div><div class="end"><b>' + money(D.r2(val(i))) + '</b></div></div>').join('') + '</div>' : ''; }).join('');
    }
    return top(title, sub) + '<div class="page stagger">' + (sub === 'Right now' ? '' : periodSeg(f)) + h + '</div>';
  }
  SCREENS.repDetail = p => { const f = S.flt.rep, r = range(f); return repBody(p.kind, f, r[0], r[1]); };

  SCREENS.settings = () => {
    const s = D.state.settings;
    return top('Settings', 'Shown on your bills') + '<div class="page"><div class="card"><h3>Business details</h3>' +
      '<div class="field"><label>Logo</label><div class="row" style="cursor:default;border:0"><div class="ico" style="width:60px;height:60px;border-radius:50%;overflow:hidden">' + logoHtml() + '</div><div class="main"><button class="btn sm" data-act="logoPick">Choose logo</button> ' + (s.logo ? '<button class="btn sm danger" data-act="logoDel">Use ECOLaver logo</button>' : '') + '</div></div><input type="file" id="logoFile" accept="image/*" class="hidden"></div>' +
      [['s-name', 'Company name', s.name], ['s-mpct', 'Family card: member discount % (all products)', s.memberPct], ['s-cfee', 'Family card fee (₹)', s.cardFee], ['s-tag', 'Tagline', s.tagline], ['s-addr', 'Address', s.address], ['s-phone', 'Phone', s.phone], ['s-email', 'Email (optional)', s.email], ['s-upi', 'UPI ID (optional, printed on bills with a balance)', s.upi], ['s-prefix', 'Bill number starts with', s.invoicePrefix], ['s-foot', 'Message at the bottom of the bill', s.footer]]
        .map(a => '<div class="field"><label>' + a[1] + '</label><input id="' + a[0] + '" value="' + esc(a[2]) + '"></div>').join('') +
      '<button class="btn primary block" data-act="setSave">Save</button></div>' +
      (NATIVE ? '<div class="card"><h3>App update <small>build ' + BUILD + '</small></h3>' + (S.upd ? '<div class="note green">A new version is available (build ' + S.upd.build + ').</div><button class="btn primary block" data-act="updNow">Update now</button>' : '<p class="mut" style="margin-bottom:12px;font-size:14px">Your app is up to date.</p><button class="btn block" data-act="updCheck">Check for update</button>') + '</div>' : '') +
      '<div class="card"><h3>Backup</h3><p class="mut" style="margin-bottom:12px;font-size:14px">All data is stored on this phone only. Download a backup often and keep it safe, for example in Google Drive.' + (s.lastBackup ? ' Last backup: ' + fmtDate(s.lastBackup.slice(0, 10)) + '.' : ' You have not made a backup yet.') + '</p>' +
      '<div class="btns"><button class="btn gold" data-act="backup">Download backup</button><button class="btn" data-act="restorePick">Restore</button></div>' + (NATIVE ? '<div class="btns" style="margin-top:8px"><button class="btn" data-act="backupShare">Share backup (WhatsApp / Drive)</button></div><p class="mut" style="font-size:13px;margin-top:8px">Backups are saved in your phone storage: ECOLaver Business Management System / Backup</p>' : '') + '<input type="file" id="restoreFile" accept=".json,application/json" class="hidden"></div>' +
      '<div class="card"><h3>Danger zone</h3><p class="mut" style="margin-bottom:12px;font-size:14px">Testing is over? Clear everything and start fresh.</p><button class="btn danger block" data-act="resetAll">Delete all business data</button><button class="btn ghost block" style="margin-top:8px" data-act="resetAll" data-full="1">Delete everything (including company details)</button></div></div>';
  };

  /* ---------- live updates (no re-render, keeps keyboard open) ---------- */
  const UPD = {
    bill() {
      const e = $('#btot'); if (!e) return;
      e.innerHTML = billTotals();
      const c = calcBill(S.bill), pi = $('#paidIn');
      if (pi && S.bill.paid === null && document.activeElement !== pi) pi.value = c.auto;
      const sv = $('#bsave'); if (sv) sv.textContent = c.total ? 'Save bill · ' + money(c.total) : 'Save bill';
    },
    order() { const e = $('#otot'); if (e) e.innerHTML = orderTotals(); },
    buy() {
      const e = $('#utot'); if (!e) return;
      const c = calcBuy(S.buy);
      e.innerHTML = buyTotals(c);
      S.buy.lines.forEach((l, i) => { const o = $('[data-out="info-' + i + '"]'); if (o) o.innerHTML = buyInfo(l, c); });
      const pi = $('#paidIn'); if (pi && S.buy.paid === null && document.activeElement !== pi) pi.value = c.paid;
    },
    pack() {
      const e = $('#ptot'); if (!e) return;
      e.innerHTML = packTotals();
      const pl = packNow();
      D.packGroups(S.pack.rawId).forEach(g => { const o = $('[data-out="pk-' + g.key + '"]'); if (o) o.textContent = packRowInfo(g, pl); });
    }
  };
  const LINES = { bill: () => sellLines('bill'), order: () => sellLines('order'), buy: buyLines };

  /* ---------- events ---------- */
  const ACT = {
    back() { if (!goBack()) tab('home'); },
    tab(el) {
      const t = el.dataset.t;
      if (t === 'bill') { if (cur.n === 'bill') return; S.stack = []; cur = { n: 'bill', p: {} }; draw(); } else tab(t);
    },
    goto(el) { go(el.dataset.n, { id: el.dataset.id, kind: el.dataset.kind }); },
    goPeople(el) { S.flt.people = el.dataset.v; tab('people'); },
    confYes() { const r = S.conf; S.conf = null; closeSheet(); if (r) r(true); },
    confNo() { closeSheet(); },
    method(el) { S[el.dataset.d].method = el.dataset.v; draw(true); },
    lineDel(el) { const d = el.dataset.d; S[d].lines.splice(+el.dataset.i, 1); $('#lines').innerHTML = LINES[d](); UPD[d](); },
    addLine(el) { pickItem(['raw', 'product'], id => addSellLine(el.dataset.d, id)); },
    pickDo(el) { const cb = S.pick.cb; closeSheet(); cb(el.dataset.id); },
    pickNew() { const pk = S.pick; personForm(pk.pk, null, { onDone: p => pk.cb(p.id) }); },
    /* bill */
    billCust() { pickPerson('customers', id => { S.bill.customerId = id; S.bill.paid = null; draw(true); }); },
    billClear() { S.bill = null; draw(); },
    paidFull() { S.bill.paid = null; draw(true); },
    paidNone() { S.bill.paid = '0'; draw(true); },
    async billSave() {
      const b = S.bill, c = calcBill(b);
      if (!c.n) return toast('Add at least one item', 1);
      try {
        const lines = b.lines.map(l => Object.assign({}, l));
        const issues = D.stockIssues(lines);
        if (issues.length) {
          const ok = await confirmSheet({ title: 'Not enough stock', text: issues.map(i => i.name + ': need ' + qf(i.need) + ' ' + i.unit + ', have ' + qf(i.have)).join('\n') + '\n\nSell anyway? Stock will go below zero.', ok: 'Sell anyway' });
          if (!ok) return;
        }
        const inv = D.invoice({ customerId: b.customerId, walkName: b.walkName, lines, discount: c.disc, memberDiscount: c.memberDisc, memberNo: c.mem ? c.mem.no : '', paid: c.paid, method: b.method, orderId: b.orderId });
        S.bill = null;
        go('invoice', { id: inv.id, fresh: 1 }, true);
      } catch (e) { toast(e.message, 1); }
    },
    newBill() { S.bill = null; go('bill', {}, true); },
    async invShare(el) {
      const inv = D.find('invoices', el.dataset.id), txt = invText(inv);
      if (inv.customerPhone) return openLink(waLink(inv.customerPhone, txt));
      if (await shareNative({ title: 'Bill ' + inv.no, text: txt, dialogTitle: 'Send bill' })) return;
      if (navigator.share) navigator.share({ title: 'Bill ' + inv.no, text: txt }).catch(() => { });
      else openLink(waLink('', txt));
    },
    async invPrint(el) {
      if (!NATIVE) return window.print();
      try {
        const inv = D.find('invoices', el.dataset.id);
        toast('Making bill image...');
        const cv = await billCanvas(inv);
        await shareFile('bill-' + inv.no + '.png', cv.toDataURL('image/png').split(',')[1], false, 'Bill ' + inv.no);
      } catch (e) { toast(e.message, 1); }
    },
    async invVoid(el) {
      const ok = await confirmSheet({ title: 'Cancel this bill?', text: 'Stock will be added back and the customer account will be corrected. Any money paid is treated as refunded. The bill stays in the list marked Cancelled.', ok: 'Cancel bill', danger: true });
      if (!ok) return;
      try { D.voidInvoice(el.dataset.id); toast('Bill cancelled'); draw(true); } catch (e) { toast(e.message, 1); }
    },
    async invDel(el) {
      const ok = await confirmSheet({ title: 'Delete this bill?', text: 'The bill disappears completely, as if it was never made. Stock comes back and the customer account is corrected.', ok: 'Delete bill', danger: true });
      if (!ok) return;
      try { D.deleteInvoice(el.dataset.id); toast('Bill deleted'); if (!goBack()) tab('home'); } catch (e) { toast(e.message, 1); }
    },
    /* stock & items */
    itemEdit(el) { itemForm(el.dataset.id); },
    itemSave(el) {
      try {
        const id = el.dataset.id, it = D.item(id), v = s => $(s) ? $(s).value : null;
        D.updateItem(id, { name: v('#f-name') === null ? it.name : v('#f-name'), price: v('#f-price') === null ? it.price : v('#f-price'), low: v('#f-low'), cost: v('#f-cost') === null ? it.cost : v('#f-cost'), memberPct: v('#f-mp') === null ? it.memberPct : v('#f-mp') });
        closeSheet(); toast('Saved'); draw(true);
      } catch (e) { toast(e.message, 1); }
    },
    fsOpen(el) { fixStockSheet(el.dataset.id); },
    fsSave(el) { try { D.stockAdjust(el.dataset.id, $('#fs-v').value, $('#fs-r').value); closeSheet(); toast('Stock corrected'); draw(true); } catch (e) { toast(e.message, 1); } },
    async itemArchive(el) {
      const it = D.item(el.dataset.id);
      const ok = await confirmSheet({ title: 'Remove ' + it.name + '?', text: it.kind === 'raw' ? 'Its packaging and packed products are removed too. Old bills and history stay safe.' : 'It will be removed from the stock list. Old bills and history stay safe.', ok: 'Remove', danger: true });
      if (!ok) return; D.removeItem(it.id); toast('Removed'); if (!goBack()) tab('stock');
    },
    fltStock(el) { S.flt.stock = el.dataset.v; draw(true); },
    /* buy */
    buyStart(el) {
      const t = el.dataset.t;
      if (t === 'pack' && !D.rawItems().length) return toast('First buy a raw material, then its packaging', 1);
      S.buy = newBuy(t);
      go('buy');
    },
    buyMore(el) { S.buy = null; go('buy', { pre: el.dataset.id }); },
    buyAdd(el) {
      const t = el.dataset.t;
      if (t === 'pack' && !D.rawItems().length && !S.buy.lines.some(l => l.type === 'raw' && D.clean(l.name))) return toast('Add the raw material first', 1);
      S.buy.lines.push(newBuyLine(t)); $('#lines').innerHTML = buyLines(); UPD.buy();
      const ls = $$('#lines .line'); if (ls.length) ls[ls.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    exAdd() { S.buy.extras.push({ label: '', amt: '' }); $('#extras').innerHTML = extraRows(); UPD.buy(); },
    exDel(el) { S.buy.extras.splice(+el.dataset.i, 1); $('#extras').innerHTML = extraRows(); UPD.buy(); },
    buyClear() { S.buy = null; draw(); },
    buyPaidFull() { S.buy.paid = null; draw(true); },
    buyPaidNone() { S.buy.paid = '0'; draw(true); },
    buySave() {
      const b = S.buy, c = calcBuy(b);
      const mapped = b.lines.map(l => l.type === 'raw' ? { type: 'raw', name: l.name, unit: l.unit, qty: num(l.qty), rate: num(l.rate), total: D.r2(num(l.qty) * num(l.rate)) } :
        { type: 'pack', rawName: l.rawName, size: num(l.size), sizeUnit: l.sizeUnit, pname: l.pname, qty: num(l.qty), total: num(l.total) });
      if (b.mode === 'order') {
        try { D.vendorOrder({ vendor: b.from, lines: mapped, advance: num(b.advancePaid), method: b.method, expectedDate: b.expected }); S.buy = null; S.flt.ordk = 'vendors'; S.flt.orders = 'pending'; toast('Order saved'); go('orders', {}, true); } catch (e) { toast(e.message, 1); }
        return;
      }
      try {
        const pu = D.purchase({ orderId: b.orderId,
          from: b.from, extra: c.extra, extras: b.extras.map(e => ({ label: e.label, amount: num(e.amt) })), paid: c.paid, method: b.method,
          lines: b.lines.map(l => l.type === 'raw' ? { type: 'raw', name: l.name, unit: l.unit, qty: num(l.qty), total: D.r2(num(l.qty) * num(l.rate)) } :
            { type: 'pack', rawName: l.rawName, size: num(l.size), sizeUnit: l.sizeUnit, pname: l.pname, qty: num(l.qty), total: num(l.total) })
        });
        S.buy = null;
        openSheet('<div class="success"><div class="tick">' + ic('check') + '</div><b style="font-size:18px">Stock updated</b><p class="mut" style="margin:4px 0 12px">' + pu.no + ' · ' + money(pu.total) + '</p></div><div class="card" style="padding:8px 12px">' +
          pu.lines.map(l => '<div class="kv"><span>' + esc(l.name) + '</span><b>' + money(l.perUnit) + '/' + (l.kind === 'pack' ? 'pc' : l.unit) + '</b></div>').join('') + '</div><p class="mut" style="font-size:12.5px;margin-bottom:12px">Real cost of this purchase, including the shared extra cost.</p><button class="btn primary block" data-act="buyDone">Done</button>');
      } catch (e) { toast(e.message, 1); }
    },
    buyDone() { closeSheet(); S.flt.stock = 'all'; tab('stock'); },
    purOpen(el) {
      const pu = D.find('purchases', el.dataset.id);
      openSheet('<h2>' + pu.no + ' · ' + esc(pu.vendorName) + '</h2><p class="mut" style="margin-bottom:8px">' + fmtDate(pu.date) + '</p><div class="card" style="padding:8px 12px">' +
        pu.lines.map(l => '<div class="kv"><span>' + esc(l.name) + ' × ' + qf(l.qty) + ' ' + l.unit + '</span><b>' + money(l.total) + '</b></div>').join('') +
        (pu.extra ? '<div class="kv"><span>Extra costs (paid by you)</span><b>' + money(pu.extra) + '</b></div>' : '') + '<div class="kv"><span>Real total cost</span><b>' + money(pu.total) + '</b></div><div class="kv"><span>Paid to seller</span><b>' + money(pu.paid) + '</b></div></div>' +
        '<div class="btns"><button class="btn ghost" data-act="confNo">Close</button><button class="btn danger" data-act="purDel" data-id="' + pu.id + '">Delete</button></div>');
    },
    async purDel(el) {
      const id = el.dataset.id; closeSheet();
      const ok = await confirmSheet({ title: 'Delete this purchase?', text: 'The stock you added is taken out again and the vendor account is corrected.', ok: 'Delete', danger: true });
      if (!ok) return; try { D.deletePurchase(id); toast('Purchase deleted'); draw(true); } catch (e) { toast(e.message, 1); }
    },
    /* pack */
    packSave() {
      try {
        const b = D.pack({ rawId: S.pack.rawId, entries: packEntries(), extra: num(S.pack.extra) });
        S.pack = null;
        openSheet('<div class="success"><div class="tick">' + ic('check') + '</div><b style="font-size:18px">Packed</b><p class="mut" style="margin:4px 0 12px">Raw and packaging stock reduced automatically</p></div><div class="card" style="padding:8px 12px">' +
          b.entries.map(e => '<div class="kv"><span>' + esc(e.name) + ' × ' + e.count + '</span><b>' + money(e.unitCost) + ' each</b></div>').join('') + '</div><button class="btn primary block" data-act="packDone">Done</button>');
      } catch (e) { toast(e.message, 1); }
    },
    packDone() { closeSheet(); S.flt.stock = 'product'; tab('stock'); },
    batchOpen(el) {
      const b = D.find('batches', el.dataset.id);
      openSheet('<h2>' + esc(b.rawName) + ' · ' + fmtDate(b.date) + '</h2><div class="card" style="padding:8px 12px">' +
        b.entries.map(e => '<div class="kv"><span>' + esc(e.name) + '</span><b>' + e.count + ' pcs</b></div>').join('') +
        '<div class="kv"><span>' + esc(b.rawName) + ' used</span><b>' + qf(b.rawUsed) + ' ' + b.rawUnit + '</b></div>' +
        b.packUsed.map(u => '<div class="kv"><span>' + esc(u.name) + ' used</span><b>' + qf(u.qty) + ' pcs</b></div>').join('') + '</div>' +
        '<div class="btns"><button class="btn ghost" data-act="confNo">Close</button><button class="btn danger" data-act="batchUndo" data-id="' + b.id + '">Undo packing</button></div>');
    },
    async batchUndo(el) {
      const id = el.dataset.id; closeSheet();
      const ok = await confirmSheet({ title: 'Undo this packing?', text: 'Raw material and packaging come back to stock, and the packed products are taken out.', ok: 'Undo', danger: true });
      if (!ok) return; try { D.undoBatch(id); toast('Packing undone'); draw(true); } catch (e) { toast(e.message, 1); }
    },
    /* orders */
    vorderNew() { S.buy = newBuy('raw', 'order'); go('buy'); },
    cardIssue(el) {
      const c = D.find('customers', el.dataset.id);
      if (D.digits(c.phone).length < 10) return toast('Add a 10 digit mobile number to this customer first (tap Edit)', 1);
      openSheet('<h2>Make Family Member</h2><p class="mut" style="margin-bottom:12px">' + esc(c.name) + ' · card number is the mobile number ' + esc(D.digits(c.phone)) + '</p><div class="field"><label>Card fee received (₹)</label><input id="cf-fee" type="number" inputmode="decimal" value="' + D.state.settings.cardFee + '"></div><div class="field"><label>Paid by</label><select id="cf-m"><option>Cash</option><option>UPI</option><option>Card</option></select></div><button class="btn primary block" data-act="cardIssueDo" data-id="' + c.id + '">Make member</button>');
    },
    cardIssueDo(el) { try { D.issueCard(el.dataset.id, $('#cf-fee').value, $('#cf-m').value); closeSheet(); toast('Family card created'); go('card', { id: el.dataset.id }); } catch (e) { toast(e.message, 1); } },
    cardNew() { pickPerson('customers', id => { const c = D.find('customers', id); if (c.member) go('card', { id }); else ACT.cardIssue({ dataset: { id } }); }); },
    async cardRevoke(el) {
      const ok = await confirmSheet({ title: 'Cancel membership?', text: 'The card is removed and the card fee entry is removed from the customer account. Old bills stay as they are.', ok: 'Cancel membership', danger: true });
      if (!ok) return; D.revokeCard(el.dataset.id); toast('Membership cancelled'); if (!goBack()) tab('home');
    },
    async cardShare(el) {
      const c = D.find('customers', el.dataset.id);
      try {
        const cv = await cardCanvas(c);
        if (NATIVE) await shareFile('family-card-' + c.member.no.slice(-3) + '.png', cv.toDataURL('image/png').split(',')[1], false, 'Family Card');
        else { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'family-card.png'; document.body.appendChild(a); a.click(); a.remove(); }
      } catch (e) { toast(e.message, 1); }
    },
    orderReceipt(el) { closeSheet(); go('orderReceipt', { id: el.dataset.id }); },
    async rcShare(el) {
      const rc = receiptDoc(D.find('orders', el.dataset.id)), txt = invText(rc);
      if (rc.customerPhone) return openLink(waLink(rc.customerPhone, txt));
      if (await shareNative({ title: 'Receipt ' + rc.no, text: txt, dialogTitle: 'Send receipt' })) return;
      if (navigator.share) navigator.share({ title: 'Receipt ' + rc.no, text: txt }).catch(() => { }); else openLink(waLink('', txt));
    },
    async rcImage(el) {
      try {
        const rc = receiptDoc(D.find('orders', el.dataset.id));
        toast('Making receipt image...');
        const cv = await billCanvas(rc);
        if (NATIVE) await shareFile('receipt-' + rc.no + '.png', cv.toDataURL('image/png').split(',')[1], false, 'Receipt ' + rc.no);
        else { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'receipt-' + rc.no + '.png'; document.body.appendChild(a); a.click(); a.remove(); }
      } catch (e) { toast(e.message, 1); }
    },
    fltOrdK(el) { S.flt.ordk = el.dataset.v; draw(true); },
    orderNew() {
      openSheet('<h2>New order</h2><p class="mut" style="margin-bottom:12px;font-size:14px">Choose the kind of order</p>' +
        '<button class="btn gold block" data-act="orderNewC">' + ic('clip') + 'Pre-order from a customer</button><div class="hint" style="margin:4px 0 12px">Customer pays advance, you deliver later.</div>' +
        '<button class="btn primary block" data-act="orderNewV">' + ic('truck') + 'Pre-order to a vendor</button><div class="hint" style="margin-top:4px">You pay advance, vendor delivers later.</div>');
    },
    orderNewC() { closeSheet(); S.order = null; go('orderNew'); },
    orderNewV() { closeSheet(); S.buy = newBuy('raw', 'order'); go('buy'); },
    vorderOpen(el) {
      const o = D.find('vorders', el.dataset.id);
      openSheet('<h2>' + o.no + ' · ' + esc(o.vendorName) + '</h2><p class="mut" style="margin-bottom:8px">Ordered ' + fmtDate(o.date) + (o.expectedDate ? ' · Expected ' + fmtDate(o.expectedDate) : '') + '</p><div class="card" style="padding:8px 12px">' +
        o.lines.map(l => '<div class="kv"><span>' + esc(l.type === 'pack' ? l.rawName + ' ' + l.size + ' ' + l.sizeUnit + ' ' + (l.pname || 'Packet') : l.name) + ' × ' + qf(l.qty) + (l.type === 'pack' ? ' pcs' : ' ' + l.unit) + '</span><b>' + (lineTotal(l) ? money(D.r2(lineTotal(l))) : '') + '</b></div>').join('') +
        '<div class="kv"><span>Advance paid</span><b>' + money(o.advance) + '</b></div></div>' +
        (o.status === 'pending' ? '<div class="btns"><button class="btn danger" data-act="vorderCancel" data-id="' + o.id + '">Cancel</button><button class="btn primary" data-act="vorderReceive" data-id="' + o.id + '">Goods arrived</button></div>' : '') +
        (o.status !== 'received' ? '<button class="btn ghost block" style="margin-top:10px" data-act="vorderDel" data-id="' + o.id + '">Delete this order</button>' : '<p class="mut" style="font-size:13px">Received. To remove it, delete its purchase first.</p>'));
    },
    vorderReceive(el) {
      const o = D.find('vorders', el.dataset.id); closeSheet();
      const b = newBuy('raw');
      b.lines = o.lines.map(l => l.type === 'pack' ? { type: 'pack', rawName: l.rawName, size: String(l.size), sizeUnit: l.sizeUnit, pname: l.pname || '', qty: String(l.qty), total: l.total ? String(l.total) : '' } : { type: 'raw', name: l.name, unit: l.unit, qty: String(l.qty), rate: l.rate ? String(l.rate) : (l.total && l.qty ? String(D.r2(l.total / l.qty)) : '') });
      b.from = o.vendorName; b.orderId = o.id; b.advance = o.advance; b.method = o.method;
      S.buy = b; go('buy');
    },
    async vorderCancel(el) {
      const o = D.find('vorders', el.dataset.id); closeSheet();
      const ok = await confirmSheet({ title: 'Cancel this order?', text: o.advance ? 'The advance of ' + money(o.advance) + ' will be shown as returned in the vendor account.' : 'This order will be cancelled.', ok: 'Cancel order', danger: true });
      if (!ok) return; try { D.cancelVendorOrder(o.id); toast('Order cancelled'); draw(true); } catch (e) { toast(e.message, 1); }
    },
    async vorderDel(el) {
      const id = el.dataset.id; closeSheet();
      const ok = await confirmSheet({ title: 'Delete this order?', text: 'It disappears completely, and the advance entry is removed from the vendor account.', ok: 'Delete', danger: true });
      if (!ok) return; try { D.deleteVendorOrder(id); toast('Order deleted'); draw(true); } catch (e) { toast(e.message, 1); }
    },
    ordFree() {
      openSheet('<h2>Item not in stock yet</h2><div class="field"><label>Name</label><input id="of-n" placeholder="e.g. Ajwa Dates 1 kg"></div><div class="three"><div class="field"><label>Qty</label><input id="of-q" type="number" inputmode="decimal" value="1"></div><div class="field"><label>Unit</label><select id="of-u">' + D.UNITS.map(u => '<option>' + u + '</option>').join('') + '</select></div><div class="field"><label>Rate ₹</label><input id="of-r" type="number" inputmode="decimal"></div></div><button class="btn primary block" data-act="ordFreeAdd">Add</button>');
    },
    ordFreeAdd() {
      const n = D.clean($('#of-n').value); if (!n) return toast('Type the item name', 1);
      S.order.lines.push({ itemId: '', name: n, qty: $('#of-q').value || '1', unit: $('#of-u').value, rate: $('#of-r').value });
      closeSheet(); $('#lines').innerHTML = sellLines('order'); UPD.order();
    },
    orderCust() { pickPerson('customers', id => { S.order.customerId = id; draw(true); }); },
    orderSave() {
      const o = S.order;
      try {
        const c = calcOrder(o);
        const sv = D.order({ customerId: o.customerId, lines: o.lines.map(l => Object.assign({}, l)), discount: c.disc, memberDiscount: c.memberDisc, memberNo: c.mem ? c.mem.no : '', advance: num(o.advance), method: o.method, deliveryDate: o.deliveryDate });
        S.order = null; S.flt.orders = 'pending'; go('orderReceipt', { id: sv.id, fresh: 1 }, true);
      } catch (e) { toast(e.message, 1); }
    },
    fltOrders(el) { S.flt.orders = el.dataset.v; draw(true); },
    orderOpen(el) {
      const o = D.find('orders', el.dataset.id);
      openSheet('<h2>' + o.no + ' · ' + esc(o.customerName) + '</h2>' + (o.deliveryDate ? '<p class="mut" style="margin-bottom:8px">Deliver on ' + fmtDate(o.deliveryDate) + '</p>' : '') +
        '<div class="card" style="padding:8px 12px">' + o.lines.map(l => '<div class="kv"><span>' + esc(l.name) + ' × ' + qf(l.qty) + ' ' + l.unit + '</span><b>' + money(l.amount) + '</b></div>').join('') +
        (o.discount ? '<div class="kv"><span>Discount</span><b>-' + money(o.discount) + '</b></div>' : '') + '<div class="kv"><span>Total</span><b>' + money(o.total) + '</b></div><div class="kv"><span>Advance received</span><b>' + money(o.advance) + '</b></div><div class="kv"><span>Balance on delivery</span><b>' + money(D.r2(o.total - o.advance)) + '</b></div></div>' +
        '<button class="btn gold block" style="margin-bottom:10px" data-act="orderReceipt" data-id="' + o.id + '">' + ic('receipt') + 'Advance receipt (share / download)</button>' +
        (o.status === 'pending' ? '<div class="btns"><button class="btn danger" data-act="orderCancel" data-id="' + o.id + '">Cancel</button><button class="btn primary" data-act="orderDeliver" data-id="' + o.id + '">Deliver & bill</button></div>' : '') +
        (o.status !== 'delivered' ? '<button class="btn ghost block" style="margin-top:10px" data-act="orderDel" data-id="' + o.id + '">Delete this order</button>' : '<p class="mut" style="font-size:13px">Delivered. To remove it, delete its bill first.</p>'));
    },
    orderDeliver(el) { closeSheet(); S.bill = null; go('bill', { orderId: el.dataset.id }); },
    async orderCancel(el) {
      const o = D.find('orders', el.dataset.id);
      closeSheet();
      const ok = await confirmSheet({ title: 'Cancel order?', text: o.advance ? 'The advance of ' + money(o.advance) + ' will be refunded in the customer account.' : 'This order will be cancelled.', ok: 'Cancel order', danger: true });
      if (!ok) return; try { D.cancelOrder(o.id); toast('Order cancelled'); draw(true); } catch (e) { toast(e.message, 1); }
    },
    async orderDel(el) {
      const id = el.dataset.id; closeSheet();
      const ok = await confirmSheet({ title: 'Delete this order?', text: 'It disappears completely. Any advance taken for it is removed from the customer account.', ok: 'Delete', danger: true });
      if (!ok) return; try { D.deleteOrder(id); toast('Order deleted'); draw(true); } catch (e) { toast(e.message, 1); }
    },
    /* people */
    fltPeople(el) { S.flt.people = el.dataset.v; draw(true); },
    personNew() { personForm(S.flt.people, null); },
    personEdit(el) { personForm(el.dataset.kind, el.dataset.id); },
    personSave(el) {
      try {
        const kind = el.dataset.kind, id = el.dataset.id, v = s => $(s) ? $(s).value : '';
        const d = { name: v('#p-name'), phone: v('#p-phone'), address: v('#p-addr'), opening: v('#p-open') };
        const p = id ? D.updatePerson(kind, id, d) : D.addPerson(kind, d);
        const cb = S.formDone; S.formDone = null;
        closeSheet(); toast('Saved');
        if (cb) cb(p); else draw(true);
      } catch (e) { toast(e.message, 1); }
    },
    async personDel(el) {
      const ok = await confirmSheet({ title: 'Remove?', text: 'If they have no history they are deleted. Otherwise they are hidden and history stays saved.', ok: 'Remove', danger: true });
      if (!ok) return; D.removePerson(el.dataset.kind, el.dataset.id); toast('Removed'); if (!goBack()) tab('people');
    },
    async ledDel(el) {
      const ok = await confirmSheet({ title: 'Delete this entry?', text: 'The balance will be calculated again without it.', ok: 'Delete', danger: true });
      if (!ok) return; try { D.deleteLedgerEntry(el.dataset.kind, el.dataset.p, el.dataset.e); toast('Deleted'); draw(true); } catch (e) { toast(e.message, 1); }
    },
    payOpen(el) { paySheet(el.dataset.kind, el.dataset.id, !!el.dataset.adv); },
    paySave(el) {
      try { D.payment(el.dataset.kind, el.dataset.id, $('#pay-amt').value, $('#pay-m').value, $('#pay-n').value, !!el.dataset.adv); closeSheet(); toast('Saved'); draw(true); } catch (e) { toast(e.message, 1); }
    },
    custBill(el) { S.bill = null; go('bill', { customerId: el.dataset.id }); },
    custOrder(el) { S.order = { customerId: el.dataset.id, lines: [], deliveryDate: '', advance: '', discount: '', method: 'Cash', note: '' }; go('orderNew'); },
    vendBuy() { go('buyMenu'); },
    remind(el) {
      const p = D.find('customers', el.dataset.id), s = D.state.settings;
      openLink(waLink(p.phone, 'Hello ' + p.name + ', a gentle reminder from ' + s.name + ': your balance due is ' + money(p.balance) + '.' + (s.upi ? ' You can pay by UPI: ' + s.upi + '.' : '') + ' Thank you!'));
    },
    /* reports & settings */
    updNow() { installUpdate(); },
    updCheck() { checkUpdate(true); },
    fltRep(el) { S.flt.rep = el.dataset.v; draw(true); },
    logoPick() { $('#logoFile').click(); },
    logoDel() { D.saveSettings({ logo: '' }); draw(true); },
    setSave() {
      const v = s => $(s).value.trim();
      D.saveSettings({ name: v('#s-name') || 'My Business', tagline: v('#s-tag'), address: v('#s-addr'), phone: v('#s-phone'), email: v('#s-email'), upi: v('#s-upi'), invoicePrefix: v('#s-prefix') || 'INV-', footer: v('#s-foot'), memberPct: Math.min(Math.max(num(v('#s-mpct')), 0), 100), cardFee: Math.max(num(v('#s-cfee')), 0) });
      toast('Saved'); draw(true);
    },
    async backup() {
      const name = 'ECOLaver-backup-' + D.today() + '.json', json = D.exportJSON();
      try {
        if (NATIVE) {
          const sa = plug('StorageAccess');
          if (sa) {
            let g = true; try { g = (await sa.check()).granted; } catch (e) { }
            if (!g) {
              const ok = await confirmSheet({ title: 'Allow folder access', text: 'To save backups in your "ECOLaver Business Management System" folder, Android needs your permission.\n\nTap Allow, then switch ON "Allow access to manage all files" for ECOLaver. Then come back here and tap Download backup again.', ok: 'Allow' });
              if (ok) { try { await sa.open(); } catch (e) { toast('Open phone Settings > Apps > ECOLaver > Permissions and allow all files access', 1); } }
              return;
            }
          }
          const fs = plug('Filesystem'), path = BK_DIR + '/' + name;
          const put = dir => fs.writeFile({ path, data: json, directory: dir, encoding: 'utf8', recursive: true });
          let where = '';
          try { const w = await put('EXTERNAL_STORAGE'); where = (w && w.uri ? decodeURIComponent(w.uri).replace(/^file:\/\/(\/storage\/emulated\/0)?\/?/, '') : path); }
          catch (e1) {
            try { await put('DOCUMENTS'); where = 'Documents/' + path; }
            catch (e2) { await shareFile(name, json, true, 'ECOLaver backup'); D.saveSettings({ lastBackup: new Date().toISOString() }); toast('Could not use the folder, choose where to save'); setTimeout(() => draw(true), 400); return; }
            D.saveSettings({ lastBackup: new Date().toISOString() });
            toast('Saved in ' + where + '. To use your own folder, allow "All files access" for ECOLaver in phone Settings.', 1); setTimeout(() => draw(true), 400);
            return;
          }
          D.saveSettings({ lastBackup: new Date().toISOString() });
          toast('Saved in ' + where, 0); setTimeout(() => draw(true), 400);
          return;
        }
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        D.saveSettings({ lastBackup: new Date().toISOString() });
        toast('Backup downloaded'); setTimeout(() => draw(true), 400);
      } catch (e) { toast(e.message, 1); }
    },
    async backupShare() {
      try { await shareFile('ECOLaver-backup-' + D.today() + '.json', D.exportJSON(), true, 'ECOLaver backup'); } catch (e) { toast(e.message, 1); }
    },
    async restorePick() {
      if (!NATIVE) { $('#restoreFile').click(); return; }
      const fs = plug('Filesystem'); let files = [], where = '';
      for (const dir of ['EXTERNAL_STORAGE', 'DOCUMENTS']) {
        try {
          const r = await fs.readdir({ path: BK_DIR, directory: dir });
          const l = (r.files || []).map(f => typeof f === 'string' ? { name: f } : f).filter(f => /\.json$/i.test(f.name));
          if (l.length) { files = l; where = dir; break; }
        } catch (e) { }
      }
      if (!files.length) { $('#restoreFile').click(); return; }
      files.sort((x, y) => y.name.localeCompare(x.name));
      S.bkList = { dir: where, files: files.slice(0, 15) };
      openSheet('<h2>Restore from backup</h2><p class="mut" style="margin-bottom:12px;font-size:14px">Folder: ' + esc(BK_DIR) + '. Newest first. Tap the one you want.</p><div class="pick">' +
        S.bkList.files.map((f, i) => '<div class="row" data-act="restoreFrom" data-i="' + i + '"><div class="ico gold">' + ic('clip') + '</div><div class="main"><div class="t">' + esc(f.name.replace(/\.json$/i, '')) + '</div></div></div>').join('') +
        '</div><button class="btn ghost block" style="margin-top:12px" data-act="restoreOther">Choose another file</button>');
    },
    restoreOther() { closeSheet(); $('#restoreFile').click(); },
    async restoreFrom(el) {
      const f = S.bkList.files[+el.dataset.i], dir = S.bkList.dir;
      closeSheet();
      const ok = await confirmSheet({ title: 'Restore this backup?', text: f.name + '\nAll data on this phone will be replaced by this backup.', ok: 'Restore', danger: true });
      if (!ok) return;
      try {
        const r = await plug('Filesystem').readFile({ path: BK_DIR + '/' + f.name, directory: dir, encoding: 'utf8' });
        D.importJSON(r.data); S.bill = S.buy = S.order = S.pack = null; toast('Backup restored'); tab('home');
      } catch (e) { toast(e.message, 1); }
    },
    async resetAll(el) {
      const full = !!el.dataset.full;
      const ok = await confirmSheet({ title: full ? 'Delete EVERYTHING?' : 'Delete all business data?', text: (full ? 'Everything, including your company name, address and logo, ' : 'Items, purchases, bills, customers and vendors ') + 'will be erased from this phone. ' + (full ? '' : 'Your company details are kept. ') + 'Download a backup first if you may need it!', ok: 'Delete', danger: true });
      if (!ok) return; D.resetAll(!full); S.bill = S.buy = S.order = S.pack = null; toast('All data deleted'); tab('home');
    }
  };

  const V = s => { const e = $(s); return e ? e.value : ''; };
  Object.assign(ACT, {
    invNew() { invSheet(); }, invEdit(el) { invSheet(el.dataset.id); },
    invSave(el) {
      try {
        const id = el.dataset.id, d = { name: V('#iv-name'), phone: V('#iv-phone'), note: V('#iv-note') };
        if (id) D.updateInvestor(id, d); else { const i = D.addInvestor(d), a = +V('#iv-amt'); if (a > 0) D.addDeposit({ investorId: i.id, amount: a, date: D.today(), method: 'Cash', note: '' }); }
        closeSheet(); toast('Saved'); draw(true);
      } catch (e) { toast(e.message, 1); }
    },
    async invDel(el) {
      const ok = await confirmSheet({ title: 'Delete investor?', text: 'All money entries of this investor will be deleted too. Total invested will go down.', ok: 'Delete', danger: true });
      if (!ok) return; D.removeInvestor(el.dataset.id); toast('Deleted'); if (!goBack()) draw(true);
    },
    depNew(el) { depSheet(el && el.dataset ? el.dataset.id : ''); }, depEdit(el) { depSheet('', el.dataset.id); },
    depSave(el) {
      try { const d = { investorId: V('#dp-inv'), amount: V('#dp-amt'), date: V('#dp-date'), method: V('#dp-m'), note: V('#dp-note') }; if (el.dataset.id) D.updateDeposit(el.dataset.id, d); else D.addDeposit(d); closeSheet(); toast('Saved'); draw(true); } catch (e) { toast(e.message, 1); }
    },
    async depDel(el) { const ok = await confirmSheet({ title: 'Delete this entry?', text: 'Total invested will go down by this amount.', ok: 'Delete', danger: true }); if (!ok) return; D.deleteDeposit(el.dataset.id); toast('Deleted'); draw(true); },
    headPdfAsk(el) {
      const h = D.find('heads', el.dataset.id), l = D.state.spends.filter(x => x.headId === h.id).map(x => x.date).sort();
      openSheet('<h2>' + esc(h.name) + ' - PDF</h2><p class="mut" style="margin-bottom:10px">Choose the dates. Leave as is for everything.</p><div class="two">' + fld('hp-from', 'From', l[0] || D.today(), 'date') + fld('hp-to', 'To', D.today(), 'date') + '</div>' +
        '<div class="btns"><button class="btn primary" data-act="headPdf" data-m="save" data-id="' + h.id + '">Download PDF</button><button class="btn gold" data-act="headPdf" data-m="share" data-id="' + h.id + '">Share PDF</button></div>');
    },
    async headPdf(el) {
      const f = V('#hp-from'), t = V('#hp-to'); if (!f || !t || f > t) { toast('Check the dates', 1); return; }
      if (S.busy) return; S.busy = 1; toast('Making PDF...');
      try {
        const r = await statementPdf(f, t, el.dataset.id), b64 = bytesToB64(r.bytes); closeSheet();
        if (el.dataset.m === 'share') await shareFile(r.name, b64, false, 'Statement');
        else if (NATIVE) { const p = await saveBinaryToFolder(r.name, b64); if (p) toast('Saved: ' + p); else if (p === '') await shareFile(r.name, b64, false, 'Statement'); }
        else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([r.bytes], { type: 'application/pdf' })); a.download = r.name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); toast('PDF ready'); }
      } catch (e) { toast('Could not make PDF: ' + e.message, 1); }
      S.busy = 0;
    },
    headNew() { headSheet(); }, headEdit(el) { headSheet(el.dataset.id); },
    hdSave(el) { try { if (el.dataset.id) D.renameHead(el.dataset.id, V('#hd-name')); else D.addHead(V('#hd-name')); closeSheet(); toast('Saved'); draw(true); } catch (e) { toast(e.message, 1); } },
    async headDel(el) { const ok = await confirmSheet({ title: 'Delete this head?', text: 'It has no entries, so nothing is lost.', ok: 'Delete', danger: true }); if (!ok) return; try { D.removeHead(el.dataset.id); toast('Deleted'); if (!goBack()) draw(true); } catch (e) { toast(e.message, 1); } },
    spendNew(el) { spendSheet(el && el.dataset ? el.dataset.id : ''); }, spendEdit(el) { spendSheet('', el.dataset.id); },
    async spSave(el) {
      try {
        const src = V('#sp-src'), amt = +V('#sp-amt'), id = el.dataset.id;
        const d = { headId: V('#sp-head'), work: V('#sp-work'), who: V('#sp-who'), amount: amt, date: V('#sp-date'), method: V('#sp-m'), source: src, agreed: V('#sp-agr'), note: V('#sp-note') };
        if (src === 'fund') {
          const old = id ? D.find('spends', id) : null, bal = D.fundSummary().balance + (old && old.source === 'fund' ? old.amount : 0);
          if (amt > bal + 0.005) { const ok = await confirmSheet({ title: 'Not enough money in fund', text: 'Money in hand is ' + money(bal) + ' but this expense is ' + money(amt) + '. Save anyway? The balance will show minus.', ok: 'Save anyway' }); if (!ok) return; }
        }
        if (id) D.updateSpend(id, d); else D.addSpend(d);
        closeSheet(); toast('Saved'); draw(true);
      } catch (e) { toast(e.message, 1); }
    },
    async spDel(el) { const ok = await confirmSheet({ title: 'Delete this entry?', text: 'The expense will be removed from the totals.', ok: 'Delete', danger: true }); if (!ok) return; D.deleteSpend(el.dataset.id); toast('Deleted'); draw(true); },
    stmtShow() { const f = V('#st-from'), t = V('#st-to'); if (f) S.st.from = f; if (t) S.st.to = t; draw(true); },
    stmtQuick(el) {
      const v = el.dataset.v, td = D.today();
      if (v === 'all') S.st = { from: firstDate(), to: td };
      else if (v === 'month') S.st = { from: monthStart(td), to: td };
      else { const y = +td.slice(0, 4), m = +td.slice(5, 7), py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1, last = new Date(py, pm, 0).getDate(), p2 = n => String(n).padStart(2, '0'); S.st = { from: py + '-' + p2(pm) + '-01', to: py + '-' + p2(pm) + '-' + p2(last) }; }
      draw(true);
    },
    async stmtPdf(el) {
      const f = V('#st-from') || S.st.from, t = V('#st-to') || S.st.to; S.st = { from: f, to: t };
      if (f > t) { toast('"From" date is after "To" date', 1); return; }
      if (S.busy) return; S.busy = 1; toast('Making PDF...');
      try {
        const r = await statementPdf(f, t), b64 = bytesToB64(r.bytes);
        if (el.dataset.m === 'share') { await shareFile(r.name, b64, false, 'Statement'); }
        else if (NATIVE) {
          const p = await saveBinaryToFolder(r.name, b64);
          if (p) toast('Saved: ' + p); else if (p === '') { await shareFile(r.name, b64, false, 'Statement'); }
        } else {
          const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([r.bytes], { type: 'application/pdf' })); a.download = r.name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); toast('PDF ready (' + r.pages + ' pages)');
        }
      } catch (e) { toast('Could not make PDF: ' + e.message, 1); }
      S.busy = 0;
    }
  });
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || !ACT[el.dataset.act]) return;
    if (el.tagName === 'A') return;
    e.preventDefault();
    ACT[el.dataset.act](el);
  });

  document.addEventListener('input', e => {
    const t = e.target, k = t.dataset.in;
    if (!k) return;
    if (k === 'line') {
      const d = t.dataset.d, l = S[d].lines[+t.dataset.i];
      l[t.dataset.f] = t.value;
      if (d === 'buy') { if (t.dataset.f === 'rate' || t.dataset.f === 'qty' || t.dataset.f === 'total' || t.dataset.f === 'size') UPD.buy(); }
      else {
        const out = $('[data-out="amt-' + d + '-' + t.dataset.i + '"]');
        if (out) out.textContent = money(num(l.qty) * num(l.rate));
        UPD[d]();
      }
    } else if (k === 'f') {
      S[t.dataset.d][t.dataset.f] = t.value;
      UPD[t.dataset.d]();
    } else if (k === 'ex') {
      S.buy.extras[+t.dataset.i][t.dataset.f] = t.value; UPD.buy();
    } else if (k === 'pk') {
      S.pack[t.dataset.f][t.dataset.key] = t.value;
      UPD.pack();
    } else if (k === 'q') {
      S.q[t.dataset.k] = t.value;
      if (t.dataset.k === 'cards') { const ql = t.value.toLowerCase(), qd = ql.replace(/\D/g, ''); $('#list').innerHTML = cardList(D.state.customers.filter(c => c.member && !c.archived && (!ql || c.name.toLowerCase().includes(ql) || (qd && c.member.no.includes(qd))))); return; }
      const L = { stock: stockList, people: peopleList, inv: invList }[t.dataset.k];
      if (L) $('#list').innerHTML = L();
    } else if (k === 'pq') {
      $('#plist').innerHTML = S.pick.kind === 'item' ? pickItems(t.value) : pickPeople(t.value);
    }
  });

  document.addEventListener('change', e => {
    const t = e.target, ch = t.dataset.ch;
    if (ch === 'unit') {
      const d = t.dataset.d, l = S[d].lines[+t.dataset.i];
      if (d !== 'buy') {
        const it = l.itemId ? D.item(l.itemId) : null;
        if (it) l.rate = it.price ? String(+(it.price * D.conv(1, t.value, it.unit)).toPrecision(6)) : l.rate;
      }
      l.unit = t.value;
      $('#lines').innerHTML = LINES[d](); UPD[d]();
    } else if (ch === 'sunit') {
      S.buy.lines[+t.dataset.i].sizeUnit = t.value; UPD.buy();
    } else if (ch === 'packraw') {
      const l = S.buy.lines[+t.dataset.i]; l.rawName = t.value; l.sizeUnit = '';
      $('#lines').innerHTML = buyLines(); UPD.buy();
    } else if (ch === 'rname') {
      if (S.buy.lines.some(l => l.type === 'pack') || D.findRaw(t.value)) { $('#lines').innerHTML = buyLines(); UPD.buy(); }
    } else if (t.id === 'logoFile' && t.files[0]) {
      const r = new FileReader();
      r.onload = () => {
        const im = new Image();
        im.onload = () => {
          const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
          const x = c.getContext('2d'), m = Math.min(im.width, im.height);
          x.fillStyle = '#fff'; x.fillRect(0, 0, s, s);
          x.drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, s, s);
          D.saveSettings({ logo: c.toDataURL('image/jpeg', 0.88) }); toast('Logo saved'); draw(true);
        };
        im.src = r.result;
      };
      r.readAsDataURL(t.files[0]);
    } else if (t.id === 'restoreFile' && t.files[0]) {
      const f = t.files[0], r = new FileReader();
      r.onload = async () => {
        const ok = await confirmSheet({ title: 'Restore this backup?', text: 'All data on this phone will be replaced by the backup file.', ok: 'Restore', danger: true });
        if (!ok) return;
        try { D.importJSON(r.result); S.bill = S.buy = S.order = S.pack = null; toast('Backup restored'); tab('home'); } catch (err) { toast(err.message, 1); }
      };
      r.readAsText(f);
    }
  });

  /* ---------- automatic safety copy (kept inside the app's private storage) ----------
     Every save is also written to a file. If the phone ever clears the browser storage
     (but the app is still installed), the data is put back from this file on start. */
  const AUTO_FILE = 'ecolaver-auto-data.json';
  let autoT = null, autoTxt = '';
  async function autoWrite() {
    const fs = plug('Filesystem'); if (!fs || !autoTxt) return;
    try { await fs.writeFile({ path: AUTO_FILE, data: autoTxt, directory: 'DATA', encoding: 'utf8' }); } catch (e) { }
  }
  if (NATIVE && plug('Filesystem')) {
    D.onSave = txt => { autoTxt = txt; clearTimeout(autoT); autoT = setTimeout(autoWrite, 600); };
    document.addEventListener('visibilitychange', () => { if (document.hidden && autoTxt) { clearTimeout(autoT); autoWrite(); } });
    (async () => {
      try {
        if (D.hasSaved()) { autoTxt = JSON.stringify(D.state); autoWrite(); return; }
        const r = await plug('Filesystem').readFile({ path: AUTO_FILE, directory: 'DATA', encoding: 'utf8' });
        if (r && r.data) { D.restoreText(r.data); toast('Your saved data was restored'); tab('home'); }
      } catch (e) { /* no copy yet: first start */ }
    })();
  }

  /* ---------- start ---------- */
  if (D.lastError) toast(D.lastError, 1); else if (D.notice) toast(D.notice);
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
  if (!NATIVE && 'serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
  /* ---------- pull down to refresh (like Chrome) ---------- */
  (function () {
    let y0 = null, pull = 0, busy = false;
    const bar = document.createElement('div');
    bar.id = 'ptr'; bar.innerHTML = '<span>Pull down to refresh</span>';
    document.body.appendChild(bar);
    const reset = () => { bar.style.transform = 'translateY(-100%)'; bar.classList.remove('go'); };
    document.addEventListener('touchstart', e => {
      y0 = (window.scrollY <= 0 && !busy && !$('.sheet-wrap') && e.touches.length === 1) ? e.touches[0].clientY : null; pull = 0;
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (y0 === null) return;
      const dy = e.touches[0].clientY - y0;
      if (dy <= 0) { pull = 0; reset(); return; }
      pull = Math.min(dy, 140);
      bar.style.transform = 'translateY(' + (pull * 0.6 - 100) + '%)';
      bar.firstChild.textContent = pull > 90 ? 'Release to refresh' : 'Pull down to refresh';
    }, { passive: true });
    document.addEventListener('touchend', async () => {
      if (y0 === null) return;
      const go2 = pull > 90; y0 = null; pull = 0;
      if (!go2) { reset(); return; }
      busy = true; bar.classList.add('go'); bar.style.transform = 'translateY(0)'; bar.firstChild.textContent = 'Refreshing...';
      try { draw(true); if (NATIVE) await checkUpdate(false); } catch (e) { }
      setTimeout(() => { busy = false; reset(); toast('Refreshed'); }, 600);
    }, { passive: true });
  })();

  draw();
  if (NATIVE) setTimeout(() => checkUpdate(false), 1500);
})();
