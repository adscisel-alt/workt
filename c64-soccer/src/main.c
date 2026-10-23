/*
 * C64 Soccer - prototyp meczu 6 na 6 w stylu Microprose Soccer.
 * Logika gry (C, cc65). Warstwa sprzętowa: vic.s, grafika: gfx.s (generowana).
 *
 * Jednostki: pozycje i prędkości w 1/16 piksela ("fp"). Świat: 320 x 672 px,
 * boisko od (16,24) do (303,647), bramki na górze i dole między x=128..191.
 */
#include "gfx.h"

/* ---- interfejs do vic.s ---- */
extern void vic_init(void);
extern void __fastcall__ vic_draw_screen(unsigned char base_row);
extern unsigned char read_input(void);
extern unsigned char vs_n, vs_y[], vs_xlo[], vs_xhi[], vs_ptr[], vs_col[], vs_flags[];
extern unsigned char vs_d011, vs_d018, vs_pending, frame_count, raster_max;

#define VIC_RASTER (*(volatile unsigned char *)0xD012)
#define VIC_CTRL1  (*(volatile unsigned char *)0xD011)
#define VIC_BORDER (*(volatile unsigned char *)0xD020)
#define SPRMEM ((unsigned char *)0xE000)

/* ---- stałe świata ---- */
#define FP(v) ((v) * 16)
#define PITCH_X0 16
#define PITCH_X1 303
#define PITCH_Y0 24
#define PITCH_Y1 647
#define GOAL_X0 128
#define GOAL_X1 191
#define GOAL_CX 160
#define NET_TOP 11
#define NET_BOT 660
#define CAM_MAX 479
#define CROSSBAR 22          /* wysokość poprzeczki w px */

#define NPL 12
#define TEAM_SIZE 6
#define NONE 255

#define ST_NORMAL 0
#define ST_SLIDE 1
#define ST_DOWN 2

#define INP_UP 1
#define INP_DOWN 2
#define INP_LEFT 4
#define INP_RIGHT 8
#define INP_FIRE 16

/* Logika działa 25 razy na sekundę (co drugą ramkę); jednostka czasu = krok 40 ms */
#define GRAV 4

/* ---- tabele kierunków (0=góra, zgodnie z ruchem wskazówek) ---- */
static const signed char dirx[8] = { 0, 11, 16, 11, 0, -11, -16, -11 };
static const signed char diry[8] = { -16, -11, 0, 11, 16, 11, 0, -11 };
static const signed char dirx6[8] = { 0, 66, 96, 66, 0, -66, -96, -66 };
static const signed char diry6[8] = { -96, -66, 0, 66, 96, 66, 0, -66 };
static const signed char pdx[8] = { 0, 28, 40, 28, 0, -28, -40, -28 };
static const signed char pdy[8] = { -40, -28, 0, 28, 40, 28, 0, -28 };
/* wejście (bity: góra 1, dół 2, lewo 4, prawo 8) -> kierunek */
static const unsigned char inp2dir[16] = {
    NONE, 0, 4, NONE, 6, 7, 5, NONE, 2, 1, 3, NONE, NONE, NONE, NONE, NONE
};
/* (sx+1)*3 + (sy+1) -> kierunek */
static const unsigned char sgn2dir[9] = { 7, 6, 5, 0, NONE, 4, 1, 2, 3 };
/* formacja: x oraz odległość od własnej bramki (px) dla zawodników 1..5 */
static const unsigned int form_x[5] = { 96, 224, 80, 240, 160 };
static const unsigned int form_y[5] = { 120, 120, 290, 290, 450 };

/* ---- zawodnicy ---- */
int px[NPL], py[NPL];
int ptx[NPL], pty[NPL];
unsigned char pdir[NPL], pframe[NPL], panim[NPL], pstate[NPL], ptimer[NPL], pprot[NPL], pcool[NPL];
static const unsigned char pteam[NPL] = { 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1 };
unsigned char pcol[NPL];
/* procedury w game.s */
extern void players_move(void);
extern unsigned int near_ball(void);
extern void build_entries(void);
extern void build_misc_entries(void);
extern unsigned char msg_on;
extern void __fastcall__ hud_render(const char *text);
extern unsigned char pspd[NPL], pface[NPL];
extern unsigned char *hud_dst;
extern int ent_top;
extern unsigned char __fastcall__ dist_pb(unsigned char p);
extern unsigned char __fastcall__ dist_pp(unsigned char a);
extern unsigned char dist_b, skip_idx;
extern unsigned char __fastcall__ nearest_to_ball_asm(unsigned char team);
extern void vic_draw_rows(void);
extern unsigned char draw_buf, draw_base, draw_first, draw_count;

/* ---- piłka ---- */
int bx, by, bz, bvx, bvy, bvz;
signed char bcurl;
unsigned char owner, kicker, kick_timer, last_team, kdir;

/* ---- mecz ---- */
static unsigned char att_up[2];     /* 1 = drużyna atakuje górną bramkę */
unsigned char score[2];
static unsigned char minute, second, half;
static unsigned char min_t, min_o, sec_t, sec_o;   /* cyfry zegara */
static unsigned char sec_frames;
unsigned char ctrl;                 /* zawodnik sterowany przez gracza */
static unsigned char inp, inp_prev, charge;
static unsigned char msg_timer, msg_kind;   /* 1 GOAL! 2 KONIEC 3 POŁOWA */
static unsigned char pause_timer;   /* przerwa w grze (bramka, koniec) */
static unsigned char match_over;
int cam_y;
static unsigned char shown_row, back_row, back_done;
static int cam_prev;
static unsigned char think_idx;
static unsigned char rnd_state;
static unsigned char hud_dirty;
unsigned char dbg_skips;      /* ramki pominięte przez zbyt długą logikę */
unsigned char step_count;     /* licznik kroków logiki (25 Hz) */
#ifdef DEBUG
unsigned int dbg_lines_max, dbg_lines_last;   /* czas logiki w liniach rastra (63 cykle) */
unsigned int dbg_sec[8];                       /* profil sekcji (linie, ostatni krok) */
static unsigned int dbg_l0;
static unsigned int raster_line(void) { unsigned int r = VIC_RASTER; if (VIC_CTRL1 & 0x80) r += 256; return r; }
static void dbg_start(void) { dbg_l0 = raster_line(); }
static unsigned int dbg_elapsed(void) { unsigned int l1 = raster_line(); if (l1 < dbg_l0) l1 += 312; return l1 - dbg_l0; }
#define SEC(k) do { dbg_sec[k] = dbg_elapsed(); dbg_start(); } while (0)
#else
#define SEC(k)
#endif

/* ---- lista sprite'ów ---- */
#define VS_BALL 12
#define VS_SHADOW 13
#define VS_HUD 14
#define VS_MSG 15
unsigned char ey[16], exlo[16], exhi[16], eptr[16], ecol[16], efl[16], ord[16];
extern void sort_sprites(void);
unsigned char glyph_of[128];

/* =========================================================================
 * Narzędzia
 * ========================================================================= */
static unsigned char rnd(void)
{
    rnd_state ^= rnd_state << 3;
    rnd_state ^= rnd_state >> 5;
    rnd_state ^= rnd_state << 1;
    rnd_state += 0x3B;
    return rnd_state;
}

#define iabs(v) ((v) < 0 ? -(v) : (v))

/* kierunek 8-stronny od wektora (fp) */
static unsigned char vec2dir(int dx, int dy)
{
    int adx, ady;
    signed char sx = 0, sy = 0;
    adx = iabs(dx); ady = iabs(dy);
    if (adx > (ady >> 1)) sx = dx > 0 ? 1 : -1;
    if (ady > (adx >> 1)) sy = dy > 0 ? 1 : -1;
    return sgn2dir[(sx + 1) * 3 + (sy + 1)];
}

/* =========================================================================
 * HUD w sprite'ach
 * ========================================================================= */
static void font_init(void)
{
    const char *f = FONT_CHARS;
    unsigned char i;
    /* cc65 zapisuje literały w PETSCII (litery >= $C1); hud_render maskuje bit 7 */
    for (i = 0; i < 128; ++i) glyph_of[i] = 13;   /* spacja */
    for (i = 0; f[i]; ++i) glyph_of[(unsigned char)f[i] & 0x7f] = i;
}

/* wypisz tekst (do 5 znaków) w sprite nr spr, od wiersza row */
static void hud_text(unsigned char spr, unsigned char row, const char *s)
{
    hud_dst = SPRMEM + spr * 64 + row * 3;
    hud_render(s);
}

static void hud_update(void)
{
    char buf[6];
    if (hud_dirty & 2) {
        buf[0] = ' '; buf[1] = '0' + score[0]; buf[2] = '-'; buf[3] = '0' + score[1]; buf[4] = 0;
        hud_text(SPR_HUD, 6, buf);
    }
    buf[0] = '0' + min_t; buf[1] = '0' + min_o; buf[2] = ':';
    buf[3] = '0' + sec_t; buf[4] = '0' + sec_o; buf[5] = 0;
    hud_text(SPR_HUD, 14, buf);
    hud_dirty = 0;
}

static void show_msg(unsigned char kind, unsigned char frames)
{
    msg_kind = kind;
    msg_timer = frames;
    if (kind == 1) hud_text(SPR_HUD + 1, 8, "GOAL!");
    else if (kind == 2) hud_text(SPR_HUD + 1, 8, " END ");
    else hud_text(SPR_HUD + 1, 8, "HALF ");
}

/* =========================================================================
 * Ustawienie drużyn
 * ========================================================================= */
static unsigned int own_goal_y(unsigned char team)
{
    return att_up[team] ? PITCH_Y1 : PITCH_Y0;
}

static void place_player(unsigned char p, unsigned int x, unsigned int y)
{
    px[p] = FP(x); py[p] = FP(y);
    ptx[p] = px[p]; pty[p] = py[p];
    pstate[p] = ST_NORMAL; ptimer[p] = 0; pframe[p] = 0;
    pdir[p] = att_up[pteam[p]] ? 0 : 4;
}

static void kickoff(unsigned char team_with_ball)
{
    unsigned char t, i, p;
    for (t = 0; t < 2; ++t) {
        unsigned int gy = own_goal_y(t);
        p = t * TEAM_SIZE;
        place_player(p, GOAL_CX, att_up[t] ? gy - 8 : gy + 8);
        for (i = 0; i < 5; ++i) {
            unsigned int fy = form_y[i];
            if (fy > 250) fy = 250;          /* wszyscy na własnej połowie, poza kołem */
            if (t == team_with_ball && i == 4) fy = 312;
            place_player(p + 1 + i, form_x[i], att_up[t] ? gy - fy : gy + fy);
        }
    }
    bx = FP(GOAL_CX); by = FP(336); bz = 0; bvx = bvy = bvz = 0; bcurl = 0;
    owner = team_with_ball * TEAM_SIZE + 5;
    px[owner] = bx; py[owner] = by + (att_up[team_with_ball] ? FP(6) : -FP(6));
    pprot[owner] = 15;
    kicker = NONE; kick_timer = 0; last_team = team_with_ball;
    ctrl = 5;
    for (i = 0; i < NPL; ++i) { pcool[i] = 0; ptx[i] = px[i]; pty[i] = py[i]; }
}

/* =========================================================================
 * Piłka: posiadanie, kopnięcia
 * ========================================================================= */
static void give_ball(unsigned char p)
{
    owner = p;
    bvx = bvy = bvz = 0; bz = 0; bcurl = 0;
    pprot[p] = 12;
    last_team = pteam[p];
    kicker = NONE;
    if (pteam[p] == 0 && p != 0) ctrl = p;
}

static void ball_at_feet(unsigned char p)
{
    bx = px[p] + dirx6[pdir[p]];
    by = py[p] + diry6[pdir[p]];
    bz = 0;
}

static void start_flight(unsigned char p)
{
    owner = NONE;
    kicker = p; kick_timer = 0; kdir = pdir[p];
    last_team = pteam[p];
    bcurl = 0;
    pcool[p] = 5;
}

/* kopnięcie w kierunku 8-stronnym */
static void kick_dir(unsigned char p, unsigned char dir, unsigned char power, unsigned char loft)
{
    ball_at_feet(p);
    bvx = (dirx[dir] * (int)power) >> 4;
    bvy = (diry[dir] * (int)power) >> 4;
    bvz = loft;
    start_flight(p);
}

/* kopnięcie do punktu świata (px) - używane przez komputer */
static void kick_towards(unsigned char p, int tx, int ty, unsigned char power, unsigned char loft)
{
    int dx = tx - (int)((unsigned)px[p] >> 4), dy = ty - (int)((unsigned)py[p] >> 4);
    unsigned int adx, ady, d, ux, uy;
    adx = iabs(dx); ady = iabs(dy);
    d = adx > ady ? adx + (ady >> 1) : ady + (adx >> 1);
    if (d == 0) d = 1;
    ux = ((adx << 6) / d * power) >> 6;
    uy = ((ady << 6) / d * power) >> 6;
    ball_at_feet(p);
    bvx = dx < 0 ? -(int)ux : (int)ux;
    bvy = dy < 0 ? -(int)uy : (int)uy;
    bvz = loft;
    pdir[p] = vec2dir(dx, dy);
    start_flight(p);
}

static void ball_physics(void)
{
    if (owner != NONE) { ball_at_feet(owner); return; }
    if (kick_timer < 255) ++kick_timer;
    /* podkręcenie (banan) */
    if (bcurl && (bvx || bvy)) {
        int ox = bvx;
        bvx += (bvy * bcurl) >> 6;
        bvy -= (ox * bcurl) >> 6;
    }
    bx += bvx; by += bvy;
    if (bz > 0 || bvz > 0) {
        bz += bvz; bvz -= GRAV;
        if (bz <= 0) {
            bz = 0;
            bvz = -bvz >> 1;
            if (bvz < 12) bvz = 0;
            bvx -= bvx >> 3; bvy -= bvy >> 3;
        }
    } else {
        bvx -= bvx >> 4; bvy -= bvy >> 4;
        if (bvx > 1) bvx -= 2; else if (bvx < -1) bvx += 2; else bvx = 0;
        if (bvy > 1) bvy -= 2; else if (bvy < -1) bvy += 2; else bvy = 0;
    }
    /* krawędzie świata */
    if (bx < FP(4)) { bx = FP(4); bvx = -bvx >> 1; }
    if (bx > FP(315)) { bx = FP(315); bvx = -bvx >> 1; }
    if (by < FP(NET_TOP)) { by = FP(NET_TOP); bvx = bvx >> 2; bvy = 0; }
    if (by > FP(NET_BOT)) { by = FP(NET_BOT); bvx = bvx >> 2; bvy = 0; }
}

/* =========================================================================
 * Zawodnicy
 * ========================================================================= */
static void run_dir(unsigned char p, unsigned char d)
{
    pdir[p] = d;
    px[p] += pdx[d]; py[p] += pdy[d];
    if (++panim[p] >= 3) { panim[p] = 0; pframe[p] = pframe[p] == 1 ? 2 : 1; }
}

static void start_slide(unsigned char p)
{
    pstate[p] = ST_SLIDE; ptimer[p] = 6; pcool[p] = 20;
}

/* próba przejęcia piłki przez zawodnika p (piłka wolna lub u przeciwnika) */
static void try_take(unsigned char p)
{
    if (p == kicker && kick_timer < 7) return;
    if (pcool[p] && pstate[p] != ST_SLIDE) return;
    if (owner != NONE) {
        if (pteam[owner] == pteam[p]) return;
        if (pprot[owner] && pstate[p] != ST_SLIDE) return;
    }
    {
        if (owner != NONE) { pcool[owner] = 10; pstate[owner] = ST_DOWN; ptimer[owner] = 7; }
        give_ball(p);
        if (pstate[p] == ST_SLIDE) {
            /* wślizg wybija piłkę do przodu */
            kick_dir(p, pdir[p], 80, 0);
            pcool[p] = 5;
        }
    }
}

/* ---- AI: cel formacji ---- */
static void formation_target(unsigned char p)
{
    unsigned char t = pteam[p], i = p - t * TEAM_SIZE - 1;
    int gy = own_goal_y(t);
    int ty, tx;
    int fy = form_y[i];
    int ballpull = ((by >> 4) - 336) >> 1;
    ty = att_up[t] ? gy - fy : gy + fy;
    ty += ballpull;
    if (ty < PITCH_Y0 + 12) ty = PITCH_Y0 + 12;
    if (ty > PITCH_Y1 - 12) ty = PITCH_Y1 - 12;
    tx = form_x[i] + (((bx >> 4) - GOAL_CX) / 3);
    ptx[p] = FP(tx); pty[p] = FP(ty);
}

static unsigned char nearest_to_ball(unsigned char team, unsigned char skip)
{
    skip_idx = skip;
    return nearest_to_ball_asm(team);
}

/* ---- AI: decyzja zawodnika z pola (co kilka klatek) ---- */
static void ai_think(unsigned char p)
{
    unsigned char t = pteam[p];
    if (p == t * TEAM_SIZE) return;                 /* bramkarz - osobno */
    if (t == 0 && p == ctrl) return;                /* gracz */
    if (pstate[p] != ST_NORMAL) return;

    if (owner == p) {
        /* mamy piłkę: strzał, podanie lub drybling */
        int gy = att_up[t] ? PITCH_Y0 : PITCH_Y1;
        unsigned int dgoal = iabs((py[p] >> 4) - gy);
        unsigned char i, threat = 0, best = NONE;
        int bestscore = -32000;
        dist_b = p;
        for (i = (1 - t) * TEAM_SIZE; i < (1 - t) * TEAM_SIZE + TEAM_SIZE; ++i)
            if (dist_pp(i) < 22) { threat = 1; break; }
        if (dgoal < 130 && iabs((px[p] >> 4) - GOAL_CX) < 90) {
            kick_towards(p, GOAL_CX - 20 + (rnd() % 41), gy, 200 + (rnd() & 31), (rnd() & 1) ? 20 : 0);
            return;
        }
        if (threat || (rnd() & 31) == 0) {
            for (i = t * TEAM_SIZE + 1; i < t * TEAM_SIZE + TEAM_SIZE; ++i) {
                int sc;
                unsigned int d;
                if (i == p) continue;
                d = dist_pp(i);
                if (d < 40 || d > 230) continue;
                sc = att_up[t] ? -(py[i] >> 4) : (py[i] >> 4);
                sc -= d >> 1;
                if (sc > bestscore) { bestscore = sc; best = i; }
            }
            if (best != NONE) {
                unsigned int d = dist_pp(best);
                unsigned char pw = 72 + d;
                if (pw > 190) pw = 190;
                kick_towards(p, px[best] >> 4, py[best] >> 4, pw, d > 150 ? 40 : 0);
                return;
            }
        }
        ptx[p] = FP(GOAL_CX + ((rnd() & 63) - 32));
        pty[p] = FP(gy);
        return;
    }
    if (owner == NONE || pteam[owner] != t) {
        /* piłka wolna lub u przeciwnika: najbliższy goni */
        if (nearest_to_ball(t, NONE) == p) {
            ptx[p] = bx + bvx * 3; pty[p] = by + bvy * 3;
            if (owner != NONE && t == 1 && pcool[p] == 0 && pprot[owner] == 0 &&
                dist_pb(p) < 16 && (rnd() & 3) == 0)
                start_slide(p);
            return;
        }
    }
    formation_target(p);
}

/* ---- bramkarz ---- */
static void keeper_update(unsigned char p)
{
    unsigned char t = pteam[p];
    int gy = own_goal_y(t);
    int tx = bx, ty = att_up[t] ? FP(gy - 8) : FP(gy + 8);
    int dgoal = by - FP(gy);
    unsigned char dpb;
    if (pstate[p] != ST_NORMAL) return;        /* leży po wślizgu/faulu */
    dgoal = iabs(dgoal);
    if (owner == p) {
        ++ptimer[p];
        if (ptimer[p] > 18) {
            unsigned char best = p + 1, i;
            unsigned int bd = 0;
            /* wykop do najdalej wysuniętego kolegi */
            for (i = t * TEAM_SIZE + 1; i < t * TEAM_SIZE + TEAM_SIZE; ++i) {
                int d = py[i] - FP(gy);
                d = iabs(d);
                if ((unsigned int)d > bd) { bd = d; best = i; }
            }
            pdir[p] = att_up[t] ? 0 : 4;
            kick_towards(p, (int)((unsigned)px[best] >> 4) + (rnd() & 31) - 16, (int)((unsigned)py[best] >> 4), 208, 56);
            ptimer[p] = 0;
        }
        return;
    }
    if (tx < FP(GOAL_X0 + 4)) tx = FP(GOAL_X0 + 4);
    if (tx > FP(GOAL_X1 - 4)) tx = FP(GOAL_X1 - 4);
    if (dgoal < FP(60) && bz < FP(30)) {
        int dxg = bx - FP(GOAL_CX);
        dxg = iabs(dxg);
        if (owner == NONE && dxg < FP(100)) {
            /* wyjście do piłki w polu bramkowym */
            tx = bx; ty = by;
            dpb = dist_pb(p);
            if (dpb < 9 && bz < FP(18) && !(p == kicker && kick_timer < 7)) {
                give_ball(p); ptimer[p] = 0;
                if (t == 0) ctrl = 5;
                return;
            }
        } else if (dgoal < FP(20) && owner != NONE && pteam[owner] != t) tx = bx;
    }
    ptx[p] = tx; pty[p] = ty;
    pspd[p] = 2;
    pface[p] = (owner == NONE && dgoal < FP(60)) ? NONE : (att_up[t] ? 0 : 4);
}

/* ---- sterowanie gracza ---- */
static void human_update(void)
{
    unsigned char p = ctrl, d;
    unsigned char pressed = inp & ~inp_prev;
    unsigned char released = inp_prev & ~inp;
    if (pstate[p] != ST_NORMAL) return;
    d = inp2dir[inp & 15];
    if (owner == p) {
        if (d != NONE) run_dir(p, d); else pframe[p] = 0;
        if (inp & INP_FIRE) { if (charge < 10) ++charge; }
        if (released & INP_FIRE) {
            unsigned char pw = 100 + charge * 8;
            kick_dir(p, pdir[p], pw, charge > 5 ? (charge - 5) * 7 : 0);
            charge = 0;
        }
        return;
    }
    charge = 0;
    if (d != NONE) run_dir(p, d); else pframe[p] = 0;
    if ((pressed & INP_FIRE) && pcool[p] == 0) start_slide(p);
    /* aftertouch (banan) tuż po własnym kopnięciu */
    if (kicker == p && kick_timer < 20 && owner == NONE && d != NONE) {
        unsigned char rel = (d - kdir) & 7;
        if (rel == 2 || rel == 3) bcurl = 4;
        else if (rel == 6 || rel == 5) bcurl = -4;
        else if (rel == 0 && kick_timer < 6 && bvz > 0) bvz += 4;
    }
}

static void pick_controlled(void)
{
    unsigned char best;
    if (owner != NONE && pteam[owner] == 0) { if (owner != 0) ctrl = owner; return; }
    if (pstate[ctrl] != ST_NORMAL) return;
    best = nearest_to_ball(0, NONE);
    if (best != NONE && best != ctrl && dist_pb(best) + 12 < dist_pb(ctrl))
        ctrl = best;
}

/* =========================================================================
 * Zasady: bramki, auty
 * ========================================================================= */
static void set_piece(unsigned char team, int x, int y)
{
    unsigned char p;
    bx = FP(x); by = FP(y); bz = 0; bvx = bvy = bvz = 0; bcurl = 0;
    p = nearest_to_ball(team, NONE);
    if (p == NONE) p = team * TEAM_SIZE + 1;
    px[p] = bx; py[p] = by + (att_up[team] ? FP(5) : -FP(5));
    pdir[p] = att_up[team] ? 0 : 4;
    pstate[p] = ST_NORMAL;
    give_ball(p);
    ball_at_feet(p);
    pprot[p] = 30;
}

static void goal_scored(unsigned char team)
{
    if (score[team] < 9) ++score[team];
    hud_dirty = 3;
    show_msg(1, 55);
    pause_timer = 55;
}

static void check_rules(void)
{
    int x = bx >> 4, y = by >> 4;
    unsigned char ty;
    if (owner != NONE) return;
    if (y < PITCH_Y0) {
        if (x >= GOAL_X0 && x <= GOAL_X1 && bz < FP(CROSSBAR) && y > PITCH_Y0 - 6) {
            goal_scored(att_up[0] ? 0 : 1);
            return;
        }
        if (y < PITCH_Y0 - 6 || x < GOAL_X0 || x > GOAL_X1) {
            ty = att_up[last_team] ? 1 - last_team : last_team; /* kto wznawia */
            if (att_up[ty]) set_piece(ty, x < GOAL_CX ? PITCH_X0 + 4 : PITCH_X1 - 4, PITCH_Y0 + 4);
            else set_piece(ty, GOAL_CX, PITCH_Y0 + 30);
        }
        return;
    }
    if (y > PITCH_Y1) {
        if (x >= GOAL_X0 && x <= GOAL_X1 && bz < FP(CROSSBAR) && y < PITCH_Y1 + 6) {
            goal_scored(att_up[0] ? 1 : 0);
            return;
        }
        if (y > PITCH_Y1 + 6 || x < GOAL_X0 || x > GOAL_X1) {
            ty = att_up[last_team] ? last_team : 1 - last_team;
            if (!att_up[ty]) set_piece(ty, x < GOAL_CX ? PITCH_X0 + 4 : PITCH_X1 - 4, PITCH_Y1 - 4);
            else set_piece(ty, GOAL_CX, PITCH_Y1 - 30);
        }
        return;
    }
    if (x < PITCH_X0) set_piece(1 - last_team, PITCH_X0 + 2, y);
    else if (x > PITCH_X1) set_piece(1 - last_team, PITCH_X1 - 2, y);
}

static void clock_update(void)
{
    if (++sec_frames >= 2) {
        sec_frames = 0;
        if (++sec_o >= 10) { sec_o = 0; ++sec_t; }
        if (++second >= 60) {
            second = 0; ++minute; sec_t = sec_o = 0;
            if (++min_o >= 10) { min_o = 0; ++min_t; }
            if (minute == 45 && half == 0) {
                half = 1; att_up[0] = 0; att_up[1] = 1;
                show_msg(3, 60); pause_timer = 60;
            } else if (minute >= 90) {
                match_over = 1; show_msg(2, 255); pause_timer = 255;
            }
        }
        hud_dirty = 1;
    }
}

/* =========================================================================
 * Rysowanie: kamera, lista sprite'ów
 * ========================================================================= */
static void camera_update(void)
{
    int target = (by >> 4) - 96, d;
    if (target < 0) target = 0;
    if (target > CAM_MAX) target = CAM_MAX;
    d = target - cam_y;
    d >>= 2;
    if (d > 12) d = 12;
    if (d < -12) d = -12;
    cam_y += d;
}

static void build_sprites(void)
{
    ent_top = 55 - cam_y;
    msg_on = msg_timer;
    build_entries();
    build_misc_entries();
    sort_sprites();
}

/* =========================================================================
 * Główna pętla
 * ========================================================================= */
static void frame_logic(void)
{
    unsigned char i;
    inp_prev = inp;
    inp = read_input();
    ++step_count;

    if (pause_timer) {
        --pause_timer;
        if (pause_timer == 0 && !match_over) {
            if (msg_kind == 1) kickoff(att_up[0] ? (last_team == 0 ? 1 : 0) : (last_team == 0 ? 1 : 0));
            else kickoff(1);
            hud_dirty = 1;
        }
        if (match_over && (inp & INP_FIRE) && !(inp_prev & INP_FIRE)) {
            score[0] = score[1] = 0; minute = second = 0; half = 0; match_over = 0; min_t = min_o = sec_t = sec_o = 0;
            att_up[0] = 1; att_up[1] = 0; msg_timer = 0; pause_timer = 0;
            kickoff(0); hud_dirty = 3;
        }
        if (msg_timer) --msg_timer;
        return;
    }
    if (msg_timer) --msg_timer;

    clock_update();
    if (step_count & 1) pick_controlled();
    human_update();
    SEC(0);

    /* myślenie AI: 2 zawodników na klatkę */
    ai_think(think_idx); ai_think(think_idx + 6);
    if (++think_idx >= 6) think_idx = 0;
    SEC(1);

    keeper_update(0); keeper_update(TEAM_SIZE);
    for (i = 1; i < NPL; ++i) if (i != TEAM_SIZE) { pspd[i] = owner == i ? 1 : 0; pface[i] = NONE; }
    players_move();
    SEC(2);
    ball_physics();
    if (bz < FP(14)) {
        unsigned int mask = near_ball();
        for (i = 0; mask; ++i, mask >>= 1)
            if ((mask & 1) && i != owner && (i == 0 || i == TEAM_SIZE ? pstate[i] == ST_SLIDE : 1)) try_take(i);
    }
    if (owner != NONE) ball_at_feet(owner);
    check_rules();
    SEC(3);
}

static void game_init(void)
{
    unsigned char i;
    rnd_state = 0x5A;
    for (i = 0; i < NPL; ++i) pcol[i] = pteam[i] ? 14 : 2;
    pcol[0] = 7; pcol[TEAM_SIZE] = 4;
    for (i = 0; i < 16; ++i) ord[i] = i;
    font_init();
    att_up[0] = 1; att_up[1] = 0;
    score[0] = score[1] = 0; minute = second = 0; half = 0; min_t = min_o = sec_t = sec_o = 0;
    kickoff(0);
    cam_y = 240;
}

int main(void)
{
    unsigned char last, r;
    game_init();
    vic_init();
    hud_dirty = 3;
    hud_update();           /* po vic_init - kopiowanie sprite'ów czyści pamięć HUD */

    /* narysuj bufor 0 (wyświetlany) i przygotuj bufor 1 */
    shown_row = cam_y >> 3;
    draw_buf = 0; draw_base = shown_row; draw_first = 0; draw_count = 25; vic_draw_rows();
    vs_d018 = 0x02;
    back_row = shown_row + 1; back_done = 0;
    cam_prev = cam_y;
    vs_d011 = 0x10 | (7 - (cam_y & 7));
    build_sprites();
    vs_pending = 1;
    last = frame_count;
    for (;;) {
        while ((unsigned char)(frame_count - last) < 2) ;
        if ((unsigned char)(frame_count - last) > 2) ++dbg_skips;
        last = frame_count;
        while (vs_pending) ;
#ifdef DEBUG
        VIC_BORDER = 1;
        dbg_start();
#endif
        frame_logic();
        camera_update();
        r = cam_y >> 3;
        draw_buf = vs_d018 == 0x02 ? 1 : 0;      /* bufor niewyświetlany */
        if (r == shown_row) {
            /* przygotuj tylny bufor na sąsiedni wiersz w kierunku ruchu kamery */
            unsigned char want = cam_y >= cam_prev ? shown_row + 1 : (shown_row ? shown_row - 1 : 0);
            if (want > MAP_ROWS - 25) want = MAP_ROWS - 25;
            if (want != back_row) { back_row = want; back_done = 0; }
            if (back_done < 25) {
                draw_base = back_row; draw_first = back_done;
                draw_count = 25 - back_done; if (draw_count > 9) draw_count = 9;
                back_done += draw_count; vic_draw_rows();
            }
        } else {
            if (back_row != r) { back_row = r; back_done = 0; }
            if (back_done < 25) {
                draw_base = back_row; draw_first = back_done; draw_count = 25 - back_done;
                back_done = 25; vic_draw_rows();
            }
            vs_d018 = vs_d018 == 0x12 ? 0x02 : 0x12;
            back_row = shown_row; back_done = 25;   /* stary bufor jest kompletny */
            shown_row = r;
        }
        cam_prev = cam_y;
        vs_d011 = 0x10 | (7 - (cam_y & 7));
        SEC(4);
        if (hud_dirty) hud_update();
        SEC(5);
        build_sprites();
        SEC(6);
        vs_pending = 1;
#ifdef DEBUG
        SEC(7);
        dbg_lines_last = dbg_sec[0] + dbg_sec[1] + dbg_sec[2] + dbg_sec[3] + dbg_sec[4] + dbg_sec[5] + dbg_sec[6] + dbg_sec[7];
        if (dbg_lines_last > dbg_lines_max) dbg_lines_max = dbg_lines_last;
        VIC_BORDER = 0;
#endif
    }
}
