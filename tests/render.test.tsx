// The component's markup, rendered on the server. No browser is involved, so pointer events,
// the flip animation and zooming are left to the browser check in AGENTS.md.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ASSEMBLY_SEATS, HexMap, THEME_COLOURS, projectSeats } from '../src/map';
import type { HexMapProps, MapFilters } from '../src/map';

const NO_FILTERS: MapFilters = { party: null, atRisk: false };
const ignore = () => {};

function render(props: Partial<HexMapProps> = {}): string {
  return renderToStaticMarkup(<HexMap seats={projectSeats()} filters={NO_FILTERS} hovered={null} selected={null} onHover={ignore} onSelect={ignore} {...props} />);
}

const count = (markup: string, text: string) => markup.split(text).length - 1;

/** The opening tag of each hexagon, with its data attributes. Its class is "hex", alone or with modifiers. */
const hexTags = (markup: string) => markup.match(/<g class="hex(?: [^"]*)?"[^>]*>/g) ?? [];
const attribute = (tag: string, name: string) => tag.match(new RegExp(` ${name}="([^"]*)"`))?.[1];
const seatsWhere = (markup: string, name: string, value: string) =>
  hexTags(markup).filter((tag) => attribute(tag, name) === value).map((tag) => attribute(tag, 'data-seat'));

describe('HexMap, 2022 result', () => {
  const markup = render();

  it('draws 88 hexagons, the bays, the corner labels and one outline', () => {
    expect(hexTags(markup)).toHaveLength(88);
    expect(count(markup, 'class="water-tile"')).toBe(12);
    expect(count(markup, 'class="water-name"')).toBe(2);
    expect(count(markup, 'class="map-label')).toBe(4);
    expect(count(markup, 'data-testid="map-outline"')).toBe(1);
  });

  it('colours seats by their 2022 winner at full strength, with no gains', () => {
    expect(seatsWhere(markup, 'data-party', 'ALP')).toHaveLength(56);
    expect(seatsWhere(markup, 'data-party', 'LIB')).toHaveLength(19);
    expect(seatsWhere(markup, 'data-party', 'NAT')).toHaveLength(9);
    expect(seatsWhere(markup, 'data-party', 'GRN')).toHaveLength(4);
    expect(seatsWhere(markup, 'data-strength', '1')).toHaveLength(88);
    expect(seatsWhere(markup, 'data-gained', 'true')).toHaveLength(0);
    expect(count(markup, 'data-testid="hex-highlight"')).toBe(0);
  });

  it('uses the theme palette for fills', () => {
    const fillOfBass = (html: string) => attribute(hexTags(html).find((tag) => attribute(tag, 'data-seat') === 'Bass') ?? '', 'data-fill');
    expect(fillOfBass(markup)).toBe('#e01f2f');
    expect(fillOfBass(render({ theme: 'dark' }))).toBe('#e51f30');
  });

  it('tints unchanged seats by margin band when bands are on', () => {
    const banded = render({ bands: true });
    expect(seatsWhere(banded, 'data-strength', '0.55')).toContain('Albert Park');
    expect(seatsWhere(banded, 'data-strength', '1')).toContain('Bass');
  });

  it('labels a changed winner as a gain', () => {
    const changed = render({ seats: projectSeats({ Bass: 'LIB' }) });
    expect(seatsWhere(changed, 'data-gained', 'true')).toEqual(['Bass']);
    expect(changed).toContain('GAIN');
  });

  it('rings a selected seat three times and a pointed-at seat once', () => {
    expect(count(render({ selected: 'Bass' }), 'data-testid="hex-highlight-ring"')).toBe(3);
    expect(count(render({ hovered: 'Bass' }), 'data-testid="hex-highlight-ring"')).toBe(1);
    expect(count(render({ selected: 'Bass', hovered: 'Bass' }), 'data-testid="hex-highlight"')).toBe(1);
  });

  it('dims the seats a filter excludes', () => {
    expect(seatsWhere(render({ filters: { party: 'GRN', atRisk: false } }), 'data-dimmed', 'false')).toEqual(['Brunswick', 'Melbourne', 'Prahran', 'Richmond']);
    expect(seatsWhere(render({ filters: { party: null, atRisk: true } }), 'data-dimmed', 'false')).toHaveLength(28);
  });

  it('hides seat text but keeps bay and corner labels when labels are off', () => {
    const unlabelled = render({ labels: false });
    expect(count(unlabelled, 'class="hex-name"')).toBe(0);
    expect(count(unlabelled, 'class="hex-sub')).toBe(0);
    expect(count(unlabelled, 'class="water-name"')).toBe(2);
    expect(count(unlabelled, 'class="map-label')).toBe(4);
  });
});

describe('HexMap, assembly snapshot', () => {
  const markup = render({ seats: ASSEMBLY_SEATS, assembly: true });

  it('colours seats by their holder and shows the vacancy', () => {
    expect(seatsWhere(markup, 'data-party', 'ALP')).toHaveLength(54);
    expect(seatsWhere(markup, 'data-party', 'LIB')).toHaveLength(20);
    expect(seatsWhere(markup, 'data-party', 'NAT')).toHaveLength(9);
    expect(seatsWhere(markup, 'data-party', 'GRN')).toEqual(['Melbourne', 'Richmond']);
    expect(seatsWhere(markup, 'data-party', 'IND')).toEqual(['Ringwood', 'South Barwon']);
    expect(seatsWhere(markup, 'data-party', 'vacant')).toEqual(['Brunswick']);
    expect(seatsWhere(markup, 'data-vacant', 'true')).toEqual(['Brunswick']);
  });

  it('fills the vacancy with the theme vacancy colour', () => {
    expect(seatsWhere(markup, 'data-fill', THEME_COLOURS.light.vacant)).toEqual(['Brunswick']);
    const dark = render({ seats: ASSEMBLY_SEATS, assembly: true, theme: 'dark' });
    expect(seatsWhere(dark, 'data-fill', THEME_COLOURS.dark.vacant)).toEqual(['Brunswick']);
  });

  it('labels seats with their holder, never with GAIN or a margin band', () => {
    expect(markup).not.toContain('GAIN');
    expect(markup).toContain('>Vacant<');
    expect(seatsWhere(render({ seats: ASSEMBLY_SEATS, assembly: true, bands: true }), 'data-strength', '1')).toHaveLength(88);
  });

  it('leaves the vacancy out of party filters', () => {
    const filtered = render({ seats: ASSEMBLY_SEATS, assembly: true, filters: { party: 'GRN', atRisk: false } });
    expect(seatsWhere(filtered, 'data-dimmed', 'false')).toEqual(['Melbourne', 'Richmond']);
  });
});

describe('HexMap, edge inputs', () => {
  it('renders with no seats or a single seat', () => {
    expect(hexTags(render({ seats: [] }))).toHaveLength(0);
    expect(hexTags(render({ seats: projectSeats().slice(0, 1) }))).toHaveLength(1);
  });
});
