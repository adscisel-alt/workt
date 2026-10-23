; ---------------------------------------------------------------------------
; Gorące ścieżki logiki gry w asemblerze (wywoływane z C):
;   players_move   - ruch wszystkich zawodników do celów (ptx/pty), stany
;   near_ball      - maska zawodników w zasięgu piłki
;   build_entries  - wpisy sprite'ów zawodników
;   hud_render     - tekst 4x5 px w sprite HUD
; ---------------------------------------------------------------------------
        .export _players_move, _near_ball, _build_entries, _hud_render, _hud_dst
        .export _pspd, _pface, _pmdir, _ent_top
        .import _px, _py, _ptx, _pty, _pdir, _pframe, _panim, _pstate, _ptimer
        .import _pprot, _pcool, _pcol, _ctrl, _step_count, _bx, _by
        .import _ey, _exlo, _exhi, _eptr, _ecol, _efl
        .import _glyph_of, _glyph_sh, gsh_pos_lo, gsh_pos_hi, gsh_g10_lo, gsh_g10_hi

NPL        = 12
ST_SLIDE   = 1
ST_DOWN    = 2
SPR_PLAYER = 0

; strona zerowa
dxl        = $80
dxh        = $81
dyl        = $82
dyh        = $83
adxl       = $84
adxh       = $85
adyl       = $86
adyh       = $87
tmp        = $88
tmp2       = $89
sxv        = $8a
syv        = $8b
src        = $8c            ; 2 bajty
txt        = $8e            ; 2 bajty
hdst       = $90            ; 2 bajty
maskl      = $92
maskh      = $93
pidx       = $94

        .segment "BSS"
_pspd:      .res NPL        ; indeks prędkości 0..2
_pface:     .res NPL        ; wymuszony kierunek po ruchu (255 = brak)
_pmdir:     .res NPL        ; kierunek ruchu (niezależny od wyświetlanego)
_hud_dst:   .res 2          ; adres docelowy tekstu HUD (ustawiany z C)
_ent_top:   .res 2          ; 55 - cam_y (int)

        .segment "RODATA"
; prędkości na krok logiki (25 Hz): 0 = zwykła 2.5 px, 1 = z piłką 2.25 px, 2 = bramkarz 3 px
spd_x:  .byte 0, 28, 40, 28, 0, <-28, <-40, <-28
        .byte 0, 25, 36, 25, 0, <-25, <-36, <-25
        .byte 0, 34, 48, 34, 0, <-34, <-48, <-34
spd_y:  .byte <-40, <-28, 0, 28, 40, 28, 0, <-28
        .byte <-36, <-25, 0, 25, 36, 25, 0, <-25
        .byte <-48, <-34, 0, 34, 48, 34, 0, <-34
sdx:    .byte 0, 62, 88, 62, 0, <-62, <-88, <-62
sdy:    .byte <-88, <-62, 0, 62, 88, 62, 0, <-62
sgn2dir:.byte 7, 6, 5, 0, 255, 4, 1, 2, 3
mul3:   .byte 0, 3, 6, 9, 12, 15, 18, 21
gsh_idx:.byte 0, 0, 1, 1, 2
bitt:   .byte 1,2,4,8,16,32,64,128

        .segment "CODE"
; --- 16-bit abs ---
abs_dx: lda dxl
        sta adxl
        lda dxh
        sta adxh
        bpl :+
        sec
        lda #0
        sbc adxl
        sta adxl
        lda #0
        sbc adxh
        sta adxh
:       rts
abs_dy: lda dyl
        sta adyl
        lda dyh
        sta adyh
        bpl :+
        sec
        lda #0
        sbc adyl
        sta adyl
        lda #0
        sbc adyh
        sta adyh
:       rts

; dx = ptx[x] - px[x]; dy = pty[x] - py[x]   (X = indeks * 2)
calc_d: sec
        lda _ptx,x
        sbc _px,x
        sta dxl
        lda _ptx+1,x
        sbc _px+1,x
        sta dxh
        sec
        lda _pty,x
        sbc _py,x
        sta dyl
        lda _pty+1,x
        sbc _py+1,x
        sta dyh
        rts

; ---------------------------------------------------------------------------
; void players_move(void)
; ---------------------------------------------------------------------------
_players_move:
        lda #0
        sta pidx
@loop:  ldx pidx
        lda _pprot,x
        beq :+
        dec _pprot,x
:       lda _pcool,x
        beq :+
        dec _pcool,x
:       lda _pstate,x
        cmp #ST_SLIDE
        bne @notslide
        ; wślizg: ruch w kierunku pdir z dużą prędkością
        ldy _pdir,x
        lda sdx,y
        sta sxv
        lda sdy,y
        sta syv
        txa
        asl
        tax
        jsr add_sx_sy
        ldx pidx
        dec _ptimer,x
        bne @clamp
        lda #ST_DOWN
        sta _pstate,x
        lda #16
        sta _ptimer,x
        jmp @clamp
@notslide:
        cmp #ST_DOWN
        bne @normal
        lda _ptimer,x
        beq :+
        dec _ptimer,x
        bne @clamp
:       lda #0
        sta _pstate,x
        jmp @clamp
@normal:
        cpx _ctrl
        beq @clamp          ; gracz: ruch w C
        jsr move_towards
        ldy pidx
        lda _pface,y
        bmi @clamp
        sta _pdir,y
@clamp: ldy pidx
        tya
        asl
        tax
        jsr clamp_player
        inc pidx
        lda pidx
        cmp #NPL
        bne @loop
        rts

; px[x] += sxv (ze znakiem), py[x] += syv   (X = indeks*2)
add_sx_sy:
        lda sxv
        bpl :+
        clc
        adc _px,x
        sta _px,x
        lda _px+1,x
        adc #$ff
        sta _px+1,x
        jmp @y
:       clc
        adc _px,x
        sta _px,x
        lda _px+1,x
        adc #0
        sta _px+1,x
@y:     lda syv
        bpl :+
        clc
        adc _py,x
        sta _py,x
        lda _py+1,x
        adc #$ff
        sta _py+1,x
        rts
:       clc
        adc _py,x
        sta _py,x
        lda _py+1,x
        adc #0
        sta _py+1,x
        rts

; ograniczenie do świata: x 96..5008, y 240..10496 (fp)   (X = indeks*2)
clamp_player:
        lda _px+1,x
        bne :+
        lda _px,x
        cmp #96
        bcs :+
        lda #96
        sta _px,x
:       lda _px+1,x
        cmp #>5008
        bcc :++
        bne :+
        lda _px,x
        cmp #<5008
        bcc :++
:       lda #<5008
        sta _px,x
        lda #>5008
        sta _px+1,x
:       lda _py+1,x
        bne :+
        lda _py,x
        cmp #240
        bcs :+
        lda #240
        sta _py,x
:       lda _py+1,x
        cmp #>10496
        bcc :++
        bne :+
        lda _py,x
        cmp #<10496
        bcc :++
:       lda #<10496
        sta _py,x
        lda #>10496
        sta _py+1,x
:       rts

; --- ruch zawodnika pidx do celu ---
move_towards:
        lda pidx
        asl
        tax
        jsr calc_d
        jsr abs_dx
        jsr abs_dy
        ; strefa martwa: |dx| < 24 i |dy| < 24
        lda adxh
        bne @go
        lda adyh
        bne @go
        lda adxl
        cmp #32
        bcs @go
        lda adyl
        cmp #32
        bcs @go
        ldy pidx
        lda #0
        sta _pframe,y
        rts
@go:    ldy pidx
        lda _pframe,y
        beq @newdir
        tya
        clc
        adc _step_count
        and #3
        bne @havedir
@newdir:
        jsr vec2dir
        cmp #255
        bne :+
        ldy pidx
        lda #0
        sta _pframe,y
        rts
:       ldy pidx
        sta _pmdir,y
@havedir:
        ldy pidx
        lda _pmdir,y
        sta _pdir,y
        lda _pspd,y
        asl
        asl
        asl
        clc
        adc _pmdir,y
        tax
        lda spd_x,x
        sta sxv
        lda spd_y,x
        sta syv
        lda pidx
        asl
        tax
        ; oś X
        lda sxv
        beq @ydo
        bmi @xneg
        lda dxh
        bne @xadd           ; dx >= 256
        lda dxl
        cmp sxv
        beq @xsnap
        bcs @xadd
@xsnap: lda _ptx,x
        sta _px,x
        lda _ptx+1,x
        sta _px+1,x
        jmp @ydo
@xneg:  lda dxh
        cmp #$ff
        bne @xadd           ; dx <= -256
        lda dxl
        cmp sxv
        bcs @xsnap
@xadd:  lda syv
        pha
        lda #0
        sta syv
        jsr add_sx_sy
        pla
        sta syv
@ydo:   lda syv
        beq @anim
        bmi @yneg
        lda dyh
        bne @yadd
        lda dyl
        cmp syv
        beq @ysnap
        bcs @yadd
@ysnap: lda _pty,x
        sta _py,x
        lda _pty+1,x
        sta _py+1,x
        jmp @anim
@yneg:  lda dyh
        cmp #$ff
        bne @yadd
        lda dyl
        cmp syv
        bcs @ysnap
@yadd:  lda #0
        sta sxv
        jsr add_sx_sy
@anim:  ldx pidx
        inc _panim,x
        lda _panim,x
        cmp #3
        bcc @ret
        lda #0
        sta _panim,x
        lda _pframe,x
        cmp #1
        bne @one
        lda #2
        sta _pframe,x
        rts
@one:   lda #1
        sta _pframe,x
@ret:   rts

; kierunek 8-stronny z dx/dy (wynik w A, 255 = brak)
vec2dir:
        lda #1              ; (sx+1)
        sta tmp
        lda adyh
        lsr
        sta tmp2
        lda adyl
        ror
        cmp adxl
        lda tmp2
        sbc adxh            ; (ady/2) - adx < 0  <=> adx > ady/2
        bcs @sy
        lda dxh
        bmi :+
        lda #2
        sta tmp
        bne @sy
:       lda #0
        sta tmp
@sy:    lda #1
        sta tmp2
        lda adxh
        lsr
        sta sxv
        lda adxl
        ror
        cmp adyl
        lda sxv
        sbc adyh
        bcs @done
        lda dyh
        bmi :+
        lda #2
        sta tmp2
        bne @done
:       lda #0
        sta tmp2
@done:  lda tmp
        asl
        adc tmp
        adc tmp2
        tax
        lda sgn2dir,x
        rts

; ---------------------------------------------------------------------------
; unsigned int near_ball(void)  - bit i = zawodnik i w prostokącie wokół piłki
; (|bx-px| < r i |by-py+64| < r; r = 192 dla wślizgu, 144 inaczej)
; ---------------------------------------------------------------------------
_near_ball:
        lda #0
        sta maskl
        sta maskh
        sta pidx
@loop:  lda pidx
        asl
        tax
        sec
        lda _bx
        sbc _px,x
        sta dxl
        lda _bx+1
        sbc _px+1,x
        sta dxh
        sec
        lda _by
        sbc _py,x
        sta dyl
        lda _by+1
        sbc _py+1,x
        sta dyh
        clc
        lda dyl
        adc #64
        sta dyl
        bcc :+
        inc dyh
:       jsr abs_dx
        jsr abs_dy
        lda adxh
        bne @next
        lda adyh
        bne @next
        ldy pidx
        lda _pstate,y
        cmp #ST_SLIDE
        beq :+
        lda #144
        bne :++
:       lda #192
:       sta tmp
        lda adxl
        cmp tmp
        bcs @next
        lda adyl
        cmp tmp
        bcs @next
        ldy pidx
        cpy #8
        bcs :+
        lda bitt,y
        ora maskl
        sta maskl
        bne @next
:       lda bitt-8,y
        ora maskh
        sta maskh
@next:  inc pidx
        lda pidx
        cmp #NPL
        bne @loop
        lda maskl
        ldx maskh
        rts

; ---------------------------------------------------------------------------
; void build_entries(void) - wpisy sprite'ów zawodników 0..11
; sy = (py>>4) + ent_top - 21 ; sx = (px>>4) + 12
; ---------------------------------------------------------------------------
_build_entries:
        lda #0
        sta pidx
@loop:  lda pidx
        asl
        tax
        lda _py+1,x
        lsr
        sta dyh
        lda _py,x
        ror
        lsr dyh
        ror
        lsr dyh
        ror
        lsr dyh
        ror
        clc
        adc _ent_top
        sta dyl
        lda dyh
        adc _ent_top+1
        sta dyh
        sec
        lda dyl
        sbc #21
        sta dyl
        lda dyh
        sbc #0
        bne @hide           ; ujemne lub >= 256
        lda dyl
        cmp #35
        bcc @hide
        cmp #247
        bcs @hide
        ldy pidx
        sta _ey,y
        lda _px+1,x
        lsr
        sta dxh
        lda _px,x
        ror
        lsr dxh
        ror
        lsr dxh
        ror
        lsr dxh
        ror
        clc
        adc #12
        sta _exlo,y
        lda dxh
        adc #0
        sta _exhi,y
        lda _pstate,y
        cmp #ST_SLIDE
        bne :+
        lda #1
        bne @f
:       cmp #ST_DOWN
        bne :+
        lda #2
        bne @f
:       lda _pframe,y
@f:     sta tmp
        ldx _pdir,y
        lda mul3,x
        clc
        adc tmp
        adc #128+SPR_PLAYER
        sta _eptr,y
        lda _pcol,y
        sta _ecol,y
        lda #1
        sta _efl,y
        jmp @next
@hide:  ldy pidx
        lda #255
        sta _ey,y
@next:  inc pidx
        lda pidx
        cmp #NPL
        beq :+
        jmp @loop
:       rts

; ---------------------------------------------------------------------------
; void __fastcall__ hud_render(const char *text)  - do 5 znaków pod hud_dst
; ---------------------------------------------------------------------------
_hud_render:
        sta txt
        stx txt+1
        lda _hud_dst
        sta hdst
        lda _hud_dst+1
        sta hdst+1
        lda #0
        ldy #14
:       sta (hdst),y
        dey
        bpl :-
        lda #0
        sta pidx            ; pozycja znaku
@pos:   ldy pidx
        lda (txt),y
        beq @done
        and #$7f
        tay
        lda _glyph_of,y
        tay
        ldx pidx
        clc
        lda gsh_pos_lo,x
        adc gsh_g10_lo,y
        sta src
        lda gsh_pos_hi,x
        adc gsh_g10_hi,y
        sta src+1
        lda gsh_idx,x
        sta tmp             ; bajt docelowy w wierszu
        ldx #0              ; indeks w glifie (0..9)
@row:   txa
        tay
        lda (src),y
        ldy tmp
        ora (hdst),y
        sta (hdst),y
        inx
        txa
        tay
        lda (src),y
        ldy tmp
        iny
        ora (hdst),y
        sta (hdst),y
        inx
        lda tmp
        clc
        adc #3
        sta tmp
        cpx #10
        bne @row
        inc pidx
        lda pidx
        cmp #5
        bne @pos
@done:  rts

; ---------------------------------------------------------------------------
; Odległości (px, przybliżenie max + min/2, obcięte do 255)
; ---------------------------------------------------------------------------
        .export _dist_pb, _dist_pp, _dist_b, _nearest_to_ball_asm, _skip_idx
        .segment "BSS"
_dist_b:    .res 1
_skip_idx:  .res 1
        .segment "CODE"
; wspólne: dxl/dxh, dyl/dyh -> A = odległość px
dist_fin:
        jsr abs_dx
        jsr abs_dy
        ; max/min
        lda adxh
        cmp adyh
        bne :+
        lda adxl
        cmp adyl
:       bcs @xmax
        ; ady większe: d = ady + adx/2
        lsr adxh
        ror adxl
        clc
        lda adyl
        adc adxl
        sta tmp
        lda adyh
        adc adxh
        jmp @out
@xmax:  lsr adyh
        ror adyl
        clc
        lda adxl
        adc adyl
        sta tmp
        lda adxh
        adc adyh
@out:   ; (A:tmp) >> 4 -> px, obcięcie
        cmp #$10
        bcs @cap
        lsr
        ror tmp
        lsr
        ror tmp
        lsr
        ror tmp
        lsr
        ror tmp
        lda tmp
        ldx #0
        rts
@cap:   lda #255
        ldx #0
        rts

; unsigned char dist_pb(unsigned char p): odległość zawodnika od piłki
_dist_pb:
        asl
        tax
        sec
        lda _bx
        sbc _px,x
        sta dxl
        lda _bx+1
        sbc _px+1,x
        sta dxh
        sec
        lda _by
        sbc _py,x
        sta dyl
        lda _by+1
        sbc _py+1,x
        sta dyh
        jmp dist_fin

; unsigned char dist_pp(unsigned char a): odległość zawodnika a od zawodnika dist_b
_dist_pp:
        asl
        tax
        lda _dist_b
        asl
        tay
        sec
        lda _px,y
        sbc _px,x
        sta dxl
        lda _px+1,y
        sbc _px+1,x
        sta dxh
        sec
        lda _py,y
        sbc _py,x
        sta dyl
        lda _py+1,y
        sbc _py+1,x
        sta dyh
        jmp dist_fin

; unsigned char nearest_to_ball_asm(unsigned char team): najbliższy piłce
; zawodnik z pola (stan 0, != skip_idx) lub 255
_nearest_to_ball_asm:
        tax
        beq :+
        lda #6
:       clc
        adc #1
        sta pidx            ; pierwszy zawodnik z pola
        clc
        adc #5
        sta tmp2            ; koniec (wyłącznie)
        lda #255
        sta maskl           ; najlepsza odległość
        sta maskh           ; najlepszy indeks
@loop:  ldx pidx
        cpx _skip_idx
        beq @next
        lda _pstate,x
        bne @next
        txa
        jsr _dist_pb
        cmp maskl
        bcs @next
        sta maskl
        lda pidx
        sta maskh
@next:  inc pidx
        lda pidx
        cmp tmp2
        bne @loop
        lda maskh
        ldx #0
        rts

; ---------------------------------------------------------------------------
; void build_misc_entries(void): wpisy 12 (piłka), 13 (cień), 14 (HUD), 15 (komunikat)
; ---------------------------------------------------------------------------
        .export _build_misc_entries, _msg_on
        .import _bz
        .segment "BSS"
_msg_on:    .res 1
        .segment "CODE"
_build_misc_entries:
        ; sx = (bx>>4) + 20
        lda _bx+1
        lsr
        sta dxh
        lda _bx
        ror
        lsr dxh
        ror
        lsr dxh
        ror
        lsr dxh
        ror
        clc
        adc #20
        sta dxl
        lda dxh
        adc #0
        sta dxh
        ; sy = (by>>4) + ent_top - 1
        lda _by+1
        lsr
        sta dyh
        lda _by
        ror
        lsr dyh
        ror
        lsr dyh
        ror
        lsr dyh
        ror
        clc
        adc _ent_top
        sta dyl
        lda dyh
        adc _ent_top+1
        sta dyh
        lda dyl
        sec
        sbc #1
        sta dyl
        bcs :+
        dec dyh
:       ; cień (wpis 13)
        ldy #13
        lda dyh
        bne @hide13
        lda dyl
        cmp #35
        bcc @hide13
        cmp #247
        bcs @hide13
        sta _ey,y
        lda dxl
        sta _exlo,y
        lda dxh
        sta _exhi,y
        lda #128+25
        sta _eptr,y
        lda #0
        sta _ecol,y
        sta _efl,y
        jmp @ball
@hide13:
        lda #255
        sta _ey,y
@ball:  ; sy -= 3 + (bz>>4)
        lda _bz+1
        lsr
        sta tmp2
        lda _bz
        ror
        lsr tmp2
        ror
        lsr tmp2
        ror
        lsr tmp2
        ror
        clc
        adc #3
        sta tmp
        sec
        lda dyl
        sbc tmp
        sta dyl
        lda dyh
        sbc tmp2
        sta dyh
        ldy #12
        bne @hide12
        lda dyl
        cmp #35
        bcc @hide12
        cmp #247
        bcs @hide12
        sta _ey,y
        lda dxl
        sta _exlo,y
        lda dxh
        sta _exhi,y
        lda #128+24
        sta _eptr,y
        lda #1
        sta _ecol,y
        sta _efl,y
        jmp @hud
@hide12:
        lda #255
        sta _ey,y
@hud:   ldy #14
        lda #50
        sta _ey,y
        lda #28
        sta _exlo,y
        lda #0
        sta _exhi,y
        lda #128+26
        sta _eptr,y
        lda #1
        sta _ecol,y
        lda #2
        sta _efl,y
        ldy #15
        lda _msg_on
        beq @nomsg
        lda #125
        sta _ey,y
        lda #136
        sta _exlo,y
        lda #0
        sta _exhi,y
        lda #128+27
        sta _eptr,y
        lda #7
        sta _ecol,y
        lda #6              ; hires, rozciągnięty w obu osiach
        sta _efl,y
        rts
@nomsg: lda #255
        sta _ey,y
        rts
