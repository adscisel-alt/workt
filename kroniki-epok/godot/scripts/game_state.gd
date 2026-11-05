extends Node
## Autoload "GameState": surowce, ludność, epoka, wiedza, statystyki i sygnały globalne.

signal resources_changed
signal population_changed
signal age_changed(age: int)
signal age_research_started(target_age: int)
signal message(text: String)
signal fact_read(id: String)
signal game_over(victory: bool)

const RES_KEYS := ["drewno", "zywnosc", "zloto", "kamien"]
const MAX_POP := 75

var res := {"drewno": 200.0, "zywnosc": 200.0, "zloto": 100.0, "kamien": 200.0}
var wiedza := 0
var pop := 0
var pop_cap := 0
var age := 0
var civ := "polacy"
var elapsed := 0.0

var age_research_target := -1
var age_research_t := 0.0
var age_research_time := 0.0

var facts_read: Dictionary = {}       # id -> true
var facts_unlocked: Dictionary = {}   # id -> true (odblokowane np. przez budynek)
var quiz_correct := 0
var quiz_total := 0
var buildings_built: Dictionary = {}  # kind -> count (ukończone, gracz)
var units_lost := 0
var enemies_killed := 0
var ended := false


func _process(delta: float) -> void:
	if ended:
		return
	elapsed += delta
	if age_research_target >= 0:
		age_research_t += delta
		if age_research_t >= age_research_time:
			_finish_age_research()


func reset() -> void:
	res = {"drewno": 200.0, "zywnosc": 200.0, "zloto": 100.0, "kamien": 200.0}
	wiedza = 0
	pop = 0
	pop_cap = 0
	age = 0
	elapsed = 0.0
	age_research_target = -1
	facts_read.clear()
	facts_unlocked.clear()
	quiz_correct = 0
	quiz_total = 0
	buildings_built.clear()
	units_lost = 0
	enemies_killed = 0
	ended = false
	resources_changed.emit()
	population_changed.emit()


# ---------- surowce ----------

func can_afford(cost: Dictionary) -> bool:
	for k in cost.keys():
		if k == "wiedza":
			if wiedza < int(cost[k]):
				return false
		elif res.get(k, 0.0) < float(cost[k]):
			return false
	return true


func missing_text(cost: Dictionary) -> String:
	var parts: PackedStringArray = []
	for k in cost.keys():
		var have: float = float(wiedza) if k == "wiedza" else res.get(k, 0.0)
		if have < float(cost[k]):
			parts.append("%d %s" % [ceili(float(cost[k]) - have), Data.RES_SHORT.get(k, k)])
	return "Brakuje: " + ", ".join(parts)


func spend(cost: Dictionary) -> bool:
	if not can_afford(cost):
		return false
	for k in cost.keys():
		if k == "wiedza":
			wiedza -= int(cost[k])
		else:
			res[k] -= float(cost[k])
	resources_changed.emit()
	return true


func refund(cost: Dictionary) -> void:
	for k in cost.keys():
		if k == "wiedza":
			wiedza += int(cost[k])
		else:
			res[k] = res.get(k, 0.0) + float(cost[k])
	resources_changed.emit()


func add(kind: String, amount: float) -> void:
	if kind == "wiedza":
		wiedza += int(amount)
	else:
		res[kind] = res.get(kind, 0.0) + amount
	resources_changed.emit()


func civ_bonus(key: String) -> float:
	var c: Dictionary = Data.civs.get(civ, {})
	return float(c.get("bonus", {}).get(key, 1.0))


func building_cost(kind: String) -> Dictionary:
	var def: Dictionary = Data.buildings.get(kind, {})
	var cost: Dictionary = def.get("koszt", {}).duplicate()
	var mult := civ_bonus("koszt_" + kind)
	if mult != 1.0:
		for k in cost.keys():
			cost[k] = roundi(float(cost[k]) * mult)
	return cost


# ---------- ludność ----------

func set_pop_cap_delta(d: int) -> void:
	pop_cap = clampi(pop_cap + d, 0, MAX_POP)
	population_changed.emit()


func pop_delta(d: int) -> void:
	pop = maxi(0, pop + d)
	population_changed.emit()


func has_room(n: int) -> bool:
	return pop + n <= mini(pop_cap, MAX_POP)


# ---------- epoki ----------

func age_name(a: int = -1) -> String:
	if a < 0:
		a = age
	if a < Data.ages.size():
		return Data.ages[a].get("nazwa", "Epoka %d" % a)
	return "?"


## Zwraca pusty string, jeśli można zacząć awans, albo powód odmowy.
func age_up_blocker() -> String:
	if age >= Data.ages.size() - 1:
		return "Osiągnięto ostatnią epokę."
	if age_research_target >= 0:
		return "Awans już trwa."
	var nxt: Dictionary = Data.ages[age + 1]
	var cost: Dictionary = nxt.get("koszt", {})
	if not can_afford(cost):
		return missing_text(cost)
	var need_w := int(nxt.get("wiedza", 0))
	if wiedza < need_w:
		return "Potrzeba %d pkt wiedzy (masz %d). Czytaj Kodeks (K) lub odbywaj dysputy." % [need_w, wiedza]
	var need_b := int(nxt.get("budynki", 0))
	if count_age_buildings(age) < need_b:
		return "Potrzeba %d różnych budynków z obecnej epoki (bez domów i pól)." % need_b
	return ""


func count_age_buildings(a: int) -> int:
	var n := 0
	for kind in buildings_built.keys():
		var def: Dictionary = Data.buildings.get(kind, {})
		if def.get("farma", false) or kind == "dom":
			continue
		if int(def.get("epoka", 0)) == a and buildings_built[kind] > 0:
			n += 1
	return n


## Rozpoczyna badanie awansu; speed_bonus 0..1 skraca czas (np. za poprawne odpowiedzi).
func start_age_research(speed_bonus: float) -> void:
	var nxt: Dictionary = Data.ages[age + 1]
	spend(nxt.get("koszt", {}))
	age_research_target = age + 1
	age_research_time = float(nxt.get("czas", 60)) * (1.0 - clampf(speed_bonus, 0.0, 0.75))
	age_research_t = 0.0
	age_research_started.emit(age_research_target)
	message.emit("Rozpoczęto awans do epoki: %s (%d s)." % [age_name(age_research_target), int(age_research_time)])


func _finish_age_research() -> void:
	age = age_research_target
	age_research_target = -1
	age_changed.emit(age)
	message.emit("Witaj w epoce: %s! %s" % [age_name(), Data.ages[age].get("podtytul", "")])


# ---------- edukacja ----------

func read_fact(id: String) -> bool:
	if facts_read.has(id):
		return false
	facts_read[id] = true
	wiedza += 1
	resources_changed.emit()
	fact_read.emit(id)
	return true


func unlock_fact(id: String) -> void:
	if id != "" and not facts_unlocked.has(id):
		facts_unlocked[id] = true


func is_fact_available(entry: Dictionary) -> bool:
	return int(entry.get("epoka", 0)) <= age or facts_unlocked.has(entry.get("id", ""))


func record_quiz(correct: int, total: int) -> void:
	quiz_correct += correct
	quiz_total += total
	if correct > 0:
		wiedza += correct
		resources_changed.emit()


func on_building_completed(kind: String) -> void:
	buildings_built[kind] = buildings_built.get(kind, 0) + 1
	var e := Data.kodeks_for_building(kind)
	if not e.is_empty():
		unlock_fact(e["id"])
		if buildings_built[kind] == 1:
			message.emit("Kodeks: nowy wpis „%s” (K)." % e.get("tytul", ""))


func end_game(victory: bool) -> void:
	if ended:
		return
	ended = true
	game_over.emit(victory)


func summary_text() -> String:
	var acc := 0
	if quiz_total > 0:
		acc = roundi(100.0 * quiz_correct / quiz_total)
	return "Czas gry: %d min %02d s\nEpoka: %s\nPrzeczytane wpisy Kodeksu: %d / %d\nQuiz: %d / %d poprawnych (%d%%)\nPunkty wiedzy: %d\nPokonani wrogowie: %d, straty: %d" % [
		int(elapsed) / 60, int(elapsed) % 60, age_name(), facts_read.size(), Data.kodeks.size(),
		quiz_correct, quiz_total, acc, wiedza, enemies_killed, units_lost]
