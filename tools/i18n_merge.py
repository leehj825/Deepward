#!/usr/bin/env python3
# Merges translated parts (tools/i18n/<lang>_part*.json) into js/lang_<lang>.js, keeping what is already there.
#   python3 tools/i18n_merge.py ko
import json, sys, glob, os, re
lang = sys.argv[1]; root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, 'js', f'lang_{lang}.js'); table = {}
if os.path.exists(out):
    src = open(out, encoding='utf8').read(); m = re.search(r'=\s*(\{.*\});', src, re.S)
    if m: table = json.loads(m.group(1))
for f in sorted(glob.glob(os.path.join(root, 'tools', 'i18n', f'{lang}_part*.json'))):
    table.update(json.load(open(f, encoding='utf8')))
bad = [k for k, v in table.items() if sorted(re.findall(r'\{\d\}', k)) != sorted(re.findall(r'\{\d\}', v))]
for k in bad: print('placeholder mismatch, dropped:', k); del table[k]
name = 'LANG_' + lang.upper()
with open(out, 'w', encoding='utf8') as fh:
    fh.write(f'// Deepward - {lang} texts for js/i18n.js: English -> translation ({{0}}, {{1}}... stand for numbers).\n')
    fh.write('// Made with tools/i18n_harvest.js (what to translate) and tools/i18n_merge.py (this file); edit freely.\n')
    fh.write(f'const {name} = ' + json.dumps(dict(sorted(table.items())), ensure_ascii=False, indent=0) + ';\n')
print(out, len(table), 'entries')
