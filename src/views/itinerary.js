import { el, fmtDate, fmtDow, fmtDayNum, fmtTime, fmtMoney, todayIso, TYPES, STATUSES, uid, sortBy, linkify, dateRange, activeVariant, variantList, variantOptions, dayView, tripRates, tripCurrencies, toAud } from '../util.js';
import { sheet, form, toast, confirmDialog, pill, empty } from '../ui.js';
import { dayMap } from '../daymap.js';

const typeCategory = { flight: 'Flights', train: 'Transport', bus: 'Transport', transfer: 'Transport', stay: 'Accommodation', ski: 'Ski', food: 'Food', activity: 'Activities', note: 'Other' };

export function render(root, { store, params, navigate }) {
  const trip = store.trip;
  ensureDays(store);
  const v = activeVariant(store.trip);
  const rawDays = sortBy(store.trip.days, (d) => d.date);
  const days = rawDays.map((d) => dayView(d, v));
  const today = todayIso();
  const wanted = params[0] || (days.find((d) => d.date === today)?.date) || days[0]?.date;
  const day = days.find((d) => d.date === wanted) || days[0];
  const vName = variantList(store.trip).find((x) => x.id === v)?.name;

  const head = el('div', { class: 'page-head' },
    el('div', {}, el('h2', { class: 'page-title' }, 'Day by day'), el('p', { class: 'page-sub' }, vName ? `${vName} · ${days.length} days · tap a card to edit` : `${days.length} days · tap a card to edit`)),
    el('div', { class: 'page-actions' },
      el('button', { class: 'btn btn-sm', type: 'button', onClick: () => editDay(store, day, navigate) }, 'Edit day'),
      el('button', { class: 'btn btn-primary btn-sm', type: 'button', onClick: () => editItem(store, day, null) }, '+ Add'),
    ),
  );

  const strip = el('div', { class: 'day-strip', role: 'tablist' });
  for (const d of days) {
    strip.append(el('button', { class: `day-chip ${d.id === day?.id ? 'active' : ''} ${d.date === today ? 'today' : ''}`, type: 'button', role: 'tab', 'aria-selected': d.id === day?.id ? 'true' : 'false', onClick: () => navigate(`itinerary/${d.date}`) },
      el('span', { class: 'dc-dow' }, fmtDow(d.date)), el('span', { class: 'dc-num' }, fmtDayNum(d.date)), el('span', { class: 'dc-base' }, d.base || '')));
  }

  root.append(head, strip);
  requestAnimationFrame(() => { const c = strip.querySelector('.day-chip.active'); if (c) strip.scrollLeft = c.offsetLeft - strip.clientWidth / 2 + c.clientWidth / 2; });
  if (!day) { root.append(empty('No days yet', 'Set the trip dates in Settings to generate days.')); return; }

  const items = sortBy(day.items || [], (i) => (i.time || '99:99'));
  const dayHead = el('div', { class: 'day-header' },
    el('div', {},
      el('h3', { class: 'day-title' }, `${fmtDate(day.date)} · ${day.title || 'Untitled day'}`),
      el('div', { class: 'day-meta' }, [day.base ? `Sleeping: ${day.base}` : 'No base set', items.length ? `${items.length} items` : 'Nothing planned yet', store.showMoney && dayCost(items, tripRates(trip)) ? `~${fmtMoney(dayCost(items, tripRates(trip)))}` : ''].filter(Boolean).join(' · ')),
    ),
  );
  if (day.walk) dayHead.firstChild.append(el('div', { class: 'day-meta day-walk' }, `🚶 ${day.walk}`));
  root.append(dayHead);
  root.append(dayMap(store, day, items, navigate));
  if (day.notes) root.append(el('div', { class: 'callout', style: { marginBottom: '12px' } }, el('span', { class: 'ico' }, '📝'), el('div', { html: linkify(day.notes) })));

  if (!items.length) {
    root.append(empty('Nothing on this day yet', 'Use + Add to put a flight, train, ski day, meal or note here.'));
  } else {
    const list = el('ul', { class: 'timeline' });
    for (const it of items) list.append(renderItem(store, day, it, tripRates(trip)));
    root.append(list);
  }
  const secret = store.vault.itemSecrets || {};
  root.append(el('button', { class: 'fab', type: 'button', 'aria-label': 'Add item', onClick: () => editItem(store, day, null) }, '+'));
}

function dayCost(items, rates) {
  return items.reduce((s, i) => s + toAud(i.cost, i.currency || 'AUD', rates), 0);
}

function renderItem(store, day, it, rates) {
  const t = TYPES[it.type] || TYPES.note;
  const cost = it.cost ? fmtMoney(it.cost, it.currency || 'AUD') : '';
  const secret = store.vault.itemSecrets?.[it.id];
  const foot = [];
  const inAud = it.currency && it.currency !== 'AUD' ? toAud(it.cost, it.currency, rates) : 0;
  if (cost && store.showMoney) foot.push(el('span', { class: 'mono' }, cost + (inAud ? ` (~${fmtMoney(inAud)})` : '')));
  if (it.split > 1 && store.showMoney) foot.push(el('span', { class: 'variant-tag' }, `÷${it.split}`));
  if (it.status && it.status !== 'idea') foot.push(pill(it.status, STATUSES[it.status]));
  if (secret) foot.push(el('span', { class: 'pill' }, '🔒 ' + secret));
  if (it.url) foot.push(el('a', { href: it.url, target: '_blank', rel: 'noopener', onClick: (e) => e.stopPropagation() }, 'Link ↗'));
  const place = it.placeId && (store.trip.places || []).find((p) => p.id === it.placeId);
  if (place) foot.push(el('a', { href: `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`, target: '_blank', rel: 'noopener', onClick: (e) => e.stopPropagation() }, '📍 Maps ↗'));
  const body = el('div', { class: 'tl-body', role: 'button', tabindex: '0', onClick: () => editItem(store, day, it), onKeydown: (e) => { if (e.key === 'Enter') editItem(store, day, it); } },
    el('div', { class: 'tl-title' }, it.title || t.label, it.status === 'skip' ? pill('skip', 'Skipped') : null, it.variant ? el('span', { class: 'variant-tag' }, (variantList(store.trip).find((x) => x.id === it.variant)?.short) || it.variant) : null),
    it.location ? el('div', { class: 'tl-sub' }, '📍 ' + it.location) : null,
    it.who ? el('div', { class: 'tl-sub' }, '👥 ' + it.who) : null,
    it.notes ? el('div', { class: 'tl-notes', html: linkify(it.notes) }) : null,
    foot.length ? el('div', { class: 'tl-foot' }, ...foot) : null,
  );
  return el('li', { class: `tl-item ${it.done ? 'done' : ''}` },
    el('div', { class: 'tl-time' }, fmtTime(it.time) || '—', it.endTime ? el('span', { class: 'tl-end' }, fmtTime(it.endTime)) : null),
    el('div', { class: 'type-chip', dataset: { type: it.type || 'note' }, 'aria-hidden': 'true' }, t.ico),
    body,
  );
}

export function editItem(store, day, item) {
  const isNew = !item;
  const it = item ? { ...item } : { id: uid(), type: 'activity', status: 'planned', currency: 'AUD' };
  const days = sortBy(store.trip.days, (d) => d.date);
  let type = it.type || 'activity';
  const picker = el('div', { class: 'type-picker', role: 'group', 'aria-label': 'Type' });
  for (const [k, v] of Object.entries(TYPES)) {
    const b = el('button', { type: 'button', class: k === type ? 'active' : '', onClick: () => { type = k; picker.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b)); } }, el('span', { class: 'tp-ico' }, v.ico), v.label);
    picker.append(b);
  }
  const f = form([
    { name: 'title', label: 'Title', value: it.title || '', placeholder: 'e.g. Shinkansen to Nagano' },
    { name: 'day', label: 'Day', type: 'select', options: days.map((d) => [d.id, `${fmtDate(d.date)} · ${d.title || ''}`]), value: day.id, half: true },
    ...(variantList(store.trip).length > 1 ? [{ name: 'variant', label: 'Applies to', type: 'select', options: variantOptions(store.trip), value: it.variant || (isNew ? (activeVariant(store.trip) || '') : ''), half: true }] : []),
    { name: 'status', label: 'Status', type: 'select', options: Object.entries(STATUSES), value: it.status || 'planned', half: true },
    { name: 'time', label: 'Start time', type: 'time', value: it.time || '', half: true },
    { name: 'endTime', label: 'End time', type: 'time', value: it.endTime || '', half: true },
    { name: 'location', label: 'Place (as text)', value: it.location || '', placeholder: 'e.g. Nagano Station, east exit' },
    ...((store.trip.people || []).length > 1 ? [{ name: 'who', label: 'Who is this for', value: it.who || '', placeholder: 'Leave blank for everyone' }] : []),
    { name: 'placeId', label: 'Pin on the map', type: 'select', options: [['', 'No pin'], ...sortBy(store.trip.places || [], (p) => `${p.town || ''} ${p.name}`).map((p) => [p.id, `${p.town ? p.town + ' · ' : ''}${p.name}`])], value: it.placeId || '', hint: 'Pick a saved place; add new places on the Map page.' },
    ...(store.showMoney ? [
      { name: 'cost', label: 'Cost', type: 'number', value: it.cost ?? '', half: true, hint: 'Leave blank if the cost lives in Flights or Stays' },
      { name: 'currency', label: 'Currency', type: 'select', options: tripCurrencies(store.trip), value: it.currency || 'AUD', half: true },
      ...((store.trip.people || []).length > 1 ? [{ name: 'split', label: 'Split how many ways', type: 'number', value: it.split ?? 1, half: true, hint: `1 means you pay it all. Put ${(store.trip.people || []).length} for a whole-group cost.` }] : []),
    ] : []),
    { name: 'url', label: 'Link', value: it.url || '', placeholder: 'https://' },
    { name: 'notes', label: 'Notes', type: 'textarea', value: it.notes || '' },
    { name: 'secret', label: 'Private note (booking ref, seat, code)', value: store.vault.itemSecrets?.[it.id] || '', hint: 'Stays on this device only. Never written to GitHub.' },
    { name: 'done', label: 'Done', type: 'checkbox', value: !!it.done },
  ]);
  const body = el('div', {}, el('div', { class: 'field' }, el('label', {}, 'Type'), picker), el('div', { class: 'hr' }), f.node);
  const actions = [];
  if (!isNew) actions.push({ label: 'Delete', class: 'btn-danger', keepOpen: true, onClick: async () => { if (await confirmDialog('Delete this item from the plan?')) { store.update((t) => { for (const d of t.days) d.items = (d.items || []).filter((x) => x.id !== it.id); }); store.setItemSecret(it.id, ''); toast('Deleted'); return true; } return false; } });
  actions.push('spacer', { label: 'Cancel', class: 'btn-ghost' }, {
    label: isNew ? 'Add' : 'Save', class: 'btn-primary', onClick: () => {
      const v = f.values();
      if (!v.title) { toast('Give it a title', { kind: 'error' }); f.inputs.title.focus(); return false; }
      const next = { ...it, type, title: v.title, status: v.status, time: v.time, endTime: v.endTime, location: v.location, url: v.url, notes: v.notes, done: v.done, category: it.category || typeCategory[type] };
      // The money fields are not on the form when the budget is hidden, so keep
      // whatever the plan already has rather than blanking it.
      if ('cost' in v) { next.cost = v.cost; next.currency = v.currency; }
      if ('who' in v) { if (v.who) next.who = v.who; else delete next.who; }
      if ('split' in v) { if (Number(v.split) > 1) next.split = Math.round(Number(v.split)); else delete next.split; }
      if ('variant' in v) { if (v.variant) next.variant = v.variant; else delete next.variant; }
      if (v.placeId) next.placeId = v.placeId; else delete next.placeId;
      store.update((t) => {
        for (const d of t.days) d.items = (d.items || []).filter((x) => x.id !== next.id);
        const target = t.days.find((d) => d.id === v.day) || t.days[0];
        (target.items ||= []).push(next);
      });
      store.setItemSecret(next.id, v.secret);
      toast(isNew ? 'Added' : 'Saved', { kind: 'ok' });
    },
  });
  sheet({ title: isNew ? 'Add to the plan' : 'Edit item', body, actions });
}

function editDay(store, day, navigate) {
  const f = form([
    { name: 'title', label: 'Day title', value: day.title || '' },
    { name: 'base', label: 'Where you sleep tonight', value: day.base || '', placeholder: 'e.g. Nozawa Onsen' },
    { name: 'walk', label: 'Walking estimate', value: day.walk || '', placeholder: 'e.g. 12,000-15,000 steps' },
    { name: 'notes', label: 'Day notes', type: 'textarea', value: day.notes || '' },
  ]);
  const av = activeVariant(store.trip);
  sheet({ title: fmtDate(day.date, { year: true }), body: f.node, actions: ['spacer', { label: 'Cancel', class: 'btn-ghost' }, { label: 'Save', class: 'btn-primary', onClick: () => { const v = f.values(); store.update((t) => { const d = t.days.find((x) => x.id === day.id); if (av && d.variants && d.variants[av]) Object.assign(d.variants[av], v); else Object.assign(d, v); }); toast('Saved', { kind: 'ok' }); } }] });
}

// Make sure every date between start and end has a day record.
export function ensureDays(store) {
  const { start, end } = store.trip.meta || {};
  if (!start || !end) return;
  const have = new Set((store.trip.days || []).map((d) => d.date));
  const missing = dateRange(start, end).filter((d) => !have.has(d));
  if (missing.length) store.update((t) => { t.days ||= []; for (const date of missing) t.days.push({ id: uid(), date, title: '', base: '', notes: '', items: [] }); }, { silent: true });
}
