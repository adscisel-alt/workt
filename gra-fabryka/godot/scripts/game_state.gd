extends Node
## Autoload „Game” – stan rozgrywki: czas, pieniądze, zapasy, rodzina, zdarzenia.

signal tick(minutes: int)
signal hour_changed(hour: int)
signal day_changed(day: int)
signal money_changed(kop: int)
signal food_changed(porcje: int)
signal message(text: String, kind: String)
signal speed_changed(speed: int)
signal event_requested(event: Dictionary)
signal game_over(report: Dictionary)
signal quiz_requested(sim: Node)
signal ui_click

const START_YEAR := 1892
const START_MONTH := 4
const START_DAY_OF_MONTH := 4   ## poniedziałek 4 kwietnia 1892
const DAYS_TOTAL := 35          ## 5 tygodni rozgrywki
const RENT_WEEK := 150          ## czynsz za izbę w famule, kop./tydzień

const DNI := ["poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota", "niedziela"]
const MIESIACE := ["", "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca",
	"sierpnia", "września", "października", "listopada", "grudnia"]

## Prędkość: 0 = pauza, 1..3 jak w The Sims.
const MINUTES_PER_SECOND := [0.0, 1.0, 3.0, 10.0]

var speed: int = 1
var paused_by_event: bool = false

var day: int = 1           ## dzień rozgrywki 1..35
var minute_of_day: float = 6.0 * 60.0 + 30.0  ## start 6:30 w poniedziałek (dzień wolny – aklimatyzacja)
var total_minutes: float = 0.0

var money: int = 420       ## kopiejki: 4 rb 20 kop. oszczędności
var food: int = 5          ## porcje jedzenia w domu
var flags: Dictionary = {} ## zdarzenia / decyzje gracza
var family: Array = []     ## węzły Sim
var messages: Array = []
var fines_total: int = 0
var wages_total: int = 0
var inspector_cooldown: int = 0
var wishes_done: int = 0
var wish_points: int = 0
var strike_active: bool = false

var _last_hour: int = -1
var _week_summary: Dictionary = {"wages": 0, "spent": 0}
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	_rng.randomize()
	process_mode = Node.PROCESS_MODE_ALWAYS


func _process(delta: float) -> void:
	if paused_by_event or speed == 0:
		return
	var mins: float = delta * MINUTES_PER_SECOND[speed]
	# nie pozwól przeskoczyć więcej niż 10 minut gry w jednej klatce
	mins = minf(mins, 10.0)
	_advance(mins)


func _advance(mins: float) -> void:
	minute_of_day += mins
	total_minutes += mins
	tick.emit(int(ceil(mins)))
	var h := int(minute_of_day / 60.0) % 24
	if minute_of_day >= 24.0 * 60.0:
		minute_of_day -= 24.0 * 60.0
		day += 1
		_last_hour = -1
		_on_new_day()
		h = int(minute_of_day / 60.0)
	if h != _last_hour:
		_last_hour = h
		hour_changed.emit(h)
		_on_hour(h)


# ---------------------------------------------------------------------------
# Czas i kalendarz
# ---------------------------------------------------------------------------
func hour() -> int:
	return int(minute_of_day / 60.0) % 24


func minute() -> int:
	return int(minute_of_day) % 60


func hour_f() -> float:
	return minute_of_day / 60.0


func weekday() -> int:
	## 0 = poniedziałek (dzień 1 to poniedziałek)
	return (day - 1) % 7


func is_sunday() -> bool:
	return weekday() == 6


func is_saturday() -> bool:
	return weekday() == 5


func date_text() -> String:
	var dom := START_DAY_OF_MONTH + day - 1
	var month := START_MONTH
	if dom > 30:  # kwiecień ma 30 dni
		dom -= 30
		month += 1
	return "%s, %d %s %d" % [DNI[weekday()], dom, MIESIACE[month], START_YEAR]


func clock_text() -> String:
	return "%02d:%02d" % [hour(), minute()]


func set_speed(s: int) -> void:
	speed = clampi(s, 0, 3)
	speed_changed.emit(speed)


func toggle_pause() -> void:
	if speed == 0:
		set_speed(max(1, flags.get("_last_speed", 1)))
	else:
		flags["_last_speed"] = speed
		set_speed(0)


# ---------------------------------------------------------------------------
# Pieniądze i zapasy
# ---------------------------------------------------------------------------
func money_text() -> String:
	var sign := "" if money >= 0 else "−"
	var m := absi(money)
	return "%s%d rb %02d kop." % [sign, m / 100, m % 100]


func can_afford(kop: int) -> bool:
	return money >= kop


func spend(kop: int, why: String = "") -> bool:
	if kop > 0 and money < kop:
		say("Za mało pieniędzy (%s)." % why, "warn")
		return false
	money -= kop
	if kop > 0:
		_week_summary["spent"] += kop
	money_changed.emit(money)
	return true


func earn(kop: int, why: String = "") -> void:
	money += kop
	wages_total += kop
	_week_summary["wages"] += kop
	money_changed.emit(money)


func add_food(n: int) -> void:
	food = max(0, food + n)
	food_changed.emit(food)


func take_food(n: int) -> bool:
	if food < n:
		return false
	food -= n
	food_changed.emit(food)
	return true


func say(text: String, kind: String = "info") -> void:
	messages.append({"t": clock_text(), "text": text, "kind": kind})
	if messages.size() > 60:
		messages.pop_front()
	message.emit(text, kind)


# ---------------------------------------------------------------------------
# Rodzina
# ---------------------------------------------------------------------------
func register_sim(sim: Node) -> void:
	if sim not in family:
		family.append(sim)


func sim_by_id(id: String) -> Node:
	for s in family:
		if s.sim_id == id:
			return s
	return null


func adults() -> Array:
	return family.filter(func(s): return s.is_adult())


func children() -> Array:
	return family.filter(func(s): return not s.is_adult())


# ---------------------------------------------------------------------------
# Zdarzenia dnia / godziny
# ---------------------------------------------------------------------------
func _on_new_day() -> void:
	day_changed.emit(day)
	if inspector_cooldown > 0:
		inspector_cooldown -= 1
	if day > DAYS_TOTAL:
		_finish_game()
		return
	# czynsz i czesne – w poniedziałek rano
	if weekday() == 0 and day > 1:
		_pay_rent()
	# zdarzenia fabularne
	match day:
		2:
			request_event("praca_antka")
		4:
			request_event("praca_zosi")
		9:
			request_event("kary_fabryczne")
		11:
			request_event("szynk_zaproszenie")
		13:
			request_event("choroba")
		18:
			request_event("tajne_nauczanie")
		23:
			request_event("inspektor_zapowiedz")
		29:
			request_event("strajk")
	if day == 29:
		strike_active = true
	if day == 32 and strike_active:
		strike_active = false
		say("Fabryka wznowiła pracę po buncie. Majster patrzy podejrzliwie na każdego robotnika.", "info")
	# losowe: wizyta inspektora fabrycznego, jeśli dziecko pracuje nielegalnie
	if flags.get("zosia_pracuje", false) and inspector_cooldown == 0 and _rng.randf() < 0.3 and day > 5:
		inspector_cooldown = 5
		request_event("inspektor")
	# raport tygodniowy w niedzielę
	if is_sunday() and day > 1:
		request_event("raport_tygodnia")


func _on_hour(h: int) -> void:
	# wypłata w sobotę o 19:00
	if h == 19 and is_saturday() and not strike_active:
		for s in family:
			var owed: int = s.collect_wages()
			if owed > 0:
				earn(owed, s.sim_name)
				say("%s przyniósł(a) tygodniówkę: %s." % [s.sim_name, Catalog.price_text(owed)], "money")
		if day > 3:
			request_event("wyplata")
	# ostrzeżenia
	if h == 20 and food <= 1:
		say("Zapasy jedzenia się kończą – ktoś powinien iść do sklepu.", "warn")


func _pay_rent() -> void:
	var rent := RENT_WEEK
	var fee := 0
	for c in children():
		if c.enrolled:
			fee += Catalog.SCHOOL["fee_week"]
	var total := rent + fee
	if money >= total:
		spend(total, "czynsz i szkoła")
		say("Zapłacono czynsz za izbę (%s) i składkę szkolną (%s)." % [Catalog.price_text(rent), Catalog.price_text(fee)], "money")
	else:
		money -= total
		money_changed.emit(money)
		flags["dlug"] = flags.get("dlug", 0) + 1
		say("Nie starczyło na czynsz! Gospodarz famuły zapisał dług. Drugi raz – eksmisja.", "warn")
		if flags["dlug"] >= 2:
			request_event("eksmisja")


func request_event(id: String) -> void:
	var ev: Dictionary = Edu.get_event(id)
	if ev.is_empty():
		return
	if ev.get("once", true) and flags.get("ev_" + id, false):
		return
	flags["ev_" + id] = true
	paused_by_event = true
	event_requested.emit(ev)


func request_quiz(sim: Node) -> void:
	if paused_by_event:
		return
	paused_by_event = true
	quiz_requested.emit(sim)


func resume() -> void:
	paused_by_event = false


func resolve_event(ev: Dictionary, choice: Dictionary) -> void:
	paused_by_event = false
	for k in choice.get("set", {}).keys():
		flags[k] = choice["set"][k]
	if choice.has("money"):
		money += int(choice["money"])
		money_changed.emit(money)
	if choice.has("food"):
		add_food(int(choice["food"]))
	if choice.has("apply"):
		_apply_choice_effect(String(choice["apply"]))
	if choice.has("say"):
		say(String(choice["say"]), "info")


func _apply_choice_effect(effect: String) -> void:
	match effect:
		"antek_praca":
			var a = sim_by_id("antek")
			if a:
				a.job = "szpulacz"
				a.enrolled = false
				flags["antek_pracuje"] = true
		"antek_szkola":
			var a = sim_by_id("antek")
			if a:
				a.job = ""
				a.enrolled = true
				flags["antek_pracuje"] = false
		"zosia_praca":
			var z = sim_by_id("zosia")
			if z:
				z.job = "szpulacz"
				z.enrolled = false
				flags["zosia_pracuje"] = true
		"zosia_szkola":
			var z = sim_by_id("zosia")
			if z:
				z.job = ""
				z.enrolled = true
				flags["zosia_pracuje"] = false
		"zosia_zwolniona":
			var z = sim_by_id("zosia")
			if z:
				z.job = ""
				z.enrolled = true
				flags["zosia_pracuje"] = false
		"lekarz":
			for s in family:
				s.health = minf(100.0, s.health + 35.0)
				s.sick = false
		"strajk_udzial":
			for s in adults():
				s.striking = true
		"strajk_praca":
			for s in adults():
				s.striking = false
		"eksmisja":
			_finish_game()
		"szynk_wieczor":
			var j = sim_by_id("jozef")
			if j:
				j.needs["zabawa"] = minf(100.0, j.needs["zabawa"] + 30.0)
				j.needs["towarzystwo"] = minf(100.0, j.needs["towarzystwo"] + 20.0)
				j.health = maxf(0.0, j.health - 3.0)
			Edu.unlock("szynk")
		"tajne_nauczanie":
			for c in children():
				c.needs["edukacja"] = minf(100.0, c.needs["edukacja"] + 10.0)


# ---------------------------------------------------------------------------
# Koniec gry i ocena
# ---------------------------------------------------------------------------
func week_summary() -> Dictionary:
	var s := _week_summary.duplicate()
	_week_summary = {"wages": 0, "spent": 0}
	return s


func _finish_game() -> void:
	paused_by_event = true
	var report := build_report()
	game_over.emit(report)


func build_report() -> Dictionary:
	var edu_sum := 0.0
	var health_sum := 0.0
	for s in family:
		health_sum += s.health
	var kids := children()
	for c in kids:
		edu_sum += c.needs["edukacja"]
	var edu_avg := edu_sum / maxf(1.0, kids.size())
	var health_avg := health_sum / maxf(1.0, family.size())
	var facts := Edu.unlocked.size()
	var mood_sum := 0.0
	for s in family:
		mood_sum += s.mood()
	var mood_avg := mood_sum / maxf(1.0, family.size())
	var score := int(clampf(money / 10.0, -50, 200) + edu_avg * 1.5 + health_avg + facts * 5 + Edu.quiz_correct * 4 + wish_points / 4 + mood_avg * 0.5)
	return {
		"money": money, "edu": edu_avg, "health": health_avg, "facts": facts,
		"quiz": Edu.quiz_correct, "wages": wages_total, "fines": fines_total, "score": score,
		"wishes": wishes_done, "wish_points": wish_points, "mood": mood_avg,
		"days": min(day, DAYS_TOTAL + 1) - 1,
	}
