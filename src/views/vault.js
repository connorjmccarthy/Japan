import { el } from '../util.js';
import { form, toast, confirmDialog, section } from '../ui.js';

const FIELDS = [
  ['passportNumber', 'Passport number'], ['passportExpiry', 'Passport expiry'], ['ffNumber', 'Qantas Frequent Flyer number'],
  ['outboundRef', 'Outbound booking reference (QF481 / QF49)'], ['outboundTicket', 'Outbound e-ticket number'],
  ['feederRef', 'Feeder flight booking reference'], ['returnRef', 'Return flight booking reference'],
  ['loungePasses', 'Lounge pass details / codes'], ['insurancePolicy', 'Travel insurance policy number and phone'],
  ['usjTickets', 'USJ ticket / Express Pass codes'], ['emergencyContact', 'Emergency contact at home'], ['bankNotes', 'Card / bank notes'],
];

export function render(root, { store }) {
  const v = store.vault.fields || {};
  root.append(el('div', { class: 'page-head' }, el('div', {}, el('h2', { class: 'page-title' }, 'Private vault'), el('p', { class: 'page-sub' }, 'Booking references, passport details and anything else that should never be in a public repo.'))));
  root.append(el('div', { class: 'callout danger', style: { marginBottom: '14px' } }, el('span', { class: 'ico' }, '🔒'), el('div', {}, store.vaultSyncReady() ? [el('strong', {}, 'Encrypted sync is on. '), 'This page is scrambled with your passphrase before it is saved to GitHub, and unscrambled on any device with the same passphrase. Nothing here is ever written to the plan file in plain text.'] : [el('strong', {}, 'Stays on this device only. '), 'Nothing on this page is written to GitHub. To have it on your phone as well, either switch on encrypted vault sync in Settings, or use Export below and paste it into the phone.'])));

  const fm = form(FIELDS.map(([name, label]) => ({ name, label, value: v[name] || '', type: name === 'passportExpiry' ? 'date' : 'text' })));
  root.append(el('div', { class: 'card' }, fm.node, el('div', { class: 'btn-row', style: { marginTop: '14px' } }, el('button', { class: 'btn btn-primary', type: 'button', onClick: () => { store.setVault({ fields: fm.values() }); toast('Saved on this device', { kind: 'ok' }); } }, 'Save'))));

  const secrets = Object.entries(store.vault.itemSecrets || {});
  root.append(section('Private notes attached to items', secrets.length ? el('div', { class: 'row-list' }, ...secrets.map(([id, text]) => el('div', { class: 'row', style: { cursor: 'default' } }, el('div', { class: 'row-main' }, el('div', { class: 'row-title' }, text), el('div', { class: 'row-sub' }, `Attached to ${findItemName(store.trip, id)}`))))) : el('p', { class: 'muted' }, 'Add one from any item, flight or stay using the "Private note" field.')));

  const ta = el('textarea', { class: 'mono', style: { width: '100%', minHeight: '120px', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-strong)', background: 'var(--bg-elev)', fontSize: '13px' }, 'aria-label': 'Vault export' });
  root.append(section('Move the vault to another device',
    el('div', { class: 'card' },
      el('p', { class: 'small muted', style: { marginBottom: '10px' } }, 'Export copies everything above as text. Paste it into this box on the other device and press Import. Send it to yourself over something private (AirDrop, iMessage to yourself, a password manager note), not email to someone else.'),
      ta,
      el('div', { class: 'btn-row', style: { marginTop: '10px' } },
        el('button', { class: 'btn', type: 'button', onClick: async () => { ta.value = JSON.stringify(store.vault); try { await navigator.clipboard.writeText(ta.value); toast('Copied to clipboard', { kind: 'ok' }); } catch { toast('Shown below. Select all and copy.'); } } }, 'Export'),
        el('button', { class: 'btn', type: 'button', onClick: () => { try { const d = JSON.parse(ta.value); if (!d || typeof d !== 'object') throw new Error(); store.setVault({ fields: d.fields || {}, itemSecrets: d.itemSecrets || {} }); toast('Imported', { kind: 'ok' }); root.innerHTML = ''; render(root, { store }); } catch { toast('That is not a vault export', { kind: 'error' }); } } }, 'Import'),
        el('button', { class: 'btn btn-danger', type: 'button', onClick: async () => { if (await confirmDialog('Wipe every private field and note from this device?', { okLabel: 'Wipe' })) { store.setVault({ fields: {}, itemSecrets: {} }); root.innerHTML = ''; render(root, { store }); } } }, 'Wipe'),
      ),
    )));
}

function findItemName(t, id) {
  for (const d of t.days || []) for (const i of d.items || []) if (i.id === id) return `plan item “${i.title}”`;
  for (const f of t.flights?.confirmed || []) if (f.id === id) return `flight ${f.flight}`;
  for (const s of t.stays || []) if (s.id === id) return `stay “${s.name}”`;
  return 'an item that no longer exists';
}
