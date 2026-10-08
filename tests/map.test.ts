// The rules in map.ts and parties.ts: geometry, labels, bands, filters, zoom and colour.
import { describe, expect, it } from 'vitest';
import {
  AT_RISK_BELOW, BAND_STRENGTH, HEX, MAP_PADDING, PARTY_CODES, PARTY_COLOURS, SEATS, THEME_COLOURS, ZOOM,
  canPan, canPointAt, clampZoom, contrast, fmt1, hexCentre, hexState, hexVertices, highlightRings, isAtRisk, isDimmed, mapBounds, mapLabel, marginBand,
  neighbourCells, outlineEdges, outlineLoops, panLimit, parseColour, partyTextColour, pinchOf, pinchView, projectSeats, seatSlug, seatSublabel, settleView, textOn, tint, toHex,
  waterNameLines, wheelZoom, zoomIn, zoomOut, zoomPercent,
} from '../src/map';
import type { MapFilters, SeatProjection, Theme } from '../src/map';

const NO_FILTERS: MapFilters = { party: null, atRisk: false };
const THEMES: readonly Theme[] = ['light', 'dark'];
const seatNamed = (name: string) => {
  const seat = SEATS.find((entry) => entry.name === name);
  if (!seat) throw new Error(`No seat named ${name}`);
  return seat;
};

describe('grid geometry', () => {
  it('sets odd rows half a column to the right', () => {
    const width = Math.sqrt(3) * HEX.radius;
    expect(hexCentre(1, 0).x - hexCentre(0, 0).x).toBeCloseTo(width);
    expect(hexCentre(0, 1).x - hexCentre(0, 0).x).toBeCloseTo(width / 2);
    expect(hexCentre(0, 2).x).toBeCloseTo(hexCentre(0, 0).x);
    expect(hexCentre(0, 1).y - hexCentre(0, 0).y).toBeCloseTo(1.5 * HEX.radius);
  });

  it('lists six vertices at the given radius, the first at the top', () => {
    const vertices = hexVertices(100, 100);
    expect(vertices).toHaveLength(6);
    expect(vertices[0].x).toBeCloseTo(100);
    expect(vertices[0].y).toBeCloseTo(100 - HEX.radius);
    for (const vertex of vertices) expect(Math.hypot(vertex.x - 100, vertex.y - 100)).toBeCloseTo(HEX.radius);
  });

  it('pairs each neighbour with the opposite edge of the cell it came from', () => {
    for (const row of [4, 5]) {
      const cell = { col: 6, row };
      neighbourCells(cell).forEach((neighbour, edge) => {
        expect(neighbourCells(neighbour)[(edge + 3) % 6], `row ${row}, edge ${edge}`).toEqual(cell);
      });
    }
  });

  it('draws the seats as closed outline loops that use every boundary edge once', () => {
    const edges = outlineEdges(SEATS);
    const loops = outlineLoops(SEATS);
    expect(loops.reduce((sum, loop) => sum + loop.length, 0)).toBe(edges.length);
    for (const loop of loops) expect(loop.length).toBeGreaterThanOrEqual(6);
    // An isolated cell is six edges; two cells side by side share one and leave ten.
    expect(outlineEdges([{ col: 0, row: 0 }])).toHaveLength(6);
    expect(outlineEdges([{ col: 0, row: 0 }, { col: 1, row: 0 }])).toHaveLength(10);
  });

  it('fits the drawing to the seats and bays with padding on every side', () => {
    const bounds = mapBounds();
    expect(bounds.width).toBeCloseTo(850.6, 1);
    expect(bounds.height).toBeCloseTo(706, 1);
    const one = mapBounds([{ col: 0, row: 0 }]);
    expect(one.width).toBeCloseTo(Math.sqrt(3) * HEX.radius + 2 * MAP_PADDING);
    expect(one.height).toBeCloseTo(2 * HEX.radius + 2 * MAP_PADDING);
  });
});

describe('labels', () => {
  it('cuts names longer than nine characters to eight and an ellipsis', () => {
    expect(mapLabel('Melbourne')).toBe('Melbourne');
    expect(mapLabel('Albert Park')).toBe('Albert P…');
  });

  it('breaks a bay name where the longer line is shortest', () => {
    expect(waterNameLines('Port Phillip Bay')).toEqual(['Port', 'Phillip Bay']);
    expect(waterNameLines('Western Port Bay')).toEqual(['Western', 'Port Bay']);
    expect(waterNameLines('Bay')).toEqual(['Bay']);
  });

  it('formats margins to one decimal without a negative zero', () => {
    expect(fmt1(4)).toBe('4.0');
    expect(fmt1(0.25)).toBe('0.3');
    expect(fmt1(-0.04)).toBe('0.0');
  });

  it('makes test-id slugs from seat names', () => {
    expect(seatSlug('Narre Warren North')).toBe('narre-warren-north');
    expect(seatSlug('South-West Coast')).toBe('south-west-coast');
  });
});

describe('margin bands and filters', () => {
  it('bands margins at 3, 6 and 10 points', () => {
    expect([2.9, 3, 5.9, 6, 9.9, 10].map(marginBand)).toEqual(['Marginal', 'Fairly safe', 'Fairly safe', 'Safe', 'Safe', 'Very safe']);
  });

  it('treats 28 seats as below the at-risk margin', () => {
    expect(AT_RISK_BELOW).toBe(6);
    expect(SEATS.filter(isAtRisk)).toHaveLength(28);
  });

  it('draws full strength unless bands are on and the seat is unchanged', () => {
    const [albertPark] = projectSeats({}, [seatNamed('Albert Park')]);
    expect(hexState(albertPark, NO_FILTERS).strength).toBe(1);
    expect(hexState(albertPark, NO_FILTERS, true).strength).toBe(BAND_STRENGTH['Very safe']);
    const [gained] = projectSeats({ 'Albert Park': 'LIB' }, [seatNamed('Albert Park')]);
    expect(hexState(gained, NO_FILTERS, true)).toMatchObject({ party: 'LIB', gained: true, strength: 1 });
  });

  it('dims seats the party filter or the at-risk filter excludes', () => {
    const seats = projectSeats();
    const shown = (filters: MapFilters) => seats.filter((projection) => !isDimmed(projection, filters)).map((projection) => projection.seat.name);
    expect(shown({ party: 'GRN', atRisk: false })).toEqual(['Brunswick', 'Melbourne', 'Prahran', 'Richmond']);
    expect(shown({ party: null, atRisk: true })).toHaveLength(28);
    expect(shown(NO_FILTERS)).toHaveLength(88);
  });

  it('keeps a vacant seat out of every party filter and labels it Vacant', () => {
    const vacant: SeatProjection = { seat: seatNamed('Brunswick'), winner: 'GRN', gained: false, vacant: true };
    expect(isDimmed(vacant, { party: 'GRN', atRisk: false })).toBe(true);
    expect(isDimmed(vacant, NO_FILTERS)).toBe(false);
    expect(hexState(vacant, NO_FILTERS, true)).toMatchObject({ gained: false, strength: 1 });
    expect(seatSublabel(vacant, true)).toBe('Vacant');
    expect(seatSublabel(vacant, false)).toBe('Vacant');
  });

  it('labels a seat with its holder in a snapshot, otherwise with GAIN or its margin', () => {
    const [bass] = projectSeats({}, [seatNamed('Bass')]);
    const [bassGained] = projectSeats({ Bass: 'LIB' }, [seatNamed('Bass')]);
    expect(seatSublabel(bass, false)).toBe('0.2');
    expect(seatSublabel(bassGained, false)).toBe('GAIN');
    expect(seatSublabel(bassGained, true)).toBe('LIB');
  });
});

describe('projectSeats', () => {
  it('shows the 2022 result with no gains by default', () => {
    const seats = projectSeats();
    expect(seats).toHaveLength(88);
    expect(seats.every((projection) => projection.winner === projection.seat.winner && !projection.gained)).toBe(true);
  });

  it('marks a different winner as a gain and ignores names that match no seat', () => {
    const seats = projectSeats({ Bass: 'LIB', Northcote: 'GRN', Melbourne: 'GRN', 'No Such Seat': 'ALP' });
    expect(seats).toHaveLength(88);
    expect(seats.filter((projection) => projection.gained).map((projection) => projection.seat.name)).toEqual(['Bass', 'Northcote']);
  });
});

describe('highlight rings', () => {
  it('draws one ring for a pointed-at seat and three for a selected one', () => {
    expect(highlightRings(false).map((ring) => ring.role)).toEqual(['pointed']);
    expect(highlightRings(true).map((ring) => ring.role)).toEqual(['outer', 'gap', 'pointed']);
  });
});

describe('zoom', () => {
  it('steps by the button factor and stays within its limits', () => {
    expect(zoomPercent(zoomIn(ZOOM.initial))).toBe('130%');
    expect(zoomOut(zoomIn(1))).toBeCloseTo(1);
    expect(clampZoom(100)).toBe(ZOOM.max);
    expect(clampZoom(0)).toBe(ZOOM.min);
    expect(zoomIn(ZOOM.max)).toBe(ZOOM.max);
    expect(zoomOut(ZOOM.min)).toBe(ZOOM.min);
  });

  it('zooms about 10% per wheel step and pans only above 100%', () => {
    expect(wheelZoom(1, -100)).toBeCloseTo(1.1);
    expect(wheelZoom(1, 100)).toBeCloseTo(0.9);
    expect(wheelZoom(1, 0)).toBe(1);
    expect(canPan(1)).toBe(false);
    expect(canPan(1.3)).toBe(true);
  });

  it('lets a zoomed map move until a quarter of the panel still shows it, and centres it at 100% or below', () => {
    expect(panLimit(2, 400)).toBe(300);
    expect(settleView({ zoom: 2, x: 20, y: -30 }, 400, 300)).toEqual({ zoom: 2, x: 20, y: -30 });
    expect(settleView({ zoom: 2, x: 500, y: -500 }, 400, 300)).toEqual({ zoom: 2, x: 300, y: -225 });
    expect(settleView({ zoom: 1, x: 20, y: -30 }, 400, 300)).toEqual({ zoom: 1, x: 0, y: 0 });
    expect(settleView({ zoom: 0.5, x: 20, y: -30 }, 400, 300)).toEqual({ zoom: 0.5, x: 0, y: 0 });
  });
});

describe('pointing', () => {
  it('lets a mouse or a pen point at a seat, and not a finger', () => {
    expect(canPointAt('mouse')).toBe(true);
    expect(canPointAt('pen')).toBe(true);
    expect(canPointAt('touch')).toBe(false);
  });
});

describe('pinch', () => {
  it('is measured from the middle of the panel', () => {
    expect(pinchOf({ x: 100, y: 200 }, { x: 160, y: 280 }, { x: 150, y: 250 })).toEqual({ x: -20, y: -10, distance: 100 });
  });

  it('zooms by as much as the fingers spread and keeps the point between them in place', () => {
    const start = { zoom: 1.5, x: 30, y: -20 };
    const from = { x: 40, y: 10, distance: 100 };
    const to = { x: 40, y: 10, distance: 200 };
    const view = pinchView(start, from, to);
    expect(view.zoom).toBe(3);
    // The point of the map under the fingers is (finger - pan) / zoom, and must not change.
    expect((to.x - view.x) / view.zoom).toBeCloseTo((from.x - start.x) / start.zoom);
    expect((to.y - view.y) / view.zoom).toBeCloseTo((from.y - start.y) / start.zoom);
    expect(pinchView(view, to, from)).toEqual(start);
  });

  it('moves the map with the fingers when they move together', () => {
    const start = { zoom: 2, x: 30, y: -20 };
    expect(pinchView(start, { x: 40, y: 10, distance: 120 }, { x: 65, y: -5, distance: 120 })).toEqual({ zoom: 2, x: 55, y: -35 });
  });

  it('stops at the zoom limits, and ignores two fingers that start on the same spot', () => {
    const start = { zoom: 2, x: 5, y: 5 };
    expect(pinchView(start, { x: 0, y: 0, distance: 10 }, { x: 0, y: 0, distance: 1000 }).zoom).toBe(ZOOM.max);
    expect(pinchView(start, { x: 0, y: 0, distance: 1000 }, { x: 0, y: 0, distance: 10 }).zoom).toBe(ZOOM.min);
    expect(pinchView(start, { x: 0, y: 0, distance: 0 }, { x: 0, y: 0, distance: 50 })).toEqual(start);
  });
});

describe('colour', () => {
  it('parses and writes hex colours, and rejects anything else', () => {
    expect(parseColour('#336699')).toEqual([51, 102, 153]);
    expect(parseColour('#fff')).toEqual([255, 255, 255]);
    expect(toHex([51, 102, 153])).toBe('#336699');
    expect(() => parseColour('red')).toThrow();
    expect(() => parseColour('#12345')).toThrow();
  });

  it('mixes a tint between the panel colour and the full colour', () => {
    expect(tint('#ff0000', '#ffffff', 1)).toBe('#ff0000');
    expect(tint('#ff0000', '#ffffff', 0)).toBe('#ffffff');
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21);
  });

  it('keeps seat text at 4.5 to 1 or better on every party fill, theme and band strength', () => {
    for (const theme of THEMES) {
      for (const party of PARTY_CODES) {
        for (const strength of Object.values(BAND_STRENGTH)) {
          const fill = tint(PARTY_COLOURS[party][theme], THEME_COLOURS[theme].panel, strength);
          expect(contrast(textOn(fill), fill), `${party} ${theme} ${strength}`).toBeGreaterThanOrEqual(4.5);
        }
        expect(partyTextColour(party, theme)).toBe(textOn(PARTY_COLOURS[party][theme]));
      }
      const vacant = THEME_COLOURS[theme].vacant;
      expect(contrast(textOn(vacant), vacant), `vacant ${theme}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('gives a vacancy an off-white of its own, apart from the panel behind the map', () => {
    for (const theme of THEMES) {
      const { vacant, panel } = THEME_COLOURS[theme];
      const [red, green, blue] = parseColour(vacant);
      // Light and close to neutral: each channel high, and no two far apart.
      expect(Math.min(red, green, blue), theme).toBeGreaterThanOrEqual(220);
      expect(Math.max(red, green, blue) - Math.min(red, green, blue), theme).toBeLessThanOrEqual(12);
      expect(vacant, theme).not.toBe(panel);
      expect(textOn(vacant), theme).toBe('#000000');
    }
  });
});
