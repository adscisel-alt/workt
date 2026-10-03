// Mapowanie listy legalnych ruchów (z silnika) na to, co da się kliknąć na planszy.
// UI nie liczy reguł — tylko filtruje ruchy, które wygenerował silnik.
import type { FigureId, HexKey, MonumentId, MonumentType, Move } from '../engine/types';

export interface Selection {
  figure?: FigureId;
  monumentType?: MonumentType;
}

export interface Interaction {
  /** Figurki, które można zaznaczyć (ruch). */
  selectableFigures: Set<FigureId>;
  /** Kliknięcie pola wysyła ten ruch. */
  hexMoves: Map<HexKey, Move>;
  /** Kliknięcie monumentu wysyła ten ruch. */
  monumentMoves: Map<MonumentId, Move>;
}

export function interactionFor(legal: Move[], sel: Selection): Interaction {
  const selectableFigures = new Set<FigureId>();
  const hexMoves = new Map<HexKey, Move>();
  const monumentMoves = new Map<MonumentId, Move>();
  for (const m of legal) {
    switch (m.type) {
      case 'moveFigure':
        selectableFigures.add(m.figure);
        if (m.figure === sel.figure) hexMoves.set(m.to, m);
        break;
      case 'summon':
        if (m.figure === sel.figure) hexMoves.set(m.to, m);
        break;
      case 'build':
        if (m.monument === sel.monumentType) hexMoves.set(m.at, m);
        break;
      case 'controlMonument':
        monumentMoves.set(m.monument, m);
        break;
    }
  }
  return { selectableFigures, hexMoves, monumentMoves };
}

/** Domyślny wybór, gdy jest tylko jedna sensowna opcja (np. jedna figurka w puli). */
export function defaultSelection(legal: Move[]): Selection {
  const summonFigures = [...new Set(legal.filter((m) => m.type === 'summon').map((m) => (m as { figure: string }).figure))];
  if (summonFigures.length) return { figure: summonFigures[0] };
  const buildTypes = [...new Set(legal.filter((m) => m.type === 'build').map((m) => (m as { monument: MonumentType }).monument))];
  if (buildTypes.length) return { monumentType: buildTypes[0] };
  return {};
}
