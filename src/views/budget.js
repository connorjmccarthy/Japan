import { el, fmtMoney, fmtDate, uid, sortBy, CATEGORIES, toAud, activeVariant, variantList, variantOptions, inVariant } from '../util.js';
import { sheet, form, toast, confirmDialog, section, pill, empty } from '../ui.js';
import { chosenCash, neededPoints } from './flights.js';

const typeCategory = { flight: 'Flights', train: 'Transport', bus: 'Transport', transfer: 'Transport', stay: 'Accommodation', ski: 'Ski', food: 'Food', activity: 'Activities', note: 'Other' };

// Everything in the plan that costs money, normalised to AUD.
export function budgetLines(t) {
  const rate = t.meta?.jpyPerAud || 100;
  const av = activeVariant(t);
  const lines = [];
  for (const leg of t.flights?.legs || []) {
    const o = (leg.options || []).find((x) => x.id === leg.chosenOptionId);
    if (!o) continue;
    const cash = o.points ? Number(o.pointsTaxAud) || 0 : Number(o.cashAud) || 0;
    lines.push({ id: `leg-${leg.id}`, category: 'Flights', label: `${leg.name}: ${o.label}${o.points ? ' (points + taxes)' : ''}`, aud: cash, status: o.status === 'booked' ? 'booked' : 'estimate', source: 'flights' });
  }
  for (const f of t.flights?.confirmed || []) if (f.cashAud) lines.push({ id: `conf-${f.id}`, category: 'Flights', label: `${f.flight} ${f.from} → ${f.to}`, aud: Number(f.cashAud) || 0, status: 'booked', source: 'flights' });
  for (const s of t.stays || []) {
    if (!['planned', 'booked'].includes(s.status) || !inVariant(s, av)) continue;
    lines.push({ id: `stay-${s.id}`, category: 'Accommodation', label: `${s.name} (${s.nights || 0} nt)`, aud: (Number(s.pricePerNightAud) || 0) * (Number(s.nights) || 0), status: s.status === 'booked' ? 'booked' : 'estimate', source: 'stays' });
  }
  for (const d of t.days || []) for (const i of d.items || []) {
    if (!i.cost || i.status === 'skip' || !inVariant(i, av)) continue;
    lines.push({ id: `item-${i.id}`, category: i.category || typeCategory[i.type] || 'Other', label: `${i.title} · ${fmtDate(d.date)}`, aud: toAud(i.cost, i.currency || 'AUD', rate), status: i.status === 'booked' ? 'booked' : 'estimate', source: 'itinerary', date: d.date });
  }
  for (const b of t.budget || []) if (inVariant(b, av)) lines.push({ id: `manual-${b.id}`, category: b.category || 'Other', label: b.label, aud: toAud(b.amount, b.currency || 'AUD', rate), status: b.status || 'estimate', source: 'manual', manual: b });
  return lines;
}

export function budgetSummary(t) {
  const lines = budgetLines(t);
  const total = lines.reduce((s, l) => s + l.aud, 0);
  const booked = lines.filter((l) => l.status === 'booked').reduce((s, l) => s + l.aud, 0);
  return { total, booked, lines };
}

export function render(root, { store, navigate }) {
  const t = store.trip;
  const { total, booked, lines } = budgetSummary(t);
  const nights = Math.max(1, (t.days || []).length - 1);
  root.append(el('div', { class: 'page-head' }, el('div', {}, el('h2', { class: 'page-title' }, 'Budget'), el('p', { class: 'page-sub' }, (variantList(t).find((x) => x.id === activeVariant(t))?.name ? `${variantList(t).find((x) => x.id === activeVariant(t)).name}. ` : '') + 'Pulled automatically from chosen flights, planned stays and itinerary costs, plus anything you add here.')), el('div', { class: 'page-actions' }, el('button', { class: 'btn btn-primary btn-sm', type: 'button', onClick: () => editLine(store, null) }, '+ Add line'))));

  root.append(el('div', { class: 'grid grid-stats' },
    stat('Total plan', fmtMoney(total, 'AUD', { compact: true }), 'AUD, excluding points'),
    stat('Locked in', fmtMoney(booked, 'AUD', { compact: true }), 'booked lines'),
    stat('Per day', fmtMoney(total / nights, 'AUD', { compact: true }), `across ${nights} nights`),
    stat('Points', `${Math.round(neededPoints(t) / 1000)}k`, `${Math.round(((t.points?.balance || 0) - neededPoints(t)) / 1000)}k left after`),
  ));

  // Rate control
  root.append(el('div', { class: 'card soft', style: { marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' } },
    el('div', { style: { flex: 1 } }, el('strong', {}, 'Exchange rate'), el('div', { class: 'small muted' }, 'Yen per Australian dollar. Used to convert every ¥ amount.')),
    el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, el('span', { class: 'muted' }, '¥'), el('input', { type: 'number', step: '0.1', min: '1', value: t.meta.jpyPerAud || 100, style: { width: '90px', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-elev)', fontSize: '16px' }, 'aria-label': 'Yen per AUD', onChange: (e) => { const v = Number(e.target.value); if (v > 0) store.update((x) => { x.meta.jpyPerAud = v; }); } }), el('span', { class: 'muted' }, '= A$1')),
  ));

  // By category
  const byCat = {};
  for (const l of lines) { byCat[l.category] ||= { total: 0, booked: 0 }; byCat[l.category].total += l.aud; if (l.status === 'booked') byCat[l.category].booked += l.aud; }
  const cats = sortBy(Object.entries(byCat), ([, v]) => -v.total);
  root.append(section('By category', cats.length ? el('div', { class: 'table-wrap' }, el('table', {},
    el('thead', {}, el('tr', {}, el('th', {}, 'Category'), el('th', { class: 'num' }, 'Planned'), el('th', { class: 'num' }, 'Booked'), el('th', { class: 'num' }, 'Share'))),
    el('tbody', {}, ...cats.map(([c, v]) => el('tr', {}, el('td', {}, c), el('td', { class: 'num' }, fmtMoney(v.total)), el('td', { class: 'num' }, fmtMoney(v.booked)), el('td', { class: 'num' }, total ? `${Math.round(v.total / total * 100)}%` : ''))), el('tr', { class: 'total' }, el('td', {}, 'Total'), el('td', { class: 'num' }, fmtMoney(total)), el('td', { class: 'num' }, fmtMoney(booked)), el('td', { class: 'num' }, '100%'))),
  )) : empty('Nothing costed yet')));

  // By day
  const byDay = {};
  for (const l of lines) if (l.date) byDay[l.date] = (byDay[l.date] || 0) + l.aud;
  const days = sortBy(t.days || [], (d) => d.date);
  const max = Math.max(1, ...Object.values(byDay));
  if (days.length) root.append(section('Day by day (itinerary costs only)', el('div', { class: 'card' }, el('div', { class: 'bars', role: 'img', 'aria-label': 'Daily spend bars' }, ...days.map((d) => { const v = byDay[d.date] || 0; return el('div', { class: 'bar', title: `${fmtDate(d.date)}: ${fmtMoney(v)}` }, el('div', { class: 'bar-fill', style: { height: `${Math.max(2, v / max * 100)}%` } }), el('div', { class: 'bar-label' }, String(new Date(d.date).getDate()))); })), el('div', { class: 'small muted', style: { marginTop: '8px' } }, 'Flights and stays are shown by category above rather than by day.'))));

  // All lines
  root.append(section('Every line', el('div', { class: 'row-list' }, ...sortBy(lines, (l) => -l.aud).map((l) => el('div', { class: 'row', style: l.manual ? {} : { cursor: 'pointer' }, onClick: () => { if (l.manual) editLine(store, l.manual); else navigate(l.source === 'itinerary' ? `itinerary/${l.date}` : l.source); } },
    el('div', { class: 'row-main' }, el('div', { class: 'row-title' }, l.label, pill(l.status === 'booked' ? 'booked' : 'planned', l.status === 'booked' ? 'Booked' : 'Estimate')), el('div', { class: 'row-sub' }, `${l.category} · from ${{ flights: 'Flights', stays: 'Stays', itinerary: 'Plan', manual: 'this page' }[l.source]}`)),
    el('div', { class: 'row-side' }, el('div', { class: 'big' }, fmtMoney(l.aud))),
  )))));
}

const stat = (label, value, sub) => el('div', { class: 'card stat' }, el('div', { class: 'stat-label' }, label), el('div', { class: 'stat-value' }, String(value)), sub ? el('div', { class: 'stat-sub' }, sub) : null);

function editLine(store, b) {
  const isNew = !b;
  const v0 = b || { id: uid(), status: 'estimate', currency: 'AUD' };
  const fm = form([
    { name: 'label', label: 'What', value: v0.label || '', placeholder: 'e.g. Travel insurance (snow cover)' },
    { name: 'category', label: 'Category', type: 'select', options: CATEGORIES, value: v0.category || 'Other', half: true },
    { name: 'status', label: 'Status', type: 'select', options: [['estimate', 'Estimate'], ['booked', 'Booked / paid']], value: v0.status || 'estimate', half: true },
    ...(variantList(store.trip).length > 1 ? [{ name: 'variant', label: 'Applies to', type: 'select', options: variantOptions(store.trip), value: v0.variant || (isNew ? (activeVariant(store.trip) || '') : ''), half: true }] : []),
    { name: 'amount', label: 'Amount', type: 'number', value: v0.amount ?? '', half: true },
    { name: 'currency', label: 'Currency', type: 'select', options: ['AUD', 'JPY'], value: v0.currency || 'AUD', half: true },
    { name: 'notes', label: 'Notes', type: 'textarea', value: v0.notes || '' },
  ]);
  const actions = [];
  if (!isNew) actions.push({ label: 'Delete', class: 'btn-danger', keepOpen: true, onClick: async () => { if (await confirmDialog('Delete this budget line?')) { store.update((t) => { t.budget = t.budget.filter((x) => x.id !== v0.id); }); return true; } return false; } });
  actions.push('spacer', { label: 'Cancel', class: 'btn-ghost' }, { label: 'Save', class: 'btn-primary', onClick: () => { const v = fm.values(); if (!v.label) { toast('Describe the line', { kind: 'error' }); return false; } store.update((t) => { t.budget ||= []; const i = t.budget.findIndex((x) => x.id === v0.id); const next = { ...v0, ...v }; if ('variant' in v && !v.variant) delete next.variant; if (i >= 0) t.budget[i] = next; else t.budget.push(next); }); toast('Saved', { kind: 'ok' }); } });
  sheet({ title: isNew ? 'Add budget line' : 'Edit budget line', body: fm.node, actions });
}
