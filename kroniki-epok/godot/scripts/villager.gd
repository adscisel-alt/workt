class_name Villager extends Unit
## Osadnik: zbiera surowce, odnosi je do składu, buduje.

const CAPACITY := 10.0
const GATHER_RATE := {"drewno": 0.8, "zywnosc": 0.7, "zloto": 0.7, "kamien": 0.7}
const BUILD_RATE := 1.0

var carry_type := ""
var carry_amt := 0.0
var build_target: Building = null
var last_res_pos := Vector2.ZERO
var last_res_kind := ""


func command_gather(r: Entity) -> void:
	if r == null:
		return
	var rtype := _res_type_of(r)
	if rtype == "":
		return
	if carry_type != rtype:
		carry_amt = 0.0
		carry_type = rtype
	target = r
	last_res_pos = r.position
	last_res_kind = r.kind
	if _go_adjacent(r):
		state = "to_resource"
	else:
		stop()


func command_build(b: Building) -> void:
	if b == null or b.built:
		return
	build_target = b
	if _go_adjacent(b):
		state = "to_build"
	else:
		stop()


func stop() -> void:
	build_target = null
	super.stop()


static func _res_type_of(e: Entity) -> String:
	if e is ResourceNode:
		return e.res_type
	if e is Building and e.is_farm and e.built:
		return "zywnosc"
	return ""


func _physics_process(delta: float) -> void:
	if dead:
		return
	match state:
		"to_resource":
			if not _target_valid():
				_find_new_resource()
				return
			set_anim("walk")
			if _follow_path(delta):
				state = "gathering"
		"gathering":
			_gather(delta)
		"to_dropoff":
			set_anim("walk")
			if not _target_valid():
				_go_dropoff()
				return
			if _follow_path(delta):
				_deposit()
		"to_build":
			if build_target == null or not is_instance_valid(build_target) or build_target.dead:
				stop()
				return
			set_anim("walk")
			if _follow_path(delta):
				state = "building"
		"building":
			_build(delta)
		_:
			super._physics_process(delta)


func _gather(delta: float) -> void:
	if not _target_valid():
		_find_new_resource()
		return
	if target.distance_cells(cell()) > 1:
		if _go_adjacent(target):
			state = "to_resource"
		else:
			stop()
		return
	facing = Iso.direction8(target.position - position)
	set_anim("gather")
	var rate: float = GATHER_RATE.get(carry_type, 0.7)
	if team == 0:
		rate *= GameState.civ_bonus("zbieranie_" + carry_type)
	var got: float = target.take(rate * delta)
	carry_amt += got
	if carry_amt >= CAPACITY or (got <= 0.0 and not _target_valid()):
		_go_dropoff()


func _go_dropoff() -> void:
	var t := carry_type
	var drop: Entity = world.nearest(position, func(e: Entity) -> bool: return e is Building and e.team == team and e.accepts(t), 1e9)
	if drop == null:
		if team == 0:
			GameState.message.emit("Brak składu na %s. Zbuduj odpowiedni budynek." % Data.RES_SHORT.get(carry_type, carry_type))
		stop()
		return
	var res_target := target
	target = drop
	if _go_adjacent(drop):
		state = "to_dropoff"
		set_meta("resume", res_target)
	else:
		stop()


func _deposit() -> void:
	if team == 0 and carry_amt > 0.0:
		GameState.add(carry_type, carry_amt)
	carry_amt = 0.0
	var resume: Variant = get_meta("resume", null)
	remove_meta("resume")
	if resume != null and is_instance_valid(resume) and not resume.dead:
		command_gather(resume)
	else:
		_find_new_resource()


func _find_new_resource() -> void:
	var want := carry_type
	var near := last_res_pos if last_res_pos != Vector2.ZERO else position
	var r: Entity = world.nearest(near, func(e: Entity) -> bool:
		return (e is ResourceNode and e.res_type == want) or (e is Building and e.is_farm and e.built and e.team == team and want == "zywnosc" and e.food_stock > 0.0)
	, 10 * Iso.TILE_W)
	if r != null:
		command_gather(r)
	elif carry_amt > 0.0:
		target = null
		_go_dropoff()
	else:
		if team == 0:
			GameState.message.emit("Osadnik nie znalazł więcej surowca w pobliżu.")
		stop()


func _build(delta: float) -> void:
	if build_target == null or not is_instance_valid(build_target) or build_target.dead:
		stop()
		return
	if build_target.built:
		var b := build_target
		build_target = null
		if b.is_farm:
			command_gather(b)
		else:
			stop()
		return
	if build_target.distance_cells(cell()) > 1:
		if _go_adjacent(build_target):
			state = "to_build"
		else:
			stop()
		return
	facing = Iso.direction8(build_target.position - position)
	set_anim("build")
	build_target.add_progress(BUILD_RATE * delta)
