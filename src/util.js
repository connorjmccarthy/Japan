// Small shared helpers. No framework, no build step.

export const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

export const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
};

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---- Dates -----------------------------------------------------------------
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const parseDate = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayIso = () => isoDate(new Date());
export const addDays = (iso, n) => { const d = parseDate(iso); d.setDate(d.getDate() + n); return isoDate(d); };
export const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);
export const fmtDate = (iso, opts = {}) => {
  const d = parseDate(iso); if (!d) return '';
  const base = `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  return opts.year ? `${base} ${d.getFullYear()}` : base;
};
export const fmtDow = (iso) => DOW[parseDate(iso).getDay()];
export const fmtDayNum = (iso) => parseDate(iso).getDate();
export const fmtMonth = (iso) => MON[parseDate(iso).getMonth()];
export const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return t;
  const suffix = h >= 12 ? 'pm' : 'am';
  const hh = ((h + 11) % 12) + 1;
  return m ? `${hh}:${String(m).padStart(2, '0')}${suffix}` : `${hh}${suffix}`;
};
export const dateRange = (start, end) => {
  const out = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
};

// ---- Money -----------------------------------------------------------------
export const fmtMoney = (amount, currency = 'AUD', { compact = false } = {}) => {
  if (amount === null || amount === undefined || amount === '' || Number.isNaN(Number(amount))) return '';
  const n = Number(amount);
  if (currency === 'JPY') return `¥${Math.round(n).toLocaleString('en-AU')}`;
  if (currency === 'PTS') return `${Math.round(n).toLocaleString('en-AU')} pts`;
  const opts = compact ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 0, maximumFractionDigits: 0 };
  return `A$${n.toLocaleString('en-AU', opts)}`;
};
export const toAud = (amount, currency, jpyPerAud) => {
  const n = Number(amount) || 0;
  if (currency === 'JPY') return jpyPerAud ? n / jpyPerAud : 0;
  if (currency === 'PTS') return 0;
  return n;
};

// ---- Misc ------------------------------------------------------------------
export const clone = (o) => JSON.parse(JSON.stringify(o));
export const sortBy = (arr, fn) => [...arr].sort((a, b) => { const x = fn(a), y = fn(b); return x < y ? -1 : x > y ? 1 : 0; });
export const groupBy = (arr, fn) => arr.reduce((acc, x) => { const k = fn(x); (acc[k] ||= []).push(x); return acc; }, {});
export const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
export const linkify = (text) => esc(text).replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

export const TYPES = {
  flight: { label: 'Flight', ico: '✈️' },
  train: { label: 'Train', ico: '🚄' },
  bus: { label: 'Bus', ico: '🚌' },
  transfer: { label: 'Transfer', ico: '🧭' },
  stay: { label: 'Stay', ico: '🏨' },
  ski: { label: 'Ski', ico: '⛷️' },
  food: { label: 'Food', ico: '🍜' },
  activity: { label: 'Activity', ico: '🎡' },
  note: { label: 'Note', ico: '📝' },
};
export const STATUSES = {
  idea: 'Idea',
  planned: 'Planned',
  booked: 'Booked',
  skip: 'Skipped',
};
export const CATEGORIES = ['Flights', 'Transport', 'Accommodation', 'Ski', 'Food', 'Activities', 'Parking', 'Insurance', 'Connectivity', 'Other'];

// ---- Plan variants ----------------------------------------------------------
// A trip can hold alternative plans (e.g. "ski" vs "no skiing"). Items, stays,
// food, budget lines, checklist entries and places may carry `variant: '<id>'`;
// anything without one belongs to every plan.
export const activeVariant = (t) => t?.variants?.active || null;
export const variantList = (t) => t?.variants?.list || [];
export const inVariant = (x, v) => !v || !x?.variant || x.variant === v;
export const forVariant = (arr, v) => (arr || []).filter((x) => inVariant(x, v));
export const dayView = (d, v) => {
  const o = (v && d.variants && d.variants[v]) || {};
  return { ...d, title: o.title ?? d.title, base: o.base ?? d.base, notes: o.notes ?? d.notes, walk: o.walk ?? d.walk, items: forVariant(d.items, v) };
};
export const variantOptions = (t) => [['', 'Both plans'], ...variantList(t).map((x) => [x.id, x.name])];
