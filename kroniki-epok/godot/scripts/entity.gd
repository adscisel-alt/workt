class_name Entity extends Node2D
## Bazowa encja świata: jednostka, budynek lub złoże. Pozycja = punkt "stóp"/środek podstawy.
## Rysuje się ze sprite'a (jeśli SpriteLib znajdzie arkusz) lub proceduralnie.

signal died(entity: Entity)

const TEAM_COLORS := {0: Color(0.16, 0.38, 0.92), 1: Color(0.85, 0.15, 0.12), -1: Color(0.6, 0.6, 0.6)}

var world: Node2D = null
var kind := ""
var team := -1
var hp := 50.0
var max_hp := 50.0
var grid_pos := Vector2i.ZERO
var size := Vector2i(1, 1)
var facing := 0
var dead := false

var selected := false:
	set(v):
		selected = v
		queue_redraw()

# sprite'y
var sprite: Sprite2D = null
var anim_name := ""
var anim_frames := 1
var anim_dirs := 1
var anim_fps := 10.0
var anim_t := 0.0
var anim_loop := true
var _art_t := 0.0


func _ready() -> void:
	_try_sprite()
	set_anim("idle")


func team_color() -> Color:
	return TEAM_COLORS.get(team, TEAM_COLORS[-1])


func cells() -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	for y in size.y:
		for x in size.x:
			out.append(grid_pos + Vector2i(x, y))
	return out


func cell() -> Vector2i:
	return Iso.to_cell(position)


func nearest_cell_to(c: Vector2i) -> Vector2i:
	return Vector2i(clampi(c.x, grid_pos.x, grid_pos.x + size.x - 1), clampi(c.y, grid_pos.y, grid_pos.y + size.y - 1))


func distance_cells(c: Vector2i) -> int:
	return Iso.chebyshev(nearest_cell_to(c), c)


func display_name() -> String:
	return kind


func take_damage(amount: float, _attacker: Node = null) -> void:
	if dead:
		return
	hp -= amount
	queue_redraw()
	if hp <= 0.0:
		die()


func die() -> void:
	if dead:
		return
	dead = true
	died.emit(self)
	queue_free()


## Prostokąt do trafiania myszą (układ świata).
func hit_rect() -> Rect2:
	return Rect2(position + Vector2(-12, -34), Vector2(24, 36))


# ---------- sprite'y ----------

func _try_sprite() -> void:
	var sheet := SpriteLib.get_sheet(kind, "idle")
	if sheet.is_empty():
		return
	sprite = Sprite2D.new()
	sprite.centered = false
	sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	add_child(sprite)
	if sheet["meta"].get("player_color", false):
		sprite.material = SpriteLib.player_color_material(team_color())


func set_anim(a: String, loop := true) -> void:
	if sprite == null or a == anim_name:
		return
	var sheet := SpriteLib.get_sheet(kind, a)
	if sheet.is_empty():
		if a == "idle":
			return
		sheet = SpriteLib.get_sheet(kind, "idle")
		if sheet.is_empty():
			return
	anim_name = a
	anim_loop = loop
	var meta: Dictionary = sheet["meta"]
	anim_frames = maxi(1, int(meta.get("frames", 1)))
	anim_dirs = maxi(1, int(meta.get("directions", 1)))
	anim_fps = float(meta.get("fps", 10))
	anim_t = 0.0
	sprite.texture = sheet["texture"]
	sprite.hframes = anim_frames
	sprite.vframes = anim_dirs
	var origin: Array = meta.get("origin", [0, 0])
	sprite.offset = Vector2(-float(origin[0]), -float(origin[1]))
	_update_frame()


func _update_frame() -> void:
	if sprite == null:
		return
	var idx := int(anim_t * anim_fps)
	if anim_loop:
		idx = idx % anim_frames
	else:
		idx = mini(idx, anim_frames - 1)
	var d := 0
	var flip := false
	if anim_dirs >= 8:
		d = facing
	elif anim_dirs == 5:
		# Jak w AoE2: zapisano S, SW, W, NW, N, a wschodnie kierunki powstają przez odbicie.
		d = facing if facing <= 4 else 8 - facing
		flip = facing > 4
	sprite.flip_h = flip
	sprite.frame = d * anim_frames + idx


func _process(delta: float) -> void:
	_art_t += delta
	if sprite != null:
		anim_t += delta
		_update_frame()
	elif _needs_redraw():
		queue_redraw()


## Encje bez sprite'a odświeżają rysunek tylko w ruchu (patrz Unit).
func _needs_redraw() -> bool:
	return false


func _draw() -> void:
	if selected:
		var pts := ProceduralArt.ellipse(Vector2.ZERO, 14.0 * size.x + 4.0, 7.0 * size.y + 2.0, 24)
		draw_polyline(pts, Color(1, 1, 1, 0.9), 1.5, true)
	if sprite == null:
		ProceduralArt.draw_entity(self)
	_draw_hp_bar()


func _draw_hp_bar() -> void:
	if hp >= max_hp and not selected:
		return
	var w := 24.0 + 10.0 * (size.x - 1)
	var top := -hit_rect().size.y - 4.0
	var r := Rect2(Vector2(-w * 0.5, top), Vector2(w, 3))
	draw_rect(r, Color(0, 0, 0, 0.7))
	var ratio := clampf(hp / max_hp, 0.0, 1.0)
	var col := Color(0.2, 0.85, 0.2) if ratio > 0.5 else (Color(0.95, 0.75, 0.1) if ratio > 0.25 else Color(0.9, 0.15, 0.1))
	draw_rect(Rect2(r.position, Vector2(w * ratio, 3)), col)
