class_name World extends Node2D
## Mapa: teren, zajętość komórek, pathfinding (AStarGrid2D), tworzenie encji.

const MAP_W := 48
const MAP_H := 48

var astar := AStarGrid2D.new()
var tint: PackedFloat32Array = PackedFloat32Array()
var occupancy: Dictionary = {}   # Vector2i -> Entity
var entities: Array[Entity] = []
var player_start := Vector2i(10, 10)
var enemy_start := Vector2i(39, 39)
var rng := RandomNumberGenerator.new()


func _ready() -> void:
	y_sort_enabled = true
	astar.region = Rect2i(0, 0, MAP_W, MAP_H)
	astar.cell_size = Vector2(1, 1)
	astar.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
	astar.default_compute_heuristic = AStarGrid2D.HEURISTIC_OCTILE
	astar.default_estimate_heuristic = AStarGrid2D.HEURISTIC_OCTILE
	astar.update()


# ---------- generowanie ----------

func generate(seed_val: int = 0) -> void:
	rng.seed = seed_val if seed_val != 0 else randi()
	var noise := FastNoiseLite.new()
	noise.seed = rng.randi()
	noise.frequency = 0.08
	tint.resize(MAP_W * MAP_H)
	for y in MAP_H:
		for x in MAP_W:
			tint[y * MAP_W + x] = noise.get_noise_2d(x, y)
	# Centrum gracza, osadnicy, pobliskie zasoby
	spawn_building("centrum", player_start, 0, true)
	for i in 3:
		spawn_unit("osadnik", player_start + Vector2i(3 + i, 3), 0)
	for i in 6:
		_spawn_res_near("krzaki", player_start + Vector2i(-4, 1), 2)
	for i in 5:
		_spawn_res_near("zloto", player_start + Vector2i(1, -6), 2)
	for i in 4:
		_spawn_res_near("kamien", player_start + Vector2i(7, -3), 2)
	_forest(player_start + Vector2i(-2, 8), 5, 26)
	_forest(player_start + Vector2i(10, 0), 4, 18)
	# Lasy i złoża w głębi mapy
	for i in 7:
		_forest(Vector2i(rng.randi_range(4, MAP_W - 5), rng.randi_range(4, MAP_H - 5)), rng.randi_range(3, 6), rng.randi_range(14, 40))
	for i in 4:
		_spawn_res_near("zloto", Vector2i(rng.randi_range(6, MAP_W - 7), rng.randi_range(6, MAP_H - 7)), 3, 4)
	for i in 3:
		_spawn_res_near("kamien", Vector2i(rng.randi_range(6, MAP_W - 7), rng.randi_range(6, MAP_H - 7)), 3, 3)
	# Obóz wroga
	spawn_building("centrum", enemy_start, 1, true)
	spawn_building("koszary", enemy_start + Vector2i(-4, 0), 1, true)
	queue_redraw()


func _forest(center: Vector2i, radius: int, count: int) -> void:
	var placed := 0
	var tries := 0
	while placed < count and tries < count * 10:
		tries += 1
		var c := center + Vector2i(rng.randi_range(-radius, radius), rng.randi_range(-radius, radius))
		if Vector2(c - center).length() > radius + 0.5:
			continue
		if _free_for_resource(c):
			spawn_resource("drzewo", c)
			placed += 1


func _spawn_res_near(kind: String, center: Vector2i, radius: int, count: int = 1) -> void:
	var placed := 0
	var tries := 0
	while placed < count and tries < 60:
		tries += 1
		var c := center + Vector2i(rng.randi_range(-radius, radius), rng.randi_range(-radius, radius))
		if _free_for_resource(c):
			spawn_resource(kind, c)
			placed += 1


func _free_for_resource(c: Vector2i) -> bool:
	if not in_bounds(c) or occupancy.has(c):
		return false
	# nie blokuj bezpośredniego otoczenia centrów
	for start in [player_start, enemy_start]:
		if c.x >= start.x - 1 and c.x <= start.x + 3 and c.y >= start.y - 1 and c.y <= start.y + 3:
			return false
	return true


# ---------- zajętość / ścieżki ----------

func in_bounds(c: Vector2i) -> bool:
	return c.x >= 0 and c.y >= 0 and c.x < MAP_W and c.y < MAP_H


func is_walkable(c: Vector2i) -> bool:
	return in_bounds(c) and not occupancy.has(c)


func can_place(origin: Vector2i, size: Vector2i) -> bool:
	for y in size.y:
		for x in size.x:
			var c := origin + Vector2i(x, y)
			if not in_bounds(c) or occupancy.has(c):
				return false
	return true


func occupy(e: Entity) -> void:
	for c in e.cells():
		occupancy[c] = e
		astar.set_point_solid(c, true)


func release(e: Entity) -> void:
	for c in e.cells():
		if occupancy.get(c) == e:
			occupancy.erase(c)
			astar.set_point_solid(c, false)


func find_path(from: Vector2i, to: Vector2i) -> PackedVector2Array:
	if not in_bounds(from) or not in_bounds(to):
		return PackedVector2Array()
	var was_solid := astar.is_point_solid(from)
	if was_solid:
		astar.set_point_solid(from, false)
	var pts := astar.get_point_path(from, to, true)
	if was_solid:
		astar.set_point_solid(from, true)
	var out := PackedVector2Array()
	for p in pts:
		out.append(Iso.cell_center(Vector2i(roundi(p.x), roundi(p.y))))
	return out


## Wolne komórki w odległości <= max_range od którejś z `cells`, posortowane od najbliższej `from`.
func free_adjacent_cells(cells: Array, from: Vector2i, max_range: int = 1) -> Array:
	var seen := {}
	var out: Array = []
	for c in cells:
		for dy in range(-max_range, max_range + 1):
			for dx in range(-max_range, max_range + 1):
				var n: Vector2i = c + Vector2i(dx, dy)
				if seen.has(n) or not is_walkable(n):
					continue
				seen[n] = true
				out.append([Vector2(n - from).length_squared() + Vector2(n - c).length_squared() * 0.01, n])
	out.sort_custom(func(a: Array, b: Array) -> bool: return a[0] < b[0])
	var cells_out: Array = []
	for item in out:
		cells_out.append(item[1])
	return cells_out


## Najbliższa (od `from`) wolna komórka w odległości <= max_range od którejś z `cells`; (-1,-1) gdy brak.
func nearest_free_adjacent(cells: Array, from: Vector2i, max_range: int = 1) -> Vector2i:
	var c := free_adjacent_cells(cells, from, max_range)
	return c[0] if not c.is_empty() else Vector2i(-1, -1)


# ---------- encje ----------

func _register(e: Entity) -> void:
	e.world = self
	entities.append(e)
	e.died.connect(_on_entity_died)
	add_child(e)


func _on_entity_died(e: Entity) -> void:
	release(e)
	entities.erase(e)
	if e.team == 0 and not GameState.ended:
		call_deferred("_check_defeat")


func _check_defeat() -> void:
	var has_tc := false
	var has_vil := false
	for e in entities:
		if e.team != 0:
			continue
		if e is Building and e.kind == "centrum":
			has_tc = true
		if e is Villager:
			has_vil = true
	if not has_tc and not has_vil:
		GameState.end_game(false)


func spawn_unit(kind: String, c: Vector2i, team: int) -> Unit:
	if not Data.units.has(kind):
		push_error("Nieznana jednostka: " + kind)
		return null
	var u: Unit = Villager.new() if kind == "osadnik" else Unit.new()
	u.setup(kind, team, c)
	if team == 0:
		GameState.pop_delta(int(u.def.get("pop", 1)))
	_register(u)
	return u


func spawn_building(kind: String, origin: Vector2i, team: int, prebuilt: bool) -> Building:
	if not Data.buildings.has(kind):
		push_error("Nieznany budynek: " + kind)
		return null
	var b := Building.new()
	b.world = self
	b.setup(kind, team, origin, prebuilt)
	occupy(b)
	_register(b)
	return b


func spawn_resource(kind: String, c: Vector2i) -> ResourceNode:
	var r := ResourceNode.new()
	r.setup(kind, c)
	occupy(r)
	_register(r)
	return r


func nearest(from: Vector2, pred: Callable, max_dist: float) -> Entity:
	var best: Entity = null
	var best_d := max_dist * max_dist
	for e in entities:
		if e.dead or not pred.call(e):
			continue
		var d := from.distance_squared_to(e.position)
		if d < best_d:
			best_d = d
			best = e
	return best


func entity_at(world_pos: Vector2) -> Entity:
	var best: Entity = null
	var best_score := 1e18
	for e in entities:
		if e.dead:
			continue
		var r := e.hit_rect()
		if r.has_point(world_pos):
			# preferuj mniejsze i bliższe ekranowi (większe y) obiekty
			var score := r.get_area() - e.position.y * 0.001
			if score < best_score:
				best_score = score
				best = e
	return best


func entities_in_rect(r: Rect2) -> Array[Entity]:
	var out: Array[Entity] = []
	for e in entities:
		if not e.dead and r.has_point(e.position):
			out.append(e)
	return out


func has_building(team: int, kind: String) -> bool:
	for e in entities:
		if e is Building and e.team == team and e.kind == kind and e.built:
			return true
	return false


func find_first(pred: Callable) -> Entity:
	for e in entities:
		if not e.dead and pred.call(e):
			return e
	return null


func map_bounds() -> Rect2:
	var l := Iso.to_world(Vector2(0, MAP_H))
	var r := Iso.to_world(Vector2(MAP_W, 0))
	var b := Iso.to_world(Vector2(MAP_W, MAP_H))
	return Rect2(Vector2(l.x, 0), Vector2(r.x - l.x, b.y))


# ---------- teren ----------

func _draw() -> void:
	if tint.is_empty():
		return
	var base := Color(0.45, 0.62, 0.27)
	for y in MAP_H:
		for x in MAP_W:
			var t: float = tint[y * MAP_W + x]
			var col := base.lightened(t * 0.18) if t > 0 else base.darkened(-t * 0.18)
			if t > 0.42:
				col = Color(0.64, 0.56, 0.36).lerp(col, 0.4)  # piaszczyste przetarcia
			draw_colored_polygon(Iso.cell_polygon(Vector2i(x, y)), col)
	# krawędź mapy
	draw_polyline(Iso.rect_polygon(Vector2i.ZERO, Vector2i(MAP_W, MAP_H)) + PackedVector2Array([Iso.to_world(Vector2.ZERO)]), Color(0.2, 0.15, 0.1), 2.0)
