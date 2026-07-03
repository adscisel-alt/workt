"""Shared constants and run-helpers for building translated pages."""
from typeset import Page

TEAL   = (38, 108, 132)     # section headings (teal)
TEALD  = (30, 74, 96)       # darker teal (panel titles)
INK    = (33, 29, 25)       # body text
PANEL  = (255, 255, 255)    # white bordered-panel interior
BG     = (234, 234, 234)    # open page area
PARCH  = (234, 234, 234)    # alias -> open page area
GREEN  = (219, 223, 203)    # example-box fill
CAPINK = (66, 55, 38)       # example caption brown
GOLD   = (196, 150, 60)
WHITE  = (245, 245, 245)
PURPLE = (120, 78, 150)     # "developed action" purple notes

def bd(t): return (t, "serif_b")
def it(t): return (t, "serif_i")
def bi(t): return (t, "serif_bi")
def rg(t): return (t, "serif")

def new(n):
    p = Page(n)
    p.ocr_lines()
    return p
