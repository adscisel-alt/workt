class_name Unit extends Entity
## Jednostka ruchoma: ruch po ścieżce (AStarGrid2D), atak, automatyczne podejmowanie walki.

var def: Dictionary = {}
var speed := 80.0
var attack_dmg := 3.0
var attack_range := 1
var attack_rate := 1.5
var attack_cd := 0.0
var auto_aggro := false
var aggro_cells := 6
var path: PackedVector2Array = PackedVector2Array()
var path_i := 0
var state := "idle"
var target: Entity = null
var repath_t := 0.0
var idle_scan_t := 0.0
var move_dir := Vector2.ZERO


func setup(k: String, t: int, c: Vector2i) -> void:
	kind = k
	team = t
	def = Data.units.get(k, {})
	speed = float(def.get("szybkosc", 80))
	attack_dmg = float(def.get("atak", 3))
	attack_range = int(def.get("zasieg", 1))
	max_hp = float(def.get("hp", 25))
	hp = max_hp
	auto_aggro = def.get("typ", "cywil") != "cywil"
	grid_pos = c
	size = Vector2i.ONE
	position = Iso.cell_center(c) + Vector2(randf_range(-6, 6), randf_range(-3, 3))


func display_name() -> String:
	return def.get("nazwa", kind)


func is_idle() -> bool:
	return state == "idle"


func _needs_redraw() -> bool:
	return state != "idle"


# ---------- rozkazy ----------

func command_move(world_pos: Vector2) -> void:
	target = null
	if _go_to_cell(Iso.to_cell(world_pos)):
		state = "moving"
	else:
		state = "idle"
	set_anim("walk" if state == "moving" else "idle")


func command_attack(e: Entity) -> void:
	if e == null or e.team == team:
		return
	target = e
	state = "attacking"
	repath_t = 0.0
	_approach_target()


func stop() -> void:
	target = null
	path = PackedVector2Array()
	state = "idle"
	set_anim("idle")


# ---------- ścieżki ----------

func _go_to_cell(c: Vector2i) -> bool:
	var from := cell()
	if not world.in_bounds(c):
		return false
	if not world.is_walkable(c):
		var alt: Vector2i = world.nearest_free_adjacent([c], from)
		if alt.x < 0:
			return false
		c = alt
	path = world.find_path(from, c)
	path_i = 0
	if path.size() > 1 and Iso.to_cell(path[0]) == from:
		path_i = 1
	return path.size() > 0


func _go_adjacent(e: Entity, max_range: int = 1) -> bool:
	if e == null or not is_instance_valid(e):
		return false
	if e.distance_cells(cell()) <= max_range:
		path = PackedVector2Array()
		return true
	# Ścieżka może być częściowa (cel odcięty lasem/budynkami), więc sprawdzamy kolejnych kandydatów.
	var candidates: Array = world.free_adjacent_cells(e.cells(), cell(), max_range)
	var tries := 0
	for c in candidates:
		tries += 1
		if tries > 12:
			break
		if _go_to_cell(c) and e.distance_cells(Iso.to_cell(path[path.size() - 1])) <= max_range:
			return true
	path = PackedVector2Array()
	return false


## Zwraca true, gdy dotarł do końca ścieżki.
func _follow_path(delta: float) -> bool:
	if path_i >= path.size():
		move_dir = Vector2.ZERO
		return true
	var goal: Vector2 = path[path_i]
	var to := goal - position
	var step := speed * delta
	if to.length() <= step:
		position = goal
		path_i += 1
		if path_i >= path.size():
			move_dir = Vector2.ZERO
			return true
	else:
		move_dir = to.normalized()
		position += move_dir * step
		facing = Iso.direction8(move_dir)
	return false


func _approach_target() -> void:
	if not _go_adjacent(target, attack_range):
		stop()


func _target_valid() -> bool:
	return target != null and is_instance_valid(target) and not target.dead


func _in_range(e: Entity) -> bool:
	return e.distance_cells(cell()) <= attack_range


# ---------- pętla ----------

func _physics_process(delta: float) -> void:
	if dead:
		return
	attack_cd = maxf(0.0, attack_cd - delta)
	match state:
		"moving":
			set_anim("walk")
			if _follow_path(delta):
				stop()
		"attacking":
			_do_attack(delta)
		"idle":
			if auto_aggro:
				idle_scan_t -= delta
				if idle_scan_t <= 0.0:
					idle_scan_t = 0.5
					var e: Entity = world.nearest(position, func(x: Entity) -> bool: return x.team >= 0 and x.team != team, aggro_cells * Iso.TILE_W)
					if e != null:
						command_attack(e)


func _do_attack(delta: float) -> void:
	if not _target_valid():
		stop()
		return
	if _in_range(target):
		path = PackedVector2Array()
		facing = Iso.direction8(target.position - position)
		set_anim("attack")
		if attack_cd <= 0.0:
			attack_cd = attack_rate
			var dmg := attack_dmg
			var bonus: Dictionary = def.get("bonus_vs", {})
			if target is Unit and bonus.has(target.def.get("typ", "")):
				dmg += float(bonus[target.def.get("typ", "")])
			target.take_damage(dmg, self)
			if target.dead and team == 0:
				GameState.enemies_killed += 1
	else:
		set_anim("walk")
		repath_t -= delta
		if path.is_empty() or repath_t <= 0.0:
			repath_t = 1.0
			if not _go_adjacent(target, attack_range):
				stop()
				return
		_follow_path(delta)


func die() -> void:
	if dead:
		return
	if team == 0:
		GameState.pop_delta(-int(def.get("pop", 1)))
		GameState.units_lost += 1
	super.die()
