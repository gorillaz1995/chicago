import json, re
s = open('head6.py').read()
fit = {k: round(v, 3) for k, v in json.load(open('lip_fit.json')).items()}
m = re.search(r"LIP\.update\(\*\*\{.*?\}\)\n", s, re.S)
assert m
s = s[:m.start()] + "LIP.update(**%r)\n" % fit + s[m.end():]
open('head6.py', 'w').write(s)
print('baked', len(fit))
