class_name Hud
extends CanvasLayer
## Interfejs w stylu The Sims: panel dolny z portretami i paskami potrzeb,
## zegar i pieniądze, tryby „Żyj” / „Kup”, okna zdarzeń, kart wiedzy i quizu.

signal mode_requested(mode: String)
signal sim_selected(sim: Sim)
signal buy_kind_selected(kind: String)
signal walls_toggle_requested
signal restart_requested

const C_PANEL := Color(0.16, 0.12, 0.09, 0.93)
const C_PANEL_LIGHT := Color(0.26, 0.20, 0.15, 0.95)
const C_GOLD := Color(0.85, 0.70, 0.35)
const C_TEXT := Color(0.95, 0.92, 0.85)
const NEED_ORDER := ["glod", "energia", "higiena", "potrzeba", "zabawa", "towarzystwo", "komfort", "edukacja"]

var main: Node = null
var selected: Sim = null

var root: Control
var lbl_date: Label
var lbl_clock: Label
var lbl_money: Label
var lbl_food: Label
var msg_box: VBoxContainer
var speed_buttons: Array[Button] = []
var mode_buttons: Dictionary = {}
var portrait_buttons: Dictionary = {}
var need_bars: Dictionary = {}
var need_labels: Dictionary = {}
var lbl_sim_info: Label
var lbl_health: Label
var queue_box: VBoxContainer
var buy_panel: PanelContainer
var buy_list: ItemList
var lbl_buy_hint: Label
var action_menu: PopupMenu
var modal_layer: Control
var _action_target: Interactable = null
var _action_items: Array = []
var _talk_target: Sim = null
var _pending_events: Array = []
var _modal_open := false
var _ui_font_size := 15


func _ready() -> void:
	layer = 10
	_build()
	Game.money_changed.connect(func(_m): _refresh_top())
	Game.food_changed.connect(func(_f): _refresh_top())
	Game.message.connect(_on_message)
	Game.speed_changed.connect(func(_s): _refresh_speed())
	Game.event_requested.connect(_on_event)
	Game.quiz_requested.connect(_on_quiz)
	Game.game_over.connect(_on_game_over)
	Edu.fact_unlocked.connect(_on_fact_unlocked)
	_refresh_top()
	_refresh_speed()


func _process(_delta: float) -> void:
	lbl_clock.text = Game.clock_text()
	lbl_date.text = Game.date_text()
	if selected and is_instance_valid(selected):
		_refresh_needs()


# ---------------------------------------------------------------------------
# Budowa interfejsu
# ---------------------------------------------------------------------------
func _style(color: Color, radius: int = 8) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = color
	sb.corner_radius_top_left = radius
	sb.corner_radius_top_right = radius
	sb.corner_radius_bottom_left = radius
	sb.corner_radius_bottom_right = radius
	sb.content_margin_left = 10
	sb.content_margin_right = 10
	sb.content_margin_top = 8
	sb.content_margin_bottom = 8
	sb.border_width_bottom = 2
	sb.border_width_top = 2
	sb.border_width_left = 2
	sb.border_width_right = 2
	sb.border_color = Color(0.55, 0.42, 0.22, 0.9)
	return sb


func _panel(color: Color = C_PANEL) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", _style(color))
	return p


func _label(text: String, size: int = 15, color: Color = C_TEXT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


func _button(text: String, cb: Callable, size: int = 14) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_size_override("font_size", size)
	b.pressed.connect(func(): Game.ui_click.emit())
	b.pressed.connect(cb)
	b.focus_mode = Control.FOCUS_NONE
	return b


func _build() -> void:
	root = Control.new()
	root.name = "Root"
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	# --- lewy górny: data, zegar, pieniądze ---
	var top := _panel()
	top.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	top.position = Vector2(10, 10)
	var tv := VBoxContainer.new()
	top.add_child(tv)
	lbl_date = _label("", 14, C_GOLD)
	lbl_clock = _label("06:30", 30)
	lbl_money = _label("", 16)
	lbl_food = _label("", 13)
	tv.add_child(lbl_date)
	tv.add_child(lbl_clock)
	tv.add_child(lbl_money)
	tv.add_child(lbl_food)
	root.add_child(top)

	# --- komunikaty pod zegarem ---
	msg_box = VBoxContainer.new()
	msg_box.position = Vector2(10, 150)
	msg_box.custom_minimum_size = Vector2(420, 0)
	msg_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(msg_box)

	# --- prawy górny: przyciski ---
	var tr := HBoxContainer.new()
	tr.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	tr.position = Vector2(-10, 10)
	tr.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	tr.add_child(_button("Karty wiedzy", _show_knowledge))
	tr.add_child(_button("Słowniczek", _show_glossary))
	tr.add_child(_button("Ściany (H)", func(): walls_toggle_requested.emit()))
	tr.add_child(_button("Pomoc", _show_help))
	root.add_child(tr)

	# --- dolny panel ---
	var bottom := _panel()
	bottom.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	bottom.offset_top = -228
	bottom.offset_left = 10
	bottom.offset_right = -10
	bottom.offset_bottom = -10
	root.add_child(bottom)
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 16)
	bottom.add_child(hb)

	# prędkość + tryby
	var left := VBoxContainer.new()
	hb.add_child(left)
	left.add_child(_label("Czas", 12, C_GOLD))
	var sp := HBoxContainer.new()
	left.add_child(sp)
	for i in range(4):
		var txt: String = ["II", ">", ">>", ">>>"][i]
		var b := _button(txt, func(): Game.set_speed(i), 16)
		b.toggle_mode = true
		sp.add_child(b)
		speed_buttons.append(b)
	left.add_child(_label("Tryb", 12, C_GOLD))
	var mb := HBoxContainer.new()
	left.add_child(mb)
	for m in [["zyj", "Żyj"], ["kup", "Kup"]]:
		var b := _button(m[1], func(): mode_requested.emit(m[0]), 15)
		b.toggle_mode = true
		mb.add_child(b)
		mode_buttons[m[0]] = b
	mode_buttons["zyj"].button_pressed = true

	# portrety
	var pv := VBoxContainer.new()
	hb.add_child(pv)
	pv.add_child(_label("Rodzina Walczaków", 12, C_GOLD))
	var pg := GridContainer.new()
	pg.columns = 2
	pv.add_child(pg)
	for s in Game.family:
		var b := _button(s.sim_name, func(): sim_selected.emit(s), 14)
		b.toggle_mode = true
		b.custom_minimum_size = Vector2(110, 44)
		var sb := _style(s.portrait_color.darkened(0.35), 6)
		b.add_theme_stylebox_override("normal", sb)
		var sb2 := _style(s.portrait_color.lightened(0.15), 6)
		b.add_theme_stylebox_override("pressed", sb2)
		b.add_theme_stylebox_override("hover", _style(s.portrait_color, 6))
		pg.add_child(b)
		portrait_buttons[s.sim_id] = b
	lbl_sim_info = _label("", 11)
	lbl_sim_info.custom_minimum_size = Vector2(300, 0)
	lbl_sim_info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	pv.add_child(lbl_sim_info)

	# potrzeby
	var nv := VBoxContainer.new()
	hb.add_child(nv)
	nv.add_child(_label("Potrzeby", 12, C_GOLD))
	var ng := GridContainer.new()
	ng.columns = 4
	ng.add_theme_constant_override("h_separation", 14)
	nv.add_child(ng)
	for k in NEED_ORDER:
		var cell := VBoxContainer.new()
		var l := _label(Sim.NEED_NAMES[k], 12)
		var bar := ProgressBar.new()
		bar.min_value = 0
		bar.max_value = 100
		bar.show_percentage = false
		bar.custom_minimum_size = Vector2(120, 14)
		var fill := StyleBoxFlat.new()
		fill.bg_color = Color(0.3, 0.8, 0.3)
		bar.add_theme_stylebox_override("fill", fill)
		var bg := StyleBoxFlat.new()
		bg.bg_color = Color(0.05, 0.05, 0.05, 0.7)
		bar.add_theme_stylebox_override("background", bg)
		cell.add_child(l)
		cell.add_child(bar)
		ng.add_child(cell)
		need_bars[k] = bar
		need_labels[k] = l
	lbl_health = _label("", 13)
	nv.add_child(lbl_health)

	# kolejka zadań
	var qv := VBoxContainer.new()
	hb.add_child(qv)
	qv.add_child(_label("Kolejka czynności (kliknij, by anulować)", 12, C_GOLD))
	queue_box = VBoxContainer.new()
	qv.add_child(queue_box)

	# --- panel zakupów (prawa strona) ---
	buy_panel = _panel()
	buy_panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER_RIGHT)
	buy_panel.offset_left = -300
	buy_panel.offset_right = -10
	buy_panel.offset_top = -200
	buy_panel.offset_bottom = 200
	buy_panel.visible = false
	var bv := VBoxContainer.new()
	buy_panel.add_child(bv)
	bv.add_child(_label("Katalog mebli – izba w famule", 15, C_GOLD))
	buy_list = ItemList.new()
	buy_list.custom_minimum_size = Vector2(270, 260)
	buy_list.add_theme_font_size_override("font_size", 14)
	for k in Catalog.BUYABLE:
		var d := Catalog.get_def(k)
		buy_list.add_item("%s — %s" % [d["name"], Catalog.price_text(int(d["price"]))])
	buy_list.item_selected.connect(func(i): buy_kind_selected.emit(Catalog.BUYABLE[i]))
	bv.add_child(buy_list)
	lbl_buy_hint = _label("Wybierz mebel, ustaw na siatce w izbie i kliknij.\nR – obrót, Esc – anuluj.\nKliknij mebel w izbie, by sprzedać (50% ceny).", 12)
	lbl_buy_hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	bv.add_child(lbl_buy_hint)
	root.add_child(buy_panel)

	# --- menu czynności ---
	action_menu = PopupMenu.new()
	action_menu.add_theme_font_size_override("font_size", 15)
	action_menu.id_pressed.connect(_on_action_chosen)
	root.add_child(action_menu)

	# --- warstwa okien modalnych ---
	modal_layer = Control.new()
	modal_layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	modal_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(modal_layer)


# ---------------------------------------------------------------------------
# Odświeżanie
# ---------------------------------------------------------------------------
func _refresh_top() -> void:
	lbl_money.text = "Kasa: " + Game.money_text()
	lbl_food.text = "Zapasy jedzenia: %d porcji" % Game.food
	if Game.money < 0:
		lbl_money.add_theme_color_override("font_color", Color(1, 0.4, 0.4))
	else:
		lbl_money.add_theme_color_override("font_color", C_TEXT)


func _refresh_speed() -> void:
	for i in range(speed_buttons.size()):
		speed_buttons[i].button_pressed = (i == Game.speed)


func set_mode(mode: String) -> void:
	for k in mode_buttons.keys():
		mode_buttons[k].button_pressed = (k == mode)
	buy_panel.visible = mode == "kup"
	if mode != "kup":
		buy_list.deselect_all()


func set_selected(sim: Sim) -> void:
	if selected and is_instance_valid(selected):
		if selected.queue_changed.is_connected(_refresh_queue):
			selected.queue_changed.disconnect(_refresh_queue)
	selected = sim
	for k in portrait_buttons.keys():
		portrait_buttons[k].button_pressed = (sim != null and k == sim.sim_id)
	if sim:
		sim.queue_changed.connect(_refresh_queue)
	_refresh_queue()
	_refresh_needs()


func _refresh_needs() -> void:
	if selected == null:
		return
	for k in NEED_ORDER:
		var v: float = selected.needs.get(k, 0.0)
		var bar: ProgressBar = need_bars[k]
		bar.value = v
		var fill: StyleBoxFlat = bar.get_theme_stylebox("fill")
		if k == "edukacja":
			fill.bg_color = Color(0.4, 0.6, 0.95)
		elif v < 25.0:
			fill.bg_color = Color(0.85, 0.2, 0.15)
		elif v < 50.0:
			fill.bg_color = Color(0.9, 0.7, 0.2)
		else:
			fill.bg_color = Color(0.3, 0.8, 0.3)
	var info := "%s, %d lat" % [selected.sim_name, selected.age]
	if selected.job != "":
		var j: Dictionary = Catalog.JOBS[selected.job]
		info += " · %s (%d kop./h, %d:00–%d:00)" % [j["name"], j["wage"], j["start"], j["end"]]
	elif selected.enrolled:
		info += " · uczeń/uczennica szkoły elementarnej (8:00–13:00)"
	else:
		info += " · bez zajęcia"
	if selected.striking:
		info += " · STRAJKUJE"
	var tr := []
	for t in selected.traits:
		tr.append(Sim.TRAITS.get(t, {}).get("name", t))
	info += "\nNastrój: %s · Cechy: %s" % [selected.mood_text(), ", ".join(tr)]
	var wt := selected.wish_texts()
	info += "\nŻyczenia: " + (" · ".join(wt) if not wt.is_empty() else "—")
	var rel := []
	for s in Game.family:
		if s != selected:
			rel.append("%s %d" % [s.sim_name, int(selected.relation_with(s))])
	info += "\nRelacje: " + ", ".join(rel)
	lbl_sim_info.text = info
	var hc := Color(0.3, 0.9, 0.3) if selected.health > 50 else Color(1, 0.5, 0.3)
	lbl_health.text = "Zdrowie: %d%%%s · Zarobione w tym tygodniu: %s" % [
		int(selected.health), " (CHORY)" if selected.sick else "", Catalog.price_text(int(maxf(0.0, selected.wages_owed)))]
	lbl_health.add_theme_color_override("font_color", hc)


func _refresh_queue() -> void:
	for c in queue_box.get_children():
		c.queue_free()
	if selected == null or not is_instance_valid(selected):
		return
	var labels := selected.queue_labels()
	if labels.is_empty():
		queue_box.add_child(_label("(wolny – zajmie się sam sobą)", 12, Color(0.7, 0.7, 0.7)))
	for i in range(labels.size()):
		var b := _button(("> " if i == 0 else "- ") + labels[i], func(): selected.cancel_queue_item(i), 12)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		queue_box.add_child(b)


func _on_message(text: String, kind: String) -> void:
	if text.strip_edges() == "":
		return
	var col := C_TEXT
	match kind:
		"warn": col = Color(1.0, 0.65, 0.4)
		"money": col = Color(0.95, 0.85, 0.4)
	var p := _panel(Color(0.1, 0.08, 0.06, 0.8))
	var l := _label("%s  %s" % [Game.clock_text(), text], 13, col)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size = Vector2(400, 0)
	p.add_child(l)
	msg_box.add_child(p)
	while msg_box.get_child_count() > 6:
		msg_box.get_child(0).free()
	var tw := create_tween()
	tw.tween_interval(14.0)
	tw.tween_property(p, "modulate:a", 0.0, 1.5)
	tw.tween_callback(p.queue_free)


# ---------------------------------------------------------------------------
# Menu czynności przy obiekcie
# ---------------------------------------------------------------------------
func show_actions(obj: Interactable, sim: Sim, screen_pos: Vector2) -> void:
	action_menu.clear()
	_talk_target = null
	_action_target = obj
	_action_items = obj.actions_for(sim)
	action_menu.add_separator("%s – %s" % [obj.display_name(), sim.sim_name])
	if _action_items.is_empty():
		action_menu.add_item("(brak czynności dla %s)" % sim.sim_name, 999)
		action_menu.set_item_disabled(action_menu.get_item_index(999), true)
	for i in range(_action_items.size()):
		var a: Dictionary = _action_items[i]
		var txt: String = a["label"]
		if a.get("kind", "") == "praca":
			var j: Dictionary = Catalog.JOBS[a["job"]]
			txt += "  [%d kop./h]" % j["wage"]
			if sim.job != a["job"]:
				txt += "  (to nie jest stanowisko tego Sima)"
		action_menu.add_item(txt, i)
		if a.get("kind", "") == "praca" and sim.job != a["job"]:
			action_menu.set_item_disabled(action_menu.get_item_index(i), true)
	action_menu.position = Vector2i(screen_pos)
	action_menu.popup()


func _on_action_chosen(id: int) -> void:
	if id < 0 or id >= _action_items.size() or selected == null or _action_target == null:
		return
	var target: Sim = _talk_target
	_talk_target = null
	selected.enqueue(_action_target, _action_items[id], target)


func show_talk_menu(target: Sim, sim: Sim, screen_pos: Vector2) -> void:
	action_menu.clear()
	_action_target = main.world.social_anchor()
	_talk_target = target
	_action_items = [{"id": "rozmowa", "label": "Porozmawiaj z " + target.sim_name, "need": "towarzystwo", "rate": 90.0, "duration": 20}]
	action_menu.add_separator("%s → %s" % [sim.sim_name, target.sim_name])
	action_menu.add_item(_action_items[0]["label"], 0)
	action_menu.position = Vector2i(screen_pos)
	action_menu.popup()


# ---------------------------------------------------------------------------
# Okna modalne
# ---------------------------------------------------------------------------
func _modal(title: String, body: Control, buttons: Array, width: int = 640) -> PanelContainer:
	_modal_open = true
	var backdrop := ColorRect.new()
	backdrop.color = Color(0, 0, 0, 0.55)
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	modal_layer.add_child(backdrop)
	var panel := _panel(C_PANEL_LIGHT)
	panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	panel.custom_minimum_size = Vector2(width, 0)
	panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	backdrop.add_child(panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	panel.add_child(v)
	var t := _label(title, 22, C_GOLD)
	t.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(t)
	v.add_child(body)
	var hb := HBoxContainer.new()
	hb.alignment = BoxContainer.ALIGNMENT_END
	hb.add_theme_constant_override("separation", 10)
	v.add_child(hb)
	for b in buttons:
		var cb: Callable = b[1]
		var btn := _button(b[0], func():
			backdrop.queue_free()
			_modal_open = false
			cb.call()
			_next_pending()
		, 15)
		hb.add_child(btn)
	return panel


func _text_block(text: String, size: int = 15) -> RichTextLabel:
	var r := RichTextLabel.new()
	r.bbcode_enabled = true
	r.fit_content = true
	r.scroll_active = false
	r.custom_minimum_size = Vector2(600, 0)
	r.add_theme_font_size_override("normal_font_size", size)
	r.add_theme_font_size_override("bold_font_size", size)
	r.add_theme_color_override("default_color", C_TEXT)
	r.text = text
	return r


func _fact_card(fact_id: String) -> Control:
	var f := Edu.get_fact(fact_id)
	if f.is_empty():
		return Control.new()
	var p := _panel(Color(0.22, 0.26, 0.20, 0.95))
	var v := VBoxContainer.new()
	p.add_child(v)
	v.add_child(_label("Karta wiedzy: " + f["title"], 15, Color(0.75, 0.9, 0.7)))
	v.add_child(_text_block(f["text"], 14))
	return p


func _next_pending() -> void:
	if _pending_events.is_empty() or _modal_open:
		return
	var ev: Dictionary = _pending_events.pop_front()
	_open_event(ev)


func _on_event(ev: Dictionary) -> void:
	if _modal_open:
		_pending_events.append(ev)
		return
	_open_event(ev)


func _open_event(ev: Dictionary) -> void:
	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 10)
	var text: String = ev.get("text", "")
	if ev.get("dynamic", "") == "raport":
		text = _weekly_report_text()
	body.add_child(_text_block(text))
	var fact_id := String(ev.get("fact", ""))
	if fact_id != "":
		Edu.unlock(fact_id)
		body.add_child(_fact_card(fact_id))
	var buttons := []
	for ch in ev.get("choices", []):
		var choice: Dictionary = ch
		buttons.append([choice["label"], func(): Game.resolve_event(ev, choice)])
	if buttons.is_empty():
		buttons.append(["Dalej", func(): Game.resolve_event(ev, {})])
	_modal(ev.get("title", "Zdarzenie"), body, buttons)


func _weekly_report_text() -> String:
	var s := Game.week_summary()
	var lines := "[b]Tydzień %d z 5[/b]\n\n" % [int((Game.day - 1) / 7)]
	lines += "Zarobki rodziny: %s\nWydatki: %s\nStan kasy: %s\nZapasy jedzenia: %d porcji\n\n" % [
		Catalog.price_text(int(s["wages"])), Catalog.price_text(int(s["spent"])), Game.money_text(), Game.food]
	for sim in Game.family:
		lines += "• %s – zdrowie %d%%" % [sim.sim_name, int(sim.health)]
		if not sim.is_adult():
			lines += ", edukacja %d%%" % int(sim.needs["edukacja"])
		if sim.job != "":
			lines += ", pracuje jako %s" % Catalog.JOBS[sim.job]["name"]
		elif sim.enrolled:
			lines += ", chodzi do szkoły"
		lines += "\n"
	lines += "\nW poniedziałek rano zapłacisz czynsz (%s) i składkę szkolną (%s za dziecko)." % [
		Catalog.price_text(Game.RENT_WEEK), Catalog.price_text(Catalog.SCHOOL["fee_week"])]
	lines += "\n\n" + Edu.progress_text()
	return lines


func _on_fact_unlocked(id: String, fact: Dictionary) -> void:
	# karty odkryte przez zdarzenie są pokazywane w jego oknie; pozostałe jako powiadomienie
	if _modal_open:
		return
	Game.say("Nowa karta wiedzy: „%s” (przycisk Karty wiedzy)." % fact["title"], "info")


func _on_quiz(sim: Sim) -> void:
	var q := Edu.next_question()
	if q.is_empty():
		Game.resume()
		return
	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 8)
	body.add_child(_text_block("Nauczyciel pyta %s:\n\n[b]%s[/b]" % [sim.sim_name, q["q"]]))
	var result := _label("", 14)
	result.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var answered := [false]
	var panel_ref: Array = []
	var abox := VBoxContainer.new()
	body.add_child(abox)
	body.add_child(result)
	for i in range(q["a"].size()):
		var btn := _button("%s) %s" % [["A", "B", "C", "D"][i], q["a"][i]], func():
			if answered[0]:
				return
			answered[0] = true
			var ok := Edu.answer(q, i)
			if ok:
				sim.needs["edukacja"] = clampf(sim.needs["edukacja"] + 4.0, 0.0, 100.0)
				result.text = "Dobrze! %s zapamięta to na długo (edukacja +4)." % sim.sim_name
				result.add_theme_color_override("font_color", Color(0.5, 1.0, 0.5))
			else:
				result.text = "Niestety. Poprawna odpowiedź: %s" % q["a"][int(q["correct"])]
				result.add_theme_color_override("font_color", Color(1.0, 0.6, 0.5))
			if panel_ref.size() > 0:
				var card := _fact_card(String(q.get("fact", "")))
				panel_ref[0].add_child(card)
		, 15)
		btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
		abox.add_child(btn)
	panel_ref.append(body)
	_modal("Lekcja w szkole – pytanie", body, [["Zamknij", func(): Game.resume()]])


func show_intro() -> void:
	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 10)
	body.add_child(_text_block(
		"Jest poniedziałek, 4 kwietnia 1892 roku. Rodzina Walczaków – Józef, Marianna, dwunastoletni Antek i dziewięcioletnia Zosia – " +
		"przyjechała ze wsi do Łodzi i wynajęła izbę w famule przy fabryce bawełny. Józef od jutra tka na krośnie, Marianna staje przy przędzarce. " +
		"Dzieci na razie chodzą do szkoły elementarnej – ale majster już pyta, czy nie przydałyby się w hali...\n\n" +
		"[b]Twoje zadanie:[/b] przez 5 tygodni dbaj o potrzeby rodziny, zarabiaj na czynsz i jedzenie, a przy tym decyduj, czy dzieci będą się uczyć, czy pracować. " +
		"Każda decyzja odsłania kartę wiedzy o życiu w XIX-wiecznej fabryce.\n\n" +
		"Kliknij Sima, by go wybrać, potem kliknij przedmiot, by zlecić czynność. Simowie sami zadbają o siebie, gdy nic im nie zlecisz. " +
		"Spacja – pauza, 1/2/3 – prędkość, prawy przycisk myszy lub Q/E – obrót kamery, kółko – zoom, H – ściany. W niedzielę rodzina idzie do kościoła, na targu rano kupisz taniej, a szynk kusi wieczorami."))
	Edu.unlock("lodz_1892")
	Edu.unlock("famula")
	body.add_child(_fact_card("lodz_1892"))
	Game.paused_by_event = true
	_modal("Fabryka 1892 – Rodzina Walczaków", body, [["Zaczynamy", func(): Game.resume()]], 720)


func _show_help() -> void:
	var body := _text_block(
		"[b]Sterowanie[/b]\n" +
		"• Kliknij Sima (lub jego portret), by go wybrać. Kliknij przedmiot – wybierz czynność z menu.\n" +
		"• Kliknij innego Sima, mając wybranego – zlecisz rozmowę.\n" +
		"• Spacja – pauza · 1 / 2 / 3 – prędkość · prawy przycisk myszy lub Q / E – obrót i pochylenie kamery · kółko lub +/− – zoom · WSAD / strzałki / środkowy przycisk – przesuwanie.\n" +
		"• H – podnoszenie/opuszczanie ścian.\n" +
		"• Tryb „Kup”: wybierz mebel z katalogu, ustaw w izbie (R – obrót) i kliknij. Kliknięcie mebla w izbie – sprzedaż za 50%.\n\n" +
		"[b]Zasady[/b]\n" +
		"• Fabryka pracuje od 6:00 do 19:00 (dzieci do 15:00) z przerwą 12:00–13:00; wypłata w sobotę o 19:00; spóźnienie = kara 10 kop.\n" +
		"• Szkoła 8:00–13:00 (bez niedziel), składka 20 kop./tydzień za dziecko; podczas lekcji nauczyciel zadaje pytania – Ty odpowiadasz.\n" +
		"• W poniedziałek rano płacisz czynsz 1 rb 50 kop. Dwukrotny brak czynszu = eksmisja.\n" +
		"• Gotowanie zużywa porcje zapasów – kupuj je w sklepie po drugiej stronie podwórza.\n" +
		"• Zdrowie spada przy głodzie, brudzie, braku snu i pracy w pyle; chory Sim nie pracuje.\n" +
		"• Każdy Sim ma dwie cechy charakteru (np. Pracowity, Książkowa) i dwa życzenia; spełnione życzenie poprawia nastrój i daje punkty. Nastrój (kolor plumboba) wpływa na zarobek.\n" +
		"• W niedzielę rodzina zakłada odświętne ubrania i idzie do kościoła.\n" +
		"• Gra kończy się po 5 tygodniach raportem: pieniądze, zdrowie, edukacja dzieci, odkryte karty wiedzy.")
	_modal("Pomoc", body, [["Zamknij", func(): pass]], 760)


func _show_knowledge() -> void:
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(700, 460)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(v)
	v.add_child(_label(Edu.progress_text(), 13, Color(0.75, 0.9, 0.7)))
	for id in Edu.facts.keys():
		var f: Dictionary = Edu.facts[id]
		if Edu.is_unlocked(id):
			v.add_child(_fact_card(id))
		else:
			var p := _panel(Color(0.12, 0.12, 0.12, 0.8))
			p.add_child(_label("[zamknięte] %s – odkryj przez decyzje, pracę, szkołę lub quiz" % f["title"], 13, Color(0.6, 0.6, 0.6)))
			v.add_child(p)
	_modal("Karty wiedzy – życie w XIX-wiecznej Łodzi", scroll, [["Zamknij", func(): pass]], 760)


func _show_glossary() -> void:
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(700, 460)
	var v := VBoxContainer.new()
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(v)
	var txt := ""
	for g in Edu.glossary:
		txt += "[b]%s[/b] – %s\n\n" % [g["term"], g["def"]]
	v.add_child(_text_block(txt, 14))
	_modal("Słowniczek", scroll, [["Zamknij", func(): pass]], 760)


func _on_game_over(report: Dictionary) -> void:
	var body := VBoxContainer.new()
	var ocena := "Rodzina przetrwała, choć z trudem."
	if report["score"] > 260:
		ocena = "Znakomicie! Walczakowie wyszli na prostą, a dzieci mają szansę na lepsze życie."
	elif report["score"] > 180:
		ocena = "Dobrze. Rodzina związała koniec z końcem i czegoś się nauczyła."
	elif report["score"] < 80:
		ocena = "Ciężki los. Tak wyglądała codzienność wielu łódzkich rodzin robotniczych."
	var txt := "[b]%s[/b]\n\nDni: %d · Kasa: %s · Zarobki łącznie: %s · Kary: %s\n" % [
		ocena, report["days"], Game.money_text(), Catalog.price_text(int(report["wages"])), Catalog.price_text(int(report["fines"]))]
	txt += "Średnie zdrowie rodziny: %d%% · Edukacja dzieci: %d%%\n" % [int(report["health"]), int(report["edu"])]
	txt += "Odkryte karty wiedzy: %d / %d · Quiz: %d poprawnych · Spełnione życzenia: %d (+%d pkt) · Nastrój rodziny: %d%%\n\n[b]Wynik: %d punktów[/b]\n\n" % [
		report["facts"], Edu.facts.size(), report["quiz"], report["wishes"], report["wish_points"], int(report["mood"]), report["score"]]
	txt += "[i]W 1897 r. nowe prawo skróciło dzień pracy do 11,5 godziny, a w 1905 r. łódzcy robotnicy znów wyszli na ulice. " + \
		"Dzieci z fabryk, które nauczyły się czytać, często jako pierwsze w rodzinie zdobywały zawód poza halą.[/i]"
	body.add_child(_text_block(txt))
	_modal("Koniec gry – maj 1892", body, [["Zagraj jeszcze raz", func(): restart_requested.emit()]], 720)
