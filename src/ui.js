import { el } from './util.js';

// ---- Toasts ----------------------------------------------------------------
export function toast(message, { kind = '', action, onAction, ms = 3200 } = {}) {
  const root = document.getElementById('toast-root');
  const node = el('div', { class: `toast ${kind}`, role: 'status' }, el('span', {}, message));
  if (action) node.append(el('button', { type: 'button', onClick: () => { node.remove(); onAction && onAction(); } }, action));
  root.append(node);
  setTimeout(() => node.remove(), ms);
  return node;
}

// ---- Sheet / modal ---------------------------------------------------------
let openSheet = null;
export function sheet({ title, body, actions = [], onClose, wide = false }) {
  closeSheet();
  const root = document.getElementById('sheet-root');
  const closeBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onClick: () => closeSheet() }, '✕');
  const foot = el('div', { class: 'sheet-foot' });
  for (const a of actions) {
    if (a === 'spacer') { foot.append(el('div', { class: 'spacer' })); continue; }
    const btn = el('button', { type: 'button', class: `btn ${a.class || ''}`, onClick: async () => { const r = await a.onClick?.(); if (r !== false && !a.keepOpen) closeSheet(); } }, a.label);
    foot.append(btn);
  }
  const panel = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    el('div', { class: 'sheet-head' }, el('h2', {}, title), closeBtn),
    el('div', { class: 'sheet-body' }, body),
    actions.length ? foot : null,
  );
  const backdrop = el('div', { class: 'sheet-backdrop', onClick: (e) => { if (e.target === backdrop) closeSheet(); } }, panel);
  root.append(backdrop);
  openSheet = { backdrop, onClose };
  document.body.style.overflow = 'hidden';
  const first = panel.querySelector('input, select, textarea, button.btn');
  setTimeout(() => first && first.focus({ preventScroll: true }), 30);
  const onKey = (e) => { if (e.key === 'Escape') closeSheet(); };
  document.addEventListener('keydown', onKey);
  openSheet.onKey = onKey;
  return { close: closeSheet, panel };
}
export function closeSheet() {
  if (!openSheet) return;
  openSheet.backdrop.remove();
  document.removeEventListener('keydown', openSheet.onKey);
  document.body.style.overflow = '';
  const cb = openSheet.onClose; openSheet = null; cb && cb();
}

export function confirmDialog(message, { title = 'Are you sure?', okLabel = 'Delete', danger = true } = {}) {
  return new Promise((resolve) => {
    sheet({
      title,
      body: el('p', {}, message),
      onClose: () => resolve(false),
      actions: [
        { label: 'Cancel', class: 'btn-ghost', onClick: () => resolve(false) },
        'spacer',
        { label: okLabel, class: danger ? 'btn-danger' : 'btn-primary', onClick: () => resolve(true) },
      ],
    });
  });
}

// ---- Form builder ----------------------------------------------------------
// fields: [{ name, label, type: 'text'|'number'|'date'|'time'|'select'|'textarea'|'checkbox'|'segment', options, value, hint, placeholder, half }]
export function form(fields) {
  const wrap = el('form', { class: 'form', onSubmit: (e) => e.preventDefault() });
  const inputs = {};
  let rowBuf = null;
  const flush = () => { if (rowBuf) { wrap.append(rowBuf); rowBuf = null; } };
  for (const f of fields) {
    let control;
    if (f.type === 'select') {
      control = el('select', { name: f.name, id: `f-${f.name}` }, ...(f.options || []).map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        return el('option', { value: v, selected: String(v) === String(f.value ?? '') ? true : null }, l);
      }));
    } else if (f.type === 'textarea') {
      control = el('textarea', { name: f.name, id: `f-${f.name}`, placeholder: f.placeholder || '' });
      control.value = f.value ?? '';
    } else if (f.type === 'checkbox') {
      control = el('input', { type: 'checkbox', name: f.name, id: `f-${f.name}` });
      control.checked = !!f.value;
    } else if (f.type === 'segment') {
      control = el('div', { class: 'seg', role: 'group' });
      control.value = f.value ?? (f.options?.[0]?.[0] ?? f.options?.[0]);
      for (const o of f.options) {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        const b = el('button', { type: 'button', class: String(v) === String(control.value) ? 'active' : '', onClick: () => { control.value = v; control.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b)); f.onChange && f.onChange(v); } }, l);
        control.append(b);
      }
    } else {
      control = el('input', { type: f.type || 'text', name: f.name, id: `f-${f.name}`, placeholder: f.placeholder || '', inputmode: f.type === 'number' ? 'decimal' : null, step: f.step || (f.type === 'number' ? 'any' : null), min: f.min ?? null, autocomplete: 'off' });
      control.value = f.value ?? '';
    }
    inputs[f.name] = control;
    let field;
    if (f.type === 'checkbox') field = el('label', { class: 'inline-check' }, control, el('span', {}, f.label));
    else field = el('div', { class: 'field' }, el('label', { for: `f-${f.name}` }, f.label), control, f.hint ? el('div', { class: 'hint' }, f.hint) : null);
    if (f.half) {
      if (!rowBuf) rowBuf = el('div', { class: 'field-row' });
      rowBuf.append(field);
      if (rowBuf.children.length === 2) flush();
    } else { flush(); wrap.append(field); }
  }
  flush();
  const values = () => {
    const out = {};
    for (const [k, c] of Object.entries(inputs)) {
      if (c.type === 'checkbox') out[k] = c.checked;
      else if (c.classList?.contains('seg')) out[k] = c.value;
      else if (c.type === 'number') out[k] = c.value === '' ? null : Number(c.value);
      else out[k] = c.value.trim ? c.value.trim() : c.value;
    }
    return out;
  };
  return { node: wrap, inputs, values };
}

export const pill = (status, label) => el('span', { class: `pill pill-${status}` }, label ?? status);
export const section = (title, ...children) => el('section', { class: 'section' }, title ? el('div', { class: 'section-head' }, el('h2', { class: 'section-title' }, title)) : null, ...children);
export const empty = (title, sub) => el('div', { class: 'empty' }, el('strong', {}, title), sub ? el('span', {}, sub) : null);
