class_name UITheme
## Wspólne style interfejsu (ciemne drewno + złote obramowanie, jak panele AoE2).

static func panel_style(alpha := 0.94) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = Color(0.17, 0.12, 0.08, alpha)
	s.border_color = Color(0.72, 0.56, 0.28)
	s.set_border_width_all(2)
	s.set_corner_radius_all(4)
	s.set_content_margin_all(10)
	return s


static func make_panel(alpha := 0.94) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", panel_style(alpha))
	return p


static func make_label(text := "", size := 14, bold := false) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", Color(0.96, 0.92, 0.82))
	if bold:
		l.add_theme_color_override("font_color", Color(1.0, 0.88, 0.55))
	return l


static func make_button(text: String, min_size := Vector2(150, 34)) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = min_size
	b.add_theme_font_size_override("font_size", 13)
	return b
