# Task: overlay a Polish translation onto ONE page of the Anunnaki rulebook

You produce `out-XX.png` for your assigned page number XX by covering the English
text on the original page image with the local background colour and re-typesetting
the equivalent **Polish** translation in the same place. Artwork, diagrams, icons,
tokens and numbers must be left untouched — only prose text is translated.

## Working dir
`/home/user/workt/pl_rulebook`  (run everything from here)

Modules already exist — DO NOT modify them:
- `typeset.py`  — `Page` class. Key methods (all coords in a 1735-wide REF space):
  - `p = Page(XX)` then `p.ocr_lines()`
  - `p.erase(zone, fill)` — fills the bbox of every detected OCR text line whose
    centre is inside `zone=(x0,y0,x1,y1)` with colour `fill`. Removes text,
    leaves borders/icons/diagrams. Use for text on panels/open areas.
  - `p.cover(box, color)` — fills a solid rectangle (use for example strips, or
    to force-cover a heading OCR missed).
  - `p.section_heading(cx, cy, text, color, size)` — centred letter-spaced teal
    heading WITH side dashes (for the dashed section titles like "KONTROLA").
  - `p.text((x,y), text, style=, size=, color=, spacing=)` — left-aligned text
    (for numbered action headings like "4 – AKCJA HANDLU").
  - `p.paragraphs(box, blocks, size=, para_gap=, color=, justify=, align=)` —
    flow rich text; auto-shrinks to fit box. `blocks` = list of paragraphs; each
    paragraph = list of runs `rg(t)/bd(t)/it(t)/bi(t)` (regular/bold/italic/bolditalic).
  - `p.clone_h(box, src_x0, src_x1)` — cover `box` by tiling a clean strip from
    the same y-range (for gradient TITLE banners / coloured ribbons).
  - `p.save(path)`
- `common.py` — constants + helpers. `from common import *` gives:
  - `TEAL` (section/action headings), `INK` (body text), `PURPLE` (dev-action notes)
  - `PANEL=(255,255,255)` white bordered-panel interior fill
  - `BG=(234,234,234)` open page-area fill
  - `GREEN` example-box fill, `CAPINK` example caption colour
  - `rg/bd/it/bi` run helpers, `new(XX)` = Page + ocr_lines

## Procedure
1. `Read` the original page image to see the layout:
   `/root/.claude/uploads/760b14e1-1e2f-517a-8c89-c5f20f1f4524/pages/p-XX.png`
2. Dump exact text-line coordinates (REF space):
   ```
   python3 -c "
   from typeset import Page
   p=Page(XX); ls=p.ocr_lines(); ls.sort(key=lambda l:(round(l['box'][1]/8),l['box'][0]))
   for l in ls:
     x0,y0,x1,y1=[round(v) for v in l['box']]
     print(f'y{y0:4}-{y1:4} x{x0:4}-{x1:4}  {l[\"text\"][:60]}')
   " 2>/dev/null
   ```
   Trust these OCR coords — they are ground truth. (A `grid.py XX` overlay on the
   pages/ image exists for banners OCR misses, but read it against the LABELLED
   lines, not pixels.)
3. Write `pXX.py` (see pattern below). Determine, for each text block, a generous
   erase `zone` that contains the block's OCR lines but NOT any icon/diagram, plus
   a body box for the Polish flow.
4. Render: `python3 pXX.py`
5. `Read out-XX.png`. Check: (a) NO English text left visible, (b) no Polish text
   overlapping icons/diagrams, (c) headings covered & redrawn, (d) fills match
   (white on panels, grey on open areas → no visible rectangles).
6. Fix and re-render until clean. Common fixes:
   - English heading bleeding through → OCR missed the coloured word; add
     `p.cover((x0,y0,x1,y1), FILL)` over the heading before drawing it.
   - Faint rectangle seams → wrong fill: use `PANEL` inside white bordered panels,
     `BG` on the open page background. Sample to confirm:
     `python3 -c "from typeset import Page; print(Page(XX).sample(X,Y,5))" 2>/dev/null`
   - English left/right of a block still visible → widen the erase zone (but keep
     it clear of icons/diagrams).
   - Example (green) strips: use `p.cover(box, GREEN)` (full fill) — OCR often
     misses the coloured "Example:" label.

## Pattern (mirrors the finished p07.py / p08.py — READ THOSE FIRST as templates)
```python
from common import *
def build():
    p = new(XX)
    # white bordered panel:
    p.erase((x0,y0,x1,y1), PANEL)
    p.section_heading(cx, cy, "NAGŁÓWEK", TEAL, 23)
    p.paragraphs((bx0,by0,bx1,by1), [[rg("...treść...")]], size=20, color=INK)
    # numbered action heading on open bg:
    p.erase((x0,y0,x1,y1), BG); p.cover((hx0,hy0,hx1,hy1), BG)
    p.text((hx0,hy0), "4 – AKCJA ...", style="sans_b", size=22, color=TEAL)
    p.paragraphs(..., color=INK)
    # example strip:
    p.cover((x0,y0,x1,y1), GREEN)
    p.paragraphs(..., size=19, color=CAPINK, justify=False)
    p.save("/home/user/workt/pl_rulebook/out-XX.png")
    print("saved")
if __name__=="__main__": build()
```

## GLOSSARY (use consistently)
- House → Dom · Home Planet → Planeta Macierzysta · Capital → Stolica
- Gaia → Gaja · Atlantis → Atlantyda · Territory → Terytorium · Shrine → Sanktuarium
- resource → surowiec; Food/Wood/Metal/Gold → Żywność/Drewno/Metal/Złoto
- Follower → Wyznawca · Minor God → Pomniejszy Bóg · Major God → Główny Bóg
- unit → jednostka · Settlement → Osada · strength → siła
- Summoning cube → Kostka przywołania · Summoning token → żeton przywołania
- summon → przywołać · Mana Crystal → Kryształ Many · Mana action → akcja Many
- Action pawn → Pionek akcji · Action tile → Płytka akcji · Action board → Plansza akcji
- Action star → gwiazda akcji · Primary action → Akcja Główna
- Additional action → Akcja Dodatkowa
- Development track → Tor rozwoju; War/Technology/Commerce → Wojny/Technologii/Handlu
- Domination track → Tor dominacji · Culture token → żeton Kultury
- Commercial Pact → Pakt handlowy · Weapon card → karta broni
- Basic/Advanced → Podstawowa/Zaawansowana · Ancient Civilization → Starożytna Cywilizacja
- Portal action → akcja Portalu · Move → Ruch · Harvest → Zbiory/pozyskiwanie
- Exhaust token → żeton wyczerpania · Goal tile → płytka Celu
- VPs → PZ (Punkty Zwycięstwa) · Victory Points → Punkty Zwycięstwa
- Develop a Technology → Rozwiń Technologię · Build a Settlement → Zbuduj Osadę
- Gain Followers → Zyskaj Wyznawców · Player aid → pomoc gracza
- Player marker → znacznik gracza · resource track → tor surowca
- Settlement Income → Dochód z Osad · Player names (Serena/Danilo/Simone/Isobel) stay,
  colour words translate: purple→fioletowy, blue→niebieski, red→czerwony, yellow→żółty
- "face up/down" → awersem do góry / zakryty · developed → rozwinięty
- Keep English "Example:" → "Przykład:" (bold-italic), quotes use „ ” (Polish)
- Keep proper game title "Anunnaki: Dawn of the Gods" untranslated.

Deliverable: `out-XX.png` at 3470px, all rules text in natural Polish, artwork intact.
Report back the path and any spots you could not fully clean.
