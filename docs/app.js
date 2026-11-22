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
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4.5 4-6.5 8-6.5s7.3 2 8 6.5"/>'
  };
  const ic = n => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (IC[n] || '') + '</svg>';

  /* ---------- state ---------- */
  const S = { stack: [], bill: null, order: null, buy: null, pack: null, pick: null, conf: null, formDone: null,
    flt: { stock: 'all', people: 'customers', orders: 'pending', ordk: 'customers', rep: 'today' }, q: {} };
  let cur = { n: 'home', p: {} };
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
  const TABOF = { home: 'home', stock: 'stock', item: 'stock', bill: 'bill', invoice: 'bill', people: 'people', person: 'people' };
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
      '</div><div class="s">' + KIND[i.kind].n + ' · Stock ' + qf(i.stock) + ' ' + i.unit + '</div></div><div class="end"><b>' + (i.price ? money(i.price) + '/' + i.unit : '') + '</b></div></div>').join('') ||
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
      (it.kind === 'raw' ? '<div class="field"><label>Name</label><input id="f-name" value="' + esc(it.name) + '"></div>' : '<p class="mut" style="margin-bottom:12px">' + esc(it.name) + '</p>') +
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
      '<div class="hero"><small>Today\'s sales</small><div class="big" data-count="' + t.todaySales + '">' + money(t.todaySales) + '</div><div class="sub"><span>' + t.todayBills + ' bills</span><span>Profit ' + money(t.todayProfit) + '</span></div></div>' +
      '<div class="tiles">' + tile('bill', 'receipt', 'New Bill', 'gold') + tile('buyMenu', 'cart', 'Buy Stock') + tile('pack', 'pack', 'Pack Products') + tile('stock', 'box', 'Stock') +
      tile('orders', 'clip', 'Pre-orders', '', t.pendingOrders ? t.pendingOrders + ' waiting' : '') + tile('invoices', 'receipt', 'All Bills') + tile('cards', 'users', 'Family Cards', 'gold') + tile('purchases', 'cart', 'Purchases') + tile('reports', 'chart', 'Reports') + tile('settings', 'gear', 'Settings') + '</div>' +
      (start ? '<div class="card"><h3>How to start</h3>' +
        [['1', 'Buy Stock', 'Raw material first, then packaging', 'buyMenu'], ['2', 'Pack Products', 'Turn raw material into packets', 'pack'], ['3', 'New Bill', 'Sell and print the bill', 'bill']]
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
  SCREENS.invoices = () => top('All Bills', D.state.invoices.length + ' bills') + '<div class="page"><div class="search"><input placeholder="Search bill no or customer" data-in="q" data-k="inv" value="' + esc(S.q.inv || '') + '"></div><div class="card" id="list">' + invList() + '</div></div>';

  /* ---------- STOCK (view only: stock changes by buying, packing and selling) ---------- */
  const stockList = () => {
    const f = S.flt.stock, q = (S.q.stock || '').toLowerCase();
    const l = D.state.items.filter(i => !i.archived && (f === 'all' || i.kind === f) && i.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
    return l.map(i => {
      const low = i.stock <= 0 ? '<span class="pill bad">Out</span>' : (i.low > 0 && i.stock <= i.low ? '<span class="pill warn">Low</span>' : '');
      return '<div class="row" data-act="goto" data-n="item" data-id="' + i.id + '"><div class="ico ' + KIND[i.kind].c + '">' + ic(i.kind === 'product' ? 'pack' : 'box') + '</div><div class="main"><div class="t">' + esc(i.name) + '</div><div class="s">' + KIND[i.kind].n + ' · Cost ' + money(D.r2(i.cost)) + '/' + i.unit + '</div></div><div class="end"><b>' + qf(i.stock) + ' ' + i.unit + '</b>' + low + '</div></div>';
    }).join('') || empty('box', 'No items here', 'Items appear when you buy stock or pack products.', '<br><button class="btn primary" style="margin-top:12px" data-act="goto" data-n="buyMenu">Buy Stock</button>');
  };
  SCREENS.stock = () => top('Stock', D.totals().stockValue ? 'Worth ' + money(D.totals().stockValue) : 'Everything you have') + '<div class="page">' +
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
    else acts = '<button class="btn primary block" style="margin-bottom:12px" data-act="goto" data-n="packRaw" data-id="' + it.rawId + '">' + ic('pack') + 'Pack more</button>';
    return top(it.name, KIND[it.kind].n + (raw ? ' · from ' + raw.name : '')) + '<div class="page stagger">' +
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

  SCREENS.purchases = () => top('Purchase History', D.state.purchases.length + ' entries') + '<div class="page"><div class="card">' +
    (D.state.purchases.slice().sort((a, b) => b.ts - a.ts).slice(0, 100).map(pu => '<div class="row" data-act="purOpen" data-id="' + pu.id + '"><div class="ico gold">' + ic('cart') + '</div><div class="main"><div class="t">' + esc(pu.vendorName) + '</div><div class="s">' + esc(pu.no) + ' · ' + fmtDate(pu.date) + ' · ' + pu.lines.map(l => esc(l.name)).join(', ') + '</div></div><div class="end"><b>' + money(pu.total) + '</b>' + ((pu.items == null ? pu.total : pu.items) - pu.paid > 0.005 ? '<span class="pill warn">Unpaid ' + money(D.r2((pu.items == null ? pu.total : pu.items) - pu.paid)) + '</span>' : '<span class="pill">Paid</span>') + '</div></div>').join('') || empty('cart', 'No purchases yet', 'Use "Buy Stock" to add one.')) + '</div></div>';
  /* ---------- PACK PRODUCTS ---------- */
  SCREENS.pack = () => {
    const ok = D.rawsWithPacks(), no = D.rawItems().filter(r => !ok.includes(r));
    return top('Pack Products', 'Choose the raw material to pack') + '<div class="page"><div class="card">' +
      (ok.map(r => '<div class="row" data-act="goto" data-n="packRaw" data-id="' + r.id + '"><div class="ico">' + ic('box') + '</div><div class="main"><div class="t">' + esc(r.name) + '</div><div class="s">Sizes: ' + D.packGroups(r.id).map(g => g.label).join(', ') + '</div></div><div class="end"><b>' + qf(r.stock) + ' ' + r.unit + '</b></div></div>').join('') ||
        empty('pack', 'Nothing to pack yet', 'First buy a raw material and its packaging (pouch, label...).', '<br><button class="btn primary" style="margin-top:12px" data-act="goto" data-n="buyMenu">Buy Stock</button>')) + '</div>' +
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
  SCREENS.packings = () => top('Packing History', D.state.batches.length + ' entries') + '<div class="page"><div class="card">' +
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
    const f = S.flt.orders, k = S.flt.ordk, cu = k === 'customers';
    const l = D.state[cu ? 'orders' : 'vorders'].filter(o => o.status === f).sort((a, b) => b.ts - a.ts);
    const sts = cu ? [['pending', 'Waiting'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']] : [['pending', 'Waiting'], ['received', 'Received'], ['cancelled', 'Cancelled']];
    const fx = sts.some(a => a[0] === f) ? f : 'pending';
    return top('Pre-orders', cu ? 'Customer paid first, you deliver later' : 'You paid first, vendor delivers later', { act: 'orderNew', label: '+ New' }) + '<div class="page">' +
      '<div class="seg">' + [['customers', 'From customers'], ['vendors', 'To vendors']].map(a => '<button class="' + (k === a[0] ? 'on' : '') + '" data-act="fltOrdK" data-v="' + a[0] + '">' + a[1] + '</button>').join('') + '</div>' +
      '<div class="seg">' + sts.map(a => '<button class="' + (fx === a[0] ? 'on' : '') + '" data-act="fltOrders" data-v="' + a[0] + '">' + a[1] + '</button>').join('') + '</div><div class="card">' +
      (l.filter(o => o.status === fx).map(o => cu ?
        '<div class="row" data-act="orderOpen" data-id="' + o.id + '"><div class="ico gold">' + ic('clip') + '</div><div class="main"><div class="t">' + esc(o.customerName) + '</div><div class="s">' + o.no + (o.deliveryDate ? ' · Deliver ' + fmtDate(o.deliveryDate) : '') + '</div></div><div class="end"><b>' + money(o.total) + '</b>' + (o.advance ? '<span class="pill">Advance ' + money(o.advance) + '</span>' : '') + (o.status === 'pending' && waiting(o) ? '<span class="pill warn">Stock not ready</span>' : '') + '</div></div>' :
        '<div class="row" data-act="vorderOpen" data-id="' + o.id + '"><div class="ico gold">' + ic('truck') + '</div><div class="main"><div class="t">' + esc(o.vendorName) + '</div><div class="s">' + o.no + (o.expectedDate ? ' · Expected ' + fmtDate(o.expectedDate) : '') + '</div></div><div class="end"><b>' + money(o.total) + '</b>' + (o.advance ? '<span class="pill">Advance paid ' + money(o.advance) + '</span>' : '') + '</div></div>').join('') ||
        empty('clip', 'Nothing here', 'Tap "+ New" to add a pre-order.')) + '</div></div>';
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
      '<button class="btn ghost block" style="margin-top:10px" data-act="goto" data-n="orders">All pre-orders</button></div>';
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
    [['cart', 'gold', 'Buy Stock', 'Raw material and packaging', 'buyMenu'], ['pack', 'blue', 'Pack Products', 'Turn raw material into packets', 'pack'], ['clip', 'gold', 'Pre-orders', 'Customer and vendor orders with advance', 'orders'], ['users', 'gold', 'Family Cards', 'Members and member discount', 'cards'], ['receipt', '', 'All bills', 'Search old bills', 'invoices'], ['cart', '', 'Purchase history', 'What you bought before', 'purchases'], ['clip', '', 'Packing history', 'What you packed before', 'packings'], ['chart', '', 'Reports', 'Sales, profit, cash', 'reports'], ['gear', '', 'Settings & backup', 'Logo, address, backup', 'settings']]
      .map(a => '<div class="row" data-act="goto" data-n="' + a[4] + '"><div class="ico ' + a[1] + '">' + ic(a[0]) + '</div><div class="main"><div class="t">' + a[2] + '</div><div class="s">' + a[3] + '</div></div></div>').join('') + '</div></div>';

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
  SCREENS.reports = () => {
    const f = S.flt.rep, r = D.report.apply(null, range(f)), t = D.totals();
    return top('Reports', 'How is the business doing?') + '<div class="page stagger"><div class="seg">' + [['today', 'Today'], ['week', '7 days'], ['month', 'This month'], ['all', 'All time']].map(a => '<button class="' + (f === a[0] ? 'on' : '') + '" data-act="fltRep" data-v="' + a[0] + '">' + a[1] + '</button>').join('') + '</div>' +
      '<div class="hero"><small>Profit</small><div class="big">' + money(r.profit) + '</div><div class="sub"><span>Sales ' + money(r.sales) + '</span><span>' + r.bills + ' bills</span></div></div>' +
      '<div class="grid2"><div class="stat"><small>Cost of goods sold</small><b>' + money(r.cogs) + '</b></div><div class="stat"><small>Discount given</small><b>' + money(r.discount) + '</b></div><div class="stat green"><small>Cash in</small><b>' + money(r.cashIn) + '</b></div><div class="stat red"><small>Cash out</small><b>' + money(r.cashOut) + '</b></div></div>' +
      '<div class="card"><h3>Right now</h3><div class="kv"><span>Customers owe you</span><b>' + money(t.customerDue) + '</b></div><div class="kv"><span>Customer advances held</span><b>' + money(t.customerAdvance) + '</b></div><div class="kv"><span>You owe vendors</span><b>' + money(t.vendorDue) + '</b></div><div class="kv"><span>Advance paid to vendors</span><b>' + money(t.vendorAdvance) + '</b></div><div class="kv"><span>Stock worth</span><b>' + money(t.stockValue) + '</b></div><div class="kv"><span>Bought in this period</span><b>' + money(r.purchases) + '</b></div></div>' +
      '<div class="card"><h3>Best sellers</h3>' + (r.top.map(x => '<div class="row" style="cursor:default"><div class="main"><div class="t">' + esc(x.name) + '</div><div class="s">Profit ' + money(x.profit) + '</div></div><div class="end"><b>' + money(x.amount) + '</b></div></div>').join('') || '<div class="empty" style="padding:14px">No sales in this period</div>') + '</div></div>';
  };
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
        D.updateItem(id, { name: v('#f-name') === null ? it.name : v('#f-name'), price: v('#f-price') === null ? it.price : v('#f-price'), low: v('#f-low'), memberPct: v('#f-mp') === null ? it.memberPct : v('#f-mp') });
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
    fltOrdK(el) { S.flt.ordk = el.dataset.v; S.flt.orders = 'pending'; draw(true); },
    orderNew() { if (S.flt.ordk === 'vendors') { S.buy = newBuy('raw', 'order'); go('buy'); } else { S.order = null; go('orderNew'); } },
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
          const fs = plug('Filesystem'), path = BK_DIR + '/' + name;
          const put = dir => fs.writeFile({ path, data: json, directory: dir, encoding: 'utf8', recursive: true });
          let where = '';
          try { await put('EXTERNAL_STORAGE'); where = path; }
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
    restorePick() { $('#restoreFile').click(); },
    async resetAll(el) {
      const full = !!el.dataset.full;
      const ok = await confirmSheet({ title: full ? 'Delete EVERYTHING?' : 'Delete all business data?', text: (full ? 'Everything, including your company name, address and logo, ' : 'Items, purchases, bills, customers and vendors ') + 'will be erased from this phone. ' + (full ? '' : 'Your company details are kept. ') + 'Download a backup first if you may need it!', ok: 'Delete', danger: true });
      if (!ok) return; D.resetAll(!full); S.bill = S.buy = S.order = S.pack = null; toast('All data deleted'); tab('home');
    }
  };
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
  draw();
  if (NATIVE) setTimeout(() => checkUpdate(false), 1500);
})();
