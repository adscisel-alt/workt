// Proceduralna geometria planszy i elementów (bez WebGL — testowalna w Node).
import {
  BoxGeometry, BufferGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, LatheGeometry, OctahedronGeometry,
  Shape, SphereGeometry, TorusGeometry, Vector2,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Kształt heksu „pointy-top” w płaszczyźnie kształtu (po obrocie: XZ świata). */
function hexShape(radius: number): Shape {
  const s = new Shape();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    const x = radius * Math.cos(a);
    const y = -radius * Math.sin(a); // oś Y kształtu → −Z świata
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

/**
 * Niski graniastosłup heksagonalny z fazowaną krawędzią. Dół na y = 0, wierzch na y = height.
 * `radius` — promień zewnętrzny razem z fazą.
 */
export function hexPrism(radius: number, height: number, bevel = 0.05): BufferGeometry {
  const depth = Math.max(0.001, height - 2 * bevel);
  // Faza odsuwa obrys o `bevel` prostopadle do boków — w narożnikach o bevel / cos 30°.
  const g = new ExtrudeGeometry(hexShape(radius - bevel / Math.cos(Math.PI / 6)), {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 1,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  g.computeVertexNormals();
  return g;
}

/** Płaski heks (lustro wody, podświetlenia). */
export function hexCap(radius: number): BufferGeometry {
  const g = new ExtrudeGeometry(hexShape(radius), { depth: 0.001, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return g;
}

const merge = (parts: BufferGeometry[]) => {
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)), false)!;
  g.computeVertexNormals();
  return g;
};

const at = (g: BufferGeometry, x: number, y: number, z: number) => g.translate(x, y, z);

// ---------- monumenty ----------

export function obeliskGeometry(): BufferGeometry {
  const shaft = new CylinderGeometry(0.085, 0.13, 0.95, 4, 1).rotateY(Math.PI / 4);
  const cap = new ConeGeometry(0.085, 0.14, 4).rotateY(Math.PI / 4);
  return merge([
    at(new BoxGeometry(0.36, 0.06, 0.36), 0, 0.03, 0),
    at(new BoxGeometry(0.28, 0.06, 0.28), 0, 0.09, 0),
    at(shaft, 0, 0.12 + 0.475, 0),
    at(cap, 0, 0.12 + 0.95 + 0.07, 0),
  ]);
}

export function templeGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [
    at(new BoxGeometry(0.98, 0.06, 0.74), 0, 0.03, 0),
    at(new BoxGeometry(0.88, 0.06, 0.64), 0, 0.09, 0),
  ];
  for (const x of [-0.34, -0.11, 0.11, 0.34]) {
    for (const z of [-0.22, 0.22]) parts.push(at(new CylinderGeometry(0.045, 0.05, 0.4, 10), x, 0.12 + 0.2, z));
  }
  parts.push(at(new BoxGeometry(0.86, 0.07, 0.6), 0, 0.555, 0));
  // fronton: graniastosłup trójkątny wzdłuż osi Z
  const tri = new Shape();
  tri.moveTo(-0.45, 0);
  tri.lineTo(0.45, 0);
  tri.lineTo(0, 0.17);
  tri.closePath();
  const roof = new ExtrudeGeometry(tri, { depth: 0.64, bevelEnabled: false }).translate(0, 0, -0.32);
  parts.push(at(roof, 0, 0.59, 0));
  return merge(parts);
}

export function pyramidGeometry(): BufferGeometry {
  return merge([
    at(new BoxGeometry(0.9, 0.05, 0.9), 0, 0.025, 0),
    at(new ConeGeometry(0.6, 0.66, 4).rotateY(Math.PI / 4), 0, 0.05 + 0.33, 0),
  ]);
}

// ---------- figurki-zastępniki (pionki) ----------

function lathe(profile: [number, number][], segments = 24): BufferGeometry {
  return new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), segments);
}

/** Pionek boga: wysoki, z koroną. */
export function godPawnGeometry(): BufferGeometry {
  return merge([
    lathe([[0, 0], [0.24, 0], [0.24, 0.06], [0.16, 0.12], [0.11, 0.45], [0.16, 0.52], [0.09, 0.58], [0, 0.58]]),
    at(new SphereGeometry(0.12, 20, 14), 0, 0.68, 0),
    at(new CylinderGeometry(0.1, 0.13, 0.14, 16), 0, 0.82, 0),
  ]);
}

/** Pionek wojownika: niski. */
export function warriorPawnGeometry(): BufferGeometry {
  return merge([
    lathe([[0, 0], [0.17, 0], [0.17, 0.05], [0.1, 0.1], [0.07, 0.3], [0.11, 0.34], [0, 0.34]]),
    at(new SphereGeometry(0.085, 16, 12), 0, 0.41, 0),
  ]);
}

/** Pionek strażnika: średni, z ośmiościenną „głową”. */
export function guardianPawnGeometry(): BufferGeometry {
  return merge([
    lathe([[0, 0], [0.21, 0], [0.21, 0.06], [0.13, 0.12], [0.09, 0.38], [0.14, 0.43], [0, 0.43]]),
    at(new OctahedronGeometry(0.13), 0, 0.56, 0),
  ]);
}

/** Kolorowa podstawka figurki (jak plastikowe podstawki w pudełku). */
export function baseRingGeometry(radius = 0.3): BufferGeometry {
  return new CylinderGeometry(radius, radius + 0.02, 0.05, 28).translate(0, 0.025, 0);
}

/** Płaski pierścień (podświetlenie, słońce Ra, wrota). */
export function flatRing(radius: number, tube: number): BufferGeometry {
  return new TorusGeometry(radius, tube, 8, 48).rotateX(Math.PI / 2);
}

// ---------- karawana ----------

export function camelGeometry(): BufferGeometry {
  return merge([
    at(new BoxGeometry(0.2, 0.08, 0.08), 0, 0.11, 0),
    at(new SphereGeometry(0.045, 10, 8), -0.01, 0.17, 0),
    at(new BoxGeometry(0.035, 0.1, 0.035), 0.1, 0.17, 0),
    at(new BoxGeometry(0.07, 0.035, 0.04), 0.125, 0.225, 0),
    ...[-0.07, 0.07].flatMap((x) => [-0.025, 0.025].map((z) => at(new BoxGeometry(0.022, 0.08, 0.022), x, 0.04, z))),
  ]);
}
