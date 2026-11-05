class_name PlacementGhost extends Node2D
## Podgląd stawianego budynku: zielony/czerwony obrys śladu na siatce.

var world: World
var kind := ""
var size := Vector2i(2, 2)
var origin := Vector2i.ZERO
var valid := false


func begin(k: String) -> void:
	kind = k
	size = Vector2i.ONE * int(Data.buildings[k].get("rozmiar", 2))
	visible = true
	update_from_mouse()


func end() -> void:
	kind = ""
	visible = false


func update_from_mouse() -> void:
	if kind == "":
		return
	var g := Iso.to_grid(get_global_mouse_position())
	origin = Vector2i(floori(g.x - size.x * 0.5 + 0.5), floori(g.y - size.y * 0.5 + 0.5))
	valid = world.can_place(origin, size)
	position = Vector2.ZERO
	queue_redraw()


func _draw() -> void:
	if kind == "":
		return
	var col := Color(0.2, 0.9, 0.3, 0.45) if valid else Color(0.9, 0.2, 0.2, 0.45)
	for y in size.y:
		for x in size.x:
			var c := origin + Vector2i(x, y)
			var ok := world.in_bounds(c) and not world.occupancy.has(c)
			draw_colored_polygon(Iso.cell_polygon(c), col if ok else Color(0.9, 0.1, 0.1, 0.6))
	draw_polyline(Iso.rect_polygon(origin, size) + PackedVector2Array([Iso.to_world(Vector2(origin))]), Color(1, 1, 1, 0.7), 1.0)
