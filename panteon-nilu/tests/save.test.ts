import { botMove } from '../src/bot';
import { applyMove, deserializeGame, legalMoves, SaveError, serializeGame } from '../src/engine';
import { pendingPlayers } from '../src/engine/legal';
import type { GameState } from '../src/engine/types';
import { card, clearBoard, conflictNow, GODS5, newGame, place, R1 } from './helpers';

const meta = { name: 'Test', savedAt: '2026-10-03T12:00:00.000Z', controllers: ['human', 'heuristic'] };

function playBots(s: GameState, moves: number, seed: number): GameState {
  for (let i = 0; i < moves && !s.result; i++) {
    const seat = pendingPlayers(s.pending)[0];
    s = applyMove(s, botMove(s, seat, 'random', seed + i)!);
  }
  return s;
}

describe('zapis i wczytanie', () => {
  it('zapis → wczytanie odtwarza identyczny stan i metadane', () => {
    const s = playBots(newGame({ scenario: 'trzy-krainy', seed: 4 }, true), 150, 1);
    const file = deserializeGame(serializeGame(s, meta));
    expect(file.state).toEqual(s);
    expect(file).toMatchObject(meta);
  });

  it('partia wczytana z zapisu toczy się dalej identycznie (determinizm)', () => {
    const s = playBots(newGame({ scenario: 'trzy-krainy', gods: GODS5.slice(0, 3), seed: 8 }, true), 200, 3);
    const loaded = deserializeGame(serializeGame(s, { ...meta, controllers: ['human', 'random', 'random'] })).state;
    expect(playBots(loaded, 300, 99)).toEqual(playBots(s, 300, 99));
  });

  it('zapis w trakcie bitwy zachowuje tajny wybór karty', () => {
    const s0 = clearBoard(newGame());
    place(s0, 'p0-god', R1.fertile[0]);
    place(s0, 'p1-god', R1.fertile[1]);
    const s = applyMove(conflictNow(s0), card(0, 'chariots'));
    const loaded = deserializeGame(serializeGame(s, meta)).state;
    expect(loaded.battle?.selected).toEqual({ 0: ['chariots'] });
    expect(legalMoves(loaded)).toEqual(legalMoves(s));
  });

  it('odrzuca nie-JSON, obcy format, inną wersję i uszkodzony stan', () => {
    expect(() => deserializeGame('{nie json')).toThrow(SaveError);
    expect(() => deserializeGame(JSON.stringify({ format: 'inny' }))).toThrow(/nie jest zapis/);
    const ok = JSON.parse(serializeGame(newGame(), meta));
    expect(() => deserializeGame(JSON.stringify({ ...ok, version: 99 }))).toThrow(/wersja/);
    expect(() => deserializeGame(JSON.stringify({ ...ok, state: { ...ok.state, players: [] } }))).toThrow(/uszkodzony/);
    expect(() => deserializeGame(JSON.stringify({ ...ok, state: { ...ok.state, pending: null, queue: [] } }))).toThrow(/brak możliwych ruchów/);
  });
});
