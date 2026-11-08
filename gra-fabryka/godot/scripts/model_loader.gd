class_name ModelLoader
## Wczytywanie modeli GLB i tekstur z Blendera, z zapasowymi bryłami,
## gdy plik nie istnieje. Ujednolica wygląd materiałów (miękkie cieniowanie
## i delikatne światło krawędziowe – styl zbliżony do The Sims 3).

const MODEL_DIR := "res://assets/models/"
const TEX_DIR := "res://assets/textures/"
static var _cache: Dictionary = {}
static var _tex_cache: Dictionary = {}
static var _tuned: Dictionary = {}


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
	var root: Node3D
	if inst is Node3D:
		root = inst as Node3D
	else:
		root = Node3D.new()
		root.add_child(inst)
	_tune_materials(root)
	return root


## Zwraca AnimationPlayer z zaimportowanej sceny (postacie) lub null.
static func find_animation_player(root: Node) -> AnimationPlayer:
	if root == null:
		return null
	var ap := root.find_child("AnimationPlayer", true, false)
	return ap as AnimationPlayer


static func _tune_materials(root: Node) -> void:
	for mi in root.find_children("*", "MeshInstance3D", true, false):
		var mesh: Mesh = mi.mesh
		if mesh == null:
			continue
		for i in mesh.get_surface_count():
			var m := mesh.surface_get_material(i)
			if m is StandardMaterial3D and not _tuned.has(m.get_instance_id()):
				_tuned[m.get_instance_id()] = true
				var sm := m as StandardMaterial3D
				sm.rim_enabled = true
				sm.rim = 0.22
				sm.rim_tint = 0.6
				sm.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
				sm.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
				if sm.cull_mode == BaseMaterial3D.CULL_DISABLED:
					sm.cull_mode = BaseMaterial3D.CULL_BACK


static func texture(name: String) -> Texture2D:
	var path := TEX_DIR + name + ".png"
	if not _tex_cache.has(path):
		_tex_cache[path] = load(path) if ResourceLoader.exists(path) else null
	return _tex_cache[path]


## Materiał podłogi / ściany z teksturą kafelkowaną co 1 m (lub płaski kolor, gdy brak pliku).
static func surface_material(tex_name: String, fallback: Color, uv_scale: Vector2 = Vector2.ONE, triplanar: bool = false) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.roughness = 0.9
	var t := texture(tex_name)
	if t:
		m.albedo_texture = t
		m.albedo_color = Color(1, 1, 1)
		m.uv1_scale = Vector3(uv_scale.x, uv_scale.y, 1.0)
		m.uv1_triplanar = triplanar
		m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	else:
		m.albedo_color = fallback
	return m


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
