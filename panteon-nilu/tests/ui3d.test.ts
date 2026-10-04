import { Box3 } from 'three';
import { buildMap } from '../src/engine';
import { SCENARIOS } from '../src/config/scenarios';
import { neighborKeys } from '../src/engine/hex';
import { edgeKey } from '../src/engine/hex';
import {
  arcHeight, arcPoint, boardExtent, easeInOutCubic, easeOutBack, edgeWorld, hexAnchor, hexToWorld, regionFocus, regionOutline, TILE_R,
  WATER_LEVEL,
} from '../src/ui3d/coords';
import {
  camelGeometry, godPawnGeometry, guardianPawnGeometry, hexPrism, obeliskGeometry, pyramidGeometry, templeGeometry,
  warriorPawnGeometry,
} from '../src/ui3d/geometry';
import { DEFAULT_SETTINGS, effectiveSettings } from '../src/ui3d/settings';
import {
  loadManifest, modelCandidates, MODELS_URL, parseManifest, pickModel, resetManifestCache,
} from '../src/ui3d/modelFiles';
import { existsSync, readFileSync } from 'node:fs';
import { newGame } from './helpers';

const bbox = (g: import('three').BufferGeometry) => new Box3().setFromBufferAttribute(g.getAttribute('position') as never);

describe('3D: współrzędne', () => {
  it('sąsiednie heksy leżą w odległości √3·R (heksy stykają się krawędziami)', () => {
    const [x0, z0] = hexToWorld('0,0');
    for (const n of neighborKeys('0,0')) {
      const [x, z] = hexToWorld(n);
      expect(Math.hypot(x - x0, z - z0)).toBeCloseTo(Math.sqrt(3) * TILE_R, 5);
    }
  });

  it('krawędź między sąsiadami ma długość boku heksu (= R) i środek w połowie drogi', () => {
    const e = edgeKey('0,0', '1,0');
    const w = edgeWorld(e);
    expect(w.length).toBeCloseTo(TILE_R, 5);
    const [a, b] = [hexToWorld('0,0'), hexToWorld('1,0')];
    expect(w.mid[0]).toBeCloseTo((a[0] + b[0]) / 2, 5);
    expect(w.mid[1]).toBeCloseTo((a[1] + b[1]) / 2, 5);
  });

  it('figurka na wodzie (Apep) stoi na lustrze wody, na lądzie — na wierzchu kafla', () => {
    const map = buildMap(SCENARIOS['trzy-krainy']);
    const water = Object.keys(map.terrain).find((h) => map.terrain[h] === 'water')!;
    const land = Object.keys(map.terrain).find((h) => map.terrain[h] === 'desert')!;
    expect(hexAnchor(map, water)[1]).toBe(WATER_LEVEL);
    expect(hexAnchor(map, land)[1]).toBeGreaterThan(WATER_LEVEL);
  });

  it('zasięg planszy i najazd na region mieszczą się w planszy', () => {
    const s = newGame({ scenario: 'trzy-krainy' });
    const board = boardExtent(s.map);
    const r = regionFocus(s, 0);
    expect(r.radius).toBeLessThan(board.radius);
    expect(Math.hypot(r.center[0] - board.center[0], r.center[1] - board.center[1])).toBeLessThan(board.radius);
  });

  it('obrys regionu bitwy: zamknięta granica z krawędzi heksów (każdy wierzchołek w parzystej liczbie odcinków)', () => {
    const s = newGame({ scenario: 'trzy-krainy' });
    for (let region = 0; region < 3; region++) {
      const pts = regionOutline(s, region, 0);
      expect(pts.length).toBeGreaterThan(0);
      expect(pts.length % 2).toBe(0);
      const ends = new Map<string, number>();
      for (let i = 0; i < pts.length; i += 2) {
        const [a, b] = [pts[i], pts[i + 1]];
        expect(Math.hypot(a[0] - b[0], a[2] - b[2])).toBeCloseTo(TILE_R, 6);
        for (const p of [a, b]) {
          const k = `${p[0].toFixed(3)},${p[2].toFixed(3)}`;
          ends.set(k, (ends.get(k) ?? 0) + 1);
        }
      }
      for (const n of ends.values()) expect(n % 2).toBe(0);
    }
  });
});

describe('3D: animacje', () => {
  it('łuk zaczyna się i kończy w punktach ruchu, w połowie jest najwyżej', () => {
    const a: [number, number, number] = [0, 0.3, 0];
    const b: [number, number, number] = [3, 0.34, 1];
    expect(arcPoint(a, b, 0)).toEqual(a);
    arcPoint(a, b, 1).forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));
    const mid = arcPoint(a, b, 0.5);
    expect(mid[1]).toBeCloseTo((a[1] + b[1]) / 2 + arcHeight(a, b), 6);
  });

  it('easing: krańce 0 i 1; „back” przestrzeliwuje i wraca', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeOutBack(1)).toBeCloseTo(1, 6);
    expect(Math.max(...[0.6, 0.7, 0.8].map(easeOutBack))).toBeGreaterThan(1);
  });
});

describe('3D: geometria', () => {
  it('kafel: dół 0, wierzch = wysokość, promień ≤ R (fazowana krawędź)', () => {
    const b = bbox(hexPrism(0.97, 0.3, 0.05));
    expect(b.min.y).toBeCloseTo(0, 5);
    expect(b.max.y).toBeCloseTo(0.3, 5);
    expect(b.max.x).toBeLessThanOrEqual(0.97 + 1e-6);
    expect(b.max.z).toBeLessThanOrEqual(0.97 + 1e-6);
  });

  it('monumenty i pionki stoją na y = 0 i mieszczą się na polu', () => {
    for (const g of [obeliskGeometry(), templeGeometry(), pyramidGeometry(), godPawnGeometry(), warriorPawnGeometry(), guardianPawnGeometry(), camelGeometry()]) {
      const b = bbox(g);
      expect(b.min.y).toBeGreaterThanOrEqual(-1e-6);
      expect(Math.max(b.max.x, -b.min.x, b.max.z, -b.min.z)).toBeLessThan(TILE_R * 0.9);
    }
    // wysokości rozróżniają figurki: bóg > strażnik > wojownik
    const h = (g: import('three').BufferGeometry) => bbox(g).max.y;
    expect(h(godPawnGeometry())).toBeGreaterThan(h(guardianPawnGeometry()));
    expect(h(guardianPawnGeometry())).toBeGreaterThan(h(warriorPawnGeometry()));
  });
});

describe('3D: ustawienia jakości', () => {
  it('niska jakość wyłącza postprocessing, cienie i cząsteczki, ogranicza DPR', () => {
    const low = effectiveSettings({ ...DEFAULT_SETTINGS, quality: 'low' });
    expect([low.postprocessing, low.shadows, low.ao, low.bloom, low.tiltShift, low.vignette, low.particles]).toEqual(Array(7).fill(false));
    expect(low.maxDpr).toBe(1);
  });

  it('wysoka jakość: każdy efekt osobno; bez efektów — bez postprocessingu', () => {
    expect(effectiveSettings(DEFAULT_SETTINGS).postprocessing).toBe(true);
    const none = effectiveSettings({ ...DEFAULT_SETTINGS, ao: false, bloom: false, tiltShift: false, vignette: false });
    expect(none.postprocessing).toBe(false);
    expect(effectiveSettings({ ...DEFAULT_SETTINGS, bloom: false }).bloom).toBe(false);
  });
});

describe('3D: modele figurek', () => {
  /** Część JSON pliku GLB (nagłówek 12 B, potem pierwszy fragment — JSON). */
  const glbJson = (file: string) => {
    const b = readFileSync(file);
    expect(b.toString('ascii', 0, 4)).toBe('glTF');
    const len = b.readUInt32LE(12);
    expect(b.toString('ascii', 16, 20)).toBe('JSON');
    return JSON.parse(b.toString('utf8', 20, 20 + len)) as { extensionsRequired?: string[]; materials?: { name?: string }[] };
  };

  it('kandydaci: najpierw model konkretnego boga/strażnika, potem ogólny', () => {
    expect(modelCandidates({ kind: 'god', guardian: undefined }, 'ra')).toEqual(['god-ra.glb', 'god.glb']);
    expect(modelCandidates({ kind: 'warrior', guardian: undefined }, 'isis')).toEqual(['warrior-isis.glb', 'warrior.glb']);
    expect(modelCandidates({ kind: 'guardian', guardian: 'apep' }, 'ra')).toEqual(['guardian-apep.glb', 'guardian.glb']);
  });

  it('wybór pliku: pierwszy dostępny kandydat, brak — zastępnik (null)', () => {
    const available = new Map([['god.glb', 'god.glb'], ['god-ra.glb', 'god-ra.glb']]);
    expect(pickModel(['god-ra.glb', 'god.glb'], available)).toBe(`${MODELS_URL}god-ra.glb`);
    expect(pickModel(['god-amun.glb', 'god.glb'], available)).toBe(`${MODELS_URL}god.glb`);
    expect(pickModel(['guardian-apep.glb', 'guardian.glb'], available)).toBeNull();
  });

  it('manifest: błędny lub brakujący → pusta lista (same zastępniki), bez wyjątków', async () => {
    expect([...parseManifest({ models: ['a.glb', 3, 'b.txt', null, '../x.glb', 'http://x/y.glb'] }).keys()]).toEqual(['a.glb']);
    expect(parseManifest(null).size).toBe(0);
    expect(parseManifest({ models: 'god.glb' }).size).toBe(0);
    resetManifestCache();
    expect((await loadManifest(() => Promise.reject(new Error('offline')))).size).toBe(0);
    resetManifestCache();
    expect((await loadManifest(async () => new Response('nie ma', { status: 404 }))).size).toBe(0);
    resetManifestCache();
    const ok = await loadManifest(async () => new Response(JSON.stringify({ models: ['god.glb'] })));
    expect([...ok.keys()]).toEqual(['god.glb']);
    resetManifestCache();
  });

  it('manifest może wskazać inny plik dla modelu (host bez .glb); obce adresy są ignorowane', () => {
    const files = parseManifest({
      models: ['god.glb', 'warrior.glb', 'guardian.glb'],
      files: { 'god.glb': 'god.gltf.json', 'warrior.glb': 'data:application/octet-stream;base64,AAAA', 'guardian.glb': '../../etc' },
    });
    expect(pickModel(['god-ra.glb', 'god.glb'], files)).toBe(`${MODELS_URL}god.gltf.json`);
    expect(pickModel(['warrior.glb'], files)).toBe(`${MODELS_URL}warrior.glb`);
    expect(pickModel(['guardian.glb'], files)).toBe(`${MODELS_URL}guardian.glb`);
  });

  it('dołączone modele: każdy wpis manifestu istnieje, kompresja meshopt (bóg) i Draco (wojownik)', () => {
    const list = parseManifest(JSON.parse(readFileSync('public/models/manifest.json', 'utf8')));
    expect([...list.keys()].sort()).toEqual(['god.glb', 'warrior.glb']);
    for (const f of list.values()) expect(existsSync(`public/models/${f}`)).toBe(true);
    const god = glbJson('public/models/god.glb');
    const warrior = glbJson('public/models/warrior.glb');
    expect(god.extensionsRequired).toContain('EXT_meshopt_compression');
    expect(warrior.extensionsRequired).toContain('KHR_draco_mesh_compression');
    // materiał „team” dostaje kolor gracza
    for (const g of [god, warrior]) expect(g.materials?.some((m) => m.name?.startsWith('team'))).toBe(true);
    // dekoder Draco jest w paczce (bez CDN)
    expect(existsSync('public/draco/draco_decoder.wasm')).toBe(true);
  });
});
