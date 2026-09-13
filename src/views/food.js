import { el, uid, groupBy, linkify, activeVariant, variantList, variantOptions, forVariant } from '../util.js';
import { sheet, form, toast, confirmDialog, section, empty } from '../ui.js';

export function render(root, { store }) {
  const food = forVariant(store.trip.food, activeVariant(store.trip));
  root.append(el('div', { class: 'page-head' }, el('div', {}, el('h2', { class: 'page-title' }, 'Food'), el('p', { class: 'page-sub' }, 'Local, everyday, unfussy. Tick things off as you eat them.')), el('div', { class: 'page-actions' }, el('button', { class: 'btn btn-primary btn-sm', type: 'button', onClick: () => editFood(store, null) }, '+ Add'))));
  const guide = store.trip.foodGuide || [];
  if (guide.length) root.append(section('Eating well without overstepping', ...guide.map((g) => el('details', { class: 'acc' }, el('summary', {}, g.title), el('div', { class: 'acc-body prose' }, el('p', {}, g.body))))));
  if (!food.length) { root.append(empty('Nothing here yet')); return; }
  const groups = groupBy(food, (f) => f.town || 'Anywhere');
  for (const [town, list] of Object.entries(groups)) {
    root.append(section(town, el('div', { class: 'row-list' }, ...list.map((f) => el('div', { class: `check ${f.tried ? 'done' : ''}` },
      el('input', { type: 'checkbox', checked: f.tried ? true : null, 'aria-label': `Tried ${f.dish}`, onChange: (e) => store.update((t) => { const x = t.food.find((y) => y.id === f.id); x.tried = e.target.checked; }) }),
      el('div', { class: 'check-text', onClick: () => editFood(store, f), style: { cursor: 'pointer' } },
        el('div', { style: { fontWeight: 600 } }, f.dish, f.priceBand ? el('span', { class: 'muted', style: { fontWeight: 400, marginLeft: '8px' } }, f.priceBand) : null),
        f.where ? el('div', { class: 'small muted' }, '📍 ' + f.where) : null,
        f.why ? el('div', { class: 'small', html: linkify(f.why) }) : null,
        f.notes ? el('div', { class: 'small muted', html: linkify(f.notes) }) : null,
      ),
      el('button', { class: 'check-edit', type: 'button', 'aria-label': 'Edit', onClick: () => editFood(store, f) }, '✎'),
    )))));
  }
}

function editFood(store, f) {
  const isNew = !f;
  const v0 = f || { id: uid() };
  const fm = form([
    { name: 'dish', label: 'Dish or place', value: v0.dish || '' },
    { name: 'town', label: 'Town', value: v0.town || '', half: true },
    { name: 'priceBand', label: 'Price band', type: 'select', options: ['', '¥', '¥¥', '¥¥¥'], value: v0.priceBand || '', half: true },
    ...(variantList(store.trip).length > 1 ? [{ name: 'variant', label: 'Applies to', type: 'select', options: variantOptions(store.trip), value: v0.variant || (isNew ? (activeVariant(store.trip) || '') : '') }] : []),
    { name: 'where', label: 'Where to get it', value: v0.where || '' },
    { name: 'why', label: 'Why it is worth it', type: 'textarea', value: v0.why || '' },
    { name: 'notes', label: 'Notes (after you try it)', type: 'textarea', value: v0.notes || '' },
  ]);
  const actions = [];
  if (!isNew) actions.push({ label: 'Delete', class: 'btn-danger', keepOpen: true, onClick: async () => { if (await confirmDialog('Delete this entry?')) { store.update((t) => { t.food = t.food.filter((x) => x.id !== v0.id); }); return true; } return false; } });
  actions.push('spacer', { label: 'Cancel', class: 'btn-ghost' }, { label: 'Save', class: 'btn-primary', onClick: () => { const v = fm.values(); if (!v.dish) { toast('Name the dish', { kind: 'error' }); return false; } store.update((t) => { t.food ||= []; const i = t.food.findIndex((x) => x.id === v0.id); const next = { ...v0, ...v }; if ('variant' in v && !v.variant) delete next.variant; if (i >= 0) t.food[i] = next; else t.food.push(next); }); toast('Saved', { kind: 'ok' }); } });
  sheet({ title: isNew ? 'Add food' : 'Edit food', body: fm.node, actions });
}
