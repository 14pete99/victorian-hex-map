# Using the map

How to add the hexagon map to your own project, what each prop does, and what to watch for.

## Requirements

- React 19. The map was built and checked with React 19.3 and has not been checked on earlier versions.
- A bundler that handles `import './hex-map.css'` from a component file. Vite does.
- TypeScript with `"jsx": "react-jsx"` and `"moduleResolution": "bundler"`. The files import each other without file extensions.

The map has no other dependency. It makes no network calls and stores nothing in the browser.

## Add it to a project

1. Copy the whole of `src/map/` into your project, for example to `src/hex-map/`. Keep all ten files together and do not rename them; they import each other by relative path.
2. Copy `LICENSE` into the same folder. The MIT licence asks that the copyright notice and licence text stay with any copy.
3. Leave the comment at the top of `seats.ts` in place. It credits the Victorian Electoral Commission for the 2022 results, which its licence requires. See [Data and sources](data.md#licence-and-attribution).

Import everything from the folder's `index.ts`.

## Render it

```tsx
import { useMemo, useState } from 'react';
import { HexMap, projectSeats } from './hex-map';
import type { MapFilters } from './hex-map';

const SEATS_2022 = projectSeats();

export function SeatMap() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const filters = useMemo<MapFilters>(() => ({ party: null, atRisk: false }), []);
  return <HexMap seats={SEATS_2022} filters={filters} hovered={hovered} selected={selected} onHover={setHovered} onSelect={setSelected} />;
}
```

The map keeps no selection of its own. Your component stores `hovered` and `selected` and passes them back; if it does not, nothing is outlined.

## Props

The first six are required.

| Prop | Type | Meaning |
| --- | --- | --- |
| `seats` | `readonly SeatProjection[]` | One entry per seat to draw |
| `filters` | `MapFilters` | `{ party: Party \| null, atRisk: boolean }`. Seats a filter excludes are dimmed, not hidden. |
| `hovered` | `string \| null` | Name of the pointed-at seat, ringed once |
| `selected` | `string \| null` | Name of the selected seat, ringed three times |
| `onHover` | `(seat: string \| null) => void` | Called with the seat name when the pointer enters a hexagon and with `null` when it leaves |
| `onSelect` | `(seat: string) => void` | Called with the seat name on a click |
| `theme` | `'light' \| 'dark'` | Optional; `light` by default |
| `labels` | `boolean` | Optional; `true` by default. `false` hides the seat text and keeps the bay and corner labels. |
| `bands` | `boolean` | Optional; `false` by default. Tints unchanged seats by their 2022 margin. |
| `assembly` | `boolean` | Optional; `false` by default. Labels each seat with the party that holds it and turns margin tints off. |

`filters.atRisk` keeps only seats whose 2022 margin was under 6 points.

## What goes in `seats`

Each entry is a `SeatProjection`:

| Field | Type | Meaning |
| --- | --- | --- |
| `seat` | `Seat` | The seat's record from `SEATS` |
| `winner` | `Party` | The party whose colour the hexagon takes |
| `gained` | `boolean` | `true` when `winner` differs from the 2022 winner |
| `vacant` | `boolean`, optional | `true` when the seat has no holder |

Two ready-made sets are exported, and one function builds your own.

- **`projectSeats()`** returns the 2022 result.
- **`projectSeats(winners)`** returns the 2022 result with the seats you name changed. A changed seat is drawn as a gain.
- **`ASSEMBLY_SEATS`** is the house as it stood on 1 October 2026. Pass the `assembly` prop with it.

```ts
const seats = projectSeats({ Bass: 'LIB', Northcote: 'GRN' });
```

- Party codes are `ALP`, `LIB`, `NAT`, `GRN`, `ONP`, `IND` and `OTH`, listed in `PARTY_CODES`.
- Seat names must match `SEATS[].name` exactly, including capitals and hyphens: "South-West Coast", "Narre Warren North". A name that matches no seat is ignored without an error, so check your names against `SEATS`.

A vacant seat is drawn in an off-white, labelled "Vacant" and left out of every party filter. Its `winner` still holds the party that last won it, so leave vacant seats out when you count a party's seats.

## What the map draws

Seats are filled with their party's colour at full strength. With `bands` on, a seat that has not changed hands is tinted by its 2022 margin:

| Seat | Appearance |
| --- | --- |
| Margin under 3 | Full strength |
| Margin 3 to under 6 | 85% strength, with `bands` on |
| Margin 6 to under 10 | 70% strength, with `bands` on |
| Margin 10 or more | 55% strength, with `bands` on |
| Gained | The gaining party's full colour, with "GAIN" in place of the margin |
| Vacant | Off-white, labelled "Vacant" |
| Pointed at | One ring along the seat's edge |
| Selected | Three rings: outer, gap and edge |
| Excluded by a filter | 10% opacity |

- Seat text is black or white, whichever contrasts more with the fill. The contrast is at least 4.5 to 1 on every party colour and tint.
- A thin line marks each seat's edge and the map's perimeter.
- Port Phillip Bay and Western Port Bay are drawn as water tiles and cannot be pointed at or selected.
- Seat names longer than nine characters are cut to eight characters and an ellipsis.
- When a seat's winner changes, its hexagon flips over one second and takes its new colour and text half-way. The flip is skipped for people who have asked their system for reduced motion.

## Zoom and pan

- The zoom buttons step by a factor of 1.3, between 50% and 400%.
- The scroll wheel zooms only with Ctrl or Cmd held, so the page still scrolls normally.
- Above 100%, drag to pan.

## Colours

The colours come from two places, and each is changed differently.

**Seat fills are set in TypeScript.** The component works them out and applies them to each hexagon, so a stylesheet cannot override them.

- Party colours, one per theme: `PARTY_COLOURS` in `parties.ts`.
- The vacancy colour and the panel colour that margin tints are mixed toward: `THEME_COLOURS` in `themes.ts`.
- `partyColour(party, theme)` and `partyTextColour(party, theme)` give matching colours for your own legends and buttons.

**Everything around the seats is set in CSS.** `hex-map.css` declares custom properties on `.map`:

| Property | Sets |
| --- | --- |
| `--map-panel` | The panel behind the map |
| `--map-hairline` | The line along the edge of each seat and bay tile |
| `--map-outline` | The map's perimeter and the pointed-at and selected rings |
| `--map-ground` | The gap ring of a selected seat and the edge of a dimmed one |
| `--map-label` | The corner labels |
| `--water`, `--water-ink` | The bay tiles and their names |
| `--font-sans`, `--font-label` | The controls' font and the seat labels' font |
| `--float`, `--ink`, `--line`, `--surface-2`, `--focus` | The zoom controls |

Because they are declared on `.map` itself, setting them on a parent element has no effect. Override them with a rule that targets `.map` and comes later or is more specific:

```css
.my-page .map {
  --water: #d7ecff;
}
```

If you change `--map-panel`, change `THEME_COLOURS[theme].panel` to match, or the margin tints will be mixed toward the old colour.

## Sizing

The map takes the width of its container and sets its own height from the drawing's proportions, about 851 wide to 706 high. Give the container a width and do not set a height on the map. `.map` has `flex: 1`, so in a flex row it grows to fill the row.

## Things to watch for

- **Unstable props.** `HexMap` and each hexagon are memoised. A new `filters` object or a new `onHover` or `onSelect` function on every render redraws all 88 hexagons each time, and a new `seats` array repeats the layout work. Build `seats` once, wrap `filters` in `useMemo`, and pass stable functions such as state setters.
- **Class name clashes.** The stylesheet uses plain global class names: `.map`, `.map-viewport`, `.map-svg`, `.map-label`, `.zoom-controls`, `.zoom-level`, `.zoom-reset`, `.hex`, `.hex-*`, `.water`, `.water-tile`, `.water-name`, `.seats` and `.map-outline`. Search your project for these first. If any are in use, rename them in both `HexMap.tsx` and `hex-map.css`.
- **Keyboard and screen readers.** The hexagons respond to a pointer only, and the drawing is exposed to assistive technology as a single image. If your readers need to reach individual seats, give them another route, such as a list or a search box that sets `selected`.
- **Fixed text.** The "Mildura", "Gippsland", "Benambra" and "Geelong" labels and the drawing's accessible name are written into `HexMap.tsx`.

The following has not been checked; treat it as a starting point.

- **Frameworks with server components.** `HexMap` uses state and effects, so it must run as a client component. In the Next.js App Router, add `'use client'` at the top of `HexMap.tsx`.
- **Frameworks that restrict global CSS imports.** If yours rejects the CSS import inside a component, delete the `import './hex-map.css'` line from `HexMap.tsx` and import the stylesheet once from your application's entry point.

## Hooks for tests

Every hexagon has `data-testid="hex-<slug>"`. The slug is the seat name in lower case with each run of other characters replaced by a hyphen, so "Narre Warren North" becomes `hex-narre-warren-north`. `seatSlug` makes one.

Each hexagon also carries `data-seat`, `data-party`, `data-vacant`, `data-gained`, `data-strength`, `data-fill`, `data-ink`, `data-dimmed`, `data-active` and `data-selected`.
