class_name QuizPanel extends PanelContainer
## Okno quizu („Egzamin epoki”, „Dysputa”) oraz okno wyboru dla wydarzeń historycznych.

signal finished(correct: int, total: int)
signal chosen(index: int)

var title_l: Label
var text_l: Label
var answers_box: VBoxContainer
var explain_l: Label
var next_b: Button
var progress_l: Label

var questions: Array = []
var q_index := 0
var correct := 0
var mode := "quiz"
var answered := false


func _ready() -> void:
	add_theme_stylebox_override("panel", UITheme.panel_style(0.97))
	custom_minimum_size = Vector2(680, 0)
	set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	grow_horizontal = Control.GROW_DIRECTION_BOTH
	grow_vertical = Control.GROW_DIRECTION_BOTH
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	add_child(v)
	title_l = UITheme.make_label("", 20, true)
	v.add_child(title_l)
	progress_l = UITheme.make_label("", 12)
	v.add_child(progress_l)
	text_l = UITheme.make_label("", 15)
	text_l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	text_l.custom_minimum_size = Vector2(640, 0)
	v.add_child(text_l)
	answers_box = VBoxContainer.new()
	answers_box.add_theme_constant_override("separation", 6)
	v.add_child(answers_box)
	explain_l = UITheme.make_label("", 13)
	explain_l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	explain_l.custom_minimum_size = Vector2(640, 0)
	explain_l.visible = false
	v.add_child(explain_l)
	next_b = UITheme.make_button("Dalej", Vector2(140, 36))
	next_b.pressed.connect(_on_next)
	next_b.visible = false
	v.add_child(next_b)
	visible = false


func start_quiz(qs: Array, title: String) -> void:
	mode = "quiz"
	questions = qs
	q_index = 0
	correct = 0
	title_l.text = title
	visible = true
	_show_question()


func _show_question() -> void:
	answered = false
	explain_l.visible = false
	next_b.visible = false
	for c in answers_box.get_children():
		c.queue_free()
	if q_index >= questions.size():
		_finish()
		return
	var q: Dictionary = questions[q_index]
	progress_l.text = "Pytanie %d z %d" % [q_index + 1, questions.size()]
	text_l.text = q.get("pytanie", "")
	var opts: Array = q.get("odpowiedzi", [])
	var order: Array = range(opts.size())
	order.shuffle()
	for i in order:
		var b := UITheme.make_button(str(opts[i]), Vector2(640, 36))
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		b.pressed.connect(_on_answer.bind(i, b))
		answers_box.add_child(b)


func _on_answer(i: int, btn: Button) -> void:
	if answered:
		return
	answered = true
	var q: Dictionary = questions[q_index]
	var ok := i == int(q.get("poprawna", 0))
	if ok:
		correct += 1
	for b in answers_box.get_children():
		b.disabled = true
	btn.add_theme_color_override("font_disabled_color", Color(0.3, 0.95, 0.4) if ok else Color(0.95, 0.35, 0.3))
	explain_l.text = ("Dobrze! " if ok else "Niestety nie. ") + str(q.get("wyjasnienie", ""))
	explain_l.visible = true
	next_b.text = "Dalej" if q_index + 1 < questions.size() else "Zakończ"
	next_b.visible = true


func _on_next() -> void:
	if mode == "quiz":
		q_index += 1
		_show_question()
	else:
		visible = false
		chosen.emit(-1)


func _finish() -> void:
	visible = false
	finished.emit(correct, questions.size())


## Okno wyboru (wydarzenie historyczne). choices: [{"tekst":..., "enabled": bool}]
func start_choice(title: String, text: String, choices: Array) -> void:
	mode = "choice"
	title_l.text = title
	progress_l.text = "Wydarzenie historyczne"
	text_l.text = text
	explain_l.visible = false
	next_b.visible = false
	for c in answers_box.get_children():
		c.queue_free()
	for i in choices.size():
		var ch: Dictionary = choices[i]
		var b := UITheme.make_button(str(ch.get("tekst", "")), Vector2(640, 36))
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.disabled = not bool(ch.get("enabled", true))
		b.pressed.connect(func() -> void:
			visible = false
			chosen.emit(i)
		)
		answers_box.add_child(b)
	visible = true
