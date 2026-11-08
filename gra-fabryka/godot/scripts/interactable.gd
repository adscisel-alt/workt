class_name Interactable
extends Node3D
## Obiekt świata (mebel, maszyna, element podwórza), z którym Sim może wejść w interakcję.

var kind: String = ""
var def: Dictionary = {}
var grid_pos: Vector2i = Vector2i.ZERO   ## lewy-górny kafelek obiektu
var rot: int = 0                         ## obrót w krokach po 90°
var occupied_by: Node = null
var world: World = null
var mesh_root: Node3D = null
var body: StaticBody3D = null
var night_light: OmniLight3D = null


func setup(p_kind: String, p_grid: Vector2i, p_rot: int, p_world: World) -> void:
	kind = p_kind
	def = Catalog.get_def(kind)
	grid_pos = p_grid
	rot = p_rot % 4
	world = p_world
	name = "%s_%d_%d" % [kind, grid_pos.x, grid_pos.y]
	_build_visual()
	_update_transform()


func display_name() -> String:
	return String(def.get("name", kind))


func footprint_size() -> Vector2i:
	var fp: Vector2i = def.get("footprint", Vector2i(1, 1))
	if rot % 2 == 1:
		return Vector2i(fp.y, fp.x)
	return fp


func is_walkable() -> bool:
	return bool(def.get("walkable", false))


## Zamienia przesunięcie w układzie nieobróconego obiektu na kafelek świata.
func local_to_tile(off: Vector2i) -> Vector2i:
	var fp: Vector2i = def.get("footprint", Vector2i(1, 1))
	var w := fp.x
	var d := fp.y
	var r := Vector2i.ZERO
	match rot:
		0: r = off
		1: r = Vector2i(d - 1 - off.y, off.x)
		2: r = Vector2i(w - 1 - off.x, d - 1 - off.y)
		3: r = Vector2i(off.y, w - 1 - off.x)
	return grid_pos + r


func footprint_tiles() -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	var fp: Vector2i = def.get("footprint", Vector2i(1, 1))
	for i in fp.x:
		for j in fp.y:
			out.append(local_to_tile(Vector2i(i, j)))
	return out


func use_tile() -> Vector2i:
	return local_to_tile(def.get("use_offset", Vector2i(0, 1)))


func center_position() -> Vector3:
	var fs := footprint_size()
	return Vector3(grid_pos.x + fs.x * 0.5, 0.0, grid_pos.y + fs.y * 0.5)


func actions_for(sim: Node) -> Array:
	var out: Array = []
	for a in def.get("actions", []):
		var who: String = a.get("who", "")
		if who == "dorosly" and not sim.is_adult():
			continue
		if who == "dziecko" and sim.is_adult():
			continue
		out.append(a)
	return out


func is_free_for(sim: Node) -> bool:
	return occupied_by == null or occupied_by == sim


# ---------------------------------------------------------------------------
func _build_visual() -> void:
	mesh_root = Node3D.new()
	mesh_root.name = "Mesh"
	add_child(mesh_root)
	var model: String = def.get("model", kind)
	var inst := ModelLoader.instantiate_model(model)
	if inst == null:
		inst = ModelLoader.fallback_box(footprint_size(), Color(0.5, 0.4, 0.3))
	mesh_root.add_child(inst)

	body = StaticBody3D.new()
	body.name = "Body"
	body.collision_layer = 2
	body.collision_mask = 0
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	var fs := footprint_size()
	var h := 1.2
	if kind in ["komin"]:
		h = 12.0
	elif kind in ["latarnia", "brama_fabryczna", "wychodek", "kredens", "polka_ksiazki"]:
		h = 2.4
	box.size = Vector3(fs.x * 0.9, h, fs.y * 0.9)
	shape.shape = box
	shape.position = Vector3(0, h * 0.5, 0)
	body.add_child(shape)
	body.set_meta("owner_node", self)
	add_child(body)
	if kind in ["lampa", "latarnia"]:
		night_light = OmniLight3D.new()
		night_light.light_color = Color(1.0, 0.82, 0.55)
		night_light.shadow_enabled = false
		if kind == "lampa":
			night_light.position = Vector3(0, 0.95, 0)
			night_light.omni_range = 4.5
			night_light.light_energy = 1.6
		else:
			night_light.position = Vector3(0, 3.4, 0)
			night_light.omni_range = 8.0
			night_light.light_energy = 2.2
		night_light.visible = false
		add_child(night_light)


func _update_transform() -> void:
	position = center_position()
	mesh_root.rotation.y = -rot * PI * 0.5
	mesh_root.position = Vector3.ZERO


func set_placement(p_grid: Vector2i, p_rot: int) -> void:
	grid_pos = p_grid
	rot = p_rot % 4
	_update_transform()


func set_ghost(valid: bool) -> void:
	## Półprzezroczysty podgląd w trybie „Kup”.
	var col := Color(0.4, 1.0, 0.4, 0.55) if valid else Color(1.0, 0.3, 0.3, 0.55)
	for mi in mesh_root.find_children("*", "MeshInstance3D", true, false):
		var m := StandardMaterial3D.new()
		m.albedo_color = col
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		mi.material_override = m
	if body:
		body.collision_layer = 0


func clear_ghost() -> void:
	for mi in mesh_root.find_children("*", "MeshInstance3D", true, false):
		mi.material_override = null
	if body:
		body.collision_layer = 2
