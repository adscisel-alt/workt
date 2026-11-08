extends Node
## Zrzut ekranu gry po kilku sekundach (do dokumentacji / szybkiej kontroli wizualnej).
##   xvfb-run -s "-screen 0 1280x720x24" godot --path godot --rendering-driver opengl3 res://tests/screenshot.tscn
## Ścieżka wyjściowa: zmienna środowiskowa SCREENSHOT_PATH (domyślnie user://zrzut.png); SCREENSHOT_ZOOM (np. 2) zbliża kamerę.

var main: Node2D


func _ready() -> void:
	seed(3)
	main = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().process_frame
	var world: World = main.world
	var vils: Array = world.entities.filter(func(e: Entity) -> bool: return e is Villager and e.team == 0)
	var tree: Entity = world.nearest(vils[0].position, func(e: Entity) -> bool: return e is ResourceNode and e.kind == "drzewo", 1e9)
	var bush: Entity = world.nearest(vils[0].position, func(e: Entity) -> bool: return e is ResourceNode and e.kind == "krzaki", 1e9)
	vils[0].command_gather(tree)
	vils[1].command_gather(bush)
	var origin := world.player_start + Vector2i(4, 4)
	for ring in range(0, 8):
		if world.can_place(origin, Vector2i(2, 2)):
			break
		origin += Vector2i(1, 0)
	var house := world.spawn_building("dom", origin, 0, false)
	vils[2].command_build(house)
	main._set_selection([vils[0], vils[1], vils[2]])
	var tc: Building = world.find_first(func(e: Entity) -> bool: return e is Building and e.kind == "centrum" and e.team == 0)
	tc.enqueue("osadnik")
	var zoom := OS.get_environment("SCREENSHOT_ZOOM").to_float()
	if zoom > 0.0:
		main.cam.zoom = Vector2(zoom, zoom)
		main.cam.position = tc.position + Vector2(60, 40)
	Engine.time_scale = 6.0
	var t0 := Time.get_ticks_msec()
	while Time.get_ticks_msec() - t0 < 2500:
		await get_tree().process_frame
	Engine.time_scale = 1.0
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	var path := OS.get_environment("SCREENSHOT_PATH")
	if path == "":
		path = "user://zrzut.png"
	var err := img.save_png(path)
	print("zrzut: ", path, " (", error_string(err), ") ", img.get_size())
	get_tree().quit(0 if err == OK else 1)
