// Integrity of the seat data and the bay tiles. A change to seats.ts or water.ts must keep these true.
import { describe, expect, it } from 'vitest';
import { HEX, PARTY_CODES, SEATS, WATER, seatSlug } from '../src/map';
import type { MapCell, Party } from '../src/map';

const cellKey = (cell: MapCell) => `${cell.col},${cell.row}`;
const waterCells = WATER.flatMap((body) => body.cells);

/** The name a contest uses for a party's side. The Liberal runner-up in a Greens seat is named directly. */
const SIDE: Partial<Record<Party, readonly string[]>> = {
  ALP: ['Labor'],
  LIB: ['Coalition', 'Liberal'],
  NAT: ['Coalition'],
  GRN: ['Greens'],
  IND: ['Independent'],
};

describe('seat records', () => {
  it('has 88 seats with unique names and test-id slugs', () => {
    expect(SEATS).toHaveLength(88);
    expect(new Set(SEATS.map((seat) => seat.name)).size).toBe(88);
    expect(new Set(SEATS.map((seat) => seatSlug(seat.name))).size).toBe(88);
  });

  it('holds only the documented fields', () => {
    // A new field needs a stated source in the README before it is added here.
    const fields = ['col', 'contest', 'margin', 'name', 'region', 'row', 'runnerUp', 'winner'];
    for (const seat of SEATS) expect(Object.keys(seat).sort(), seat.name).toEqual(fields);
  });

  it('gives every seat its own cell inside the grid', () => {
    expect(new Set(SEATS.map(cellKey)).size).toBe(88);
    for (const seat of SEATS) {
      expect(Number.isInteger(seat.col) && Number.isInteger(seat.row), seat.name).toBe(true);
      expect(seat.col, seat.name).toBeGreaterThanOrEqual(0);
      expect(seat.col, seat.name).toBeLessThan(HEX.columns);
      expect(seat.row, seat.name).toBeGreaterThanOrEqual(HEX.firstRow);
      expect(seat.row, seat.name).toBeLessThanOrEqual(HEX.lastRow);
    }
  });

  it('puts no seat on a water cell', () => {
    const water = new Set(waterCells.map(cellKey));
    expect(SEATS.filter((seat) => water.has(cellKey(seat))).map((seat) => seat.name)).toEqual([]);
  });

  it('records a winner, a different runner-up and a margin to one decimal place', () => {
    for (const seat of SEATS) {
      expect(PARTY_CODES, seat.name).toContain(seat.winner);
      expect(PARTY_CODES, seat.name).toContain(seat.runnerUp);
      expect(seat.runnerUp, seat.name).not.toBe(seat.winner);
      expect(seat.margin, seat.name).toBeGreaterThan(0);
      expect(seat.margin, seat.name).toBeLessThan(50);
      expect(Math.abs(seat.margin * 10 - Math.round(seat.margin * 10)), seat.name).toBeLessThan(1e-9);
    }
  });

  it('names each contest after its winner and runner-up', () => {
    for (const seat of SEATS) {
      const [first, second] = seat.contest.split(' v ');
      expect(SIDE[seat.winner], seat.name).toContain(first);
      expect(SIDE[seat.runnerUp], seat.name).toContain(second);
    }
  });

  it('adds up to the 2022 result: Labor 56, Liberal 19, Nationals 9, Greens 4', () => {
    const totals: Partial<Record<Party, number>> = {};
    for (const seat of SEATS) totals[seat.winner] = (totals[seat.winner] ?? 0) + 1;
    expect(totals).toEqual({ ALP: 56, LIB: 19, NAT: 9, GRN: 4 });
  });
});

describe('water tiles', () => {
  it('has 12 distinct cells in two bays', () => {
    expect(WATER).toHaveLength(2);
    expect(waterCells).toHaveLength(12);
    expect(new Set(waterCells.map(cellKey)).size).toBe(12);
  });

  it('sets each bay name on one of its own cells', () => {
    for (const body of WATER) expect(body.cells.map(cellKey), body.name).toContain(cellKey(body.nameCell));
  });
});
