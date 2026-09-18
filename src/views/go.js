// "Go" mode: one full-screen card per stop for using the plan on the move.
// Swipe sideways to move through the day, swipe up (or tap Done) to clear a card.
import { el, fmtDate, fmtDow, fmtDayNum, fmtTime, isoDate, TYPES, sortBy, linkify, activeVariant, dayView, forVariant } from '../util.js';
import { toast } from '../ui.js';

const deckIndex = {}; // remembered card position per day, so re-renders do not jump

// Local time where you will be on that day: airports at each end, Japan in between.
export function localNow(trip, date) {
  let tz = 'Asia/Tokyo';
  if (trip?.meta?.start && date <= trip.meta.start) tz = 'Australia/Sydney';
  else if (trip?.meta?.end && date >= trip.meta.end) tz = 'Australia/Brisbane';
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const g = (t) => parts.find((p) => p.type === t)?.value;
    return { date: `${g('year')}-${g('month')}-${g('day')}`, time: `${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`, tz };
  } catch {
    const d = new Date();
    return { date: isoDate(d), time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, tz: 'local' };
  }
}

// Index of the card to open first: the item happening now, else the next one, else the last.
export function nowIndex(items, hhmm) {
  if (!items.length) return -1;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const start = it.time || '00:00';
    const end = it.endTime || it.time || '23:59';
    if (start <= hhmm && hhmm < end) return i;      // happening now
    if (start > hhmm) return i;                      // next up
  }
  return items.length - 1;
}

const minutesUntil = (hhmm, now) => { const [h1, m1] = hhmm.split(':').map(Number); const [h2, m2] = now.split(':').map(Number); return h1 * 60 + m1 - (h2 * 60 + m2); };

export function directionsUrl(it, place) {
  if (place && typeof place.lat === 'number') return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=transit`;
  const q = [it.location || it.title, 'Japan'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function render(root, { store, params, navigate }) {
  const trip = store.trip;
  const v = activeVariant(trip);
  const days = sortBy(trip.days || [], (d) => d.date).map((d) => dayView(d, v));
  if (!days.length) { root.append(el('div', { class: 'empty' }, el('strong', {}, 'No days yet'), el('span', {}, 'Set the trip dates in Settings.'))); return; }
  const jp = localNow(trip, trip.meta?.start || days[0].date);
  const wanted = params[0] || (days.find((d) => d.date === jp.date)?.date) || days[0].date;
  const day = days.find((d) => d.date === wanted) || days[0];
  const now = localNow(trip, day.date);
  const isToday = now.date === day.date;
  const places = trip.places || [];

  // Day strip
  const strip = el('div', { class: 'day-strip go-strip', role: 'tablist' });
  for (const d of days) {
    strip.append(el('button', { class: `day-chip ${d.date === day.date ? 'active' : ''} ${d.date === jp.date ? 'today' : ''}`, type: 'button', role: 'tab', 'aria-selected': d.date === day.date ? 'true' : 'false', onClick: () => navigate(`go/${d.date}`) },
      el('span', { class: 'dc-dow' }, fmtDow(d.date)), el('span', { class: 'dc-num' }, fmtDayNum(d.date)), el('span', { class: 'dc-base' }, d.base || '')));
  }
  root.append(strip);
  requestAnimationFrame(() => { const c = strip.querySelector('.day-chip.active'); if (c) strip.scrollLeft = c.offsetLeft - strip.clientWidth / 2 + c.clientWidth / 2; });

  // Cards: everything not skipped and not done, in time order; ideas go last.
  const all = sortBy((day.items || []).filter((i) => i.status !== 'skip'), (i) => i.time || '99:99');
  const live = all.filter((i) => !i.done && i.status !== 'idea');
  const ideas = all.filter((i) => !i.done && i.status === 'idea');
  const done = all.filter((i) => i.done);
  const cards = [...live, ...ideas];
  const stay = tonightStay(trip, v, day.date);

  const startIdx = deckIndex[day.date] ?? (isToday ? Math.max(0, nowIndex(live, now.time)) : 0);
  const nowI = isToday ? nowIndex(live, now.time) : -1;
  const nowItem = nowI >= 0 ? live[nowI] : null;

  const head = el('div', { class: 'go-head' },
    el('div', { class: 'go-head-main' },
      el('div', { class: 'go-day' }, `${fmtDate(day.date)} · ${day.title || ''}`),
      el('div', { class: 'go-sub' }, [isToday ? `Now ${fmtTime(now.time)}` : null, day.walk ? `🚶 ${day.walk.split(' (')[0]}` : null, `${cards.length} to go`, done.length ? `${done.length} done` : null].filter(Boolean).join(' · ')),
    ),
    el('button', { class: 'btn btn-sm', type: 'button', onClick: () => navigate(`itinerary/${day.date}`) }, 'Edit in Plan'),
  );
  root.append(head);

  if (nowItem) {
    const mins = minutesUntil(nowItem.time || '00:00', now.time);
    const label = mins > 0 ? `Up next in ${mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`}` : 'Happening now';
    root.append(el('button', { class: 'go-next', type: 'button', onClick: () => goTo(cards.indexOf(nowItem)) }, el('span', { class: 'go-next-label' }, label), el('span', { class: 'go-next-title' }, `${fmtTime(nowItem.time)} ${nowItem.title}`)));
  }

  const deck = el('div', { class: 'go-deck', tabindex: '0', 'aria-label': 'Stops for the day, swipe sideways', onKeydown: (e) => { if (e.key === 'ArrowRight') goTo(current + 1); if (e.key === 'ArrowLeft') goTo(current - 1); } });
  const total = cards.length + (stay ? 1 : 0);
  let current = Math.min(startIdx, Math.max(0, total - 1));
  const goTo = (i) => { i = Math.max(0, Math.min(total - 1, i)); const w = deck.clientWidth || 1; deck.scrollTo({ left: i * w, behavior: 'smooth' }); setCurrent(i); };
  const dots = el('div', { class: 'go-dots', 'aria-hidden': 'true' });
  const counter = el('span', { class: 'go-counter mono' });
  const setCurrent = (i) => { current = i; deckIndex[day.date] = i; counter.textContent = total ? `${i + 1} / ${total}` : '0 / 0'; dots.querySelectorAll('span').forEach((s, k) => s.classList.toggle('active', k === i)); };

  if (!total) deck.append(el('div', { class: 'go-card go-empty' }, el('div', { class: 'go-title' }, done.length ? 'All done for today' : 'Nothing planned'), el('div', { class: 'go-where' }, done.length ? 'Every card is swiped away. Enjoy the evening.' : 'Add stops on the Plan page.')));
  for (const it of cards) deck.append(itemCard(store, day, it, places, nowItem === it, () => { const k = cards.indexOf(it); markDone(store, day, it); if (k >= 0 && k < current) deckIndex[day.date] = Math.max(0, current - 1); }));
  if (stay) deck.append(stayCard(stay));
  for (let i = 0; i < total; i++) dots.append(el('span'));
  root.append(deck);

  const nav = el('div', { class: 'go-nav' },
    el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Previous stop', onClick: () => goTo(current - 1) }, '‹'),
    el('div', { class: 'go-nav-mid' }, counter, dots, el('div', { class: 'go-hint' }, 'Swipe sideways to move on · swipe up or tap Done to clear a card')),
    el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Next stop', onClick: () => goTo(current + 1) }, '›'),
  );
  root.append(nav);

  if (done.length) {
    root.append(el('details', { class: 'go-done go-donelist' }, el('summary', {}, `Done today (${done.length})`),
      el('ul', { class: 'go-done-list' }, ...done.map((it) => el('li', {}, el('span', { class: 'mono muted' }, fmtTime(it.time) || '—'), el('span', {}, `${TYPES[it.type]?.ico || ''} ${it.title}`), el('button', { class: 'btn btn-sm btn-ghost', type: 'button', onClick: () => { store.update((t) => { const d = t.days.find((x) => x.id === day.id); const i = d?.items.find((x) => x.id === it.id); if (i) delete i.done; }); toast('Back on the deck'); } }, 'Undo'))))));
  }
  if (day.notes) root.append(el('details', { class: 'go-done go-daynotes' }, el('summary', {}, 'Notes for the day'), el('div', { class: 'prose small', html: linkify(day.notes) })));

  // Position the deck once it has a width, then keep the counter in step with swipes.
  let scrollTimer = null;
  deck.addEventListener('scroll', () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(() => { const w = deck.clientWidth || 1; setCurrent(Math.round(deck.scrollLeft / w)); }, 80); });
  requestAnimationFrame(() => { const w = deck.clientWidth || 1; deck.scrollLeft = current * w; setCurrent(current); });
}

function itemCard(store, day, it, places, isNow, onDone) {
  const t = TYPES[it.type] || TYPES.note;
  const place = it.placeId && places.find((p) => p.id === it.placeId);
  const card = el('article', { class: `go-card ${isNow ? 'go-now' : ''}`, dataset: { type: it.type || 'note', id: it.id } });
  const doneBtn = el('button', { class: 'btn go-done-btn', type: 'button', onClick: () => leave(card, onDone) }, '✓ Done');
  card.append(
    el('div', { class: 'go-top' },
      el('div', { class: 'go-time display' }, fmtTime(it.time) || '—', it.endTime ? el('span', { class: 'go-end' }, ` → ${fmtTime(it.endTime)}`) : null),
      el('div', { class: 'go-badges' }, isNow ? el('span', { class: 'pill pill-accent' }, 'Now') : null, it.status === 'idea' ? el('span', { class: 'pill pill-idea' }, 'Optional') : null, it.status === 'booked' ? el('span', { class: 'pill pill-booked' }, 'Booked') : null),
    ),
    el('div', { class: 'go-title' }, el('span', { class: 'go-ico', 'aria-hidden': 'true' }, t.ico), ' ', it.title || t.label),
    it.location ? el('div', { class: 'go-where' }, '📍 ', it.location) : null,
    el('div', { class: 'go-notes' }, it.notes ? el('div', { html: linkify(it.notes) }) : el('div', { class: 'muted' }, 'No notes.'), store.vault.itemSecrets?.[it.id] ? el('div', { class: 'go-secret' }, '🔒 ', store.vault.itemSecrets[it.id]) : null),
    el('div', { class: 'go-actions' },
      el('a', { class: 'btn', href: directionsUrl(it, place), target: '_blank', rel: 'noopener' }, '🧭 Directions'),
      it.url ? el('a', { class: 'btn', href: it.url, target: '_blank', rel: 'noopener' }, '🔗 Link') : el('button', { class: 'btn', type: 'button', onClick: () => copy(`${it.title}\n${it.location || ''}`) }, '📋 Copy'),
      doneBtn,
    ),
  );
  swipeUp(card, () => leave(card, onDone));
  return card;
}

function stayCard(s) {
  const q = s.address || `${s.name}, ${s.town || ''}`;
  const card = el('article', { class: 'go-card go-stay', dataset: { type: 'stay' } });
  card.append(
    el('div', { class: 'go-top' }, el('div', { class: 'go-time display' }, 'Tonight'), el('div', { class: 'go-badges' }, s.status === 'booked' ? el('span', { class: 'pill pill-booked' }, 'Booked') : el('span', { class: 'pill pill-planned' }, 'Planned'))),
    el('div', { class: 'go-title' }, '🏨 ', s.name),
    s.address ? el('button', { class: 'go-address', type: 'button', onClick: () => copy(s.address) }, s.address, el('span', { class: 'small muted' }, ' · tap to copy for a taxi')) : null,
    el('div', { class: 'go-notes' }, s.distance ? el('div', {}, '📍 ', s.distance) : null, s.notes ? el('div', { style: { marginTop: '8px' }, html: linkify(s.notes) }) : null),
    el('div', { class: 'go-actions' },
      el('a', { class: 'btn', href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}&travelmode=transit`, target: '_blank', rel: 'noopener' }, '🧭 Directions'),
      s.url ? el('a', { class: 'btn', href: s.url, target: '_blank', rel: 'noopener' }, '🔗 Booking') : null,
    ),
  );
  return card;
}

function tonightStay(trip, v, date) {
  const stays = forVariant(trip.stays, v).filter((s) => s.checkIn && s.checkOut && s.checkIn <= date && date < s.checkOut && ['booked', 'planned'].includes(s.status));
  // If two bookings ever cover the same night, the later check-in is where you actually sleep.
  return sortBy(stays, (s) => `${s.checkIn}`).reverse()[0] || null;
}

function markDone(store, day, it) {
  store.update((t) => { const d = t.days.find((x) => x.id === day.id); const i = d?.items.find((x) => x.id === it.id); if (i) i.done = true; });
}

function leave(card, cb) {
  if (card.classList.contains('leaving')) return;
  card.classList.add('leaving');
  setTimeout(cb, 260);
}

// Swipe up on a card to mark it done. Horizontal movement is left to the scroll-snap deck.
function swipeUp(card, onSwipe) {
  let start = null;
  card.addEventListener('pointerdown', (e) => { if (e.target.closest('.go-notes, a, button')) { start = null; return; } start = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
  card.addEventListener('pointermove', (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (dy < 0 && Math.abs(dy) > Math.abs(dx)) card.style.transform = `translateY(${Math.max(dy, -160)}px)`;
  });
  const end = (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    start = null;
    card.style.transform = '';
    if (dy < -90 && Math.abs(dy) > Math.abs(dx) * 1.2) onSwipe();
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', () => { start = null; card.style.transform = ''; });
}

function copy(text) {
  try { navigator.clipboard?.writeText(text); toast('Copied', { kind: 'ok' }); } catch { toast('Could not copy', { kind: 'error' }); }
}
