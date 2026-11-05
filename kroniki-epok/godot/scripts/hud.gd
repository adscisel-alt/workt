class_name HUD extends CanvasLayer
## Interfejs: pasek surowców, panel zaznaczenia z akcjami, komunikaty, okna (quiz, kodeks, pomoc, koniec gry).

class BoxOverlay extends Control:
	var box := Rect2()
	var active := false
	func _ready() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE
		set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	func set_box(r: Rect2) -> void:
		box = r
		active = true
		queue_redraw()
	func hide_box() -> void:
		active = false
		queue_redraw()
	func _draw() -> void:
		if active:
			draw_rect(box, Color(0.4, 0.9, 0.4, 0.15))
			draw_rect(box, Color(0.5, 1.0, 0.5, 0.9), false, 1.0)

var main: Node = null
var res_labels: Dictionary = {}
var pop_label: Label
var age_label: Label
var research_label: Label
var info_name: Label
var info_detail: Label
var actions: GridContainer
var msg_box: VBoxContainer
var box_overlay: BoxOverlay
var quiz: QuizPanel
var kodeks: KodeksPanel
var help: PanelContainer
var end_panel: PanelContainer
var end_title: Label
var end_text: Label
var pause_label: Label

var popup_depth := 0
var manual_pause := false
var refresh_t := 0.0
var _event_cb: Callable
var _event_data: Dictionary = {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	layer = 10
	_build_ui()
	GameState.resources_changed.connect(_update_top)
	GameState.population_changed.connect(_update_top)
	GameState.age_changed.connect(func(_a: int) -> void: _update_top(); refresh_selection())
	GameState.age_research_started.connect(func(_a: int) -> void: _update_top(); refresh_selection())
	GameState.message.connect(show_message)
	GameState.game_over.connect(_on_game_over)
	_update_top()


func _build_ui() -> void:
	box_overlay = BoxOverlay.new()
	add_child(box_overlay)

	# --- górny pasek ---
	var top := UITheme.make_panel()
	top.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	add_child(top)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 18)
	top.add_child(h)
	for k in ["drewno", "zywnosc", "zloto", "kamien", "wiedza"]:
		var l := UITheme.make_label("", 15)
		res_labels[k] = l
		h.add_child(l)
	pop_label = UITheme.make_label("", 15)
	h.add_child(pop_label)
	age_label = UITheme.make_label("", 15, true)
	h.add_child(age_label)
	research_label = UITheme.make_label("", 13)
	h.add_child(research_label)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(spacer)
	var bk := UITheme.make_button("Kodeks (K)", Vector2(110, 30))
	bk.pressed.connect(toggle_kodeks)
	h.add_child(bk)
	var bh := UITheme.make_button("Pomoc (F1)", Vector2(110, 30))
	bh.pressed.connect(toggle_help)
	h.add_child(bh)
	var bp := UITheme.make_button("Pauza (P)", Vector2(100, 30))
	bp.pressed.connect(toggle_pause)
	h.add_child(bp)

	# --- dolny panel ---
	var bottom := UITheme.make_panel()
	bottom.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	bottom.grow_vertical = Control.GROW_DIRECTION_BEGIN
	bottom.offset_top = -150
	bottom.custom_minimum_size = Vector2(0, 150)
	add_child(bottom)
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 14)
	bottom.add_child(hb)
	var info := VBoxContainer.new()
	info.custom_minimum_size = Vector2(340, 0)
	hb.add_child(info)
	info_name = UITheme.make_label("Nic nie zaznaczono", 17, true)
	info.add_child(info_name)
	info_detail = UITheme.make_label("", 13)
	info_detail.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	info_detail.custom_minimum_size = Vector2(340, 0)
	info.add_child(info_detail)
	hb.add_child(VSeparator.new())
	actions = GridContainer.new()
	actions.columns = 5
	actions.add_theme_constant_override("h_separation", 6)
	actions.add_theme_constant_override("v_separation", 6)
	hb.add_child(actions)

	# --- komunikaty ---
	msg_box = VBoxContainer.new()
	msg_box.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
	msg_box.offset_left = 16
	msg_box.offset_top = -420
	msg_box.offset_bottom = -170
	msg_box.alignment = BoxContainer.ALIGNMENT_END
	msg_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(msg_box)

	pause_label = UITheme.make_label("PAUZA", 40, true)
	pause_label.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	pause_label.offset_top = 70
	pause_label.visible = false
	add_child(pause_label)

	# --- okna ---
	quiz = QuizPanel.new()
	add_child(quiz)
	quiz.finished.connect(_on_quiz_finished)
	quiz.chosen.connect(_on_event_chosen)
	kodeks = KodeksPanel.new()
	kodeks.closed.connect(func() -> void: _close_popup(kodeks))
	add_child(kodeks)
	help = _make_help()
	add_child(help)
	end_panel = UITheme.make_panel(0.98)
	end_panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	end_panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	end_panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	end_panel.custom_minimum_size = Vector2(520, 0)
	var ev := VBoxContainer.new()
	ev.add_theme_constant_override("separation", 10)
	end_panel.add_child(ev)
	end_title = UITheme.make_label("", 26, true)
	ev.add_child(end_title)
	end_text = UITheme.make_label("", 15)
	ev.add_child(end_text)
	var again := UITheme.make_button("Zagraj ponownie", Vector2(200, 38))
	again.pressed.connect(func() -> void:
		get_tree().paused = false
		GameState.reset()
		get_tree().reload_current_scene()
	)
	ev.add_child(again)
	end_panel.visible = false
	add_child(end_panel)


func _make_help() -> PanelContainer:
	var p := UITheme.make_panel(0.97)
	p.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	p.grow_horizontal = Control.GROW_DIRECTION_BOTH
	p.grow_vertical = Control.GROW_DIRECTION_BOTH
	p.custom_minimum_size = Vector2(760, 0)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	p.add_child(v)
	v.add_child(UITheme.make_label("Kroniki Epok — jak grać", 20, true))
	var t := RichTextLabel.new()
	t.bbcode_enabled = true
	t.fit_content = true
	t.custom_minimum_size = Vector2(720, 0)
	t.add_theme_font_size_override("normal_font_size", 14)
	t.text = """[b]Cel:[/b] rozwiń osadę od Epoki Ciemnej do Epoki Imperiów i ukończ Cud. Przegrywasz, gdy stracisz centrum osady i wszystkich osadników.

[b]Sterowanie[/b]
• Lewy przycisk: zaznacz (przeciągnij ramkę, Shift dodaje). Prawy przycisk: rozkaz (idź / zbieraj / buduj / atakuj / punkt zbiórki).
• WASD / strzałki / krawędź ekranu: kamera. Kółko myszy: zbliżenie. H: skok do centrum. Kropka (.): bezczynny osadnik.
• Stawianie budynku: zaznacz osadnika → przycisk w panelu → kliknij na mapie (Shift: stawiaj dalej). Esc anuluje.
• K: Kodeks. F1: pomoc. P: pauza.

[b]Edukacja[/b]
• [color=#ffd27a]Wiedza[/color] to piąty surowec. Zdobywasz ją czytając wpisy Kodeksu (+1 za każdy nowy wpis), zdając „Egzamin epoki” przy awansie (+1 za poprawną odpowiedź, każda poprawna skraca też czas awansu o 15%) oraz w dysputach na Uniwersytecie.
• Awans do kolejnej epoki wymaga surowców, dwóch różnych budynków z bieżącej epoki i progu wiedzy (2 / 6 / 11).
• Budynki odblokowują wpisy Kodeksu o ich prawdziwych odpowiednikach; co kilka minut pojawia się wydarzenie historyczne z decyzją.

[b]Gospodarka[/b]
• Osadnicy noszą 10 jednostek surowca do najbliższego składu (centrum, młyn, obóz drwali, obóz górniczy).
• Pola uprawne (wymagają młyna) dają 250 żywności, potem trzeba obsiać je na nowo. Domy zwiększają ludność o 5.
• Co ok. 2,5 minuty z południowego wschodu nadciąga najazd. Włócznicy są skuteczni przeciw jeździe, łucznicy rażą z dystansu, zamek ostrzeliwuje wrogów."""
	v.add_child(t)
	var close := UITheme.make_button("Zamknij (F1 / Esc)", Vector2(180, 34))
	close.pressed.connect(func() -> void: _close_popup(help))
	v.add_child(close)
	p.visible = false
	return p


# ---------- wejście ----------

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("kodeks"):
		toggle_kodeks()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("help"):
		toggle_help()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("pause"):
		toggle_pause()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("cancel") and popup_depth > 0:
		if kodeks.visible:
			_close_popup(kodeks)
		elif help.visible:
			_close_popup(help)
		get_viewport().set_input_as_handled()


func _process(delta: float) -> void:
	refresh_t -= delta
	if refresh_t <= 0.0:
		refresh_t = 0.4
		_update_details()
		if GameState.age_research_target >= 0:
			_update_top()


# ---------- okna ----------

func _open_popup(c: Control) -> void:
	if c.visible:
		return
	c.visible = true
	popup_depth += 1
	get_tree().paused = true


func _close_popup(c: Control) -> void:
	if not c.visible:
		return
	c.visible = false
	popup_depth = maxi(0, popup_depth - 1)
	if popup_depth == 0 and not manual_pause and not GameState.ended:
		get_tree().paused = false


func toggle_kodeks() -> void:
	if kodeks.visible:
		_close_popup(kodeks)
	else:
		kodeks.refresh()
		_open_popup(kodeks)


func toggle_help() -> void:
	if help.visible:
		_close_popup(help)
	else:
		_open_popup(help)


func toggle_pause() -> void:
	manual_pause = not manual_pause
	pause_label.visible = manual_pause
	if manual_pause:
		get_tree().paused = true
	elif popup_depth == 0 and not GameState.ended:
		get_tree().paused = false


func show_event(ev: Dictionary, cb: Callable) -> void:
	_event_cb = cb
	_event_data = ev
	var choices: Array = []
	for ch in ev.get("wybory", []):
		choices.append({"tekst": ch.get("tekst", ""), "enabled": GameState.can_afford(ch.get("koszt", {}))})
	quiz.start_choice(str(ev.get("tytul", "Wydarzenie")), str(ev.get("tresc", "")), choices)
	popup_depth += 1
	get_tree().paused = true


func _on_event_chosen(idx: int) -> void:
	popup_depth = maxi(0, popup_depth - 1)
	if popup_depth == 0 and not manual_pause and not GameState.ended:
		get_tree().paused = false
	if _event_cb.is_valid():
		_event_cb.call(_event_data, idx)


var _quiz_purpose := ""
var _quiz_target: Node = null

func start_quiz(questions: Array, title: String, purpose: String, target: Node = null) -> void:
	_quiz_purpose = purpose
	_quiz_target = target
	quiz.start_quiz(questions, title)
	popup_depth += 1
	get_tree().paused = true


func _on_quiz_finished(correct: int, total: int) -> void:
	popup_depth = maxi(0, popup_depth - 1)
	if popup_depth == 0 and not manual_pause and not GameState.ended:
		get_tree().paused = false
	GameState.record_quiz(correct, total)
	match _quiz_purpose:
		"age":
			show_message("Egzamin epoki: %d/%d poprawnych (+%d wiedzy)." % [correct, total, correct])
			if GameState.age_up_blocker() == "":
				GameState.start_age_research(0.15 * correct)
		"dysputa":
			show_message("Dysputa zakończona: %d/%d poprawnych (+%d wiedzy)." % [correct, total, correct])
			if is_instance_valid(_quiz_target):
				_quiz_target.set_meta("dysputa_t", GameState.elapsed)
	refresh_selection()


func _on_game_over(victory: bool) -> void:
	end_title.text = "Zwycięstwo! Cud ukończony." if victory else "Porażka. Osada upadła."
	end_text.text = GameState.summary_text()
	end_panel.visible = true
	get_tree().paused = true


# ---------- komunikaty ----------

func show_message(text: String) -> void:
	var l := UITheme.make_label(text, 14)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	l.add_theme_constant_override("outline_size", 4)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size = Vector2(520, 0)
	msg_box.add_child(l)
	while msg_box.get_child_count() > 6:
		msg_box.get_child(0).queue_free()
	var tw := l.create_tween()
	tw.tween_interval(7.0)
	tw.tween_property(l, "modulate:a", 0.0, 1.0)
	tw.tween_callback(l.queue_free)


# ---------- górny pasek ----------

func _update_top() -> void:
	for k in res_labels.keys():
		var val := GameState.wiedza if k == "wiedza" else int(GameState.res.get(k, 0.0))
		res_labels[k].text = "%s: %d" % [Data.RES_NAMES[k], val]
	pop_label.text = "Ludność: %d / %d" % [GameState.pop, GameState.pop_cap]
	age_label.text = GameState.age_name()
	if GameState.age_research_target >= 0:
		var pct := int(100.0 * GameState.age_research_t / maxf(1.0, GameState.age_research_time))
		research_label.text = "→ %s: %d%%" % [GameState.age_name(GameState.age_research_target), pct]
	else:
		research_label.text = ""


# ---------- panel zaznaczenia ----------

func _selection() -> Array:
	if main == null:
		return []
	return main.selected.filter(func(e: Entity) -> bool: return is_instance_valid(e) and not e.dead)


func refresh_selection() -> void:
	for c in actions.get_children():
		c.queue_free()
	_update_details()
	var sel := _selection()
	if sel.is_empty():
		return
	var e: Entity = sel[0]
	var all_villagers: bool = sel.all(func(x: Entity) -> bool: return x is Villager and x.team == 0)
	if all_villagers:
		_villager_actions()
	elif sel.size() == 1 and e is Building and e.team == 0:
		_building_actions(e)
	if sel.any(func(x: Entity) -> bool: return x is Unit and x.team == 0):
		var stop := UITheme.make_button("Stój", Vector2(100, 34))
		stop.pressed.connect(func() -> void:
			for x in _selection():
				if x is Unit:
					x.stop()
		)
		actions.add_child(stop)


func _update_details() -> void:
	var sel := _selection()
	if sel.is_empty():
		info_name.text = "Nic nie zaznaczono"
		info_detail.text = "Zaznacz osadnika, aby budować, lub budynek, aby szkolić. F1 = pomoc."
		return
	if sel.size() > 1:
		var counts := {}
		for x in sel:
			counts[x.display_name()] = counts.get(x.display_name(), 0) + 1
		info_name.text = "Zaznaczono: %d" % sel.size()
		var parts: PackedStringArray = []
		for k in counts.keys():
			parts.append("%s ×%d" % [k, counts[k]])
		info_detail.text = ", ".join(parts)
		return
	var e: Entity = sel[0]
	info_name.text = e.display_name()
	var lines: PackedStringArray = []
	if e is ResourceNode:
		lines.append("Pozostało: %d %s" % [int(e.amount), Data.RES_SHORT.get(e.res_type, e.res_type)])
	else:
		lines.append("Wytrzymałość: %d / %d" % [int(e.hp), int(e.max_hp)])
	if e is Villager:
		var st := {"idle": "bezczynny", "moving": "w drodze", "to_resource": "idzie po surowiec", "gathering": "zbiera", "to_dropoff": "odnosi surowce", "to_build": "idzie budować", "building": "buduje", "attacking": "walczy"}
		lines.append("Stan: %s" % st.get(e.state, e.state))
		if e.carry_amt > 0.0:
			lines.append("Niesie: %d %s" % [int(e.carry_amt), Data.RES_SHORT.get(e.carry_type, "")])
	elif e is Unit:
		lines.append("Atak: %d, zasięg: %d. %s" % [int(e.attack_dmg), e.attack_range, e.def.get("opis", "")])
	elif e is Building:
		if not e.built:
			lines.append("Budowa: %d%% (potrzebny osadnik)" % int(100.0 * e.build_ratio()))
		elif e.is_farm:
			lines.append("Zapas żywności: %d" % int(e.food_stock))
		if not e.queue.is_empty():
			var names: PackedStringArray = []
			for k in e.queue:
				names.append(Data.unit_name(k))
			lines.append("Kolejka: %s (%d%%)%s" % [", ".join(names), int(100.0 * e.queue_progress()), " — brak miejsca!" if e.queue_blocked else ""])
		if e.built:
			lines.append(str(e.def.get("opis", "")))
	info_detail.text = "\n".join(lines)


func _villager_actions() -> void:
	for kind in Data.buildings.keys():
		var def: Dictionary = Data.buildings[kind]
		if int(def.get("epoka", 0)) > GameState.age:
			continue
		var cost := GameState.building_cost(kind)
		var b := UITheme.make_button("%s\n%s" % [def.get("nazwa", kind), Data.cost_text(cost)], Vector2(150, 44))
		b.tooltip_text = str(def.get("opis", ""))
		if not GameState.can_afford(cost):
			b.modulate = Color(1, 0.75, 0.75)
		b.pressed.connect(func() -> void: main.start_placing(kind))
		actions.add_child(b)


func _building_actions(b: Building) -> void:
	if not b.built:
		return
	for uk in b.trains():
		var udef: Dictionary = Data.units[uk]
		var btn := UITheme.make_button("Szkol: %s\n%s" % [udef.get("nazwa", uk), Data.cost_text(udef.get("koszt", {}))], Vector2(160, 44))
		btn.tooltip_text = str(udef.get("opis", ""))
		if int(udef.get("epoka", 0)) > GameState.age:
			btn.disabled = true
			btn.tooltip_text = "Wymaga epoki: " + GameState.age_name(int(udef.get("epoka", 0)))
		btn.pressed.connect(func() -> void:
			var err := b.enqueue(uk)
			if err != "":
				show_message(err)
			_update_details()
		)
		actions.add_child(btn)
	if b.kind == "centrum" and GameState.age < Data.ages.size() - 1 and GameState.age_research_target < 0:
		var nxt: Dictionary = Data.ages[GameState.age + 1]
		var up := UITheme.make_button("Awans: %s\n%s, %d wiedzy" % [nxt.get("nazwa", ""), Data.cost_text(nxt.get("koszt", {})), int(nxt.get("wiedza", 0))], Vector2(220, 44))
		up.tooltip_text = "Najpierw „Egzamin epoki” (3 pytania): każda poprawna odpowiedź to +1 wiedzy i -15% czasu awansu."
		up.pressed.connect(_try_age_up)
		actions.add_child(up)
	if b.def.get("dysputa", false):
		var since := GameState.elapsed - float(b.get_meta("dysputa_t", -999.0))
		var d := UITheme.make_button("Dysputa uczona\n(quiz, +wiedza)" if since > 90.0 else "Dysputa za %d s" % int(90.0 - since), Vector2(160, 44))
		d.disabled = since <= 90.0
		d.pressed.connect(func() -> void:
			var qs := Data.quiz_for_age(0).filter(func(q: Dictionary) -> bool: return int(q.get("epoka", 0)) <= GameState.age + 1)
			qs.shuffle()
			start_quiz(qs.slice(0, 3), "Dysputa uczona", "dysputa", b)
		)
		actions.add_child(d)
	if not b.queue.is_empty():
		var c := UITheme.make_button("Anuluj ostatnie", Vector2(130, 44))
		c.pressed.connect(func() -> void:
			b.cancel_last()
			_update_details()
		)
		actions.add_child(c)


func _try_age_up() -> void:
	var blocker := GameState.age_up_blocker()
	if blocker != "":
		show_message(blocker)
		return
	var qs := Data.quiz_for_age(GameState.age + 1)
	qs.shuffle()
	start_quiz(qs.slice(0, 3), "Egzamin epoki: %s" % GameState.age_name(GameState.age + 1), "age")
