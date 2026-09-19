# -*- coding: utf-8 -*-
"""Carry state made in the app across a rebuild.

The builders regenerate their JSON from scratch, which is what makes them the
source of truth. The catch is that anything ticked, answered, renamed or deleted
inside the app lives only in the JSON, so a rebuild used to quietly undo it.
This reads whatever is already on disk and puts that state back, matched by id.

What is carried:
  - to-dos and itinerary items that were ticked done
  - answers and resolved flags on decisions
  - people's names
  - DELETIONS, which need a little more machinery

Deletions work off a tombstone. Every build stamps the ids it shipped into
`meta.seedIds`. On the next build, an id that the last stamp shipped but that is
no longer in the file was deleted by a person, so it is dropped from the new
build too. Ids have to stay stable for that to hold, which they do in these
builders; if you ever renumber one, the old tombstone will suppress the new
entry and you will need to clear `meta.seedIds` once to reset it.
"""
import json
import os

# Every list a person can delete from in the app. Day items are handled
# separately because they are nested.
COLLECTIONS = ('souvenirs', 'checklist', 'food', 'stays', 'budget', 'questions', 'places', 'people')


def _ids(seq):
    return [x['id'] for x in (seq or []) if isinstance(x, dict) and 'id' in x]


def _item_ids(days):
    return [i['id'] for d in (days or []) for i in (d.get('items') or []) if 'id' in i]


def _stamp(trip):
    """Record what this build shipped, so the next one can spot deletions."""
    seed = {col: _ids(trip.get(col)) for col in COLLECTIONS if trip.get(col)}
    items = _item_ids(trip.get('days'))
    if items:
        seed['items'] = items
    trip.setdefault('meta', {})['seedIds'] = seed
    return trip


def carry_over(trip, path):
    """Merge in-app state from an existing JSON file into a freshly built trip."""
    if not os.path.exists(path):
        return _stamp(trip)
    try:
        with open(path) as f:
            old = json.load(f)
    except (ValueError, OSError):
        return _stamp(trip)          # unreadable or half-written: the fresh build stands

    # ---- deletions made in the app ------------------------------------------
    shipped = (old.get('meta') or {}).get('seedIds') or {}
    for col in COLLECTIONS:
        gone = set(shipped.get(col) or []) - set(_ids(old.get(col)))
        if gone and trip.get(col):
            trip[col] = [x for x in trip[col] if x.get('id') not in gone]
    gone_items = set(shipped.get('items') or []) - set(_item_ids(old.get('days')))
    if gone_items:
        for d in trip.get('days') or []:
            d['items'] = [i for i in (d.get('items') or []) if i.get('id') not in gone_items]

    # ---- things ticked, answered or renamed ---------------------------------
    done_todos = {c['id'] for c in old.get('checklist', []) if c.get('done')}
    for c in trip.get('checklist', []):
        if c['id'] in done_todos:
            c['done'] = True

    done_items = {i['id'] for d in old.get('days', []) for i in d.get('items', []) if i.get('done')}
    for d in trip.get('days', []):
        for i in d.get('items', []):
            if i['id'] in done_items:
                i['done'] = True

    # Souvenirs carry their status, because ticking one off is the whole point
    # of the page while you are actually in the shop.
    souv = {s['id']: s.get('status') for s in old.get('souvenirs', [])}
    for s in trip.get('souvenirs', []):
        if souv.get(s['id']) and souv[s['id']] != s.get('status'):
            s['status'] = souv[s['id']]

    answers = {q['id']: q for q in old.get('questions', [])}
    for q in trip.get('questions', []):
        was = answers.get(q['id'])
        if not was:
            continue
        if was.get('answer') and not q.get('answer'):
            q['answer'] = was['answer']
        # Resolving is a one-way act by a person. A builder that still writes
        # resolved=False must not undo it.
        if was.get('resolved') and not q.get('resolved'):
            q['resolved'] = True

    names = {p['id']: p.get('name') for p in old.get('people', [])}
    for p in trip.get('people', []):
        if names.get(p['id']):
            p['name'] = names[p['id']]

    return _stamp(trip)
