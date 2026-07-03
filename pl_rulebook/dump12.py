import json
from typeset import Page
p=Page(12); ls=p.ocr_lines()
json.dump(ls, open('/tmp/claude-0/-home-user-workt/760b14e1-1e2f-517a-8c89-c5f20f1f4524/scratchpad/ocr12.json','w'))
ls.sort(key=lambda l:(round(l['box'][1]/8),l['box'][0]))
lines=[]
for l in ls:
  x0,y0,x1,y1=[round(v) for v in l['box']]
  lines.append(f'y{y0:4}-{y1:4} x{x0:4}-{x1:4}  {l["text"][:70]}')
open('/tmp/claude-0/-home-user-workt/760b14e1-1e2f-517a-8c89-c5f20f1f4524/scratchpad/d12.txt','w').write("\n".join(lines))
print("OCRDONE", len(ls))
