// The dated lower-house snapshot: its totals, its vacancy and the records it cites.
import { describe, expect, it } from 'vitest';
import { ASSEMBLY_CHANGES, ASSEMBLY_SEATS, SEATS } from '../src/map';

/** Sites a change record may cite. Add a host here only for a primary source. */
const SOURCE_HOSTS = ['www.vec.vic.gov.au', 'www.parliament.vic.gov.au'];

describe('assembly snapshot', () => {
  it('covers all 88 seats in the order of the seat data', () => {
    expect(ASSEMBLY_SEATS.map((projection) => projection.seat.name)).toEqual(SEATS.map((seat) => seat.name));
  });

  it('adds up to Labor 54, Liberal 20, Nationals 9, Greens 2, Independent 2 and one vacancy', () => {
    const totals: Record<string, number> = {};
    for (const projection of ASSEMBLY_SEATS) {
      const holder = projection.vacant ? 'vacant' : projection.winner;
      totals[holder] = (totals[holder] ?? 0) + 1;
    }
    expect(totals).toEqual({ ALP: 54, LIB: 20, NAT: 9, GRN: 2, IND: 2, vacant: 1 });
  });

  it('changes only seats that exist', () => {
    const names = new Set(SEATS.map((seat) => seat.name));
    for (const name of Object.keys(ASSEMBLY_CHANGES)) expect(names.has(name), name).toBe(true);
  });

  it('marks a seat with no holder as vacant, never as a gain', () => {
    for (const projection of ASSEMBLY_SEATS) {
      const change = ASSEMBLY_CHANGES[projection.seat.name];
      expect(Boolean(projection.vacant), projection.seat.name).toBe(change?.party === null);
      if (projection.vacant) expect(projection.gained, projection.seat.name).toBe(false);
      else expect(projection.gained, projection.seat.name).toBe(projection.winner !== projection.seat.winner);
    }
  });

  it('gives every change a note and an HTTPS source on an approved site', () => {
    for (const [name, change] of Object.entries(ASSEMBLY_CHANGES)) {
      expect(change.note.trim().length, name).toBeGreaterThan(0);
      const url = new URL(change.source);
      expect(url.protocol, name).toBe('https:');
      expect(SOURCE_HOSTS, name).toContain(url.hostname);
    }
  });
});
