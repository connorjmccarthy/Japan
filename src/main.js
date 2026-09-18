import { store } from './store.js';
import { el, fmtDate, activeVariant, variantList } from './util.js';
import { toast } from './ui.js';
import * as overview from './views/overview.js';
import * as itinerary from './views/itinerary.js';
import * as go from './views/go.js';
import * as flights from './views/flights.js';
import * as stays from './views/stays.js';
import * as food from './views/food.js';
import * as budget from './views/budget.js';
import * as checklist from './views/checklist.js';
import * as map from './views/map.js';
import * as vault from './views/vault.js';
import * as settings from './views/settings.js';
import * as decisions from './views/decisions.js';

const VIEWS = {
  overview: { mod: overview, label: 'Overview', ico: '🏔️', tab: true },
  itinerary: { mod: itinerary, label: 'Plan', ico: '📅', tab: true },
  go: { mod: go, label: 'Go', ico: '🧳', tab: true },
  flights: { mod: flights, label: 'Flights', ico: '✈️' },
  stays: { mod: stays, label: 'Stays', ico: '🏨' },
  food: { mod: food, label: 'Food', ico: '🍜' },
  budget: { mod: budget, label: 'Budget', ico: '💰', money: true },
  checklist: { mod: checklist, label: 'Checklists', ico: '✅', tab: true },
  map: { mod: map, label: 'Map', ico: '🗺️' },
  decisions: { mod: decisions, label: 'Decisions', ico: '🧭' },
  vault: { mod: vault, label: 'Private vault', ico: '🔒', sep: true },
  settings: { mod: settings, label: 'Settings & guide', ico: '⚙️' },
};

const $ = (id) => document.getElementById(id);
let current = { id: null, params: [] };

export function navigate(path) { location.hash = `#/${path}`; }

// Views marked `money` only exist while the budget is switched on.
const viewAllowed = (v) => !v.money || store.showMoney;

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [id, ...params] = h.split('/').filter(Boolean);
  const ok = VIEWS[id] && viewAllowed(VIEWS[id]);
  return { id: ok ? id : 'overview', params: ok ? params.map(decodeURIComponent) : [] };
}

function applyTheme() {
  const t = store.settings.theme || 'system';
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

function buildNav() {
  const list = $('nav-list');
  list.innerHTML = '';
  for (const [id, v] of Object.entries(VIEWS)) {
    if (!viewAllowed(v)) continue;
    if (v.sep) list.append(el('li', { class: 'nav-sep', role: 'presentation' }));
    list.append(el('li', {}, el('button', { class: 'nav-link', type: 'button', dataset: { view: id }, onClick: () => { navigate(id); closeSidebar(); } }, el('span', { class: 'nav-ico', 'aria-hidden': 'true' }, v.ico), el('span', {}, v.label))));
  }
  const tabs = $('tabbar');
  tabs.innerHTML = '';
  for (const [id, v] of Object.entries(VIEWS)) {
    if (!v.tab || !viewAllowed(v)) continue;
    tabs.append(el('button', { class: 'tab', type: 'button', dataset: { view: id }, onClick: () => navigate(id) }, el('span', { class: 'tab-ico', 'aria-hidden': 'true' }, v.ico), el('span', {}, v.label)));
  }
  tabs.append(el('button', { class: 'tab', type: 'button', dataset: { view: 'more' }, onClick: () => openSidebar() }, el('span', { class: 'tab-ico', 'aria-hidden': 'true' }, '☰'), el('span', {}, 'More')));
}

// The sidebar's trip picker. Hidden when only one trip is published.
function renderTripSwitch() {
  const host = $('trip-switch');
  if (!host) return;
  host.innerHTML = '';
  const list = store.visibleTrips();
  if (list.length < 2) { host.hidden = true; return; }
  host.hidden = false;
  const seg = el('div', { class: 'seg seg-block', role: 'group', 'aria-label': 'Trip' });
  for (const t of list) {
    seg.append(el('button', {
      type: 'button', class: t.id === store.tripId ? 'active' : '', dataset: { trip: t.id },
      onClick: () => store.switchTrip(t.id),
    }, `${t.ico ? t.ico + ' ' : ''}${t.short || t.name}`));
  }
  host.append(el('div', { class: 'variant-label' }, 'Trip'), seg);
}

function renderBrand() {
  const rec = store.tripRecord || {};
  const mark = $('brand-mark'); if (mark) mark.textContent = rec.mark || rec.ico || '•';
  const title = $('brand-title'); if (title) title.textContent = rec.name || 'Trip';
}

function renderVariantSwitch(trip) {
  const host = $('variant-switch');
  if (!host) return;
  const list = variantList(trip);
  host.innerHTML = '';
  if (list.length < 2) { host.hidden = true; return; }
  host.hidden = false;
  const seg = el('div', { class: 'seg seg-block', role: 'group', 'aria-label': 'Plan variant' });
  for (const v of list) seg.append(el('button', { type: 'button', class: v.id === activeVariant(trip) ? 'active' : '', dataset: { variant: v.id }, onClick: () => { if (activeVariant(store.trip) !== v.id) store.update((t) => { t.variants.active = v.id; }); closeSidebar(); } }, v.short || v.name));
  host.append(el('div', { class: 'variant-label' }, 'Plan'), seg);
}

function openSidebar() { $('sidebar').classList.add('open'); $('scrim').hidden = false; $('menu-btn').setAttribute('aria-expanded', 'true'); }
function closeSidebar() { $('sidebar').classList.remove('open'); $('scrim').hidden = true; $('menu-btn').setAttribute('aria-expanded', 'false'); }

function markActive(id) {
  document.querySelectorAll('[data-view]').forEach((n) => n.classList.toggle('active', n.dataset.view === id));
}

function render() {
  const { id, params } = parseHash();
  const view = VIEWS[id];
  const main = $('main');
  const sameView = current.id === id && current.params.join('/') === params.join('/');
  const scrollY = sameView ? window.scrollY : 0;
  current = { id, params };
  main.innerHTML = '';
  $('topbar-heading').textContent = view.label;
  document.title = `${view.label} · ${store.trip?.meta?.title || store.tripRecord?.name || 'Trip'}`;
  markActive(id);
  try {
    view.mod.render(main, { store, params, navigate });
  } catch (e) {
    console.error(e);
    main.append(el('div', { class: 'callout danger' }, el('span', { class: 'ico' }, '⚠️'), el('div', {}, el('strong', {}, 'This section hit an error. '), String(e.message || e))));
  }
  if (sameView) window.scrollTo(0, scrollY); else window.scrollTo(0, 0);
}

function renderSync(status) {
  const pill = $('sync-pill');
  const map = { loading: 'pending', local: 'local', pending: 'pending', synced: 'synced', error: 'error', conflict: 'error' };
  pill.dataset.state = map[status.state] || 'local';
  pill.querySelector('.sync-text').textContent = { loading: 'Loading', local: 'On device', pending: 'Syncing', synced: 'Synced', error: 'Sync error', conflict: 'Conflict' }[status.state] || status.state;
  pill.title = status.message || '';
  $('sidebar-sync').textContent = status.message || '';
}

function registerSw() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), { scope: new URL('../', import.meta.url).pathname }).then((reg) => {
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w && w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) toast('A new version is ready.', { action: 'Reload', onAction: () => location.reload(), ms: 8000 });
      });
    });
  }).catch(() => {});
}

async function boot() {
  applyTheme();
  buildNav();
  renderTripSwitch();
  renderBrand();
  $('menu-btn').addEventListener('click', () => ($('sidebar').classList.contains('open') ? closeSidebar() : openSidebar()));
  $('scrim').addEventListener('click', closeSidebar);
  $('sync-pill').addEventListener('click', () => navigate('settings'));
  $('sidebar-sync-btn').addEventListener('click', async () => {
    if (!store.settings.token) { navigate('settings'); closeSidebar(); return; }
    try { const r = await store.pull(); if (r?.conflict) toast('GitHub has a newer version. Open Settings to choose.', { kind: 'error' }); else toast('Synced', { kind: 'ok' }); }
    catch (e) { toast(e.message, { kind: 'error' }); }
  });
  window.addEventListener('hashchange', render);
  // The two sharing switches change what the menu holds, so rebuild it when they move.
  let lastChrome = `${store.settings.showBudget}|${store.settings.showAllTrips}`;
  let lastStatus = null;
  store.subscribe((trip, status) => {
    if (status !== lastStatus) { lastStatus = status; renderSync(status); if (status.state === 'conflict') toast('GitHub has a newer version of the plan.', { action: 'Resolve', onAction: () => navigate('settings'), ms: 10000 }); if (status.state === 'error') toast(status.message, { kind: 'error', ms: 6000 }); }
    const chrome = `${store.settings.showBudget}|${store.settings.showAllTrips}`;
    if (chrome !== lastChrome) { lastChrome = chrome; buildNav(); renderTripSwitch(); markActive(current.id); }
    if (trip?.meta) {
      const name = trip.meta.title || store.tripRecord?.name || 'Trip';
      $('brand-dates').textContent = `${fmtDate(trip.meta.start)} to ${fmtDate(trip.meta.end)}`;
      const v = variantList(trip).find((x) => x.id === activeVariant(trip));
      $('topbar-kicker').textContent = v ? `${name} · ${v.short || v.name}` : name;
      renderVariantSwitch(trip);
    }
  });
  await store.init();
  renderTripSwitch();
  renderBrand();
  render();
  // Re-render the current view when data changes (e.g. after a sync pulls new data).
  let renderTimer = null;
  store.subscribe(() => { clearTimeout(renderTimer); renderTimer = setTimeout(() => { if (!document.querySelector('.sheet-backdrop')) render(); }, 30); });
  registerSw();
}

boot();
