extends Node
## Autoload „Edu” – warstwa edukacyjna: karty wiedzy, zdarzenia z wyborami,
## quiz i słowniczek. Dane wczytywane z res://data/wiedza.json.

signal fact_unlocked(id: String, fact: Dictionary)
signal quiz_answered(correct: bool, question: Dictionary)

var facts: Dictionary = {}
var events: Dictionary = {}
var quiz: Array = []
var glossary: Array = []
var unlocked: Array[String] = []
var quiz_correct: int = 0
var quiz_total: int = 0
var _asked: Array[int] = []
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	_rng.randomize()
	_load()


func _load() -> void:
	var f := FileAccess.open("res://data/wiedza.json", FileAccess.READ)
	if f == null:
		push_error("Brak pliku data/wiedza.json")
		return
	var parsed = JSON.parse_string(f.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		push_error("Niepoprawny JSON w data/wiedza.json")
		return
	facts = parsed.get("facts", {})
	events = parsed.get("events", {})
	quiz = parsed.get("quiz", [])
	glossary = parsed.get("glossary", [])


func get_fact(id: String) -> Dictionary:
	return facts.get(id, {})


func get_event(id: String) -> Dictionary:
	var ev: Dictionary = events.get(id, {}).duplicate(true)
	if not ev.is_empty():
		ev["id"] = id
	return ev


func unlock(id: String) -> bool:
	if id == "" or not facts.has(id) or id in unlocked:
		return false
	unlocked.append(id)
	fact_unlocked.emit(id, facts[id])
	return true


func is_unlocked(id: String) -> bool:
	return id in unlocked


func next_question() -> Dictionary:
	if quiz.is_empty():
		return {}
	if _asked.size() >= quiz.size():
		_asked.clear()
	var idx := _rng.randi_range(0, quiz.size() - 1)
	var guard := 0
	while idx in _asked and guard < 100:
		idx = _rng.randi_range(0, quiz.size() - 1)
		guard += 1
	_asked.append(idx)
	var q: Dictionary = quiz[idx].duplicate(true)
	q["index"] = idx
	return q


func answer(q: Dictionary, choice: int) -> bool:
	quiz_total += 1
	var ok := choice == int(q.get("correct", -1))
	if ok:
		quiz_correct += 1
	unlock(String(q.get("fact", "")))
	quiz_answered.emit(ok, q)
	return ok


func progress_text() -> String:
	return "Odkryte karty wiedzy: %d / %d · Quiz: %d / %d poprawnych" % [unlocked.size(), facts.size(), quiz_correct, quiz_total]
