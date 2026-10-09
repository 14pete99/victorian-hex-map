# Developing

How the repository is laid out, how to run and test it, and what to check before a release.

## Set up

Needs Node 20.19+, 22.12+ or 24+. `package.json` records this in its `engines` field.

```bash
npm install
npm run dev              # the demo, at http://127.0.0.1:5183 or the next free port
npm run typecheck        # type check src/ and tests/
npm test                 # the tests; no browser or network needed
npm run build            # type check, then a production build into dist/
npm run check:security   # npm audit and npm audit signatures; needs the network
npm run check:release    # type check, tests, build and security checks
```

## Layout

```
src/map/        The map: the folder people copy
  HexMap.tsx    The component and its zoom controls
  map.ts        Geometry, labels, colour strength, outlines, filters, zoom, pinch and pan limits
  seats.ts      The 88 seats
  assembly.ts   The house on 1 October 2026: changes since 2022 and their sources
  parties.ts    Party names and colours
  themes.ts     Panel, outline and vacancy colours for each theme
  water.ts      Bay tiles and their labels
  types.ts      Seat, Party, SeatProjection
  hex-map.css   Styles for the map
  index.ts      Exports
src/demo/       The demo page around the map
tests/          Tests, and the VEC vote counts the seat data is checked against
docs/           This documentation and the README screenshot
.github/        The CI and Pages workflows and the issue forms
```

[CONTRIBUTING.md](../CONTRIBUTING.md) and [SECURITY.md](../SECURITY.md) sit at the top level, where GitHub looks for them. `.gitattributes` keeps every text file on LF line endings.

Three rules keep the map easy to reuse.

- **`src/map/` is self-contained.** It imports only React and its own files, and it stays at ten files. Tests live in `tests/`.
- **Rules live in `map.ts`.** Thresholds, label truncation, colour strength and zoom limits are plain functions there. `HexMap.tsx` only draws.
- **Seat positions are deliberate.** Do not change a seat's `col` or `row` unless the change is to the layout.

## The grid

The grid has 13 columns, numbered 0 to 12 from west to east, and 12 rows, numbered 0 to 11 from north to south. Hexagons are pointy-topped, and those in odd-numbered rows sit half a column to the right.

Each seat's `col` and `row` in `seats.ts` set its position, and `hexCentre` in `map.ts` turns them into coordinates. Every seat needs a cell of its own, inside the grid and off the bay tiles in `water.ts`. The drawing is fitted to the seats and bay tiles with 20 units of padding.

## Tests

`npm test` runs every file in `tests/` once, with Vitest.

| File | What it checks |
| --- | --- |
| `seats.test.ts` | The seat and bay data: 88 seats, unique positions inside the grid and off the water, contest labels, the 2022 totals |
| `vec.test.ts` | Winners, runners-up and margins against the VEC vote counts in `fixtures/vec-2022-results.json` |
| `assembly.test.ts` | The 1 October 2026 snapshot: its totals, the vacancy, and an HTTPS source on an approved site for each change |
| `map.test.ts` | The rules in `map.ts`: geometry, labels, bands, filters, zoom, pinch and pan limits, colour contrast |
| `render.test.tsx` | The component's markup, rendered without a browser |
| `security.test.ts` | The security checks below |

The tests do not cover pointer events, the flip animation or zooming. Check those in a browser; [AGENTS.md](../AGENTS.md) has the list, written so that a person or an agent can follow it. Touch gestures need real touch input: a touch screen, or the device toolbar in Chrome DevTools.

## Security checks

`tests/security.test.ts` reads the source, the lockfile and the workflows, and fails unless:

- `src/map/` imports only React and its own files;
- the source has no raw-HTML, `eval`, network or browser-storage code;
- every external link is HTTPS, goes to an approved site and opens without a reference back to the page;
- the only runtime dependencies are React and React DOM, and no script runs on install;
- every locked package comes from the npm registry with an integrity hash;
- workflow actions are pinned to a full commit, and every workflow has read-only access unless a job asks for more. Only the job that publishes the demo does.

The test holds two allow-lists: the sites the source may link to, and the packages allowed to run an install script. Adding to either is a decision to make on purpose, not a way to get a test to pass.

`npm run check:security` adds the two checks that need the network: `npm audit` for known vulnerabilities and `npm audit signatures` for registry signatures.

## Before a release

1. Run `npm run check:release`.
2. Run the browser check in [AGENTS.md](../AGENTS.md) against the demo.
3. If the map's appearance changed, retake `docs/screenshot3-no-labels.png`, the README screenshot: the demo's map and controls in the dark theme at 100% zoom, with seat labels off and no seat selected.
4. Once the release is on `main`, publish the demo; see below.

## Continuous integration

`.github/workflows/ci.yml` runs the type check, tests, build and security checks on Node 22 and 24.

It is **not active**. As written it runs only when someone starts it by hand from the repository's Actions tab. To switch it on, uncomment the `pull_request`, `push` and `schedule` triggers at the top of the file.

## Publishing the demo

The demo is published with GitHub Pages at https://14pete99.github.io/victorian-hex-map/. `.github/workflows/pages.yml` runs the type check, the tests and the build, then deploys `dist/`.

It runs only when someone starts it by hand: from the Actions tab, or with

```bash
gh workflow run pages.yml
```

A push does not publish anything, so the site shows `main` as it was at the last run. GitHub deploys only from `main`.

The site sits under `/victorian-hex-map/`, not at the root of its host, so `vite.config.ts` sets `base: './'` to give the build relative asset paths.

`index.html` carries a `google-site-verification` tag. It proves to Google Search Console that the maintainer owns the published site; Google rechecks it from time to time, so removing it ends the verification.
