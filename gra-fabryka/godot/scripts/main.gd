extends Node3D
## Węzeł główny: tworzy świat, kamerę, oświetlenie i HUD; obsługuje kliknięcia i tryby.

var world: World
var cam: CameraRig
var hud: Hud
var sun: DirectionalLight3D
var env: WorldEnvironment
var audio: AudioManager
var _night: bool = false

var selected: Sim = null
var mode: String = "zyj"
var buy_kind: String = ""
var buy_rot: int = 0
var ghost: Interactable = null
var _last_mouse := Vector2.ZERO


func _ready() -> void:
	_setup_input()
	_setup_lighting()
	world = World.new()
	world.name = "World"
	add_child(world)
	cam = CameraRig.new()
	cam.name = "CameraRig"
	cam.bounds = Rect2(0, 0, World.W, World.H)
	add_child(cam)
	cam.focus_on(Vector3(9.0, 0.0, 16.0))
	audio = AudioManager.new()
	audio.name = "Audio"
	add_child(audio)
	audio.setup_world(world)
	hud = Hud.new()
	hud.name = "HUD"
	hud.main = self
	add_child(hud)
	hud.mode_requested.connect(set_mode)
	hud.sim_selected.connect(select_sim)
	hud.buy_kind_selected.connect(_start_buy)
	hud.walls_toggle_requested.connect(_toggle_walls)
	hud.restart_requested.connect(_restart)
	if not world.sims.is_empty():
		select_sim(world.sims[0])
	hud.show_intro()


func _setup_input() -> void:
	var map := {
		"cam_left": [KEY_A, KEY_LEFT], "cam_right": [KEY_D, KEY_RIGHT],
		"cam_up": [KEY_W, KEY_UP], "cam_down": [KEY_S, KEY_DOWN],
		"cam_rotate_left": [KEY_Q], "cam_rotate_right": [KEY_E],
		"cam_zoom_in": [KEY_EQUAL, KEY_KP_ADD], "cam_zoom_out": [KEY_MINUS, KEY_KP_SUBTRACT],
		"pause": [KEY_SPACE], "speed1": [KEY_1], "speed2": [KEY_2], "speed3": [KEY_3],
		"walls": [KEY_H], "rotate_item": [KEY_R], "cancel": [KEY_ESCAPE],
	}
	for action in map.keys():
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		for key in map[action]:
			var ev := InputEventKey.new()
			ev.physical_keycode = key
			InputMap.action_add_event(action, ev)


func _setup_lighting() -> void:
	sun = DirectionalLight3D.new()
	sun.name = "Sun"
	sun.rotation_degrees = Vector3(-50, 35, 0)
	sun.shadow_enabled = true
	sun.light_energy = 1.0
	sun.shadow_blur = 1.5
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
	sun.directional_shadow_max_distance = 90.0
	add_child(sun)
	env = WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.47, 0.53, 0.60)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.72, 0.76, 0.85)
	e.ambient_light_energy = 0.55
	e.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	e.fog_enabled = true
	e.fog_light_color = Color(0.6, 0.6, 0.62)
	e.fog_density = 0.0006
	env.environment = e
	add_child(env)


func _process(_delta: float) -> void:
	_update_daylight()


func _update_daylight() -> void:
	var h := Game.hour_f()
	# jasność: noc 0.15, dzień 1.1; wschód ~5:30, zachód ~19:30 (kwiecień/maj)
	var day_t := clampf((h - 5.0) / 2.0, 0.0, 1.0) * clampf((20.5 - h) / 2.0, 0.0, 1.0)
	sun.light_energy = lerpf(0.3, 1.0, day_t)
	var night := day_t < 0.5
	if night != _night:
		_night = night
		world.set_night(night)
	sun.light_color = Color(1.0, 0.93, 0.82).lerp(Color(0.5, 0.6, 0.9), 1.0 - day_t)
	sun.rotation_degrees.x = lerpf(-15.0, -55.0, sin(clampf((h - 5.0) / 15.0, 0.0, 1.0) * PI))
	var e := env.environment
	e.ambient_light_energy = lerpf(0.4, 0.55, day_t)
	e.ambient_light_color = Color(0.45, 0.5, 0.75).lerp(Color(0.72, 0.76, 0.85), day_t)
	e.background_color = Color(0.08, 0.09, 0.14).lerp(Color(0.47, 0.53, 0.60), day_t)
	# dym fabryczny: mgła gęstsza w godzinach pracy
	var working := h >= 6.0 and h < 19.0 and not Game.is_sunday() and not Game.strike_active
	e.fog_density = 0.0011 if working else 0.0005


# ---------------------------------------------------------------------------
# Wejście
# ---------------------------------------------------------------------------
func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause"):
		Game.toggle_pause()
	elif event.is_action_pressed("speed1"):
		Game.set_speed(1)
	elif event.is_action_pressed("speed2"):
		Game.set_speed(2)
	elif event.is_action_pressed("speed3"):
		Game.set_speed(3)
	elif event.is_action_pressed("walls"):
		_toggle_walls()
	elif event.is_action_pressed("rotate_item"):
		if ghost:
			buy_rot = (buy_rot + 1) % 4
			_update_ghost(_last_mouse)
	elif event.is_action_pressed("cancel"):
		if mode == "kup":
			set_mode("zyj")
	elif event is InputEventMouseMotion:
		_last_mouse = (event as InputEventMouseMotion).position
		if ghost:
			_update_ghost(_last_mouse)
	elif event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.pressed and mb.button_index == MOUSE_BUTTON_LEFT:
			_click(mb.position)
		elif mb.pressed and mb.button_index == MOUSE_BUTTON_RIGHT:
			if mode == "kup":
				set_mode("zyj")


func _raycast(screen_pos: Vector2, mask: int) -> Dictionary:
	var from := cam.camera.project_ray_origin(screen_pos)
	var dir := cam.camera.project_ray_normal(screen_pos)
	var q := PhysicsRayQueryParameters3D.create(from, from + dir * 400.0, mask)
	q.collide_with_areas = false
	return get_world_3d().direct_space_state.intersect_ray(q)


func _ground_point(screen_pos: Vector2) -> Vector3:
	var from := cam.camera.project_ray_origin(screen_pos)
	var dir := cam.camera.project_ray_normal(screen_pos)
	if absf(dir.y) < 0.0001:
		return Vector3.INF
	var t := -from.y / dir.y
	return from + dir * t


func _click(screen_pos: Vector2) -> void:
	if Game.paused_by_event:
		return
	if mode == "kup":
		_click_buy(screen_pos)
		return
	# najpierw Simowie, potem obiekty
	var hit := _raycast(screen_pos, 4)
	if not hit.is_empty():
		var owner_node = hit["collider"].get_meta("owner_node", null)
		if owner_node is Sim:
			if selected != null and selected != owner_node and is_instance_valid(selected):
				hud.show_talk_menu(owner_node, selected, screen_pos)
			else:
				select_sim(owner_node)
			return
	hit = _raycast(screen_pos, 2)
	if not hit.is_empty():
		var owner_node = hit["collider"].get_meta("owner_node", null)
		if owner_node is Interactable and selected != null:
			hud.show_actions(owner_node, selected, screen_pos)
			return


func select_sim(sim: Sim) -> void:
	if selected and is_instance_valid(selected):
		selected.selected = false
	selected = sim
	if sim:
		sim.selected = true
	hud.set_selected(sim)


func set_mode(m: String) -> void:
	mode = m
	hud.set_mode(m)
	world.set_grid_visible(m == "kup")
	if m != "kup":
		_clear_ghost()
		buy_kind = ""
		if Game.speed == 0:
			Game.set_speed(1)
	else:
		Game.set_speed(0)
		Game.say("Tryb „Kup”: czas zatrzymany. Meble można stawiać tylko w izbie Walczaków.", "info")


func _toggle_walls() -> void:
	world.set_walls_low(not world.walls_low)


# ---------------------------------------------------------------------------
# Tryb „Kup”
# ---------------------------------------------------------------------------
func _start_buy(kind: String) -> void:
	_clear_ghost()
	buy_kind = kind
	buy_rot = 0
	ghost = Interactable.new()
	world.add_child(ghost)
	ghost.setup(kind, Vector2i(4, 17), 0, world)
	ghost.set_ghost(true)
	_update_ghost(_last_mouse)


func _clear_ghost() -> void:
	if ghost and is_instance_valid(ghost):
		ghost.queue_free()
	ghost = null


func _update_ghost(screen_pos: Vector2) -> void:
	if ghost == null:
		return
	var p := _ground_point(screen_pos)
	if p == Vector3.INF:
		return
	var t := world.tile_from_world(p)
	ghost.set_placement(t, buy_rot)
	ghost.set_ghost(world.can_place(buy_kind, t, buy_rot))


func _click_buy(screen_pos: Vector2) -> void:
	if ghost != null and buy_kind != "":
		var p := _ground_point(screen_pos)
		var t := world.tile_from_world(p)
		var price := int(Catalog.get_def(buy_kind)["price"])
		if not world.can_place(buy_kind, t, buy_rot):
			Game.say("Tu nie można postawić mebla (poza izbą lub miejsce zajęte).", "warn")
			return
		if not Game.spend(price, Catalog.get_def(buy_kind)["name"]):
			return
		world.place_object(buy_kind, t, buy_rot)
		Game.say("Kupiono: %s za %s." % [Catalog.get_def(buy_kind)["name"], Catalog.price_text(price)], "money")
		return
	# sprzedaż – kliknięcie mebla w izbie
	var hit := _raycast(screen_pos, 2)
	if not hit.is_empty():
		var owner_node = hit["collider"].get_meta("owner_node", null)
		if owner_node is Interactable and owner_node.def.get("category", "") == "mieszkanie":
			var refund := int(owner_node.def.get("price", 0)) / 2
			var nm: String = owner_node.display_name()
			world.remove_object(owner_node)
			Game.money += refund
			Game.money_changed.emit(Game.money)
			Game.say("Sprzedano: %s za %s." % [nm, Catalog.price_text(refund)], "money")


func _restart() -> void:
	Game.get_tree().reload_current_scene()
	# autoloady nie są przeładowywane – zresetuj stan ręcznie
	Game.family.clear()
	Game.day = 1
	Game.minute_of_day = 6.0 * 60.0 + 30.0
	Game.money = 420
	Game.food = 5
	Game.flags.clear()
	Game.wishes_done = 0
	Game.wish_points = 0
	Game.messages.clear()
	Game.fines_total = 0
	Game.wages_total = 0
	Game.strike_active = false
	Game.paused_by_event = false
	Game.set_speed(1)
	Edu.unlocked.clear()
	Edu.quiz_correct = 0
	Edu.quiz_total = 0
