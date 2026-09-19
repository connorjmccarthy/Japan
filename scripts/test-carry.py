#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Check that a rebuild does not undo what was done in the app.

This has bitten three times for real: renamed people, ticked to-dos and deleted
souvenirs all came back after a rebuild. Run it with the other checks.

    python3 scripts/test-carry.py
"""
import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _carry import carry_over   # noqa: E402

FAILS = []


def check(name, got, want):
    if got != want:
        FAILS.append('%s\n    got  %r\n    want %r' % (name, got, want))


def build():
    """A fresh build, as a builder would produce it."""
    return {
        'meta': {'title': 'T'},
        'people': [{'id': 'p1', 'name': 'Placeholder'}],
        'checklist': [{'id': 'c1', 'text': 'one'}, {'id': 'c2', 'text': 'two'}],
        'souvenirs': [{'id': 's1', 'name': 'keep', 'status': 'idea'},
                      {'id': 's2', 'name': 'deleted in the app', 'status': 'idea'}],
        'questions': [{'id': 'q1', 'question': 'q', 'resolved': False}],
        'days': [{'id': 'd1', 'items': [{'id': 'i1', 'title': 'a'}, {'id': 'i2', 'title': 'b'}]}],
    }


with tempfile.TemporaryDirectory() as tmp:
    path = os.path.join(tmp, 'trip.json')

    # First build: nothing on disk, so it just ships and stamps what it shipped.
    first = carry_over(build(), path)
    with open(path, 'w') as f:
        json.dump(first, f)
    check('first build stamps its ids', sorted(first['meta']['seedIds']['souvenirs']), ['s1', 's2'])

    # Now a person uses the app: renames, ticks, resolves, and deletes.
    live = json.loads(json.dumps(first))
    live['people'][0]['name'] = 'Michael Clayton'
    live['checklist'][0]['done'] = True
    live['souvenirs'][0]['status'] = 'bought'
    live['souvenirs'] = [s for s in live['souvenirs'] if s['id'] != 's2']
    live['questions'][0]['resolved'] = True
    live['days'][0]['items'][0]['done'] = True
    live['days'][0]['items'] = [i for i in live['days'][0]['items'] if i['id'] != 'i2']
    with open(path, 'w') as f:
        json.dump(live, f)

    # Rebuild. Everything above must survive.
    out = carry_over(build(), path)
    check('renamed person survives', out['people'][0]['name'], 'Michael Clayton')
    check('ticked to-do survives', out['checklist'][0].get('done'), True)
    check('untouched to-do stays untouched', out['checklist'][1].get('done'), None)
    check('souvenir status survives', out['souvenirs'][0]['status'], 'bought')
    check('resolved decision survives', out['questions'][0].get('resolved'), True)
    check('ticked item survives', out['days'][0]['items'][0].get('done'), True)
    check('deleted souvenir stays deleted', [s['id'] for s in out['souvenirs']], ['s1'])
    check('deleted day item stays deleted', [i['id'] for i in out['days'][0]['items']], ['i1'])
    check('stamp follows the deletions', out['meta']['seedIds']['souvenirs'], ['s1'])

    # A missing or corrupt file must never lose the fresh build.
    os.remove(path)
    check('no file: build stands', len(carry_over(build(), path)['souvenirs']), 2)
    with open(path, 'w') as f:
        f.write('{ half written')
    check('corrupt file: build stands', len(carry_over(build(), path)['souvenirs']), 2)

if FAILS:
    print('carry-over FAILED:\n  ' + '\n  '.join(FAILS))
    sys.exit(1)
print('carry-over ok, 11 checks')
