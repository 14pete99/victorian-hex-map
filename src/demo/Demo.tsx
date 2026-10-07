// Demo page: the fixed lower-house snapshot, with filters and a seat card.
import { useMemo, useState } from 'react';
import { ASSEMBLY_CHANGES, ASSEMBLY_DATE, ASSEMBLY_LABEL, ASSEMBLY_SEATS, HexMap, PARTIES, PARTY_CODES, THEME_COLOURS, fmt1, marginBand, partyColour, partyTextColour, textOn } from '../map';
import type { MapFilters, Party, SeatProjection, Theme } from '../map';

/** The filter offers the parties that hold a seat. */
const FILTER_PARTIES = PARTY_CODES.filter((party) => ASSEMBLY_SEATS.some((projection) => !projection.vacant && projection.winner === party));
const SEAT_TOTALS = FILTER_PARTIES.map((party) => ({ party, count: ASSEMBLY_SEATS.filter((projection) => !projection.vacant && projection.winner === party).length }));
const VACANCIES = ASSEMBLY_SEATS.filter((projection) => projection.vacant).length;

function PartyPill({ party, theme }: { party: Party; theme: Theme }) {
  return (
    <span className="pill" style={{ backgroundColor: partyColour(party, theme), color: partyTextColour(party, theme) }} title={PARTIES[party].name}>
      {party}
    </span>
  );
}

/** A seat with no holder, in the map's vacancy colour. */
function VacantPill({ theme }: { theme: Theme }) {
  const fill = THEME_COLOURS[theme].vacant;
  return (
    <span className="pill pill--vacant" data-testid="seat-card-vacant" style={{ backgroundColor: fill, color: textOn(fill) }}>
      Vacant
    </span>
  );
}

function SeatCard({ projection, theme }: { projection: SeatProjection | undefined; theme: Theme }) {
  if (!projection) {
    return (
      <section className="card seat-card seat-card--empty" data-testid="seat-card" aria-label="Seat card">
        <p className="eyebrow">Seat</p>
        <p className="seat-card-prompt">Point at a seat on the map, or click one to keep it here.</p>
      </section>
    );
  }
  const { seat } = projection;
  const change = ASSEMBLY_CHANGES[seat.name];
  return (
    <section className="card seat-card" data-testid="seat-card" data-seat={seat.name} aria-label="Seat card">
      <p className="eyebrow">Holding · {ASSEMBLY_DATE}</p>
      <h3 className="seat-card-name">{seat.name}</h3>
      <div className="seat-card-parties">
        {projection.vacant ? <VacantPill theme={theme} /> : <PartyPill party={projection.winner} theme={theme} />}
      </div>
      <p className="seat-card-note">{change?.note ?? 'Party holding unchanged since the 2022 election.'}</p>
      {change && <a className="seat-card-source" href={change.source} target="_blank" rel="noreferrer">Source record</a>}
      <dl className="facts">
        <div>
          <dt>2022 margin</dt>
          <dd>{fmt1(seat.margin)}%</dd>
        </div>
        <div>
          <dt>2022 status</dt>
          <dd>{marginBand(seat.margin)}</dd>
        </div>
        <div>
          <dt>2022 contest</dt>
          <dd>
            {PARTIES[seat.winner].name} v {PARTIES[seat.runnerUp].name}
          </dd>
        </div>
        <div>
          <dt>Region</dt>
          <dd>{seat.region}</dd>
        </div>
      </dl>
    </section>
  );
}

export function Demo() {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [atRisk, setAtRisk] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [labels, setLabels] = useState(true);
  const filters = useMemo<MapFilters>(() => ({ party, atRisk }), [party, atRisk]);
  // A pointed-at seat takes precedence over the selected seat.
  const shownSeat = hovered ?? selected;
  const shown = shownSeat ? ASSEMBLY_SEATS.find((projection) => projection.seat.name === shownSeat) : undefined;

  return (
    <div className="app" data-theme={theme}>
      <header className="masthead">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <polygon points="30,16 23,28.1 9,28.1 2,16 9,3.9 23,3.9" />
          </svg>
          <span>
            Victorian <b>Hexagon Map</b>
          </span>
        </div>
      </header>
      <main className="workspace">
        <div className="titles">
          <p className="eyebrow">{ASSEMBLY_LABEL}</p>
          <h1>Victorian lower house</h1>
          <p className="subtitle">As at {ASSEMBLY_DATE}, 88 seats, 45 required for majority</p>
          <ul className="seat-totals" aria-label="Seats by party">
            {SEAT_TOTALS.map(({ party: code, count }) => <li key={code}><span className="dot" style={{ backgroundColor: partyColour(code, theme) }} aria-hidden="true" />{PARTIES[code].name} <b data-testid={`summary-count-${code}`}>{count}</b></li>)}
            <li><span className="dot dot--vacant" style={{ backgroundColor: THEME_COLOURS[theme].vacant }} aria-hidden="true" />Vacant <b data-testid="summary-count-vacant">{VACANCIES}</b></li>
          </ul>
        </div>
        <section className="card area-map" aria-label="Seat map">
          <div className="filters" role="group" aria-label="Map filters">
            <button type="button" className="chip" aria-pressed={party === null} data-testid="filter-all" onClick={() => setParty(null)}>
              All
            </button>
            {FILTER_PARTIES.map((code) => (
              <button
                key={code}
                type="button"
                className="chip"
                aria-pressed={party === code}
                data-testid={`filter-${code}`}
                // Choosing the active party again returns to "All".
                onClick={() => setParty((current) => (current === code ? null : code))}
              >
                <span className="dot" style={{ backgroundColor: partyColour(code, theme) }} aria-hidden="true" />
                {PARTIES[code].name}
              </button>
            ))}
            <button type="button" role="switch" aria-checked={atRisk} className="toggle" data-testid="filter-at-risk" onClick={() => setAtRisk((on) => !on)}>
              <span className="toggle-track" aria-hidden="true">
                <span className="toggle-thumb" />
              </span>
              <span className="toggle-label">2022 margin below 6%</span>
            </button>
          </div>
          <div className="map-display" role="group" aria-label="Map display">
            <button type="button" className="chip" aria-pressed={theme === 'dark'} data-testid="display-dark" onClick={() => setTheme((value) => value === 'light' ? 'dark' : 'light')}>Dark theme</button>
            <button type="button" className="chip" aria-pressed={labels} data-testid="display-labels" onClick={() => setLabels((value) => !value)}>Seat labels</button>
          </div>
          <HexMap seats={ASSEMBLY_SEATS} filters={filters} hovered={hovered} selected={selected} onHover={setHovered} onSelect={setSelected} theme={theme} labels={labels} assembly />
        </section>
        <aside className="area-aside">
          <SeatCard projection={shown} theme={theme} />
        </aside>
      </main>
      <footer className="footer">
        Holdings: <b>{ASSEMBLY_DATE}</b>, including one vacant seat. Margins and contest details refer to the 2022 election. 2022 results ©{' '}
        <a href="https://www.vec.vic.gov.au/results/state-election-results/2022-state-election-results" target="_blank" rel="noreferrer">Victorian Electoral Commission</a>,{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.
      </footer>
    </div>
  );
}
