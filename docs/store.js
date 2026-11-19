/* ECOLaver Business - core logic (no screen code here).
   All data is kept on the phone in localStorage. */
(function (root) {
  'use strict';

  const KEY = 'ecolaver_biz_v1';
  const UNITS = ['kg', 'g', 'litre', 'ml', 'pcs'];
  const COMPAT = { kg: ['kg', 'g'], g: ['g', 'kg'], litre: ['litre', 'ml'], ml: ['ml', 'litre'], pcs: ['pcs'] };
  const FACT = { kg: { g: 1000 }, g: { kg: 0.001 }, litre: { ml: 1000 }, ml: { litre: 0.001 } };

  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const r2 = x => Math.round((+x + Number.EPSILON) * 100) / 100;
  const r3 = x => Math.round((+x + Number.EPSILON) * 1000) / 1000;
  const sum = a => a.reduce((s, v) => s + (+v || 0), 0);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const localDate = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => localDate();

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
      v: 1,
      settings: {
        name: 'ECOLaver', tagline: 'Choose nature, live better', address: '', phone: '', email: '',
        upi: '', logo: '', invoicePrefix: 'EL-', footer: 'Thank you for choosing nature!', lowDefault: 5
      },
      items: [], customers: [], vendors: [], purchases: [], batches: [], invoices: [], orders: [], adjustments: [],
      counters: { invoice: 1, purchase: 1, order: 1 }
    };
  }

  let state = fresh();
  let lastError = '';

  function load() {
    try {
      const raw = root.localStorage && root.localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const f = fresh();
        state = Object.assign(f, d);
        state.settings = Object.assign(f.settings, d.settings || {});
        state.counters = Object.assign(f.counters, d.counters || {});
      }
    } catch (e) { lastError = 'Could not read saved data: ' + e.message; state = fresh(); }
    return state;
  }

  function save() {
    try { root.localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (e) { lastError = 'Could not save: ' + e.message; return false; }
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

  function addPerson(kind, d) {
    const name = (d.name || '').trim();
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
    const name = (d.name || '').trim();
    if (!name) throw new Error('Please enter a name');
    p.name = name; p.phone = (d.phone || '').trim(); p.address = (d.address || '').trim();
    save();
    return p;
  }

  function removePerson(kind, id) {
    const p = find(kind, id);
    if (!p) return;
    if (p.ledger.length === 0) state[kind] = state[kind].filter(x => x.id !== id);
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

  /* ---------- items ---------- */
  function addItem(d) {
    const name = (d.name || '').trim();
    if (!name) throw new Error('Please enter a name');
    if (state.items.some(i => !i.archived && i.name.toLowerCase() === name.toLowerCase())) throw new Error('This name already exists');
    const kind = ['raw', 'pack', 'product'].includes(d.kind) ? d.kind : 'raw';
    const unit = UNITS.includes(d.unit) ? d.unit : 'pcs';
    const it = {
      id: uid(), name, kind, unit, stock: r3(+d.stock || 0), cost: +d.cost || 0, price: +d.price || 0,
      low: +d.low || 0, recipe: kind === 'product' ? { lines: [], other: 0, margin: 30 } : null, archived: false
    };
    state.items.push(it);
    save();
    return it;
  }

  function updateItem(id, d) {
    const it = item(id);
    if (!it) throw new Error('Not found');
    const name = (d.name || '').trim();
    if (!name) throw new Error('Please enter a name');
    if (state.items.some(i => i.id !== id && !i.archived && i.name.toLowerCase() === name.toLowerCase())) throw new Error('This name already exists');
    it.name = name; it.price = +d.price || 0; it.low = +d.low || 0;
    save();
    return it;
  }

  function archiveItem(id, flag) { const it = item(id); if (it) { it.archived = flag !== false; save(); } }

  function recipeCost(p) {
    const rc = p.recipe || { lines: [], other: 0 };
    const lines = [];
    rc.lines.forEach(l => {
      const it = item(l.itemId);
      if (!it) return;
      const base = conv(+l.qty || 0, l.unit || it.unit, it.unit);
      lines.push({ itemId: it.id, item: it, qty: +l.qty || 0, unit: l.unit || it.unit, qtyBase: base, cost: r2(base * it.cost) });
    });
    const other = +rc.other || 0;
    return { lines, other, total: r2(sum(lines.map(l => l.cost)) + other) };
  }

  function setRecipe(id, recipe) {
    const p = item(id);
    if (!p || p.kind !== 'product') throw new Error('Not a product');
    p.recipe = {
      lines: (recipe.lines || []).filter(l => l.itemId && +l.qty > 0).map(l => ({ itemId: l.itemId, qty: +l.qty, unit: l.unit })),
      other: +recipe.other || 0,
      margin: recipe.margin === '' || recipe.margin == null ? 30 : +recipe.margin
    };
    save();
    return p;
  }

  const suggestPrice = p => {
    const rc = recipeCost(p);
    const m = p.recipe ? +p.recipe.margin || 0 : 0;
    return Math.ceil(rc.total * (1 + m / 100));
  };

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

  /* ---------- buying stock ---------- */
  function purchase(d) {
    const lines = (d.lines || []).filter(l => l.itemId && +l.qty > 0);
    if (!lines.length) throw new Error('Add at least one item');
    const sub = sum(lines.map(l => l.total));
    const extra = +d.extra || 0;
    const total = r2(sub + extra);
    const paid = +d.paid || 0;
    const vendor = d.vendorId ? find('vendors', d.vendorId) : null;
    if (!vendor && paid < total - 0.005) throw new Error('Choose a vendor to keep the unpaid amount');
    const no = 'PUR-' + pad(state.counters.purchase++, 4);
    const out = lines.map(l => {
      const it = item(l.itemId);
      const unit = l.unit || it.unit;
      const qtyBase = r3(conv(+l.qty, unit, it.unit));
      const lt = +l.total || 0;
      const share = sub > 0 ? extra * (lt / sub) : extra / lines.length;
      const landed = lt + share;
      const old = Math.max(it.stock, 0);
      it.cost = (old + qtyBase) > 0 ? (old * it.cost + landed) / (old + qtyBase) : it.cost;
      it.stock = r3(it.stock + qtyBase);
      return { itemId: it.id, name: it.name, qty: +l.qty, unit, qtyBase, total: r2(lt), landed: r2(landed) };
    });
    const pu = { id: uid(), no, date: d.date || today(), ts: Date.now(), vendorId: vendor ? vendor.id : '', vendorName: vendor ? vendor.name : 'Cash purchase', lines: out, extra: r2(extra), total, paid: r2(paid), note: d.note || '', method: d.method || 'Cash' };
    state.purchases.push(pu);
    if (vendor) {
      ledger(vendor, 'purchase', 'Purchase ' + no, total, pu.id, '', pu.date);
      if (paid > 0) ledger(vendor, 'payment', 'Paid on ' + no, -paid, pu.id, pu.method, pu.date);
    }
    save();
    return pu;
  }

  /* ---------- making products (packing) ---------- */
  function produceShortage(productId, qty) {
    const p = item(productId);
    const rc = recipeCost(p);
    const short = [];
    rc.lines.forEach(l => {
      const need = r3(l.qtyBase * qty);
      if (l.item.stock + 1e-9 < need) short.push({ name: l.item.name, need, have: l.item.stock, unit: l.item.unit });
    });
    return short;
  }

  function produce(productId, qty, force) {
    const p = item(productId);
    if (!p || p.kind !== 'product') throw new Error('Choose a product');
    qty = +qty;
    if (!(qty > 0)) throw new Error('Enter how many to make');
    const rc = recipeCost(p);
    if (!rc.lines.length) throw new Error('Add ingredients to this product first');
    const short = produceShortage(productId, qty);
    if (short.length && !force) {
      const e = new Error('Not enough stock: ' + short.map(s => s.name).join(', '));
      e.short = short;
      throw e;
    }
    const used = rc.lines.map(l => {
      const qb = r3(l.qtyBase * qty);
      l.item.stock = r3(l.item.stock - qb);
      return { itemId: l.item.id, name: l.item.name, qtyBase: qb, unit: l.item.unit };
    });
    const unitCost = rc.total;
    const old = Math.max(p.stock, 0);
    p.cost = (old + qty) > 0 ? (old * p.cost + qty * unitCost) / (old + qty) : unitCost;
    p.stock = r3(p.stock + qty);
    const b = { id: uid(), date: today(), ts: Date.now(), productId: p.id, name: p.name, qty, unitCost: r2(unitCost), total: r2(unitCost * qty), used };
    state.batches.push(b);
    save();
    return b;
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
    if (d.orderId) order = find('orders', d.orderId);
    const advanceUsed = order ? order.advance : 0;
    const no = state.settings.invoicePrefix + pad(state.counters.invoice++, 4);
    const cogs = r2(sum(lines.map(l => l.cost)));
    const inv = {
      id: uid(), no, date: d.date || today(), ts: Date.now(), customerId: cust ? cust.id : '',
      customerName: cust ? cust.name : ((d.walkName || '').trim() || 'Walk-in customer'),
      customerPhone: cust ? cust.phone : '', lines, subtotal, discount: r2(discount), total, paid: r2(paid),
      method: d.method || 'Cash', advanceUsed, billBalance: r2(total - paid - advanceUsed), cogs, profit: r2(total - cogs),
      note: d.note || '', orderId: order ? order.id : '', void: false
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

  /* ---------- customer advance orders ---------- */
  function order(d) {
    const cust = find('customers', d.customerId);
    if (!cust) throw new Error('Choose a customer');
    const lines = (d.lines || []).filter(l => l.itemId && +l.qty > 0).map(l => {
      const it = item(l.itemId);
      const qty = +l.qty, unit = l.unit || it.unit, rate = +l.rate || 0;
      return { itemId: it.id, name: it.name, qty, unit, rate, amount: r2(qty * rate) };
    });
    if (!lines.length) throw new Error('Add at least one item');
    const advance = Math.max(+d.advance || 0, 0);
    const total = r2(sum(lines.map(l => l.amount)));
    const no = 'ORD-' + pad(state.counters.order++, 4);
    const o = {
      id: uid(), no, date: today(), ts: Date.now(), customerId: cust.id, customerName: cust.name, lines, total,
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

  /* ---------- history, totals, reports ---------- */
  function movements(id) {
    const out = [];
    state.purchases.forEach(p => p.lines.forEach(l => { if (l.itemId === id) out.push({ date: p.date, ts: p.ts, type: 'Bought', ref: p.no, qty: l.qtyBase }); }));
    state.batches.forEach(b => {
      if (b.productId === id) out.push({ date: b.date, ts: b.ts, type: 'Made', ref: '', qty: b.qty });
      b.used.forEach(u => { if (u.itemId === id) out.push({ date: b.date, ts: b.ts, type: 'Used for ' + b.name, ref: '', qty: -u.qtyBase }); });
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
      low: act.filter(i => i.kind !== 'pack' || true).filter(i => i.low > 0 && i.stock <= i.low),
      pendingOrders: state.orders.filter(o => o.status === 'pending').length
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

  function report(from, to) {
    const inv = state.invoices.filter(i => !i.void && i.date >= from && i.date <= to);
    const pur = state.purchases.filter(p => p.date >= from && p.date <= to);
    const byItem = {};
    inv.forEach(i => i.lines.forEach(l => {
      const o = byItem[l.itemId] || (byItem[l.itemId] = { name: l.name, amount: 0, profit: 0 });
      o.amount += l.amount; o.profit += l.amount - l.cost;
    }));
    let cashIn = 0, cashOut = 0;
    state.customers.forEach(c => c.ledger.forEach(e => {
      if (e.date < from || e.date > to) return;
      if (e.type === 'payment' || e.type === 'advance') cashIn += -e.amt;
      if (e.type === 'refund') cashIn -= e.amt;
    }));
    state.vendors.forEach(v => v.ledger.forEach(e => {
      if (e.date < from || e.date > to) return;
      if (e.type === 'payment' || e.type === 'advance') cashOut += -e.amt;
    }));
    // walk-in bills (no customer record) are always paid in full
    inv.filter(i => !i.customerId).forEach(i => { cashIn += i.paid; });
    // cash purchases (no vendor) are fully paid
    pur.filter(p => !p.vendorId).forEach(p => { cashOut += p.paid; });
    return {
      bills: inv.length, sales: r2(sum(inv.map(i => i.total))), discount: r2(sum(inv.map(i => i.discount))),
      cogs: r2(sum(inv.map(i => i.cogs))), profit: r2(sum(inv.map(i => i.profit))),
      purchases: r2(sum(pur.map(p => p.total))), cashIn: r2(cashIn), cashOut: r2(cashOut),
      top: Object.values(byItem).map(o => ({ name: o.name, amount: r2(o.amount), profit: r2(o.profit) })).sort((a, b) => b.amount - a.amount).slice(0, 8)
    };
  }

  /* ---------- backup ---------- */
  function exportJSON() { return JSON.stringify(state, null, 1); }
  function importJSON(text) {
    const d = JSON.parse(text);
    if (!d || !Array.isArray(d.items) || !d.settings) throw new Error('This is not an ECOLaver backup file');
    const f = fresh();
    state = Object.assign(f, d);
    state.settings = Object.assign(f.settings, d.settings);
    state.counters = Object.assign(f.counters, d.counters || {});
    save();
  }
  function resetAll() { state = fresh(); save(); }
  function saveSettings(s) { Object.assign(state.settings, s); save(); }

  const DB = {
    UNITS, load, save, uid, today, r2, r3, sum, conv, compat, money, qtyFmt, localDate,
    get state() { return state; }, get lastError() { return lastError; },
    item, find, addPerson, updatePerson, removePerson, payment, addItem, updateItem, archiveItem,
    recipeCost, setRecipe, suggestPrice, stockAdjust, purchase, produce, produceShortage,
    stockIssues, invoice, voidInvoice, order, cancelOrder, movements, totals, lastDays, report,
    exportJSON, importJSON, resetAll, saveSettings
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DB;
  else root.DB = DB;
})(typeof window !== 'undefined' ? window : globalThis);
