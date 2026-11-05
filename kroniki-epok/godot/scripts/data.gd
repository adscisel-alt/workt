extends Node
## Autoload "Data": wczytuje definicje jednostek, budynków, epok, cywilizacji
## oraz treści edukacyjne (quiz, kodeks, wydarzenia) z katalogu res://data.

var units: Dictionary = {}
var buildings: Dictionary = {}
var ages: Array = []
var civs: Dictionary = {}
var quiz: Array = []
var kodeks: Array = []
var events: Array = []


func _ready() -> void:
	reload()


func reload() -> void:
	units = load_json("res://data/jednostki.json", {})
	buildings = load_json("res://data/budynki.json", {})
	ages = load_json("res://data/epoki.json", [])
	civs = load_json("res://data/cywilizacje.json", {})
	quiz = load_json("res://data/quiz_pl.json", [])
	kodeks = load_json("res://data/kodeks_pl.json", [])
	events = load_json("res://data/wydarzenia_pl.json", [])


static func load_json(path: String, fallback: Variant) -> Variant:
	if not FileAccess.file_exists(path):
		push_error("Brak pliku danych: " + path)
		return fallback
	var text := FileAccess.get_file_as_string(path)
	var json := JSON.new()
	var err := json.parse(text)
	if err != OK:
		push_error("Błąd JSON w %s (linia %d): %s" % [path, json.get_error_line(), json.get_error_message()])
		return fallback
	return json.data


func unit_name(kind: String) -> String:
	return units.get(kind, {}).get("nazwa", kind)


func building_name(kind: String) -> String:
	return buildings.get(kind, {}).get("nazwa", kind)


func kodeks_entry(id: String) -> Dictionary:
	for e in kodeks:
		if e.get("id", "") == id:
			return e
	return {}


func kodeks_for_building(kind: String) -> Dictionary:
	for e in kodeks:
		if e.get("budynek", "") == kind:
			return e
	return {}


## Pytania quizu dla danej epoki docelowej (1..3); epoka 0 = wszystkie.
func quiz_for_age(age: int) -> Array:
	var out: Array = []
	for q in quiz:
		if age <= 0 or int(q.get("epoka", 0)) == age:
			out.append(q)
	return out


static func cost_text(cost: Dictionary) -> String:
	var parts: PackedStringArray = []
	for k in cost.keys():
		parts.append("%d %s" % [int(cost[k]), RES_SHORT.get(k, k)])
	return ", ".join(parts)


const RES_SHORT := {
	"drewno": "drewna", "zywnosc": "żywności", "zloto": "złota", "kamien": "kamienia", "wiedza": "wiedzy",
}
const RES_NAMES := {
	"drewno": "Drewno", "zywnosc": "Żywność", "zloto": "Złoto", "kamien": "Kamień", "wiedza": "Wiedza",
}
