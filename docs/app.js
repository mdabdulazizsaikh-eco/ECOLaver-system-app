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
  const S = { stack: [], bill: null, order: null, buy: null, recipe: null, pick: null, conf: null, formDone: null, makeId: '',
    flt: { stock: 'all', people: 'customers', orders: 'pending', rep: 'today' }, q: {} };
  let cur = { n: 'home', p: {} };
  const KIND = { raw: { n: 'Raw material', c: '' }, pack: { n: 'Packaging', c: 'gold' }, product: { n: 'Ready product', c: 'blue' } };

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
  const openLink = url => { if (NATIVE) window.location.href = url; else window.open(url, '_blank'); };
  async function shareNative(o) {
    const sh = plug('Share');
    if (sh) { try { await sh.share(o); return true; } catch (e) { return false; } }
    return false;
  }
  async function shareFile(name, data, isText, title) {
    const fs = plug('Filesystem');
    if (!fs) throw new Error('File sharing is not available');
    const w = await fs.writeFile(isText ? { path: name, data, directory: 'CACHE', encoding: 'utf8' } : { path: name, data, directory: 'CACHE' });
    await shareNative({ title, files: [w.uri], dialogTitle: title });
  }
  function billCanvas(inv) {
    const s = D.state.settings, W = 720, P = 36, rows = inv.lines.length;
    const extra = (inv.discount ? 1 : 0) + (inv.advanceUsed ? 1 : 0) + (Math.abs(inv.billBalance) > 0.005 ? 1 : 0);
    const H = 330 + rows * 56 + 170 + extra * 40 + 90;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), F = 'system-ui, -apple-system, Roboto, Arial, sans-serif';
    const fit = (t, mw) => { t = String(t); if (x.measureText(t).width <= mw) return t; while (t.length > 1 && x.measureText(t + '…').width > mw) t = t.slice(0, -1); return t + '…'; };
    const draw = img => {
      x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
      const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#093d2b'); g.addColorStop(1, '#1f8a5b');
      x.fillStyle = g; x.fillRect(0, 0, W, 150);
      x.save(); x.beginPath(); x.arc(P + 50, 75, 50, 0, 7); x.closePath(); x.fillStyle = '#fff'; x.fill(); x.clip();
      if (img) x.drawImage(img, P, 25, 100, 100); else { x.fillStyle = '#0e5a40'; x.font = 'bold 34px ' + F; x.textAlign = 'center'; x.fillText((s.name || 'E').slice(0, 2).toUpperCase(), P + 50, 88); }
      x.restore();
      x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = 'bold 34px ' + F; x.fillText(fit(s.name, W - P * 2 - 130), P + 126, 62);
      x.font = '19px ' + F; x.globalAlpha = .9;
      if (s.address) x.fillText(fit(s.address, W - P * 2 - 130), P + 126, 92);
      x.fillText(fit([s.phone ? 'Ph: ' + s.phone : '', s.email].filter(Boolean).join('  ·  '), W - P * 2 - 130), P + 126, 120);
      x.globalAlpha = 1;
      let y = 200;
      x.fillStyle = '#111'; x.font = 'bold 26px ' + F; x.fillText('Bill ' + inv.no, P, y);
      x.font = '22px ' + F; x.fillStyle = '#555'; x.fillText(fmtDate(inv.date), P, y + 32);
      x.textAlign = 'right'; x.fillStyle = '#111'; x.font = 'bold 24px ' + F; x.fillText(fit(inv.customerName, 330), W - P, y);
      if (inv.customerPhone) { x.font = '20px ' + F; x.fillStyle = '#555'; x.fillText(inv.customerPhone, W - P, y + 30); }
      y = 270;
      x.fillStyle = '#e4f2ea'; x.fillRect(P, y, W - P * 2, 44);
      x.fillStyle = '#093d2b'; x.font = 'bold 19px ' + F;
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
      const row = (a, b, big) => { x.font = (big ? 'bold 28px ' : '22px ') + F; x.fillStyle = big ? '#0e5a40' : '#111'; x.textAlign = 'left'; x.fillText(a, 330, y); x.textAlign = 'right'; x.fillText(b, W - P, y); y += big ? 46 : 38; };
      row('Subtotal', money(inv.subtotal));
      if (inv.discount) row('Discount', '-' + money(inv.discount));
      x.fillStyle = '#0e5a40'; x.fillRect(330, y - 26, W - P - 330, 2); y += 12;
      row('Total', money(inv.total), true);
      if (inv.advanceUsed) row('Advance adjusted', money(inv.advanceUsed));
      row('Paid (' + inv.method + ')', money(inv.paid));
      if (Math.abs(inv.billBalance) > 0.005) row(inv.billBalance > 0 ? 'Balance due' : 'Advance balance', money(Math.abs(inv.billBalance)));
      y += 20;
      x.textAlign = 'center'; x.fillStyle = '#555'; x.font = '20px ' + F; x.fillRect(P, y - 26, W - P * 2, 1);
      x.fillText(fit(s.footer, W - P * 2), W / 2, y + 12);
      if (inv.void) { x.save(); x.translate(W / 2, H / 2); x.rotate(-.3); x.strokeStyle = '#d64545'; x.fillStyle = '#d64545'; x.lineWidth = 6; x.font = 'bold 70px ' + F; x.strokeRect(-190, -50, 380, 90); x.fillText('CANCELLED', 0, 22); x.restore(); }
      return c;
    };
    return new Promise(res => {
      if (!s.logo) return res(draw(null));
      const im = new Image(); im.onload = () => res(draw(im)); im.onerror = () => res(draw(null)); im.src = s.logo;
    });
  }
  const empty = (icon, t, s, btn) => '<div class="empty">' + ic(icon) + '<b>' + esc(t) + '</b>' + esc(s || '') + (btn || '') + '</div>';
  const logoHtml = () => { const s = D.state.settings; return s.logo ? '<img src="' + s.logo + '" alt="">' : esc((s.name || 'E').slice(0, 2).toUpperCase()); };
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

  /* ---------- navigation ---------- */
  const TABOF = { home: 'home', stock: 'stock', item: 'stock', recipe: 'more', bill: 'bill', invoice: 'bill', people: 'people', person: 'people' };
  function go(n, p, replace) {
    if (replace) history.replaceState({}, ''); else { S.stack.push(cur); history.pushState({}, ''); }
    cur = { n, p: p || {} };
    draw();
  }
  function tab(k) {
    S.stack = []; cur = { n: k, p: {} };
    draw();
  }
  window.addEventListener('popstate', () => {
    closeSheet();
    if (S.stack.length) { cur = S.stack.pop(); draw(true); }
    else if (cur.n !== 'home') { cur = { n: 'home', p: {} }; draw(); }
  });
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
    openSheet('<h2>Choose item</h2><div class="search"><input id="pq" placeholder="Search..." data-in="pq" data-nofocus="1"></div><div class="pick" id="plist">' + pickItems('') + '</div><button class="btn block" style="margin-top:12px" data-act="pickNew">' + ic('plus') + ' New item</button>');
  }
  function pickItems(q) {
    const list = D.state.items.filter(i => !i.archived && S.pick.kinds.includes(i.kind) && i.name.toLowerCase().includes(q.toLowerCase()));
    return list.map(i => '<div class="row" data-act="pickDo" data-id="' + i.id + '"><div class="ico ' + KIND[i.kind].c + '">' + ic('box') + '</div><div class="main"><div class="t">' + esc(i.name) +
      '</div><div class="s">' + KIND[i.kind].n + ' · Stock ' + qf(i.stock) + ' ' + i.unit + '</div></div><div class="end"><b>' + (i.price ? money(i.price) + '/' + i.unit : '') + '</b></div></div>').join('') ||
      '<div class="empty">Nothing found. Tap "New item" below.</div>';
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
  function itemForm(id, opts) {
    opts = opts || {};
    const it = id ? D.item(id) : null;
    const kind = it ? it.kind : (opts.kind || 'raw');
    S.formDone = opts.onDone || null;
    openSheet('<h2>' + (it ? 'Edit item' : 'New item') + '</h2>' +
      '<div class="field"><label>Name</label><input id="f-name" placeholder="e.g. Ajwa Dates" value="' + esc(it ? it.name : '') + '"></div>' +
      (it ? '' : '<div class="field"><label>What is it?</label><select id="f-kind"><option value="raw"' + (kind === 'raw' ? ' selected' : '') + '>Raw material (dates, honey, oil...)</option><option value="pack"' + (kind === 'pack' ? ' selected' : '') + '>Packaging (bottle, pouch, label...)</option><option value="product"' + (kind === 'product' ? ' selected' : '') + '>Ready product (packed item you sell)</option></select></div>') +
      '<div class="two"><div class="field"><label>Counted in</label>' + (it ? '<input value="' + it.unit + '" disabled>' : '<select id="f-unit">' + D.UNITS.map(u => '<option>' + u + '</option>').join('') + '</select>') + '</div>' +
      '<div class="field"><label>Low stock alert at</label><input id="f-low" type="number" inputmode="decimal" placeholder="0" value="' + (it && it.low ? it.low : '') + '"></div></div>' +
      '<div class="field"><label>Selling price per unit (₹)</label><input id="f-price" type="number" inputmode="decimal" placeholder="0" value="' + (it && it.price ? it.price : '') + '"><div class="hint">Leave empty for raw material or packaging you do not sell.</div></div>' +
      (it ? '' : '<div class="two"><div class="field"><label>Stock you already have</label><input id="f-stock" type="number" inputmode="decimal" placeholder="0"></div><div class="field"><label>Cost per unit (₹)</label><input id="f-cost" type="number" inputmode="decimal" placeholder="0"></div></div><div class="hint" style="margin:-4px 0 12px">Optional. Later you can add stock with "Buy stock".</div>') +
      '<button class="btn primary block" data-act="itemSave" data-id="' + (id || '') + '">Save</button>');
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
    const it = D.item(l.itemId);
    const us = D.compat(it.unit);
    return '<div class="line"><div class="head"><b>' + esc(it.name) + '</b><span class="mut" style="font-size:12px">Stock ' + qf(it.stock) + ' ' + it.unit + '</span><button class="x" data-act="lineDel" data-d="' + d + '" data-i="' + i + '">×</button></div>' +
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
    const disc = Math.min(num(b.discount), sub);
    const total = D.r2(sub - disc);
    const ord = b.orderId ? D.find('orders', b.orderId) : null;
    const adv = ord ? ord.advance : 0;
    const auto = Math.max(D.r2(total - adv), 0);
    const cust = b.customerId ? D.find('customers', b.customerId) : null;
    const paid = !cust ? total : (b.paid === null ? auto : num(b.paid));
    return { sub, disc, total, adv, auto, paid, cust, bal: D.r2(total - adv - paid), newBal: cust ? D.r2(cust.balance + total - paid) : 0, n: ls.length };
  }
  function billTotals() {
    const c = calcBill(S.bill);
    return '<div class="r"><span>Subtotal</span><b>' + money(c.sub) + '</b></div>' +
      (c.disc ? '<div class="r"><span>Discount</span><b>-' + money(c.disc) + '</b></div>' : '') +
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
    return '<div class="paper"><div class="ph"><div class="lg">' + (s.logo ? '<img src="' + s.logo + '" alt="">' : esc((s.name || 'E').slice(0, 2).toUpperCase())) + '</div><div><h2>' + esc(s.name) + '</h2>' +
      (s.tagline ? '<p><i>' + esc(s.tagline) + '</i></p>' : '') + (s.address ? '<p>' + esc(s.address) + '</p>' : '') +
      '<p>' + [s.phone ? 'Ph: ' + esc(s.phone) : '', s.email ? esc(s.email) : ''].filter(Boolean).join(' · ') + '</p></div></div>' +
      '<div class="meta"><div><b>Bill ' + esc(inv.no) + '</b>' + (inv.void ? '<span class="stamp">CANCELLED</span>' : '') + '<br>' + fmtDate(inv.date) + '</div><div style="text-align:right"><b>' + esc(inv.customerName) + '</b>' + (inv.customerPhone ? '<br>' + esc(inv.customerPhone) : '') + '</div></div>' +
      '<table><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr>' +
      inv.lines.map(l => '<tr><td>' + esc(l.name) + '</td><td class="r">' + qf(l.qty) + ' ' + l.unit + '</td><td class="r">' + money(l.rate) + '</td><td class="r">' + money(l.amount) + '</td></tr>').join('') + '</table>' +
      '<div class="tot"><div><span>Subtotal</span><span>' + money(inv.subtotal) + '</span></div>' +
      (inv.discount ? '<div><span>Discount</span><span>-' + money(inv.discount) + '</span></div>' : '') +
      '<div class="g"><span>Total</span><span>' + money(inv.total) + '</span></div>' +
      (inv.advanceUsed ? '<div><span>Advance adjusted</span><span>' + money(inv.advanceUsed) + '</span></div>' : '') +
      '<div><span>Paid (' + esc(inv.method) + ')</span><span>' + money(inv.paid) + '</span></div>' +
      (Math.abs(inv.billBalance) > 0.005 ? '<div><b>' + (inv.billBalance > 0 ? 'Balance due' : 'Advance balance') + '</b><b>' + money(Math.abs(inv.billBalance)) + '</b></div>' : '') + '</div>' +
      (s.upi && inv.billBalance > 0.005 ? '<p style="margin-top:10px">Pay by UPI: <b>' + esc(s.upi) + '</b></p>' : '') +
      (cust && Math.abs(cust.balance) > 0.005 && !inv.void ? '<p style="margin-top:8px;font-size:12px;color:#555">Your account balance: ' + balLabel('customers', cust.balance).t + '</p>' : '') +
      '<div class="ft">' + esc(s.footer) + '</div></div>';
  }
  function invText(inv) {
    const s = D.state.settings;
    return '*' + s.name + '*\nBill ' + inv.no + ' · ' + fmtDate(inv.date) + '\nCustomer: ' + inv.customerName + '\n\n' +
      inv.lines.map((l, i) => (i + 1) + '. ' + l.name + ' × ' + qf(l.qty) + ' ' + l.unit + ' = ' + money(l.amount)).join('\n') +
      '\n\n' + (inv.discount ? 'Discount: -' + money(inv.discount) + '\n' : '') + 'Total: ' + money(inv.total) + '\nPaid: ' + money(inv.paid) +
      (inv.billBalance > 0.005 ? '\nBalance due: ' + money(inv.billBalance) : '') + '\n\n' + s.footer;
  }

  /* ---------- SCREENS ---------- */
  const SCREENS = {};

  SCREENS.home = () => {
    const t = D.totals(), s = D.state.settings, st = D.state;
    const days = D.lastDays(7), mx = Math.max.apply(null, days.map(d => d.total).concat([1]));
    const lastB = s.lastBackup, needBk = st.invoices.length > 0 && (!lastB || (Date.now() - new Date(lastB).getTime()) > 7 * 864e5);
    const start = st.items.length === 0;
    return top(s.name, s.tagline, { home: true }) + '<div class="page stagger">' +
      '<div class="hero"><small>Today\'s sales</small><div class="big" data-count="' + t.todaySales + '">' + money(t.todaySales) + '</div><div class="sub"><span>' + t.todayBills + ' bills</span><span>Profit ' + money(t.todayProfit) + '</span></div></div>' +
      (start ? '<div class="card"><h3>Let\'s get started</h3>' +
        [['1', 'Add your items', 'Raw material, packaging and products', 'stock'], ['2', 'Buy stock', 'Enter what you bought and the price', 'buy'], ['3', 'Make products', 'Set recipe and selling price', 'make'], ['4', 'Make your first bill', 'Type items, bill is ready', 'bill']]
          .map(a => '<div class="row" data-act="goto" data-n="' + a[3] + '"><div class="ico gold">' + a[0] + '</div><div class="main"><div class="t">' + a[1] + '</div><div class="s">' + a[2] + '</div></div></div>').join('') + '</div>' : '') +
      '<div class="grid2"><div class="stat red" data-act="goPeople" data-v="customers"><small>Customers owe you</small><b>' + money(t.customerDue) + '</b></div>' +
      '<div class="stat gold" data-act="goPeople" data-v="vendors"><small>You owe vendors</small><b>' + money(t.vendorDue) + '</b></div>' +
      '<div class="stat" data-act="tab" data-t="stock"><small>Stock value</small><b>' + money(t.stockValue) + '</b></div>' +
      '<div class="stat green" data-act="goto" data-n="reports"><small>Profit this month</small><b>' + money(t.monthProfit) + '</b></div></div>' +
      '<div class="grid2"><button class="btn gold" data-act="goto" data-n="buy">' + ic('cart') + 'Buy stock</button><button class="btn" data-act="goto" data-n="make">' + ic('pack') + 'Make products</button>' +
      '<button class="btn" data-act="goto" data-n="orders">' + ic('clip') + 'Orders' + (t.pendingOrders ? ' (' + t.pendingOrders + ')' : '') + '</button><button class="btn" data-act="goto" data-n="invoices">' + ic('receipt') + 'All bills</button></div>' +
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
      S.bill.lines = o.lines.map(l => ({ itemId: l.itemId, qty: String(l.qty), unit: l.unit, rate: String(l.rate) }));
    }
    if (p.customerId) { S.bill.customerId = p.customerId; }
    delete p.orderId; delete p.customerId;
    const b = S.bill, c = calcBill(b), ord = b.orderId ? D.find('orders', b.orderId) : null;
    return top('New Bill', ord ? 'Delivering order ' + ord.no : 'Type items, bill is ready', { act: b.lines.length ? 'billClear' : '', label: 'Clear' }) + '<div class="page">' +
      '<div class="card"><h3>Customer</h3>' + (c.cust ?
        '<div class="row" style="cursor:default"><div class="ico">' + esc(c.cust.name.slice(0, 1).toUpperCase()) + '</div><div class="main"><div class="t">' + esc(c.cust.name) + '</div><div class="s ' + balLabel('customers', c.cust.balance).c + '">' + balLabel('customers', c.cust.balance).t + '</div></div>' + (ord ? '' : '<button class="btn sm ghost" data-act="billCust">Change</button>') + '</div>' :
        '<div class="field"><label>Name (optional)</label><input placeholder="Walk-in customer" value="' + esc(b.walkName) + '" data-in="f" data-d="bill" data-f="walkName"></div><button class="btn ghost block" data-act="billCust">' + ic('user') + 'Choose saved customer (for due / advance)</button>') + '</div>' +
      '<div class="card"><h3>Items</h3><div id="lines">' + sellLines('bill') + '</div><button class="btn block" data-act="addLine" data-d="bill">' + ic('plus') + 'Add item</button></div>' +
      '<div class="card"><div class="field"><label>Discount (₹)</label><input type="number" inputmode="decimal" value="' + esc(b.discount) + '" placeholder="0" data-in="f" data-d="bill" data-f="discount"></div>' +
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
      '<div class="btns" style="margin-top:14px"><button class="btn gold" data-act="invShare" data-id="' + inv.id + '">' + ic('share') + 'WhatsApp</button><button class="btn" data-act="invPrint">' + ic('print') + 'Print / PDF</button></div>' +
      (cust && !inv.void && cust.balance > 0.005 ? '<button class="btn primary block" style="margin-top:10px" data-act="payOpen" data-kind="customers" data-id="' + cust.id + '">' + ic('wallet') + 'Receive payment</button>' : '') +
      '<div class="btns" style="margin-top:10px"><button class="btn ghost" data-act="newBill">' + ic('plus') + 'New bill</button>' + (inv.void ? '' : '<button class="btn danger" data-act="invVoid" data-id="' + inv.id + '">Cancel bill</button>') + '</div></div>';
  };

  const invList = () => {
    const q = (S.q.inv || '').toLowerCase();
    const l = D.state.invoices.slice().sort((a, b) => b.ts - a.ts).filter(i => !q || i.no.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q));
    return l.slice(0, 120).map(i => '<div class="row" data-act="goto" data-n="invoice" data-id="' + i.id + '"><div class="ico ' + (i.void ? 'red' : '') + '">' + ic('receipt') + '</div><div class="main"><div class="t">' + esc(i.customerName) + '</div><div class="s">' + esc(i.no) + ' · ' + fmtDate(i.date) + '</div></div><div class="end"><b>' + money(i.total) + '</b>' +
      (i.void ? '<span class="pill bad">Cancelled</span>' : i.billBalance > 0.005 ? '<span class="pill warn">Due ' + money(i.billBalance) + '</span>' : '<span class="pill">Paid</span>') + '</div></div>').join('') || empty('receipt', 'No bills yet', 'Your bills will appear here.');
  };
  SCREENS.invoices = () => top('All Bills', D.state.invoices.length + ' bills') + '<div class="page"><div class="search"><input placeholder="Search bill no or customer" data-in="q" data-k="inv" value="' + esc(S.q.inv || '') + '"></div><div class="card" id="list">' + invList() + '</div></div>';

  /* ---------- STOCK ---------- */
  const stockList = () => {
    const f = S.flt.stock, q = (S.q.stock || '').toLowerCase();
    const l = D.state.items.filter(i => !i.archived && (f === 'all' || i.kind === f) && i.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
    return l.map(i => {
      const low = i.stock <= 0 ? '<span class="pill bad">Out</span>' : (i.low > 0 && i.stock <= i.low ? '<span class="pill warn">Low</span>' : '');
      return '<div class="row" data-act="goto" data-n="item" data-id="' + i.id + '"><div class="ico ' + KIND[i.kind].c + '">' + ic(i.kind === 'product' ? 'pack' : 'box') + '</div><div class="main"><div class="t">' + esc(i.name) + '</div><div class="s">' + KIND[i.kind].n + ' · Cost ' + money(D.r2(i.cost)) + '/' + i.unit + '</div></div><div class="end"><b>' + qf(i.stock) + ' ' + i.unit + '</b>' + low + '</div></div>';
    }).join('') || empty('box', 'No items here', 'Tap "+ New" to add your first item.');
  };
  SCREENS.stock = () => top('Stock', D.totals().stockValue ? 'Worth ' + money(D.totals().stockValue) : 'Everything you have', { act: 'itemNew', label: '+ New' }) + '<div class="page">' +
    '<div class="seg">' + [['all', 'All'], ['raw', 'Raw'], ['pack', 'Packaging'], ['product', 'Products']].map(a => '<button class="' + (S.flt.stock === a[0] ? 'on' : '') + '" data-act="fltStock" data-v="' + a[0] + '">' + a[1] + '</button>').join('') + '</div>' +
    '<div class="search"><input placeholder="Search items" data-in="q" data-k="stock" value="' + esc(S.q.stock || '') + '"></div><div class="card" id="list">' + stockList() + '</div></div>';

  SCREENS.item = p => {
    const it = D.item(p.id);
    if (!it) return top('Item', '') + '<div class="page">' + empty('box', 'Item not found') + '</div>';
    const mv = D.movements(it.id).slice(0, 15);
    const isP = it.kind === 'product', rc = isP ? D.recipeCost(it) : null;
    return top(it.name, KIND[it.kind].n) + '<div class="page stagger">' +
      '<div class="grid2"><div class="stat"><small>In stock</small><b>' + qf(it.stock) + ' ' + it.unit + '</b></div><div class="stat"><small>Cost per ' + it.unit + '</small><b>' + money(D.r2(isP ? rc.total : it.cost)) + '</b></div>' +
      '<div class="stat green"><small>Selling price</small><b>' + (it.price ? money(it.price) : '—') + '</b></div><div class="stat"><small>Stock worth</small><b>' + money(D.r2(Math.max(it.stock, 0) * it.cost)) + '</b></div></div>' +
      (isP ? '<div class="btns" style="margin-bottom:12px"><button class="btn gold" data-act="goto" data-n="recipe" data-id="' + it.id + '">' + ic('pack') + 'Recipe & price</button><button class="btn primary" data-act="makeOpen" data-id="' + it.id + '">Make more</button></div>' : '<button class="btn gold block" style="margin-bottom:12px" data-act="goto" data-n="buy" data-item="' + it.id + '">' + ic('cart') + 'Buy more</button>') +
      '<div class="btns" style="margin-bottom:14px"><button class="btn ghost" data-act="itemEdit" data-id="' + it.id + '">Edit</button><button class="btn ghost" data-act="fsOpen" data-id="' + it.id + '">Fix stock</button><button class="btn danger" data-act="itemArchive" data-id="' + it.id + '">Remove</button></div>' +
      '<div class="card"><h3>Recent movement</h3>' + (mv.map(m => '<div class="row" style="cursor:default"><div class="main"><div class="t">' + esc(m.type) + '</div><div class="s">' + fmtDate(m.date) + (m.ref ? ' · ' + esc(m.ref) : '') + '</div></div><div class="end"><b class="' + (m.qty >= 0 ? 'pos' : 'neg') + '">' + (m.qty >= 0 ? '+' : '') + qf(m.qty) + ' ' + it.unit + '</b></div></div>').join('') || '<div class="empty" style="padding:14px">Nothing yet</div>') + '</div></div>';
  };

  /* ---------- BUY ---------- */
  function buyLine(l, i) {
    const it = D.item(l.itemId), us = D.compat(it.unit);
    return '<div class="line"><div class="head"><b>' + esc(it.name) + '</b><span class="mut" style="font-size:12px">Stock ' + qf(it.stock) + ' ' + it.unit + '</span><button class="x" data-act="lineDel" data-d="buy" data-i="' + i + '">×</button></div>' +
      '<div class="three"><div class="field"><label>Qty bought</label><input type="number" inputmode="decimal" step="any" value="' + esc(l.qty) + '" data-in="line" data-d="buy" data-i="' + i + '" data-f="qty"></div>' +
      '<div class="field"><label>Unit</label>' + (us.length > 1 ? '<select data-ch="unit" data-d="buy" data-i="' + i + '">' + us.map(u => '<option' + (u === l.unit ? ' selected' : '') + '>' + u + '</option>').join('') + '</select>' : '<input value="' + l.unit + '" disabled>') + '</div>' +
      '<div class="field"><label>Total price ₹</label><input type="number" inputmode="decimal" step="any" value="' + esc(l.total) + '" data-in="line" data-d="buy" data-i="' + i + '" data-f="total"></div></div>' +
      '<div class="amt" data-out="amt-buy-' + i + '">' + buyRate(l) + '</div></div>';
  }
  const buyRate = l => (num(l.qty) > 0 && num(l.total) > 0) ? '= ' + money(D.r2(num(l.total) / num(l.qty))) + ' per ' + l.unit : '';
  const buyLines = () => S.buy.lines.map(buyLine).join('') || '<div class="empty" style="padding:14px">Add what you bought.</div>';
  function calcBuy(b) {
    const sub = D.r2(D.sum(b.lines.map(l => num(l.total)))), extra = num(b.extra), total = D.r2(sub + extra);
    const paid = b.paid === null ? total : num(b.paid);
    return { sub, extra, total, paid, bal: D.r2(total - paid), v: b.vendorId ? D.find('vendors', b.vendorId) : null };
  }
  const buyTotals = () => {
    const c = calcBuy(S.buy);
    return '<div class="r"><span>Items</span><b>' + money(c.sub) + '</b></div>' + (c.extra ? '<div class="r"><span>Extra (transport etc.)</span><b>' + money(c.extra) + '</b></div>' : '') +
      '<div class="r big"><span>Total</span><b>' + money(c.total) + '</b></div><div class="r"><span>Paid now</span><b>' + money(c.paid) + '</b></div>' +
      '<div class="r"><span>' + (c.bal < -0.005 ? 'Extra paid (advance to vendor)' : 'Unpaid (vendor due)') + '</span><b>' + money(Math.abs(c.bal)) + '</b></div>';
  };
  SCREENS.buy = p => {
    if (!S.buy) S.buy = { vendorId: '', lines: [], extra: '', paid: null, method: 'Cash' };
    if (p.vendorId) S.buy.vendorId = p.vendorId;
    if (p.item && !S.buy.lines.some(l => l.itemId === p.item)) { const it = D.item(p.item); S.buy.lines.push({ itemId: it.id, qty: '', unit: it.unit, total: '' }); }
    delete p.vendorId; delete p.item;
    const b = S.buy, c = calcBuy(b);
    return top('Buy Stock', 'Enter what you bought', { act: b.lines.length ? 'buyClear' : '', label: 'Clear' }) + '<div class="page">' +
      '<div class="card"><h3>Vendor</h3><div class="row" data-act="buyVendor"><div class="ico gold">' + ic('truck') + '</div><div class="main"><div class="t">' + (c.v ? esc(c.v.name) : 'Cash purchase (no vendor)') + '</div><div class="s">' + (c.v ? balLabel('vendors', c.v.balance).t : 'Tap to choose a vendor') + '</div></div><span class="lnk">Change</span></div></div>' +
      '<div class="card"><h3>What did you buy?</h3><div id="lines">' + buyLines() + '</div><button class="btn block" data-act="buyAdd">' + ic('plus') + 'Add item</button></div>' +
      '<div class="card"><div class="field"><label>Extra cost: transport, loading etc. (₹)</label><input type="number" inputmode="decimal" placeholder="0" value="' + esc(b.extra) + '" data-in="f" data-d="buy" data-f="extra"><div class="hint">This is shared into the item cost automatically.</div></div>' +
      '<div class="field"><label>Paid now (₹)</label><input id="paidIn" type="number" inputmode="decimal" value="' + (b.paid === null ? c.total : esc(b.paid)) + '" data-in="f" data-d="buy" data-f="paid"></div>' +
      '<div class="btns" style="margin:-4px 0 12px"><button class="btn sm ghost" data-act="buyPaidFull">Full amount</button><button class="btn sm ghost" data-act="buyPaidNone">Nothing (pay later)</button></div>' +
      '<div class="field" style="margin-bottom:0"><label>Paid by</label>' + methodSeg('buy', b.method) + '</div></div>' +
      '<div class="tbox" id="utot">' + buyTotals() + '</div><div class="sticky-save"><button class="btn primary block" data-act="buySave">Save purchase</button></div></div>';
  };
  SCREENS.purchases = () => top('Purchases', D.state.purchases.length + ' entries') + '<div class="page"><div class="card">' +
    (D.state.purchases.slice().sort((a, b) => b.ts - a.ts).slice(0, 100).map(pu => '<div class="row" style="cursor:default"><div class="ico gold">' + ic('cart') + '</div><div class="main"><div class="t">' + esc(pu.vendorName) + '</div><div class="s">' + esc(pu.no) + ' · ' + fmtDate(pu.date) + ' · ' + pu.lines.map(l => esc(l.name)).join(', ') + '</div></div><div class="end"><b>' + money(pu.total) + '</b>' + (pu.total - pu.paid > 0.005 ? '<span class="pill warn">Unpaid ' + money(D.r2(pu.total - pu.paid)) + '</span>' : '<span class="pill">Paid</span>') + '</div></div>').join('') || empty('cart', 'No purchases yet', 'Use "Buy stock" to add one.')) + '</div></div>';

  /* ---------- MAKE / RECIPE ---------- */
  SCREENS.make = () => {
    const ps = D.state.items.filter(i => i.kind === 'product' && !i.archived).sort((a, b) => a.name.localeCompare(b.name));
    return top('Make Products', 'Pack your items and track the cost', { act: 'prodNew', label: '+ New' }) + '<div class="page"><div class="card">' +
      (ps.map(i => {
        const c = D.recipeCost(i).total, mg = c > 0 && i.price ? Math.round((i.price - c) / c * 100) : null;
        return '<div class="row" data-act="goto" data-n="recipe" data-id="' + i.id + '"><div class="ico blue">' + ic('pack') + '</div><div class="main"><div class="t">' + esc(i.name) + '</div><div class="s">Cost ' + money(c) + ' · Sell ' + (i.price ? money(i.price) : '—') + (mg !== null ? ' · ' + mg + '% profit' : '') + '</div><div class="s">In stock: ' + qf(i.stock) + ' ' + i.unit + '</div></div><button class="btn sm primary" data-act="makeOpen" data-id="' + i.id + '">Make</button></div>';
      }).join('') || empty('pack', 'No products yet', 'A product is a packed item you sell, like "Dates 500g".', '<br><button class="btn primary" style="margin-top:12px" data-act="prodNew">Create first product</button>')) + '</div></div>';
  };
  function calcRecipe(r) {
    const it = D.item(r.id);
    const lines = r.lines.map(l => { const m = D.item(l.itemId); return { l, m, cost: D.r2(D.conv(num(l.qty), l.unit, m.unit) * m.cost) }; });
    const total = D.r2(D.sum(lines.map(x => x.cost)) + num(r.other));
    const sug = Math.ceil(total * (1 + num(r.margin) / 100));
    const price = r.price === '' ? 0 : num(r.price);
    return { it, lines, total, sug, price, profit: D.r2(price - total), pct: total > 0 ? Math.round((price - total) / total * 100) : 0, zero: lines.some(x => x.m.cost <= 0) };
  }
  function recipeLine(l, i) {
    const m = D.item(l.itemId), us = D.compat(m.unit);
    return '<div class="line"><div class="head"><b>' + esc(m.name) + '</b><span class="mut" style="font-size:12px">' + money(D.r2(m.cost)) + '/' + m.unit + '</span><button class="x" data-act="lineDel" data-d="recipe" data-i="' + i + '">×</button></div>' +
      '<div class="two"><div class="field"><label>Quantity per piece</label><input type="number" inputmode="decimal" step="any" value="' + esc(l.qty) + '" data-in="line" data-d="recipe" data-i="' + i + '" data-f="qty"></div>' +
      '<div class="field"><label>Unit</label>' + (us.length > 1 ? '<select data-ch="unit" data-d="recipe" data-i="' + i + '">' + us.map(u => '<option' + (u === l.unit ? ' selected' : '') + '>' + u + '</option>').join('') + '</select>' : '<input value="' + l.unit + '" disabled>') + '</div></div>' +
      '<div class="amt" data-out="amt-recipe-' + i + '">Cost ' + money(D.r2(D.conv(num(l.qty), l.unit, m.unit) * m.cost)) + '</div></div>';
  }
  const recipeLines = () => S.recipe.lines.map(recipeLine).join('') || '<div class="empty" style="padding:14px">Add what goes into one piece: the raw material and packaging.</div>';
  const recipeTotals = () => {
    const c = calcRecipe(S.recipe);
    return '<div class="r"><span>Cost of one piece</span><b>' + money(c.total) + '</b></div><div class="r"><span>Suggested price (' + num(S.recipe.margin) + '% profit)</span><b>' + money(c.sug) + '</b></div>' +
      '<div class="r big"><span>Your profit per piece</span><b>' + money(c.profit) + (c.total > 0 ? ' (' + c.pct + '%)' : '') + '</b></div>';
  };
  SCREENS.recipe = p => {
    const it = D.item(p.id);
    if (!S.recipe || S.recipe.id !== it.id) {
      const rc = it.recipe || { lines: [], other: 0, margin: 30 };
      S.recipe = { id: it.id, lines: rc.lines.map(l => ({ itemId: l.itemId, qty: String(l.qty), unit: l.unit })), other: rc.other ? String(rc.other) : '', margin: String(rc.margin), price: it.price ? String(it.price) : '' };
    }
    const r = S.recipe, c = calcRecipe(r);
    return top(it.name, 'Recipe, cost and price') + '<div class="page">' +
      '<div class="card"><h3>Ingredients for ONE piece</h3><div id="lines">' + recipeLines() + '</div><button class="btn block" data-act="recipeAdd">' + ic('plus') + 'Add ingredient / packaging</button></div>' +
      '<div class="card"><div class="field"><label>Other cost per piece (₹): labour, gas, sticker...</label><input type="number" inputmode="decimal" placeholder="0" value="' + esc(r.other) + '" data-in="f" data-d="recipe" data-f="other"></div>' +
      '<div class="field"><label>Profit you want (%)</label><input type="number" inputmode="decimal" value="' + esc(r.margin) + '" data-in="f" data-d="recipe" data-f="margin"></div></div>' +
      (c.zero ? '<div class="note">Some ingredients have no cost yet. Use "Buy stock" first so the cost can be calculated.</div>' : '') +
      '<div class="tbox" id="rtot">' + recipeTotals() + '</div>' +
      '<div class="card"><div class="field"><label>Selling price (₹) of one piece</label><input id="rprice" type="number" inputmode="decimal" value="' + esc(r.price) + '" data-in="f" data-d="recipe" data-f="price"></div>' +
      '<button class="btn gold block" data-act="useSug">Use suggested price</button></div>' +
      '<div class="sticky-save"><button class="btn primary block" data-act="recipeSave">Save</button></div></div>';
  };
  function makeSheet(id) {
    S.makeId = id;
    const it = D.item(id);
    openSheet('<h2>Make ' + esc(it.name) + '</h2><p class="mut" style="margin-bottom:12px">Now in stock: ' + qf(it.stock) + ' ' + it.unit + '</p><div class="field"><label>How many pieces to make?</label><input id="mk-q" type="number" inputmode="decimal" placeholder="e.g. 20" data-in="makeq"></div><div id="mk-need"></div><button class="btn primary block" data-act="makeDo" data-id="' + id + '">Make now</button>');
    updateMake();
  }
  function updateMake() {
    const el = $('#mk-need'); if (!el) return;
    const it = D.item(S.makeId), q = num($('#mk-q').value), rc = D.recipeCost(it);
    if (!rc.lines.length) { el.innerHTML = '<div class="note red">This product has no recipe yet. Open the product and add ingredients.</div>'; return; }
    el.innerHTML = '<div class="card" style="padding:8px 12px">' + rc.lines.map(l => {
      const need = D.r3(l.qtyBase * q), ok = l.item.stock + 1e-9 >= need;
      return '<div class="kv"><span>' + esc(l.item.name) + '</span><b class="' + (ok ? '' : 'neg') + '">' + qf(need) + ' ' + l.item.unit + ' <span class="mut" style="font-weight:400">(have ' + qf(l.item.stock) + ')</span></b></div>';
    }).join('') + '<div class="kv"><span>Cost for all</span><b>' + money(D.r2(rc.total * q)) + '</b></div></div>';
  }

  /* ---------- ORDERS ---------- */
  function calcOrder(o) {
    const total = D.r2(D.sum(o.lines.map(l => num(l.qty) * num(l.rate))));
    return { total, adv: num(o.advance), bal: D.r2(total - num(o.advance)) };
  }
  const orderTotals = () => { const c = calcOrder(S.order); return '<div class="r big" style="border:0;margin:0;padding-top:0"><span>Order total</span><b>' + money(c.total) + '</b></div><div class="r"><span>Advance received</span><b>' + money(c.adv) + '</b></div><div class="r"><span>Balance on delivery</span><b>' + money(c.bal) + '</b></div>'; };
  SCREENS.orders = () => {
    const f = S.flt.orders;
    const l = D.state.orders.filter(o => o.status === f).sort((a, b) => b.ts - a.ts);
    return top('Advance Orders', 'Orders taken with advance', { act: 'orderNew', label: '+ New' }) + '<div class="page"><div class="seg">' + [['pending', 'Pending'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']].map(a => '<button class="' + (f === a[0] ? 'on' : '') + '" data-act="fltOrders" data-v="' + a[0] + '">' + a[1] + '</button>').join('') + '</div><div class="card">' +
      (l.map(o => '<div class="row" data-act="orderOpen" data-id="' + o.id + '"><div class="ico gold">' + ic('clip') + '</div><div class="main"><div class="t">' + esc(o.customerName) + '</div><div class="s">' + o.no + (o.deliveryDate ? ' · Deliver ' + fmtDate(o.deliveryDate) : '') + '</div></div><div class="end"><b>' + money(o.total) + '</b>' + (o.advance ? '<span class="pill">Advance ' + money(o.advance) + '</span>' : '') + '</div></div>').join('') || empty('clip', 'No ' + f + ' orders', f === 'pending' ? 'Tap "+ New" to take an order with advance.' : '')) + '</div></div>';
  };
  SCREENS.orderNew = () => {
    if (!S.order) S.order = { customerId: '', lines: [], deliveryDate: '', advance: '', method: 'Cash', note: '' };
    const o = S.order, cust = o.customerId ? D.find('customers', o.customerId) : null;
    return top('New Order', 'Customer pays advance, you deliver later') + '<div class="page">' +
      '<div class="card"><h3>Customer</h3><div class="row" data-act="orderCust"><div class="ico">' + (cust ? esc(cust.name.slice(0, 1).toUpperCase()) : ic('user')) + '</div><div class="main"><div class="t">' + (cust ? esc(cust.name) : 'Choose customer') + '</div><div class="s">' + (cust ? esc(cust.phone) : 'Required') + '</div></div><span class="lnk">' + (cust ? 'Change' : 'Choose') + '</span></div></div>' +
      '<div class="card"><h3>Items ordered</h3><div id="lines">' + sellLines('order') + '</div><button class="btn block" data-act="addLine" data-d="order">' + ic('plus') + 'Add item</button></div>' +
      '<div class="card"><div class="two"><div class="field"><label>Advance received (₹)</label><input type="number" inputmode="decimal" placeholder="0" value="' + esc(o.advance) + '" data-in="f" data-d="order" data-f="advance"></div><div class="field"><label>Delivery date</label><input type="date" value="' + esc(o.deliveryDate) + '" data-in="f" data-d="order" data-f="deliveryDate"></div></div>' +
      '<div class="field" style="margin-bottom:0"><label>Advance paid by</label>' + methodSeg('order', o.method) + '</div></div>' +
      '<div class="tbox" id="otot">' + orderTotals() + '</div><div class="sticky-save"><button class="btn primary block" data-act="orderSave">Save order</button></div></div>';
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
      '<div class="btns" style="margin-bottom:14px"><button class="btn ghost" data-act="personEdit" data-kind="' + k + '" data-id="' + pr.id + '">Edit</button><button class="btn danger" data-act="personDel" data-kind="' + k + '" data-id="' + pr.id + '">Remove</button></div>' +
      '<div class="card"><h3>History</h3>' + (pr.ledger.slice().reverse().slice(0, 60).map(e => '<div class="row" style="cursor:default"><div class="main"><div class="t">' + esc(e.desc) + '</div><div class="s">' + fmtDate(e.date) + (e.method ? ' · ' + esc(e.method) : '') + '</div></div><div class="end"><b class="' + (e.amt > 0 ? 'neg' : 'pos') + '">' + (e.amt > 0 ? '+' : '-') + money(Math.abs(e.amt)) + '</b><div class="s">Balance ' + money(e.bal) + '</div></div></div>').join('') || '<div class="empty" style="padding:14px">No history yet</div>') + '</div></div>';
  };

  /* ---------- MORE / REPORTS / SETTINGS ---------- */
  SCREENS.more = () => top('More', 'Everything else') + '<div class="page"><div class="card">' +
    [['cart', 'gold', 'Buy stock', 'Enter purchases from vendors', 'buy'], ['pack', 'blue', 'Make products', 'Recipe, cost and packing', 'make'], ['clip', 'gold', 'Advance orders', 'Orders with advance payment', 'orders'], ['receipt', '', 'All bills', 'Search old bills', 'invoices'], ['cart', '', 'Purchase history', 'What you bought before', 'purchases'], ['chart', '', 'Reports', 'Sales, profit, cash', 'reports'], ['gear', '', 'Settings & backup', 'Logo, address, backup', 'settings']]
      .map(a => '<div class="row" data-act="goto" data-n="' + a[4] + '"><div class="ico ' + a[1] + '">' + ic(a[0]) + '</div><div class="main"><div class="t">' + a[2] + '</div><div class="s">' + a[3] + '</div></div></div>').join('') + '</div></div>';

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
      '<div class="field"><label>Logo</label><div class="row" style="cursor:default;border:0"><div class="ico" style="width:60px;height:60px;border-radius:50%;overflow:hidden">' + logoHtml() + '</div><div class="main"><button class="btn sm" data-act="logoPick">Choose logo</button> ' + (s.logo ? '<button class="btn sm danger" data-act="logoDel">Remove</button>' : '') + '</div></div><input type="file" id="logoFile" accept="image/*" class="hidden"></div>' +
      [['s-name', 'Company name', s.name], ['s-tag', 'Tagline', s.tagline], ['s-addr', 'Address', s.address], ['s-phone', 'Phone', s.phone], ['s-email', 'Email (optional)', s.email], ['s-upi', 'UPI ID (optional, printed on bills with a balance)', s.upi], ['s-prefix', 'Bill number starts with', s.invoicePrefix], ['s-foot', 'Message at the bottom of the bill', s.footer]]
        .map(a => '<div class="field"><label>' + a[1] + '</label><input id="' + a[0] + '" value="' + esc(a[2]) + '"></div>').join('') +
      '<button class="btn primary block" data-act="setSave">Save</button></div>' +
      '<div class="card"><h3>Backup</h3><p class="mut" style="margin-bottom:12px;font-size:14px">All data is stored on this phone only. Download a backup often and keep it safe, for example in Google Drive.' + (s.lastBackup ? ' Last backup: ' + fmtDate(s.lastBackup.slice(0, 10)) + '.' : ' You have not made a backup yet.') + '</p>' +
      '<div class="btns"><button class="btn gold" data-act="backup">Download backup</button><button class="btn" data-act="restorePick">Restore</button></div><input type="file" id="restoreFile" accept=".json,application/json" class="hidden"></div>' +
      '<div class="card"><h3>Danger zone</h3><button class="btn danger block" data-act="resetAll">Delete all data</button></div></div>';
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
      e.innerHTML = buyTotals();
      const pi = $('#paidIn'); if (pi && S.buy.paid === null && document.activeElement !== pi) pi.value = calcBuy(S.buy).total;
    },
    recipe() { const e = $('#rtot'); if (e) e.innerHTML = recipeTotals(); }
  };

  /* ---------- events ---------- */
  const ACT = {
    back() { if (S.stack.length) history.back(); else tab('home'); },
    tab(el) {
      const t = el.dataset.t;
      if (t === 'bill') { if (cur.n === 'bill') return; S.stack = []; cur = { n: 'bill', p: {} }; draw(); } else tab(t);
    },
    goto(el) { go(el.dataset.n, { id: el.dataset.id, kind: el.dataset.kind, item: el.dataset.item }); },
    goPeople(el) { S.flt.people = el.dataset.v; tab('people'); },
    confYes() { const r = S.conf; S.conf = null; closeSheet(); if (r) r(true); },
    confNo() { closeSheet(); },
    method(el) { S[el.dataset.d].method = el.dataset.v; draw(true); },
    lineDel(el) { const d = el.dataset.d; S[d].lines.splice(+el.dataset.i, 1); $('#lines').innerHTML = ({ bill: () => sellLines('bill'), order: () => sellLines('order'), buy: buyLines, recipe: recipeLines })[d](); UPD[d](); },
    addLine(el) { pickItem(['raw', 'product'], id => addSellLine(el.dataset.d, id)); },
    pickDo(el) { const cb = S.pick.cb; closeSheet(); cb(el.dataset.id); },
    pickNone() { const cb = S.pick.cb; closeSheet(); cb(''); },
    pickNew() {
      const pk = S.pick;
      if (pk.kind === 'item') itemForm(null, { kind: pk.kinds[0], onDone: it => pk.cb(it.id) });
      else personForm(pk.pk, null, { onDone: p => pk.cb(p.id) });
    },
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
        const inv = D.invoice({ customerId: b.customerId, walkName: b.walkName, lines, discount: c.disc, paid: c.paid, method: b.method, orderId: b.orderId });
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
      const ok = await confirmSheet({ title: 'Cancel this bill?', text: 'Stock will be added back and the customer account will be corrected. Any money paid is treated as refunded.', ok: 'Cancel bill', danger: true });
      if (!ok) return;
      try { D.voidInvoice(el.dataset.id); toast('Bill cancelled'); draw(true); } catch (e) { toast(e.message, 1); }
    },
    /* stock & items */
    itemNew() { itemForm(null, { kind: S.flt.stock === 'pack' ? 'pack' : S.flt.stock === 'product' ? 'product' : 'raw' }); },
    prodNew() { itemForm(null, { kind: 'product' }); },
    itemEdit(el) { itemForm(el.dataset.id); },
    itemSave(el) {
      try {
        const id = el.dataset.id, v = s => $(s).value;
        let it;
        if (id) it = D.updateItem(id, { name: v('#f-name'), price: v('#f-price'), low: v('#f-low') });
        else {
          it = D.addItem({ name: v('#f-name'), kind: v('#f-kind'), unit: v('#f-unit'), stock: v('#f-stock'), cost: v('#f-cost'), price: v('#f-price'), low: v('#f-low') });
        }
        const cb = S.formDone; S.formDone = null;
        closeSheet(); toast('Saved');
        if (cb) cb(it); else draw(true);
      } catch (e) { toast(e.message, 1); }
    },
    fsOpen(el) { fixStockSheet(el.dataset.id); },
    fsSave(el) { try { D.stockAdjust(el.dataset.id, $('#fs-v').value, $('#fs-r').value); closeSheet(); toast('Stock corrected'); draw(true); } catch (e) { toast(e.message, 1); } },
    async itemArchive(el) {
      const ok = await confirmSheet({ title: 'Remove this item?', text: 'It will be hidden from lists. Old bills and history stay safe.', ok: 'Remove', danger: true });
      if (!ok) return; D.archiveItem(el.dataset.id); toast('Removed'); history.back();
    },
    fltStock(el) { S.flt.stock = el.dataset.v; draw(true); },
    /* buy */
    buyVendor() { pickPerson('vendors', id => { S.buy.vendorId = id; draw(true); }, true); },
    buyAdd() { pickItem(['raw', 'pack'], id => { const it = D.item(id); if (!S.buy.lines.some(l => l.itemId === id)) S.buy.lines.push({ itemId: id, qty: '', unit: it.unit, total: '' }); $('#lines').innerHTML = buyLines(); UPD.buy(); }); },
    buyClear() { S.buy = null; draw(); },
    buyPaidFull() { S.buy.paid = null; draw(true); },
    buyPaidNone() { S.buy.paid = '0'; draw(true); },
    buySave() {
      const b = S.buy, c = calcBuy(b);
      try {
        const pu = D.purchase({ vendorId: b.vendorId, lines: b.lines.map(l => ({ itemId: l.itemId, qty: num(l.qty), unit: l.unit, total: num(l.total) })), extra: c.extra, paid: c.paid, method: b.method });
        S.buy = null;
        openSheet('<div class="success"><div class="tick">' + ic('check') + '</div><b style="font-size:18px">Stock updated</b><p class="mut" style="margin:4px 0 12px">' + pu.no + ' · ' + money(pu.total) + '</p></div><div class="card" style="padding:8px 12px">' +
          pu.lines.map(l => { const it = D.item(l.itemId); return '<div class="kv"><span>' + esc(it.name) + '</span><b>' + money(D.r2(it.cost)) + '/' + it.unit + '</b></div>'; }).join('') + '</div><p class="mut" style="font-size:12.5px;margin-bottom:12px">Cost per unit now (average of old and new stock).</p><button class="btn primary block" data-act="buyDone">Done</button>');
      } catch (e) { toast(e.message, 1); }
    },
    buyDone() { closeSheet(); tab('stock'); },
    /* recipe / make */
    recipeAdd() { pickItem(['raw', 'pack'], id => { const it = D.item(id); if (!S.recipe.lines.some(l => l.itemId === id)) S.recipe.lines.push({ itemId: id, qty: '', unit: it.unit }); $('#lines').innerHTML = recipeLines(); UPD.recipe(); }); },
    useSug() { const c = calcRecipe(S.recipe); S.recipe.price = String(c.sug); $('#rprice').value = c.sug; UPD.recipe(); },
    recipeSave() {
      try {
        const r = S.recipe, it = D.item(r.id);
        D.setRecipe(r.id, { lines: r.lines.map(l => ({ itemId: l.itemId, qty: num(l.qty), unit: l.unit })), other: num(r.other), margin: r.margin === '' ? 30 : num(r.margin) });
        D.updateItem(r.id, { name: it.name, price: num(r.price), low: it.low });
        S.recipe = null; toast('Recipe saved'); history.back();
      } catch (e) { toast(e.message, 1); }
    },
    makeOpen(el) { makeSheet(el.dataset.id); },
    makeDo(el) {
      try {
        const q = num($('#mk-q').value), it = D.item(el.dataset.id);
        D.produce(el.dataset.id, q);
        closeSheet(); toast('Made ' + qf(q) + ' × ' + it.name); draw(true);
      } catch (e) { toast(e.message, 1); }
    },
    /* orders */
    orderNew() { S.order = null; go('orderNew'); },
    orderCust() { pickPerson('customers', id => { S.order.customerId = id; draw(true); }); },
    orderSave() {
      const o = S.order;
      try {
        D.order({ customerId: o.customerId, lines: o.lines.map(l => Object.assign({}, l)), advance: num(o.advance), method: o.method, deliveryDate: o.deliveryDate });
        S.order = null; toast('Order saved'); S.flt.orders = 'pending'; history.back();
      } catch (e) { toast(e.message, 1); }
    },
    fltOrders(el) { S.flt.orders = el.dataset.v; draw(true); },
    orderOpen(el) {
      const o = D.find('orders', el.dataset.id);
      openSheet('<h2>' + o.no + ' · ' + esc(o.customerName) + '</h2>' + (o.deliveryDate ? '<p class="mut" style="margin-bottom:8px">Deliver on ' + fmtDate(o.deliveryDate) + '</p>' : '') +
        '<div class="card" style="padding:8px 12px">' + o.lines.map(l => '<div class="kv"><span>' + esc(l.name) + ' × ' + qf(l.qty) + ' ' + l.unit + '</span><b>' + money(l.amount) + '</b></div>').join('') +
        '<div class="kv"><span>Total</span><b>' + money(o.total) + '</b></div><div class="kv"><span>Advance received</span><b>' + money(o.advance) + '</b></div><div class="kv"><span>Balance on delivery</span><b>' + money(D.r2(o.total - o.advance)) + '</b></div></div>' +
        (o.status === 'pending' ? '<div class="btns"><button class="btn danger" data-act="orderCancel" data-id="' + o.id + '">Cancel</button><button class="btn primary" data-act="orderDeliver" data-id="' + o.id + '">Deliver & bill</button></div>' : ''));
    },
    orderDeliver(el) { closeSheet(); S.bill = null; go('bill', { orderId: el.dataset.id }); },
    async orderCancel(el) {
      const o = D.find('orders', el.dataset.id);
      closeSheet();
      const ok = await confirmSheet({ title: 'Cancel order?', text: o.advance ? 'The advance of ' + money(o.advance) + ' will be refunded in the customer account.' : 'This order will be cancelled.', ok: 'Cancel order', danger: true });
      if (!ok) return; try { D.cancelOrder(o.id); toast('Order cancelled'); draw(true); } catch (e) { toast(e.message, 1); }
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
      const ok = await confirmSheet({ title: 'Remove?', text: 'Hidden from lists. History stays saved.', ok: 'Remove', danger: true });
      if (!ok) return; D.removePerson(el.dataset.kind, el.dataset.id); toast('Removed'); history.back();
    },
    payOpen(el) { paySheet(el.dataset.kind, el.dataset.id, !!el.dataset.adv); },
    paySave(el) {
      try { D.payment(el.dataset.kind, el.dataset.id, $('#pay-amt').value, $('#pay-m').value, $('#pay-n').value, !!el.dataset.adv); closeSheet(); toast('Saved'); draw(true); } catch (e) { toast(e.message, 1); }
    },
    custBill(el) { S.bill = null; go('bill', { customerId: el.dataset.id }); },
    custOrder(el) { S.order = null; S.order = { customerId: el.dataset.id, lines: [], deliveryDate: '', advance: '', method: 'Cash', note: '' }; go('orderNew'); },
    vendBuy(el) { S.buy = null; go('buy', { vendorId: el.dataset.id }); },
    remind(el) {
      const p = D.find('customers', el.dataset.id), s = D.state.settings;
      openLink(waLink(p.phone, 'Hello ' + p.name + ', a gentle reminder from ' + s.name + ': your balance due is ' + money(p.balance) + '.' + (s.upi ? ' You can pay by UPI: ' + s.upi + '.' : '') + ' Thank you!'));
    },
    /* reports & settings */
    fltRep(el) { S.flt.rep = el.dataset.v; draw(true); },
    logoPick() { $('#logoFile').click(); },
    logoDel() { D.saveSettings({ logo: '' }); draw(true); },
    setSave() {
      const v = s => $(s).value.trim();
      D.saveSettings({ name: v('#s-name') || 'My Business', tagline: v('#s-tag'), address: v('#s-addr'), phone: v('#s-phone'), email: v('#s-email'), upi: v('#s-upi'), invoicePrefix: v('#s-prefix') || 'INV-', footer: v('#s-foot') });
      toast('Saved'); draw(true);
    },
    async backup() {
      const name = 'ECOLaver-backup-' + D.today() + '.json', json = D.exportJSON();
      try {
        if (NATIVE) await shareFile(name, json, true, 'ECOLaver backup');
        else {
          const blob = new Blob([json], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = name;
          document.body.appendChild(a); a.click(); a.remove();
        }
        D.saveSettings({ lastBackup: new Date().toISOString() });
        toast(NATIVE ? 'Choose where to save the backup' : 'Backup downloaded'); setTimeout(() => draw(true), 400);
      } catch (e) { toast(e.message, 1); }
    },
    restorePick() { $('#restoreFile').click(); },
    async resetAll() {
      const ok = await confirmSheet({ title: 'Delete ALL data?', text: 'Items, bills, customers, vendors, everything will be erased from this phone. Download a backup first!', ok: 'Delete everything', danger: true });
      if (!ok) return; D.resetAll(); S.bill = S.buy = S.order = S.recipe = null; toast('All data deleted'); tab('home');
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
      const out = $('[data-out="amt-' + d + '-' + t.dataset.i + '"]');
      if (out) {
        if (d === 'buy') out.textContent = buyRate(l);
        else if (d === 'recipe') out.textContent = 'Cost ' + money(D.r2(D.conv(num(l.qty), l.unit, D.item(l.itemId).unit) * D.item(l.itemId).cost));
        else out.textContent = money(num(l.qty) * num(l.rate));
      }
      UPD[d]();
    } else if (k === 'f') {
      S[t.dataset.d][t.dataset.f] = t.value;
      UPD[t.dataset.d]();
    } else if (k === 'q') {
      S.q[t.dataset.k] = t.value;
      const L = { stock: stockList, people: peopleList, inv: invList }[t.dataset.k];
      if (L) $('#list').innerHTML = L();
    } else if (k === 'pq') {
      $('#plist').innerHTML = S.pick.kind === 'item' ? pickItems(t.value) : pickPeople(t.value);
    } else if (k === 'makeq') updateMake();
  });

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.ch === 'unit') {
      const d = t.dataset.d, l = S[d].lines[+t.dataset.i], it = D.item(l.itemId);
      if (d !== 'buy' && d !== 'recipe') {
        l.rate = it.price ? String(+(it.price * D.conv(1, t.value, it.unit)).toPrecision(6)) : l.rate;
      }
      l.unit = t.value;
      $('#lines').innerHTML = ({ bill: () => sellLines('bill'), order: () => sellLines('order'), buy: buyLines, recipe: recipeLines })[d]();
      UPD[d]();
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
        try { D.importJSON(r.result); S.bill = S.buy = S.order = S.recipe = null; toast('Backup restored'); tab('home'); } catch (err) { toast(err.message, 1); }
      };
      r.readAsText(f);
    }
  });

  /* ---------- start ---------- */
  if (D.lastError) toast(D.lastError, 1);
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
  if (!NATIVE && 'serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
  history.replaceState({}, '');
  draw();
})();
