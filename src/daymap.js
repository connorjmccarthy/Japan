import { el, esc, fmtTime, sortBy } from './util.js';

const KIND_ICON = { airport: '✈️', station: '🚉', town: '🏘️', resort: '⛷️', hotel: '🏨', park: '🎡', food: '🍜', other: '📍' };
const KEY = 'jp27:daymap-open';

// A collapsible map of the day's pinned places, numbered in time order, for the Plan page.
export function dayMap(store, day, items, navigate) {
  const places = store.trip.places || [];
  const stops = [];
  for (const it of sortBy(items, (i) => i.time || '99:99')) {
    if (!it.placeId || it.status === 'skip') continue;
    const p = places.find((x) => x.id === it.placeId);
    if (!p || typeof p.lat !== 'number') continue;
    let stop = stops.find((s) => s.place.id === p.id && stops[stops.length - 1] === s);
    if (!stop) { stop = { place: p, items: [] }; stops.push(stop); }
    stop.items.push(it);
  }
  let open = true;
  try { open = localStorage.getItem(KEY) !== '0'; } catch {}
  const wrap = el('div', { class: 'daymap card', style: { padding: '0', overflow: 'hidden', marginBottom: '12px' } });
  const head = el('button', { type: 'button', class: 'daymap-head', 'aria-expanded': open ? 'true' : 'false', onClick: () => { open = !open; body.hidden = !open; head.setAttribute('aria-expanded', open ? 'true' : 'false'); chevron.textContent = open ? '−' : '+'; try { localStorage.setItem(KEY, open ? '1' : '0'); } catch {} if (open && !built) build(); } },
    el('span', {}, `🗺️ Map of the day`), el('span', { class: 'muted small' }, stops.length ? `${stops.length} ${stops.length === 1 ? 'stop' : 'stops'}` : 'no pins yet'));
  const chevron = el('span', { class: 'muted', 'aria-hidden': 'true' }, open ? '−' : '+');
  head.append(chevron);
  const body = el('div', { hidden: !open });
  wrap.append(head, body);
  let built = false;
  const build = () => {
    built = true;
    if (!stops.length) { body.append(el('p', { class: 'small muted', style: { padding: '10px 14px' } }, 'Tap an item, then “Pin on the map”, to put the day on the map.')); return; }
    if (!window.L) { body.append(el('p', { class: 'small muted', style: { padding: '10px 14px' } }, 'Map library not loaded.')); return; }
    const mapEl = el('div', { class: 'daymap-canvas' });
    const legend = el('ol', { class: 'daymap-legend' });
    body.append(mapEl, legend);
    setTimeout(() => {
      const map = L.map(mapEl, { scrollWheelZoom: false, zoomControl: true });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
      const latlngs = [];
      stops.forEach((s, i) => {
        const n = i + 1;
        const icon = L.divIcon({ className: 'pin', html: `<div class="pin-num">${n}</div>`, iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -14] });
        const m = L.marker([s.place.lat, s.place.lng], { icon }).addTo(map);
        m.bindPopup(`<strong>${n}. ${esc(s.place.name)}</strong><br>${s.items.map((it) => `${esc(fmtTime(it.time) || '')} ${esc(it.title)}`).join('<br>')}<br><a href="https://www.google.com/maps/search/?api=1&query=${s.place.lat},${s.place.lng}" target="_blank" rel="noopener">Open in Google Maps</a>`);
        latlngs.push([s.place.lat, s.place.lng]);
        legend.append(el('li', {}, el('button', { type: 'button', class: 'daymap-stop', onClick: () => { map.setView([s.place.lat, s.place.lng], Math.max(map.getZoom(), 12)); m.openPopup(); } }, el('span', { class: 'pin-num small-pin' }, String(n)), el('span', {}, `${KIND_ICON[s.place.kind] || '📍'} ${s.place.name}`), el('span', { class: 'muted small' }, s.items.map((it) => fmtTime(it.time)).filter(Boolean).join(', ')))));
      });
      if (latlngs.length > 1) L.polyline(latlngs, { color: '#c8412f', weight: 3, opacity: 0.7, dashArray: '6 6' }).addTo(map);
      if (latlngs.length > 1) map.fitBounds(latlngs, { padding: [28, 28], maxZoom: 13 }); else map.setView(latlngs[0], 12);
    }, 0);
  };
  if (open) build();
  return wrap;
}
