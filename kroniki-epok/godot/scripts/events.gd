class_name EventManager extends Node
## Wydarzenia historyczne uruchamiane po czasie gry (data/wydarzenia_pl.json).

var hud: Node = null
var world: Node2D = null
var pending: Array = []


func _ready() -> void:
	pending = Data.events.duplicate(true)
	pending.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return float(a.get("czas", 0)) < float(b.get("czas", 0)))


func _process(_delta: float) -> void:
	if GameState.ended or pending.is_empty() or hud == null:
		return
	if hud.popup_depth > 0:
		return
	if GameState.elapsed >= float(pending[0].get("czas", 0)):
		var ev: Dictionary = pending.pop_front()
		hud.show_event(ev, _apply)


func _apply(ev: Dictionary, idx: int) -> void:
	if idx < 0:
		return
	var ch: Dictionary = ev.get("wybory", [])[idx]
	var cost: Dictionary = ch.get("koszt", {})
	if not GameState.spend(cost):
		GameState.message.emit(GameState.missing_text(cost))
		return
	var ef: Dictionary = ch.get("efekt", {})
	for k in ef.keys():
		match k:
			"pop_cap":
				GameState.set_pop_cap_delta(int(ef[k]))
			"strata_osadnikow":
				var n := int(ef[k])
				for e in world.entities.duplicate():
					if n <= 0:
						break
					if e is Villager and e.team == 0:
						e.die()
						n -= 1
			_:
				GameState.add(k, float(ef[k]))
	if ch.has("komunikat"):
		GameState.message.emit(str(ch["komunikat"]))
