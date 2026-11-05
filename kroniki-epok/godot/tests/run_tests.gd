extends Node
## Testy uruchamiane bez okna (autoloady są dostępne, bo to zwykła scena):
##   godot --headless --path godot res://tests/run_tests.tscn

var fails := 0


func _check(cond: bool, what: String) -> void:
	if cond:
		print("  OK   ", what)
	else:
		fails += 1
		print("  FAIL ", what)


func _ready() -> void:
	print("== Kroniki Epok: testy ==")
	# geometria
	for c in [Vector2i(0, 0), Vector2i(5, 7), Vector2i(47, 3), Vector2i(12, 40)]:
		_check(Iso.to_cell(Iso.cell_center(c)) == c, "iso roundtrip %s" % c)
	_check(Iso.direction8(Vector2(0, 1)) == 0, "kierunek S = 0")
	_check(Iso.direction8(Vector2(-1, 0)) == 2, "kierunek W = 2")
	_check(Iso.direction8(Vector2(0, -1)) == 4, "kierunek N = 4")
	_check(Iso.direction8(Vector2(1, 0)) == 6, "kierunek E = 6")
	# dane
	var d = load("res://scripts/data.gd").new()
	d.reload()
	_check(d.units.has("osadnik"), "jednostki: osadnik")
	_check(d.buildings.has("centrum") and d.buildings.has("cud"), "budynki: centrum, cud")
	_check(d.ages.size() == 4, "4 epoki")
	_check(d.quiz.size() >= 20, "quiz >= 20 pytań (%d)" % d.quiz.size())
	var ids := {}
	for e in d.kodeks:
		_check(not ids.has(e["id"]), "kodeks: unikalne id %s" % e["id"])
		ids[e["id"]] = true
	for q in d.quiz:
		var n: int = q["odpowiedzi"].size()
		_check(n == 4 and int(q["poprawna"]) < n, "quiz: 4 odpowiedzi i poprawny indeks: " + str(q["pytanie"]).left(40))
	for k in d.buildings.keys():
		for u in d.buildings[k].get("szkoli", []):
			_check(d.units.has(u), "budynek %s szkoli istniejącą jednostkę %s" % [k, u])
		var req: String = d.buildings[k].get("wymaga", "")
		_check(req == "" or d.buildings.has(req), "budynek %s wymaga istniejącego budynku" % k)
	for ev in d.events:
		_check(ev.get("wybory", []).size() >= 2, "wydarzenie %s ma >= 2 wybory" % ev.get("id", "?"))
	# świat (wymaga autoloadów)
	var w = load("res://scripts/world.gd").new()
	add_child(w)
	w.generate(12345)
	_check(w.entities.size() > 40, "świat ma encje (%d)" % w.entities.size())
	var tc = w.find_first(func(e): return e is Building and e.kind == "centrum" and e.team == 0)
	_check(tc != null and tc.built, "centrum gracza istnieje i jest ukończone")
	var vil = w.find_first(func(e): return e is Villager)
	_check(vil != null, "osadnik istnieje")
	var p = w.find_path(vil.cell(), Vector2i(30, 30))
	_check(p.size() > 5, "ścieżka osadnika do (30,30) ma %d punktów" % p.size())
	var adj = w.nearest_free_adjacent(tc.cells(), vil.cell())
	_check(adj.x >= 0 and tc.distance_cells(adj) == 1, "wolne pole obok centrum")
	_check(GameState.pop == 3 and GameState.pop_cap == 5, "ludność 3/5 po starcie (jest %d/%d)" % [GameState.pop, GameState.pop_cap])
	# gospodarka
	GameState.res["drewno"] = 10
	_check(not GameState.can_afford({"drewno": 25}), "brak 25 drewna przy 10")
	GameState.add("drewno", 100)
	_check(GameState.spend({"drewno": 25}) and int(GameState.res["drewno"]) == 85, "wydatek 25 drewna")
	_check(GameState.age_up_blocker() != "", "awans zablokowany na starcie")
	print("== wynik: %d błędów ==" % fails)
	get_tree().quit(1 if fails > 0 else 0)
