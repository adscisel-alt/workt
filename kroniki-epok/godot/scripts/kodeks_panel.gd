class_name KodeksPanel extends PanelContainer
## Kodeks: encyklopedia średniowiecza. Pierwsze przeczytanie wpisu daje +1 wiedzy.

signal closed

var list: ItemList
var title_l: Label
var content: RichTextLabel
var ids: Array = []


func _ready() -> void:
	add_theme_stylebox_override("panel", UITheme.panel_style(0.97))
	custom_minimum_size = Vector2(940, 560)
	set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	grow_horizontal = Control.GROW_DIRECTION_BOTH
	grow_vertical = Control.GROW_DIRECTION_BOTH
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 12)
	add_child(h)
	var left := VBoxContainer.new()
	h.add_child(left)
	left.add_child(UITheme.make_label("Kodeks średniowiecza", 18, true))
	list = ItemList.new()
	list.custom_minimum_size = Vector2(320, 480)
	list.item_selected.connect(_on_selected)
	left.add_child(list)
	var right := VBoxContainer.new()
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(right)
	title_l = UITheme.make_label("Wybierz wpis z listy", 18, true)
	right.add_child(title_l)
	content = RichTextLabel.new()
	content.bbcode_enabled = true
	content.fit_content = false
	content.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.custom_minimum_size = Vector2(560, 420)
	content.add_theme_font_size_override("normal_font_size", 15)
	right.add_child(content)
	var close := UITheme.make_button("Zamknij (K / Esc)", Vector2(180, 34))
	close.pressed.connect(func() -> void: closed.emit())
	right.add_child(close)
	visible = false


func refresh() -> void:
	list.clear()
	ids.clear()
	var cats := {}
	for e in Data.kodeks:
		if not GameState.is_fact_available(e):
			continue
		var cat: String = e.get("kategoria", "Inne")
		if not cats.has(cat):
			cats[cat] = []
		cats[cat].append(e)
	var keys := cats.keys()
	keys.sort()
	for cat in keys:
		list.add_item("— %s —" % cat, null, false)
		ids.append("")
		for e in cats[cat]:
			var read: bool = GameState.facts_read.has(e["id"])
			list.add_item(("  ✓ " if read else "  • ") + str(e.get("tytul", "")))
			ids.append(e["id"])
	var locked := Data.kodeks.size() - ids.filter(func(x: String) -> bool: return x != "").size()
	if locked > 0:
		list.add_item("(%d wpisów odblokujesz w kolejnych epokach lub budując budynki)" % locked, null, false)
		ids.append("")


func _on_selected(idx: int) -> void:
	if idx < 0 or idx >= ids.size() or ids[idx] == "":
		return
	var e := Data.kodeks_entry(ids[idx])
	title_l.text = str(e.get("tytul", ""))
	content.text = "[i]%s · %s[/i]\n\n%s" % [e.get("kategoria", ""), GameState.age_name(int(e.get("epoka", 0))), e.get("tresc", "")]
	if GameState.read_fact(e["id"]):
		GameState.message.emit("Nowa wiedza: „%s” (+1 pkt wiedzy)." % e.get("tytul", ""))
		list.set_item_text(idx, "  ✓ " + str(e.get("tytul", "")))
