import { el, fmtMoney, fmtDate, fmtTime, uid, sortBy, linkify, esc } from '../util.js';
import { sheet, form, toast, confirmDialog, section, pill, empty } from '../ui.js';

export function render(root, { store }) {
  const t = store.trip;
  const fl = t.flights || (t.flights = { confirmed: [], legs: [], lounges: [] });
  const pts = t.points || {};

  // Points only matter on a trip that uses them; a cash trip should not stare at three zeroes.
  const needed = neededPoints(t);
  const usesPoints = !!(pts.balance || needed || (fl.legs || []).length);
  root.append(el('div', { class: 'page-head' }, el('div', {}, el('h2', { class: 'page-title' }, usesPoints ? 'Flights & points' : 'Flights'), el('p', { class: 'page-sub' }, usesPoints ? 'What is locked in, what still needs booking, and how the points stack up.' : 'What is locked in, and what still needs booking.'))));

  if (usesPoints) root.append(el('div', { class: 'card clickable', onClick: () => editPoints(store) },
    el('div', { class: 'grid grid-stats' },
      el('div', {}, el('div', { class: 'stat-label' }, 'Qantas Points'), el('div', { class: 'stat-value' }, (pts.balance || 0).toLocaleString('en-AU')), el('div', { class: 'stat-sub' }, pts.availableFrom ? `available from ${fmtDate(pts.availableFrom)}` : 'balance')),
      el('div', {}, el('div', { class: 'stat-label' }, 'Planned to use'), el('div', { class: 'stat-value' }, needed.toLocaleString('en-AU')), el('div', { class: 'stat-sub' }, 'from chosen options below')),
      el('div', {}, el('div', { class: 'stat-label' }, 'Left over'), el('div', { class: 'stat-value', style: { color: (pts.balance || 0) - needed < 0 ? 'var(--danger)' : 'inherit' } }, ((pts.balance || 0) - needed).toLocaleString('en-AU')), el('div', { class: 'stat-sub' }, (pts.balance || 0) - needed < 0 ? 'short: pick a cheaper option' : 'after this trip')),
    ),
    pts.notes ? el('div', { class: 'small muted', style: { marginTop: '10px' }, html: linkify(pts.notes) }) : null,
  ));

  // Confirmed
  const conf = section('Confirmed', ...(fl.confirmed.length ? fl.confirmed.map((f) => flightCard(store, f)) : [empty('No confirmed flights yet')]),
    el('div', { class: 'btn-row', style: { marginTop: '10px' } }, el('button', { class: 'btn btn-sm', type: 'button', onClick: () => editConfirmed(store, null) }, '+ Add confirmed flight')));
  root.append(conf);

  // Legs with options
  for (const leg of fl.legs || []) root.append(legSection(store, leg));
  root.append(el('div', { class: 'btn-row', style: { marginTop: '14px' } }, el('button', { class: 'btn btn-sm', type: 'button', onClick: () => editLeg(store, null) }, '+ Add a leg to compare')));

  // Lounges
  if ((fl.lounges || []).length) {
    root.append(section('Lounges', ...fl.lounges.map((l) => el('details', { class: 'acc' }, el('summary', {}, el('span', {}, `${l.airport} · ${l.lounge}`), l.access ? pill(l.access === 'yes' ? 'booked' : l.access === 'no' ? 'skip' : 'planned', { yes: 'Access', no: 'No access', maybe: 'Check' }[l.access]) : null), el('div', { class: 'acc-body prose', html: linkify(l.notes || '') })))));
  }
}

function flightCard(store, f) {
  const secret = store.vault.itemSecrets?.[f.id];
  return el('div', { class: 'card clickable', onClick: () => editConfirmed(store, f) },
    el('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' } },
      el('div', {}, el('div', { class: 'card-title' }, `${f.flight} · ${f.from} → ${f.to}`), el('div', { class: 'muted small' }, `${fmtDate(f.date)} · ${fmtTime(f.dep)} → ${fmtTime(f.arr)}${f.arrDate && f.arrDate !== f.date ? ` (${fmtDate(f.arrDate)})` : ''}${f.duration ? ` · ${f.duration}` : ''}`)),
      el('div', { style: { textAlign: 'right' } }, pill('booked', f.cabin || 'Booked'), f.aircraft ? el('div', { class: 'small muted' }, f.aircraft) : null),
    ),
    f.notes ? el('div', { class: 'small', style: { marginTop: '8px' }, html: linkify(f.notes) }) : null,
    secret ? el('div', { class: 'small', style: { marginTop: '6px' } }, el('span', { class: 'pill' }, '🔒 ' + secret)) : null,
  );
}

function editConfirmed(store, f) {
  const isNew = !f;
  const v0 = f || { id: uid() };
  const fm = form([
    { name: 'flight', label: 'Flight number', value: v0.flight || '', half: true },
    { name: 'cabin', label: 'Cabin', value: v0.cabin || '', half: true },
    { name: 'from', label: 'From', value: v0.from || '', half: true },
    { name: 'to', label: 'To', value: v0.to || '', half: true },
    { name: 'date', label: 'Departure date', type: 'date', value: v0.date || '', half: true },
    { name: 'arrDate', label: 'Arrival date', type: 'date', value: v0.arrDate || '', half: true },
    { name: 'dep', label: 'Departs', type: 'time', value: v0.dep || '', half: true },
    { name: 'arr', label: 'Arrives', type: 'time', value: v0.arr || '', half: true },
    { name: 'aircraft', label: 'Aircraft', value: v0.aircraft || '', half: true },
    { name: 'duration', label: 'Duration', value: v0.duration || '', half: true },
    { name: 'notes', label: 'Notes', type: 'textarea', value: v0.notes || '' },
    { name: 'secret', label: 'Private: booking reference / ticket number', value: store.vault.itemSecrets?.[v0.id] || '', hint: 'Kept on this device only.' },
  ]);
  const actions = [];
  if (!isNew) actions.push({ label: 'Delete', class: 'btn-danger', keepOpen: true, onClick: async () => { if (await confirmDialog('Remove this flight?')) { store.update((t) => { t.flights.confirmed = t.flights.confirmed.filter((x) => x.id !== v0.id); }); store.setItemSecret(v0.id, ''); return true; } return false; } });
  actions.push('spacer', { label: 'Cancel', class: 'btn-ghost' }, { label: 'Save', class: 'btn-primary', onClick: () => { const v = fm.values(); const { secret, ...rest } = v; store.update((t) => { t.flights.confirmed = t.flights.confirmed.filter((x) => x.id !== v0.id); t.flights.confirmed.push({ ...v0, ...rest }); }); store.setItemSecret(v0.id, secret); toast('Saved', { kind: 'ok' }); } });
  sheet({ title: isNew ? 'Add confirmed flight' : 'Edit flight', body: fm.node, actions });
}

function editPoints(store) {
  const p = store.trip.points || {};
  const fm = form([
    { name: 'balance', label: 'Points balance', type: 'number', value: p.balance ?? '', half: true },
    { name: 'availableFrom', label: 'Available from', type: 'date', value: p.availableFrom || '', half: true },
    { name: 'notes', label: 'Notes', type: 'textarea', value: p.notes || '' },
  ]);
  sheet({ title: 'Qantas Points', body: fm.node, actions: ['spacer', { label: 'Cancel', class: 'btn-ghost' }, { label: 'Save', class: 'btn-primary', onClick: () => { const v = fm.values(); store.update((t) => { t.points = { ...(t.points || {}), balance: v.balance || 0, availableFrom: v.availableFrom, notes: v.notes }; }); } }] });
}

export function neededPoints(t) {
  let n = 0;
  for (const leg of t.flights?.legs || []) { const o = (leg.options || []).find((x) => x.id === leg.chosenOptionId); if (o && o.points) n += Number(o.points) || 0; }
  return n;
}
export function chosenCash(t) {
  let cash = 0;
  for (const leg of t.flights?.legs || []) { const o = (leg.options || []).find((x) => x.id === leg.chosenOptionId); if (o) cash += (o.points ? Number(o.pointsTaxAud) || 0 : Number(o.cashAud) || 0); }
  return cash;
}

function legSection(store, leg) {
  const opts = leg.options || [];
  const wrap = section(leg.name,
    leg.notes ? el('div', { class: 'callout', style: { marginBottom: '10px' } }, el('span', { class: 'ico' }, '💡'), el('div', { html: linkify(leg.notes) })) : null,
    opts.length ? el('div', { class: 'row-list' }, ...sortBy(opts, (o) => o.rank ?? 99).map((o) => optionRow(store, leg, o))) : empty('No options yet', 'Add flights you are comparing for this leg.'),
    el('div', { class: 'btn-row', style: { marginTop: '10px' } },
      el('button', { class: 'btn btn-sm', type: 'button', onClick: () => editOption(store, leg, null) }, '+ Add option'),
      el('button', { class: 'btn btn-sm btn-ghost', type: 'button', onClick: () => editLeg(store, leg) }, 'Edit leg')),
  );
  return wrap;
}

function optionRow(store, leg, o) {
  const chosen = leg.chosenOptionId === o.id;
  const usePoints = !!o.points;
  const cents = o.points && o.cashAud ? (((Number(o.cashAud) || 0) - (Number(o.pointsTaxAud) || 0)) / o.points * 100) : null;
  return el('div', { class: 'row', style: chosen ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : {}, onClick: () => editOption(store, leg, o) },
    el('input', { type: 'radio', name: `leg-${leg.id}`, checked: chosen ? true : null, 'aria-label': `Choose ${o.label}`, style: { marginTop: '4px', accentColor: 'var(--accent)' }, onClick: (e) => { e.stopPropagation(); store.update((t) => { const L = t.flights.legs.find((x) => x.id === leg.id); L.chosenOptionId = o.id; }); } }),
    el('div', { class: 'row-main' },
      el('div', { class: 'row-title' }, o.label, o.status ? pill(o.status, { idea: 'Idea', planned: 'Shortlist', booked: 'Booked', skip: 'Skip' }[o.status]) : null),
      el('div', { class: 'row-sub' }, [o.route, o.dep && o.arr ? `${fmtTime(o.dep)} → ${fmtTime(o.arr)}` : '', o.date ? fmtDate(o.date) : '', o.duration].filter(Boolean).join(' · ')),
      o.notes ? el('div', { class: 'row-sub', html: linkify(o.notes) }) : null,
      cents !== null ? el('div', { class: 'small muted' }, `Points worth ~${cents.toFixed(1)}c each on this option`) : null,
    ),
    el('div', { class: 'row-side' },
      o.cashAud ? el('div', { class: 'big' }, fmtMoney(o.cashAud)) : null,
      usePoints ? el('div', { class: 'sm' }, `or ${Number(o.points).toLocaleString('en-AU')} pts + ${fmtMoney(o.pointsTaxAud || 0)}`) : null,
      o.priceNote ? el('div', { class: 'sm' }, o.priceNote) : null,
    ),
  );
}

function editOption(store, leg, o) {
  const isNew = !o;
  const v0 = o || { id: uid(), status: 'idea' };
  const fm = form([
    { name: 'label', label: 'Option name', value: v0.label || '', placeholder: 'e.g. Qantas QF62 Narita → Brisbane' },
    { name: 'route', label: 'Route', value: v0.route || '', placeholder: 'NRT → BNE', half: true },
    { name: 'date', label: 'Date', type: 'date', value: v0.date || '', half: true },
    { name: 'dep', label: 'Departs', type: 'time', value: v0.dep || '', half: true },
    { name: 'arr', label: 'Arrives', type: 'time', value: v0.arr || '', half: true },
    { name: 'duration', label: 'Duration', value: v0.duration || '', half: true },
    { name: 'status', label: 'Status', type: 'select', options: [['idea', 'Idea'], ['planned', 'Shortlist'], ['booked', 'Booked'], ['skip', 'Skip']], value: v0.status || 'idea', half: true },
    { name: 'cashAud', label: 'Cash price (AUD)', type: 'number', value: v0.cashAud ?? '', half: true },
    { name: 'priceNote', label: 'Price note', value: v0.priceNote || '', placeholder: 'estimate, checked 13 Sep', half: true },
    { name: 'points', label: 'Points needed (if using points)', type: 'number', value: v0.points ?? '', half: true },
    { name: 'pointsTaxAud', label: 'Taxes with points (AUD)', type: 'number', value: v0.pointsTaxAud ?? '', half: true },
    { name: 'url', label: 'Link', value: v0.url || '' },
    { name: 'notes', label: 'Notes', type: 'textarea', value: v0.notes || '' },
  ]);
  const actions = [];
  if (!isNew) actions.push({ label: 'Delete', class: 'btn-danger', keepOpen: true, onClick: async () => { if (await confirmDialog('Delete this option?')) { store.update((t) => { const L = t.flights.legs.find((x) => x.id === leg.id); L.options = L.options.filter((x) => x.id !== v0.id); if (L.chosenOptionId === v0.id) L.chosenOptionId = ''; }); return true; } return false; } });
  actions.push('spacer', { label: 'Cancel', class: 'btn-ghost' }, { label: 'Save', class: 'btn-primary', onClick: () => { const v = fm.values(); if (!v.label) { toast('Give the option a name', { kind: 'error' }); return false; } store.update((t) => { const L = t.flights.legs.find((x) => x.id === leg.id); L.options = (L.options || []).filter((x) => x.id !== v0.id); L.options.push({ ...v0, ...v }); }); toast('Saved', { kind: 'ok' }); } });
  sheet({ title: isNew ? `Add option · ${leg.name}` : 'Edit option', body: fm.node, actions });
}

function editLeg(store, leg) {
  const isNew = !leg;
  const v0 = leg || { id: uid(), options: [] };
  const fm = form([
    { name: 'name', label: 'Leg name', value: v0.name || '', placeholder: 'e.g. Home to Sydney' },
    { name: 'notes', label: 'Notes / what matters for this leg', type: 'textarea', value: v0.notes || '' },
  ]);
  const actions = [];
  if (!isNew) actions.push({ label: 'Delete leg', class: 'btn-danger', keepOpen: true, onClick: async () => { if (await confirmDialog('Delete this leg and all its options?')) { store.update((t) => { t.flights.legs = t.flights.legs.filter((x) => x.id !== v0.id); }); return true; } return false; } });
  actions.push('spacer', { label: 'Cancel', class: 'btn-ghost' }, { label: 'Save', class: 'btn-primary', onClick: () => { const v = fm.values(); if (!v.name) return false; store.update((t) => { t.flights.legs ||= []; const i = t.flights.legs.findIndex((x) => x.id === v0.id); const next = { ...v0, ...v }; if (i >= 0) t.flights.legs[i] = next; else t.flights.legs.push(next); }); } });
  sheet({ title: isNew ? 'Add leg' : 'Edit leg', body: fm.node, actions });
}
