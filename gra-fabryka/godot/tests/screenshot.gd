extends Node
## Zrzut ekranu gry (do README / testów wizualnych).
##   xvfb-run -a -s "-screen 0 1366x800x24" godot --path godot res://scenes/screenshot.tscn -- out.png [hour] [zoom] [yaw] [focus_x] [focus_z]

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
		main.cam.zoom = float(args[2])
		main.cam.camera.size = main.cam.zoom
	if args.size() > 3:
		main.cam.yaw_index = int(args[3])
		main.cam.target_yaw = main.cam.yaw_index * 45.0
		main.cam.rotation_degrees.y = main.cam.target_yaw
	if args.size() > 5:
		main.cam.focus_on(Vector3(float(args[4]), 0, float(args[5])))
	# zamknij okno wstępu (modal) – usuń warstwę modalną
	for c in main.hud.modal_layer.get_children():
		c.queue_free()
	main.hud._modal_open = false
	main.select_sim(main.world.sims[0])
	Game.say("Zrzut ekranu: %s" % Game.date_text(), "info")


func _process(_delta: float) -> void:
	frames += 1
	if frames == 30:
		var img := get_viewport().get_texture().get_image()
		var err := img.save_png(out_path)
		print("screenshot -> %s (%s)" % [out_path, error_string(err)])
		get_tree().quit()
