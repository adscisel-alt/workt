extends Node
## Skryptowa symulacja rozgrywki bez okna (przyspieszony czas):
##   godot --headless --path godot res://tests/sim_test.tscn
## Sprawdza: zbieranie i odnoszenie surowców, budowę domu, szkolenie, awans epoki, falę wroga, pole uprawne.

var main: Node2D
var fails := 0
var step := 0
var t := 0.0
var wood0 := 0.0
var food0 := 0.0
var house: Building = null
var farm: Building = null
var sim_time := 0.0


func _check(cond: bool, what: String) -> void:
	if cond:
		print("  OK   ", what)
	else:
		fails += 1
		print("  FAIL ", what)


func _ready() -> void:
	print("== Kroniki Epok: symulacja rozgrywki ==")
	seed(7)
	Engine.physics_ticks_per_second = 60
	Engine.max_physics_steps_per_frame = 200
	Engine.time_scale = 25.0
	main = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().process_frame
	await get_tree().process_frame
	var world: World = main.world
	# wydarzenia historyczne pauzują grę; w symulacji wyzwalamy jedno ręcznie i odpowiadamy automatycznie
	main.events.pending.clear()
	var gold0: float = GameState.res["zloto"]
	main.hud.show_event(Data.events[0], main.events._apply)
	_check(get_tree().paused, "wydarzenie pauzuje grę")
	main.hud.quiz.chosen.emit(0)
	_check(not get_tree().paused, "po wyborze gra wznawia się")
	_check(GameState.res["zloto"] == gold0 + 70.0, "handel z kupcami: +70 złota")
	var vils: Array = world.entities.filter(func(e: Entity) -> bool: return e is Villager and e.team == 0)
	_check(vils.size() == 3, "3 osadników na starcie")
	var tree: Entity = world.nearest(vils[0].position, func(e: Entity) -> bool: return e is ResourceNode and e.kind == "drzewo", 1e9)
	var bush: Entity = world.nearest(vils[0].position, func(e: Entity) -> bool: return e is ResourceNode and e.kind == "krzaki", 1e9)
	_check(tree != null and bush != null, "las i jagody w pobliżu")
	wood0 = GameState.res["drewno"]
	food0 = GameState.res["zywnosc"]
	vils[0].command_gather(tree)
	vils[1].command_gather(bush)
	# dom stawiany przez trzeciego osadnika
	var origin := world.player_start + Vector2i(5, 5)
	_check(world.can_place(origin, Vector2i(2, 2)), "miejsce na dom wolne")
	GameState.spend(GameState.building_cost("dom"))
	house = world.spawn_building("dom", origin, 0, false)
	vils[2].command_build(house)
	# szkolenie osadnika w centrum
	var tc: Building = world.find_first(func(e: Entity) -> bool: return e is Building and e.kind == "centrum" and e.team == 0)
	var err := tc.enqueue("osadnik")
	_check(err == "", "kolejka osadnika bez błędu (%s)" % err)
	await _wait(40.0)
	_check(GameState.res["drewno"] > wood0 - 25.0 + 5.0, "drewno rośnie po odniesieniu (było %d, jest %d)" % [int(wood0 - 25), int(GameState.res["drewno"])])
	_check(GameState.res["zywnosc"] > food0 - 50.0 + 5.0, "żywność rośnie (jest %d)" % int(GameState.res["zywnosc"]))
	_check(is_instance_valid(house) and house.built, "dom ukończony (postęp %.0f%%)" % (100.0 * house.build_ratio()))
	_check(GameState.pop_cap == 10, "limit ludności 10 po domu (jest %d)" % GameState.pop_cap)
	_check(GameState.pop == 4, "4 osadników po szkoleniu (jest %d)" % GameState.pop)
	# młyn + pole uprawne
	GameState.add("drewno", 500)
	var mill_origin := _find_spot(world, world.player_start + Vector2i(-4, 5), 2)
	_check(mill_origin.x >= 0, "miejsce na młyn wolne")
	world.spawn_building("mlyn", mill_origin, 0, true)
	GameState.on_building_completed("mlyn")
	var farm_origin := _find_spot(world, mill_origin + Vector2i(0, 3), 2)
	farm = world.spawn_building("farma", farm_origin, 0, false)
	vils[2].command_build(farm)
	await _wait(30.0)
	_check(farm.built, "pole uprawne ukończone (postęp %.0f%%, stan osadnika %s, odległość %d)" % [100.0 * farm.build_ratio(), vils[2].state, farm.distance_cells(vils[2].cell())])
	_check(vils[2].state in ["gathering", "to_resource", "to_dropoff"], "osadnik po zbudowaniu pola zbiera z niego (stan: %s)" % vils[2].state)
	# awans epoki: spełnij warunki i uruchom badanie bezpośrednio
	GameState.add("zywnosc", 1000)
	GameState.wiedza = 5
	GameState.on_building_completed("koszary")
	var blocker := GameState.age_up_blocker()
	_check(blocker == "", "awans możliwy (powód blokady: '%s')" % blocker)
	GameState.start_age_research(0.45)
	await _wait(40.0)
	_check(GameState.age == 1, "osiągnięto Epokę Feudalną (jest %d)" % GameState.age)
	# fala wroga: wymuś natychmiast i sprawdź, czy wrogowie idą i walczą
	main.ai.timer = 0.1
	await _wait(3.0)
	var enemies: Array = world.entities.filter(func(e: Entity) -> bool: return e is Unit and e.team == 1)
	_check(enemies.size() >= 3, "wrogowie pojawili się (%d)" % enemies.size())
	await _wait(60.0)
	var fighting := 0
	for e in enemies:
		if is_instance_valid(e) and e.state == "attacking":
			fighting += 1
	var alive := enemies.filter(func(e: Entity) -> bool: return is_instance_valid(e)).size()
	_check(fighting > 0 or alive < enemies.size(), "wrogowie atakują lub giną (walczy %d, żyje %d)" % [fighting, alive])
	# obrona: wyszkol milicję i każ atakować
	GameState.add("zloto", 500)
	GameState.add("zywnosc", 500)
	var bar := world.spawn_building("koszary", world.player_start + Vector2i(6, -4), 0, true)
	bar.enqueue("milicja")
	bar.enqueue("milicja")
	await _wait(45.0)
	var mil: Array = world.entities.filter(func(e: Entity) -> bool: return e is Unit and e.kind == "milicja" and e.team == 0)
	_check(mil.size() >= 1, "milicja wyszkolona (%d)" % mil.size())
	print("Surowce: ", GameState.res, " wiedza: ", GameState.wiedza, " pop: ", GameState.pop, "/", GameState.pop_cap)
	print("== wynik symulacji: %d błędów ==" % fails)
	get_tree().quit(1 if fails > 0 else 0)


## Wolne miejsce size x size z marginesem 1 komórki dookoła (aby osadnik mógł podejść).
func _find_spot(world: World, near: Vector2i, size: int) -> Vector2i:
	for ring in range(0, 12):
		for dy in range(-ring, ring + 1):
			for dx in range(-ring, ring + 1):
				var c := near + Vector2i(dx, dy)
				if world.can_place(c - Vector2i.ONE, Vector2i(size + 2, size + 2)):
					return c
	return Vector2i(-1, -1)


func _wait(seconds: float) -> void:
	var end := GameState.elapsed + seconds
	while GameState.elapsed < end:
		await get_tree().process_frame
