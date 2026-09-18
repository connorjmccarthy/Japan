import { el, uid, groupBy, sortBy, linkify, activeVariant, variantList, variantOptions, forVariant } from '../util.js';
import { sheet, form, toast, confirmDialog, section, pill, empty } from '../ui.js';

const STATUS = [['idea', 'Maybe'], ['planned', 'On the list'], ['bought', 'Bought'], ['skip', 'Skip']];
const STATUS_LABEL = Object.fromEntries(STATUS);
const ORDER = ['Spirits and bar', 'Universal Studios', 'Kitchen and craft', 'Food and snacks', 'Everyday things', 'For other people', 'Other'];

// Australia lets one adult bring in 2.25 litres of alcohol duty free, and going
// over means duty on the whole lot rather than on the excess. On a solo trip
// that is three 700 ml bottles and nothing else, so it is worth counting.
export const ALCOHOL_LIMIT_ML = 2250;

// Only things you actually intend to carry count against the allowance.
const counted = (s) => s.status === 'planned' || s.status === 'bought';
export const alcoholMl = (list) => (list || []).filter((s) => counted(s) && s.ml).reduce((n, s) => n + (Number(s.ml) || 0), 0);

export function render(root, { store }) {
  const t = store.trip;
  const list = forVariant(t.souvenirs, activeVariant(t));
  const bought = list.filter((s) => s.status === 'bought').length;
  const onList = list.filter((s) => s.status !== 'skip').length;

  root.append(el('div', { class: 'page-head' },
    el('div', {},
      el('h2', { class: 'page-title' }, 'Souvenirs'),
      el('p', { class: 'page-sub' }, 'What to bring home, where to get it, and what Australia will actually let through.')),
    el('div', { class: 'page-actions' }, el('button', { class: 'btn btn-primary btn-sm', type: 'button', onClick: () => editItem(store, null) }, '+ Add'))));

  if (onList) root.append(el('p', { class: 'small muted', style: { marginTop: '-4px' } }, `${bought} of ${onList} bought`));

  // Alcohol allowance meter. The binding constraint on the whole page.
  const ml = alcoholMl(list);
  if (list.some((s) => s.ml)) {
    const pct = Math.min(100, Math.round(ml / ALCOHOL_LIMIT_ML * 100));
    const over = ml > ALCOHOL_LIMIT_ML;
    const near = !over && pct >= 90;          // one more bottle will not fit
    const left = ALCOHOL_LIMIT_ML - ml;
    const leftText = left < 250 ? `${left} ml` : `${(left / 1000).toFixed(2)} L`;
    root.append(el('div', { class: `card ${over ? 'warn' : 'soft'}`, style: { marginTop: '12px' } },
      el('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'baseline' } },
        el('strong', {}, 'Duty-free alcohol'),
        el('span', { class: over || near ? 'flag' : 'muted' }, `${(ml / 1000).toFixed(2)} L of 2.25 L`)),
      el('div', { class: 'meter', role: 'img', 'aria-label': `${ml} of ${ALCOHOL_LIMIT_ML} millilitres` }, el('div', { class: `meter-fill ${over ? 'over' : near ? 'near' : ''}`, style: { width: `${pct}%` } })),
      el('div', { class: 'small muted', style: { marginTop: '8px' } }, over
        ? 'Over the limit. Duty is charged on the whole lot, not just the excess, and Australian spirits duty is punishing. Drop a bottle, or declare it and pay.'
        : near
          ? `${leftText} left, so nothing else fits. Swapping is the only move from here. Buying at airport duty free does not change this limit.`
          : `${leftText} left. Counts anything marked on the list or bought. Buying at airport duty free does not change this limit.`),
    ));
  }

  const guide = t.souvenirGuide || [];
  if (guide.length) root.append(section('Getting it home', ...guide.map((g) => el('details', { class: 'acc' }, el('summary', {}, g.title), el('div', { class: 'acc-body prose' }, el('p', {}, g.body))))));

  if (!list.length) { root.append(empty('Nothing on the list yet', 'Add the first thing with the button above.')); return; }

  const groups = groupBy(list, (s) => s.category || 'Other');
  const cats = sortBy(Object.keys(groups), (c) => {
    const i = ORDER.indexOf(c);
    return i === -1 ? `zz${c}` : String(i).padStart(2, '0');
  });
  for (const cat of cats) {
    root.append(section(cat, el('div', { class: 'row-list' }, ...sortBy(groups[cat], (s) => ({ bought: 0, planned: 1, idea: 2, skip: 3 }[s.status] ?? 4)).map((s) => row(store, s)))));
  }
}

function row(store, s) {
  const isBought = s.status === 'bought';
  return el('div', { class: `check ${isBought ? 'done' : ''} ${s.status === 'skip' ? 'muted' : ''}` },
    el('input', {
      type: 'checkbox', checked: isBought ? true : null, 'aria-label': `Bought ${s.name}`,
      onChange: (e) => store.update((t) => { const x = t.souvenirs.find((y) => y.id === s.id); if (x) x.status = e.target.checked ? 'bought' : 'planned'; }),
    }),
    el('div', { class: 'check-text', style: { cursor: 'pointer' }, onClick: () => editItem(store, s) },
      el('div', { style: { fontWeight: 600 } }, s.name,
        s.priceBand ? el('span', { class: 'muted', style: { fontWeight: 400, marginLeft: '8px' } }, s.priceBand) : null,
        s.ml ? el('span', { class: 'variant-tag', style: { marginLeft: '8px' } }, `${s.ml} ml`) : null,
        s.status && s.status !== 'planned' ? pill(s.status === 'bought' ? 'booked' : s.status, STATUS_LABEL[s.status] || s.status) : null,
        s.variant ? el('span', { class: 'variant-tag' }, (variantList(store.trip).find((x) => x.id === s.variant)?.short) || s.variant) : null),
      s.where ? el('div', { class: 'small muted' }, '📍 ' + s.where) : null,
      s.why ? el('div', { class: 'small', html: linkify(s.why) }) : null,
      s.notes ? el('div', { class: 'small muted', html: linkify(s.notes) }) : null,
    ),
    el('button', { class: 'check-edit', type: 'button', 'aria-label': 'Edit', onClick: () => editItem(store, s) }, '✎'),
  );
}

function editItem(store, s) {
  const isNew = !s;
  const v0 = s || { id: uid(), status: 'idea', category: 'Other' };
  const fm = form([
    { name: 'name', label: 'What', value: v0.name || '', placeholder: 'e.g. Yuzu liqueur' },
    { name: 'category', label: 'Category', type: 'select', options: ORDER, value: v0.category || 'Other', half: true },
    { name: 'status', label: 'Status', type: 'select', options: STATUS, value: v0.status || 'idea', half: true },
    ...(variantList(store.trip).length > 1 ? [{ name: 'variant', label: 'Applies to', type: 'select', options: variantOptions(store.trip), value: v0.variant || (isNew ? (activeVariant(store.trip) || '') : ''), half: true }] : []),
    { name: 'priceBand', label: 'Price band', type: 'select', options: ['', '¥', '¥¥', '¥¥¥'], value: v0.priceBand || '', half: true },
    { name: 'ml', label: 'Millilitres (alcohol only)', type: 'number', value: v0.ml ?? '', half: true, hint: 'Counts against the 2.25 L duty-free allowance. Leave blank for anything that is not a bottle.' },
    { name: 'where', label: 'Where to get it', value: v0.where || '' },
    { name: 'why', label: 'Why this one', type: 'textarea', value: v0.why || '' },
    { name: 'notes', label: 'Notes', type: 'textarea', value: v0.notes || '' },
    { name: 'url', label: 'Link', value: v0.url || '', placeholder: 'https://' },
  ]);
  const actions = [];
  if (!isNew) actions.push({ label: 'Delete', class: 'btn-danger', keepOpen: true, onClick: async () => { if (await confirmDialog('Delete this souvenir?')) { store.update((t) => { t.souvenirs = (t.souvenirs || []).filter((x) => x.id !== v0.id); }); return true; } return false; } });
  actions.push('spacer', { label: 'Cancel', class: 'btn-ghost' }, {
    label: 'Save', class: 'btn-primary', onClick: () => {
      const v = fm.values();
      if (!v.name) { toast('Give it a name', { kind: 'error' }); return false; }
      store.update((t) => {
        t.souvenirs ||= [];
        const i = t.souvenirs.findIndex((x) => x.id === v0.id);
        const next = { ...v0, ...v };
        if ('variant' in v && !v.variant) delete next.variant;
        if (Number(next.ml) > 0) next.ml = Number(next.ml); else delete next.ml;
        if (!next.url) delete next.url;
        if (i >= 0) t.souvenirs[i] = next; else t.souvenirs.push(next);
      });
      toast('Saved', { kind: 'ok' });
    },
  });
  sheet({ title: isNew ? 'Add souvenir' : 'Edit souvenir', body: fm.node, actions });
}
