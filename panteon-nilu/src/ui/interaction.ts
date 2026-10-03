// Mapowanie listy legalnych ruchów (z silnika) na to, co da się kliknąć na planszy.
// UI nie liczy reguł — tylko filtruje ruchy, które wygenerował silnik.
import type { EdgeKey, FigureId, HexKey, MonumentId, MonumentType, Move } from '../engine/types';

export interface Selection {
  figure?: FigureId;
  monumentType?: MonumentType;
  /** Nadać przywoływanej figurce promienność (Ra). */
  radiant?: boolean;
  /** Satet: wybrane pole wroga — teraz wybieramy, gdzie go zepchnąć. */
  pushTo?: HexKey;
  /** Karawana: dotąd wybrane krawędzie. */
  camels?: EdgeKey[];
  /** Wrota zaświatów: które przenosimy (null = nowe z zapasu). */
  underworldFrom?: HexKey | null;
}

export type HexAction = { kind: 'move'; move: Move } | { kind: 'select'; sel: Selection };

export interface Interaction {
  /** Figurki, które można zaznaczyć (ruch, Zew obelisków). */
  selectableFigures: Set<FigureId>;
  /** Kliknięcie pola: wykonuje ruch albo zmienia wybór (np. Satet: wybór wroga do zepchnięcia). */
  hexActions: Map<HexKey, HexAction>;
  /** Kliknięcie monumentu wysyła ten ruch. */
  monumentMoves: Map<MonumentId, Move>;
  /** Karawana: krawędzie, które można dołożyć do linii, i już wybrane. */
  edgeChoices: Set<EdgeKey>;
  selectedEdges: Set<EdgeKey>;
  /** Karawana: ruch odpowiadający dokładnie wybranej linii (gotowy do zatwierdzenia). */
  caravanMove: Move | null;
}

const sourceRank = (source: string) => (source === 'regular' ? 1 : 0); // najpierw dodatkowe źródła

export function interactionFor(legal: Move[], sel: Selection): Interaction {
  const selectableFigures = new Set<FigureId>();
  const hexActions = new Map<HexKey, HexAction>();
  const monumentMoves = new Map<MonumentId, Move>();
  const edgeChoices = new Set<EdgeKey>();
  const selectedEdges = new Set<EdgeKey>(sel.camels ?? []);
  let caravanMove: Move | null = null;
  const setMove = (h: HexKey, move: Move) => hexActions.set(h, { kind: 'move', move });

  for (const m of legal) {
    switch (m.type) {
      case 'moveFigure':
        selectableFigures.add(m.figure);
        if (m.figure !== sel.figure) break;
        if (m.push === null) setMove(m.to, m);
        else if (sel.pushTo === m.to) setMove(m.push, m);
        else if (!sel.pushTo && !hexActions.has(m.to)) hexActions.set(m.to, { kind: 'select', sel: { ...sel, pushTo: m.to } });
        break;
      case 'obeliskMove':
        selectableFigures.add(m.figure);
        if (m.figure === sel.figure) setMove(m.to, m);
        break;
      case 'summon': {
        if (m.figure !== sel.figure || m.radiant !== !!sel.radiant) break;
        const prev = hexActions.get(m.to);
        const prevSource = prev?.kind === 'move' && prev.move.type === 'summon' ? prev.move.source : null;
        if (prevSource === null || sourceRank(m.source) < sourceRank(prevSource)) setMove(m.to, m);
        break;
      }
      case 'mummyReturn':
        if (m.radiant === !!sel.radiant) setMove(m.to, m);
        break;
      case 'build':
        if (m.monument === sel.monumentType) setMove(m.at, m);
        break;
      case 'underworld':
        if (m.to !== null && m.from === (sel.underworldFrom ?? null)) setMove(m.to, m);
        break;
      case 'controlMonument':
        monumentMoves.set(m.monument, m);
        break;
      case 'caravan': {
        if (![...selectedEdges].every((e) => m.camels.includes(e))) break;
        for (const e of m.camels) if (!selectedEdges.has(e)) edgeChoices.add(e);
        if (m.camels.length === selectedEdges.size) caravanMove = m;
        break;
      }
    }
  }
  return { selectableFigures, hexActions, monumentMoves, edgeChoices, selectedEdges, caravanMove };
}

/** Domyślny wybór, gdy jest tylko jedna sensowna opcja (np. jedna figurka w puli). */
export function defaultSelection(legal: Move[]): Selection {
  const summonFigures = [...new Set(legal.filter((m) => m.type === 'summon').map((m) => (m as { figure: string }).figure))];
  if (summonFigures.length) return { figure: summonFigures[0] };
  const buildTypes = [...new Set(legal.filter((m) => m.type === 'build').map((m) => (m as { monument: MonumentType }).monument))];
  if (buildTypes.length) return { monumentType: buildTypes[0] };
  const uw = legal.filter((m): m is Extract<Move, { type: 'underworld' }> => m.type === 'underworld' && m.to !== null);
  if (uw.length) return { underworldFrom: uw.some((m) => m.from === null) ? null : uw[0].from };
  if (legal.some((m) => m.type === 'caravan')) return { camels: [] };
  return {};
}
