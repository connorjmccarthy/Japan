import { clone, debounce } from './util.js';
import { getFile, putFile } from './github.js';

const KEYS = { trip: 'jp27:trip', meta: 'jp27:meta', vault: 'jp27:vault', settings: 'jp27:settings' };
const SEED_URL = new URL('../data/trip.json', import.meta.url).href;

const read = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

const DEFAULT_SETTINGS = { owner: 'connorjmccarthy', repo: 'Japan', branch: 'main', path: 'data/trip.json', token: '', theme: 'system', autoSync: true };

class Store {
  constructor() {
    this.trip = null;
    this.meta = read(KEYS.meta, { dirty: false, remoteSha: null, lastSyncAt: null, seedUpdatedAt: null });
    this.settings = { ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) };
    this.vault = read(KEYS.vault, { fields: {}, itemSecrets: {} });
    this.status = { state: 'loading', message: 'Loading' };
    this.listeners = new Set();
    this.pushSoon = debounce(() => this.push().catch(() => {}), 1500);
    this.storageOk = true;
  }

  // ---- lifecycle ----------------------------------------------------------
  async init() {
    const local = read(KEYS.trip, null);
    let seed = null;
    try {
      const res = await fetch(`${SEED_URL}?t=${Date.now()}`, { cache: 'no-store' });
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
        write(KEYS.trip, this.trip);
        write(KEYS.meta, this.meta);
      }
    } else if (seed) {
      this.trip = seed;
      this.meta.seedUpdatedAt = seed.meta?.updatedAt || null;
      write(KEYS.trip, this.trip);
      write(KEYS.meta, this.meta);
    } else {
      this.trip = emptyTrip();
    }
    this.setStatus(this.settings.token ? (this.meta.dirty ? 'pending' : 'synced') : 'local', this.settings.token ? (this.meta.dirty ? 'Changes waiting to sync' : 'Synced with GitHub') : 'Saved on this device');
    this.emit();
    if (this.settings.token && this.settings.autoSync) this.pull({ silent: true }).catch(() => {});
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
    const ok = write(KEYS.trip, this.trip) && write(KEYS.meta, this.meta);
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
    write(KEYS.trip, this.trip); write(KEYS.meta, this.meta);
    this.emit();
  }

  saveSettings(patch) {
    this.settings = { ...this.settings, ...patch };
    write(KEYS.settings, this.settings);
    if (!this.settings.token) this.setStatus('local', 'Saved on this device');
    this.emit();
  }

  // ---- private vault (never leaves this device) ---------------------------
  setVault(patch) { this.vault = { ...this.vault, ...patch }; write(KEYS.vault, this.vault); this.emit(); }
  setItemSecret(itemId, text) {
    const itemSecrets = { ...this.vault.itemSecrets };
    if (text) itemSecrets[itemId] = text; else delete itemSecrets[itemId];
    this.setVault({ itemSecrets });
  }

  // ---- GitHub sync ---------------------------------------------------------
  cfg() { const { owner, repo, branch, path, token } = this.settings; return { owner, repo, branch, path, token }; }

  async pull({ silent = false, force = false } = {}) {
    if (!this.settings.token) throw new Error('No GitHub token configured');
    this.setStatus('pending', 'Checking GitHub');
    const remote = await getFile(this.cfg());
    const changedRemotely = remote.sha !== this.meta.remoteSha;
    if (force || !this.meta.dirty) {
      if (changedRemotely || force) {
        this.replace(remote.data, { markClean: true, remoteSha: remote.sha });
      } else {
        this.meta.dirty = false; write(KEYS.meta, this.meta);
      }
      this.meta.lastSyncAt = new Date().toISOString(); write(KEYS.meta, this.meta);
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
      const res = await putFile({ ...this.cfg(), sha: currentSha || undefined, text, message: `Update trip plan (${new Date().toISOString().slice(0, 16).replace('T', ' ')})` });
      this.meta.remoteSha = res.sha; this.meta.dirty = false; this.meta.lastSyncAt = new Date().toISOString();
      write(KEYS.meta, this.meta);
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
      this.meta.remoteSha = this.conflict.remote.sha; write(KEYS.meta, this.meta);
      this.conflict = null;
      return this.push();
    }
  }

  async resetToSeed() {
    const res = await fetch(`${SEED_URL}?t=${Date.now()}`, { cache: 'no-store' });
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

export function emptyTrip() {
  return {
    meta: { title: 'Japan 2027', start: '2027-02-08', end: '2027-02-16', homeCurrency: 'AUD', jpyPerAud: 100, updatedAt: new Date().toISOString() },
    days: [], flights: { confirmed: [], options: [] }, points: {}, stays: [], food: [], budget: [], checklist: [], places: [], questions: [], notes: [],
  };
}

export const store = new Store();
