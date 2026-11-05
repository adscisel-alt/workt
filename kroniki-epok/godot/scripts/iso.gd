class_name Iso
## Matematyka rzutu dimetrycznego 2:1 (jak w Age of Empires II): kafelek 64x32 px.
## Siatka: (gx, gy). Oś gx biegnie w prawo-dół ekranu, oś gy w lewo-dół.

const TILE_W := 64
const TILE_H := 32

static func to_world(g: Vector2) -> Vector2:
	return Vector2((g.x - g.y) * TILE_W * 0.5, (g.x + g.y) * TILE_H * 0.5)

static func to_grid(w: Vector2) -> Vector2:
	var gx := (w.x / (TILE_W * 0.5) + w.y / (TILE_H * 0.5)) * 0.5
	var gy := (w.y / (TILE_H * 0.5) - w.x / (TILE_W * 0.5)) * 0.5
	return Vector2(gx, gy)

static func to_cell(w: Vector2) -> Vector2i:
	var g := to_grid(w)
	return Vector2i(floori(g.x), floori(g.y))

static func cell_center(c: Vector2i) -> Vector2:
	return to_world(Vector2(c) + Vector2(0.5, 0.5))

## Romb kafelka (4 wierzchołki) dla komórki c, w układzie świata.
static func cell_polygon(c: Vector2i) -> PackedVector2Array:
	var o := Vector2(c)
	return PackedVector2Array([
		to_world(o), to_world(o + Vector2(1, 0)),
		to_world(o + Vector2(1, 1)), to_world(o + Vector2(0, 1)),
	])

## Romb obrysu prostokąta komórek (origin, size), w układzie świata.
static func rect_polygon(origin: Vector2i, size: Vector2i) -> PackedVector2Array:
	var o := Vector2(origin)
	var s := Vector2(size)
	return PackedVector2Array([
		to_world(o), to_world(o + Vector2(s.x, 0)),
		to_world(o + s), to_world(o + Vector2(0, s.y)),
	])

## Kierunek 0..7 dla wektora ruchu na ekranie.
## 0 = S (w dół ekranu), dalej zgodnie z ruchem wskazówek zegara: 1=SW, 2=W, 3=NW, 4=N, 5=NE, 6=E, 7=SE.
## Ta sama konwencja obowiązuje w blender/render_sprites.py.
static func direction8(v: Vector2) -> int:
	if v.length_squared() < 0.0001:
		return 0
	var a := fposmod(rad_to_deg(v.angle()) - 90.0 + 22.5, 360.0)
	return int(a / 45.0) % 8

static func chebyshev(a: Vector2i, b: Vector2i) -> int:
	return maxi(absi(a.x - b.x), absi(a.y - b.y))
