class_name Wanderer
extends Node3D
## Przechodzień – postać tła, która krąży między punktami (ulica, targ), żeby miasto żyło.
## Nie ma potrzeb; chodzi, przystaje, czasem zamienia słowo z innym przechodniem.

const WALK_TILES_PER_MIN := 1.3

var world: World = null
var waypoints: Array = []     ## Array[Vector2i]
var tile: Vector2i
var path: Array = []
var _wp_index: int = 0
var _progress: float = 0.0
var _wait: float = 0.0
var mesh_root: Node3D
var anim: AnimationPlayer
var _anim_name := ""
var _target_yaw := 0.0
var active_hours := Vector2(5.0, 22.0)


func setup(model: String, p_world: World, p_waypoints: Array, label_text: String = "") -> void:
	world = p_world
	waypoints = p_waypoints
	tile = waypoints[0]
	position = Vector3(tile.x + 0.5, 0.0, tile.y + 0.5)
	mesh_root = Node3D.new()
	add_child(mesh_root)
	var inst := ModelLoader.instantiate_model(model)
	if inst == null:
		inst = ModelLoader.fallback_person(1.7, Color(0.4, 0.4, 0.4))
	mesh_root.add_child(inst)
	anim = ModelLoader.find_animation_player(inst)
	if anim:
		for a in anim.get_animation_list():
			anim.get_animation(a).loop_mode = Animation.LOOP_LINEAR
		anim.play("idle")
		anim.seek(randf() * 2.0, true)
	if label_text != "":
		var lbl := Label3D.new()
		lbl.text = label_text
		lbl.font_size = 20
		lbl.pixel_size = 0.0009
		lbl.fixed_size = true
		lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		lbl.no_depth_test = true
		lbl.position.y = 2.0
		lbl.outline_size = 8
		lbl.modulate = Color(0.85, 0.85, 0.85, 0.8)
		add_child(lbl)
	_wait = randf_range(0.0, 20.0)


func _play(n: String) -> void:
	if anim == null or _anim_name == n or not anim.has_animation(n):
		return
	_anim_name = n
	anim.play(n, 0.3)


func _process(delta: float) -> void:
	if Game.paused_by_event or Game.speed == 0:
		return
	var h := Game.hour_f()
	var mins: float = minf(delta * Game.MINUTES_PER_SECOND[Game.speed], 10.0)
	# płynny obrót
	mesh_root.rotation.y = lerp_angle(mesh_root.rotation.y, _target_yaw, minf(1.0, delta * 8.0))
	if h < active_hours.x or h > active_hours.y:
		visible = false
		return
	visible = true
	if _wait > 0.0:
		_wait -= mins
		_play("idle")
		return
	if path.is_empty():
		_wp_index = (_wp_index + 1) % waypoints.size()
		path = world.find_path(tile, waypoints[_wp_index])
		if path.is_empty():
			_wait = 10.0
			return
	_play("walk")
	_progress += mins * WALK_TILES_PER_MIN
	while _progress >= 1.0 and not path.is_empty():
		_progress -= 1.0
		tile = path.pop_front()
	var from := Vector3(tile.x + 0.5, 0.0, tile.y + 0.5)
	if path.is_empty():
		position = from
		_wait = randf_range(15.0, 60.0)
		return
	var nxt: Vector2i = path[0]
	var to := Vector3(nxt.x + 0.5, 0.0, nxt.y + 0.5)
	position = from.lerp(to, clampf(_progress, 0.0, 1.0))
	var dir := to - from
	if dir.length_squared() > 0.001:
		_target_yaw = atan2(dir.x, dir.z)
