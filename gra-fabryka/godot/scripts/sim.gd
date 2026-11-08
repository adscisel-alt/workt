class_name Sim
extends Node3D
## Członek rodziny Walczaków: potrzeby, nastrój, cechy charakteru, życzenia, relacje,
## praca/szkoła, kolejka czynności i autonomia.

signal needs_changed
signal queue_changed
signal state_text_changed(text: String)
signal wish_fulfilled(sim: Sim, wish: Dictionary)

enum State { IDLE, WALK, USE }

const NEED_NAMES := {
	"glod": "Głód", "energia": "Energia", "higiena": "Higiena", "potrzeba": "Potrzeba",
	"zabawa": "Zabawa", "towarzystwo": "Towarzystwo", "komfort": "Komfort", "edukacja": "Edukacja",
}
## Spadek potrzeby na godzinę gry (na jawie). Łagodniejszy niż w pierwszej wersji –
## gra ma być o decyzjach, nie o gaszeniu pożarów.
const DECAY := {
	"glod": 4.0, "energia": 3.0, "higiena": 2.8, "potrzeba": 4.0,
	"zabawa": 2.8, "towarzystwo": 2.2, "komfort": 2.4, "edukacja": 0.0,
}
const WALK_TILES_PER_MIN := 1.6

## Cechy charakteru (jak w The Sims 3) – opis i wpływ na rozgrywkę.
const TRAITS := {
	"pracowity": {"name": "Pracowity", "desc": "zarabia o 10% więcej, praca mniej szkodzi zdrowiu"},
	"towarzyski": {"name": "Towarzyski", "desc": "szybciej tęskni za ludźmi, ale rozmowy dają mu więcej"},
	"gospodarna": {"name": "Gospodarna", "desc": "zakupy są o 15% tańsze"},
	"pobozna": {"name": "Pobożna", "desc": "msza daje podwójny spokój i radość"},
	"ciekawski": {"name": "Ciekawski", "desc": "uczy się o 30% szybciej, maszyny go fascynują"},
	"lakomczuch": {"name": "Łakomczuch", "desc": "szybciej głodnieje, ale jedzenie poprawia komfort"},
	"wesola": {"name": "Wesoła", "desc": "zabawa spada o 40% wolniej"},
	"ksiazkowa": {"name": "Książkowa", "desc": "czytanie uczy dwa razy szybciej i bardziej cieszy"},
}

## Życzenia: krótkoterminowe pragnienia (jak w The Sims 3). Spełnienie = premia nastroju i punkty.
const WISHES := [
	{"id": "w_gazeta", "text": "Przeczytać gazetę", "action": "czytaj_gazete", "who": "dorosly", "points": 8},
	{"id": "w_lawka", "text": "Posiedzieć na ławce na świeżym powietrzu", "action": "lawka", "who": "", "points": 6},
	{"id": "w_rozmowa", "text": "Porozmawiać z kimś z rodziny", "action": "rozmowa", "who": "", "points": 8},
	{"id": "w_obiad", "text": "Zjeść wspólny obiad", "action": "ugotuj_rodzina", "who": "dorosly", "points": 12},
	{"id": "w_msza", "text": "Pójść w niedzielę do kościoła", "action": "msza", "who": "", "points": 10},
	{"id": "w_piwo", "text": "Wyskoczyć na kufel do szynku", "action": "piwo", "who": "dorosly", "points": 6},
	{"id": "w_zabawa", "text": "Pobawić się na podwórzu", "action": "zabawa_drzewo", "who": "dziecko", "points": 8},
	{"id": "w_lekcje", "text": "Odrobić lekcje przy stole", "action": "odrabiaj", "who": "dziecko", "points": 10},
	{"id": "w_spacer", "text": "Odetchnąć świeżym powietrzem", "action": "spacer", "who": "", "points": 5},
	{"id": "w_ksiazka", "text": "Poczytać książkę", "action": "czytaj", "who": "", "points": 10},
	{"id": "w_kapiel", "text": "Porządnie się umyć", "action": "umyj", "who": "", "points": 5},
	{"id": "w_maszyna", "text": "Obejrzeć z bliska maszynę parową", "action": "ogladaj_maszyne", "who": "", "points": 8},
	{"id": "w_targ", "text": "Zrobić zakupy na targu", "action": "targ_zakupy", "who": "dorosly", "points": 6},
	{"id": "w_nauka", "text": "Nauczyć dziecko czytać", "action": "ucz_dziecko", "who": "dorosly", "points": 14},
]

var sim_id: String = ""
var sim_name: String = ""
var age: int = 30
var model_name: String = ""
var portrait_color: Color = Color.WHITE
var traits: Array = []

var needs: Dictionary = {}
var health: float = 90.0
var sick: bool = false
var job: String = ""
var enrolled: bool = false
var striking: bool = false

var wages_owed: float = 0.0
var hours_today: float = 0.0
var fined_today: bool = false
var worked_days: int = 0
var quiz_today: bool = false

var wishes: Array = []            ## aktywne życzenia (maks. 2)
var wishes_done: int = 0
var relations: Dictionary = {}    ## sim_id -> 0..100

var state: State = State.IDLE
var queue: Array = []
var current: Dictionary = {}
var path: Array = []
var tile: Vector2i = Vector2i.ZERO
var _move_progress: float = 0.0
var _use_elapsed: float = 0.0
var _idle_timer: float = 0.0
var _bob_t: float = 0.0
var _target_yaw: float = 0.0

var world: World = null
var mesh_root: Node3D = null
var plumbob: MeshInstance3D = null
var plumbob_mat: StandardMaterial3D = null
var label: Label3D = null
var thought: Label3D = null
var anim: AnimationPlayer = null
var _anims: Array = []            ## AnimationPlayer każdego stroju
var _outfits: Array = []          ## węzły strojów [roboczy, świąteczny]
var _anim_name: String = ""
var _pose_locked: bool = false
var _rng := RandomNumberGenerator.new()
var selected: bool = false:
	set(v):
		selected = v
		if plumbob:
			plumbob.visible = v


func setup(data: Dictionary, p_world: World, start_tile: Vector2i) -> void:
	world = p_world
	sim_id = data["id"]
	sim_name = data["name"]
	age = data["age"]
	model_name = data["model"]
	portrait_color = data.get("color", Color.WHITE)
	job = data.get("job", "")
	enrolled = data.get("enrolled", false)
	traits = data.get("traits", [])
	name = "Sim_" + sim_id
	_rng.seed = hash(sim_id)
	for k in NEED_NAMES.keys():
		needs[k] = data.get("needs", {}).get(k, 70.0)
	needs["edukacja"] = data.get("edukacja", 10.0)
	tile = start_tile
	position = _tile_pos(tile)
	_build_visual()
	Game.register_sim(self)
	Game.tick.connect(_on_tick)
	Game.day_changed.connect(_on_day)
	_roll_wishes()
	_update_outfit()


func is_adult() -> bool:
	return age >= 16


func has_trait(t: String) -> bool:
	return t in traits


func height() -> float:
	return 1.75 if is_adult() else (1.25 if age >= 11 else 1.1)


# ---------------------------------------------------------------------------
# Wygląd: dwa stroje (roboczy / świąteczny), plumbob, etykiety
# ---------------------------------------------------------------------------
func _build_visual() -> void:
	mesh_root = Node3D.new()
	add_child(mesh_root)
	for suffix in ["", "_swieto"]:
		var inst := ModelLoader.instantiate_model(model_name + suffix)
		if inst == null:
			if suffix == "":
				inst = ModelLoader.fallback_person(height(), portrait_color)
			else:
				continue
		mesh_root.add_child(inst)
		_outfits.append(inst)
		var ap := ModelLoader.find_animation_player(inst)
		if ap:
			for a in ap.get_animation_list():
				ap.get_animation(a).loop_mode = Animation.LOOP_LINEAR
			_anims.append(ap)
	anim = _anims[0] if not _anims.is_empty() else null
	_play_anim("idle")

	plumbob = MeshInstance3D.new()
	var prism := PrismMesh.new()
	prism.size = Vector3(0.3, 0.45, 0.3)
	plumbob.mesh = prism
	plumbob_mat = StandardMaterial3D.new()
	plumbob_mat.albedo_color = Color(0.25, 0.9, 0.3)
	plumbob_mat.emission_enabled = true
	plumbob_mat.emission = Color(0.1, 0.6, 0.15)
	plumbob.material_override = plumbob_mat
	plumbob.position.y = height() + 0.55
	plumbob.visible = false
	add_child(plumbob)

	label = Label3D.new()
	label.text = sim_name
	label.font_size = 26
	label.pixel_size = 0.0009
	label.fixed_size = true
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.no_depth_test = true
	label.position.y = height() + 0.25
	label.outline_size = 8
	add_child(label)

	thought = Label3D.new()
	thought.font_size = 22
	thought.pixel_size = 0.0009
	thought.fixed_size = true
	thought.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	thought.no_depth_test = true
	thought.position.y = height() + 0.9
	thought.outline_size = 6
	thought.modulate = Color(1.0, 0.85, 0.5)
	thought.visible = false
	add_child(thought)

	var body := StaticBody3D.new()
	body.collision_layer = 4
	body.collision_mask = 0
	var shape := CollisionShape3D.new()
	var caps := CapsuleShape3D.new()
	caps.radius = 0.3
	caps.height = height()
	shape.shape = caps
	shape.position.y = height() * 0.5
	body.add_child(shape)
	body.set_meta("owner_node", self)
	add_child(body)


func _update_outfit() -> void:
	if _outfits.size() < 2:
		return
	var sunday := Game.is_sunday()
	_outfits[0].visible = not sunday
	_outfits[1].visible = sunday
	anim = _anims[1] if sunday and _anims.size() > 1 else _anims[0]
	var keep := _anim_name
	_anim_name = ""
	_play_anim(keep if keep != "" else "idle")


func _tile_pos(t: Vector2i) -> Vector3:
	return Vector3(t.x + 0.5, 0.0, t.y + 0.5)


func _play_anim(anim_name: String) -> void:
	if _anims.is_empty() or _anim_name == anim_name:
		return
	_anim_name = anim_name
	for ap in _anims:
		var n := anim_name
		if not ap.has_animation(n):
			n = "idle"
		if ap.has_animation(n):
			ap.play(n, 0.25)


func _set_anim_speed(v: float) -> void:
	for ap in _anims:
		ap.speed_scale = v


## Animacja odpowiadająca czynności (jawna w katalogu albo wynikająca z obiektu).
func _anim_for(obj: Interactable, act: Dictionary) -> String:
	if act.has("anim"):
		return String(act["anim"])
	match String(act.get("kind", "zwykla")):
		"praca":
			return "work"
		"szkola":
			return "sit"
	if String(act.get("id", "")) == "rozmowa":
		return "talk"
	if obj != null and obj.def.has("sit_facing"):
		return "sit"
	return "idle"


# ---------------------------------------------------------------------------
# Nastrój
# ---------------------------------------------------------------------------
func mood() -> float:
	var w := {"glod": 0.2, "energia": 0.2, "higiena": 0.1, "potrzeba": 0.1, "zabawa": 0.15, "towarzystwo": 0.15, "komfort": 0.1}
	var m := 0.0
	for k in w.keys():
		m += needs[k] * w[k]
	if sick:
		m -= 15.0
	return clampf(m, 0.0, 100.0)


func mood_text() -> String:
	var m := mood()
	if m > 75.0:
		return "świetny"
	if m > 55.0:
		return "dobry"
	if m > 35.0:
		return "taki sobie"
	return "zły"


func lowest_need() -> String:
	var lowest := ""
	var lv := 101.0
	for k in ["glod", "energia", "higiena", "potrzeba", "zabawa", "towarzystwo", "komfort"]:
		if needs[k] < lv:
			lv = needs[k]
			lowest = k
	return lowest


func _update_mood_visuals() -> void:
	var m := mood() / 100.0
	var col := Color(0.85, 0.2, 0.15).lerp(Color(0.95, 0.8, 0.2), clampf(m * 2.0, 0.0, 1.0))
	if m > 0.5:
		col = Color(0.95, 0.8, 0.2).lerp(Color(0.25, 0.9, 0.3), clampf((m - 0.5) * 2.0, 0.0, 1.0))
	plumbob_mat.albedo_color = col
	plumbob_mat.emission = col * 0.6
	var ln := lowest_need()
	if ln != "" and needs[ln] < 40.0 and state != State.USE:
		var words := {"glod": "głodny/a…", "energia": "zmęczony/a…", "higiena": "brudno mi…", "potrzeba": "muszę do wychodka…",
			"zabawa": "nudzę się…", "towarzystwo": "samotnie…", "komfort": "bolą mnie nogi…"}
		thought.text = words.get(ln, "")
		thought.visible = true
	else:
		thought.visible = false


# ---------------------------------------------------------------------------
# Pętla czasu gry
# ---------------------------------------------------------------------------
func _process(delta: float) -> void:
	if not _pose_locked:
		mesh_root.rotation.y = lerp_angle(mesh_root.rotation.y, _target_yaw, minf(1.0, delta * 9.0))
	if Game.paused_by_event or Game.speed == 0:
		return
	var mins: float = minf(delta * Game.MINUTES_PER_SECOND[Game.speed], 10.0)
	match state:
		State.WALK:
			_walk(mins)
		State.USE:
			_use(mins)
		State.IDLE:
			_idle_timer -= mins
			if not queue.is_empty():
				_start_next()
			elif _idle_timer <= 0.0:
				_idle_timer = 8.0
				_autonomy()
	if _anims.is_empty():
		if state == State.WALK:
			_bob_t += delta * 12.0
			mesh_root.position.y = absf(sin(_bob_t)) * 0.05
		else:
			mesh_root.position.y = 0.0
	elif state == State.WALK:
		_play_anim("walk")
		_set_anim_speed(1.0 + 0.15 * (Game.speed - 1))
	elif state == State.IDLE:
		_play_anim("idle")
		_set_anim_speed(1.0)


func _decay_mult(k: String) -> float:
	var m := 1.0
	if k == "glod" and has_trait("lakomczuch"):
		m *= 1.3
	if k == "towarzystwo" and has_trait("towarzyski"):
		m *= 1.4
	if k == "zabawa" and has_trait("wesola"):
		m *= 0.6
	return m


func _on_tick(minutes: int) -> void:
	var h := float(minutes) / 60.0
	var sleeping: bool = state == State.USE and current.get("action", {}).get("id", "") in ["spij", "drzemka"]
	for k in DECAY.keys():
		var d: float = DECAY[k] * _decay_mult(k)
		if sleeping:
			d = d * 0.35 if k == "glod" else d * 0.1
			if k == "energia":
				d = 0.0
		if sick:
			d *= 1.25
		needs[k] = clampf(needs[k] - d * h, 0.0, 100.0)
	_update_health(h, sleeping)
	_update_mood_visuals()
	needs_changed.emit()


func _update_health(h: float, sleeping: bool) -> void:
	var delta := 0.0
	if needs["glod"] < 20.0:
		delta -= 1.2
	if needs["higiena"] < 20.0:
		delta -= 0.5
	if needs["energia"] < 15.0:
		delta -= 0.6
	if state == State.USE and current.get("action", {}).get("kind", "") == "praca":
		var pen := 0.3 if is_adult() else 0.5
		if has_trait("pracowity"):
			pen *= 0.7
		delta -= pen
	if sleeping and needs["glod"] > 40.0:
		delta += 0.4
	if needs["glod"] > 60.0 and needs["higiena"] > 50.0 and needs["energia"] > 50.0:
		delta += 0.1
	health = clampf(health + delta * h, 0.0, 100.0)
	if health < 30.0 and not sick:
		sick = true
		Game.say("%s zachorował(a). Chory Sim nie może pracować – potrzebuje snu i jedzenia." % sim_name, "warn")
		Edu.unlock("choroby")
		_interrupt()
	elif sick and health > 55.0:
		sick = false
		Game.say("%s wyzdrowiał(a)." % sim_name, "info")
	if health <= 0.5:
		health = 40.0
		sick = true
		Game.spend(300, "szpital")
		Game.say("%s trafił(a) do szpitala fabrycznego. Koszt leczenia: 3 rb." % sim_name, "warn")


func _on_day(_d: int) -> void:
	hours_today = 0.0
	fined_today = false
	quiz_today = false
	for k in relations.keys():
		relations[k] = clampf(relations[k] - 1.0, 0.0, 100.0)
	_roll_wishes()
	_update_outfit()


func collect_wages() -> int:
	var w := int(wages_owed)
	wages_owed = 0.0
	return w


# ---------------------------------------------------------------------------
# Relacje i życzenia
# ---------------------------------------------------------------------------
func relation_with(other: Sim) -> float:
	return relations.get(other.sim_id, 50.0)


func add_relation(other: Sim, amount: float) -> void:
	relations[other.sim_id] = clampf(relation_with(other) + amount, 0.0, 100.0)


func _wish_allowed(w: Dictionary) -> bool:
	var who: String = w.get("who", "")
	if who == "dorosly" and not is_adult():
		return false
	if who == "dziecko" and is_adult():
		return false
	for cur in wishes:
		if cur["id"] == w["id"]:
			return false
	if w["id"] == "w_nauka" and not Game.flags.get("elementarz", false):
		return false
	return true


func _wish_weight(w: Dictionary) -> float:
	var id: String = w["id"]
	if has_trait("ksiazkowa") and id in ["w_ksiazka", "w_lekcje", "w_gazeta"]:
		return 3.0
	if has_trait("towarzyski") and id in ["w_rozmowa", "w_piwo", "w_obiad"]:
		return 3.0
	if has_trait("pobozna") and id == "w_msza":
		return 4.0
	if has_trait("ciekawski") and id in ["w_maszyna", "w_ksiazka"]:
		return 3.0
	if has_trait("wesola") and id in ["w_zabawa", "w_spacer", "w_lawka"]:
		return 3.0
	if has_trait("gospodarna") and id in ["w_targ", "w_obiad"]:
		return 3.0
	return 1.0


func _roll_wishes() -> void:
	while wishes.size() < 2:
		var pool: Array = []
		for w in WISHES:
			if _wish_allowed(w):
				pool.append(w)
		if pool.is_empty():
			break
		var total := 0.0
		for w in pool:
			total += _wish_weight(w)
		var r := _rng.randf() * total
		var pick: Dictionary = pool[0]
		for w in pool:
			r -= _wish_weight(w)
			if r <= 0.0:
				pick = w
				break
		wishes.append(pick.duplicate())


func _check_wishes(action_id: String) -> void:
	for i in range(wishes.size() - 1, -1, -1):
		var w: Dictionary = wishes[i]
		if w["action"] == action_id:
			wishes.remove_at(i)
			wishes_done += 1
			Game.wishes_done += 1
			Game.wish_points += int(w["points"])
			needs["zabawa"] = clampf(needs["zabawa"] + 12.0, 0.0, 100.0)
			needs["komfort"] = clampf(needs["komfort"] + 8.0, 0.0, 100.0)
			Game.say("%s spełnił(a) życzenie: %s (+%d pkt)." % [sim_name, w["text"], int(w["points"])], "info")
			wish_fulfilled.emit(self, w)
	queue_changed.emit()


func wish_texts() -> Array[String]:
	var out: Array[String] = []
	for w in wishes:
		out.append(String(w["text"]))
	return out


# ---------------------------------------------------------------------------
# Kolejka czynności
# ---------------------------------------------------------------------------
func enqueue(obj: Interactable, action: Dictionary, target: Node = null) -> void:
	if queue.size() >= 6:
		Game.say("%s ma już pełną kolejkę zadań." % sim_name, "warn")
		return
	queue.append({"object": obj, "action": action, "target": target})
	queue_changed.emit()
	if state == State.IDLE:
		_start_next()


func cancel_queue_item(idx: int) -> void:
	if idx == 0 and not current.is_empty():
		_interrupt()
	elif idx - 1 < queue.size() and idx > 0:
		queue.remove_at(idx - 1)
	queue_changed.emit()


func queue_labels() -> Array[String]:
	var out: Array[String] = []
	if not current.is_empty():
		out.append(String(current["action"].get("label", "")))
	for q in queue:
		out.append(String(q["action"].get("label", "")))
	return out


func _effective_cost(act: Dictionary) -> int:
	var c := int(act.get("cost", 0))
	if c > 0 and has_trait("gospodarna") and (act.has("food_buy") or act.get("id", "") == "elementarz"):
		c = int(round(c * 0.85))
	return c


func _start_next() -> void:
	if queue.is_empty():
		return
	var item: Dictionary = queue.pop_front()
	queue_changed.emit()
	var obj: Interactable = item["object"]
	if obj == null or not is_instance_valid(obj):
		return
	if not obj.is_free_for(self):
		Game.say("%s: %s jest zajęte." % [sim_name, obj.display_name()], "warn")
		return
	var act: Dictionary = item["action"]
	if _effective_cost(act) > 0 and not Game.can_afford(_effective_cost(act)):
		Game.say("%s: brak pieniędzy na „%s”." % [sim_name, act.get("label", "")], "warn")
		return
	if act.get("food", 0) > 0 and Game.food < int(act["food"]):
		Game.say("%s: w domu nie ma dość zapasów jedzenia. Trzeba iść do sklepu." % sim_name, "warn")
		return
	var dest: Vector2i = obj.use_tile()
	var p: Array = []
	if item.get("target") != null:
		dest = world.nearest_free_neighbor(item["target"].tile, tile)
		p = world.find_path(tile, dest)
	else:
		p = world.path_to_object(tile, obj)
	if p.is_empty() and tile != dest:
		Game.say("%s nie może dojść do: %s." % [sim_name, obj.display_name()], "warn")
		return
	current = item
	path = p
	if item.get("target") == null:
		obj.occupied_by = self
	state = State.WALK
	_move_progress = 0.0
	_set_text("idzie: " + String(act.get("label", "")))


func _walk(mins: float) -> void:
	if path.is_empty():
		_arrive()
		return
	_move_progress += mins * WALK_TILES_PER_MIN
	while _move_progress >= 1.0 and not path.is_empty():
		_move_progress -= 1.0
		tile = path.pop_front()
	var target_tile: Vector2i = tile if path.is_empty() else path[0]
	var from := _tile_pos(tile)
	var to := _tile_pos(target_tile)
	if path.is_empty():
		position = from
		_arrive()
		return
	position = from.lerp(to, clampf(_move_progress, 0.0, 1.0))
	var dir := to - from
	if dir.length_squared() > 0.001:
		_target_yaw = atan2(dir.x, dir.z)


func _arrive() -> void:
	state = State.USE
	_use_elapsed = 0.0
	var obj: Interactable = current["object"]
	var act: Dictionary = current["action"]
	var face_pos := obj.center_position()
	if current.get("target") != null and is_instance_valid(current["target"]):
		face_pos = current["target"].position
	var dir := face_pos - position
	if dir.length_squared() > 0.01:
		_target_yaw = atan2(dir.x, dir.z)
	var cost := _effective_cost(act)
	if cost > 0:
		if not Game.spend(cost, act.get("label", "")):
			_finish()
			return
	if act.get("food", 0) > 0:
		if not Game.take_food(int(act["food"])):
			_finish()
			return
	if act.get("kind", "") == "praca":
		_start_work(act)
	elif act.get("kind", "") == "szkola":
		Edu.unlock("szkola")
	if act.has("fact"):
		Edu.unlock(String(act["fact"]))
	var an := _anim_for(obj, act)
	if an == "sleep":
		position = obj.center_position()
		mesh_root.rotation.y = obj.mesh_root.rotation.y + PI
		_target_yaw = mesh_root.rotation.y
		_pose_locked = true
	elif an in ["sit", "eat"] and obj.def.has("sit_facing"):
		position = Vector3(obj.use_tile().x + 0.5, 0.0, obj.use_tile().y + 0.5)
		mesh_root.rotation.y = obj.mesh_root.rotation.y + float(obj.def["sit_facing"])
		_target_yaw = mesh_root.rotation.y
		_pose_locked = true
	if current.get("target") != null and is_instance_valid(current["target"]):
		var t: Sim = current["target"]
		if t.state == State.IDLE:
			t._target_yaw = atan2(position.x - t.position.x, position.z - t.position.z)
			t._play_anim("talk")
			t._set_text("rozmawia z " + sim_name)
	_play_anim(an)
	_set_anim_speed(1.0)
	_set_text(String(act.get("label", "")))


func _start_work(act: Dictionary) -> void:
	var jdef: Dictionary = Catalog.JOBS.get(String(act.get("job", "")), {})
	if jdef.is_empty():
		return
	if Game.hour_f() > float(jdef["start"]) + 0.25 and not fined_today and hours_today < 0.1:
		fined_today = true
		Game.fines_total += 10
		wages_owed -= 10.0
		Game.say("%s spóźnił(a) się do fabryki – kara 10 kop. wpisana do książki kar." % sim_name, "warn")
		Edu.unlock("kary")
	if worked_days == 0:
		Edu.unlock("dzien_pracy")
		Edu.unlock("krosno")
	worked_days += 1


func _rate_mult(act: Dictionary, need: String) -> float:
	var m := 1.0
	var id := String(act.get("id", ""))
	if need == "edukacja" and has_trait("ciekawski"):
		m *= 1.3
	if id in ["czytaj", "czytaj_gazete"] and has_trait("ksiazkowa"):
		m *= 1.5
	if id == "msza" and has_trait("pobozna"):
		m *= 2.0
	if id == "rozmowa" or id == "pogawedka":
		if has_trait("towarzyski"):
			m *= 1.5
		if current.get("target") != null and is_instance_valid(current["target"]):
			m *= 0.7 + relation_with(current["target"]) / 100.0 * 0.6
	return m


func _use(mins: float) -> void:
	var act: Dictionary = current["action"]
	var h := mins / 60.0
	_use_elapsed += mins
	var need: String = act.get("need", "")
	var id := String(act.get("id", ""))
	if need != "" and needs.has(need):
		needs[need] = clampf(needs[need] + float(act.get("rate", 0.0)) * _rate_mult(act, need) * h, 0.0, 100.0)
	for k in act.get("side", {}).keys():
		if needs.has(k):
			var mult := 1.0
			if k == "edukacja":
				mult = _rate_mult(act, "edukacja")
				if has_trait("ksiazkowa") and id in ["czytaj", "czytaj_gazete"]:
					mult *= 2.0
			if k == "zabawa" and id == "msza" and has_trait("pobozna"):
				mult = 3.0
			needs[k] = clampf(needs[k] + float(act["side"][k]) * mult * h, 0.0, 100.0)
	if act.has("teach"):
		for c in Game.children():
			c.needs["edukacja"] = clampf(c.needs["edukacja"] + 5.0 * c._rate_mult(act, "edukacja") * h, 0.0, 100.0)
	var done := false
	match act.get("kind", "zwykla"):
		"praca":
			done = _work_tick(act, h)
		"szkola":
			done = _school_tick(h)
		_:
			var dur := float(act.get("duration", 0))
			if dur > 0.0:
				done = _use_elapsed >= dur
			else:
				done = needs.get(need, 100.0) >= 99.0
				if id == "spij" and _should_wake():
					done = true
	if done:
		_finish()


func _work_tick(act: Dictionary, h: float) -> bool:
	var jdef: Dictionary = Catalog.JOBS[String(act["job"])]
	var hour := Game.hour_f()
	var wage := float(jdef["wage"]) * (0.9 + 0.2 * mood() / 100.0)
	if has_trait("pracowity"):
		wage *= 1.1
	wages_owed += wage * h
	hours_today += h
	needs["komfort"] = clampf(needs["komfort"] - 4.0 * h, 0.0, 100.0)
	needs["zabawa"] = clampf(needs["zabawa"] - 2.0 * h, 0.0, 100.0)
	if hour >= float(jdef["end"]) or hours_today >= float(jdef["max_hours"]) or Game.is_sunday():
		return true
	if int(hour) == int(jdef["break"]):
		return true
	if striking or Game.strike_active or sick:
		return true
	return false


func _school_tick(_h: float) -> bool:
	var hour := Game.hour_f()
	if hour >= float(Catalog.SCHOOL["end"]) or Game.is_sunday():
		return true
	if not quiz_today and hour >= 10.0:
		quiz_today = true
		Game.request_quiz(self)
	return false


func _should_wake() -> bool:
	var hour := Game.hour_f()
	var wake := 7.5
	if job != "" and not Game.is_sunday() and not Game.strike_active and not striking:
		wake = float(Catalog.JOBS[job]["start"]) - 1.0
	elif enrolled and not Game.is_sunday():
		wake = float(Catalog.SCHOOL["start"]) - 1.25
	return needs["energia"] > 60.0 and hour >= wake and hour < wake + 1.0


func _finish() -> void:
	if current.is_empty():
		state = State.IDLE
		return
	var act: Dictionary = current["action"]
	var obj: Interactable = current["object"]
	var id := String(act.get("id", ""))
	if act.has("food_buy"):
		Game.add_food(int(act["food_buy"]))
		Game.say("%s kupił(a) %d porcji jedzenia." % [sim_name, int(act["food_buy"])], "money")
	if act.has("flag"):
		Game.flags[String(act["flag"])] = true
	if act.has("family_meal"):
		for s in Game.family:
			if s != self:
				s.needs["glod"] = clampf(s.needs["glod"] + 45.0, 0.0, 100.0)
				s.needs["towarzystwo"] = clampf(s.needs["towarzystwo"] + 10.0, 0.0, 100.0)
				add_relation(s, 4.0)
				s.add_relation(self, 4.0)
		Game.say("%s ugotował(a) obiad dla całej rodziny." % sim_name, "info")
	if act.has("family_hygiene"):
		for s in Game.family:
			s.needs["higiena"] = clampf(s.needs["higiena"] + float(act["family_hygiene"]), 0.0, 100.0)
	if act.has("health"):
		health = clampf(health + float(act["health"]), 0.0, 100.0)
	if id in ["ugotuj", "chleb"] and has_trait("lakomczuch"):
		needs["komfort"] = clampf(needs["komfort"] + 10.0, 0.0, 100.0)
	if current.get("target") != null and is_instance_valid(current["target"]):
		var t: Sim = current["target"]
		t.needs["towarzystwo"] = clampf(t.needs["towarzystwo"] + 25.0 * t._rate_mult(act, "towarzystwo"), 0.0, 100.0)
		add_relation(t, 8.0)
		t.add_relation(self, 8.0)
		if t.state == State.IDLE:
			t._play_anim("idle")
			t._set_text("")
		t._check_wishes("rozmowa")
	if is_instance_valid(obj) and obj.occupied_by == self:
		obj.occupied_by = null
	_unlock_pose()
	current = {}
	state = State.IDLE
	_idle_timer = 1.0
	_set_text("")
	_check_wishes(id)
	queue_changed.emit()


func _unlock_pose() -> void:
	if _pose_locked:
		_pose_locked = false
		position = _tile_pos(tile)
	_play_anim("idle")


func _interrupt() -> void:
	if not current.is_empty():
		var obj: Interactable = current["object"]
		if is_instance_valid(obj) and obj.occupied_by == self:
			obj.occupied_by = null
	_unlock_pose()
	current = {}
	path = []
	state = State.IDLE
	_set_text("")
	queue_changed.emit()


func _set_text(t: String) -> void:
	state_text_changed.emit(t)
	if label:
		label.text = sim_name if t == "" else "%s\n%s" % [sim_name, t]


func current_action_id() -> String:
	return String(current.get("action", {}).get("id", ""))


# ---------------------------------------------------------------------------
# Autonomia – Sim sam decyduje, co robić, gdy gracz nic nie zleci.
# Działa z wyprzedzeniem (próg 60), a nie dopiero w kryzysie.
# ---------------------------------------------------------------------------
func _autonomy() -> void:
	var hour := Game.hour_f()
	# 0. śniadanie przed pracą / szkołą
	var before_duty := false
	if job != "":
		var st := float(Catalog.JOBS[job]["start"])
		before_duty = hour >= st - 1.0 and hour < st - 0.5
	elif enrolled:
		var st := float(Catalog.SCHOOL["start"])
		before_duty = hour >= st - 1.25 and hour < st - 0.6
	if before_duty and needs["glod"] < 75.0 and not Game.is_sunday():
		if _go_for_need("glod"):
			return
	# 1. praca
	if job != "" and not sick and not striking and not Game.strike_active and not Game.is_sunday():
		var jdef: Dictionary = Catalog.JOBS[job]
		var in_hours := hour >= float(jdef["start"]) - 0.5 and hour < float(jdef["end"]) - 0.5 and int(hour) != int(jdef["break"])
		if in_hours and hours_today < float(jdef["max_hours"]) and _critical_need() == "":
			var obj := world.find_work_object(job, self)
			if obj:
				enqueue(obj, _action_of(obj, "praca"))
				return
	# 2. szkoła
	if enrolled and not is_adult() and not Game.is_sunday():
		if hour >= float(Catalog.SCHOOL["start"]) - 0.5 and hour < float(Catalog.SCHOOL["end"]) - 0.5 and _critical_need() == "":
			var desk := world.find_object_with_action("lekcja", self)
			if desk:
				enqueue(desk, _action_of(desk, "szkola"))
				return
	# 3. sen w nocy
	if (hour >= 21.5 or hour < 4.5) and needs["energia"] < 85.0:
		if _go_for_need("energia"):
			return
	# 3b. niedzielna msza
	if Game.is_sunday() and hour >= float(Catalog.CHURCH["start"]) and hour < float(Catalog.CHURCH["end"]) and not Game.flags.get("msza_" + sim_id + "_" + str(Game.day), false):
		var pew := world.find_object_with_action("msza", self)
		if pew:
			Game.flags["msza_" + sim_id + "_" + str(Game.day)] = true
			enqueue(pew, _action_of_id(pew, "msza"))
			return
	# 3c. wieczór w szynku (dorośli, gdy nudno i są drobne)
	if is_adult() and hour >= 19.5 and hour < 22.0 and needs["zabawa"] < 40.0 and Game.money >= 5 and _rng.randf() < 0.25:
		var table := world.find_object_with_action("piwo", self)
		if table:
			enqueue(table, _action_of_id(table, "piwo"))
			return
	# 4. zakupy – gdy zapasy maleją, a dorosły ma czas i pieniądze
	if is_adult() and Game.food < 4 and Game.money >= 16 and not Game.is_sunday() and not _another_adult_shopping():
		if hour < Catalog.MARKET_END:
			var stall := world.find_object_with_action("targ_zakupy", self)
			if stall:
				enqueue(stall, _action_of_id(stall, "targ_duze" if Game.money >= 150 else "targ_zakupy"))
				return
		var shop := world.find_object_with_action("zakupy", self)
		if shop and Game.money >= 24:
			enqueue(shop, _action_of_id(shop, "zakupy_duze" if Game.money >= 150 else "zakupy"))
			return
	# 4b. najniższa potrzeba (z wyprzedzeniem)
	var lowest := lowest_need()
	var lowest_v: float = needs[lowest]
	if lowest_v < 60.0:
		if _go_for_need(lowest):
			return
		for k in ["glod", "energia", "higiena", "potrzeba", "zabawa", "komfort"]:
			if k != lowest and needs[k] < 55.0 and _go_for_need(k):
				return
	# 5. życzenia – gdy nic nie pili, Sim realizuje własne pragnienia
	if _rng.randf() < 0.5 and _pursue_wish():
		return
	# 6. porozmawiaj
	if needs["towarzystwo"] < 70.0:
		var other := world.nearest_other_sim(self)
		if other and other.state != State.WALK and other.current_action_id() not in ["spij", "drzemka"]:
			enqueue(world.social_anchor(), {"id": "rozmowa", "label": "Porozmawiaj z " + other.sim_name, "need": "towarzystwo", "rate": 90.0, "duration": 20}, other)
			return
	# 7. przechadzka – zamiast stać w miejscu
	if _rng.randf() < 0.3:
		var tree := world.find_object_with_action("spacer", self)
		if tree:
			enqueue(tree, _action_of_id(tree, "spacer"))


func _pursue_wish() -> bool:
	for w in wishes:
		var aid: String = w["action"]
		if aid == "rozmowa":
			var other := world.nearest_other_sim(self)
			if other and other.state != State.WALK:
				enqueue(world.social_anchor(), {"id": "rozmowa", "label": "Porozmawiaj z " + other.sim_name, "need": "towarzystwo", "rate": 90.0, "duration": 20}, other)
				return true
			continue
		if aid == "msza" and (not Game.is_sunday() or Game.hour_f() < float(Catalog.CHURCH["start"]) or Game.hour_f() > float(Catalog.CHURCH["end"])):
			continue
		if aid == "piwo" and Game.hour_f() < 18.0:
			continue
		var obj := world.find_object_with_action(aid, self)
		if obj == null:
			continue
		var act := _action_of_id(obj, aid)
		if act.is_empty():
			continue
		if _effective_cost(act) > Game.money or int(act.get("food", 0)) > Game.food:
			continue
		enqueue(obj, act)
		return true
	return false


func _another_adult_shopping() -> bool:
	for s in Game.adults():
		if s != self and (s.current_action_id().begins_with("zakupy") or s.current_action_id().begins_with("targ") or s.queue.any(func(q): return String(q["action"].get("id", "")).begins_with("zakupy") or String(q["action"].get("id", "")).begins_with("targ"))):
			return true
	return false


func _action_of_id(obj: Interactable, id: String) -> Dictionary:
	for a in obj.actions_for(self):
		if a.get("id", "") == id:
			return a
	return {}


func _critical_need() -> String:
	for k in ["glod", "energia", "potrzeba"]:
		if needs[k] < 12.0:
			return k
	return ""


func _go_for_need(need: String) -> bool:
	if need == "towarzystwo":
		return false
	var obj := world.find_object_for_need(need, self)
	if obj == null:
		if need == "glod" and Game.food == 0:
			Game.say("%s jest głodny(a), a w domu nie ma jedzenia!" % sim_name, "warn")
		return false
	var act := _best_action_for(obj, need)
	if act.is_empty():
		return false
	enqueue(obj, act)
	return true


func _action_of(obj: Interactable, kind: String) -> Dictionary:
	for a in obj.actions_for(self):
		if a.get("kind", "zwykla") == kind:
			return a
	return {}


func _best_action_for(obj: Interactable, need: String) -> Dictionary:
	var best := {}
	for a in obj.actions_for(self):
		if a.get("need", "") != need or a.get("kind", "zwykla") != "zwykla":
			continue
		if _effective_cost(a) > Game.money:
			continue
		if a.get("food", 0) > Game.food:
			continue
		if a.has("family_meal") or a.has("teach") or a.has("family_hygiene") or a.has("health"):
			continue
		if best.is_empty() or float(a.get("rate", 0)) > float(best.get("rate", 0)):
			best = a
	return best
