# Guide for AI agents

This repository is a hexagon map of Victoria's 88 Legislative Assembly seats: a React component, its seat data and a demo page. This guide covers the two jobs an agent is usually given here: running the demo, and adding the map to another project. `README.md` and the files in `docs/` have the same material written for people.

## What is here

```
src/map/        The map. Self-contained: it imports only React and its own files.
  HexMap.tsx    The component and its zoom controls
  map.ts        Geometry, labels, colour strength, outlines, filters, zoom, pinch and pan limits
  seats.ts      The 88 seat records
  assembly.ts   Dated lower-house holdings and source records
  parties.ts    Party names and theme palettes
  themes.ts     Map surround colours
  water.ts      Bay tiles and their labels
  types.ts      Seat, Party, SeatProjection
  hex-map.css   Styles, imported by HexMap.tsx
  index.ts      Exports; import from here only
src/demo/       A demo page around the map. Not needed to reuse the map.
tests/          Automated tests (Vitest). Not needed to reuse the map.
docs/           Documentation for people, and the README screenshot.
.github/        The CI and Pages workflows and the issue forms. Neither runs on a push; see "Tests and release checks".
CONTRIBUTING.md, SECURITY.md   How to contribute and how to report a vulnerability.
```

There is no server code, network call, storage or runtime dependency beyond React. The checks are the type check, the tests, the build and the browser check below.

## Run the demo

Needs Node 20.19+, 22.12+ or 24+ (what Vite 8 and Vitest 4 support; `engines` in `package.json` records it).

```bash
npm install
npm run dev        # http://127.0.0.1:5183, or the next free port if that one is taken
npm run typecheck  # tsc --noEmit, for src/ and then tests/
npm test           # the automated tests, once, with no browser
npm run build      # type check, then production build into dist/
```

`npm run dev` does not exit. Run it in the background and stop it when you are done.

## Add the map to another project

### 1. Check the target project

- React 19. The map was built and checked with React 19.3; it has not been checked on earlier versions.
- A bundler that handles `import './hex-map.css'` from a component file. Vite does.
- TypeScript with `"jsx": "react-jsx"` and `"moduleResolution": "bundler"`. The files import each other without file extensions.

### 2. Copy the folder

Copy the whole of `src/map/` into the target project, for example to `src/hex-map/`. Keep all ten files together and do not rename them; they import each other by relative path.

Copy `LICENSE` into the same folder. The licence is MIT, and its one condition is that the copyright notice and licence text stay with any copy.

Leave the comment at the top of `seats.ts` in place. The 2022 results in that file are the Victorian Electoral Commission's, used under Creative Commons Attribution 4.0, and the comment is the credit that licence requires.

### 3. Render it

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

The original six props are required. Five display props are optional: `theme` (`light` by default, or `dark`), `labels` (`true` by default), `bands` (`false` by default), `assembly` (`false` by default), and `metroOutline` (`false` by default). With `assembly`, labels show the holding party and margin bands are disabled. With `metroOutline`, one line is drawn round the metropolitan seats as a group: every seat whose `region` is not one of `REGIONAL_REGIONS` in `map.ts`. `ASSEMBLY_SEATS` supplies the fixed 1 October 2026 holdings; `SeatProjection.vacant` marks a vacancy and excludes it from party filters and totals.

| Prop | Type | Meaning |
| --- | --- | --- |
| `seats` | `readonly SeatProjection[]` | One entry per seat: `{ seat, winner, gained }` |
| `filters` | `MapFilters` | `{ party: Party \| null, atRisk: boolean }`. Excluded seats are dimmed, not hidden. |
| `hovered` | `string \| null` | Name of the pointed-at seat, outlined on top |
| `selected` | `string \| null` | Name of the clicked seat, outlined on top |
| `onHover` | `(seat: string \| null) => void` | Called with the seat name when a mouse or pen enters a hexagon and `null` on leave. Never called with a seat for a touch. |
| `onSelect` | `(seat: string) => void` | Called with the seat name on click |

The map keeps no selection state of its own. If the host does not store `hovered` and `selected` and pass them back, nothing is outlined.

### 4. Show a result other than 2022

`projectSeats(winners)` takes a record of seat name to party code and returns the `seats` prop. A seat whose winner differs from its 2022 winner is drawn as a gain. Seats left out keep their 2022 result.

```ts
const seats = projectSeats({ Bass: 'LIB', Northcote: 'GRN' });
```

- Party codes are `ALP`, `LIB`, `NAT`, `GRN`, `ONP`, `IND`, `OTH` (`PARTY_CODES` in `types.ts`).
- Seat names must match `SEATS[].name` exactly, including capitals and hyphens ("South-West Coast", "Narre Warren North"). A name that matches no seat is ignored without an error, so check names against `SEATS` before calling.

### 5. Check it in a browser

The demo's only seat view is **Lower house · 1 October 2026**. Check:

- 88 `g.hex` elements: 54 `ALP`, 20 `LIB`, 9 `NAT`, 2 `GRN`, 2 `IND`, and 1 `vacant` by `data-party`.
- Prahran is Liberal; Ringwood and South Barwon are Independent. Brunswick has `data-vacant="true"`, the off-white vacancy fill (`#fbfaf6` in the light theme, `#e8e6df` in the dark) and, with seat labels on, a "Vacant" label. Its seat card shows a "Vacant" pill in the same colour and a note recording the member's death.
- The demo starts with seat labels off. With Seat labels pressed, labels show holding party codes, with no "GAIN" or margin labels. All 88 fills have strength 1. Seat cards show the snapshot holding, with historical facts explicitly labelled 2022.
- Greens filtering leaves Melbourne and Richmond undimmed; Independent filtering leaves Ringwood and South Barwon. The historical margin filter leaves 28 seats undimmed.
- Theme, labels, selection and zoom controls work. There is no scenario selector or margin-band toggle in this snapshot demo.
- The row under the map holds the Metro outline button and then the margin filter. Pressing Metro outline adds one `[data-testid="metro-outline"]` holding two paths with the same `d`: a black edge and a white line on it, in one loop round 64 seats. It is absent until the button is pressed, and it sits under the pointed-at and selected rings.
- Above 100% zoom, dragging pans the map and a click still selects a seat. Pressing on the map and releasing outside it leaves `data-pan-x` and `data-pan-y` on `[data-testid="map-viewport"]` unchanged when the pointer comes back with no button held.
- With touch input: at 100% one finger scrolls the page, and above 100% it pans the map by as far as it moves. A two-finger pinch changes `data-zoom` on `[data-testid="map"]` at any zoom, keeps the seat between the fingers in place and leaves `visualViewport.scale` at 1. This needs real touch input: a touch screen, or the device toolbar in Chrome DevTools, where Shift-drag pinches. A tool that sends mouse clicks while touch emulation is on does not exercise it.

The reusable component also retains election-result support. In a separate browser harness using `projectSeats()` without `assembly`, check the following baseline behaviour:

- 88 elements matching `g.hex`, and no console errors.
- By `data-party`: 56 `ALP`, 19 `LIB`, 9 `NAT`, 4 `GRN`.
- All 88 hexagons have `data-strength="1"` by default. There are no marginal, independent or gain outlines.
- 12 `.water-tile` elements, two `.water-name` labels, four `.map-label` corner labels and one `[data-testid="map-outline"]`. There is no `[data-testid="metro-outline"]` unless `metroOutline` is passed.
- Clicking `[data-testid="hex-bass"]` calls `onSelect('Bass')`, and one `[data-testid="hex-highlight"]` appears once the host passes `selected="Bass"` back. The selected highlight has three `[data-testid="hex-highlight-ring"]` children; a hover-only highlight has one.
- With `filters.party` set to `GRN`, the four hexagons with `data-dimmed="false"` are Brunswick, Melbourne, Prahran and Richmond. With `filters.atRisk` on, 28 hexagons are not dimmed.
- The component display props toggle dark theme, seat labels and margin bands. With bands on, Albert Park has `data-strength="0.55"`; hiding seat labels retains water and corner labels. Dark theme gives Bass `data-fill="#e51f30"`; light theme gives `#e01f2f`.
- Changing the winner prop flips a seat over one second, showing the new fill and "GAIN" halfway through; reduced motion skips the flip.
- `[data-testid="zoom-in"]` changes `[data-testid="zoom-level"]` from `100%` to `130%`.

Every hexagon has `data-testid="hex-<slug>"`, where the slug is the seat name in lower case with each run of other characters replaced by a hyphen (`seatSlug` in `map.ts`). Each also carries `data-seat`, `data-party`, `data-gained`, `data-strength`, `data-fill`, `data-ink`, `data-dimmed`, `data-active` and `data-selected`.

## Things that go wrong

- **Unstable props.** `HexMap` and each hexagon are memoised. A new `filters` object or a new `onHover` or `onSelect` function on every render redraws all 88 hexagons each time, and a new `seats` array repeats the layout work. Build `seats` at module level or with `useMemo`, build `filters` with `useMemo`, and pass stable functions such as state setters.
- **Class name clashes.** `hex-map.css` uses plain global class names: `.map`, `.map-viewport`, `.map-svg`, `.map-label`, `.zoom-controls`, `.zoom-level`, `.zoom-reset`, `.hex`, `.hex-*`, `.water`, `.water-tile`, `.water-name`, `.seats`, `.map-outline`, `.metro-outline` and `.metro-outline-*`. Search the target project for these before copying. If any are in use, rename them in both `HexMap.tsx` and `hex-map.css`.
- **Sizing.** The map takes the width of its container and sets its own height from the drawing's proportions, about 851 wide to 706 high. Give the container a width; do not set a height on the map. `.map` has `flex: 1`, so in a flex row it grows to fill the row.
- **Restyling.** Seat fills are set in TypeScript and applied to each hexagon, so CSS cannot override them: party colours are `PARTY_COLOURS` in `parties.ts`, and the vacancy colour and the panel colour that margin tints are mixed toward are `THEME_COLOURS` in `themes.ts`. Everything around the seats uses custom properties declared on `.map` itself (`--map-panel`, `--map-hairline`, `--map-outline`, `--map-ground`, `--map-label`, `--water`, `--water-ink`, `--metro-line`, `--metro-edge`, `--font-sans` and `--font-label`). Setting them on a parent has no effect. Override them with a rule that targets `.map` and comes later or is more specific, for example `.my-page .map { --water: #d7ecff; }`. If `--map-panel` changes, change `THEME_COLOURS[theme].panel` to match.
- **Zoom and pan.** The scroll wheel zooms only with Ctrl or Cmd held, so the page still scrolls normally. Dragging pans only above 100% zoom.
- **Touch.** A two-finger pinch zooms the map, never the page. At 100% or below one finger scrolls the page; above 100% it pans the map, so the page cannot be scrolled from the map until the reader zooms back out or presses Reset. Both depend on the `touch-action` values `hex-map.css` sets on `.map-viewport` (`pan-x pan-y`, and `none` above 100%). `.zoom-controls` has `manipulation`, so two quick taps on a zoom button are two presses and never a double-tap that magnifies the page. Do not override them.
- **Hover and touch.** A touch does not point at a seat: `onHover` is called with a seat only for a mouse or pen (`canPointAt` in `map.ts`). Keep it that way. Safari on an iPhone sends no click for a tap that makes a link or button appear, so a page that shows one for the pointed-at seat would make that seat impossible to select there. The demo's seat card did this for the seats that carry a source link.
- **Fixed text.** The "Mildura", "Gippsland", "Benambra" and "Geelong" labels and the SVG's `aria-label` are written into `HexMap.tsx`. The second line is the holding party when `assembly` is on, otherwise the seat's 2022 margin or "GAIN". A vacancy always reads "Vacant".

The following has not been checked in this repository; treat it as a starting point:

- **Frameworks with server components.** `HexMap` uses state and effects, so it must run as a client component. In the Next.js App Router, add `'use client'` at the top of `HexMap.tsx`.
- **Frameworks that restrict global CSS imports.** If the framework rejects the CSS import inside a component, delete the `import './hex-map.css'` line from `HexMap.tsx` and import the stylesheet once from the application's entry point.

## Tests and release checks

```bash
npm test                 # every test in tests/, once; no browser or network
npm run check:security   # npm audit, then npm audit signatures; needs the network
npm run check:release    # type check, tests, build and security checks; run before a release
```

| File | What it checks |
| --- | --- |
| `tests/seats.test.ts` | Seat and water data: 88 seats, unique positions inside the grid and off the water, contests, 2022 totals |
| `tests/vec.test.ts` | Winners, runners-up and margins against the VEC vote counts in `tests/fixtures/vec-2022-results.json` |
| `tests/assembly.test.ts` | The dated snapshot: totals, the vacancy, and an HTTPS source on an approved site for each change |
| `tests/map.test.ts` | The rules in `map.ts`: geometry, labels, bands, filters, zoom, pinch and pan limits, colour contrast |
| `tests/render.test.tsx` | The component's markup, rendered without a browser |
| `tests/security.test.ts` | Imports, forbidden APIs, external links, dependencies, the lockfile and the workflows |

- Tests live in `tests/`, never in `src/map/`, so the folder people copy stays at ten files.
- `tests/security.test.ts` holds allow-lists: the sites the source may link to, and the packages allowed an install script. Adding an entry is a decision for the maintainer, not a way to make a test pass.
- The tests do not cover pointer events, the flip animation or zooming. The browser check above still applies.
- `.github/workflows/ci.yml` is deliberately not active: its only trigger is `workflow_dispatch`. Do not uncomment the other triggers unless asked. Actions in it are pinned to full commit SHAs; keep them pinned when updating.
- `.github/workflows/pages.yml` publishes the demo to GitHub Pages at https://14pete99.github.io/victorian-hex-map/. Its only trigger is also `workflow_dispatch`, so a push publishes nothing. Do not add a trigger or start a run unless asked. Its `deploy` job is the one job with write access (`pages` and `id-token`); the same pinning rule applies.
- The published demo sits under `/victorian-hex-map/`, so `vite.config.ts` sets `base: './'`. Do not remove it.
- The `google-site-verification` tag in `index.html` is the maintainer's proof of ownership for Google Search Console. Do not remove or change it.
- The demo is also served at https://ioracing.com/vic-seats-demo/, built by that site's repository from a pinned commit of this one. That address is the canonical copy: `index.html` names it in a `rel="canonical"` link. Do not change the link unless asked.
- ioracing.com serves the page under a Content-Security-Policy that allows scripts, styles and images from its own origin only. Do not add an inline `<script>` or `<style>`, a `style` attribute in `index.html`, or anything loaded from another site.
- The introduction is written twice: inside `#root` in `index.html`, for crawlers that run no script, and under "About this map" in `Demo.tsx`. Change both together.

## Rules for changing this repository

- **Seat data.** Do not change a seat's `col` or `row` unless the task is to change the layout. Every seat needs a unique position, within columns 0 to 12 and rows 0 to 11, without overlapping the water cells. Do not change a name, winner, runner-up or margin to make something look right.
- **Data sources.** The 2022 winners, runners-up and margins are the Victorian Electoral Commission's, and `tests/fixtures/vec-2022-results.json` holds the vote counts they were checked against. To correct one, change the fixture from the VEC page first, then `seats.ts`; `npm test` fails while the two disagree. Do not add a field to a seat without a source the README can cite. Keep the attribution comment in `seats.ts`, and do not describe the data as official.
- **Rules live in `map.ts`.** Thresholds, label truncation, colour strength and zoom limits are plain functions there; `HexMap.tsx` only draws. Keep it that way.
- **`src/map/` stays self-contained.** It must not import from `src/demo/` or anything outside its own folder, and must not gain a dependency.
- **Before finishing a change:** run `npm run typecheck`, `npm test` and `npm run build`, then open the demo and run the browser check above.
- **Documentation.** `README.md` is the page GitHub shows, written for people meeting the project for the first time; keep it short. Reference material goes in `docs/`: `using-the-map.md` for props and behaviour, `data.md` for sources and method, `development.md` for layout, tests and releases. When behaviour changes, update the matching file there and this guide. `docs/screenshot4.png` is the README screenshot: the demo's map and controls in the dark theme at 100% zoom, with seat labels off and no seat selected.
