# Data and sources

What the map's data records, where each figure comes from, how it was checked and how to correct it.

None of this is an official record. For anything that matters, use the Victorian Electoral Commission's published results.

## What is recorded

`src/map/seats.ts` holds one record for each of the 88 seats:

| Field | Meaning | Source |
| --- | --- | --- |
| `name` | The district's name | Victorian Electoral Commission (VEC) |
| `winner` | The party that won the seat in 2022 | VEC |
| `runnerUp` | The party that came second | VEC |
| `margin` | The winner's margin in percentage points | Worked out from VEC counts, as described below |
| `contest` | A label for the two sides, such as "Labor v Coalition" | This project |
| `region` | A grouping of nearby seats, such as "Outer East" | This project |
| `col`, `row` | The seat's position on the map | This project |

`src/map/assembly.ts` holds the state of the house on 1 October 2026, as the changes since the 2022 election.

## The 2022 results

The winners, runners-up and margins come from the VEC's [2022 State election results](https://www.vec.vic.gov.au/results/state-election-results/2022-state-election-results). The election in Narracan was held later, so its figures come from the VEC's [2023 supplementary election results](https://www.vec.vic.gov.au/results/state-election-results/state-by-elections-timeline/narracan-district-supplementary-election-results).

### How a margin is worked out

A margin is the winner's share of the last two candidates' votes after the distribution of preferences, less 50, rounded to one decimal place. Ivanhoe is an example: 25,476 votes to 15,123 is 62.75% to the winner, a margin of 12.75, recorded as 12.8.

The last two candidates' votes come from one of two VEC counts.

- **The official count, for 49 districts.** The distribution of preferences ran until two candidates were left, and the result is on the district's results page.
- **The indicative count, for 39 districts.** The official count ended with more than two candidates still in it, because one already had a majority. In 2023 the VEC ran a [full distribution of preferences](https://www.vec.vic.gov.au/results/electoral-statistics/state-election-statistics/full-preference-distributions) for these districts. The VEC describes those counts as indicative and for information only.

The VEC also publishes an early two-candidate-preferred count for each district. It is not used here, because the distribution of preferences replaces it and the two can differ, in a few districts by close to a point or more.

### How it was checked

On 7 October 2026 every winner, runner-up and margin was compared with those VEC counts, and all 88 agree.

The vote counts used are saved in `tests/fixtures/vec-2022-results.json`, with the kind of count each came from. `tests/vec.test.ts` works each margin out again from them, and `npm test` fails if `seats.ts` stops agreeing.

As a second check the data was compared with the post-election pendulum on [Wikipedia](https://en.wikipedia.org/wiki/2022_Victorian_state_election). 87 seats agree. Wikipedia gives Ivanhoe as 13.0, where the VEC count gives 12.75.

## The house on 1 October 2026

The snapshot starts from the 2022 result and applies four changes. Each has a note and a source link in `assembly.ts`, and the demo shows both on the seat's card.

| Seat | 2022 | 1 October 2026 | Why | Source |
| --- | --- | --- | --- | --- |
| Prahran | Greens | Liberal | The Liberal candidate won the by-election on 8 February 2025 | VEC |
| Ringwood | Labor | Independent | The member, elected for Labor, sits as an Independent | Parliament of Victoria |
| South Barwon | Labor | Independent | The member, elected for Labor, sits as an Independent | Parliament of Victoria |
| Brunswick | Greens | Vacant | The member died on 19 September 2026 | Parliament of Victoria |

That gives Labor 54, Liberal 20, Nationals 9, Greens 2, Independent 2 and one vacancy.

The snapshot is a dated record. It does not update itself, and a seat that changes hands after 1 October 2026 is not shown.

## Correcting the data

To correct a 2022 winner, runner-up or margin:

1. Find the figure on the VEC page for the district.
2. Change the district's entry in `tests/fixtures/vec-2022-results.json` to match the VEC's vote counts.
3. Change `src/map/seats.ts` to match.
4. Run `npm test`. It fails while the two disagree.

To record a change in the house, add an entry to `ASSEMBLY_CHANGES` in `src/map/assembly.ts` with a note and a link to a primary source. The tests accept links to the VEC and the Parliament of Victoria.

Please do not add a field to a seat without a source that can be cited here.

## Licence and attribution

The 2022 election results in this repository are the winners, runners-up and margins in `src/map/seats.ts` and the vote counts in `tests/fixtures/vec-2022-results.json`. They are:

> © Victorian Electoral Commission

They are used under the [Creative Commons Attribution 4.0 International licence](https://creativecommons.org/licenses/by/4.0/), which the VEC applies to material on its website. The VEC's [copyright statement](https://www.vec.vic.gov.au/legal) sets out its terms.

Changes made here: party names are shortened to codes, and margins are worked out and rounded as described above. The vote counts in the fixture are unchanged.

If you pass the data on, keep that credit with it. The notice at the top of `seats.ts` carries it, so leave the notice in place when you copy the file. The VEC has not endorsed this project.

Everything else in the repository, including the map layout, regions and contest labels, is under the [MIT licence](../LICENSE).
