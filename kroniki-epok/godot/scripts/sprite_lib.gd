extends Node
## Autoload "SpriteLib": wyszukuje arkusze sprite'ów wyrenderowane w Blenderze.
## Konwencja plików (tworzy je blender/pack_sheets.py):
##   res://assets/sprites/<rodzaj>_<animacja>.png   - arkusz: wiersze = kierunki, kolumny = klatki
##   res://assets/sprites/<rodzaj>_<animacja>.json  - {"frame_w","frame_h","frames","directions","fps","origin":[x,y],"player_color":bool}
## Gdy arkusza brak, encje rysują się proceduralnie (ProceduralArt), więc gra działa bez grafiki.

const SPRITE_DIR := "res://assets/sprites/"
var _cache: Dictionary = {}
var _shader: Shader = null


func get_sheet(kind: String, anim: String) -> Dictionary:
	var key := kind + "_" + anim
	if _cache.has(key):
		return _cache[key]
	var result := {}
	var png := SPRITE_DIR + key + ".png"
	var meta_path := SPRITE_DIR + key + ".json"
	if ResourceLoader.exists(png) and FileAccess.file_exists(meta_path):
		var tex := load(png)
		var meta: Variant = JSON.parse_string(FileAccess.get_file_as_string(meta_path))
		if tex is Texture2D and meta is Dictionary:
			result = {"texture": tex, "meta": meta}
	_cache[key] = result
	return result


func has_any(kind: String) -> bool:
	return not get_sheet(kind, "idle").is_empty()


func player_color_material(team_color: Color) -> ShaderMaterial:
	if _shader == null:
		_shader = load("res://shaders/player_color.gdshader")
	var m := ShaderMaterial.new()
	m.shader = _shader
	m.set_shader_parameter("team_color", team_color)
	return m
