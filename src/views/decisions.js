import { el, uid, linkify } from '../util.js';
import { sheet, form, toast, confirmDialog, section, pill, empty } from '../ui.js';

export function render(root, { store }) {
  const qs = store.trip.questions || [];
  const open = qs.filter((q) => !q.resolved), done = qs.filter((q) => q.resolved);
  root.append(el('div', { class: 'page-head' }, el('div', {}, el('h2', { class: 'page-title' }, 'Decisions'), el('p', { class: 'page-sub' }, 'Things only you can answer. Each one has a recommendation already filled in; change it or confirm it.')), el('div', { class: 'page-actions' }, el('button', { class: 'btn btn-primary btn-sm', type: 'button', onClick: () => editQ(store, null) }, '+ Add'))));
  root.append(section(`Open (${open.length})`, open.length ? el('div', { class: 'row-list' }, ...open.map((q) => card(store, q))) : empty('Nothing open', 'Every decision has been made.')));
  if (done.length) root.append(section(`Decided (${done.length})`, el('div', { class: 'row-list' }, ...done.map((q) => card(store, q)))));
}

function card(store, q) {
  return el('div', { class: 'card clickable', onClick: () => editQ(store, q) },
    el('div', { style: { display: 'flex', gap: '8px', alignItems: 'flex-start', justifyContent: 'space-between' } }, el('div', { class: 'card-title' }, q.question), q.resolved ? pill('booked', 'Decided') : pill('planned', 'Open')),
    q.why ? el('p', { class: 'small muted', style: { marginTop: '6px' }, html: linkify(q.why) }) : null,
    q.options?.length ? el('ul', { class: 'small', style: { margin: '8px 0 0', paddingLeft: '18px' } }, ...q.options.map((o) => el('li', {}, o))) : null,
    q.recommendation ? el('div', { class: 'callout ok', style: { marginTop: '10px' } }, el('span', { class: 'ico' }, '💡'), el('div', {}, el('strong', {}, 'Recommendation: '), el('span', { html: linkify(q.recommendation) }))) : null,
    q.answer ? el('div', { class: 'callout', style: { marginTop: '8px' } }, el('span', { class: 'ico' }, '✅'), el('div', {}, el('strong', {}, 'Your answer: '), q.answer)) : null,
  );
}

function editQ(store, q) {
  const isNew = !q;
  const v0 = q || { id: uid(), options: [] };
  const fm = form([
    { name: 'question', label: 'Question', value: v0.question || '' },
    { name: 'why', label: 'Why it matters', type: 'textarea', value: v0.why || '' },
    { name: 'options', label: 'Options (one per line)', type: 'textarea', value: (v0.options || []).join('\n') },
    { name: 'recommendation', label: 'Recommendation', type: 'textarea', value: v0.recommendation || '' },
    { name: 'answer', label: 'Your answer', type: 'textarea', value: v0.answer || '' },
    { name: 'resolved', label: 'Decided', type: 'checkbox', value: !!v0.resolved },
  ]);
  const actions = [];
  if (!isNew) actions.push({ label: 'Delete', class: 'btn-danger', keepOpen: true, onClick: async () => { if (await confirmDialog('Delete this decision?')) { store.update((t) => { t.questions = t.questions.filter((x) => x.id !== v0.id); }); return true; } return false; } });
  actions.push('spacer', { label: 'Cancel', class: 'btn-ghost' }, { label: 'Save', class: 'btn-primary', onClick: () => { const v = fm.values(); if (!v.question) return false; const next = { ...v0, ...v, options: v.options.split('\n').map((s) => s.trim()).filter(Boolean) }; store.update((t) => { t.questions ||= []; const i = t.questions.findIndex((x) => x.id === v0.id); if (i >= 0) t.questions[i] = next; else t.questions.push(next); }); toast('Saved', { kind: 'ok' }); } });
  sheet({ title: isNew ? 'Add decision' : 'Decision', body: fm.node, actions });
}
