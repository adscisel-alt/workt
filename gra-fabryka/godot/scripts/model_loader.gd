class_name ModelLoader
## Wczytywanie modeli GLB wygenerowanych w Blenderze, z zapasowymi bryłami,
## gdy plik nie istnieje (projekt działa także bez uruchomienia Blendera).

const MODEL_DIR := "res://assets/models/"
static var _cache: Dictionary = {}


static func instantiate_model(model_name: String) -> Node3D:
	var path := MODEL_DIR + model_name + ".glb"
	if not _cache.has(path):
		var res = null
		if ResourceLoader.exists(path):
			res = load(path)
		_cache[path] = res
	var scene = _cache[path]
	if scene == null or not (scene is PackedScene):
		return null
	var inst := (scene as PackedScene).instantiate()
	if inst is Node3D:
		return inst as Node3D
	var wrapper := Node3D.new()
	wrapper.add_child(inst)
	return wrapper


static func fallback_box(size_tiles: Vector2i, color: Color, height: float = 0.8) -> Node3D:
	var mi := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(size_tiles.x * 0.8, height, size_tiles.y * 0.8)
	mi.mesh = box
	mi.position.y = height * 0.5
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	mi.material_override = m
	return mi


static func fallback_person(height: float, color: Color) -> Node3D:
	var root := Node3D.new()
	var body := MeshInstance3D.new()
	var caps := CapsuleMesh.new()
	caps.radius = 0.2 * height / 1.75
	caps.height = height * 0.75
	body.mesh = caps
	body.position.y = height * 0.45
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	body.material_override = m
	root.add_child(body)
	var head := MeshInstance3D.new()
	var sph := SphereMesh.new()
	sph.radius = 0.14 * height / 1.75
	sph.height = sph.radius * 2
	head.mesh = sph
	head.position.y = height * 0.9
	var m2 := StandardMaterial3D.new()
	m2.albedo_color = Color(0.86, 0.68, 0.55)
	head.material_override = m2
	root.add_child(head)
	return root


static func flat_material(color: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = 0.9
	return m
