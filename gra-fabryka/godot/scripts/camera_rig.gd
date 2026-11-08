class_name CameraRig
extends Node3D
## Kamera izometryczna w stylu The Sims: rzut ortogonalny, obrót co 45°, przybliżanie.

const PITCH_DEG := -32.0
const ZOOM_MIN := 8.0
const ZOOM_MAX := 34.0

var camera: Camera3D
var yaw_index: int = 1          ## 0..7 – co 45°
var target_yaw: float = 0.0
var zoom: float = 18.0
var pan_speed: float = 14.0
var _dragging := false
var bounds := Rect2(0, 0, 38, 26)


func _ready() -> void:
	var pivot := Node3D.new()
	pivot.name = "Pitch"
	pivot.rotation_degrees = Vector3(PITCH_DEG, 0, 0)
	add_child(pivot)
	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = zoom
	camera.near = 0.1
	camera.far = 200.0
	camera.position = Vector3(0, 0, 60)
	pivot.add_child(camera)
	camera.current = true
	position = Vector3(bounds.size.x * 0.5, 0, bounds.size.y * 0.55)
	target_yaw = yaw_index * 45.0
	rotation_degrees.y = target_yaw


func _process(delta: float) -> void:
	# płynny obrót
	var cur := rotation_degrees.y
	var diff := fmod(target_yaw - cur + 540.0, 360.0) - 180.0
	rotation_degrees.y = cur + diff * minf(1.0, delta * 8.0)
	camera.size = lerpf(camera.size, zoom, minf(1.0, delta * 8.0))
	# przesuwanie klawiszami
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
		_pan(move.normalized() * pan_speed * delta * (zoom / 18.0))


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
			zoom = clampf(zoom - 2.0, ZOOM_MIN, ZOOM_MAX)
		elif mb.button_index == MOUSE_BUTTON_WHEEL_DOWN and mb.pressed:
			zoom = clampf(zoom + 2.0, ZOOM_MIN, ZOOM_MAX)
		elif mb.button_index == MOUSE_BUTTON_MIDDLE:
			_dragging = mb.pressed
	elif event is InputEventMouseMotion and _dragging:
		var mm := event as InputEventMouseMotion
		_pan(-mm.relative * 0.02 * (zoom / 18.0))
	elif event.is_action_pressed("cam_rotate_left"):
		yaw_index = (yaw_index + 1) % 8
		target_yaw = yaw_index * 45.0
	elif event.is_action_pressed("cam_rotate_right"):
		yaw_index = (yaw_index + 7) % 8
		target_yaw = yaw_index * 45.0
	elif event.is_action_pressed("cam_zoom_in"):
		zoom = clampf(zoom - 3.0, ZOOM_MIN, ZOOM_MAX)
	elif event.is_action_pressed("cam_zoom_out"):
		zoom = clampf(zoom + 3.0, ZOOM_MIN, ZOOM_MAX)


func focus_on(p: Vector3) -> void:
	position = Vector3(clampf(p.x, bounds.position.x, bounds.end.x), 0, clampf(p.z, bounds.position.y, bounds.end.y))
