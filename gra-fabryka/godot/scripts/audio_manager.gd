class_name AudioManager
extends Node
## Dźwięki gry (syntetyczne, wygenerowane skryptem blender/generate_audio.py – CC0):
## syrena fabryczna o 6:00 i 19:00, stukot krosien w godzinach pracy, dzwon w niedzielę,
## ptaki na podwórzu, gwar w szynku i na targu, kliknięcia UI, brzęk monet przy wypłacie.

const DIR := "res://assets/audio/"

var _players: Dictionary = {}
var _loops: Dictionary = {}
var _last_money: int = 0
var world: World = null


func _ready() -> void:
	for n in ["syrena", "dzwon", "klik", "monety"]:
		var p := AudioStreamPlayer.new()
		p.stream = _load(n, false)
		p.bus = "Master"
		p.volume_db = -6.0 if n != "klik" else -12.0
		add_child(p)
		_players[n] = p
	_last_money = Game.money
	Game.hour_changed.connect(_on_hour)
	Game.money_changed.connect(_on_money)
	Game.ui_click.connect(func(): play("klik"))


func setup_world(w: World) -> void:
	world = w
	_add_loop("krosna_petla", Vector3(11, 1.5, 4.5), -4.0, 28.0)
	_add_loop("ptaki_petla", Vector3(14, 3.0, 18.0), -10.0, 24.0)
	_add_loop("ptaki_petla_skwer", Vector3(32, 3.0, 27.0), -10.0, 24.0, "ptaki_petla")
	_add_loop("gwar_petla", Vector3(32, 1.5, 16.5), -8.0, 16.0)
	_add_loop("gwar_targ", Vector3(46, 1.5, 18.0), -8.0, 18.0, "gwar_petla")
	_update_loops(Game.hour())


func _load(name: String, loop: bool) -> AudioStream:
	var path := DIR + name + ".wav"
	if not ResourceLoader.exists(path):
		return null
	var s = load(path)
	if s is AudioStreamWAV and loop:
		var w := (s as AudioStreamWAV).duplicate() as AudioStreamWAV
		w.loop_mode = AudioStreamWAV.LOOP_FORWARD
		w.loop_begin = 0
		w.loop_end = w.data.size() / 2
		return w
	return s


func _add_loop(key: String, pos: Vector3, vol_db: float, max_dist: float, file: String = "") -> void:
	var p := AudioStreamPlayer3D.new()
	p.stream = _load(file if file != "" else key, true)
	p.position = pos
	p.volume_db = vol_db
	p.max_distance = max_dist
	p.unit_size = 8.0
	p.attenuation_model = AudioStreamPlayer3D.ATTENUATION_INVERSE_DISTANCE
	if world:
		world.add_child(p)
	else:
		add_child(p)
	_loops[key] = p


func play(name: String) -> void:
	var p: AudioStreamPlayer = _players.get(name)
	if p and p.stream:
		p.play()


func _on_hour(h: int) -> void:
	var workday := not Game.is_sunday() and not Game.strike_active
	if workday and (h == 6 or h == 19):
		play("syrena")
	if Game.is_sunday() and h == 9:
		play("dzwon")
	_update_loops(h)


func _update_loops(h: int) -> void:
	var working := h >= 6 and h < 19 and not Game.is_sunday() and not Game.strike_active
	_set_loop("krosna_petla", working)
	var day := h >= 5 and h < 21
	_set_loop("ptaki_petla", day)
	_set_loop("ptaki_petla_skwer", day)
	_set_loop("gwar_petla", h >= 17 or h < 1)
	_set_loop("gwar_targ", h >= 6 and h < 14 and not Game.is_sunday())


func _set_loop(key: String, on: bool) -> void:
	var p: AudioStreamPlayer3D = _loops.get(key)
	if p == null or p.stream == null:
		return
	if on and not p.playing:
		p.play()
	elif not on and p.playing:
		p.stop()


func _on_money(m: int) -> void:
	if m - _last_money >= 50:
		play("monety")
	_last_money = m
