// Hexagon map rules that need no browser: grid geometry and the map's outline
//, labels, colour strength, the pointed-at and
// selected rings, dimming and zoom limits.
import { SEATS } from './seats';
import { WATER } from './water';
import type { MapCell, MarginBand, Party, Seat, SeatProjection } from './types';

/** R is the distance from a hexagon's centre to a vertex. The grid is 13 columns by 12 rows. */
export const HEX = { radius: 36, marginX: 40, marginY: 50, columns: 13, firstRow: 0, lastRow: 11 } as const;

const SQRT3 = Math.sqrt(3);

export interface Point {
  x: number;
  y: number;
}

/**
 * centre of the pointy-topped hexagon at column c, row r. Hexagons in
 * odd-numbered rows sit half a column to the right.
 */
export function hexCentre(col: number, row: number): Point {
  const r = HEX.radius;
  return {
    x: HEX.marginX + (SQRT3 * r) / 2 + SQRT3 * r * col + (row % 2 === 1 ? (SQRT3 * r) / 2 : 0),
    y: HEX.marginY + r + 1.5 * r * row,
  };
}

/**
 * The six vertices of a pointy-topped hexagon, clockwise from the top one. Edge i
 * runs from vertex i to vertex i + 1 and faces the neighbour that neighbourCells
 * lists at index i.
 */
export function hexVertices(cx: number, cy: number, radius: number = HEX.radius): Point[] {
  const vertices: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    vertices.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  }
  return vertices;
}

const pointText = (point: Point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`;

/** The six vertices of a pointy-topped hexagon, as an SVG points string. */
export function hexPoints(cx: number, cy: number, radius: number = HEX.radius): string {
  return hexVertices(cx, cy, radius).map(pointText).join(' ');
}

/**
 * the six cells around a cell, clockwise from the upper right: upper right,
 * right, lower right, lower left, left, upper left.
 */
export function neighbourCells(cell: MapCell): MapCell[] {
  const { col, row } = cell;
  const shift = row % 2 === 1 ? 1 : 0;
  return [
    { col: col + shift, row: row - 1 },
    { col: col + 1, row },
    { col: col + shift, row: row + 1 },
    { col: col + shift - 1, row: row + 1 },
    { col: col - 1, row },
    { col: col + shift - 1, row: row - 1 },
  ];
}

const cellKey = (cell: MapCell) => `${cell.col},${cell.row}`;

export interface OutlineEdge {
  /** The cell the edge belongs to, and which of its six edges it is. */
  cell: MapCell;
  edge: number;
  from: Point;
  to: Point;
}

/**
 * the edges the map's outline is made of: every edge of a cell in the set
 * whose neighbour across that edge is not in the set. Each runs clockwise round
 * its own cell.
 */
export function outlineEdges(cells: readonly MapCell[]): OutlineEdge[] {
  const inSet = new Set(cells.map(cellKey));
  const edges: OutlineEdge[] = [];
  for (const cell of cells) {
    const centre = hexCentre(cell.col, cell.row);
    const vertices = hexVertices(centre.x, centre.y);
    neighbourCells(cell).forEach((neighbour, edge) => {
      if (!inSet.has(cellKey(neighbour))) edges.push({ cell, edge, from: vertices[edge], to: vertices[(edge + 1) % 6] });
    });
  }
  return edges;
}

/** the outline as closed loops of points, each loop in drawing order. */
export function outlineLoops(cells: readonly MapCell[]): Point[][] {
  // At any vertex at most one outline edge starts, so the chain from an edge is never ambiguous.
  const startingAt = new Map(outlineEdges(cells).map((edge) => [pointText(edge.from), edge]));
  const loops: Point[][] = [];
  while (startingAt.size > 0) {
    const loop: Point[] = [];
    let edge: OutlineEdge | undefined = startingAt.values().next().value;
    while (edge) {
      startingAt.delete(pointText(edge.from));
      loop.push(edge.from);
      edge = startingAt.get(pointText(edge.to));
    }
    loops.push(loop);
  }
  return loops;
}

/** the outline as one SVG path, a closed sub-path per loop. */
export function outlinePath(cells: readonly MapCell[]): string {
  return outlineLoops(cells)
    .map((loop) => `M${loop.map(pointText).join('L')}Z`)
    .join('');
}

/** clear space kept between the outermost hexagons and the edge of the drawing area. */
export const MAP_PADDING = 20;

/**
 * the drawing area, fitted to the cells in use with MAP_PADDING clear on every
 * side, so the hexagons are drawn as large as the space allows.
 */
export function mapBounds(cells: readonly MapCell[] = [...SEATS, ...WATER.flatMap((body) => body.cells)]): { x: number; y: number; width: number; height: number } {
  const r = HEX.radius;
  const halfWidth = (SQRT3 * r) / 2;
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (const cell of cells) {
    const centre = hexCentre(cell.col, cell.row);
    left = Math.min(left, centre.x - halfWidth);
    right = Math.max(right, centre.x + halfWidth);
    top = Math.min(top, centre.y - r);
    bottom = Math.max(bottom, centre.y + r);
  }
  return { x: left - MAP_PADDING, y: top - MAP_PADDING, width: right - left + 2 * MAP_PADDING, height: bottom - top + 2 * MAP_PADDING };
}

/**
 * a bay's name is set on two lines, broken at the space that leaves the
 * longer line as short as possible. A one-word name stays on one line.
 */
export function waterNameLines(name: string): string[] {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return [words.join(' ')];
  let best: string[] = [];
  let bestLength = Infinity;
  for (let split = 1; split < words.length; split++) {
    const lines = [words.slice(0, split).join(' '), words.slice(split).join(' ')];
    const longer = Math.max(lines[0].length, lines[1].length);
    if (longer < bestLength) {
      best = lines;
      bestLength = longer;
    }
  }
  return best;
}

/** names longer than nine characters are cut to eight characters and an ellipsis. */
export function mapLabel(name: string): string {
  return name.length > 9 ? `${name.slice(0, 8)}…` : name;
}

/** the height of the two lines of text on a hexagon, and where each is set against its centre. */
export const LABEL = { size: 0.24 * HEX.radius, nameY: -2.5, subY: 9 } as const;

/** colour strength by 2022 margin band while margin bands are on; strongest for marginal seats. */
export const BAND_STRENGTH: Record<MarginBand, number> = {
  Marginal: 1,
  'Fairly safe': 0.85,
  Safe: 0.7,
  'Very safe': 0.55,
};

/** the pointed-at ring, the gap ring outside it and the outer ring of a selected seat. */
export const RING = {
  pointed: 0.11 * HEX.radius,
  gap: 0.05 * HEX.radius,
  outer: 0.08 * HEX.radius,
} as const;

/** Radius of a hexagon whose edges sit a distance inside (or, if negative, outside) a cell's edges. */
const radiusAtInset = (inset: number) => HEX.radius - (inset * 2) / SQRT3;

export interface HighlightRing {
  role: 'pointed' | 'gap' | 'outer';
  radius: number;
  width: number;
}

/** how far beyond a hexagon's edge the selected rings reach: 0.185 R. */
export const SELECTED_REACH = RING.pointed / 2 + RING.gap + RING.outer;

/**
 * a pointed-at seat has one ring centred on its edge. A selected
 * seat adds a gap ring outside that and an outer ring outside the gap. They are
 * listed in drawing order, widest first. No other ring is drawn on a seat.
 */
export function highlightRings(selected: boolean): HighlightRing[] {
  const pointed: HighlightRing = { role: 'pointed', radius: radiusAtInset(0), width: RING.pointed };
  if (!selected) return [pointed];
  const gapMiddle = RING.pointed / 2 + RING.gap / 2;
  const outerMiddle = RING.pointed / 2 + RING.gap + RING.outer / 2;
  return [
    { role: 'outer', radius: radiusAtInset(-outerMiddle), width: RING.outer },
    { role: 'gap', radius: radiusAtInset(-gapMiddle), width: RING.gap },
    pointed,
  ];
}

/**
 * Everything that sets how a seat's hexagon is drawn. There is nothing here for an
 * outline or a ring, because a seat's margin, its runner-up and a gain are not marked by a line.
 */
export interface HexState {
  /** the projected winner, which sets the colour. */
  party: Party;
  /** gained seats show "GAIN" in place of the margin. */
  gained: boolean;
  /** full strength, unless margin bands are on and the seat is unchanged. */
  strength: number;
  /** Whether the active filters exclude this seat. */
  dimmed: boolean;
}

export interface MapFilters {
  /** Null means "All". */
  party: Party | null;
  atRisk: boolean;
}

/** A seat is dimmed if either active filter excludes it. */
export function isDimmed(projection: SeatProjection, filters: MapFilters): boolean {
  if (filters.party !== null && (projection.vacant || projection.winner !== filters.party)) return true;
  if (filters.atRisk && !isAtRisk(projection.seat)) return true;
  return false;
}

/** a hexagon whose projected winner changes flips over one second, narrowing to 3% of its width and taking its new face half-way. */
export const FLIP = { ms: 1000, narrowest: 0.03 } as const;

/** a filtered-out hexagon is drawn at this opacity. */
export const DIMMED_OPACITY = 0.1;

/** margin bands are off unless the caller turns them on. */
export function hexState(projection: SeatProjection, filters: MapFilters, bands: boolean = false): HexState {
  const { seat, winner, gained } = projection;
  return {
    party: winner,
    gained: !projection.vacant && gained,
    strength: projection.vacant || gained || !bands ? 1 : BAND_STRENGTH[marginBand(seat.margin)],
    dimmed: isDimmed(projection, filters),
  };
}

/** Snapshot labels describe holdings rather than gains or historical margins. */
export function seatSublabel(projection: SeatProjection, assembly: boolean): string {
  if (projection.vacant) return 'Vacant';
  if (assembly) return projection.winner;
  return projection.gained ? 'GAIN' : fmt1(projection.seat.margin);
}

/** zoom limits and steps. */
export const ZOOM = { min: 0.5, max: 4, initial: 1, buttonFactor: 1.3, wheelStep: 0.1 } as const;

export function clampZoom(zoom: number): number {
  return Math.min(ZOOM.max, Math.max(ZOOM.min, zoom));
}

export function zoomIn(zoom: number): number {
  return clampZoom(zoom * ZOOM.buttonFactor);
}

export function zoomOut(zoom: number): number {
  return clampZoom(zoom / ZOOM.buttonFactor);
}

/** One scroll-wheel step with Ctrl or Cmd held changes the zoom by about 10%. */
export function wheelZoom(zoom: number, deltaY: number): number {
  if (deltaY === 0) return zoom;
  return clampZoom(zoom * (deltaY < 0 ? 1 + ZOOM.wheelStep : 1 - ZOOM.wheelStep));
}

/** panning is possible only while zoom is above 100%. */
export function canPan(zoom: number): boolean {
  return zoom > 1;
}

/** the zoom shown as a percentage. */
export function zoomPercent(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}

/** Stable id fragment for a seat name, used in test ids: "Narre Warren North" -> "narre-warren-north". */
export function seatSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** One decimal, no sign for positives, never "-0.0". */
export function fmt1(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return (rounded === 0 ? 0 : rounded).toFixed(1);
}

/** Bands always use the 2022 margin. */
export function marginBand(margin: number): MarginBand {
  if (margin < 3) return 'Marginal';
  if (margin < 6) return 'Fairly safe';
  if (margin < 10) return 'Safe';
  return 'Very safe';
}

/** The at-risk filter dims every seat whose 2022 margin is this or more. */
export const AT_RISK_BELOW = 6;

export function isAtRisk(seat: Seat): boolean {
  return seat.margin < AT_RISK_BELOW;
}

/**
 * The map's input for a set of winners: one entry per seat, in the order of the
 * seat data. With no winners given, every seat shows its 2022 result.
 */
export function projectSeats(winners: Readonly<Record<string, Party>> = {}, seats: readonly Seat[] = SEATS): SeatProjection[] {
  return seats.map((seat) => {
    const winner = winners[seat.name] ?? seat.winner;
    return { seat, winner, gained: winner !== seat.winner };
  });
}


// Colour rules that need no browser: contrast between two colours, the opaque tint
// that stands for a margin band and the text colour to set on a fill.

type Rgb = readonly [number, number, number];

/** "#336699" or "#fff" as red, green and blue from 0 to 255. */
export function parseColour(colour: string): Rgb {
  const hex = colour.trim().replace(/^#/, '');
  const full = hex.length === 3 ? hex.replace(/./g, (digit) => digit + digit) : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Not a hex colour: ${colour}`);
  return [0, 2, 4].map((at) => parseInt(full.slice(at, at + 2), 16)) as unknown as Rgb;
}

export function toHex([red, green, blue]: Rgb): string {
  return `#${[red, green, blue].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}

/** The colour as the browser reports it: "rgb(51, 102, 153)". */
export function toCssRgb(colour: string): string {
  return `rgb(${parseColour(colour).join(', ')})`;
}

/** Relative luminance, from 0 (black) to 1 (white), as WCAG defines it. */
export function luminance(colour: string): number {
  const [red, green, blue] = parseColour(colour).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG contrast ratio between two colours, from 1 to 21. */
export function contrast(one: string, other: string): number {
  const [lighter, darker] = [luminance(one), luminance(other)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * a colour at less than full strength, made by mixing it toward the panel
 * colour. The result is opaque, so nothing behind the hexagon shows through it.
 */
export function tint(colour: string, panel: string, strength: number): string {
  const from = parseColour(panel);
  const to = parseColour(colour);
  return toHex([0, 1, 2].map((at) => from[at] + (to[at] - from[at]) * strength) as unknown as Rgb);
}

export const TEXT_WHITE = '#ffffff';
export const TEXT_BLACK = '#000000';

/**
 * text on a fill is white or black, whichever contrasts more with it.
 * One of the two always reaches 4.58 to 1 or better.
 */
export function textOn(fill: string): string {
  return contrast(TEXT_WHITE, fill) >= contrast(TEXT_BLACK, fill) ? TEXT_WHITE : TEXT_BLACK;
}
