; ---------------------------------------------------------------------------
; Warstwa sprzętowa: VIC-II, przerwania rastrowe, multiplekser sprite'ów,
; rysowanie przewijanego ekranu, odczyt klawiatury/joysticka.
;
; Pamięć VIC (bank 3, $C000-$FFFF):
;   $C000 ekran 0, $C400 ekran 1, $C800 zestaw znaków, $E000 dane sprite'ów
; ---------------------------------------------------------------------------
        .export _vic_init, _vic_draw_screen, _read_input, _sort_sprites
        .import _ey, _exlo, _exhi, _eptr, _ecol, _efl, _ord
        .export _vs_n, _vs_y, _vs_xlo, _vs_xhi, _vs_ptr, _vs_col, _vs_flags
        .export _vs_d011, _vs_d018, _vs_pending, _frame_count, _raster_max
        .import _charset_data, _sprite_data, charset_len, sprite_len
        .import _pitch_row_lo, _pitch_row_hi

SCREEN0    = $C000
SCREEN1    = $C400
CHARSET    = $C800
SPRDATA    = $E000
FRAME_LINE = 268            ; linia rastra przerwania ramki (dolna ramka)
MAXVS      = 16

; strona zerowa (poza obszarem cc65 $02-$1B)
rowptr     = $40            ; 25 wskaźników wierszy (50 bajtów: $40-$71)
src        = $72
dst        = $74
tmp_bit    = $76
tmp_nbit   = $77
tmp_hw     = $78
tmp_line   = $79
tmp_v      = $7a
tmp_k      = $7b
tmp_i      = $7c

        .segment "BSS"
; lista sprite'ów wirtualnych przygotowana przez kod w C (posortowana po Y)
_vs_n:      .res 1
_vs_y:      .res MAXVS
_vs_xlo:    .res MAXVS
_vs_xhi:    .res MAXVS
_vs_ptr:    .res MAXVS
_vs_col:    .res MAXVS
_vs_flags:  .res MAXVS      ; bit0 multicolor, bit1 x-expand, bit2 y-expand
_vs_d011:   .res 1
_vs_d018:   .res 1
_vs_pending:.res 1          ; 1 = nowa ramka gotowa do wyświetlenia
_frame_count:.res 1
_raster_max:.res 1          ; diagnostyka: najniższa linia osiągnięta przez logikę
; lista aktywna (używana przez przerwania)
act_n:      .res 1
act_y:      .res MAXVS
act_xlo:    .res MAXVS
act_xhi:    .res MAXVS
act_ptr:    .res MAXVS
act_col:    .res MAXVS
act_flags:  .res MAXVS
act_d011:   .res 1
act_d018:   .res 1
irq_mode:   .res 1
next_idx:   .res 1
msb_sh:     .res 1
mc_sh:      .res 1
xe_sh:      .res 1
ye_sh:      .res 1

        .segment "RODATA"
bit_tab:    .byte $01,$02,$04,$08,$10,$20,$40,$80
nbit_tab:   .byte $fe,$fd,$fb,$f7,$ef,$df,$bf,$7f
en_tab:     .byte $00,$01,$03,$07,$0f,$1f,$3f,$7f,$ff

        .segment "CODE"
; ---------------------------------------------------------------------------
; void vic_init(void)
; ---------------------------------------------------------------------------
_vic_init:
        sei
        ; wyłącz przerwania CIA
        lda #$7f
        sta $dc0d
        sta $dd0d
        lda $dc0d
        lda $dd0d
        ; kopiuj zestaw znaków i sprite'y
        lda #<_charset_data
        sta src
        lda #>_charset_data
        sta src+1
        lda #<CHARSET
        sta dst
        lda #>CHARSET
        sta dst+1
        ldx #<charset_len
        lda #>charset_len
        jsr memcopy
        lda #<_sprite_data
        sta src
        lda #>_sprite_data
        sta src+1
        lda #<SPRDATA
        sta dst
        lda #>SPRDATA
        sta dst+1
        ldx #<sprite_len
        lda #>sprite_len
        jsr memcopy
        ; BASIC i KERNAL precz, I/O zostaje
        lda #$35
        sta $01
        ; wektory w RAM
        lda #<irq_entry
        sta $fffe
        lda #>irq_entry
        sta $ffff
        lda #<nmi_entry
        sta $fffa
        lda #>nmi_entry
        sta $fffb
        ; VIC: bank 3
        lda $dd02
        ora #$03
        sta $dd02
        lda $dd00
        and #$fc
        sta $dd00
        lda #$02            ; ekran $C000, znaki $C800
        sta $d018
        sta act_d018
        lda #$18            ; multicolor, 40 kolumn
        sta $d016
        lda #$17            ; 24 wiersze, ekran włączony, yscroll 7
        sta $d011
        sta act_d011
        lda #0
        sta $d020
        sta $d015
        sta $d01b
        sta $d010
        sta $d017
        sta $d01c
        sta $d01d
        sta msb_sh
        sta mc_sh
        sta xe_sh
        sta ye_sh
        sta act_n
        sta _vs_pending
        sta irq_mode
        sta _raster_max
        lda #5              ; trawa
        sta $d021
        lda #13             ; pas trawy
        sta $d022
        lda #1              ; linie
        sta $d023
        lda #0              ; wspólny kolor sprite'ów 1: czarny
        sta $d025
        lda #10             ; wspólny kolor sprite'ów 2: skóra
        sta $d026
        ; Color RAM: multicolor + czarny ("11")
        lda #$08
        ldx #0
:       sta $d800,x
        sta $d900,x
        sta $da00,x
        sta $db00,x
        inx
        bne :-
        ; przerwanie rastrowe ramki
        lda #<FRAME_LINE
        sta $d012
        lda #$97            ; bit 7 = linia >= 256
        sta $d011
        lda #$01
        sta $d01a
        lda #$ff
        sta $d019
        cli
        rts

; kopiuj src -> dst, długość X (lo) / A (hi)
memcopy:
        stx tmp_bit
        sta tmp_nbit
        ldy #0
        ldx tmp_nbit
        beq @rest
@page:  lda (src),y
        sta (dst),y
        iny
        bne @page
        inc src+1
        inc dst+1
        dex
        bne @page
@rest:  ldx tmp_bit
        beq @done
@loop:  lda (src),y
        sta (dst),y
        iny
        dex
        bne @loop
@done:  rts

nmi_entry:
        rti

; ---------------------------------------------------------------------------
; void __fastcall__ vic_draw_screen(unsigned char base_row)
; Rysuje 25 wierszy mapy od base_row do bufora NIEaktywnego (tego, którego
; nie wskazuje act_d018).
; ---------------------------------------------------------------------------
_vic_draw_screen:
        tax
        ; ustaw 25 wskaźników wierszy
        ldy #0
@setp:  lda _pitch_row_lo,x
        sta rowptr,y
        lda _pitch_row_hi,x
        sta rowptr+1,y
        inx
        iny
        iny
        cpy #50
        bne @setp
        lda act_d018
        cmp #$02
        beq @to1
        jmp draw0
@to1:   jmp draw1

.macro DRAWROWS base
        .local loop, done
        ldy #39
loop:
        .repeat 25, r
        lda (rowptr+2*r),y
        sta base+40*r,y
        .endrepeat
        dey
        bmi done
        jmp loop
done:   rts
.endmacro

draw0:  DRAWROWS SCREEN0
draw1:  DRAWROWS SCREEN1

; ---------------------------------------------------------------------------
; unsigned char read_input(void): bit0 góra, bit1 dół, bit2 lewo, bit3 prawo,
; bit4 strzał. Klawiatura W/A/S/D + spacja oraz joystick w porcie 2.
; ---------------------------------------------------------------------------
_read_input:
        lda #$ff
        sta $dc00
        lda $dc00
        eor #$ff
        and #$1f
        sta tmp_hw
        lda #$fd            ; wiersz 1: W (bit1) A (bit2) S (bit5)
        sta $dc00
        lda $dc01
        eor #$ff
        tax
        and #$02
        beq :+
        lda #$01
        ora tmp_hw
        sta tmp_hw
:       txa
        and #$04
        beq :+
        lda #$04
        ora tmp_hw
        sta tmp_hw
:       txa
        and #$20
        beq :+
        lda #$02
        ora tmp_hw
        sta tmp_hw
:       lda #$fb            ; wiersz 2: D (bit2)
        sta $dc00
        lda $dc01
        and #$04
        bne :+
        lda #$08
        ora tmp_hw
        sta tmp_hw
:       lda #$7f            ; wiersz 7: spacja (bit4)
        sta $dc00
        lda $dc01
        and #$10
        bne :+
        lda #$10
        ora tmp_hw
        sta tmp_hw
:       lda #$ff
        sta $dc00
        lda tmp_hw
        ldx #0
        rts

; ---------------------------------------------------------------------------
; Przerwania
; ---------------------------------------------------------------------------
irq_entry:
        pha
        txa
        pha
        tya
        pha
        lda irq_mode
        beq frame_irq
        jmp chain_irq

; --- przerwanie ramki (linia FRAME_LINE) ---
frame_irq:
        lda _vs_pending
        beq @noflip
        ldx #MAXVS-1
@cp:    lda _vs_y,x
        sta act_y,x
        lda _vs_xlo,x
        sta act_xlo,x
        lda _vs_xhi,x
        sta act_xhi,x
        lda _vs_ptr,x
        sta act_ptr,x
        lda _vs_col,x
        sta act_col,x
        lda _vs_flags,x
        sta act_flags,x
        dex
        bpl @cp
        lda _vs_n
        sta act_n
        lda _vs_d011
        sta act_d011
        lda _vs_d018
        sta act_d018
        lda #0
        sta _vs_pending
@noflip:
        inc _frame_count
        lda act_d011
        sta $d011
        lda act_d018
        sta $d018
        ; włącz sprite'y 0..min(n,8)-1
        ldx act_n
        cpx #8
        bcc :+
        ldx #8
:       lda en_tab,x
        sta $d015
        ; ustaw sprzętowe 0..7
        ldy #0
@set:   cpy act_n
        bcs @setdone
        cpy #8
        bcs @setdone
        tya
        tax
        jsr set_hw
        iny
        bne @set
@setdone:
        lda #8
        sta next_idx
        lda act_n
        cmp #9
        bcc @noch
        lda act_y
        clc
        adc #21
        sta $d012
        lda act_d011
        and #$7f
        sta $d011
        lda #1
        sta irq_mode
        jmp irq_done
@noch:  jsr set_frame_irq
        jmp irq_done

; --- łańcuch multipleksera ---
chain_irq:
        ldy next_idx
@loop:  tya
        and #7
        tax
        jsr set_hw          ; X = sprzętowy, Y = wpis
        iny
        sty next_idx
        cpy act_n
        bcs @end
        lda act_y-8,y       ; dół sprite'a, który zwalnia ten sprzętowy
        clc
        adc #21
        bcs @end            ; linia >= 256: reszta nie zmieści się w tej ramce
        sta tmp_line
        sec
        sbc $d012
        bcc @loop           ; linia już minęła - ustaw od razu
        cmp #3
        bcc @loop           ; za blisko - ustaw od razu
        lda tmp_line
        sta $d012
        jmp irq_done
@end:   jsr set_frame_irq
irq_done:
        asl $d019
        pla
        tay
        pla
        tax
        pla
        rti

set_frame_irq:
        lda #<FRAME_LINE
        sta $d012
        lda act_d011
        ora #$80
        sta $d011
        lda #0
        sta irq_mode
        rts

; ustaw sprite sprzętowy X (0..7) z wpisu Y listy aktywnej
set_hw:
        stx tmp_hw
        lda act_ptr,y
        sta SCREEN0+$3f8,x
        sta SCREEN1+$3f8,x
        lda act_col,y
        sta $d027,x
        lda bit_tab,x
        sta tmp_bit
        lda nbit_tab,x
        sta tmp_nbit
        ; MSB X
        lda act_xhi,y
        beq :+
        lda msb_sh
        ora tmp_bit
        bne :++
:       lda msb_sh
        and tmp_nbit
:       sta msb_sh
        sta $d010
        ; flagi
        lda act_flags,y
        lsr
        bcc :+
        lda mc_sh
        ora tmp_bit
        bne :++
:       lda mc_sh
        and tmp_nbit
:       sta mc_sh
        sta $d01c
        lda act_flags,y
        and #$02
        beq :+
        lda xe_sh
        ora tmp_bit
        bne :++
:       lda xe_sh
        and tmp_nbit
:       sta xe_sh
        sta $d01d
        lda act_flags,y
        and #$04
        beq :+
        lda ye_sh
        ora tmp_bit
        bne :++
:       lda ye_sh
        and tmp_nbit
:       sta ye_sh
        sta $d017
        txa
        asl
        tax
        lda act_xlo,y
        sta $d000,x
        lda act_y,y
        sta $d001,x
        ldx tmp_hw
        rts

; ---------------------------------------------------------------------------
; void sort_sprites(void)
; Sortuje ord[0..15] po ey[] (wstawianie; lista z poprzedniej klatki jest
; prawie posortowana) i przepisuje widoczne wpisy (ey != 255) do vs_*.
; ---------------------------------------------------------------------------
_sort_sprites:
        ldx #1
@outer: lda _ord,x
        sta tmp_v
        tay
        lda _ey,y
        sta tmp_k
        stx tmp_i
@inner: ldy tmp_i
        beq @place
        lda _ord-1,y
        tay
        lda _ey,y
        cmp tmp_k
        bcc @place
        beq @place
        ldy tmp_i
        lda _ord-1,y
        sta _ord,y
        dec tmp_i
        jmp @inner
@place: ldy tmp_i
        lda tmp_v
        sta _ord,y
        inx
        cpx #MAXVS
        bne @outer
        ; budowa listy
        ldx #0
        stx tmp_i
@build: ldy tmp_i
        cpy #MAXVS
        beq @done
        lda _ord,y
        tay
        lda _ey,y
        cmp #255
        beq @done
        sta _vs_y,x
        lda _exlo,y
        sta _vs_xlo,x
        lda _exhi,y
        sta _vs_xhi,x
        lda _eptr,y
        sta _vs_ptr,x
        lda _ecol,y
        sta _vs_col,x
        lda _efl,y
        sta _vs_flags,x
        inx
        inc tmp_i
        bne @build
@done:  stx _vs_n
        rts

; ---------------------------------------------------------------------------
; void vic_draw_rows(void): rysuje draw_count wierszy mapy od wiersza
; draw_base+draw_first do bufora draw_buf (0/1), wiersze ekranu od draw_first.
; ---------------------------------------------------------------------------
        .export _vic_draw_rows, _draw_buf, _draw_base, _draw_first, _draw_count
        .segment "BSS"
_draw_buf:   .res 1
_draw_base:  .res 1
_draw_first: .res 1
_draw_count: .res 1
        .segment "RODATA"
row_lo0: .repeat 25, r
        .byte <(SCREEN0+40*r)
        .endrepeat
row_hi0: .repeat 25, r
        .byte >(SCREEN0+40*r)
        .endrepeat
        .segment "CODE"
_vic_draw_rows:
        lda _draw_count
        beq @done
        ldx _draw_first
@row:   lda row_lo0,x
        sta dst
        lda row_hi0,x
        ldy _draw_buf
        beq :+
        clc
        adc #$04            ; SCREEN1 = SCREEN0 + $400
:       sta dst+1
        txa
        clc
        adc _draw_base
        tay
        lda _pitch_row_lo,y
        sta src
        lda _pitch_row_hi,y
        sta src+1
        ldy #39
:       lda (src),y
        sta (dst),y
        dey
        bpl :-
        inx
        dec _draw_count
        bne @row
@done:  rts
