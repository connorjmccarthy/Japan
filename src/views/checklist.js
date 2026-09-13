import { el, fmtDate, uid, groupBy, sortBy, todayIso, linkify } from '../util.js';
import { sheet, form, toast, confirmDialog, section, empty } from '../ui.js';

let filter = 'open';

export function render(root, { store }) {
  const items = store.trip.checklist || [];
  const today = todayIso();
  const done = items.filter((i) => i.done).length;
  root.append(el('div', { class: 'page-head' }, el('div', {}, el('h2', { class: 'page-title' }, 'Checklists'), el('p', { class: 'page-sub' }, `${done} of ${items.length} done`)), el('div', { class: 'page-actions' }, el('button', { class: 'btn btn-primary btn-sm', type: 'button', onClick: () => editItem(store, null) }, '+ Add'))));
  root.append(el('div', { class: 'progress', style: { marginBottom: '14px' } }, el('span', { style: { width: `${items.length ? done / items.length * 100 : 0}%` } })));
  const chips = el('div', { class: 'chips', style: { marginBottom: '8px' } });
  for (const [k, l] of [['open', 'Open'], ['all', 'All'], ['done', 'Done']]) chips.append(el('button', { class: `chip ${filter === k ? 'active' : ''}`, type: 'button', onClick: () => { filter = k; root.innerHTML = ''; render(root, { store }); } }, l));
  root.append(chips);
  const shown = items.filter((i) => filter === 'all' ? true : filter === 'done' ? i.done : !i.done);
  if (!shown.length) { root.append(empty(filter === 'open' ? 'All done' : 'Nothing here', filter === 'open' ? 'Nothing left on the list.' : '')); return; }
  const groups = groupBy(shown, (i) => i.group || 'General');
  const order = ['Before you go', 'Points and bookings', 'Packing', 'In Japan', 'Coming home', 'General'];
  for (const g of sortBy(Object.keys(groups), (k) => { const i = order.indexOf(k); return i < 0 ? 99 : i; })) {
    const list = sortBy(groups[g], (i) => i.due || '9999');
    root.append(section(g, el('div', { class: 'row-list' }, ...list.map((i) => el('div', { class: `check ${i.done ? 'done' : ''}` },
      el('input', { type: 'checkbox', checked: i.done ? true : null, 'aria-label': `Done: ${i.text}`, onChange: (e) => store.update((t) => { const x = t.checklist.find((y) => y.id === i.id); x.done = e.target.checked; }) }),
      el('div', { class: 'check-text' }, el('div', {}, i.text), i.notes ? el('div', { class: 'small muted', html: linkify(i.notes) }) : null, i.due ? el('div', { class: `check-due ${!i.done && i.due < today ? 'overdue' : ''}` }, (!i.done && i.due < today ? 'Overdue · ' : 'Due ') + fmtDate(i.due, { year: true })) : null),
      el('button', { class: 'check-edit', type: 'button', 'aria-label': 'Edit', onClick: () => editItem(store, i) }, '✎'),
    )))));
  }
}

function editItem(store, i) {
  const isNew = !i;
  const v0 = i || { id: uid(), group: 'Before you go' };
  const groups = [...new Set([...(store.trip.checklist || []).map((x) => x.group).filter(Boolean), 'Before you go', 'Points and bookings', 'Packing', 'In Japan', 'Coming home'])];
  const fm = form([
    { name: 'text', label: 'To do', value: v0.text || '' },
    { name: 'group', label: 'Group', type: 'select', options: groups, value: v0.group || groups[0], half: true },
    { name: 'due', label: 'Due', type: 'date', value: v0.due || '', half: true },
    { name: 'notes', label: 'Notes', type: 'textarea', value: v0.notes || '' },
    { name: 'done', label: 'Done', type: 'checkbox', value: !!v0.done },
  ]);
  const actions = [];
  if (!isNew) actions.push({ label: 'Delete', class: 'btn-danger', keepOpen: true, onClick: async () => { if (await confirmDialog('Delete this to-do?')) { store.update((t) => { t.checklist = t.checklist.filter((x) => x.id !== v0.id); }); return true; } return false; } });
  actions.push('spacer', { label: 'Cancel', class: 'btn-ghost' }, { label: 'Save', class: 'btn-primary', onClick: () => { const v = fm.values(); if (!v.text) { toast('Write the to-do', { kind: 'error' }); return false; } store.update((t) => { t.checklist ||= []; const k = t.checklist.findIndex((x) => x.id === v0.id); const next = { ...v0, ...v }; if (k >= 0) t.checklist[k] = next; else t.checklist.push(next); }); toast('Saved', { kind: 'ok' }); } });
  sheet({ title: isNew ? 'Add to-do' : 'Edit to-do', body: fm.node, actions });
}
