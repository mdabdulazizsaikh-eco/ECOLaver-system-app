/* ECOLaver Business - core logic v2 (no screen code here).
   All data is kept on the phone in localStorage.

   Items:
   - raw      : raw material (dates, honey...). Created automatically when you buy it.
   - pack     : packaging for ONE raw material and ONE pack size (e.g. Dates 500 g Pouch).
   - product  : packed product (e.g. Dates 500 g). Created automatically when you pack. */
(function (root) {
  'use strict';

  const KEY = 'ecolaver_biz_v2';
  const OLD_KEY = 'ecolaver_biz_v1';
  const UNITS = ['kg', 'g', 'litre', 'ml', 'pcs'];
  const COMPAT = { kg: ['kg', 'g'], g: ['g', 'kg'], litre: ['litre', 'ml'], ml: ['ml', 'litre'], pcs: ['pcs'] };
  const FACT = { kg: { g: 1000 }, g: { kg: 0.001 }, litre: { ml: 1000 }, ml: { litre: 0.001 } };
  const MARKET = 'Market (Cash)';

  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const r2 = x => Math.round((+x + Number.EPSILON) * 100) / 100;
  const r3 = x => Math.round((+x + Number.EPSILON) * 1000) / 1000;
  const r4 = x => Math.round((+x + Number.EPSILON) * 10000) / 10000;
  const sum = a => a.reduce((s, v) => s + (+v || 0), 0);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const localDate = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => localDate();
  const clean = s => String(s || '').trim().replace(/\s+/g, ' ');
  const nk = s => clean(s).toLowerCase();

  function conv(q, from, to) {
    if (from === to) return q;
    const f = FACT[from] && FACT[from][to];
    if (!f) throw new Error('Cannot convert ' + from + ' to ' + to);
    return q * f;
  }
  const compat = u => COMPAT[u] || [u];

  function money(n) {
    n = +n || 0;
    const neg = n < 0;
    const s = Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return (neg ? '-' : '') + '₹' + s;
  }
  const qtyFmt = n => String(r3(n));

  function fresh() {
    return {
      v: 2,
      settings: {
        name: 'ECOLaver', tagline: 'Choose nature, live better', address: '', phone: '', email: '',
        upi: '', logo: '', invoicePrefix: 'EL-', footer: 'Thank you for choosing nature!', lowDefault: 5, memberPct: 5, cardFee: 599
      },
      items: [], customers: [], vendors: [], purchases: [], batches: [], invoices: [], orders: [], vorders: [], adjustments: [],
      counters: { invoice: 1, purchase: 1, order: 1, vorder: 1 }
    };
  }

  let state = fresh();
  let lastError = '';
  let notice = '';

  function adopt(d) {
    const f = fresh();
    state = Object.assign(f, d);
    state.settings = Object.assign(f.settings, d.settings || {});
    state.counters = Object.assign(f.counters, d.counters || {});
    state.v = 2;
  }

  function load() {
    try {
      const ls = root.localStorage;
      const raw = ls && ls.getItem(KEY);
      if (raw) adopt(JSON.parse(raw));
      else {
        const old = ls && ls.getItem(OLD_KEY);
        if (old) {
          // Old (v1) test data is cleared on purpose. Only the company details are kept.
          const od = JSON.parse(old);
          state = fresh();
          state.settings = Object.assign(state.settings, od.settings || {});
          ls.removeItem(OLD_KEY);
          save();
          notice = 'Old test data was cleared. Your company details are kept.';
        }
      }
    } catch (e) { lastError = 'Could not read saved data: ' + e.message; state = fresh(); }
    return state;
  }

  function save() {
    try {
      const txt = JSON.stringify(state);
      root.localStorage.setItem(KEY, txt);
      if (DB.onSave) { try { DB.onSave(txt); } catch (e) { } }
      return true;
    }
    catch (e) { lastError = 'Could not save: ' + e.message; return false; }
  }
  // true when the phone's browser storage already holds our data
  function hasSaved() { try { return !!root.localStorage.getItem(KEY); } catch (e) { return false; } }
  // put back data from the automatic file copy (only used when browser storage is empty)
  function restoreText(txt) {
    const d = JSON.parse(txt);
    if (!d || d.v !== 2) throw new Error('Saved copy is not valid');
    adopt(d); save();
  }

  const find = (list, id) => state[list].find(x => x.id === id);
  const item = id => find('items', id);

  /* ---------- people (customers & vendors) ----------
     customers: balance > 0  => customer owes us (Due), < 0 => we hold their advance
     vendors:   balance > 0  => we owe vendor (Payable), < 0 => vendor holds our advance */
  function ledger(p, type, desc, amt, ref, method, date) {
    amt = r2(amt);
    p.balance = r2(p.balance + amt);
    p.ledger.push({ id: uid(), date: date || today(), ts: Date.now(), type, desc, amt, bal: p.balance, ref: ref || '', method: method || '' });
  }
  function rebuildLedger(p) {
    let b = 0;
    p.ledger.forEach(e => { b = r2(b + e.amt); e.bal = b; });
    p.balance = b;
  }
  function dropLedgerRef(list, personId, ref) {
    const p = personId ? find(list, personId) : null;
    if (!p) return;
    p.ledger = p.ledger.filter(e => e.ref !== ref);
    rebuildLedger(p);
  }

  function addPerson(kind, d) {
    const name = clean(d.name);
    if (!name) throw new Error('Please enter a name');
    const p = { id: uid(), name, phone: (d.phone || '').trim(), address: (d.address || '').trim(), balance: 0, ledger: [], created: today(), archived: false };
    state[kind].push(p);
    const op = +d.opening || 0;
    if (op) ledger(p, 'opening', 'Opening balance', op);
    save();
    return p;
  }

  function updatePerson(kind, id, d) {
    const p = find(kind, id);
    if (!p) throw new Error('Not found');
    const name = clean(d.name);
    if (!name) throw new Error('Please enter a name');
    p.name = name; p.phone = (d.phone || '').trim(); p.address = (d.address || '').trim();
    save();
    return p;
  }

  function removePerson(kind, id) {
    const p = find(kind, id);
    if (!p) return;
    const used = kind === 'customers'
      ? (state.invoices.some(i => i.customerId === id) || state.orders.some(o => o.customerId === id))
      : (state.purchases.some(x => x.vendorId === id) || state.vorders.some(x => x.vendorId === id));
    if (!used) state[kind] = state[kind].filter(x => x.id !== id);
    else p.archived = true;
    save();
  }

  function payment(kind, id, amount, method, note, advance) {
    const p = find(kind, id);
    amount = +amount;
    if (!p) throw new Error('Not found');
    if (!(amount > 0)) throw new Error('Enter an amount');
    const cust = kind === 'customers';
    const desc = note || (cust ? (advance ? 'Advance received' : 'Payment received') : (advance ? 'Advance paid' : 'Payment made'));
    ledger(p, advance ? 'advance' : 'payment', desc, -amount, '', method);
    save();
    return p;
  }

  function deleteLedgerEntry(kind, personId, entryId) {
    const p = find(kind, personId);
    if (!p) throw new Error('Not found');
    const e = p.ledger.find(x => x.id === entryId);
    if (!e) throw new Error('Not found');
    if (!['opening', 'payment', 'advance'].includes(e.type) || e.ref) throw new Error('This entry belongs to a bill, order or purchase. Delete that instead.');
    p.ledger = p.ledger.filter(x => x.id !== entryId);
    rebuildLedger(p);
    save();
  }

  /* ---------- Family Membership Card ---------- */
  const digits = s => { let d = String(s || '').replace(/\D/g, ''); if (d.length > 10 && d.startsWith('91')) d = d.slice(2); return d.slice(-10); };
  function issueCard(customerId, fee, method) {
    const c = find('customers', customerId);
    if (!c) throw new Error('Not found');
    if (c.member) throw new Error('Already a member');
    const no = digits(c.phone);
    if (no.length < 10) throw new Error('Add a 10 digit mobile number to this customer first');
    if (state.customers.some(x => x.member && x.member.no === no)) throw new Error('This mobile number already has a card');
    fee = Math.max(+fee || 0, 0);
    c.member = { no, since: today(), fee: r2(fee) };
    if (fee > 0) { ledger(c, 'card', 'Family card fee', fee, 'card', '', today()); ledger(c, 'payment', 'Family card fee paid', -fee, 'card', method || 'Cash', today()); }
    save();
    return c;
  }
  function revokeCard(customerId) {
    const c = find('customers', customerId);
    if (!c) return;
    c.member = null;
    c.ledger = c.ledger.filter(e => e.ref !== 'card');
    rebuildLedger(c);
    save();
  }
  /* member discount % for one item: its raw material's own % if set, otherwise the shop default */
  function memberPct(itemId) {
    const it = item(itemId);
    if (!it) return state.settings.memberPct;
    const raw = it.kind === 'raw' ? it : item(it.rawId);
    return raw && raw.memberPct != null ? raw.memberPct : state.settings.memberPct;
  }

  /* ---------- items ---------- */
  const sizeLabel = (size, unit) => qtyFmt(size) + ' ' + unit;
  const packName = (raw, label, pname) => raw.name + ' ' + label + ' ' + (clean(pname) || 'Packet');
  const productName = (raw, label) => raw.name + ' ' + label;
  const rawItems = () => state.items.filter(i => !i.archived && i.kind === 'raw');
  const findRaw = name => rawItems().find(i => nk(i.name) === nk(name));

  function updateItem(id, d) {
    const it = item(id);
    if (!it) throw new Error('Not found');
    if (it.kind === 'raw') {
      const name = clean(d.name);
      if (!name) throw new Error('Please enter a name');
      if (state.items.some(i => i.id !== id && !i.archived && i.kind === 'raw' && nk(i.name) === nk(name))) throw new Error('This name already exists');
      it.name = name;
      state.items.filter(i => i.rawId === id).forEach(i => {
        i.name = i.kind === 'pack' ? packName(it, i.label, i.pname) : productName(it, i.label);
      });
    }
    if (it.manual) {
      const name = clean(d.name);
      if (!name) throw new Error('Please enter a name');
      if (state.items.some(i => i.id !== id && !i.archived && i.kind !== 'pack' && nk(i.name) === nk(name))) throw new Error('This name already exists');
      it.name = name;
      if ('cost' in d) it.cost = Math.max(+d.cost || 0, 0);
    }
    it.price = +d.price || 0;
    it.low = +d.low || 0;
    if ('memberPct' in d) it.memberPct = (d.memberPct === '' || d.memberPct == null) ? null : Math.min(Math.max(+d.memberPct || 0, 0), 100);
    save();
    return it;
  }

  /* a plain catalogue item (not made by packing): you sell it as it is */
  function addItem(d) {
    const name = clean(d.name);
    if (!name) throw new Error('Please enter the item name');
    if (state.items.some(i => !i.archived && i.kind !== 'pack' && nk(i.name) === nk(name))) throw new Error('This item already exists');
    const it = { id: uid(), kind: 'product', manual: true, name, rawId: null, size: 0, sizeUnit: '', sizeKey: 0, label: '', unit: UNITS.includes(d.unit) ? d.unit : 'pcs', stock: 0, cost: Math.max(+d.cost || 0, 0), price: Math.max(+d.price || 0, 0), low: 0, archived: false };
    state.items.push(it);
    const q = r3(+d.stock || 0);
    if (q > 0) { state.adjustments.push({ id: uid(), date: today(), ts: Date.now(), itemId: it.id, delta: q, reason: 'Opening stock' }); it.stock = q; }
    save();
    return it;
  }

  function stockAdjust(id, newStock, reason) {
    const it = item(id);
    if (!it) throw new Error('Not found');
    newStock = r3(+newStock);
    if (isNaN(newStock)) throw new Error('Enter the real stock');
    const delta = r3(newStock - it.stock);
    state.adjustments.push({ id: uid(), date: today(), ts: Date.now(), itemId: id, delta, reason: reason || 'Stock correction' });
    it.stock = newStock;
    save();
    return delta;
  }

  function hasHistory(ids) {
    const has = x => ids.includes(x);
    return state.purchases.some(p => p.lines.some(l => has(l.itemId))) ||
      state.invoices.some(i => i.lines.some(l => has(l.itemId))) ||
      state.orders.some(o => o.lines.some(l => has(l.itemId))) ||
      state.batches.some(b => has(b.rawId) || (b.packUsed || []).some(u => has(u.itemId)) || (b.entries || []).some(e => has(e.productId))) ||
      state.adjustments.some(a => has(a.itemId));
  }

  /* After undoing something: drop items that were created by it and have no other history. */
  function prune(ids) {
    ids.forEach(id => {
      const it = item(id);
      if (!it || it.stock !== 0 && Math.abs(it.stock) > 1e-9) return;
      if (state.items.some(i => i.rawId === id)) return;
      if (!hasHistory([id])) state.items = state.items.filter(i => i.id !== id);
    });
  }

  /* Remove an item. A raw material takes its packaging and products with it.
     Items without any history are deleted; the others are hidden so old bills stay correct. */
  function removeItem(id) {
    const it = item(id);
    if (!it) return;
    const ids = [id].concat(it.kind === 'raw' ? state.items.filter(i => i.rawId === id).map(i => i.id) : []);
    if (hasHistory(ids)) state.items.forEach(i => { if (ids.includes(i.id)) i.archived = true; });
    else state.items = state.items.filter(i => !ids.includes(i.id));
    save();
  }

  /* ---------- buying stock ----------
     lines: { type:'raw', name, unit, qty, total }
            { type:'pack', rawName, size, sizeUnit, pname, qty, total }
     The extra cost (transport, food...) is shared by the price of every line. */
  function places() {
    const set = {};
    state.vendors.filter(v => !v.archived).forEach(v => { set[nk(v.name)] = v.name; });
    state.purchases.forEach(p => { if (p.vendorName && p.vendorName !== MARKET) set[nk(p.vendorName)] = p.vendorName; });
    return Object.keys(set).map(k => set[k]).sort((a, b) => a.localeCompare(b));
  }

  function purchase(d) {
    const raw = (d.lines || []).filter(l => +l.qty > 0 || clean(l.name) || clean(l.rawName));
    if (!raw.length) throw new Error('Add at least one item');
    const newRaws = {};
    const plan = raw.map((l, i) => {
      const n = i + 1, qty = +l.qty, total = +l.total || 0;
      if (!(qty > 0)) throw new Error('Item ' + n + ': enter the quantity');
      if (!(r3(qty) > 0)) throw new Error('Item ' + n + ': quantity is too small');
      if (total < 0) throw new Error('Item ' + n + ': price cannot be negative');
      if (l.type === 'pack') {
        const rawName = clean(l.rawName);
        if (!rawName) throw new Error('Item ' + n + ': choose the raw material this packaging is for');
        const size = +l.size;
        if (!(size > 0)) throw new Error('Item ' + n + ': enter the pack size, like 500 g');
        const ex = findRaw(rawName), pend = newRaws[nk(rawName)];
        const ru = ex ? ex.unit : (pend ? pend.unit : '');
        if (!ru) throw new Error('Item ' + n + ': buy the raw material "' + rawName + '" first');
        let key;
        try { key = r3(conv(size, l.sizeUnit || ru, ru)); } catch (e) { throw new Error('Item ' + n + ': pack size must be in ' + compat(ru).join(' or ')); }
        if (!(key > 0)) throw new Error('Item ' + n + ': pack size is too small');
        return { type: 'pack', rawName: ex ? ex.name : pend.name, rawKey: nk(rawName), size, sizeUnit: l.sizeUnit || ru, key, pname: clean(l.pname), qty, total };
      }
      const name = clean(l.name);
      if (!name) throw new Error('Item ' + n + ': enter the name');
      const unit = UNITS.includes(l.unit) ? l.unit : '';
      if (!unit) throw new Error('Item ' + n + ': choose the unit');
      const ex = findRaw(name), pend = newRaws[nk(name)];
      const base = ex ? ex.unit : (pend ? pend.unit : unit);
      try { conv(1, unit, base); } catch (e) { throw new Error('Item ' + n + ': "' + (ex ? ex.name : name) + '" is counted in ' + compat(base).join(' or ')); }
      if (!(r3(conv(qty, unit, base)) > 0)) throw new Error('Item ' + n + ': quantity is too small');
      if (!ex && !pend) newRaws[nk(name)] = { name, unit };
      return { type: 'raw', name: ex ? ex.name : (pend ? pend.name : name), key: nk(name), unit, qty, total };
    });

    const sub = sum(plan.map(l => l.total));
    const extra = Math.max(+d.extra || 0, 0);
    const total = r2(sub + extra);
    const paid = Math.max(+d.paid || 0, 0);
    const from = clean(d.from);
    const market = !from || nk(from) === nk(MARKET) || nk(from) === 'market';
    const due = r2(sub - paid); // the extra cost is paid by you directly, not to the vendor
    if (Math.abs(due) > 0.005 && market) throw new Error('Type the vendor name to keep the ' + (due > 0 ? 'unpaid amount' : 'extra money paid'));
    let vendor = null, vo = null;
    if (d.orderId) {
      vo = find('vorders', d.orderId);
      if (!vo || vo.status !== 'pending') throw new Error('This pre-order is not pending any more');
    }
    if (!market) {
      vendor = state.vendors.find(v => !v.archived && nk(v.name) === nk(from)) || null;
      if (!vendor && Math.abs(due) > 0.005) vendor = addPerson('vendors', { name: from });
    }

    // everything is valid: now change the data
    Object.keys(newRaws).forEach(k => {
      state.items.push({ id: uid(), kind: 'raw', name: newRaws[k].name, unit: newRaws[k].unit, stock: 0, cost: 0, price: 0, low: 0, archived: false });
    });
    const no = 'PUR-' + pad(state.counters.purchase++, 4);
    const out = plan.map(l => {
      let it, qtyBase, unit;
      if (l.type === 'raw') {
        it = findRaw(l.key);
        unit = l.unit;
        qtyBase = r3(conv(l.qty, unit, it.unit));
      } else {
        const rw = findRaw(l.rawKey);
        it = state.items.find(i => !i.archived && i.kind === 'pack' && i.rawId === rw.id && i.sizeKey === l.key && nk(i.pname || 'Packet') === nk(l.pname || 'Packet'));
        if (!it) {
          const label = sizeLabel(l.size, l.sizeUnit);
          it = { id: uid(), kind: 'pack', name: packName(rw, label, l.pname), rawId: rw.id, size: l.size, sizeUnit: l.sizeUnit, sizeKey: l.key, label, pname: clean(l.pname) || 'Packet', unit: 'pcs', stock: 0, cost: 0, price: 0, low: 0, archived: false };
          state.items.push(it);
        }
        unit = 'pcs';
        qtyBase = r3(l.qty);
      }
      if (!(qtyBase > 0)) throw new Error('Quantity is too small to count');
      const share = sub > 0 ? extra * (l.total / sub) : extra / plan.length;
      const landed = l.total + share;
      const old = Math.max(it.stock, 0);
      it.cost = (old + qtyBase) > 0 ? (old * it.cost + landed) / (old + qtyBase) : it.cost;
      it.stock = r3(it.stock + qtyBase);
      return { itemId: it.id, name: it.name, kind: it.kind, qty: l.qty, unit, qtyBase, total: r2(l.total), landed: r2(landed), perUnit: r4(landed / qtyBase) };
    });
    const pu = {
      id: uid(), no, date: d.date || today(), ts: Date.now(), vendorId: vendor ? vendor.id : '', vendorName: market ? MARKET : (vendor ? vendor.name : from),
      orderId: vo ? vo.id : '', orderNo: vo ? vo.no : '', advanceUsed: vo ? vo.advance : 0, lines: out, items: r2(sub), extra: r2(extra), extras: (d.extras || []).filter(e => +e.amount > 0).map(e => ({ label: clean(e.label), amount: r2(+e.amount) })), total, paid: r2(paid), note: d.note || '', method: d.method || 'Cash'
    };
    state.purchases.push(pu);
    if (vo) { vo.status = 'received'; vo.purchaseId = pu.id; }
    if (vendor) {
      ledger(vendor, 'purchase', 'Purchase ' + no, r2(sub), pu.id, '', pu.date);
      if (paid > 0) ledger(vendor, 'payment', 'Paid on ' + no, -paid, pu.id, pu.method, pu.date);
    }
    save();
    return pu;
  }

  function deletePurchase(id) {
    const pu = find('purchases', id);
    if (!pu) throw new Error('Not found');
    const used = pu.lines.filter(l => { const it = item(l.itemId); return it && it.stock + 1e-9 < l.qtyBase; });
    if (used.length) throw new Error('Cannot delete: ' + used.map(l => l.name).join(', ') + ' is already used (packed or sold). Undo that first.');
    pu.lines.forEach(l => { const it = item(l.itemId); if (it) it.stock = r3(it.stock - l.qtyBase); });
    dropLedgerRef('vendors', pu.vendorId, pu.id);
    if (pu.orderId) { const vo = find('vorders', pu.orderId); if (vo) { vo.status = 'pending'; vo.purchaseId = ''; } }
    state.purchases = state.purchases.filter(p => p.id !== id);
    prune(pu.lines.map(l => l.itemId).sort((a, b) => (item(a) && item(a).kind === 'pack' ? -1 : 1)));
    save();
  }

  /* ---------- packing: raw material -> packed products ---------- */
  function packGroups(rawId) {
    const g = {};
    state.items.filter(i => !i.archived && i.kind === 'pack' && i.rawId === rawId).forEach(i => {
      const o = g[i.sizeKey] || (g[i.sizeKey] = { key: i.sizeKey, label: i.label, size: i.size, sizeUnit: i.sizeUnit, packs: [], product: null });
      o.packs.push(i);
    });
    const arr = Object.keys(g).map(k => g[k]).sort((a, b) => a.key - b.key);
    arr.forEach(o => {
      o.product = state.items.find(i => !i.archived && i.kind === 'product' && i.rawId === rawId && i.sizeKey === o.key) || null;
      if (o.product) o.label = o.product.label;
    });
    return arr;
  }
  const rawsWithPacks = () => rawItems().filter(r => packGroups(r.id).length > 0);
  const suggest = (cost, margin) => Math.ceil(cost * (1 + (+margin || 0) / 100));

  /* cost of ONE packet of a group (raw part + packaging part) */
  function packetCost(rawId, group) {
    const raw = item(rawId);
    const rawPart = raw.cost * group.key;
    const packPart = sum(group.packs.map(p => p.cost));
    return { raw: r4(rawPart), pack: r4(packPart), total: r4(rawPart + packPart) };
  }

  function packPlan(rawId, entries, extra) {
    const raw = item(rawId);
    const groups = packGroups(rawId);
    const list = (entries || []).map(e => ({ g: groups.find(x => x.key === +e.key), count: +e.count || 0, price: +e.price || 0 })).filter(x => x.g && x.count > 0);
    const rawNeed = r3(sum(list.map(x => x.count * x.g.key)));
    const packNeed = {};
    list.forEach(x => x.g.packs.forEach(p => { packNeed[p.id] = r3((packNeed[p.id] || 0) + x.count); }));
    const short = [];
    if (raw.stock + 1e-9 < rawNeed) short.push({ name: raw.name, need: rawNeed, have: raw.stock, unit: raw.unit });
    Object.keys(packNeed).forEach(id => { const p = item(id); if (p.stock + 1e-9 < packNeed[id]) short.push({ name: p.name, need: packNeed[id], have: p.stock, unit: 'pcs' }); });
    const w = sum(list.map(x => x.count * x.g.key));
    const ex = Math.max(+extra || 0, 0);
    const rows = list.map(x => {
      const c = packetCost(rawId, x.g);
      const share = w > 0 ? ex * (x.count * x.g.key) / w : 0;
      const perExtra = share / x.count;
      return { key: x.g.key, count: x.count, price: x.price, cost: r4(c.total + perExtra), group: x.g };
    });
    return { raw, list, rows, rawNeed, packNeed, short, totalCost: r2(sum(rows.map(r => r.cost * r.count))) };
  }

  function pack(d) {
    const raw = item(d.rawId);
    if (!raw || raw.kind !== 'raw') throw new Error('Choose a raw material');
    const plan = packPlan(d.rawId, d.entries, d.extra);
    if (!plan.rows.length) throw new Error('Enter how many packets you made');
    if (plan.short.length && !d.force) {
      const e = new Error('Not enough stock: ' + plan.short.map(s => s.name).join(', '));
      e.short = plan.short;
      throw e;
    }
    const packUsed = Object.keys(plan.packNeed).map(id => {
      const p = item(id);
      p.stock = r3(p.stock - plan.packNeed[id]);
      return { itemId: id, name: p.name, qty: plan.packNeed[id] };
    });
    raw.stock = r3(raw.stock - plan.rawNeed);
    const entries = plan.rows.map(r => {
      let pr = r.group.product;
      if (!pr) {
        pr = { id: uid(), kind: 'product', name: productName(raw, r.group.label), rawId: raw.id, size: r.group.size, sizeUnit: r.group.sizeUnit, sizeKey: r.key, label: r.group.label, unit: 'pcs', stock: 0, cost: 0, price: 0, low: 0, archived: false };
        state.items.push(pr);
      }
      const old = Math.max(pr.stock, 0);
      pr.cost = (old + r.count) > 0 ? (old * pr.cost + r.count * r.cost) / (old + r.count) : r.cost;
      pr.stock = r3(pr.stock + r.count);
      if (r.price > 0) pr.price = r.price;
      return { productId: pr.id, name: pr.name, count: r.count, unitCost: r2(r.cost) };
    });
    const b = { id: uid(), date: today(), ts: Date.now(), rawId: raw.id, rawName: raw.name, rawUsed: plan.rawNeed, rawUnit: raw.unit, entries, packUsed, total: plan.totalCost };
    state.batches.push(b);
    save();
    return b;
  }

  function undoBatch(id) {
    const b = find('batches', id);
    if (!b) throw new Error('Not found');
    const sold = b.entries.filter(e => { const p = item(e.productId); return p && p.stock + 1e-9 < e.count; });
    if (sold.length) throw new Error('Cannot undo: ' + sold.map(e => e.name).join(', ') + ' is already sold. Cancel those bills first.');
    const raw = item(b.rawId);
    if (raw) raw.stock = r3(raw.stock + b.rawUsed);
    b.packUsed.forEach(u => { const p = item(u.itemId); if (p) p.stock = r3(p.stock + u.qty); });
    b.entries.forEach(e => { const p = item(e.productId); if (p) p.stock = r3(p.stock - e.count); });
    state.batches = state.batches.filter(x => x.id !== id);
    prune(b.entries.map(e => e.productId));
    save();
  }

  /* ---------- selling ---------- */
  function normLine(l) {
    const it = item(l.itemId);
    if (!it) throw new Error('Item missing');
    const qty = +l.qty;
    const unit = l.unit || it.unit;
    const qb = r3(conv(qty, unit, it.unit));
    const rate = +l.rate || 0;
    return { itemId: it.id, name: it.name, qty, unit, rate, amount: r2(qty * rate), qtyBase: qb, cost: r2(qb * it.cost) };
  }

  function stockIssues(lines) {
    const need = {};
    lines.filter(l => l.itemId && +l.qty > 0).forEach(l => {
      const it = item(l.itemId);
      if (!it) return;
      need[it.id] = (need[it.id] || 0) + conv(+l.qty, l.unit || it.unit, it.unit);
    });
    return Object.keys(need).map(id => ({ it: item(id), need: r3(need[id]) })).filter(x => x.it.stock + 1e-9 < x.need)
      .map(x => ({ name: x.it.name, need: x.need, have: x.it.stock, unit: x.it.unit }));
  }

  function invoice(d) {
    const lines = (d.lines || []).filter(l => l.itemId && +l.qty > 0).map(normLine);
    if (!lines.length) throw new Error('Add at least one item');
    const cust = d.customerId ? find('customers', d.customerId) : null;
    const subtotal = r2(sum(lines.map(l => l.amount)));
    const discount = Math.min(Math.max(+d.discount || 0, 0), subtotal);
    const total = r2(subtotal - discount);
    let paid = Math.max(+d.paid || 0, 0);
    if (!cust) {
      if (paid < total - 0.005) throw new Error('Choose a customer to keep the unpaid amount');
      paid = total;
    }
    let order = null;
    if (d.orderId) {
      order = find('orders', d.orderId);
      if (!order || order.status !== 'pending') throw new Error('This order is not waiting for delivery any more');
    }
    const advanceUsed = order ? order.advance : 0;
    const no = state.settings.invoicePrefix + pad(state.counters.invoice++, 4);
    const cogs = r2(sum(lines.map(l => l.cost)));
    const inv = {
      id: uid(), no, date: d.date || today(), ts: Date.now(), customerId: cust ? cust.id : '',
      customerName: cust ? cust.name : ((d.walkName || '').trim() || 'Walk-in customer'),
      customerPhone: cust ? cust.phone : '', lines, subtotal, discount: r2(discount), total, paid: r2(paid),
      method: d.method || 'Cash', advanceUsed, billBalance: r2(total - paid - advanceUsed), cogs, profit: r2(total - cogs),
      memberNo: d.memberNo || '', memberDiscount: r2(Math.min(Math.max(+d.memberDiscount || 0, 0), discount)), note: d.note || '', orderId: order ? order.id : '', orderNo: order ? order.no : '', void: false
    };
    lines.forEach(l => { const it = item(l.itemId); it.stock = r3(it.stock - l.qtyBase); });
    state.invoices.push(inv);
    if (cust) {
      ledger(cust, 'invoice', 'Bill ' + no, total, inv.id, '', inv.date);
      if (paid > 0) ledger(cust, 'payment', 'Paid on bill ' + no, -paid, inv.id, inv.method, inv.date);
    }
    if (order) { order.status = 'delivered'; order.invoiceId = inv.id; }
    save();
    return inv;
  }

  function voidInvoice(id) {
    const inv = find('invoices', id);
    if (!inv || inv.void) throw new Error('Cannot cancel this bill');
    inv.void = true;
    inv.lines.forEach(l => { const it = item(l.itemId); if (it) it.stock = r3(it.stock + l.qtyBase); });
    const cust = inv.customerId ? find('customers', inv.customerId) : null;
    if (cust) {
      ledger(cust, 'void', 'Bill ' + inv.no + ' cancelled', -inv.total, inv.id);
      if (inv.paid > 0) ledger(cust, 'refund', 'Refund for bill ' + inv.no, inv.paid, inv.id);
    }
    if (inv.orderId) {
      const o = find('orders', inv.orderId);
      if (o) { o.status = 'pending'; o.invoiceId = ''; }
    }
    save();
  }

  /* Delete a bill completely (as if it never happened). */
  function deleteInvoice(id) {
    const inv = find('invoices', id);
    if (!inv) throw new Error('Not found');
    if (!inv.void) {
      inv.lines.forEach(l => { const it = item(l.itemId); if (it) it.stock = r3(it.stock + l.qtyBase); });
      if (inv.orderId) { const o = find('orders', inv.orderId); if (o) { o.status = 'pending'; o.invoiceId = ''; } }
    }
    dropLedgerRef('customers', inv.customerId, inv.id);
    state.invoices = state.invoices.filter(i => i.id !== id);
    save();
  }

  /* ---------- customer advance orders ---------- */
  function order(d) {
    const cust = find('customers', d.customerId);
    if (!cust) throw new Error('Choose a customer');
    const lines = (d.lines || []).filter(l => +l.qty > 0 && (l.itemId || clean(l.name))).map(l => {
      const it = l.itemId ? item(l.itemId) : null;
      const qty = +l.qty, unit = l.unit || (it ? it.unit : 'pcs'), rate = +l.rate || 0;
      return { itemId: it ? it.id : '', name: it ? it.name : clean(l.name), qty, unit, rate, amount: r2(qty * rate) };
    });
    if (!lines.length) throw new Error('Add at least one item');
    const advance = Math.max(+d.advance || 0, 0);
    const subtotal = r2(sum(lines.map(l => l.amount)));
    const discount = Math.min(Math.max(+d.discount || 0, 0), subtotal);
    const total = r2(subtotal - discount);
    const no = 'ORD-' + pad(state.counters.order++, 4);
    const o = {
      id: uid(), no, date: today(), ts: Date.now(), customerId: cust.id, customerName: cust.name, customerPhone: cust.phone || '', lines, subtotal, discount: r2(discount), memberDiscount: r2(Math.min(Math.max(+d.memberDiscount || 0, 0), discount)), memberNo: d.memberNo || '', total,
      advance: r2(advance), method: d.method || 'Cash', deliveryDate: d.deliveryDate || '', note: d.note || '',
      status: 'pending', invoiceId: ''
    };
    state.orders.push(o);
    if (advance > 0) ledger(cust, 'advance', 'Advance for order ' + no, -advance, o.id, o.method);
    save();
    return o;
  }

  function cancelOrder(id) {
    const o = find('orders', id);
    if (!o || o.status !== 'pending') throw new Error('Cannot cancel this order');
    o.status = 'cancelled';
    const cust = find('customers', o.customerId);
    if (cust && o.advance > 0) ledger(cust, 'refund', 'Advance refunded for ' + o.no, o.advance, o.id);
    save();
  }

  function deleteOrder(id) {
    const o = find('orders', id);
    if (!o) throw new Error('Not found');
    if (o.status === 'delivered') throw new Error('This order was delivered. Delete its bill first.');
    dropLedgerRef('customers', o.customerId, o.id);
    state.orders = state.orders.filter(x => x.id !== id);
    save();
  }

  /* ---------- pre-orders to vendors (advance paid, goods not arrived yet) ---------- */
  function vendorOrder(d) {
    const name = clean(d.vendor);
    if (!name) throw new Error('Type the vendor name');
    const lines = (d.lines || []).filter(l => +l.qty > 0 && (clean(l.name) || clean(l.rawName)));
    if (!lines.length) throw new Error('Add at least one item you ordered');
    const advance = Math.max(+d.advance || 0, 0);
    let v = state.vendors.find(x => !x.archived && nk(x.name) === nk(name));
    if (!v) v = addPerson('vendors', { name });
    const no = 'VORD-' + pad(state.counters.vorder++, 4);
    const total = r2(sum(lines.map(l => +l.total || 0)));
    const o = { id: uid(), no, date: today(), ts: Date.now(), vendorId: v.id, vendorName: v.name, lines: lines.map(l => Object.assign({}, l)), total, advance: r2(advance), method: d.method || 'Cash', expectedDate: d.expectedDate || '', note: d.note || '', status: 'pending', purchaseId: '' };
    state.vorders.push(o);
    if (advance > 0) ledger(v, 'advance', 'Advance for order ' + no, -advance, o.id, o.method);
    save();
    return o;
  }
  function cancelVendorOrder(id) {
    const o = find('vorders', id);
    if (!o || o.status !== 'pending') throw new Error('Cannot cancel this order');
    o.status = 'cancelled';
    const v = find('vendors', o.vendorId);
    if (v && o.advance > 0) ledger(v, 'refund', 'Advance returned for ' + o.no, o.advance, o.id);
    save();
  }
  function deleteVendorOrder(id) {
    const o = find('vorders', id);
    if (!o) throw new Error('Not found');
    if (o.status === 'received') throw new Error('Goods were received. Delete that purchase first.');
    dropLedgerRef('vendors', o.vendorId, o.id);
    state.vorders = state.vorders.filter(x => x.id !== id);
    save();
  }

  /* ---------- history, totals, reports ---------- */
  function movements(id) {
    const out = [];
    state.purchases.forEach(p => p.lines.forEach(l => { if (l.itemId === id) out.push({ date: p.date, ts: p.ts, type: 'Bought', ref: p.no, qty: l.qtyBase }); }));
    state.batches.forEach(b => {
      if (b.rawId === id) out.push({ date: b.date, ts: b.ts, type: 'Packed into products', ref: '', qty: -b.rawUsed });
      (b.packUsed || []).forEach(u => { if (u.itemId === id) out.push({ date: b.date, ts: b.ts, type: 'Used in packing', ref: '', qty: -u.qty }); });
      (b.entries || []).forEach(e => { if (e.productId === id) out.push({ date: b.date, ts: b.ts, type: 'Packed', ref: '', qty: e.count }); });
    });
    state.invoices.forEach(i => { if (!i.void) i.lines.forEach(l => { if (l.itemId === id) out.push({ date: i.date, ts: i.ts, type: 'Sold', ref: i.no, qty: -l.qtyBase }); }); });
    state.adjustments.forEach(a => { if (a.itemId === id) out.push({ date: a.date, ts: a.ts, type: a.reason, ref: '', qty: a.delta }); });
    return out.sort((a, b) => b.ts - a.ts);
  }

  function totals() {
    const act = state.items.filter(i => !i.archived);
    const t = today();
    const month = t.slice(0, 7);
    const sales = state.invoices.filter(i => !i.void);
    return {
      stockValue: r2(sum(act.map(i => Math.max(i.stock, 0) * i.cost))),
      customerDue: r2(sum(state.customers.map(c => c.balance > 0 ? c.balance : 0))),
      customerAdvance: r2(sum(state.customers.map(c => c.balance < 0 ? -c.balance : 0))),
      vendorDue: r2(sum(state.vendors.map(v => v.balance > 0 ? v.balance : 0))),
      vendorAdvance: r2(sum(state.vendors.map(v => v.balance < 0 ? -v.balance : 0))),
      todaySales: r2(sum(sales.filter(i => i.date === t).map(i => i.total))),
      todayProfit: r2(sum(sales.filter(i => i.date === t).map(i => i.profit))),
      todayBills: sales.filter(i => i.date === t).length,
      monthSales: r2(sum(sales.filter(i => i.date.slice(0, 7) === month).map(i => i.total))),
      monthProfit: r2(sum(sales.filter(i => i.date.slice(0, 7) === month).map(i => i.profit))),
      low: act.filter(i => i.low > 0 && i.stock <= i.low),
      pendingOrders: state.orders.filter(o => o.status === 'pending').length + state.vorders.filter(o => o.status === 'pending').length
    };
  }

  function lastDays(n) {
    const out = [];
    for (let k = n - 1; k >= 0; k--) {
      const d = new Date(); d.setDate(d.getDate() - k);
      const ds = localDate(d);
      out.push({ date: ds, label: d.toLocaleDateString('en-IN', { weekday: 'short' }), total: r2(sum(state.invoices.filter(i => !i.void && i.date === ds).map(i => i.total))) });
    }
    return out;
  }

  /* every rupee that came in or went out in the period, newest first */
  function cashFlow(from, to) {
    const ins = [], outs = [];
    const inR = (d, ts, who, what, amt, method, ref) => ins.push({ date: d, ts: ts || 0, who, what, amt: r2(amt), method: method || '', ref: ref || '' });
    const outR = (d, ts, who, what, amt, method, ref) => outs.push({ date: d, ts: ts || 0, who, what, amt: r2(amt), method: method || '', ref: ref || '' });
    state.customers.forEach(c => c.ledger.forEach(e => {
      if (e.date < from || e.date > to) return;
      if (e.type === 'payment' || e.type === 'advance') inR(e.date, e.ts, c.name, e.desc, -e.amt, e.method, e.ref);
      if (e.type === 'refund') inR(e.date, e.ts, c.name, e.desc, -e.amt, e.method, e.ref);
    }));
    state.vendors.forEach(v => v.ledger.forEach(e => {
      if (e.date < from || e.date > to) return;
      if (e.type === 'payment' || e.type === 'advance') outR(e.date, e.ts, v.name, e.desc, -e.amt, e.method, e.ref);
      if (e.type === 'refund') outR(e.date, e.ts, v.name, e.desc, -e.amt, e.method, e.ref);
    }));
    state.invoices.filter(i => !i.void && !i.customerId && i.date >= from && i.date <= to && i.paid > 0)
      .forEach(i => inR(i.date, i.ts, 'Walk-in customer', 'Paid on bill ' + i.no, i.paid, i.method, i.id));
    state.purchases.filter(p => p.date >= from && p.date <= to).forEach(p => {
      if (!p.vendorId && p.paid > 0) outR(p.date, p.ts, p.vendorName || 'Market', 'Paid on ' + p.no, p.paid, p.method, p.id);
      if (p.extra > 0) outR(p.date, p.ts, 'Extra cost', (p.extras && p.extras.length ? p.extras.filter(x => x.amount > 0).map(x => (x.label || 'Extra') + ' ₹' + x.amount).join(', ') : 'Extra cost') + ' · ' + p.no, p.extra, 'Cash', p.id);
    });
    const byNew = (a, b) => (b.date + String(b.ts).padStart(15, '0')).localeCompare(a.date + String(a.ts).padStart(15, '0'));
    ins.sort(byNew); outs.sort(byNew);
    return { ins, outs, totalIn: r2(sum(ins.map(x => x.amt))), totalOut: r2(sum(outs.map(x => x.amt))) };
  }

  function report(from, to) {
    const inv = state.invoices.filter(i => !i.void && i.date >= from && i.date <= to);
    const pur = state.purchases.filter(p => p.date >= from && p.date <= to);
    const byItem = {};
    inv.forEach(i => i.lines.forEach(l => {
      const o = byItem[l.itemId] || (byItem[l.itemId] = { name: l.name, amount: 0, profit: 0 });
      const net = i.subtotal > 0 ? l.amount * i.total / i.subtotal : l.amount; // bill discount shared by item
      o.amount += net; o.profit += net - l.cost;
    }));
    const cf = cashFlow(from, to), cashIn = cf.totalIn, cashOut = cf.totalOut;
    return {
      bills: inv.length, sales: r2(sum(inv.map(i => i.total))), discount: r2(sum(inv.map(i => i.discount))),
      cogs: r2(sum(inv.map(i => i.cogs))), profit: r2(sum(inv.map(i => i.profit))),
      cards: state.customers.filter(c => c.member && c.member.since >= from && c.member.since <= to).length,
      cardIncome: r2(sum(state.customers.filter(c => c.member && c.member.since >= from && c.member.since <= to).map(c => c.member.fee))),
      purchases: r2(sum(pur.map(p => p.total))), cashIn: r2(cashIn), cashOut: r2(cashOut),
      top: Object.values(byItem).map(o => ({ name: o.name, amount: r2(o.amount), profit: r2(o.profit) })).sort((a, b) => b.amount - a.amount).slice(0, 8)
    };
  }

  /* ---------- backup ---------- */
  function exportJSON() { return JSON.stringify(state, null, 1); }
  function importJSON(text) {
    const d = JSON.parse(text);
    if (!d || !Array.isArray(d.items) || !d.settings) throw new Error('This is not an ECOLaver backup file');
    if (d.v !== 2) throw new Error('This backup is from an old version of the app and cannot be used');
    adopt(d);
    save();
  }
  function resetAll(keepSettings) {
    const s = state.settings;
    state = fresh();
    if (keepSettings !== false) state.settings = Object.assign(state.settings, s);
    save();
  }
  function saveSettings(s) { Object.assign(state.settings, s); save(); }

  const DB = {
    digits, issueCard, revokeCard, memberPct, UNITS, MARKET, load, save, uid, today, r2, r3, r4, sum, conv, compat, money, qtyFmt, localDate, nk, clean,
    get state() { return state; }, get lastError() { return lastError; }, get notice() { return notice; },
    item, find, rawItems, findRaw, places, addPerson, updatePerson, removePerson, payment, deleteLedgerEntry,
    updateItem, addItem, cashFlow, removeItem, stockAdjust, purchase, deletePurchase, packGroups, rawsWithPacks, packetCost, packPlan, pack, undoBatch, suggest,
    stockIssues, vendorOrder, cancelVendorOrder, deleteVendorOrder, invoice, voidInvoice, deleteInvoice, order, cancelOrder, deleteOrder, movements, totals, lastDays, report,
    exportJSON, importJSON, resetAll, saveSettings, hasSaved, restoreText
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DB;
  else root.DB = DB;
})(typeof window !== 'undefined' ? window : globalThis);
