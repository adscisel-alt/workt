shader_type canvas_item;
// Podmiana "koloru gracza": piksele w odcieniu magenty (materiał PlayerColor w Blenderze)
// są przebarwiane na kolor drużyny z zachowaniem jasności, jak w Age of Empires II.

uniform vec4 team_color : source_color = vec4(0.15, 0.35, 0.9, 1.0);
uniform float tolerance : hint_range(0.0, 1.0) = 0.25;

void fragment() {
	vec4 c = texture(TEXTURE, UV);
	float not_green = 1.0 - c.g;
	float score = (c.r > 0.25 && c.b > 0.25) ? min(c.r, c.b) * not_green : 0.0;
	float m = smoothstep(tolerance, tolerance + 0.2, score);
	float lum = max(c.r, c.b);
	vec3 shaded = team_color.rgb * lum;
	COLOR = vec4(mix(c.rgb, shaded, m), c.a);
}
