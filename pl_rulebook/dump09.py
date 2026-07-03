from typeset import Page
p=Page(9); ls=p.ocr_lines(); ls.sort(key=lambda l:(round(l['box'][1]/8),l['box'][0]))
for l in ls:
  x0,y0,x1,y1=[round(v) for v in l['box']]
  print(f'y{y0:4}-{y1:4} x{x0:4}-{x1:4}  {l["text"][:60]}')
