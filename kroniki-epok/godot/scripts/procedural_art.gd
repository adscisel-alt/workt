class_name ProceduralArt
## Zastępcza grafika rysowana wektorowo, gdy brak arkuszy sprite'ów z Blendera.
## Wszystkie rysunki są względem pozycji encji (stopy jednostki / środek podstawy budynku).

const SKIN := Color(0.93, 0.78, 0.62)
const WOOD := Color(0.45, 0.30, 0.16)
const WOOD_DARK := Color(0.32, 0.21, 0.11)
const THATCH := Color(0.80, 0.67, 0.36)
const STONE := Color(0.62, 0.62, 0.60)
const STONE_DARK := Color(0.45, 0.45, 0.44)
const SHADOW := Color(0, 0, 0, 0.25)
const RES_COLORS := {"drewno": Color(0.5, 0.33, 0.15), "zywnosc": Color(0.85, 0.2, 0.2), "zloto": Color(0.95, 0.8, 0.2), "kamien": Color(0.7, 0.7, 0.7)}


static func ellipse(center: Vector2, rx: float, ry: float, n: int = 20) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in n + 1:
		var a := TAU * i / n
		pts.append(center + Vector2(cos(a) * rx, sin(a) * ry))
	return pts


static func draw_entity(e: Entity) -> void:
	if e is Building:
		_draw_building(e)
	elif e is ResourceNode:
		_draw_resource(e)
	elif e is Unit:
		_draw_unit(e)


# ---------- jednostki ----------

static func _draw_unit(u: Unit) -> void:
	var ci: CanvasItem = u
	var moving := u.state in ["moving", "to_resource", "to_dropoff", "to_build", "attacking"] and u.path_i < u.path.size()
	var t := u._art_t
	var swing := sin(t * 12.0) * 4.0 if moving else 0.0
	var work := absf(sin(t * 8.0)) * 6.0 if u.state in ["gathering", "building"] or (u.state == "attacking" and not moving) else 0.0
	var tc := u.team_color()
	ci.draw_colored_polygon(ellipse(Vector2(0, 0), 9, 4), SHADOW)
	var mirror := -1.0 if u.facing in [5, 6, 7] else 1.0
	if u.kind == "rycerz":
		_draw_horse(ci, swing, tc)
	# nogi
	ci.draw_line(Vector2(-2, -10), Vector2(-3 + swing, 0), WOOD_DARK, 2.0)
	ci.draw_line(Vector2(2, -10), Vector2(3 - swing, 0), WOOD_DARK, 2.0)
	# tułów
	var body := Color(0.55, 0.40, 0.25)
	match u.kind:
		"milicja", "wlocznik": body = Color(0.42, 0.42, 0.46)
		"lucznik": body = Color(0.25, 0.45, 0.22)
		"rycerz": body = Color(0.75, 0.75, 0.8)
	var by := -22.0 if u.kind == "rycerz" else -10.0
	ci.draw_rect(Rect2(Vector2(-4, by - 12), Vector2(8, 12)), body)
	ci.draw_rect(Rect2(Vector2(-4, by - 5), Vector2(8, 2)), tc)  # pas w kolorze gracza
	ci.draw_circle(Vector2(0, by - 16), 4.0, SKIN)
	if u.kind != "osadnik":
		ci.draw_arc(Vector2(0, by - 16), 4.2, PI, TAU, 8, Color(0.5, 0.5, 0.55), 2.0)  # hełm
	# broń / narzędzie
	var hx := 6.0 * mirror
	match u.kind:
		"osadnik":
			var tool_col: Color = RES_COLORS.get(u.carry_type, WOOD)
			ci.draw_line(Vector2(hx, by - 4), Vector2(hx + 3 * mirror, by - 14 + work), WOOD, 2.0)
			ci.draw_rect(Rect2(Vector2(hx + 1 * mirror, by - 16 + work), Vector2(4, 3)), tool_col)
			if u.carry_amt > 0.0:
				ci.draw_circle(Vector2(-hx, by - 10), 3.0, RES_COLORS.get(u.carry_type, WOOD))
		"milicja":
			ci.draw_line(Vector2(hx, by - 6), Vector2(hx + 2 * mirror, by - 18 - work), Color(0.85, 0.85, 0.9), 2.0)
			ci.draw_circle(Vector2(-hx, by - 8), 4.0, tc)
		"wlocznik":
			ci.draw_line(Vector2(hx, by + 2), Vector2(hx + 4 * mirror, by - 26 - work), WOOD, 2.0)
			ci.draw_circle(Vector2(-hx, by - 8), 3.5, tc)
		"lucznik":
			ci.draw_arc(Vector2(hx, by - 8), 8.0, -PI / 2 + (0.0 if mirror > 0 else PI), PI / 2 + (0.0 if mirror > 0 else PI), 10, WOOD, 1.5)
		"rycerz":
			ci.draw_line(Vector2(hx, by - 2), Vector2(hx + 6 * mirror, by - 30 - work), WOOD, 2.0)
			ci.draw_colored_polygon(PackedVector2Array([Vector2(hx + 6 * mirror, by - 30), Vector2(hx + 14 * mirror, by - 27), Vector2(hx + 6 * mirror, by - 24)]), tc)


static func _draw_horse(ci: CanvasItem, swing: float, tc: Color) -> void:
	var horse := Color(0.42, 0.27, 0.15)
	ci.draw_line(Vector2(-8, -8), Vector2(-9 + swing, 0), horse, 3.0)
	ci.draw_line(Vector2(8, -8), Vector2(9 - swing, 0), horse, 3.0)
	ci.draw_line(Vector2(-5, -8), Vector2(-5 - swing, 0), horse, 3.0)
	ci.draw_line(Vector2(5, -8), Vector2(5 + swing, 0), horse, 3.0)
	ci.draw_colored_polygon(ellipse(Vector2(0, -14), 13, 6), horse)
	ci.draw_colored_polygon(ellipse(Vector2(0, -14), 10, 4), tc)  # czaprak
	ci.draw_colored_polygon(PackedVector2Array([Vector2(10, -16), Vector2(18, -24), Vector2(20, -18), Vector2(13, -12)]), horse)


# ---------- złoża ----------

static func _draw_resource(r: ResourceNode) -> void:
	var ci: CanvasItem = r
	var s := r.seed_val
	var ratio := clampf(r.amount / r.max_hp, 0.15, 1.0)
	match r.kind:
		"drzewo":
			ci.draw_colored_polygon(ellipse(Vector2(2, 1), 11, 5), SHADOW)
			ci.draw_rect(Rect2(Vector2(-2, -18), Vector2(4, 18)), WOOD_DARK)
			var g1 := Color(0.18, 0.42, 0.15).lightened(float(s % 7) * 0.02)
			var g2 := g1.lightened(0.12)
			var h := 1.0 if s % 3 == 0 else 0.85
			ci.draw_circle(Vector2(-6, -24 * h), 9 * h, g1)
			ci.draw_circle(Vector2(6, -26 * h), 9 * h, g1)
			ci.draw_circle(Vector2(0, -36 * h), 10 * h, g2)
			ci.draw_circle(Vector2(-2, -30 * h), 6 * h, g2.lightened(0.1))
		"krzaki":
			ci.draw_colored_polygon(ellipse(Vector2(0, -4), 14, 8), Color(0.2, 0.45, 0.18))
			ci.draw_colored_polygon(ellipse(Vector2(0, -8), 10, 6), Color(0.28, 0.55, 0.22))
			for i in int(6 * ratio):
				var a := i * 1.1 + float(s % 5)
				ci.draw_circle(Vector2(cos(a) * 8, -7 + sin(a) * 4), 1.6, Color(0.85, 0.15, 0.2))
		_:
			var col := Color(0.86, 0.72, 0.25) if r.kind == "zloto" else STONE
			var base := Color(0.5, 0.42, 0.3) if r.kind == "zloto" else STONE_DARK
			ci.draw_colored_polygon(ellipse(Vector2(0, 0), 16, 8), SHADOW)
			for i in 3:
				var o := Vector2(-9 + i * 9 + (s >> i) % 3, -3 - (s >> (i + 2)) % 4)
				var sz := 7.0 * (0.8 + 0.4 * ratio)
				ci.draw_colored_polygon(PackedVector2Array([o + Vector2(-sz, 2), o + Vector2(-sz * 0.4, -sz), o + Vector2(sz * 0.6, -sz * 0.8), o + Vector2(sz, 2)]), base)
				ci.draw_colored_polygon(PackedVector2Array([o + Vector2(-sz * 0.6, 0), o + Vector2(-sz * 0.3, -sz * 0.7), o + Vector2(sz * 0.4, -sz * 0.6), o + Vector2(sz * 0.6, 0)]), col)


# ---------- budynki ----------

static func _corners(size: Vector2i) -> Array:
	var h := Vector2(size) * 0.5
	return [Iso.to_world(Vector2(-h.x, -h.y)), Iso.to_world(Vector2(h.x, -h.y)), Iso.to_world(h), Iso.to_world(Vector2(-h.x, h.y))]


static func draw_iso_box(ci: CanvasItem, size: Vector2i, height: float, wall: Color, roof: Color, inset := 0.0) -> void:
	var c: Array = _corners(size)
	var T: Vector2 = c[0]; var R: Vector2 = c[1]; var B: Vector2 = c[2]; var L: Vector2 = c[3]
	if inset > 0.0:
		var cen := (T + B) * 0.5
		T = T.lerp(cen, inset); R = R.lerp(cen, inset); B = B.lerp(cen, inset); L = L.lerp(cen, inset)
	var up := Vector2(0, -height)
	ci.draw_colored_polygon(PackedVector2Array([L, B, B + up, L + up]), wall.darkened(0.18))
	ci.draw_colored_polygon(PackedVector2Array([B, R, R + up, B + up]), wall)
	ci.draw_colored_polygon(PackedVector2Array([T + up, R + up, B + up, L + up]), roof)
	ci.draw_polyline(PackedVector2Array([L + up, B + up, R + up]), wall.darkened(0.4), 1.0)
	ci.draw_line(B, B + up, wall.darkened(0.4), 1.0)


static func draw_pyramid_roof(ci: CanvasItem, size: Vector2i, base_h: float, roof_h: float, col: Color, inset := 0.0) -> void:
	var c: Array = _corners(size)
	var T: Vector2 = c[0]; var R: Vector2 = c[1]; var B: Vector2 = c[2]; var L: Vector2 = c[3]
	var cen := (T + B) * 0.5
	if inset > 0.0:
		T = T.lerp(cen, inset); R = R.lerp(cen, inset); B = B.lerp(cen, inset); L = L.lerp(cen, inset)
	var up := Vector2(0, -base_h)
	var apex := cen + Vector2(0, -base_h - roof_h)
	ci.draw_colored_polygon(PackedVector2Array([L + up, B + up, apex]), col.darkened(0.15))
	ci.draw_colored_polygon(PackedVector2Array([B + up, R + up, apex]), col)
	ci.draw_polyline(PackedVector2Array([L + up, apex, R + up]), col.darkened(0.4), 1.0)
	ci.draw_line(B + up, apex, col.darkened(0.4), 1.0)


static func draw_flag(ci: CanvasItem, at: Vector2, h: float, tc: Color) -> void:
	ci.draw_line(at, at + Vector2(0, -h), WOOD_DARK, 1.5)
	ci.draw_colored_polygon(PackedVector2Array([at + Vector2(0, -h), at + Vector2(10, -h + 4), at + Vector2(0, -h + 8)]), tc)


static func _draw_building(b: Building) -> void:
	var ci: CanvasItem = b
	var ratio := b.build_ratio()
	var size := b.size
	var full_h := float(b.def.get("wysokosc", 40))
	var tc := b.team_color()
	# podstawa / plac budowy
	var c: Array = _corners(size)
	ci.draw_colored_polygon(PackedVector2Array(c), Color(0.55, 0.45, 0.3) if not b.is_farm else Color(0.50, 0.36, 0.2))
	if not b.built:
		# rusztowanie: budynek "wyrasta" wraz z postępem, jak w AoE2
		var h := maxf(4.0, full_h * ratio)
		draw_iso_box(ci, size, h, Color(0.6, 0.5, 0.35, 0.8), Color(0.7, 0.6, 0.4, 0.8), 0.1)
		for i in 3:
			var p: Vector2 = c[3].lerp(c[2], 0.2 + i * 0.3)
			ci.draw_line(p, p + Vector2(0, -full_h), WOOD_DARK, 1.0)
		return
	match b.kind:
		"farma":
			var fill := clampf(b.food_stock / maxf(1.0, float(b.def.get("zapas", 250))), 0.0, 1.0)
			var crop := Color(0.35, 0.55, 0.2).lerp(Color(0.82, 0.72, 0.35), 1.0 - fill)
			for i in 7:
				var a: Vector2 = c[0].lerp(c[3], (i + 0.5) / 7.0)
				var bb: Vector2 = c[1].lerp(c[2], (i + 0.5) / 7.0)
				ci.draw_line(a, bb, crop, 3.0)
		"dom":
			draw_iso_box(ci, size, full_h * 0.55, Color(0.82, 0.74, 0.58), THATCH, 0.12)
			draw_pyramid_roof(ci, size, full_h * 0.55, full_h * 0.45, THATCH, 0.04)
		"centrum":
			draw_iso_box(ci, size, full_h * 0.35, STONE, WOOD, 0.05)
			draw_iso_box(ci, size, full_h * 0.7, Color(0.80, 0.70, 0.52), WOOD_DARK, 0.3)
			draw_pyramid_roof(ci, size, full_h * 0.7, full_h * 0.3, Color(0.62, 0.3, 0.2), 0.25)
			draw_flag(ci, Vector2(0, -full_h), 22, tc)
		"koszary", "strzelnica", "stajnia":
			draw_iso_box(ci, size, full_h * 0.6, Color(0.70, 0.62, 0.48), WOOD_DARK, 0.08)
			draw_pyramid_roof(ci, size, full_h * 0.6, full_h * 0.4, Color(0.55, 0.28, 0.18), 0.02)
			draw_flag(ci, Vector2(0, -full_h * 0.95), 18, tc)
			if b.kind == "strzelnica":
				ci.draw_circle(Vector2(18, -8), 6, Color(0.95, 0.95, 0.9))
				ci.draw_circle(Vector2(18, -8), 3, Color(0.85, 0.15, 0.1))
			elif b.kind == "stajnia":
				for i in 4:
					ci.draw_line(Vector2(-30 + i * 8, 10 + i * 4), Vector2(-30 + i * 8, 2 + i * 4), WOOD, 1.5)
		"mlyn":
			draw_iso_box(ci, size, full_h * 0.7, Color(0.84, 0.78, 0.64), WOOD_DARK, 0.2)
			draw_pyramid_roof(ci, size, full_h * 0.7, full_h * 0.3, Color(0.5, 0.3, 0.2), 0.15)
			var hub := Vector2(12, -full_h * 0.6)
			var rot := b._art_t * 0.8
			for i in 4:
				var a := rot + i * PI / 2
				ci.draw_line(hub, hub + Vector2(cos(a) * 20, sin(a) * 20), Color(0.9, 0.9, 0.85), 2.5)
		"tartak":
			draw_iso_box(ci, size, full_h * 0.6, WOOD, WOOD_DARK, 0.25)
			for i in 3:
				ci.draw_circle(Vector2(-16 + i * 7, 4 - (i % 2) * 5), 4, WOOD)
		"kopalnia":
			draw_iso_box(ci, size, full_h * 0.6, WOOD, WOOD_DARK, 0.25)
			ci.draw_colored_polygon(PackedVector2Array([Vector2(8, 10), Vector2(16, -2), Vector2(26, 8)]), STONE_DARK)
			ci.draw_colored_polygon(PackedVector2Array([Vector2(14, 12), Vector2(22, 2), Vector2(30, 12)]), STONE)
		"uniwersytet":
			draw_iso_box(ci, size, full_h * 0.7, Color(0.78, 0.72, 0.62), STONE_DARK, 0.06)
			draw_pyramid_roof(ci, size, full_h * 0.7, full_h * 0.3, Color(0.35, 0.4, 0.5), 0.0)
			for i in 3:
				ci.draw_rect(Rect2(Vector2(4 + i * 12, -full_h * 0.55), Vector2(4, 14)), Color(0.25, 0.3, 0.45))
		"zamek":
			draw_iso_box(ci, size, full_h * 0.6, STONE, STONE_DARK, 0.0)
			draw_iso_box(ci, size, full_h, STONE.lightened(0.05), STONE_DARK, 0.45)
			for corner in _corners(size):
				var cc: Vector2 = corner.lerp(Vector2.ZERO, 0.12)
				ci.draw_rect(Rect2(cc + Vector2(-6, -full_h * 0.8), Vector2(12, full_h * 0.8)), STONE.darkened(0.1))
				ci.draw_rect(Rect2(cc + Vector2(-7, -full_h * 0.85), Vector2(14, 4)), STONE_DARK)
			draw_flag(ci, Vector2(0, -full_h), 24, tc)
		"cud":
			draw_iso_box(ci, size, full_h * 0.45, Color(0.85, 0.80, 0.70), STONE, 0.0)
			draw_iso_box(ci, size, full_h * 0.7, Color(0.88, 0.84, 0.74), STONE_DARK, 0.35)
			draw_pyramid_roof(ci, size, full_h * 0.7, full_h * 0.3, Color(0.3, 0.45, 0.55), 0.35)
			ci.draw_circle(Vector2(0, -full_h * 0.5), 8, Color(0.3, 0.3, 0.6))
			ci.draw_circle(Vector2(0, -full_h * 0.5), 5, Color(0.8, 0.3, 0.3))
			draw_flag(ci, Vector2(0, -full_h), 20, tc)
		_:
			draw_iso_box(ci, size, full_h, Color(0.7, 0.6, 0.5), WOOD_DARK, 0.1)
