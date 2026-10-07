# Contributing

Thank you for wanting to help. This is a small project, so the contributions that land fastest are the focused ones: a clear bug report, a data correction with its source, or a pull request that changes one thing.

## Ways to help

- **Report a bug.** Use the [bug report form](https://github.com/14pete99/victorian-hex-map/issues/new?template=bug_report.yml). Say what you did, what you expected and what happened instead.
- **Correct the data.** Use the [data correction form](https://github.com/14pete99/victorian-hex-map/issues/new?template=data_correction.yml), or open a pull request. Either way it needs a link to the source.
- **Suggest an improvement.** Open an issue first for anything larger than a small fix, so the approach can be agreed before you write the code.
- **Report a security problem.** Do not open a public issue. Follow the [security policy](SECURITY.md).

## Correcting the data

The 2022 results come from the Victorian Electoral Commission (VEC), and the changes since then come from the VEC and the Parliament of Victoria. A correction needs a link to the page on one of those sites that shows the right figure.

[Data and sources](docs/data.md#correcting-the-data) has the steps. In short: change the VEC vote counts in `tests/fixtures/vec-2022-results.json` first, then `src/map/seats.ts`, and run `npm test`, which fails while the two disagree.

## Working on the code

You need Node 20.19+, 22.12+ or 24+.

```bash
git clone https://github.com/14pete99/victorian-hex-map.git
cd victorian-hex-map
npm install
npm run dev     # the demo, at http://127.0.0.1:5183
npm test        # the tests
```

[Developing](docs/development.md) describes the layout, the tests and the security checks. A few things to keep in mind:

- **`src/map/` is self-contained.** People copy that folder into their own projects, so it imports only React and its own files and stays at ten files. Tests go in `tests/`.
- **Rules live in `map.ts`.** Thresholds, label truncation, colour strength and zoom limits are plain functions there. `HexMap.tsx` only draws.
- **Seat positions are deliberate.** Do not change a seat's `col` or `row` unless your change is to the layout.
- **Spelling is Australian**, in code and in documentation: `colour`, `centre`, `neighbour`, `licence`.

## Opening a pull request

1. Branch from `develop` and open the pull request against `develop`. `main` holds the latest release.
2. Run `npm run check:release`. It runs the type check, the tests, the build and the dependency security checks.
3. If you changed how the map looks or responds, check it in a browser. The tests do not cover pointer events, the flip animation or zooming; [AGENTS.md](AGENTS.md) has a list to follow.
4. Update the documentation that describes what you changed: the files in `docs/`, and `AGENTS.md` if the checks there change.
5. Keep the pull request to one change, and say what it does and why.

## Licence

By contributing, you agree that your contribution is released under the project's [MIT licence](LICENSE).

Data is different. Add election data only from a source that allows reuse, and name the source. The 2022 results here are © Victorian Electoral Commission, used under Creative Commons Attribution 4.0, and that credit has to stay with them.
