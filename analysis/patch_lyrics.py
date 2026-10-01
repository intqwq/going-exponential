"""Manual corrections where forced alignment failed (confidence ~0), taken from the free transcription
(analysis/work/transcribe_raw.json) and the vocal-stem envelope (held notes)."""
import json
P = 'app/public/data/lyrics.json'
L = json.load(open(P, encoding='utf-8'))
fix = {
    ('Now who keeps root', 'you?'): (265.06, 268.2),   # held "you" (vocal stem stays loud to ~268)
    ('Let there be', '“Let'): (278.2, 278.3),
    ('Let there be', 'there'): (278.3, 278.7),
    ('Let there be', 'be…”'): (278.7, 283.2),  # held "be…" (vocal stem loud until ~283.6)
}
for l in L['lines']:
    for (frag, word), (a, b) in fix.items():
        if frag in l['text'].replace('“', '').replace('”', ''):
            for w in l['words']:
                if w['w'] == word:
                    w['start'], w['end'], w['p'] = a, b, 0.5
    l['start'], l['end'] = l['words'][0]['start'], l['words'][-1]['end']
json.dump(L, open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for l in L['lines'][-3:]: print([(w['w'], w['start'], w['end']) for w in l['words']])
