class_name EnemyAI extends Node
## Prosty przeciwnik: co pewien czas wysyła falę najeźdźców z obozu w rogu mapy.

var world: Node2D
var wave := 0
var timer := 150.0
var warned := false
var spawn_cell := Vector2i(40, 40)


func _process(delta: float) -> void:
	if GameState.ended:
		return
	timer -= delta
	if timer <= 25.0 and not warned:
		warned = true
		GameState.message.emit("Zwiadowcy donoszą: z południowego wschodu nadciąga najazd!")
	if timer <= 0.0:
		_launch_wave()


func _launch_wave() -> void:
	wave += 1
	warned = false
	timer = maxf(90.0, 170.0 - wave * 10.0)
	var n := 2 + wave + GameState.age * 2
	var kinds: Array[String] = ["milicja"]
	if GameState.age >= 1:
		kinds.append("wlocznik")
		kinds.append("lucznik")
	if GameState.age >= 2:
		kinds.append("rycerz")
	for i in n:
		var k: String = kinds[i % kinds.size()]
		var c: Vector2i = world.nearest_free_adjacent([spawn_cell], spawn_cell + Vector2i(-1, -1), 3)
		if c.x < 0:
			c = spawn_cell
		var u: Unit = world.spawn_unit(k, c, 1)
		if u != null:
			u.aggro_cells = 60
			u.idle_scan_t = randf_range(0.1, 1.0)
	GameState.message.emit("Najazd! %d wrogów rusza na Twoją osadę." % n)
