extends Node
## Test symulacji bez okna: uruchamia grę, automatycznie rozstrzyga zdarzenia
## i quizy, przewija 35 dni i wypisuje dzienny raport. Służy do wykrywania
## błędów skryptów oraz sprawdzania balansu (pieniądze, zdrowie, edukacja).
##
##   godot --headless --path godot res://scenes/test_run.tscn

const MINUTES_PER_STEP := 5.0
const STEPS_PER_FRAME := 20

var main: Node
var last_day := 0
var events_seen: Array[String] = []
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	_rng.seed = 1892
	Game.event_requested.connect(_on_event)
	Game.quiz_requested.connect(_on_quiz)
	Game.game_over.connect(_on_game_over)
	main = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	Game.resume()          # zamknij okno wstępu
	Game.set_speed(3)
	print("== start: %s %s, kasa %s, jedzenie %d" % [Game.date_text(), Game.clock_text(), Game.money_text(), Game.food])


func _process(_delta: float) -> void:
	for i in STEPS_PER_FRAME:
		if Game.paused_by_event:
			# zdarzenie zostało rozstrzygnięte w sygnale; jeśli nadal pauza – HUD czeka, wymuś
			Game.resume()
		Game._advance(MINUTES_PER_STEP)
		for s in main.world.sims:
			s._process(MINUTES_PER_STEP / Game.MINUTES_PER_SECOND[Game.speed])
		if Game.day != last_day:
			last_day = Game.day
			_daily_report()
		if Game.day > Game.DAYS_TOTAL + 1:
			get_tree().quit()
			return


func _daily_report() -> void:
	var line := "D%02d %-12s kasa %-14s jedz %2d |" % [Game.day, Game.date_text().split(",")[0], Game.money_text(), Game.food]
	for s in main.world.sims:
		line += " %s: zdr %3d glod %3d en %3d hig %3d zab %3d edu %3d %s%s |" % [
			s.sim_name.substr(0, 3), int(s.health), int(s.needs["glod"]), int(s.needs["energia"]),
			int(s.needs["higiena"]), int(s.needs["zabawa"]), int(s.needs["edukacja"]),
			"P" if s.job != "" else ("S" if s.enrolled else "-"), "!" if s.sick else ""]
	print(line)


func _on_event(ev: Dictionary) -> void:
	events_seen.append(ev["id"])
	var choices: Array = ev.get("choices", [])
	var pick: Dictionary = {}
	if not choices.is_empty():
		# deterministycznie: Antek do pracy, Zosia do szkoły, lekarz, strajk – udział
		var idx := 0
		match ev["id"]:
			"praca_antka": idx = 0
			"praca_zosi": idx = 1
			_: idx = 0
		pick = choices[idx]
	print("  >> zdarzenie: %s -> %s" % [ev["title"], pick.get("label", "(brak)")])
	Game.resolve_event(ev, pick)


func _on_quiz(sim: Node) -> void:
	var q := Edu.next_question()
	var ok := Edu.answer(q, _rng.randi_range(0, 2))
	print("  >> quiz (%s): %s -> %s" % [sim.sim_name, q["q"].substr(0, 50), "OK" if ok else "źle"])
	Game.resume()


func _on_game_over(report: Dictionary) -> void:
	print("== KONIEC: %s" % JSON.stringify(report))
	print("== zdarzenia: %s" % ", ".join(events_seen))
	print("== %s" % Edu.progress_text())
	get_tree().quit()
