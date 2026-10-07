// Types for the seat data and the map. Nothing here touches the DOM.

export const PARTY_CODES = ['ALP', 'LIB', 'NAT', 'GRN', 'ONP', 'IND', 'OTH'] as const;
export type Party = (typeof PARTY_CODES)[number];

export type ContestType =
  | 'Labor v Coalition'
  | 'Coalition v Labor'
  | 'Coalition v Independent'
  | 'Labor v Greens'
  | 'Greens v Labor'
  | 'Greens v Liberal'
  | 'Labor v Independent';

export type Region =
  | 'Regional West'
  | 'Regional North'
  | 'Bendigo-Ballarat'
  | 'Gippsland'
  | 'Geelong'
  | 'Western Melbourne'
  | 'Northern Melbourne'
  | 'Inner Melbourne'
  | 'Eastern Melbourne'
  | 'Outer East'
  | 'Inner South-East'
  | 'Outer South-East'
  | 'Bayside';

/** Everything held for one seat. */
export interface Seat {
  name: string;
  region: Region;
  /** 2022 winning party. */
  winner: Party;
  /** 2022 runner-up party. */
  runnerUp: Party;
  /** 2022 two-candidate margin in percentage points. */
  margin: number;
  contest: ContestType;
  /** Map position: column 0 to 12 from west to east, row 0 to 11 from north to south. */
  col: number;
  row: number;
}

export type MarginBand = 'Marginal' | 'Fairly safe' | 'Safe' | 'Very safe';

/** What the map draws for one seat. */
export interface SeatProjection {
  seat: Seat;
  /** A vacancy has no current holder; winner retains the historical party only. */
  vacant?: boolean;
  /** The party whose colour the hexagon takes, unless vacant. */
  winner: Party;
  /** True when the winner shown differs from the 2022 winner. */
  gained: boolean;
}

/** A cell of the map grid. */
export interface MapCell {
  col: number;
  row: number;
}

/** a bay drawn on the map as water tiles. It is scenery, not a seat. */
export interface WaterBody {
  name: string;
  cells: readonly MapCell[];
  /** The cell that carries the bay's name. */
  nameCell: MapCell;
}

export type Theme = 'dark' | 'light';
