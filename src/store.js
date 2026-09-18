import { clone, debounce, tripHas } from './util.js';
import { getFile, putFile } from './github.js';
import { encryptJson, decryptJson } from './crypto.js';

// The app holds more than one trip. Each trip owns its own seed file, its own
// copy in this browser and its own encrypted vault; GitHub details (who you are,
// which repo, your token, the theme) are shared across all of them.
const APP = { tripId: 'app:tripId', trips: 'app:trips', settings: 'app:settings' };
const keysFor = (id) => ({ trip: `t:${id}:trip`, meta: `t:${id}:meta`, vault: `t:${id}:vault` });
const LEGACY = { trip: 'jp27:trip', meta: 'jp27:meta', vault: 'jp27:vault', settings: 'jp27:settings' };
const REGISTRY_URL = new URL('../data/trips.json', import.meta.url).href;
const fileUrl = (path) => new URL(`../${path}`, import.meta.url).href;

const FALLBACK_TRIPS = [{ id: 'japan', name: 'Japan 2027', short: 'Japan', ico: '🗾', mark: '雪', file: 'data/trip.json', vault: 'data/vault.enc' }];

const read = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

// showBudget and showAllTrips are OFF by default because this link gets shared.
// Anyone the link is sent to sees the trips marked shared, and no money at all.
// Turning either on is a per-device choice made in Settings; it changes nothing
// in the repo, so it does not follow the link to anybody else.
const DEFAULT_SETTINGS = { owner: 'connorjmccarthy', repo: 'Trips', branch: 'main', token: '', theme: 'system', autoSync: true, vaultSync: false, vaultPass: '', paths: {}, showBudget: false, showAllTrips: false };

// Pages serves this from https://<user>.github.io/<repo>/, so the repo name is
// sitting in the URL. Reading it there means renaming the repo does not quietly
// break sync on a device that saved the old name.
function detectRepo() {
  try {
    if (!/\.github\.io$/i.test(location.hostname)) return null;
    return location.pathname.split('/').filter(Boolean)[0] || null;
  } catch { return null; }
}

// One-time move from the single-trip layout to the per-trip one. Anything the
// old app saved becomes the Japan trip, so nothing is lost on an existing phone.
function migrateLegacy() {
  try {
    const k = keysFor('japan');
    if (localStorage.getItem(LEGACY.trip) && !localStorage.getItem(k.trip)) {
      localStorage.setItem(k.trip, localStorage.getItem(LEGACY.trip));
      if (localStorage.getItem(LEGACY.meta)) localStorage.setItem(k.meta, localStorage.getItem(LEGACY.meta));
      if (localStorage.getItem(LEGACY.vault)) localStorage.setItem(k.vault, localStorage.getItem(LEGACY.vault));
    }
    if (localStorage.getItem(LEGACY.settings) && !localStorage.getItem(APP.settings)) {
      const old = JSON.parse(localStorage.getItem(LEGACY.settings)) || {};
      const { path, vaultPath, ...rest } = old;
      const next = { ...rest, paths: {} };
      if (path || vaultPath) next.paths.japan = { file: path || 'data/trip.json', vault: vaultPath || 'data/vault.enc' };
      localStorage.setItem(APP.settings, JSON.stringify(next));
    }
  } catch { /* private mode or blocked storage: carry on with defaults */ }
}

class Store {
  constructor() {
    migrateLegacy();
    this.trips = read(APP.trips, FALLBACK_TRIPS);
    const chosen = read(APP.tripId, null);
    this.pickedTrip = !!chosen;            // false until you have actually chosen one
    this.tripId = chosen || this.trips[0]?.id || 'japan';
    this.keys = keysFor(this.tripId);
    this.trip = null;
    this.meta = read(this.keys.meta, { dirty: false, remoteSha: null, lastSyncAt: null, seedUpdatedAt: null, vaultSha: null, vaultDirty: false });
    this.settings = { ...DEFAULT_SETTINGS, ...read(APP.settings, {}) };
    const detected = detectRepo();
    if (detected && this.settings.repo !== detected) { this.settings.repo = detected; write(APP.settings, this.settings); }
    this.vault = read(this.keys.vault, { fields: {}, itemSecrets: {} });
    this.status = { state: 'loading', message: 'Loading' };
    this.listeners = new Set();
    this.pushSoon = debounce(() => this.push().catch(() => {}), 1500);
    this.pushVaultSoon = debounce(() => this.pushVault().catch(() => {}), 1500);
    this.vaultStatus = { state: 'off', message: 'Vault stays on this device' };
    this.storageOk = true;
  }

  // ---- trips ---------------------------------------------------------------
  // A trip is shared unless the registry says otherwise. Anything not shared is
  // invisible until this device turns "show all trips" on in Settings.
  visibleTrips() { return this.settings.showAllTrips ? this.trips : this.trips.filter((x) => x.shared !== false); }
  // A section exists only if the trip asks for it. Money needs the trip to have a
  // budget at all AND this device to have asked to see it.
  tripHas(feature) { return tripHas(this.trip, feature); }
  get showMoney() { return this.settings.showBudget === true && this.tripHas('budget'); }
  get tripRecord() { return this.trips.find((x) => x.id === this.tripId) || this.visibleTrips()[0] || this.trips[0] || FALLBACK_TRIPS[0]; }
  filePath() { return this.settings.paths?.[this.tripId]?.file || this.tripRecord.file || 'data/trip.json'; }
  vaultPath() { return this.settings.paths?.[this.tripId]?.vault || this.tripRecord.vault || 'data/vault.enc'; }
  seedUrl() { return fileUrl(this.tripRecord.file || 'data/trip.json'); }

  switchTrip(id) {
    if (!this.visibleTrips().some((x) => x.id === id) || id === this.tripId) return;
    write(APP.tripId, id);
    this.pickedTrip = true;
    // A full reload is the honest way to swap trips: every view, the vault and
    // the sync state all reset together rather than half-updating.
    location.reload();
  }

  async loadRegistry() {
    try {
      const res = await fetch(`${REGISTRY_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const reg = await res.json();
      if (!Array.isArray(reg.trips) || !reg.trips.length) return;
      this.trips = reg.trips;
      write(APP.trips, this.trips);
      // A device that has never picked a trip follows whatever the registry calls
      // active. A device pointed at a trip it can no longer see (Japan, on a
      // phone that is not yours) gets moved to one it can.
      const visible = this.visibleTrips();
      const unknown = !visible.some((x) => x.id === this.tripId);
      if (unknown || !this.pickedTrip) {
        const active = reg.active && visible.some((x) => x.id === reg.active) ? reg.active : null;
        const next = active || visible[0]?.id || this.trips[0].id;
        if (next === this.tripId) return;
        this.tripId = next;
        this.keys = keysFor(this.tripId);
        this.meta = read(this.keys.meta, { dirty: false, remoteSha: null, lastSyncAt: null, seedUpdatedAt: null, vaultSha: null, vaultDirty: false });
        this.vault = read(this.keys.vault, { fields: {}, itemSecrets: {} });
        write(APP.tripId, this.tripId);
        this.pickedTrip = true;
      }
    } catch { /* offline: the cached registry is fine */ }
  }

  // ---- lifecycle ----------------------------------------------------------
  async init() {
    await this.loadRegistry();
    const local = read(this.keys.trip, null);
    let seed = null;
    try {
      const res = await fetch(`${this.seedUrl()}?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) seed = await res.json();
    } catch { /* offline, fine */ }

    if (local) {
      this.trip = local;
      // A newer published seed replaces an unedited local copy (this is how a fresh
      // version of the plan reaches a device that has never been edited).
      if (seed && this.meta.dirty && seed.meta?.updatedAt && seed.meta.updatedAt > (local.meta?.updatedAt || '')) {
        this.newerSeed = seed;
      }
      if (seed && !this.meta.dirty && seed.meta?.updatedAt && seed.meta.updatedAt > (local.meta?.updatedAt || '')) {
        this.trip = seed;
        this.meta.seedUpdatedAt = seed.meta.updatedAt;
        write(this.keys.trip, this.trip);
        write(this.keys.meta, this.meta);
      }
    } else if (seed) {
      this.trip = seed;
      this.meta.seedUpdatedAt = seed.meta?.updatedAt || null;
      write(this.keys.trip, this.trip);
      write(this.keys.meta, this.meta);
    } else {
      this.trip = emptyTrip(this.tripRecord);
    }
    this.setStatus(this.settings.token ? (this.meta.dirty ? 'pending' : 'synced') : 'local', this.settings.token ? (this.meta.dirty ? 'Changes waiting to sync' : 'Synced with GitHub') : 'Saved on this device');
    this.emit();
    if (this.settings.token && this.settings.autoSync) this.pull({ silent: true }).catch(() => {});
    if (this.vaultSyncReady()) this.pullVault().catch(() => {});
    window.addEventListener('online', () => { if (this.settings.token && this.meta.dirty) this.push().catch(() => {}); });
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const fn of this.listeners) fn(this.trip, this.status); }
  setStatus(state, message) { this.status = { state, message }; for (const fn of this.listeners) fn(this.trip, this.status); }

  // ---- editing ------------------------------------------------------------
  update(mutator, { silent = false } = {}) {
    const next = clone(this.trip);
    mutator(next);
    next.meta = next.meta || {};
    next.meta.updatedAt = new Date().toISOString();
    this.trip = next;
    this.meta.dirty = true;
    const ok = write(this.keys.trip, this.trip) && write(this.keys.meta, this.meta);
    this.storageOk = ok;
    if (!silent) {
      if (this.settings.token && this.settings.autoSync) { this.setStatus('pending', 'Saving to GitHub'); this.pushSoon(); }
      else if (this.settings.token) this.setStatus('pending', 'Changes waiting to sync');
      else this.setStatus('local', ok ? 'Saved on this device' : 'Could not save (storage blocked)');
    }
    this.emit();
  }

  replace(trip, { markClean = false, remoteSha } = {}) {
    this.trip = trip;
    this.meta.dirty = !markClean;
    if (remoteSha !== undefined) this.meta.remoteSha = remoteSha;
    write(this.keys.trip, this.trip); write(this.keys.meta, this.meta);
    this.emit();
  }

  saveSettings(patch) {
    this.settings = { ...this.settings, ...patch };
    write(APP.settings, this.settings);
    if (!this.settings.token) this.setStatus('local', 'Saved on this device');
    this.emit();
  }

  // Per-trip file locations live inside settings so one token can serve many trips.
  savePaths(patch) {
    const paths = { ...(this.settings.paths || {}) };
    paths[this.tripId] = { ...(paths[this.tripId] || {}), ...patch };
    this.saveSettings({ paths });
  }

  // ---- private vault (device-only unless encrypted sync is switched on) ----
  setVault(patch) {
    this.vault = { ...this.vault, ...patch, updatedAt: new Date().toISOString() };
    write(this.keys.vault, this.vault);
    this.meta.vaultDirty = true; write(this.keys.meta, this.meta);
    if (this.vaultSyncReady()) { this.setVaultStatus('pending', 'Encrypting and saving to GitHub'); this.pushVaultSoon(); }
    this.emit();
  }
  vaultSyncReady() { return !!(this.settings.token && this.settings.vaultSync && this.settings.vaultPass); }
  setVaultStatus(state, message) { this.vaultStatus = { state, message }; this.emit(); }
  vaultCfg() { return { ...this.cfg(), path: this.vaultPath() }; }

  async pushVault() {
    if (!this.vaultSyncReady()) return;
    if (!navigator.onLine) { this.setVaultStatus('pending', 'Offline; will sync later'); return; }
    try {
      let currentSha = null, remoteBlob = null;
      try { const r = await getFile(this.vaultCfg()); currentSha = r.sha; remoteBlob = r.data; } catch (e) { if (e.status !== 404) throw e; }
      if (remoteBlob && currentSha !== this.meta.vaultSha) {
        // Another device wrote first: take whichever copy is newer, then continue.
        const remote = await decryptJson(remoteBlob, this.settings.vaultPass);
        if ((remote.updatedAt || '') > (this.vault.updatedAt || '')) { this.vault = remote; write(this.keys.vault, this.vault); }
      }
      const blob = await encryptJson(this.vault, this.settings.vaultPass);
      const res = await putFile({ ...this.vaultCfg(), sha: currentSha || undefined, text: JSON.stringify(blob, null, 2) + '\n', message: 'Update encrypted vault' });
      this.meta.vaultSha = res.sha; this.meta.vaultDirty = false; write(this.keys.meta, this.meta);
      this.setVaultStatus('synced', 'Vault synced (encrypted)');
    } catch (e) { this.setVaultStatus('error', e.message || 'Vault sync failed'); throw e; }
  }

  async pullVault() {
    if (!this.vaultSyncReady()) return { none: true };
    this.setVaultStatus('pending', 'Checking GitHub for the vault');
    let r;
    try { r = await getFile(this.vaultCfg()); } catch (e) { if (e.status === 404) { this.setVaultStatus(this.meta.vaultDirty ? 'pending' : 'synced', 'No vault on GitHub yet'); if (this.meta.vaultDirty) await this.pushVault(); return { none: true }; } this.setVaultStatus('error', e.message); throw e; }
    try {
      const remote = await decryptJson(r.data, this.settings.vaultPass);
      const remoteNewer = (remote.updatedAt || '') > (this.vault.updatedAt || '');
      if (remoteNewer) { this.vault = remote; write(this.keys.vault, this.vault); this.meta.vaultDirty = false; }
      this.meta.vaultSha = r.sha; write(this.keys.meta, this.meta);
      if (!remoteNewer && this.meta.vaultDirty) { await this.pushVault(); return { pushed: true }; }
      this.setVaultStatus('synced', remoteNewer ? 'Vault updated from GitHub' : 'Vault synced (encrypted)');
      this.emit();
      return { adopted: remoteNewer };
    } catch (e) { this.setVaultStatus('error', e.message); throw e; }
  }
  setItemSecret(itemId, text) {
    const itemSecrets = { ...this.vault.itemSecrets };
    if (text) itemSecrets[itemId] = text; else delete itemSecrets[itemId];
    this.setVault({ itemSecrets });
  }

  // ---- GitHub sync ---------------------------------------------------------
  cfg() { const { owner, repo, branch, token } = this.settings; return { owner, repo, branch, path: this.filePath(), token }; }

  async pull({ silent = false, force = false } = {}) {
    if (!this.settings.token) throw new Error('No GitHub token configured');
    this.setStatus('pending', 'Checking GitHub');
    const remote = await getFile(this.cfg());
    const changedRemotely = remote.sha !== this.meta.remoteSha;
    if (force || !this.meta.dirty) {
      if (changedRemotely || force) {
        this.replace(remote.data, { markClean: true, remoteSha: remote.sha });
      } else {
        this.meta.dirty = false; write(this.keys.meta, this.meta);
      }
      this.meta.lastSyncAt = new Date().toISOString(); write(this.keys.meta, this.meta);
      this.setStatus('synced', 'Synced with GitHub');
      return { adopted: changedRemotely || force };
    }
    // Local edits exist.
    if (changedRemotely && this.meta.remoteSha) {
      this.setStatus('conflict', 'GitHub has a newer version. Resolve in Settings.');
      this.conflict = { remote };
      return { conflict: true, remote };
    }
    // First sync on this device with local edits: never assume ours is newer.
    if (!this.meta.remoteSha && this.differsFrom(remote.data)) {
      this.conflict = { remote };
      this.setStatus('conflict', 'GitHub already has a different version. Choose one in Settings.');
      return { conflict: true, remote };
    }
    if (!this.meta.remoteSha) this.meta.remoteSha = remote.sha;
    if (!silent || this.settings.autoSync) await this.push();
    return { pushed: true };
  }

  async push() {
    if (!this.settings.token) throw new Error('No GitHub token configured');
    if (!navigator.onLine) { this.setStatus('pending', 'Offline. Will sync when back online'); return; }
    this.setStatus('pending', 'Saving to GitHub');
    try {
      // Fetch the current sha so we never blindly overwrite another device's edit.
      let currentSha = null;
      try { currentSha = (await getFile(this.cfg())).sha; } catch (e) { if (e.status !== 404) throw e; }
      if (currentSha && this.meta.remoteSha && currentSha !== this.meta.remoteSha) {
        const remote = await getFile(this.cfg());
        this.conflict = { remote };
        this.setStatus('conflict', 'GitHub has a newer version. Resolve in Settings.');
        return { conflict: true };
      }
      if (currentSha && !this.meta.remoteSha) {
        // Never synced from this device: refuse to overwrite a version we have not seen.
        const remote = await getFile(this.cfg());
        if (this.differsFrom(remote.data)) {
          this.conflict = { remote };
          this.setStatus('conflict', 'GitHub already has a different version. Choose one in Settings.');
          return { conflict: true };
        }
      }
      const text = JSON.stringify(this.trip, null, 2) + '\n';
      const res = await putFile({ ...this.cfg(), sha: currentSha || undefined, text, message: `Update ${this.tripRecord.short || this.tripId} plan (${new Date().toISOString().slice(0, 16).replace('T', ' ')})` });
      this.meta.remoteSha = res.sha; this.meta.dirty = false; this.meta.lastSyncAt = new Date().toISOString();
      write(this.keys.meta, this.meta);
      this.conflict = null;
      this.setStatus('synced', 'Synced with GitHub');
      return { ok: true };
    } catch (e) {
      this.setStatus('error', e.message || 'Sync failed');
      throw e;
    }
  }

  // True when the remote plan is not simply an older copy of what this device has.
  differsFrom(remoteTrip) {
    const a = JSON.stringify({ ...this.trip, meta: { ...this.trip.meta, updatedAt: null } });
    const b = JSON.stringify({ ...remoteTrip, meta: { ...(remoteTrip.meta || {}), updatedAt: null } });
    return a !== b;
  }

  resolveConflict(choice) {
    if (!this.conflict) return;
    if (choice === 'remote') {
      this.replace(this.conflict.remote.data, { markClean: true, remoteSha: this.conflict.remote.sha });
      this.conflict = null;
      this.setStatus('synced', 'Using the GitHub version');
    } else {
      this.meta.remoteSha = this.conflict.remote.sha; write(this.keys.meta, this.meta);
      this.conflict = null;
      return this.push();
    }
  }

  async resetToSeed() {
    const res = await fetch(`${this.seedUrl()}?t=${Date.now()}`, { cache: 'no-store' });
    const seed = await res.json();
    this.replace(seed, { markClean: !this.settings.token });
    this.setStatus(this.settings.token ? 'pending' : 'local', this.settings.token ? 'Changes waiting to sync' : 'Reset to published plan');
    if (this.settings.token && this.settings.autoSync) this.pushSoon();
  }

  exportJson() { return JSON.stringify(this.trip, null, 2); }
  importJson(text) {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || !Array.isArray(data.days)) throw new Error('That file does not look like a trip plan.');
    this.update((t) => { Object.keys(t).forEach((k) => delete t[k]); Object.assign(t, data); });
  }
}

export function emptyTrip(record = {}) {
  return {
    meta: { title: record.name || 'New trip', start: record.start || '', end: record.end || '', homeCurrency: 'AUD', rates: {}, updatedAt: new Date().toISOString() },
    days: [], flights: { confirmed: [], options: [] }, points: {}, people: [], stays: [], food: [], budget: [], checklist: [], places: [], questions: [], notes: [],
  };
}

export const store = new Store();
