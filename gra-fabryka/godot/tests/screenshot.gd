extends Node
## Zrzut ekranu gry (do README / testów wizualnych).
##   xvfb-run -a -s "-screen 0 1366x800x24" godot --path godot res://scenes/screenshot.tscn -- out.png [hour] [zoom] [yaw_deg] [focus_x] [focus_z] [pitch_deg]

var frames := 0
var out_path := "screenshot.png"


func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() > 0:
		out_path = args[0]
	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	Game.resume()
	Game.set_speed(0)
	if args.size() > 1:
		Game.minute_of_day = float(args[1]) * 60.0
	if args.size() > 2:
		main.cam.set_zoom(float(args[2]))
	if args.size() > 3:
		main.cam.yaw_deg = float(args[3])
	if args.size() > 6:
		main.cam.pitch_deg = float(args[6])
	if args.size() > 8:
		main.cam.position.y = float(args[8])
	if args.size() > 5:
		main.cam.focus_on(Vector3(float(args[4]), 0, float(args[5])))
	# zamknij okno wstępu (modal) – usuń warstwę modalną
	for c in main.hud.modal_layer.get_children():
		c.queue_free()
	main.hud._modal_open = false
	main.select_sim(main.world.sims[0])
	# opcjonalnie przewiń symulację o N minut gry, by Simowie zdążyli coś zrobić
	if args.size() > 7:
		var mins := int(args[7])
		Game.set_speed(3)
		var step := 5.0
		var done := 0.0
		while done < mins:
			if Game.paused_by_event:
				Game.resume()
			Game._advance(step)
			for sim in main.world.sims:
				sim._process(step / Game.MINUTES_PER_SECOND[Game.speed])
			done += step
		Game.set_speed(0)
		for c in main.hud.modal_layer.get_children():
			c.queue_free()
		main.hud._modal_open = false
		main.hud._pending_events.clear()
		Game.paused_by_event = false
		for sim in main.world.sims:
			if sim.anim:
				sim.anim.advance(0.5)
	Game.say("Zrzut ekranu: %s %s" % [Game.date_text(), Game.clock_text()], "info")


func _process(_delta: float) -> void:
	frames += 1
	if frames == 30:
		var img := get_viewport().get_texture().get_image()
		var err := img.save_png(out_path)
		print("screenshot -> %s (%s)" % [out_path, error_string(err)])
		get_tree().quit()
