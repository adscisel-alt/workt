class_name Building extends Entity
## Budynek: budowa (postęp w sekundach pracy), kolejka szkolenia, skład surowców, pole uprawne, obrona (zamek).

signal construction_finished(b: Building)

var def: Dictionary = {}
var built := false
var progress := 0.0
var build_time := 30.0
var queue: Array[String] = []
var queue_t := 0.0
var queue_blocked := false
var rally := Vector2i(-1, -1)
var is_farm := false
var food_stock := 0.0
var res_type := "zywnosc"
var defense_dmg := 0.0
var defense_cd := 0.0
var _victory_fired := false


func setup(k: String, t: int, origin: Vector2i, prebuilt: bool) -> void:
	kind = k
	team = t
	def = Data.buildings.get(k, {})
	var s := int(def.get("rozmiar", 2))
	size = Vector2i(s, s)
	grid_pos = origin
	position = Iso.to_world(Vector2(origin) + Vector2(size) * 0.5)
	max_hp = float(def.get("hp", 500))
	if t == 0:
		max_hp *= GameState.civ_bonus("hp_budynki")
	build_time = float(def.get("czas", 30))
	is_farm = bool(def.get("farma", false))
	food_stock = float(def.get("zapas", 0))
	defense_dmg = float(def.get("obrona", 0))
	built = prebuilt
	progress = build_time if prebuilt else 0.0
	hp = max_hp if prebuilt else max_hp * 0.1
	if prebuilt and t == 0:
		GameState.set_pop_cap_delta(int(def.get("pop_bonus", 0)))


func display_name() -> String:
	return def.get("nazwa", kind)


func hit_rect() -> Rect2:
	var poly := Iso.rect_polygon(grid_pos, size)
	var minx := poly[3].x
	var maxx := poly[1].x
	var top := poly[0].y - float(def.get("wysokosc", 40))
	var bottom := poly[2].y
	return Rect2(Vector2(minx, top), Vector2(maxx - minx, bottom - top))


func accepts(t: String) -> bool:
	return built and t in def.get("sklad", [])


func trains() -> Array:
	return def.get("szkoli", [])


func _ready() -> void:
	super._ready()
	_update_construction_visual()


func add_progress(work: float) -> void:
	if built:
		return
	progress += work
	hp = minf(max_hp, max_hp * (0.1 + 0.9 * progress / build_time))
	_update_construction_visual()
	queue_redraw()
	if progress >= build_time:
		_complete()


## Sprite nieukończonego budynku jest przycięty od dołu proporcjonalnie do postępu i lekko przyciemniony.
func _update_construction_visual() -> void:
	if sprite == null or sprite.texture == null:
		return
	if built:
		sprite.region_enabled = false
		sprite.modulate = Color.WHITE
		var sheet := SpriteLib.get_sheet(kind, anim_name if anim_name != "" else "idle")
		if not sheet.is_empty():
			var origin: Array = sheet["meta"].get("origin", [0, 0])
			sprite.offset = Vector2(-float(origin[0]), -float(origin[1]))
		return
	var size_px: Vector2 = sprite.texture.get_size()
	var ratio := clampf(0.08 + 0.92 * build_ratio(), 0.0, 1.0)
	var cut := floorf(size_px.y * (1.0 - ratio))
	sprite.region_enabled = true
	sprite.region_rect = Rect2(0, cut, size_px.x, size_px.y - cut)
	var sheet := SpriteLib.get_sheet(kind, "idle")
	var origin: Array = sheet["meta"].get("origin", [0, 0]) if not sheet.is_empty() else [0, 0]
	sprite.offset = Vector2(-float(origin[0]), -float(origin[1]) + cut)
	sprite.modulate = Color(0.85, 0.8, 0.7)


func build_ratio() -> float:
	return 1.0 if built else clampf(progress / build_time, 0.0, 1.0)


func _complete() -> void:
	built = true
	hp = max_hp
	_update_construction_visual()
	if team == 0:
		GameState.set_pop_cap_delta(int(def.get("pop_bonus", 0)))
		GameState.on_building_completed(kind)
		if def.get("zwyciestwo", false) and not _victory_fired:
			_victory_fired = true
			GameState.message.emit("Cud ukończony! Twoja osada przeszła do historii.")
			GameState.end_game(true)
	construction_finished.emit(self)
	queue_redraw()


## Pole uprawne zachowuje się jak złoże żywności.
func take(n: float) -> float:
	if not is_farm or not built:
		return 0.0
	var got := minf(n, food_stock)
	food_stock -= got
	queue_redraw()
	if food_stock <= 0.0:
		GameState.message.emit("Pole uprawne wyjałowiło się. Trzeba obsiać nowe.")
		die()
	return got


func enqueue(unit_kind: String) -> String:
	if not built:
		return "Budynek nie jest ukończony."
	var udef: Dictionary = Data.units.get(unit_kind, {})
	if int(udef.get("epoka", 0)) > GameState.age:
		return "Wymaga epoki: %s." % GameState.age_name(int(udef.get("epoka", 0)))
	if queue.size() >= 5:
		return "Kolejka jest pełna (5)."
	var cost: Dictionary = udef.get("koszt", {})
	if not GameState.spend(cost):
		return GameState.missing_text(cost)
	queue.append(unit_kind)
	return ""


func cancel_last() -> void:
	if queue.is_empty():
		return
	var k: String = queue.pop_back()
	GameState.refund(Data.units.get(k, {}).get("koszt", {}))
	if queue.is_empty():
		queue_t = 0.0


func queue_progress() -> float:
	if queue.is_empty():
		return 0.0
	return clampf(queue_t / float(Data.units[queue[0]].get("czas", 20)), 0.0, 1.0)


func _process(delta: float) -> void:
	super._process(delta)
	if dead or not built:
		return
	if not queue.is_empty():
		var udef: Dictionary = Data.units[queue[0]]
		var need_pop := int(udef.get("pop", 1))
		if team == 0 and not GameState.has_room(need_pop):
			if not queue_blocked:
				queue_blocked = true
				GameState.message.emit("Brak miejsca: zbuduj więcej domów.")
		else:
			queue_blocked = false
			queue_t += delta
			if queue_t >= float(udef.get("czas", 20)):
				queue_t = 0.0
				var k: String = queue.pop_front()
				_spawn_trained(k)
	if defense_dmg > 0.0:
		defense_cd -= delta
		if defense_cd <= 0.0:
			defense_cd = 2.0
			var enemy: Entity = world.nearest(position, func(e: Entity) -> bool: return e.team >= 0 and e.team != team, 7 * Iso.TILE_W)
			if enemy != null:
				enemy.take_damage(defense_dmg, self)


func _spawn_trained(k: String) -> void:
	var c: Vector2i = world.nearest_free_adjacent(cells(), grid_pos + size)
	if c.x < 0:
		c = grid_pos + Vector2i(size.x, size.y)
	var u: Unit = world.spawn_unit(k, c, team)
	if u != null and rally.x >= 0:
		u.command_move(Iso.cell_center(rally))


func set_rally(c: Vector2i) -> void:
	rally = c
	queue_redraw()


func die() -> void:
	if dead:
		return
	for k in queue:
		GameState.refund(Data.units.get(k, {}).get("koszt", {}))
	queue.clear()
	if team == 0 and built:
		GameState.set_pop_cap_delta(-int(def.get("pop_bonus", 0)))
		GameState.buildings_built[kind] = maxi(0, GameState.buildings_built.get(kind, 0) - 1)
	super.die()


func _draw() -> void:
	super._draw()
	if selected and rally.x >= 0 and not trains().is_empty():
		var p := Iso.cell_center(rally) - position
		draw_line(Vector2.ZERO, p, Color(1, 1, 0.6, 0.6), 1.0)
		draw_circle(p, 4.0, Color(1, 1, 0.6, 0.8))
