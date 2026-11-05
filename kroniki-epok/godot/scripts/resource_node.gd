class_name ResourceNode extends Entity
## Złoże surowca: drzewo (drewno), krzaki jagodowe (żywność), złoto, kamień.

const DEFS := {
	"drzewo": {"nazwa": "Drzewo", "typ": "drewno", "ilosc": 100},
	"krzaki": {"nazwa": "Krzaki jagodowe", "typ": "zywnosc", "ilosc": 125},
	"zloto": {"nazwa": "Złoże złota", "typ": "zloto", "ilosc": 800},
	"kamien": {"nazwa": "Złoże kamienia", "typ": "kamien", "ilosc": 350},
}

var res_type := "drewno"
var amount := 100.0
var seed_val := 0


func setup(k: String, c: Vector2i) -> void:
	kind = k
	team = -1
	grid_pos = c
	size = Vector2i.ONE
	var def: Dictionary = DEFS.get(k, DEFS["drzewo"])
	res_type = def["typ"]
	amount = float(def["ilosc"])
	max_hp = amount
	hp = amount
	seed_val = c.x * 7919 + c.y * 104729
	position = Iso.cell_center(c)


func display_name() -> String:
	return DEFS.get(kind, {}).get("nazwa", kind)


func take(n: float) -> float:
	var got := minf(n, amount)
	amount -= got
	hp = amount
	if amount <= 0.0:
		die()
	return got


func hit_rect() -> Rect2:
	match kind:
		"drzewo":
			return Rect2(position + Vector2(-14, -52), Vector2(28, 56))
		"krzaki":
			return Rect2(position + Vector2(-16, -18), Vector2(32, 22))
		_:
			return Rect2(position + Vector2(-18, -22), Vector2(36, 26))


func take_damage(_amount: float, _attacker: Node = null) -> void:
	pass  # złóż nie da się zniszczyć atakiem
