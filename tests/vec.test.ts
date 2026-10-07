// The 2022 results in seats.ts, checked against the Victorian Electoral Commission's vote counts saved in
// fixtures/vec-2022-results.json. To correct a winner, runner-up or margin, change the fixture from the
// VEC page it cites first, then seats.ts.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SEATS } from '../src/map';
import type { Party } from '../src/map';

interface VecResult {
  /** Which VEC count the final two come from: the official distribution, or the 2023 indicative full distribution. */
  count: 'official' | 'indicative';
  winner: Party;
  runnerUp: Party;
  winnerVotes: number;
  runnerUpVotes: number;
}

const VEC = JSON.parse(readFileSync(new URL('./fixtures/vec-2022-results.json', import.meta.url), 'utf8')) as {
  licence: string;
  seats: Record<string, VecResult>;
};

/** The winner's share of the final two candidates' votes, less 50. */
const vecMargin = (result: VecResult) => (result.winnerVotes / (result.winnerVotes + result.runnerUpVotes)) * 100 - 50;

describe('2022 results against the VEC counts', () => {
  it('has a VEC record for each of the 88 seats and no other', () => {
    expect(Object.keys(VEC.seats).sort()).toEqual(SEATS.map((seat) => seat.name).sort());
  });

  it('credits the Victorian Electoral Commission under CC BY 4.0', () => {
    expect(VEC.licence).toContain('© Victorian Electoral Commission');
    expect(VEC.licence).toContain('https://creativecommons.org/licenses/by/4.0/');
  });

  it('uses the official count for 49 seats and the indicative full distribution for 39', () => {
    const counts = Object.values(VEC.seats).map((result) => result.count);
    expect(counts.filter((count) => count === 'official')).toHaveLength(49);
    expect(counts.filter((count) => count === 'indicative')).toHaveLength(39);
  });

  it('records the same winner and runner-up as the VEC', () => {
    for (const seat of SEATS) {
      const result = VEC.seats[seat.name];
      expect(result.winnerVotes, seat.name).toBeGreaterThan(result.runnerUpVotes);
      expect({ winner: seat.winner, runnerUp: seat.runnerUp }, seat.name).toEqual({ winner: result.winner, runnerUp: result.runnerUp });
    }
  });

  it('records each margin as the VEC figure rounded to one decimal place', () => {
    for (const seat of SEATS) {
      // Half a tenth either way, so a figure that ends in 5 may round up or down.
      expect(Math.abs(vecMargin(VEC.seats[seat.name]) - seat.margin), seat.name).toBeLessThanOrEqual(0.05 + 1e-9);
    }
  });
});
