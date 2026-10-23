# Budowanie: make  (wymaga cc65 w PATH lub CC65_HOME)
CC65_HOME ?= /home/user/tools/cc65
CL65 = $(CC65_HOME)/bin/cl65
CFLAGS = -t c64 -O -Cl --static-locals -g
ifdef DEBUG
CFLAGS += -DDEBUG
endif
SRC = src/main.c src/vic.s src/game.s src/gfx.s
OUT = build/soccer.prg

all: $(OUT)

src/gfx.s src/gfx.h: tools/gen_gfx.py
	python3 tools/gen_gfx.py

$(OUT): $(SRC) src/gfx.h c64.cfg
	mkdir -p build
	$(CL65) $(CFLAGS) -C c64.cfg -m build/soccer.map -Ln build/soccer.lbl -o $(OUT) $(SRC)
	cp $(OUT) web/soccer.prg

clean:
	rm -rf build src/gfx.s src/gfx.h web/soccer.prg

.PHONY: all clean
