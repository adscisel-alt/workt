class_name World
extends Node3D
## Parcela: fabryka, szkoła, kościół, ulica, famuła z izbą Walczaków, podwórze, sklep,
## szynk, targ i skwer. Siatka 1 kafelek = 1 m. Oś X w prawo, oś Z „w dół” (ku kamerze).

signal objects_changed

const W := 56
const H := 34

const COL := {
	"trawa": Color(0.36, 0.46, 0.26),
	"bruk": Color(0.42, 0.41, 0.40),
	"ziemia": Color(0.46, 0.38, 0.28),
	"deski": Color(0.58, 0.44, 0.28),
	"deski_szkola": Color(0.52, 0.40, 0.26),
	"cegla_podloga": Color(0.40, 0.30, 0.26),
	"sklep": Color(0.50, 0.38, 0.24),
	"kamien": Color(0.62, 0.60, 0.55),
	"mur_cegla": Color(0.56, 0.27, 0.19),
	"mur_tynk": Color(0.78, 0.72, 0.62),
	"mur_drewno": Color(0.45, 0.32, 0.20),
}
## Kolor → tekstura z assets/textures (floor_*.png)
const TEX := {
	"trawa": "floor_trawa", "bruk": "floor_bruk", "ziemia": "floor_ziemia", "deski": "floor_deski",
	"deski_szkola": "floor_deski_ciemne", "cegla_podloga": "floor_cegla_podloga", "sklep": "floor_deski_ciemne",
	"kamien": "floor_kamien", "mur_cegla": "floor_cegla", "mur_tynk": "floor_tynk", "mur_drewno": "floor_drewno_sciana",
}

## Obszary podłóg: nazwa, prostokąt (kafelki), kolor/tekstura.
const FLOORS := [
	["fabryka", Rect2i(1, 1, 20, 8), "cegla_podloga"],
	["szkola", Rect2i(25, 1, 10, 8), "deski_szkola"],
	["kosciol", Rect2i(40, 1, 12, 8), "kamien"],
	["ulica", Rect2i(0, 10, 56, 3), "bruk"],
	["dom", Rect2i(1, 14, 8, 7), "deski"],
	["podworze", Rect2i(10, 13, 8, 9), "ziemia"],
	["sklep", Rect2i(20, 14, 6, 5), "sklep"],
	["szynk", Rect2i(29, 14, 7, 6), "deski_szkola"],
	["targ", Rect2i(39, 13, 14, 10), "bruk"],
	["sciezka", Rect2i(10, 22, 8, 1), "ziemia"],
]

## Ściany: prostokąt zewnętrzny, kolor, kafelki drzwi (przerwy).
const WALLS := [
	[Rect2i(0, 0, 22, 10), "mur_cegla", [Vector2i(10, 9), Vector2i(11, 9)]],
	[Rect2i(24, 0, 12, 10), "mur_tynk", [Vector2i(29, 9), Vector2i(30, 9)]],
	[Rect2i(39, 0, 14, 10), "mur_cegla", [Vector2i(45, 9), Vector2i(46, 9)]],
	[Rect2i(0, 13, 10, 9), "mur_cegla", [Vector2i(4, 13), Vector2i(9, 17)]],
	[Rect2i(19, 13, 8, 7), "mur_drewno", [Vector2i(22, 13)]],
	[Rect2i(28, 13, 9, 8), "mur_drewno", [Vector2i(32, 13)]],
]

const HOME_RECT := Rect2i(1, 14, 8, 7)

## Początkowe obiekty: rodzaj, kafelek, obrót.
const OBJECTS := [
	# fabryka
	["krosno", Vector2i(3, 1), 0], ["krosno", Vector2i(6, 1), 0], ["krosno", Vector2i(9, 1), 0], ["krosno", Vector2i(12, 1), 0],
	["przedzarka", Vector2i(15, 1), 0], ["przedzarka", Vector2i(17, 1), 0],
	["maszyna_parowa", Vector2i(1, 5), 0],
	["wozek", Vector2i(6, 5), 0], ["wozek", Vector2i(10, 5), 0],
	["zegar_fabryczny", Vector2i(19, 1), 0],
	["komin", Vector2i(23, 1), 0],
	["brama_fabryczna", Vector2i(9, 10), 1],
	# szkoła
	["tablica", Vector2i(29, 1), 0],
	["lawka_szkolna", Vector2i(27, 3), 0], ["lawka_szkolna", Vector2i(29, 3), 0], ["lawka_szkolna", Vector2i(31, 3), 0],
	["lawka_szkolna", Vector2i(27, 5), 0], ["lawka_szkolna", Vector2i(29, 5), 0], ["lawka_szkolna", Vector2i(31, 5), 0],
	# kościół
	["oltarz", Vector2i(45, 1), 0],
	["lawka_koscielna", Vector2i(41, 4), 1], ["lawka_koscielna", Vector2i(41, 6), 1],
	["lawka_koscielna", Vector2i(44, 4), 1], ["lawka_koscielna", Vector2i(44, 6), 1],
	["lawka_koscielna", Vector2i(48, 4), 1], ["lawka_koscielna", Vector2i(48, 6), 1],
	# ulica
	["latarnia", Vector2i(6, 12), 0], ["latarnia", Vector2i(20, 12), 0], ["latarnia", Vector2i(33, 12), 0], ["latarnia", Vector2i(47, 12), 0],
	# izba Walczaków
	["lozko", Vector2i(1, 14), 0], ["lozko", Vector2i(1, 18), 0],
	["piec", Vector2i(8, 14), 0], ["kredens", Vector2i(7, 14), 0],
	["stol", Vector2i(4, 16), 0],
	["krzeslo", Vector2i(3, 16), 1], ["krzeslo", Vector2i(3, 17), 1], ["krzeslo", Vector2i(5, 17), 3],
	["balia", Vector2i(6, 20), 0], ["lampa", Vector2i(8, 20), 0], ["wiadro", Vector2i(8, 19), 0],
	# podwórze
	["studnia", Vector2i(12, 15), 0], ["wychodek", Vector2i(16, 14), 0],
	["drzewo", Vector2i(11, 19), 0], ["drzewo", Vector2i(16, 20), 0], ["lawka_parkowa", Vector2i(15, 17), 0],
	# sklep
	["lada_sklepowa", Vector2i(24, 15), 0],
	# szynk
	["szynkwas", Vector2i(35, 15), 0], ["stol_szynk", Vector2i(30, 15), 0], ["stol_szynk", Vector2i(30, 18), 0],
	["beczka", Vector2i(35, 19), 0], ["beczka", Vector2i(29, 19), 0],
	# targ
	["stragan", Vector2i(41, 15), 0], ["stragan", Vector2i(45, 15), 0], ["stragan", Vector2i(49, 15), 0],
	["kosz", Vector2i(44, 18), 0], ["kosz", Vector2i(48, 18), 0], ["latarnia", Vector2i(40, 22), 0],
	# skwer i południe
	["drzewo", Vector2i(30, 23), 0], ["drzewo", Vector2i(34, 25), 0], ["drzewo", Vector2i(29, 29), 0], ["drzewo", Vector2i(35, 30), 0],
	["drzewo", Vector2i(31, 32), 0], ["lawka_parkowa", Vector2i(32, 27), 0], ["latarnia", Vector2i(28, 22), 0],
	["drzewo", Vector2i(3, 25), 0], ["drzewo", Vector2i(8, 28), 0], ["drzewo", Vector2i(14, 25), 0], ["drzewo", Vector2i(20, 27), 0],
	["drzewo", Vector2i(24, 31), 0], ["lawka_parkowa", Vector2i(12, 29), 0], ["drzewo", Vector2i(44, 27), 0], ["drzewo", Vector2i(50, 30), 0],
	["lawka_parkowa", Vector2i(47, 26), 0],
]

const NPCS := [
	["npc_majster", Vector2i(14, 6), "majster Krauze"],
	["npc_nauczyciel", Vector2i(30, 2), "nauczyciel"],
	["npc_szynkarz", Vector2i(25, 15), "sklepikarz"],
	["npc_ksiadz", Vector2i(46, 2), "ksiądz"],
	["npc_szynkarz", Vector2i(35, 17), "szynkarz"],
	["npc_przekupka", Vector2i(46, 14), "przekupka"],
]

const FAMILY := [
	{"id": "jozef", "name": "Józef", "age": 38, "model": "sim_ojciec", "job": "tkacz", "color": Color(0.30, 0.34, 0.50), "traits": ["pracowity", "towarzyski"],
		"needs": {"glod": 65.0, "energia": 80.0, "higiena": 55.0, "potrzeba": 70.0, "zabawa": 50.0, "towarzystwo": 60.0, "komfort": 60.0}, "edukacja": 25.0, "tile": Vector2i(3, 15)},
	{"id": "marianna", "name": "Marianna", "age": 34, "model": "sim_matka", "job": "przadka", "color": Color(0.50, 0.28, 0.36), "traits": ["gospodarna", "pobozna"],
		"needs": {"glod": 60.0, "energia": 75.0, "higiena": 60.0, "potrzeba": 65.0, "zabawa": 45.0, "towarzystwo": 65.0, "komfort": 55.0}, "edukacja": 30.0, "tile": Vector2i(6, 15)},
	{"id": "antek", "name": "Antek", "age": 12, "model": "sim_chlopiec", "job": "", "enrolled": true, "color": Color(0.42, 0.34, 0.24), "traits": ["ciekawski", "lakomczuch"],
		"needs": {"glod": 55.0, "energia": 85.0, "higiena": 50.0, "potrzeba": 70.0, "zabawa": 60.0, "towarzystwo": 70.0, "komfort": 65.0}, "edukacja": 15.0, "tile": Vector2i(2, 17)},
	{"id": "zosia", "name": "Zosia", "age": 9, "model": "sim_dziewczynka", "job": "", "enrolled": true, "color": Color(0.58, 0.40, 0.46), "traits": ["wesola", "ksiazkowa"],
		"needs": {"glod": 60.0, "energia": 90.0, "higiena": 55.0, "potrzeba": 75.0, "zabawa": 55.0, "towarzystwo": 75.0, "komfort": 70.0}, "edukacja": 8.0, "tile": Vector2i(6, 18)},
]

## Przechodnie: model, punkty trasy, podpis
const WANDERERS := [
	["npc_robotnik", [Vector2i(1, 11), Vector2i(26, 11), Vector2i(54, 11), Vector2i(26, 12)], "robotnik"],
	["npc_robotnica", [Vector2i(54, 12), Vector2i(38, 12), Vector2i(23, 12), Vector2i(2, 12)], "robotnica"],
	["npc_pan", [Vector2i(37, 11), Vector2i(47, 20), Vector2i(43, 21), Vector2i(36, 22), Vector2i(30, 26)], "pan z kantoru"],
	["npc_przekupka", [Vector2i(40, 20), Vector2i(51, 20), Vector2i(50, 14), Vector2i(42, 14)], "przekupka"],
]

var astar := AStarGrid2D.new()
var objects: Array[Interactable] = []
var sims: Array[Sim] = []
var wall_nodes: Array[MeshInstance3D] = []
var wall_tiles: Dictionary = {}
var solid: Dictionary = {}
var walls_low: bool = true
var _social_anchor: Interactable = null
var objects_root: Node3D
var sims_root: Node3D


func _ready() -> void:
	astar.region = Rect2i(0, 0, W, H)
	astar.cell_size = Vector2(1, 1)
	astar.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
	astar.default_compute_heuristic = AStarGrid2D.HEURISTIC_OCTILE
	astar.default_estimate_heuristic = AStarGrid2D.HEURISTIC_OCTILE
	astar.update()

	objects_root = Node3D.new()
	objects_root.name = "Objects"
	add_child(objects_root)
	sims_root = Node3D.new()
	sims_root.name = "Sims"
	add_child(sims_root)

	_build_ground()
	_build_floors()
	_build_walls()
	for o in OBJECTS:
		place_object(o[0], o[1], o[2])
	for n in NPCS:
		_place_npc(n[0], n[1], n[2])
	for f in FAMILY:
		var s := Sim.new()
		sims_root.add_child(s)
		s.setup(f, self, f["tile"])
		sims.append(s)
	for wdef in WANDERERS:
		var w := Wanderer.new()
		add_child(w)
		w.setup(wdef[0], self, wdef[1], wdef[2])
	set_walls_low(true)


# ---------------------------------------------------------------------------
# Teren
# ---------------------------------------------------------------------------
func _build_ground() -> void:
	var ground := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(W + 40, H + 40)
	ground.mesh = plane
	ground.position = Vector3(W * 0.5, -0.01, H * 0.5)
	ground.material_override = ModelLoader.surface_material(TEX["trawa"], COL["trawa"], Vector2(W + 40, H + 40))
	add_child(ground)

	var body := StaticBody3D.new()
	body.collision_layer = 1
	body.collision_mask = 0
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(W + 40, 0.1, H + 40)
	shape.shape = box
	body.add_child(shape)
	body.position = Vector3(W * 0.5, -0.05, H * 0.5)
	body.set_meta("ground", true)
	add_child(body)

	var grid := MeshInstance3D.new()
	grid.name = "Grid"
	var im := ImmediateMesh.new()
	im.surface_begin(Mesh.PRIMITIVE_LINES)
	for x in range(W + 1):
		im.surface_add_vertex(Vector3(x, 0.02, 0))
		im.surface_add_vertex(Vector3(x, 0.02, H))
	for z in range(H + 1):
		im.surface_add_vertex(Vector3(0, 0.02, z))
		im.surface_add_vertex(Vector3(W, 0.02, z))
	im.surface_end()
	grid.mesh = im
	var gm := StandardMaterial3D.new()
	gm.albedo_color = Color(1, 1, 1, 0.25)
	gm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	gm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	grid.material_override = gm
	grid.visible = false
	add_child(grid)


func _build_floors() -> void:
	for f in FLOORS:
		var r: Rect2i = f[1]
		var mi := MeshInstance3D.new()
		var plane := PlaneMesh.new()
		plane.size = Vector2(r.size.x, r.size.y)
		mi.mesh = plane
		mi.position = Vector3(r.position.x + r.size.x * 0.5, 0.005, r.position.y + r.size.y * 0.5)
		mi.material_override = ModelLoader.surface_material(TEX[f[2]], COL[f[2]], Vector2(r.size.x, r.size.y))
		mi.name = "Floor_" + f[0]
		add_child(mi)


func _build_walls() -> void:
	for wdef in WALLS:
		var r: Rect2i = wdef[0]
		var mat := ModelLoader.surface_material(TEX[wdef[1]], COL[wdef[1]], Vector2(1, 1), true)
		var doors: Array = wdef[2]
		for x in range(r.position.x, r.end.x):
			for z in range(r.position.y, r.end.y):
				var edge := x == r.position.x or x == r.end.x - 1 or z == r.position.y or z == r.end.y - 1
				if not edge:
					continue
				var t := Vector2i(x, z)
				if t in doors:
					continue
				_add_wall_tile(t, mat)


func _add_wall_tile(t: Vector2i, mat: Material) -> void:
	if wall_tiles.has(t):
		return
	wall_tiles[t] = true
	_set_solid(t, true)
	var mi := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(1.0, 1.0, 1.0)
	mi.mesh = box
	mi.material_override = mat
	mi.position = Vector3(t.x + 0.5, 0.5, t.y + 0.5)
	add_child(mi)
	wall_nodes.append(mi)


func set_walls_low(low: bool) -> void:
	walls_low = low
	var h := 0.45 if low else 3.0
	for w in wall_nodes:
		w.scale = Vector3(1.0, h, 1.0)
		w.position.y = h * 0.5


func set_night(night: bool) -> void:
	for o in objects:
		if o.night_light:
			o.night_light.visible = night


func set_grid_visible(v: bool) -> void:
	var g := get_node_or_null("Grid")
	if g:
		g.visible = v


# ---------------------------------------------------------------------------
# Siatka przechodniości
# ---------------------------------------------------------------------------
func in_bounds(t: Vector2i) -> bool:
	return t.x >= 0 and t.y >= 0 and t.x < W and t.y < H


func _set_solid(t: Vector2i, s: bool) -> void:
	if not in_bounds(t):
		return
	if s:
		solid[t] = solid.get(t, 0) + 1
	else:
		solid[t] = max(0, solid.get(t, 0) - 1)
	astar.set_point_solid(t, solid[t] > 0)


func is_solid(t: Vector2i) -> bool:
	return not in_bounds(t) or solid.get(t, 0) > 0


func find_path(from: Vector2i, to: Vector2i) -> Array:
	if from == to:
		return []
	if not in_bounds(to) or is_solid(to) or not in_bounds(from):
		return []
	var from_was_solid := astar.is_point_solid(from)
	if from_was_solid:
		astar.set_point_solid(from, false)
	var ids := astar.get_id_path(from, to)
	if from_was_solid:
		astar.set_point_solid(from, true)
	var out: Array = []
	for i in range(1, ids.size()):
		out.append(ids[i])
	return out


## Trasa do kafelka użycia obiektu. Jeśli kafelek użycia leży na samym obiekcie
## (krzesło, ławka), Sim idzie do wolnego sąsiada i wchodzi na mebel ostatnim krokiem.
func path_to_object(from: Vector2i, obj: Interactable) -> Array:
	var dest := obj.use_tile()
	if from == dest:
		return []
	if not is_solid(dest):
		return find_path(from, dest)
	if dest in obj.footprint_tiles():
		var nb := nearest_free_neighbor(dest, from)
		if nb == dest:
			return []
		var p := find_path(from, nb) if from != nb else []
		if p.is_empty() and from != nb:
			return []
		p.append(dest)
		return p
	return []


func nearest_free_neighbor(target: Vector2i, from: Vector2i) -> Vector2i:
	var best := target
	var best_d := 1e9
	for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
		var t: Vector2i = target + d
		if is_solid(t):
			continue
		var dist := float((t - from).length_squared())
		if dist < best_d:
			best_d = dist
			best = t
	return best


func tile_from_world(p: Vector3) -> Vector2i:
	return Vector2i(int(floor(p.x)), int(floor(p.z)))


# ---------------------------------------------------------------------------
# Obiekty
# ---------------------------------------------------------------------------
func place_object(kind: String, grid: Vector2i, rot: int) -> Interactable:
	var obj := Interactable.new()
	objects_root.add_child(obj)
	obj.setup(kind, grid, rot, self)
	if not obj.is_walkable():
		for t in obj.footprint_tiles():
			_set_solid(t, true)
	objects.append(obj)
	objects_changed.emit()
	return obj


func remove_object(obj: Interactable) -> void:
	if obj.occupied_by != null and is_instance_valid(obj.occupied_by):
		obj.occupied_by._interrupt()
	if not obj.is_walkable():
		for t in obj.footprint_tiles():
			_set_solid(t, false)
	objects.erase(obj)
	obj.queue_free()
	objects_changed.emit()


func can_place(kind: String, grid: Vector2i, rot: int) -> bool:
	var probe := Interactable.new()
	probe.kind = kind
	probe.def = Catalog.get_def(kind)
	probe.grid_pos = grid
	probe.rot = rot % 4
	var ok := true
	for t in probe.footprint_tiles():
		if not HOME_RECT.has_point(t) or is_solid(t) or _sim_on_tile(t):
			ok = false
			break
	if ok and not probe.def.get("actions", []).is_empty() and not probe.def.has("sit_facing"):
		var u := probe.use_tile()
		if is_solid(u) or not in_bounds(u):
			ok = false
	probe.free()
	return ok


func _sim_on_tile(t: Vector2i) -> bool:
	for s in sims:
		if s.tile == t:
			return true
	return false


func _place_npc(model: String, t: Vector2i, label_text: String) -> void:
	var n := Node3D.new()
	n.name = "NPC_" + label_text
	var inst := ModelLoader.instantiate_model(model)
	if inst == null:
		inst = ModelLoader.fallback_person(1.75, Color(0.3, 0.3, 0.3))
	n.add_child(inst)
	var ap := ModelLoader.find_animation_player(inst)
	if ap and ap.has_animation("idle"):
		ap.get_animation("idle").loop_mode = Animation.LOOP_LINEAR
		ap.play("idle")
		ap.seek(randf() * 1.5, true)
	n.position = Vector3(t.x + 0.5, 0.0, t.y + 0.5)
	var lbl := Label3D.new()
	lbl.text = label_text
	lbl.font_size = 22
	lbl.pixel_size = 0.0009
	lbl.fixed_size = true
	lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	lbl.no_depth_test = true
	lbl.position.y = 2.05
	lbl.outline_size = 8
	n.add_child(lbl)
	add_child(n)
	_set_solid(t, true)


func social_anchor() -> Interactable:
	if _social_anchor == null:
		_social_anchor = Interactable.new()
		_social_anchor.kind = "rozmowa"
		_social_anchor.def = {"name": "Rozmowa", "footprint": Vector2i(1, 1), "actions": []}
		_social_anchor.name = "SocialAnchor"
		add_child(_social_anchor)
	return _social_anchor


# ---------------------------------------------------------------------------
# Wyszukiwanie dla autonomii
# ---------------------------------------------------------------------------
func _dist(a: Vector2i, b: Vector2i) -> int:
	return absi(a.x - b.x) + absi(a.y - b.y)


func find_object_for_need(need: String, sim: Sim) -> Interactable:
	var best: Interactable = null
	var best_d := 1 << 30
	for o in objects:
		if not o.is_free_for(sim):
			continue
		var has := false
		for a in o.actions_for(sim):
			if a.get("need", "") != need or a.get("kind", "zwykla") != "zwykla":
				continue
			if a.has("family_meal") or a.has("teach") or a.has("family_hygiene") or a.has("health"):
				continue
			if int(a.get("cost", 0)) > Game.money or int(a.get("food", 0)) > Game.food:
				continue
			has = true
			break
		if not has:
			continue
		var d := _dist(sim.tile, o.use_tile())
		if d < best_d:
			best_d = d
			best = o
	return best


func find_work_object(job: String, sim: Sim) -> Interactable:
	var best: Interactable = null
	var best_d := 1 << 30
	for o in objects:
		if not o.is_free_for(sim):
			continue
		for a in o.actions_for(sim):
			if a.get("kind", "") == "praca" and a.get("job", "") == job:
				var d := _dist(sim.tile, o.use_tile())
				if d < best_d:
					best_d = d
					best = o
	return best


func find_object_with_action(action_id: String, sim: Sim) -> Interactable:
	var best: Interactable = null
	var best_d := 1 << 30
	for o in objects:
		if not o.is_free_for(sim):
			continue
		for a in o.actions_for(sim):
			if a.get("id", "") == action_id:
				var d := _dist(sim.tile, o.use_tile())
				if d < best_d:
					best_d = d
					best = o
	return best


func nearest_other_sim(sim: Sim) -> Sim:
	var best: Sim = null
	var best_d := 1 << 30
	for s in sims:
		if s == sim:
			continue
		var d := _dist(sim.tile, s.tile)
		if d < best_d:
			best_d = d
			best = s
	return best
