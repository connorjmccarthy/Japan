# -*- coding: utf-8 -*-
"""Carry state made in the app across a rebuild.

The builders regenerate their JSON from scratch, which is what makes them the
source of truth. The catch is that anything ticked, answered or renamed inside
the app lives only in the JSON, so a rebuild used to quietly undo it. This reads
whatever is already on disk and puts that state back, matched by id.

What is carried: to-dos and itinerary items that were ticked done, answers and
resolved flags on decisions, and people's names. Everything else is the
builder's to define.
"""
import json
import os


def carry_over(trip, path):
    """Merge in-app state from an existing JSON file into a freshly built trip."""
    if not os.path.exists(path):
        return trip
    try:
        with open(path) as f:
            old = json.load(f)
    except (ValueError, OSError):
        return trip          # unreadable or half-written: the fresh build stands

    done_todos = {c['id'] for c in old.get('checklist', []) if c.get('done')}
    for c in trip.get('checklist', []):
        if c['id'] in done_todos:
            c['done'] = True

    done_items = {i['id'] for d in old.get('days', []) for i in d.get('items', []) if i.get('done')}
    for d in trip.get('days', []):
        for i in d.get('items', []):
            if i['id'] in done_items:
                i['done'] = True

    answers = {q['id']: q for q in old.get('questions', [])}
    for q in trip.get('questions', []):
        was = answers.get(q['id'])
        if not was:
            continue
        if was.get('answer') and not q.get('answer'):
            q['answer'] = was['answer']
        if was.get('resolved') and 'resolved' not in q:
            q['resolved'] = True

    names = {p['id']: p.get('name') for p in old.get('people', [])}
    for p in trip.get('people', []):
        if names.get(p['id']):
            p['name'] = names[p['id']]

    return trip
