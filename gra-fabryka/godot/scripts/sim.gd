class_name Sim
extends Node3D
## Członek rodziny Walczaków: potrzeby, praca/szkoła, kolejka czynności, autonomia.

signal needs_changed
signal queue_changed
signal state_text_changed(text: String)

enum State { IDLE, WALK, USE }

const NEED_NAMES := {
	"glod": "Głód", "energia": "Energia", "higiena": "Higiena", "potrzeba": "Potrzeba",
	"zabawa": "Zabawa", "towarzystwo": "Towarzystwo", "komfort": "Komfort", "edukacja": "Edukacja",
}
## Spadek potrzeby na godzinę gry (na jawie).
const DECAY := {
	"glod": 4.5, "energia": 3.2, "higiena": 3.0, "potrzeba": 5.0,
	"zabawa": 3.0, "towarzystwo": 2.2, "komfort": 2.5, "edukacja": 0.0,
}
const WALK_TILES_PER_MIN := 1.6

var sim_id: String = ""
var sim_name: String = ""
var age: int = 30
var model_name: String = ""
var portrait_color: Color = Color.WHITE

var needs: Dictionary = {}
var health: float = 90.0
var sick: bool = false
var job: String = ""          ## klucz z Catalog.JOBS lub ""
var enrolled: bool = false    ## dziecko zapisane do szkoły
var striking: bool = false

var wages_owed: float = 0.0   ## kopiejki narosłe w tygodniu
var hours_today: float = 0.0
var fined_today: bool = false
var worked_days: int = 0
var quiz_today: bool = false

var state: State = State.IDLE
var queue: Array = []         ## [{"object": Interactable, "action": Dictionary, "target": Sim}]
var current: Dictionary = {}
var path: Array = []          ## Array[Vector2i]
var tile: Vector2i = Vector2i.ZERO
var _move_progress: float = 0.0
var _use_elapsed: float = 0.0
var _idle_timer: float = 0.0
var _bob_t: float = 0.0

var world: World = null
var mesh_root: Node3D = null
var plumbob: MeshInstance3D = null
var label: Label3D = null
var anim: AnimationPlayer = null
var _anim_name: String = ""
var _pose_locked: bool = false   # Sim leży/siedzi na meblu – pozycja ustawiona ręcznie
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
	name = "Sim_" + sim_id
	for k in NEED_NAMES.keys():
		needs[k] = data.get("needs", {}).get(k, 70.0)
	needs["edukacja"] = data.get("edukacja", 10.0)
	tile = start_tile
	position = _tile_pos(tile)
	_build_visual()
	Game.register_sim(self)
	Game.tick.connect(_on_tick)
	Game.day_changed.connect(_on_day)


func is_adult() -> bool:
	return age >= 16


func height() -> float:
	return 1.75 if is_adult() else (1.25 if age >= 11 else 1.1)


# ---------------------------------------------------------------------------
# Wygląd
# ---------------------------------------------------------------------------
func _build_visual() -> void:
	mesh_root = Node3D.new()
	add_child(mesh_root)
	var inst := ModelLoader.instantiate_model(model_name)
	if inst == null:
		inst = ModelLoader.fallback_person(height(), portrait_color)
	mesh_root.add_child(inst)
	anim = ModelLoader.find_animation_player(inst)
	if anim:
		for a in anim.get_animation_list():
			anim.get_animation(a).loop_mode = Animation.LOOP_LINEAR
		_play_anim("idle")

	# „plumbob” – zielony kryształ nad wybranym Simem, jak w The Sims
	plumbob = MeshInstance3D.new()
	var prism := PrismMesh.new()
	prism.size = Vector3(0.3, 0.45, 0.3)
	plumbob.mesh = prism
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.25, 0.9, 0.3)
	mat.emission_enabled = true
	mat.emission = Color(0.1, 0.6, 0.15)
	plumbob.material_override = mat
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
	label.modulate = Color(1, 1, 1, 0.95)
	label.outline_size = 8
	add_child(label)

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


func _tile_pos(t: Vector2i) -> Vector3:
	return Vector3(t.x + 0.5, 0.0, t.y + 0.5)


# ---------------------------------------------------------------------------
# Pętla czasu gry
# ---------------------------------------------------------------------------
func _process(delta: float) -> void:
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
	if anim == null:
		# zapasowy model bez szkieletu – lekkie kołysanie podczas chodzenia
		if state == State.WALK:
			_bob_t += delta * 12.0
			mesh_root.position.y = absf(sin(_bob_t)) * 0.05
		else:
			mesh_root.position.y = 0.0
	elif state == State.WALK:
		_play_anim("walk")
		anim.speed_scale = 1.0 + 0.15 * (Game.speed - 1)
	elif state == State.IDLE:
		_play_anim("idle")
		anim.speed_scale = 1.0


func _play_anim(anim_name: String) -> void:
	if anim == null or _anim_name == anim_name:
		return
	if not anim.has_animation(anim_name):
		anim_name = "idle"
		if not anim.has_animation(anim_name):
			return
	_anim_name = anim_name
	anim.play(anim_name, 0.2)


## Animacja odpowiadająca czynności (jawna w katalogu albo wynikająca z obiektu).
func _anim_for(obj: Interactable, act: Dictionary) -> String:
	if act.has("anim"):
		return String(act["anim"])
	match String(act.get("kind", "zwykla")):
		"praca":
			return "work"
		"szkola":
			return "sit"
	if obj != null and obj.def.has("sit_facing"):
		return "sit"
	return "idle"


func _on_tick(minutes: int) -> void:
	var h := float(minutes) / 60.0
	var sleeping: bool = state == State.USE and current.get("action", {}).get("id", "") in ["spij", "drzemka"]
	for k in DECAY.keys():
		var d: float = DECAY[k]
		if sleeping:
			d = d * 0.35 if k == "glod" else d * 0.1
			if k == "energia":
				d = 0.0
		if sick:
			d *= 1.3
		needs[k] = clampf(needs[k] - d * h, 0.0, 100.0)
	_update_health(h, sleeping)
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
		delta -= 0.22 if is_adult() else 0.42   # pył, hałas – dzieci cierpią bardziej
	if sleeping and needs["glod"] > 40.0:
		delta += 0.6
	if needs["glod"] > 60.0 and needs["higiena"] > 50.0 and needs["energia"] > 50.0:
		delta += 0.2
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


func collect_wages() -> int:
	var w := int(wages_owed)
	wages_owed = 0.0
	return w


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
	# koszty sprawdzamy na starcie
	if act.get("cost", 0) > 0 and not Game.can_afford(int(act["cost"])):
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
		mesh_root.rotation.y = atan2(dir.x, dir.z)


func _arrive() -> void:
	state = State.USE
	_use_elapsed = 0.0
	var obj: Interactable = current["object"]
	var act: Dictionary = current["action"]
	# obróć się w stronę obiektu (albo rozmówcy)
	var face_pos := obj.center_position()
	if current.get("target") != null and is_instance_valid(current["target"]):
		face_pos = current["target"].position
	var dir := face_pos - position
	if dir.length_squared() > 0.01:
		mesh_root.rotation.y = atan2(dir.x, dir.z)
	if act.get("cost", 0) > 0:
		if not Game.spend(int(act["cost"]), act.get("label", "")):
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
		# połóż się na łóżku: głowa przy zagłówku (przód mebla)
		position = obj.center_position()
		mesh_root.rotation.y = obj.mesh_root.rotation.y + PI
		_pose_locked = true
	elif an == "sit" and obj.def.has("sit_facing"):
		position = Vector3(obj.use_tile().x + 0.5, 0.0, obj.use_tile().y + 0.5)
		mesh_root.rotation.y = obj.mesh_root.rotation.y + float(obj.def["sit_facing"])
		_pose_locked = true
	_play_anim(an)
	if anim:
		anim.speed_scale = 1.0
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


func _use(mins: float) -> void:
	var act: Dictionary = current["action"]
	var h := mins / 60.0
	_use_elapsed += mins
	var need: String = act.get("need", "")
	if need != "" and needs.has(need):
		needs[need] = clampf(needs[need] + float(act.get("rate", 0.0)) * h, 0.0, 100.0)
	for k in act.get("side", {}).keys():
		if needs.has(k):
			needs[k] = clampf(needs[k] + float(act["side"][k]) * h, 0.0, 100.0)
	if act.has("teach"):
		for c in Game.children():
			c.needs["edukacja"] = clampf(c.needs["edukacja"] + 5.0 * h, 0.0, 100.0)
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
				if act.get("id", "") == "spij" and _should_wake():
					done = true
	if done:
		_finish()


func _work_tick(act: Dictionary, h: float) -> bool:
	var jdef: Dictionary = Catalog.JOBS[String(act["job"])]
	var hour := Game.hour_f()
	wages_owed += float(jdef["wage"]) * h
	hours_today += h
	needs["komfort"] = clampf(needs["komfort"] - 4.0 * h, 0.0, 100.0)
	needs["zabawa"] = clampf(needs["zabawa"] - 2.0 * h, 0.0, 100.0)
	if hour >= float(jdef["end"]) or hours_today >= float(jdef["max_hours"]) or Game.is_sunday():
		return true
	# przerwa obiadowa
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
	var wake := -1.0
	if job != "" and not Game.is_sunday() and not Game.strike_active and not striking:
		wake = float(Catalog.JOBS[job]["start"]) - 0.75
	elif enrolled and not Game.is_sunday():
		wake = float(Catalog.SCHOOL["start"]) - 1.0
	else:
		wake = 7.5
	return needs["energia"] > 60.0 and hour >= wake and hour < wake + 1.0


func _finish() -> void:
	if current.is_empty():
		state = State.IDLE
		return
	var act: Dictionary = current["action"]
	var obj: Interactable = current["object"]
	if act.has("food_buy"):
		Game.add_food(int(act["food_buy"]))
		Game.say("%s kupił(a) %d porcji jedzenia." % [sim_name, int(act["food_buy"])], "money")
	if act.has("flag"):
		Game.flags[String(act["flag"])] = true
	if act.has("family_meal"):
		for s in Game.family:
			if s != self:
				s.needs["glod"] = clampf(s.needs["glod"] + 45.0, 0.0, 100.0)
		Game.say("%s ugotował(a) obiad dla całej rodziny." % sim_name, "info")
	if act.has("family_hygiene"):
		for s in Game.family:
			s.needs["higiena"] = clampf(s.needs["higiena"] + float(act["family_hygiene"]), 0.0, 100.0)
	if current.get("target") != null and is_instance_valid(current["target"]):
		var t: Sim = current["target"]
		t.needs["towarzystwo"] = clampf(t.needs["towarzystwo"] + 25.0, 0.0, 100.0)
	if act.has("health"):
		health = clampf(health + float(act["health"]), 0.0, 100.0)
	if is_instance_valid(obj) and obj.occupied_by == self:
		obj.occupied_by = null
	_unlock_pose()
	current = {}
	state = State.IDLE
	_idle_timer = 1.0
	_set_text("")
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
# Autonomia – Sim sam decyduje, co robić, gdy gracz nic nie zleci
# ---------------------------------------------------------------------------
func _autonomy() -> void:
	var hour := Game.hour_f()
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
	if is_adult() and hour >= 19.5 and hour < 22.0 and needs["zabawa"] < 40.0 and Game.money >= 5 and randf() < 0.25:
		var table := world.find_object_with_action("piwo", self)
		if table:
			enqueue(table, _action_of_id(table, "piwo"))
			return
	# 4. zakupy – gdy w domu brak zapasów, a dorosły ma czas i pieniądze
	if is_adult() and Game.food < 2 and Game.money >= 16 and not Game.is_sunday() and not _another_adult_shopping():
		# rano taniej na targu, po południu zostaje sklep
		if hour < Catalog.MARKET_END:
			var stall := world.find_object_with_action("targ_zakupy", self)
			if stall:
				enqueue(stall, _action_of_id(stall, "targ_duze" if Game.money >= 150 else "targ_zakupy"))
				return
		var shop := world.find_object_with_action("zakupy", self)
		if shop and Game.money >= 24:
			enqueue(shop, _action_of_id(shop, "zakupy_duze" if Game.money >= 150 else "zakupy"))
			return
	# 4b. najniższa potrzeba
	var lowest := ""
	var lowest_v := 101.0
	for k in ["glod", "energia", "higiena", "potrzeba", "zabawa", "towarzystwo", "komfort"]:
		if needs[k] < lowest_v:
			lowest_v = needs[k]
			lowest = k
	if lowest_v < 55.0:
		if _go_for_need(lowest):
			return
		# nic nie znaleziono – spróbuj drugiej najniższej
		for k in ["glod", "energia", "higiena", "potrzeba", "zabawa", "komfort"]:
			if k != lowest and needs[k] < 50.0 and _go_for_need(k):
				return
	# 5. porozmawiaj
	if needs["towarzystwo"] < 70.0:
		var other := world.nearest_other_sim(self)
		if other and other.state != State.WALK:
			var fake_obj := world.social_anchor()
			enqueue(fake_obj, {"id": "rozmowa", "label": "Porozmawiaj z " + other.sim_name, "need": "towarzystwo", "rate": 90.0, "duration": 20}, other)


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
		if a.get("cost", 0) > Game.money:
			continue
		if a.get("food", 0) > Game.food:
			continue
		if a.has("family_meal") or a.has("teach") or a.has("family_hygiene"):
			continue
		if best.is_empty() or float(a.get("rate", 0)) > float(best.get("rate", 0)):
			best = a
	return best
