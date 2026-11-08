class_name Catalog
## Katalog obiektów świata: model, rozmiar na siatce, cena, dostępne czynności.
##
## Wymiary: footprint = (szerokość w X, głębokość w Z) w kafelkach przy obrocie 0.
## use_offset = kafelek (względem lewego-górnego rogu obiektu, przed obrotem),
## na którym staje Sim podczas używania. Ujemne/większe wartości = obok obiektu.
##
## Czynności (actions):
##   id, label – identyfikator i polska nazwa w menu
##   need      – która potrzeba rośnie ("glod", "energia", "higiena", "zabawa",
##               "towarzystwo", "komfort", "potrzeba", "edukacja")
##   rate      – przyrost potrzeby na godzinę gry
##   duration  – czas trwania w minutach gry (0 = aż potrzeba będzie pełna)
##   cost      – koszt w kopiejkach (ujemny = zarobek)
##   who       – "dorosly", "dziecko" lub "" (każdy)
##   kind      – "praca", "szkola", "zwykla"

const DEF := {
	"lozko": {
		"name": "Łóżko", "model": "lozko", "footprint": Vector2i(1, 2), "price": 300,
		"use_offset": Vector2i(1, 0), "category": "mieszkanie",
		"actions": [
			{"id": "spij", "label": "Śpij", "need": "energia", "rate": 34.0, "duration": 0, "side": {"komfort": 6.0}},
			{"id": "drzemka", "label": "Zdrzemnij się (1 h)", "need": "energia", "rate": 25.0, "duration": 60},
		],
	},
	"stol": {
		"name": "Stół", "model": "stol", "footprint": Vector2i(1, 2), "price": 120,
		"use_offset": Vector2i(1, 0), "category": "mieszkanie",
		"actions": [
			{"id": "czytaj_gazete", "label": "Czytaj „Dziennik Łódzki”", "need": "zabawa", "rate": 45.0, "duration": 45, "who": "dorosly", "side": {"edukacja": 2.0}},
			{"id": "odrabiaj", "label": "Odrabiaj lekcje", "need": "edukacja", "rate": 4.0, "duration": 60, "who": "dziecko", "side": {"zabawa": -5.0}},
		],
	},
	"krzeslo": {
		"name": "Krzesło", "model": "krzeslo", "footprint": Vector2i(1, 1), "price": 40,
		"use_offset": Vector2i(0, 0), "category": "mieszkanie",
		"actions": [
			{"id": "usiadz", "label": "Usiądź", "need": "komfort", "rate": 30.0, "duration": 30},
		],
	},
	"piec": {
		"name": "Kuchnia kaflowa", "model": "piec", "footprint": Vector2i(1, 1), "price": 800,
		"use_offset": Vector2i(0, 1), "category": "mieszkanie",
		"actions": [
			{"id": "ugotuj", "label": "Ugotuj i zjedz (1 porcja zapasów)", "need": "glod", "rate": 120.0, "duration": 35, "food": 1, "side": {"komfort": 5.0}},
			{"id": "ugotuj_rodzina", "label": "Ugotuj obiad dla wszystkich (4 porcje)", "need": "glod", "rate": 120.0, "duration": 50, "food": 4, "who": "dorosly", "family_meal": true},
		],
	},
	"kredens": {
		"name": "Kredens", "model": "kredens", "footprint": Vector2i(1, 1), "price": 250,
		"use_offset": Vector2i(0, 1), "category": "mieszkanie",
		"actions": [
			{"id": "chleb", "label": "Zjedz kromkę chleba", "need": "glod", "rate": 150.0, "duration": 10, "cost": 3},
		],
	},
	"balia": {
		"name": "Balia", "model": "balia", "footprint": Vector2i(1, 1), "price": 80,
		"use_offset": Vector2i(1, 0), "category": "mieszkanie",
		"actions": [
			{"id": "umyj", "label": "Umyj się", "need": "higiena", "rate": 180.0, "duration": 20, "side": {"komfort": -3.0}},
			{"id": "pranie", "label": "Zrób pranie", "need": "higiena", "rate": 40.0, "duration": 60, "who": "dorosly", "side": {"zabawa": -8.0}, "family_hygiene": 10.0},
		],
	},
	"lampa": {
		"name": "Lampa naftowa", "model": "lampa", "footprint": Vector2i(1, 1), "price": 100,
		"use_offset": Vector2i(0, 1), "category": "mieszkanie",
		"actions": [],
	},
	"polka_ksiazki": {
		"name": "Półka z książkami", "model": "polka_ksiazki", "footprint": Vector2i(1, 1), "price": 300,
		"use_offset": Vector2i(0, 1), "category": "mieszkanie",
		"actions": [
			{"id": "czytaj", "label": "Czytaj książkę", "need": "zabawa", "rate": 35.0, "duration": 60, "side": {"edukacja": 3.0}},
			{"id": "ucz_dziecko", "label": "Ucz dziecko czytać (po polsku)", "need": "", "rate": 0.0, "duration": 60, "who": "dorosly", "teach": true, "side": {"zabawa": 5.0}},
		],
	},
	"kolyska": {
		"name": "Kołyska", "model": "kolyska", "footprint": Vector2i(1, 1), "price": 100,
		"use_offset": Vector2i(1, 0), "category": "mieszkanie",
		"actions": [],
	},
	"studnia": {
		"name": "Studnia", "model": "studnia", "footprint": Vector2i(1, 1), "price": 0,
		"use_offset": Vector2i(1, 0), "category": "podworze",
		"actions": [
			{"id": "woda", "label": "Przynieś wodę i obmyj twarz", "need": "higiena", "rate": 90.0, "duration": 15},
		],
	},
	"wychodek": {
		"name": "Wychodek", "model": "wychodek", "footprint": Vector2i(1, 1), "price": 0,
		"use_offset": Vector2i(0, 1), "category": "podworze",
		"actions": [
			{"id": "wc", "label": "Skorzystaj", "need": "potrzeba", "rate": 600.0, "duration": 8},
		],
	},
	"drzewo": {
		"name": "Drzewo", "model": "drzewo", "footprint": Vector2i(1, 1), "price": 0,
		"use_offset": Vector2i(1, 0), "category": "podworze",
		"actions": [
			{"id": "zabawa_drzewo", "label": "Baw się w podchody", "need": "zabawa", "rate": 60.0, "duration": 45, "who": "dziecko", "side": {"higiena": -10.0, "energia": -5.0}},
			{"id": "spacer", "label": "Odetchnij świeżym powietrzem", "need": "zabawa", "rate": 30.0, "duration": 30, "side": {"komfort": 15.0}},
		],
	},
	"lawka_parkowa": {
		"name": "Ławka", "model": "lawka_parkowa", "footprint": Vector2i(1, 2), "price": 0,
		"use_offset": Vector2i(0, 0), "category": "podworze",
		"actions": [
			{"id": "lawka", "label": "Posiedź na ławce", "need": "komfort", "rate": 35.0, "duration": 40, "side": {"zabawa": 20.0}},
		],
	},
	"krosno": {
		"name": "Krosno mechaniczne", "model": "krosno", "footprint": Vector2i(2, 2), "price": 0,
		"use_offset": Vector2i(0, 2), "category": "fabryka",
		"actions": [
			{"id": "praca_tkacz", "label": "Tkaj (praca)", "need": "", "rate": 0.0, "duration": 0, "kind": "praca", "job": "tkacz"},
		],
	},
	"przedzarka": {
		"name": "Przędzarka", "model": "przedzarka", "footprint": Vector2i(1, 3), "price": 0,
		"use_offset": Vector2i(1, 1), "category": "fabryka",
		"actions": [
			{"id": "praca_przadka", "label": "Przędź (praca)", "need": "", "rate": 0.0, "duration": 0, "kind": "praca", "job": "przadka"},
		],
	},
	"wozek": {
		"name": "Wózek z belami", "model": "wozek", "footprint": Vector2i(1, 2), "price": 0,
		"use_offset": Vector2i(1, 1), "category": "fabryka",
		"actions": [
			{"id": "praca_szpulacz", "label": "Nosić szpule i bele (praca dziecka)", "need": "", "rate": 0.0, "duration": 0, "kind": "praca", "job": "szpulacz"},
		],
	},
	"maszyna_parowa": {
		"name": "Maszyna parowa", "model": "maszyna_parowa", "footprint": Vector2i(2, 3), "price": 0,
		"use_offset": Vector2i(2, 1), "category": "fabryka",
		"actions": [
			{"id": "ogladaj_maszyne", "label": "Przyjrzyj się maszynie", "need": "zabawa", "rate": 30.0, "duration": 15, "side": {"edukacja": 5.0}, "fact": "maszyna_parowa"},
		],
	},
	"komin": {"name": "Komin fabryczny", "model": "komin", "footprint": Vector2i(1, 1), "price": 0, "use_offset": Vector2i(1, 0), "category": "fabryka", "actions": []},
	"zegar_fabryczny": {"name": "Zegar fabryczny", "model": "zegar_fabryczny", "footprint": Vector2i(1, 1), "price": 0, "use_offset": Vector2i(0, 1), "category": "fabryka", "actions": []},
	"brama_fabryczna": {"name": "Brama fabryczna", "model": "brama_fabryczna", "footprint": Vector2i(1, 3), "price": 0, "use_offset": Vector2i(-1, 1), "category": "fabryka", "actions": [], "walkable": true},
	"lawka_szkolna": {
		"name": "Ławka szkolna", "model": "lawka_szkolna", "footprint": Vector2i(1, 1), "price": 0,
		"use_offset": Vector2i(0, 0), "category": "szkola",
		"actions": [
			{"id": "lekcja", "label": "Lekcja (szkoła)", "need": "edukacja", "rate": 2.0, "duration": 0, "kind": "szkola", "who": "dziecko", "side": {"zabawa": -4.0, "towarzystwo": 10.0}},
		],
	},
	"tablica": {"name": "Tablica", "model": "tablica", "footprint": Vector2i(2, 1), "price": 0, "use_offset": Vector2i(0, 1), "category": "szkola", "actions": []},
	"lada_sklepowa": {
		"name": "Lada sklepowa", "model": "lada_sklepowa", "footprint": Vector2i(1, 2), "price": 0,
		"use_offset": Vector2i(-1, 0), "category": "sklep",
		"actions": [
			{"id": "zakupy", "label": "Kup zapasy jedzenia (4 porcje – 24 kop.)", "need": "", "rate": 0.0, "duration": 15, "cost": 24, "food_buy": 4},
			{"id": "zakupy_duze", "label": "Zrób większe zakupy (10 porcji – 55 kop.)", "need": "", "rate": 0.0, "duration": 25, "cost": 55, "food_buy": 10},
			{"id": "elementarz", "label": "Kup elementarz dla dzieci (40 kop.)", "need": "", "rate": 0.0, "duration": 10, "cost": 40, "flag": "elementarz", "fact": "elementarz"},
		],
	},
	"latarnia": {"name": "Latarnia gazowa", "model": "latarnia", "footprint": Vector2i(1, 1), "price": 0, "use_offset": Vector2i(1, 0), "category": "ulica", "actions": []},
	"wiadro": {"name": "Wiadro", "model": "wiadro", "footprint": Vector2i(1, 1), "price": 15, "use_offset": Vector2i(1, 0), "category": "mieszkanie", "actions": [], "walkable": true},
}

## Obiekty, które można kupić w trybie „Kup” (kolejność w katalogu).
const BUYABLE := ["krzeslo", "stol", "lozko", "kredens", "balia", "lampa", "polka_ksiazki", "kolyska", "wiadro"]

## Prace: stawka godzinowa w kopiejkach i dozwolony czas pracy.
const JOBS := {
	"tkacz": {"name": "tkacz", "wage": 8, "start": 6, "end": 19, "break": 12, "max_hours": 13, "who": "dorosly"},
	"przadka": {"name": "prządka", "wage": 5, "start": 6, "end": 19, "break": 12, "max_hours": 13, "who": "dorosly"},
	"szpulacz": {"name": "szpulacz (pomocnik)", "wage": 2, "start": 6, "end": 15, "break": 12, "max_hours": 8, "who": "dziecko"},
}

const SCHOOL := {"start": 8, "end": 13, "fee_week": 20}

static func get_def(kind: String) -> Dictionary:
	return DEF.get(kind, {})

static func price_text(kop: int) -> String:
	if kop == 0:
		return "—"
	var rb := kop / 100
	var k := kop % 100
	if rb > 0 and k > 0:
		return "%d rb %02d kop." % [rb, k]
	elif rb > 0:
		return "%d rb" % rb
	return "%d kop." % k
