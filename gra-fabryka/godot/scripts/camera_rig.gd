class_name CameraRig
extends Node3D
## Kamera w stylu The Sims 3: perspektywa, swobodny obrót (prawy przycisk myszy / Q, E),
## pochylenie, przybliżanie kółkiem, przesuwanie WSAD / strzałkami / środkowym przyciskiem.

const ZOOM_MIN := 6.0
const ZOOM_MAX := 45.0
const PITCH_MIN := -70.0
const PITCH_MAX := -18.0

var camera: Camera3D
var pivot: Node3D
var zoom: float = 22.0
var yaw_deg: float = 45.0
var pitch_deg: float = -38.0
var pan_speed: float = 16.0
var bounds := Rect2(0, 0, 56, 34)
var _rotating := false
var _dragging := false
var _target_zoom: float = 22.0


func _ready() -> void:
	pivot = Node3D.new()
	pivot.name = "Pitch"
	add_child(pivot)
	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_PERSPECTIVE
	camera.fov = 42.0
	camera.near = 0.2
	camera.far = 300.0
	pivot.add_child(camera)
	camera.current = true
	_target_zoom = zoom
	position = Vector3(10.0, 0.0, 17.0)
	_apply()


func _apply() -> void:
	rotation_degrees.y = yaw_deg
	pivot.rotation_degrees.x = pitch_deg
	camera.position = Vector3(0, 0, zoom)


func _process(delta: float) -> void:
	zoom = lerpf(zoom, _target_zoom, minf(1.0, delta * 8.0))
	if Input.is_action_pressed("cam_rotate_left"):
		yaw_deg += 70.0 * delta
	if Input.is_action_pressed("cam_rotate_right"):
		yaw_deg -= 70.0 * delta
	var move := Vector2.ZERO
	if Input.is_action_pressed("cam_left"):
		move.x -= 1
	if Input.is_action_pressed("cam_right"):
		move.x += 1
	if Input.is_action_pressed("cam_up"):
		move.y -= 1
	if Input.is_action_pressed("cam_down"):
		move.y += 1
	if move != Vector2.ZERO:
		_pan(move.normalized() * pan_speed * delta * (zoom / 20.0))
	_apply()


func _pan(v: Vector2) -> void:
	var fwd := -global_transform.basis.z
	fwd.y = 0
	fwd = fwd.normalized()
	var right := global_transform.basis.x
	right.y = 0
	right = right.normalized()
	var p := position + right * v.x + fwd * (-v.y)
	p.x = clampf(p.x, bounds.position.x, bounds.end.x)
	p.z = clampf(p.z, bounds.position.y, bounds.end.y)
	position = p


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_WHEEL_UP and mb.pressed:
			_target_zoom = clampf(_target_zoom * 0.88, ZOOM_MIN, ZOOM_MAX)
		elif mb.button_index == MOUSE_BUTTON_WHEEL_DOWN and mb.pressed:
			_target_zoom = clampf(_target_zoom * 1.14, ZOOM_MIN, ZOOM_MAX)
		elif mb.button_index == MOUSE_BUTTON_MIDDLE:
			_dragging = mb.pressed
		elif mb.button_index == MOUSE_BUTTON_RIGHT:
			_rotating = mb.pressed
	elif event is InputEventMouseMotion:
		var mm := event as InputEventMouseMotion
		if _dragging:
			_pan(-mm.relative * 0.025 * (zoom / 20.0))
		elif _rotating:
			yaw_deg -= mm.relative.x * 0.3
			pitch_deg = clampf(pitch_deg - mm.relative.y * 0.2, PITCH_MIN, PITCH_MAX)
	elif event.is_action_pressed("cam_zoom_in"):
		_target_zoom = clampf(_target_zoom - 3.0, ZOOM_MIN, ZOOM_MAX)
	elif event.is_action_pressed("cam_zoom_out"):
		_target_zoom = clampf(_target_zoom + 3.0, ZOOM_MIN, ZOOM_MAX)


func set_zoom(z: float) -> void:
	zoom = clampf(z, ZOOM_MIN, ZOOM_MAX)
	_target_zoom = zoom
	_apply()


func focus_on(p: Vector3) -> void:
	position = Vector3(clampf(p.x, bounds.position.x, bounds.end.x), 0, clampf(p.z, bounds.position.y, bounds.end.y))
