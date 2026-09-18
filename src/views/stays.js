import { el, fmtMoney, fmtDate, uid, groupBy, sortBy, linkify, activeVariant, variantList, variantOptions, forVariant } from '../util.js';
import { sheet, form, toast, confirmDialog, section, pill, empty } from '../ui.js';

const STATUS = [['idea', 'Idea'], ['shortlist', 'Shortlist'], ['planned', 'Planned'], ['booked', 'Booked'], ['skip', 'Skip']];

export function render(root, { store }) {
  const t = store.trip;
  const stays = forVariant(t.stays, activeVariant(t));
  root.append(el('div', { class: 'page-head' }, el('div', {}, el('h2', { class: 'page-title' }, 'Stays'), el('p', { class: 'page-sub' }, 'Private rooms only. Prices are per night in AUD unless noted. Planned or booked stays count in the budget.')), el('div', { class: 'page-actions' }, el('button', { class: 'btn btn-primary btn-sm', type: 'button', onClick: () => editStay(store, null) }, '+ Add stay'))));
  const guide = store.trip.staysGuide || [];
  if (guide.length) root.append(section('How to actually get a room', ...guide.map((g) => el('details', { class: 'acc' }, el('summary', {}, g.title), el('div', { class: 'acc-body prose' }, el('p', {}, g.body))))));
  if (!stays.length) { root.append(empty('No stays yet')); return; }
  const groups = groupBy(stays, (s) => s.town || 'Other');
  for (const [town, list] of Object.entries(groups)) {
    root.append(section(town, el('div', { class: 'row-list' }, ...sortBy(list, (s) => ({ booked: 0, planned: 1, shortlist: 2, idea: 3, skip: 4 }[s.status] ?? 5)).map((s) => stayRow(store, s)))));
  }
}

function stayRow(store, s) {
  const total = (Number(s.pricePerNightAud) || 0) * (Number(s.nights) || 0);
  const secret = store.vault.itemSecrets?.[s.id];
  return el('div', { class: 'row', onClick: () => editStay(store, s) },
    el('div', { class: 'type-chip', dataset: { type: 'stay' }, 'aria-hidden': 'true' }, '🏨'),
    el('div', { class: 'row-main' },
      el('div', { class: 'row-title' }, s.name, pill(s.status, STATUS.find((x) => x[0] === s.status)?.[1] || s.status), s.variant ? el('span', { class: 'variant-tag' }, (variantList(store.trip).find((x) => x.id === s.variant)?.short) || s.variant) : null),
      el('div', { class: 'row-sub' }, [s.type, s.distance, s.checkIn ? `${fmtDate(s.checkIn)} → ${fmtDate(s.checkOut)}` : null].filter(Boolean).join(' · ')),
      s.address ? el('div', { class: 'row-sub' }, '🏠 ' + s.address) : null,
      s.notes ? el('div', { class: 'row-sub', html: linkify(s.notes) }) : null,
      el('div', { class: 'tl-foot' }, s.url ? el('a', { href: s.url, target: '_blank', rel: 'noopener', onClick: (e) => e.stopPropagation() }, 'Link ↗') : null, secret ? el('span', { class: 'pill' }, '🔒 ' + secret) : null),
    ),
    store.showMoney
      ? el('div', { class: 'row-side' }, el('div', { class: 'big' }, s.pricePerNightAud ? `${fmtMoney(s.pricePerNightAud)}/nt` : '—'), s.nights ? el('div', { class: 'sm' }, `${s.nights} nt · ${fmtMoney(total)}`) : null, s.priceNote ? el('div', { class: 'sm' }, s.priceNote) : null)
      : (s.nights ? el('div', { class: 'row-side' }, el('div', { class: 'sm' }, `${s.nights} nt`)) : null),
  );
}

export function editStay(store, s) {
  const isNew = !s;
  const v0 = s || { id: uid(), status: 'idea', privateRoom: true };
  const fm = form([
    { name: 'name', label: 'Name', value: v0.name || '' },
    { name: 'town', label: 'Town', value: v0.town || '', half: true },
    { name: 'type', label: 'Type', value: v0.type || '', placeholder: 'ryokan, business hotel, minshuku', half: true },
    { name: 'status', label: 'Status', type: 'select', options: STATUS, value: v0.status || 'idea', half: true },
    ...(variantList(store.trip).length > 1 ? [{ name: 'variant', label: 'Applies to', type: 'select', options: variantOptions(store.trip), value: v0.variant || (isNew ? (activeVariant(store.trip) || '') : ''), half: true }] : []),
    ...(store.showMoney ? [{ name: 'pricePerNightAud', label: 'Price per night (AUD)', type: 'number', value: v0.pricePerNightAud ?? '', half: true }] : []),
    { name: 'nights', label: 'Nights', type: 'number', value: v0.nights ?? '', half: true },
    ...(store.showMoney && (store.trip.people || []).length > 1 ? [{ name: 'split', label: 'Split how many ways', type: 'number', value: v0.split ?? 1, half: true, hint: `1 means you pay it all. Put ${(store.trip.people || []).length} if the whole group shares it.` }] : []),
    ...(store.showMoney ? [{ name: 'priceNote', label: 'Price note', value: v0.priceNote || '', placeholder: 'estimate from Booking.com, Sep 2026', half: true }] : []),
    { name: 'checkIn', label: 'Check in', type: 'date', value: v0.checkIn || '', half: true },
    { name: 'checkOut', label: 'Check out', type: 'date', value: v0.checkOut || '', half: true },
    { name: 'address', label: 'Address (for taxis and Go mode)', value: v0.address || '', placeholder: 'Japanese address as written on the booking' },
    { name: 'distance', label: 'Distance to lifts / station', value: v0.distance || '' },
    { name: 'url', label: 'Link', value: v0.url || '' },
    { name: 'notes', label: 'Notes', type: 'textarea', value: v0.notes || '' },
    { name: 'secret', label: 'Private: confirmation number', value: store.vault.itemSecrets?.[v0.id] || '', hint: 'Kept on this device only.' },
    { name: 'privateRoom', label: 'Private room (not shared)', type: 'checkbox', value: v0.privateRoom !== false },
  ]);
  const actions = [];
  if (!isNew) actions.push({ label: 'Delete', class: 'btn-danger', keepOpen: true, onClick: async () => { if (await confirmDialog('Delete this stay?')) { store.update((t) => { t.stays = t.stays.filter((x) => x.id !== v0.id); }); store.setItemSecret(v0.id, ''); return true; } return false; } });
  actions.push('spacer', { label: 'Cancel', class: 'btn-ghost' }, { label: 'Save', class: 'btn-primary', onClick: () => { const v = fm.values(); if (!v.name) { toast('Give it a name', { kind: 'error' }); return false; } const { secret, ...rest } = v; store.update((t) => { t.stays ||= []; const i = t.stays.findIndex((x) => x.id === v0.id); const next = { ...v0, ...rest }; if ('variant' in rest && !rest.variant) delete next.variant; if ('split' in rest) { if (Number(rest.split) > 1) next.split = Math.round(Number(rest.split)); else delete next.split; } if (i >= 0) t.stays[i] = next; else t.stays.push(next); }); store.setItemSecret(v0.id, secret); toast('Saved', { kind: 'ok' }); } });
  sheet({ title: isNew ? 'Add stay' : 'Edit stay', body: fm.node, actions });
}
