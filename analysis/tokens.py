"""Tokenise every lyric line the way GPT tokenizers do it, and time each token inside its sung word.

Cells hold PRE-TOKENS: the first stage of the tokenizer (its regex split, o200k_base), which cuts only at word and
punctuation boundaries ("Turing", "'s", " tape", ":"); each pre-token carries the BPE token ids it encodes to.

Writes app/public/data/tokens.json: {"encoding": "r50k_base", "lines": [[{"t": token text, "start": s, "end": e,
"word": word index}, ...], ...]}. A token's time is interpolated by character offset within the word it starts in.
"""
import json, pathlib, tiktoken

root = pathlib.Path(__file__).resolve().parents[1]
ly = json.loads((root / 'app/public/data/lyrics.json').read_text(encoding='utf8'))
lines = ly['lines'] if isinstance(ly, dict) else ly
enc = tiktoken.get_encoding('o200k_base')
import regex
# GPT-4's (cl100k) pre-tokenizer: whole words, contractions ('s 're), runs of digits, punctuation; a punctuation
# mark glued to the front of a word ("-seven") is split off so cells never cut inside or across a word
pat = regex.compile(tiktoken.get_encoding('cl100k_base')._pat_str)
def pieces(text):
    for m in pat.finditer(text):
        s, a = m.group(0), m.start()
        g = regex.match(r"^( ?)([^\s\p{L}\p{N}'])(\p{L}+)$", s)
        if g:
            yield g.group(1) + g.group(2), a
            yield g.group(3), a + len(g.group(1)) + 1
        else:
            yield s, a
plain = lambda s: s.replace('\u2019', "'").replace('\u2018', "'").replace('\u201c', '"').replace('\u201d', '"').replace('\u2014', ' --').replace('\u2026', '...')

out = []
for l in lines:
    words = l['words']
    text, spans = '', []
    for w in words:
        if text: text += ' '
        a = len(text); text += plain(w['w']); spans.append((a, len(text)))
    toks, pos = [], 0
    for s, a in pieces(text):
        if not s.strip():
            continue
        ids = enc.encode(s)
        pos = a + len(s)
        c = a + (len(s) - len(s.lstrip(' ')))  # first non-space char
        wi = next((k for k, (x, y) in enumerate(spans) if x <= c < y), len(spans) - 1)
        x, y = spans[wi]; w = words[wi]
        f0 = (c - x) / max(1, y - x)
        f1 = min(1.0, (pos - x) / max(1, y - x))
        st = w['start'] + f0 * (w['end'] - w['start']) * 0.6
        en = w['start'] + max(f1, f0) * (w['end'] - w['start'])
        toks.append({'t': s, 'start': round(st, 3), 'end': round(max(en, st + 0.05), 3), 'word': wi, 'id': ids[0], 'ids': ids})
    out.append(toks)
(root / 'app/public/data/tokens.json').write_text(json.dumps({'encoding': 'o200k_base (pre-tokens)', 'lines': out}, ensure_ascii=False), encoding='utf8')
print(sum(len(x) for x in out), 'tokens over', len(out), 'lines')
print([x['t'] for x in out[0]])
