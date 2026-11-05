extends Node2D
## Scena główna: tworzy świat, kamerę, HUD i AI; obsługuje zaznaczanie, rozkazy i stawianie budynków.

const CAM_SPEED := 700.0
const EDGE_PX := 14.0
const ZOOM_MIN := 0.6
const ZOOM_MAX := 2.4

var world: World
var cam: Camera2D
var hud: HUD
var ai: EnemyAI
var ghost: PlacementGhost
var events: EventManager
var selected: Array = []
var dragging := false
var drag_start_world := Vector2.ZERO
var placing := ""
var idle_cycle := 0


func _ready() -> void:
	_setup_input()
	GameState.reset()
	world = World.new()
	world.name = "World"
	add_child(world)
	ghost = PlacementGhost.new()
	ghost.world = world
	ghost.visible = false
	ghost.z_index = 5
	add_child(ghost)
	cam = Camera2D.new()
	add_child(cam)
	cam.make_current()
	ai = EnemyAI.new()
	ai.world = world
	add_child(ai)
	events = EventManager.new()
	events.world = world
	add_child(events)
	hud = HUD.new()
	hud.main = self
	add_child(hud)
	events.hud = hud
	world.generate()
	ai.spawn_cell = world.enemy_start + Vector2i(-2, 4)
	var b := world.map_bounds()
	cam.limit_left = int(b.position.x) - 300
	cam.limit_right = int(b.end.x) + 300
	cam.limit_top = int(b.position.y) - 200
	cam.limit_bottom = int(b.end.y) + 200
	cam.position = Iso.to_world(Vector2(world.player_start) + Vector2(1.5, 1.5))
	hud.refresh_selection()
	GameState.message.emit("Witaj w Kronikach Epok! Cywilizacja: %s. %s" % [Data.civs[GameState.civ]["nazwa"], Data.civs[GameState.civ]["bonus_opis"]])
	GameState.message.emit("Zaznacz osadników i wyślij ich po drewno i jagody. F1 = pomoc, K = Kodeks.")


func _setup_input() -> void:
	_add_action("cam_left", [KEY_A, KEY_LEFT])
	_add_action("cam_right", [KEY_D, KEY_RIGHT])
	_add_action("cam_up", [KEY_W, KEY_UP])
	_add_action("cam_down", [KEY_S, KEY_DOWN])
	_add_action("cancel", [KEY_ESCAPE])
	_add_action("kodeks", [KEY_K])
	_add_action("help", [KEY_F1])
	_add_action("pause", [KEY_P])
	_add_action("goto_tc", [KEY_H])
	_add_action("idle_villager", [KEY_PERIOD])


static func _add_action(action: String, keys: Array) -> void:
	if InputMap.has_action(action):
		return
	InputMap.add_action(action)
	for k in keys:
		var ev := InputEventKey.new()
		ev.physical_keycode = k
		InputMap.action_add_event(action, ev)


# ---------- kamera ----------

func _process(delta: float) -> void:
	var v := Input.get_vector("cam_left", "cam_right", "cam_up", "cam_down")
	var vp := get_viewport()
	var mp := vp.get_mouse_position()
	var vs := vp.get_visible_rect().size
	if DisplayServer.window_is_focused() and Rect2(Vector2.ZERO, vs).has_point(mp):
		if mp.x <= EDGE_PX:
			v.x -= 1.0
		elif mp.x >= vs.x - EDGE_PX:
			v.x += 1.0
		if mp.y <= EDGE_PX:
			v.y -= 1.0
		elif mp.y >= vs.y - EDGE_PX:
			v.y += 1.0
	if v != Vector2.ZERO:
		cam.position += v.normalized() * CAM_SPEED * delta / cam.zoom.x
	_prune_selection()


func _zoom(f: float) -> void:
	var z := clampf(cam.zoom.x * f, ZOOM_MIN, ZOOM_MAX)
	cam.zoom = Vector2(z, z)


func center_on(p: Vector2) -> void:
	cam.position = p


# ---------- wejście ----------

func _unhandled_input(event: InputEvent) -> void:
	if GameState.ended:
		return
	if event is InputEventMouseButton:
		var mb: InputEventMouseButton = event
		if mb.button_index == MOUSE_BUTTON_WHEEL_UP and mb.pressed:
			_zoom(1.1)
		elif mb.button_index == MOUSE_BUTTON_WHEEL_DOWN and mb.pressed:
			_zoom(1.0 / 1.1)
		elif mb.button_index == MOUSE_BUTTON_LEFT:
			if mb.pressed:
				if placing != "":
					_try_place(mb.shift_pressed)
				else:
					dragging = true
					drag_start_world = get_global_mouse_position()
			elif dragging:
				dragging = false
				hud.box_overlay.hide_box()
				_finish_select(mb.shift_pressed)
		elif mb.button_index == MOUSE_BUTTON_RIGHT and mb.pressed:
			if placing != "":
				cancel_placing()
			else:
				_command_at(get_global_mouse_position())
	elif event is InputEventMouseMotion:
		if placing != "":
			ghost.update_from_mouse()
		if dragging:
			var a: Vector2 = get_viewport().get_canvas_transform() * drag_start_world
			hud.box_overlay.set_box(Rect2(a, event.position - a).abs())
	elif event.is_action_pressed("cancel"):
		if placing != "":
			cancel_placing()
		else:
			_set_selection([])
	elif event.is_action_pressed("goto_tc"):
		var tc := world.find_first(func(e: Entity) -> bool: return e is Building and e.kind == "centrum" and e.team == 0)
		if tc != null:
			center_on(tc.position)
			_set_selection([tc])
	elif event.is_action_pressed("idle_villager"):
		var idle := world.entities.filter(func(e: Entity) -> bool: return e is Villager and e.team == 0 and e.is_idle())
		if idle.is_empty():
			GameState.message.emit("Wszyscy osadnicy pracują.")
		else:
			idle_cycle = (idle_cycle + 1) % idle.size()
			var v: Entity = idle[idle_cycle]
			center_on(v.position)
			_set_selection([v])


# ---------- zaznaczanie ----------

func _set_selection(arr: Array) -> void:
	for e in selected:
		if is_instance_valid(e):
			e.selected = false
	selected = arr.duplicate()
	for e in selected:
		e.selected = true
	hud.refresh_selection()


func _prune_selection() -> void:
	var before := selected.size()
	selected = selected.filter(func(e: Entity) -> bool: return is_instance_valid(e) and not e.dead)
	if selected.size() != before:
		hud.refresh_selection()


func _finish_select(shift: bool) -> void:
	var w_end := get_global_mouse_position()
	var r := Rect2(drag_start_world, w_end - drag_start_world).abs()
	var picked: Array = []
	if r.size.length() < 8.0:
		var e := world.entity_at(w_end)
		if e != null:
			picked = [e]
	else:
		var all := world.entities_in_rect(r)
		picked = all.filter(func(e: Entity) -> bool: return e is Unit and e.team == 0)
		if picked.is_empty():
			var bl := all.filter(func(e: Entity) -> bool: return e is Building and e.team == 0)
			if not bl.is_empty():
				picked = [bl[0]]
	if shift:
		var merged := selected.duplicate()
		for e in picked:
			if merged.has(e):
				merged.erase(e)
			else:
				merged.append(e)
		_set_selection(merged)
	else:
		_set_selection(picked)


# ---------- rozkazy ----------

func _command_at(world_pos: Vector2) -> void:
	var target := world.entity_at(world_pos)
	var cell := Iso.to_cell(world_pos)
	var movers: Array = []
	for e in selected:
		if not is_instance_valid(e) or e.team != 0:
			continue
		if e is Villager:
			if target is ResourceNode or (target is Building and target.is_farm and target.built and target.team == 0):
				e.command_gather(target)
			elif target is Building and target.team == 0 and not target.built:
				e.command_build(target)
			elif target != null and target.team == 1:
				e.command_attack(target)
			else:
				movers.append(e)
		elif e is Unit:
			if target != null and target.team == 1:
				e.command_attack(target)
			else:
				movers.append(e)
		elif e is Building:
			e.set_rally(cell)
	if not movers.is_empty():
		var cells := _spread_cells(cell, movers.size())
		for i in movers.size():
			movers[i].command_move(Iso.cell_center(cells[i]) if i < cells.size() else world_pos)


func _spread_cells(center: Vector2i, n: int) -> Array:
	var out: Array = []
	if world.is_walkable(center):
		out.append(center)
	var ring := 1
	while out.size() < n and ring < 8:
		for dy in range(-ring, ring + 1):
			for dx in range(-ring, ring + 1):
				if maxi(absi(dx), absi(dy)) != ring:
					continue
				var c := center + Vector2i(dx, dy)
				if world.is_walkable(c):
					out.append(c)
					if out.size() >= n:
						return out
		ring += 1
	return out


# ---------- budowanie ----------

func start_placing(kind: String) -> void:
	var def: Dictionary = Data.buildings.get(kind, {})
	if int(def.get("epoka", 0)) > GameState.age:
		GameState.message.emit("Wymaga epoki: %s." % GameState.age_name(int(def.get("epoka", 0))))
		return
	var req: String = def.get("wymaga", "")
	if req != "" and not world.has_building(0, req):
		GameState.message.emit("Najpierw zbuduj: %s." % Data.building_name(req))
		return
	var cost := GameState.building_cost(kind)
	if not GameState.can_afford(cost):
		GameState.message.emit(GameState.missing_text(cost))
		return
	placing = kind
	ghost.begin(kind)


func cancel_placing() -> void:
	placing = ""
	ghost.end()


func _try_place(keep: bool) -> void:
	ghost.update_from_mouse()
	if not ghost.valid:
		GameState.message.emit("Nie można tu budować.")
		return
	var cost := GameState.building_cost(placing)
	if not GameState.spend(cost):
		GameState.message.emit(GameState.missing_text(cost))
		cancel_placing()
		return
	var b := world.spawn_building(placing, ghost.origin, 0, false)
	for e in selected:
		if e is Villager:
			e.command_build(b)
	if not keep or not GameState.can_afford(cost):
		cancel_placing()
	hud.refresh_selection()
