import sys
from PIL import Image, ImageDraw, ImageFont
n=int(sys.argv[1])
src=f"/root/.claude/uploads/760b14e1-1e2f-517a-8c89-c5f20f1f4524/pages/p-{n:02d}.png"
im=Image.open(src).convert("RGB"); W,H=im.size  # 1156-ish? actually 100dpi
d=ImageDraw.Draw(im)
f=ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",14)
# grid in REF space (1735). image is at 100dpi => scale
S=W/1735.0
for x in range(0,1736,100):
    d.line([(x*S,0),(x*S,H)],fill=(255,0,0),width=1)
    d.text((x*S+2,2),str(x),font=f,fill=(255,0,0))
    d.text((x*S+2,H-16),str(x),font=f,fill=(255,0,0))
for y in range(0,1736,100):
    d.line([(0,y*S),(W,y*S)],fill=(255,0,0),width=1)
    d.text((2,y*S+1),str(y),font=f,fill=(0,0,255))
    d.text((W-40,y*S+1),str(y),font=f,fill=(0,0,255))
im.save(f"grid-{n:02d}.png")
print("saved",f"grid-{n:02d}.png",im.size)
