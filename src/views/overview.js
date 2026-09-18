import { el, fmtDate, fmtMoney, todayIso, daysBetween, sortBy, plural, uid, TYPES, fmtTime, activeVariant, variantList, dayView, forVariant } from '../util.js';
import { section, pill, empty, sheet, form, toast, confirmDialog } from '../ui.js';
import { budgetSummary } from './budget.js';
import { neededPoints } from './flights.js';

export function render(root, { store, navigate }) {
  const t = store.trip;
  const today = todayIso();
  const toStart = daysBetween(today, t.meta.start);
  const toEnd = daysBetween(today, t.meta.end);
  let phase, big, sub;
  if (toStart > 0) { phase = 'before'; big = `${toStart}`; sub = `days until you fly · ${fmtDate(t.meta.start, { year: true })}`; }
  else if (toEnd >= 0) { phase = 'during'; big = `Day ${daysBetween(t.meta.start, today) + 1}`; sub = `of ${daysBetween(t.meta.start, t.meta.end) + 1} · home ${fmtDate(t.meta.end)}`; }
  else { phase = 'after'; big = 'Home'; sub = `trip finished ${fmtDate(t.meta.end, { year: true })}`; }

  const av = activeVariant(t);
  const vName = variantList(t).find((x) => x.id === av)?.name;
  const days = sortBy(t.days || [], (d) => d.date).map((d) => dayView(d, av));
  const allItems = days.flatMap((d) => (d.items || []).map((i) => ({ ...i, date: d.date })));
  const skiDays = allItems.filter((i) => i.type === 'ski' && i.status !== 'skip').length;
  const booked = allItems.filter((i) => i.status === 'booked').length + forVariant(t.stays, av).filter((s) => s.status === 'booked').length + (t.flights?.confirmed || []).length;
  const openQ = (t.questions || []).filter((q) => !q.resolved).length;
  const bs = budgetSummary(t);
  const checklist = forVariant(t.checklist, av);
  const openTodos = checklist.filter((c) => !c.done);
  const soon = sortBy(openTodos.filter((c) => c.due), (c) => c.due).slice(0, 5);

  root.append(el('div', { class: 'card accent', style: { padding: '22px' } },
    el('div', { class: 'stat-label' }, vName ? `${t.meta.title || 'Trip'} · ${vName}` : (t.meta.title || 'Trip')),
    el('div', { class: 'display', style: { fontSize: '44px', lineHeight: '1', margin: '6px 0 4px' } }, big),
    el('div', { class: 'muted' }, sub),
  ));

  const people = t.people || [];
  root.append(el('div', { class: 'grid grid-stats', style: { marginTop: '12px' } },
    skiDays ? stat('Ski days', skiDays, 'in the plan') : stat('Days away', days.length, 'including travel'),
    stat('Booked', booked, 'confirmed things'),
    bs.shared
      ? stat('Your share', fmtMoney(bs.mine, 'AUD', { compact: true }), `of ${fmtMoney(bs.total, 'AUD', { compact: true })} across the group`)
      : stat('Budget', fmtMoney(bs.total, 'AUD', { compact: true }), `${fmtMoney(bs.booked, 'AUD', { compact: true })} locked in`),
    neededPoints(t)
      ? stat('Points plan', `${Math.round(neededPoints(t) / 1000)}k`, `of ${Math.round((t.points?.balance || 0) / 1000)}k available`)
      : stat('Going', people.length || 1, people.length > 1 ? 'of you' : 'just you'),
  ));

  // Who's going (group trips only)
  if (people.length > 1) {
    const homes = {};
    for (const p of people) (homes[p.home || 'Other'] ||= []).push(p);
    root.append(section('Who is going',
      el('div', { class: 'card' },
        el('div', { class: 'chips' }, ...people.map((p) => el('button', { class: 'chip', type: 'button', onClick: () => editPerson(store, p) }, `${p.name}${p.home ? ` · ${p.home}` : ''}`))),
        el('div', { class: 'small muted', style: { marginTop: '10px' } }, Object.entries(homes).map(([h, list]) => `${plural(list.length, 'person', 'people')} from ${h}`).join(' · ')),
        el('div', { class: 'btn-row', style: { marginTop: '10px' } }, el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onClick: () => editPerson(store, null) }, '+ Add person')),
      )));
  }

  // Route summary
  const bases = [];
  for (const d of days) { const b = d.base || '—'; if (!bases.length || bases[bases.length - 1].base !== b) bases.push({ base: b, n: 1 }); else bases[bases.length - 1].n++; }
  root.append(section('Where you sleep', el('div', { class: 'chips' }, ...bases.map((b) => el('span', { class: 'chip' }, `${b.base}${b.n > 1 ? ` × ${b.n}` : ''}`)))));

  // Attention
  const attention = [];
  if (openQ) attention.push(el('div', { class: 'row', onClick: () => navigate('decisions') }, el('div', { class: 'type-chip', 'aria-hidden': 'true' }, '🧭'), el('div', { class: 'row-main' }, el('div', { class: 'row-title' }, `${plural(openQ, 'decision')} waiting on you`), el('div', { class: 'row-sub' }, 'Recommendations are filled in. Confirm or change them.'))));
  const overdue = openTodos.filter((c) => c.due && c.due < today);
  if (overdue.length) attention.push(el('div', { class: 'row', onClick: () => navigate('checklist') }, el('div', { class: 'type-chip', dataset: { type: 'food' }, 'aria-hidden': 'true' }, '⏰'), el('div', { class: 'row-main' }, el('div', { class: 'row-title' }, `${plural(overdue.length, 'overdue to-do')}`), el('div', { class: 'row-sub' }, overdue.map((c) => c.text).slice(0, 3).join(' · ')))));
  if (!store.settings.token) attention.push(el('div', { class: 'row', onClick: () => navigate('settings') }, el('div', { class: 'type-chip', dataset: { type: 'ski' }, 'aria-hidden': 'true' }, '☁️'), el('div', { class: 'row-main' }, el('div', { class: 'row-title' }, 'Edits stay on this device'), el('div', { class: 'row-sub' }, 'Add a GitHub token in Settings to sync between phone and computer.'))));
  if (attention.length) root.append(section('Needs attention', el('div', { class: 'row-list' }, ...attention)));

  // Coming up (to-dos)
  if (soon.length) root.append(section('Coming up', el('div', { class: 'row-list' }, ...soon.map((c) => el('div', { class: 'row', onClick: () => navigate('checklist') }, el('div', { class: 'row-main' }, el('div', { class: 'row-title' }, c.text), el('div', { class: 'row-sub' }, c.group || '')), el('div', { class: 'row-side' }, el('div', { class: `sm ${c.due < today ? 'flag' : ''}` }, fmtDate(c.due))))))));

  // Day preview
  const focusDay = phase === 'during' ? days.find((d) => d.date === today) : days[0];
  if (focusDay) {
    const items = sortBy(focusDay.items || [], (i) => i.time || '99');
    root.append(section(phase === 'during' ? 'Today' : 'First day',
      el('div', { class: 'card clickable', onClick: () => navigate(phase === 'during' ? `go/${focusDay.date}` : `itinerary/${focusDay.date}`) },
        el('div', { class: 'card-title' }, `${fmtDate(focusDay.date)} · ${focusDay.title || ''}`),
        items.length ? el('ul', { class: 'row-list', style: { marginTop: '10px', gap: '6px' } }, ...items.slice(0, 6).map((i) => el('li', { style: { display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' } }, el('span', { class: 'mono muted', style: { width: '58px', flex: 'none' } }, fmtTime(i.time) || '—'), el('span', {}, (TYPES[i.type]?.ico || '') + ' ' + i.title)))) : el('p', { class: 'muted', style: { marginTop: '6px' } }, 'Nothing planned yet.'),
      )));
  }
}

// Names and home airports drive the flight groupings and the cost splits.
function editPerson(store, p) {
  const isNew = !p;
  const v0 = p || { id: uid(), name: '', home: '' };
  const fm = form([
    { name: 'name', label: 'Name', value: v0.name || '' },
    { name: 'home', label: 'Flying from', value: v0.home || '', placeholder: 'e.g. Sunshine Coast', half: true },
    { name: 'note', label: 'Note', value: v0.note || '', half: true },
  ]);
  const actions = [];
  if (!isNew) actions.push({ label: 'Remove', class: 'btn-danger', keepOpen: true, onClick: async () => { if (await confirmDialog(`Remove ${v0.name || 'this person'} from the trip?`)) { store.update((t) => { t.people = (t.people || []).filter((x) => x.id !== v0.id); }); return true; } return false; } });
  actions.push('spacer', { label: 'Cancel', class: 'btn-ghost' }, { label: 'Save', class: 'btn-primary', onClick: () => {
    const v = fm.values();
    if (!v.name) { toast('Give them a name', { kind: 'error' }); return false; }
    store.update((t) => { t.people ||= []; const i = t.people.findIndex((x) => x.id === v0.id); const next = { ...v0, ...v }; if (i >= 0) t.people[i] = next; else t.people.push(next); });
    toast('Saved', { kind: 'ok' });
  } });
  sheet({ title: isNew ? 'Add person' : 'Edit person', body: fm.node, actions });
}

const stat = (label, value, sub) => el('div', { class: 'card stat' }, el('div', { class: 'stat-label' }, label), el('div', { class: 'stat-value' }, String(value)), sub ? el('div', { class: 'stat-sub' }, sub) : null);
