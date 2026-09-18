import { el, fmtMoney, fmtDate, uid, sortBy, toAud, tripRates, tripCurrencies, tripCategories, activeVariant, variantList, variantOptions, inVariant } from '../util.js';
import { sheet, form, toast, confirmDialog, section, pill, empty } from '../ui.js';
import { chosenCash, neededPoints } from './flights.js';

const typeCategory = { flight: 'Flights', train: 'Transport', bus: 'Transport', transfer: 'Transport', boat: 'Transport', scooter: 'Transport', stay: 'Accommodation', ski: 'Ski', food: 'Food', drinks: 'Food', beach: 'Activities', activity: 'Activities', note: 'Other' };
const SYMBOL = { JPY: '¥', IDR: 'Rp' };
// On a group trip a line can be shared. `split` is how many people it is shared
// between, so `mine` is the part that lands on your card.
const splitOf = (x) => Math.max(1, Math.round(Number(x?.split) || 1));

// Everything in the plan that costs money, normalised to AUD.
export function budgetLines(t) {
  const rates = tripRates(t);
  const av = activeVariant(t);
  const lines = [];
  const add = (l, src) => { const split = splitOf(src); lines.push({ ...l, split, mine: l.aud / split }); };
  for (const leg of t.flights?.legs || []) {
    const o = (leg.options || []).find((x) => x.id === leg.chosenOptionId);
    if (!o) continue;
    const cash = o.points ? Number(o.pointsTaxAud) || 0 : Number(o.cashAud) || 0;
    add({ id: `leg-${leg.id}`, category: 'Flights', label: `${leg.name}: ${o.label}${o.points ? ' (points + taxes)' : ''}`, aud: cash, status: o.status === 'booked' ? 'booked' : 'estimate', source: 'flights' }, o);
  }
  for (const f of t.flights?.confirmed || []) if (f.cashAud) add({ id: `conf-${f.id}`, category: 'Flights', label: `${f.flight} ${f.from} → ${f.to}`, aud: Number(f.cashAud) || 0, status: 'booked', source: 'flights' }, f);
  for (const s of t.stays || []) {
    if (!['planned', 'booked'].includes(s.status) || !inVariant(s, av)) continue;
    add({ id: `stay-${s.id}`, category: 'Accommodation', label: `${s.name} (${s.nights || 0} nt)`, aud: (Number(s.pricePerNightAud) || 0) * (Number(s.nights) || 0), status: s.status === 'booked' ? 'booked' : 'estimate', source: 'stays' }, s);
  }
  for (const d of t.days || []) for (const i of d.items || []) {
    if (!i.cost || i.status === 'skip' || !inVariant(i, av)) continue;
    add({ id: `item-${i.id}`, category: i.category || typeCategory[i.type] || 'Other', label: `${i.title} · ${fmtDate(d.date)}`, aud: toAud(i.cost, i.currency || 'AUD', rates), status: i.status === 'booked' ? 'booked' : 'estimate', source: 'itinerary', date: d.date }, i);
  }
  for (const b of t.budget || []) if (inVariant(b, av)) add({ id: `manual-${b.id}`, category: b.category || 'Other', label: b.label, aud: toAud(b.amount, b.currency || 'AUD', rates), status: b.status || 'estimate', source: 'manual', manual: b }, b);
  return lines;
}

export function budgetSummary(t) {
  const lines = budgetLines(t);
  const total = lines.reduce((s, l) => s + l.aud, 0);
  const booked = lines.filter((l) => l.status === 'booked').reduce((s, l) => s + l.aud, 0);
  const mine = lines.reduce((s, l) => s + l.mine, 0);
  const mineBooked = lines.filter((l) => l.status === 'booked').reduce((s, l) => s + l.mine, 0);
  // Only a trip with shared lines needs the "your share" half of the page.
  const shared = lines.some((l) => l.split > 1);
  return { total, booked, mine, mineBooked, shared, lines };
}

export function render(root, { store, navigate }) {
  const t = store.trip;
  const { total, booked, mine, mineBooked, shared, lines } = budgetSummary(t);
  const nights = Math.max(1, (t.days || []).length - 1);
  const groupSize = (t.people || []).length;
  root.append(el('div', { class: 'page-head' }, el('div', {}, el('h2', { class: 'page-title' }, 'Budget'), el('p', { class: 'page-sub' }, (variantList(t).find((x) => x.id === activeVariant(t))?.name ? `${variantList(t).find((x) => x.id === activeVariant(t)).name}. ` : '') + 'Pulled automatically from chosen flights, planned stays and itinerary costs, plus anything you add here.')), el('div', { class: 'page-actions' }, el('button', { class: 'btn btn-primary btn-sm', type: 'button', onClick: () => editLine(store, null) }, '+ Add line'))));

  root.append(el('div', { class: 'grid grid-stats' },
    shared
      ? stat('Your share', fmtMoney(mine, 'AUD', { compact: true }), `of ${fmtMoney(total, 'AUD', { compact: true })} across the group`)
      : stat('Total plan', fmtMoney(total, 'AUD', { compact: true }), 'AUD, excluding points'),
    stat('Locked in', fmtMoney(shared ? mineBooked : booked, 'AUD', { compact: true }), shared ? 'your share of booked lines' : 'booked lines'),
    stat('Per day', fmtMoney((shared ? mine : total) / nights, 'AUD', { compact: true }), `across ${nights} nights`),
    neededPoints(t)
      ? stat('Points', `${Math.round(neededPoints(t) / 1000)}k`, `${Math.round(((t.points?.balance || 0) - neededPoints(t)) / 1000)}k left after`)
      : stat('Group', groupSize ? String(groupSize) : '1', groupSize > 1 ? 'people on the trip' : 'travelling solo'),
  ));
  if (shared) root.append(el('div', { class: 'callout', style: { marginTop: '12px' } }, el('span', { class: 'ico' }, '🧮'),
    el('div', {}, el('strong', {}, 'Split costs. '), 'Lines marked as shared are divided by the number of people on them, so "Your share" is what actually lands on your card. Open any line to change how many ways it splits.')));

  // Rate control, one row per foreign currency the trip uses
  const rates = tripRates(t);
  const rateKeys = Object.keys(rates);
  if (rateKeys.length) root.append(el('div', { class: 'card soft', style: { marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' } },
    el('div', { style: { flex: 1, minWidth: '180px' } }, el('strong', {}, rateKeys.length > 1 ? 'Exchange rates' : 'Exchange rate'), el('div', { class: 'small muted' }, 'How much foreign money one Australian dollar buys. Used to convert every foreign amount on this page.')),
    ...rateKeys.map((k) => el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
      el('span', { class: 'muted' }, SYMBOL[k] || k),
      el('input', { type: 'number', step: k === 'IDR' ? '10' : '0.1', min: '1', value: rates[k], style: { width: '100px', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-elev)', fontSize: '16px' }, 'aria-label': `${k} per AUD`, onChange: (e) => { const v = Number(e.target.value); if (v > 0) store.update((x) => { x.meta.rates = { ...(x.meta.rates || {}), [k]: v }; if (k === 'JPY') x.meta.jpyPerAud = v; }); } }),
      el('span', { class: 'muted' }, '= A$1'),
    )),
  ));

  // By category
  const byCat = {};
  for (const l of lines) { byCat[l.category] ||= { total: 0, booked: 0, mine: 0 }; byCat[l.category].total += l.aud; byCat[l.category].mine += l.mine; if (l.status === 'booked') byCat[l.category].booked += l.aud; }
  const cats = sortBy(Object.entries(byCat), ([, v]) => -v.total);
  root.append(section('By category', cats.length ? el('div', { class: 'table-wrap' }, el('table', {},
    el('thead', {}, el('tr', {}, el('th', {}, 'Category'), el('th', { class: 'num' }, shared ? 'Group' : 'Planned'), shared ? el('th', { class: 'num' }, 'Yours') : null, el('th', { class: 'num' }, 'Booked'), el('th', { class: 'num' }, 'Share'))),
    el('tbody', {}, ...cats.map(([c, v]) => el('tr', {}, el('td', {}, c), el('td', { class: 'num' }, fmtMoney(v.total)), shared ? el('td', { class: 'num' }, fmtMoney(v.mine)) : null, el('td', { class: 'num' }, fmtMoney(v.booked)), el('td', { class: 'num' }, total ? `${Math.round(v.total / total * 100)}%` : ''))), el('tr', { class: 'total' }, el('td', {}, 'Total'), el('td', { class: 'num' }, fmtMoney(total)), shared ? el('td', { class: 'num' }, fmtMoney(mine)) : null, el('td', { class: 'num' }, fmtMoney(booked)), el('td', { class: 'num' }, '100%'))),
  )) : empty('Nothing costed yet')));

  // By day
  const byDay = {};
  for (const l of lines) if (l.date) byDay[l.date] = (byDay[l.date] || 0) + l.aud;
  const days = sortBy(t.days || [], (d) => d.date);
  const max = Math.max(1, ...Object.values(byDay));
  if (days.length) root.append(section('Day by day (itinerary costs only)', el('div', { class: 'card' }, el('div', { class: 'bars', role: 'img', 'aria-label': 'Daily spend bars' }, ...days.map((d) => { const v = byDay[d.date] || 0; return el('div', { class: 'bar', title: `${fmtDate(d.date)}: ${fmtMoney(v)}` }, el('div', { class: 'bar-fill', style: { height: `${Math.max(2, v / max * 100)}%` } }), el('div', { class: 'bar-label' }, String(new Date(d.date).getDate()))); })), el('div', { class: 'small muted', style: { marginTop: '8px' } }, 'Flights and stays are shown by category above rather than by day.'))));

  // All lines
  root.append(section('Every line', el('div', { class: 'row-list' }, ...sortBy(lines, (l) => -l.aud).map((l) => el('div', { class: 'row', style: l.manual ? {} : { cursor: 'pointer' }, onClick: () => { if (l.manual) editLine(store, l.manual); else navigate(l.source === 'itinerary' ? `itinerary/${l.date}` : l.source); } },
    el('div', { class: 'row-main' }, el('div', { class: 'row-title' }, l.label, pill(l.status === 'booked' ? 'booked' : 'planned', l.status === 'booked' ? 'Booked' : 'Estimate'), l.split > 1 ? el('span', { class: 'variant-tag' }, `÷${l.split}`) : null), el('div', { class: 'row-sub' }, `${l.category} · from ${{ flights: 'Flights', stays: 'Stays', itinerary: 'Plan', manual: 'this page' }[l.source]}`)),
    el('div', { class: 'row-side' }, el('div', { class: 'big' }, fmtMoney(l.split > 1 ? l.mine : l.aud)), l.split > 1 ? el('div', { class: 'sm' }, `${fmtMoney(l.aud)} ÷ ${l.split}`) : null),
  )))));
}

const stat = (label, value, sub) => el('div', { class: 'card stat' }, el('div', { class: 'stat-label' }, label), el('div', { class: 'stat-value' }, String(value)), sub ? el('div', { class: 'stat-sub' }, sub) : null);

function editLine(store, b) {
  const isNew = !b;
  const v0 = b || { id: uid(), status: 'estimate', currency: 'AUD' };
  const fm = form([
    { name: 'label', label: 'What', value: v0.label || '', placeholder: 'e.g. Travel insurance (snow cover)' },
    { name: 'category', label: 'Category', type: 'select', options: tripCategories(store.trip), value: v0.category || 'Other', half: true },
    { name: 'status', label: 'Status', type: 'select', options: [['estimate', 'Estimate'], ['booked', 'Booked / paid']], value: v0.status || 'estimate', half: true },
    ...(variantList(store.trip).length > 1 ? [{ name: 'variant', label: 'Applies to', type: 'select', options: variantOptions(store.trip), value: v0.variant || (isNew ? (activeVariant(store.trip) || '') : ''), half: true }] : []),
    { name: 'amount', label: 'Amount', type: 'number', value: v0.amount ?? '', half: true },
    { name: 'currency', label: 'Currency', type: 'select', options: tripCurrencies(store.trip), value: v0.currency || 'AUD', half: true },
    { name: 'split', label: 'Split how many ways', type: 'number', value: v0.split ?? 1, half: true, hint: '1 means you are paying it all. On a group cost, put the number of people sharing it.' },
    { name: 'notes', label: 'Notes', type: 'textarea', value: v0.notes || '' },
  ]);
  const actions = [];
  if (!isNew) actions.push({ label: 'Delete', class: 'btn-danger', keepOpen: true, onClick: async () => { if (await confirmDialog('Delete this budget line?')) { store.update((t) => { t.budget = t.budget.filter((x) => x.id !== v0.id); }); return true; } return false; } });
  actions.push('spacer', { label: 'Cancel', class: 'btn-ghost' }, { label: 'Save', class: 'btn-primary', onClick: () => { const v = fm.values(); if (!v.label) { toast('Describe the line', { kind: 'error' }); return false; } store.update((t) => { t.budget ||= []; const i = t.budget.findIndex((x) => x.id === v0.id); const next = { ...v0, ...v }; if ('variant' in v && !v.variant) delete next.variant; if (!(Number(next.split) > 1)) delete next.split; else next.split = Math.round(Number(next.split)); if (i >= 0) t.budget[i] = next; else t.budget.push(next); }); toast('Saved', { kind: 'ok' }); } });
  sheet({ title: isNew ? 'Add budget line' : 'Edit budget line', body: fm.node, actions });
}
