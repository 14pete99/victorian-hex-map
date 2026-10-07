// Actual parliamentary holdings on 1 October 2026, separate from election inputs.
// Only changes of holding from the 2022 seat data are needed for this snapshot.
import { SEATS } from './seats';
import type { Party, SeatProjection } from './types';

export const ASSEMBLY_ID = 'assembly-2026-10-01';
export const ASSEMBLY_DATE = '1 October 2026';
export const ASSEMBLY_LABEL = `Lower house · ${ASSEMBLY_DATE}`;

export const ASSEMBLY_CHANGES: Readonly<Record<string, { party: Party | null; note: string; source: string }>> = {
  Prahran: {
    party: 'LIB',
    note: 'Rachel Westaway (Liberal) won the 8 February 2025 by-election. The Greens held this seat at the 2022 election.',
    source: 'https://www.vec.vic.gov.au/electoral-boundaries/state-districts/prahran-district',
  },
  Ringwood: {
    party: 'IND',
    note: 'Will Fowles, elected for Labor in 2022, sits as an Independent.',
    source: 'https://www.parliament.vic.gov.au/members/will-fowles/',
  },
  'South Barwon': {
    party: 'IND',
    note: 'Darren Cheeseman, elected for Labor in 2022, sits as an Independent. Holdings follow Parliament’s parliamentary affiliation.',
    source: 'https://www.parliament.vic.gov.au/members/darren-cheeseman/',
  },
  Brunswick: {
    party: null,
    note: 'Dr Tim Read (Greens), the member since November 2018, died on 19 September 2026. The seat is vacant.',
    source: 'https://www.parliament.vic.gov.au/members/tim-read/',
  },
};

/** Fixed parliamentary snapshot; baseline seat records retain their election data. */
export const ASSEMBLY_SEATS: readonly SeatProjection[] = SEATS.map((seat) => {
  const change = ASSEMBLY_CHANGES[seat.name];
  const vacant = change?.party === null;
  const winner = change?.party ?? seat.winner;
  return { seat, winner, vacant, gained: !vacant && winner !== seat.winner };
});
