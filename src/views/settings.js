import { el, fmtDate } from '../util.js';
import { form, toast, confirmDialog, section, sheet } from '../ui.js';
import { checkToken } from '../github.js';
import { ensureDays } from './itinerary.js';
import { buildIcs } from '../ics.js';

export function render(root, { store, navigate }) {
  const s = store.settings;
  const t = store.trip;
  root.append(el('div', { class: 'page-head' }, el('div', {}, el('h2', { class: 'page-title' }, 'Settings & guide'), el('p', { class: 'page-sub' }, 'Sync, appearance, trip dates, backups, and how this thing works.'))));

  // Sync status + conflict
  const st = store.status;
  const statusCard = el('div', { class: `card ${st.state === 'error' || st.state === 'conflict' ? 'warn' : st.state === 'synced' ? 'info' : 'soft'}` },
    el('div', { class: 'card-title' }, { local: 'Saved on this device only', pending: 'Syncing…', synced: 'Synced with GitHub', error: 'Sync problem', conflict: 'Two versions exist', loading: 'Loading' }[st.state] || st.state),
    el('p', { class: 'small', style: { marginTop: '4px' } }, st.message || ''),
    store.meta.lastSyncAt ? el('p', { class: 'small muted' }, `Last sync ${new Date(store.meta.lastSyncAt).toLocaleString('en-AU')}`) : null,
  );
  if (st.state === 'conflict' && store.conflict) {
    statusCard.append(el('p', { class: 'small', style: { marginTop: '10px' } }, 'The copy on GitHub changed since this device last synced (probably edited on your other device). Pick which one to keep.'),
      el('div', { class: 'btn-row', style: { marginTop: '10px' } },
        el('button', { class: 'btn btn-primary', type: 'button', onClick: () => { store.resolveConflict('remote'); toast('Using the GitHub version', { kind: 'ok' }); } }, 'Use GitHub version'),
        el('button', { class: 'btn', type: 'button', onClick: async () => { try { await store.resolveConflict('local'); toast('Your version was pushed', { kind: 'ok' }); } catch (e) { toast(e.message, { kind: 'error' }); } } }, 'Keep this device’s version')));
  }
  root.append(statusCard);

  // Sync settings
  const fm = form([
    { name: 'token', label: 'GitHub token', type: 'password', value: s.token || '', hint: 'A fine-grained personal access token with "Contents: read and write" on this one repo. See the guide below.' },
    { name: 'owner', label: 'Repo owner', value: s.owner, half: true },
    { name: 'repo', label: 'Repo name', value: s.repo, half: true },
    { name: 'branch', label: 'Branch', value: s.branch, half: true },
    { name: 'path', label: 'Data file', value: s.path, half: true },
    { name: 'autoSync', label: 'Sync automatically after every edit', type: 'checkbox', value: s.autoSync !== false },
  ]);
  root.append(section('GitHub sync', el('div', { class: 'card' }, fm.node, el('div', { class: 'btn-row', style: { marginTop: '14px' } },
    el('button', { class: 'btn btn-primary', type: 'button', onClick: async () => {
      const v = fm.values(); store.saveSettings(v);
      if (!v.token) { toast('Saved. Sync is off without a token.'); return; }
      try { const r = await checkToken({ owner: v.owner, repo: v.repo, token: v.token }); if (!r.canPush) { toast('Token can read but not write this repo', { kind: 'error', ms: 6000 }); return; } toast(`Connected to ${v.owner}/${v.repo}${r.private ? ' (private)' : ' (public repo!)'}`, { kind: 'ok', ms: 5000 }); const p = await store.pull(); if (p?.conflict) toast('GitHub has a different version. Resolve above.', { kind: 'error', ms: 6000 }); } catch (e) { toast(e.message, { kind: 'error', ms: 7000 }); }
    } }, 'Save & test'),
    el('button', { class: 'btn', type: 'button', onClick: async () => { if (!store.settings.token) { toast('Add a token first'); return; } try { const r = await store.pull({ force: true }); toast(r.adopted ? 'Loaded the GitHub version' : 'Already up to date', { kind: 'ok' }); } catch (e) { toast(e.message, { kind: 'error' }); } } }, 'Pull from GitHub'),
    el('button', { class: 'btn', type: 'button', onClick: async () => { if (!store.settings.token) { toast('Add a token first'); return; } try { const r = await store.push(); toast(r?.conflict ? 'Conflict: choose a version above' : 'Pushed', { kind: r?.conflict ? 'error' : 'ok' }); } catch (e) { toast(e.message, { kind: 'error' }); } } }, 'Push now'),
  ))));

  // Appearance and trip
  const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Theme' });
  for (const [k, l] of [['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']]) seg.append(el('button', { type: 'button', class: (s.theme || 'system') === k ? 'active' : '', onClick: () => { store.saveSettings({ theme: k }); if (k === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', k); seg.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.textContent === l)); } }, l));
  const tripForm = form([
    { name: 'title', label: 'Trip name', value: t.meta.title || '' },
    { name: 'start', label: 'First day', type: 'date', value: t.meta.start, half: true },
    { name: 'end', label: 'Last day', type: 'date', value: t.meta.end, half: true },
  ]);
  root.append(section('Appearance & trip', el('div', { class: 'card' }, el('div', { class: 'field' }, el('label', {}, 'Theme'), seg), el('div', { class: 'hr' }), tripForm.node, el('div', { class: 'btn-row', style: { marginTop: '12px' } }, el('button', { class: 'btn', type: 'button', onClick: () => { const v = tripForm.values(); if (!v.start || !v.end || v.end < v.start) { toast('Check the dates', { kind: 'error' }); return; } store.update((x) => { x.meta.title = v.title; x.meta.start = v.start; x.meta.end = v.end; }); ensureDays(store); toast('Saved', { kind: 'ok' }); } }, 'Save trip details')))));

  // Data
  const ta = el('textarea', { style: { width: '100%', minHeight: '110px', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-strong)', background: 'var(--bg-elev)', fontSize: '12px', fontFamily: 'ui-monospace, monospace' }, 'aria-label': 'Plan JSON' });
  root.append(section('Backup & restore', el('div', { class: 'card' },
    el('p', { class: 'small muted', style: { marginBottom: '10px' } }, 'Export gives you the whole plan as text (this is exactly what gets saved to GitHub). Import replaces the plan on this device with what you paste. Reset goes back to the version published with the app.'),
    ta,
    el('div', { class: 'btn-row', style: { marginTop: '10px' } },
      el('button', { class: 'btn', type: 'button', onClick: async () => { ta.value = store.exportJson(); try { await navigator.clipboard.writeText(ta.value); toast('Copied', { kind: 'ok' }); } catch { toast('Select the text and copy it'); } } }, 'Export'),
      el('button', { class: 'btn', type: 'button', onClick: async () => { if (!ta.value.trim()) { toast('Paste a plan first'); return; } if (await confirmDialog('Replace the plan on this device with the pasted one?', { okLabel: 'Replace', danger: false })) { try { store.importJson(ta.value); toast('Imported', { kind: 'ok' }); } catch (e) { toast(e.message, { kind: 'error' }); } } } }, 'Import'),
      el('button', { class: 'btn btn-danger', type: 'button', onClick: async () => { if (await confirmDialog('Throw away every edit on this device and reload the published plan?', { okLabel: 'Reset' })) { await store.resetToSeed(); toast('Reset', { kind: 'ok' }); } } }, 'Reset to published plan'),
    ))));

  // Calendar export
  root.append(section('Calendar', el('div', { class: 'card' },
    el('p', { class: 'small muted', style: { marginBottom: '10px' } }, 'Download the day-by-day plan as a calendar file. Open it on your phone and it imports into Google Calendar or Apple Calendar as one event per item (times are local to where you are that day). Re-import after big changes; events keep the same IDs so they update rather than duplicate.'),
    el('div', { class: 'btn-row' }, el('button', { class: 'btn', type: 'button', onClick: () => { const blob = new Blob([buildIcs(store.trip)], { type: 'text/calendar' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'japan-2027.ics'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Calendar file downloaded', { kind: 'ok' }); } }, 'Download calendar (.ics)')),
  )));

  // Guide
  root.append(section('Guide', ...GUIDE.map((g) => el('details', { class: 'acc' }, el('summary', {}, g.title), el('div', { class: 'acc-body prose', html: g.body })))));
  root.append(el('p', { class: 'small muted', style: { marginTop: '18px' } }, `Plan last edited ${t.meta.updatedAt ? new Date(t.meta.updatedAt).toLocaleString('en-AU') : 'never'}.`));
}

const GUIDE = [
  { title: 'Put it on your phone like an app', body: `<p>Open the site in Safari (iPhone) or Chrome (Android), tap Share, then <strong>Add to Home Screen</strong>. It opens full-screen, works offline once loaded, and keeps your edits on the phone.</p>` },
  { title: 'How your edits are saved (plain English)', body: `<p>Every change is saved instantly in the browser on the device you are using. That is the "On device" state in the top-right pill.</p><p>If you also add a GitHub token, each change is written to the file <code>data/trip.json</code> in your GitHub repo a second or so later. Your other device pulls that file the next time it opens the app. GitHub is acting as a tiny shared notebook between phone and computer, and every save is a commit you can look back on.</p><p>The technical version: the app is static HTML/JS on GitHub Pages; the data layer is <code>localStorage</code> plus the GitHub Contents API, with a sha check so two devices never silently overwrite each other.</p>` },
  { title: 'Set up sync between phone and computer (5 minutes, once)', body: `<ol><li>On GitHub, go to <strong>Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token</strong>.</li><li>Name it "Japan trip app". Set an expiry after the trip (e.g. March 2027).</li><li>Repository access: <strong>Only select repositories</strong> → pick <code>Japan</code>.</li><li>Permissions → Repository permissions → <strong>Contents: Read and write</strong>. Nothing else.</li><li>Generate, copy the token, paste it into the GitHub sync box above on each device, press <strong>Save &amp; test</strong>.</li></ol><p>The token is stored only in that device's browser. If it leaks, delete it on GitHub and make a new one; it can only touch this one repo's files.</p>` },
  { title: 'What never leaves your device', body: `<p>The <strong>Private vault</strong> page and every "Private note" field (booking references, ticket numbers, passport) are stored only in the browser and are never written to GitHub. This matters because the repo is public. If you make the repo private one day, the same rule still applies; use Export on the vault page to move it to another device.</p>` },
  { title: 'What each page is for', body: `<ul><li><strong>Overview</strong>: countdown, the shape of the trip, and anything needing attention.</li><li><strong>Plan</strong>: the day-by-day timeline. Tap a day, tap a card to edit, + to add.</li><li><strong>Flights &amp; points</strong>: confirmed tickets, the legs still to book with options side by side, and the points maths.</li><li><strong>Stays</strong>: hotel shortlist per town. Mark one as Planned or Booked and it flows into the budget.</li><li><strong>Food</strong>: local things to eat, tick them off.</li><li><strong>Budget</strong>: built automatically from the above, plus manual lines.</li><li><strong>Checklists</strong>: to-dos with dates, grouped.</li><li><strong>Map</strong>: every place, with a link to Google Maps.</li><li><strong>Decisions</strong>: open questions with a recommendation each.</li><li><strong>Private vault</strong>: sensitive details, device-only.</li></ul>` },
  { title: 'If something looks wrong', body: `<p>Pull to refresh does a full reload. If the app seems stuck on an old version, the "New version ready" toast has a Reload button; otherwise close the tab and reopen. Your data is not affected by reloads.</p><p>A red "Sync error" pill means GitHub could not be reached or the token is wrong; edits are still safe on the device and will push when it works again. "Conflict" means both devices edited since the last sync; choose a version at the top of this page.</p>` },
];
