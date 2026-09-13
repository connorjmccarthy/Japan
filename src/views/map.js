import { el, uid, esc, linkify, activeVariant, forVariant } from '../util.js';
import { sheet, form, toast, confirmDialog, section, empty } from '../ui.js';

const KINDS = { airport: ['✈️', 'Airport'], station: ['🚉', 'Station'], town: ['🏘️', 'Town'], resort: ['⛷️', 'Ski area'], hotel: ['🏨', 'Stay'], park: ['🎡', 'Attraction'], food: ['🍜', 'Food'], other: ['📍', 'Place'] };

export function render(root, { store }) {
  const places = forVariant(store.trip.places, activeVariant(store.trip));
  root.append(el('div', { class: 'page-head' }, el('div', {}, el('h2', { class: 'page-title' }, 'Map'), el('p', { class: 'page-sub' }, 'Every place in the plan. Tap a pin for details.')), el('div', { class: 'page-actions' }, el('button', { class: 'btn btn-primary btn-sm', type: 'button', onClick: () => editPlace(store, null) }, '+ Add place'))));
  const mapEl = el('div', { class: 'map', id: 'map' });
  root.append(mapEl);
  const legend = el('div', { class: 'map-legend' }, ...Object.entries(KINDS).map(([k, [ico, label]]) => el('span', { class: 'chip' }, `${ico} ${label}`)));
  root.append(legend);

  if (!window.L) {
    mapEl.replaceWith(el('div', { class: 'callout warn' }, el('span', { class: 'ico' }, '🗺️'), el('div', {}, 'The map library did not load. The list below still works.')));
  } else if (places.length) {
    setTimeout(() => {
      const map = L.map(mapEl, { scrollWheelZoom: false });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
      const bounds = [];
      for (const p of places) {
        if (typeof p.lat !== 'number' || typeof p.lng !== 'number') continue;
        const [ico] = KINDS[p.kind] || KINDS.other;
        const icon = L.divIcon({ className: 'pin', html: `<div style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">${ico}</div>`, iconSize: [26, 26], iconAnchor: [13, 24], popupAnchor: [0, -22] });
        const m = L.marker([p.lat, p.lng], { icon }).addTo(map);
        m.bindPopup(`<strong>${esc(p.name)}</strong>${p.notes ? `<br>${linkify(p.notes)}` : ''}<br><a href="https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}" target="_blank" rel="noopener">Open in Google Maps</a>`);
        bounds.push([p.lat, p.lng]);
      }
      if (bounds.length) map.fitBounds(bounds, { padding: [30, 30] });
      else map.setView([36.2, 138.2], 5);
    }, 0);
  } else {
    mapEl.replaceWith(empty('No places yet'));
  }

  root.append(section('Places', el('div', { class: 'row-list' }, ...places.map((p) => { const [ico, label] = KINDS[p.kind] || KINDS.other; return el('div', { class: 'row', onClick: () => editPlace(store, p) }, el('div', { class: 'type-chip', 'aria-hidden': 'true' }, ico), el('div', { class: 'row-main' }, el('div', { class: 'row-title' }, p.name), el('div', { class: 'row-sub' }, [label, p.town, p.notes].filter(Boolean).join(' · '))), el('div', { class: 'row-side' }, el('a', { class: 'small', href: `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`, target: '_blank', rel: 'noopener', onClick: (e) => e.stopPropagation() }, 'Maps ↗'))); }))));
}

function editPlace(store, p) {
  const isNew = !p;
  const v0 = p || { id: uid(), kind: 'other' };
  const fm = form([
    { name: 'name', label: 'Name', value: v0.name || '' },
    { name: 'kind', label: 'Kind', type: 'select', options: Object.entries(KINDS).map(([k, [ico, l]]) => [k, `${ico} ${l}`]), value: v0.kind || 'other', half: true },
    { name: 'town', label: 'Town / area', value: v0.town || '', half: true },
    { name: 'lat', label: 'Latitude', type: 'number', step: 'any', value: v0.lat ?? '', half: true, hint: 'Right-click a spot in Google Maps to copy its coordinates.' },
    { name: 'lng', label: 'Longitude', type: 'number', step: 'any', value: v0.lng ?? '', half: true },
    { name: 'notes', label: 'Notes', type: 'textarea', value: v0.notes || '' },
  ]);
  const actions = [];
  if (!isNew) actions.push({ label: 'Delete', class: 'btn-danger', keepOpen: true, onClick: async () => { if (await confirmDialog('Delete this place?')) { store.update((t) => { t.places = t.places.filter((x) => x.id !== v0.id); }); return true; } return false; } });
  actions.push('spacer', { label: 'Cancel', class: 'btn-ghost' }, { label: 'Save', class: 'btn-primary', onClick: () => { const v = fm.values(); if (!v.name) { toast('Give it a name', { kind: 'error' }); return false; } if (v.lat === null || v.lng === null) { toast('Add coordinates', { kind: 'error' }); return false; } store.update((t) => { t.places ||= []; const i = t.places.findIndex((x) => x.id === v0.id); const next = { ...v0, ...v }; if (i >= 0) t.places[i] = next; else t.places.push(next); }); toast('Saved', { kind: 'ok' }); } });
  sheet({ title: isNew ? 'Add place' : 'Edit place', body: fm.node, actions });
}
