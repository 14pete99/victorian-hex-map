// The hexagon map and its zoom controls. Geometry, labels, colour
// strength, tints, text colour, the pointed-at and selected rings, the outline and
// dimming all come from map.ts; this file only draws.
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { partyColour } from './parties';
import { THEME_COLOURS } from './themes';
import { WATER } from './water';
import {
  canPan, DIMMED_OPACITY, FLIP, seatSublabel, hexCentre, hexPoints, hexState, highlightRings, HEX, isDimmed, LABEL, MAP_PADDING, mapBounds, mapLabel, outlinePath, pinchOf, pinchView,
  settleView, textOn, tint, waterNameLines, wheelZoom, zoomIn, zoomOut, zoomPercent, ZOOM,
} from './map';
import type { MapFilters, MapView, Pinch } from './map';
import type { Party, Seat, SeatProjection, Theme } from './types';
import { seatSlug } from './map';
import './hex-map.css';

export interface HexMapProps {
  seats: readonly SeatProjection[];
  filters: MapFilters;
  hovered: string | null;
  selected: string | null;
  onHover: (seat: string | null) => void;
  onSelect: (seat: string) => void;
  /** sets the party colours and the panel colour that tints are mixed toward. */
  theme?: Theme;
  /** whether hexagons carry their two lines of text. */
  labels?: boolean;
  /** whether unchanged seats are drawn at their margin band's strength. */
  bands?: boolean;
  /** Show actual holdings with party labels and no historical margin tints. */
  assembly?: boolean;
}

const INITIAL_VIEW: MapView = { zoom: ZOOM.initial, x: 0, y: 0 };
const DRAG_THRESHOLD = 4;

interface HexProps {
  // Passed as plain values, not the projection object, so a hexagon whose result is
  // unchanged skips re-rendering while a slider is dragged.
  seat: Seat;
  winner: Party;
  vacant?: boolean;
  assembly: boolean;
  gained: boolean;
  filters: MapFilters;
  active: boolean;
  selected: boolean;
  onHover: (seat: string | null) => void;
  onSelect: (seat: string) => void;
  theme: Theme;
  labels: boolean;
  bands: boolean;
}

/** What a hexagon shows: its fill, the colour of its text and its second line of text. */
interface Face {
  fill: string;
  ink: string;
  sub: string;
  gained: boolean;
}

const reducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const Hex = memo(function Hex({ seat, winner, vacant, assembly, gained, filters, active, selected, onHover, onSelect, theme, labels, bands }: HexProps) {
  const projection = { seat, winner, gained, vacant };
  const state = hexState(projection, filters, assembly ? false : bands);
  const { x, y } = hexCentre(seat.col, seat.row);
  // one flat, opaque colour; text in whichever of white or black contrasts more with it.
  const fill = vacant ? THEME_COLOURS[theme].vacant : tint(partyColour(state.party, theme), THEME_COLOURS[theme].panel, state.strength);
  const face: Face = { fill, ink: textOn(fill), sub: seatSublabel(projection, assembly), gained: !assembly && state.gained };
  const holding = vacant ? 'vacant' : state.party;

  // a hexagon flips when its projected winner changes. While it narrows it keeps the face it had
  // (colour and text together, so the text never sits on a fill it was not chosen for); at its
  // narrowest, half-way, it takes the new one and widens again.
  const shown = useRef({ party: holding, face });
  const [flip, setFlip] = useState<{ id: number; old: Face; turned: boolean } | null>(null);
  useLayoutEffect(() => {
    const before = shown.current;
    shown.current = { party: holding, face };
    if (before.party === holding) return;
    // No flip when the user has asked for reduced motion: the new face is drawn at once.
    if (reducedMotion()) return setFlip(null);
    // A flip cut short starts again from the face on screen, which is the old one until it has turned.
    setFlip((current) => ({ id: (current?.id ?? 0) + 1, old: current && !current.turned ? current.old : before.face, turned: false }));
  });
  // The flip is two animations of half its length: narrow, then widen. The end of each moves it on.
  // Should an animation never report its end (reduced motion switched on part-way), the flip is dropped.
  const flipId = flip?.id;
  useEffect(() => {
    if (flipId === undefined) return;
    const timer = window.setTimeout(() => setFlip((current) => (current && current.id === flipId ? null : current)), FLIP.ms + 500);
    return () => window.clearTimeout(timer);
  }, [flipId]);

  const drawn = flip && !flip.turned ? flip.old : face;
  const classes = ['hex'];
  if (state.dimmed) classes.push('hex--dimmed');
  if (active) classes.push('hex--active');

  return (
    <g
      className={classes.join(' ')}
      data-testid={`hex-${seatSlug(seat.name)}`}
      data-seat={seat.name}
      data-party={holding}
      data-vacant={Boolean(vacant)}
      data-gained={state.gained}
      data-strength={state.strength}
      data-dimmed={state.dimmed}
      data-active={active}
      data-selected={selected}
      data-fill={face.fill}
      data-ink={face.ink}
      // a filtered-out hexagon is drawn faint.
      style={state.dimmed ? { opacity: DIMMED_OPACITY } : undefined}
      onPointerEnter={() => onHover(seat.name)}
      onPointerLeave={() => onHover(null)}
      onClick={() => onSelect(seat.name)}
    >
      <title>{seat.name}</title>
      <g
        // A new key starts a flip afresh; the turn half-way keeps the key and only changes the animation.
        key={flip?.id ?? 0}
        className={!flip ? 'hex-face' : flip.turned ? 'hex-face hex-face--widen' : 'hex-face hex-face--narrow'}
        style={{ transformOrigin: `${x}px ${y}px`, animationDuration: flip ? `${FLIP.ms / 2}ms` : undefined }}
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget) return;
          setFlip((current) => (current && !current.turned ? { ...current, turned: true } : null));
        }}
      >
        {/* the fill and, below, the text; no outline or ring of the seat's own. */}
        <polygon className="hex-shape" points={hexPoints(x, y)} style={{ fill: drawn.fill }} />
        {labels && (
          <text className="hex-name" x={x} y={y + LABEL.nameY} style={{ fill: drawn.ink, fontSize: LABEL.size }}>
            {mapLabel(seat.name)}
          </text>
        )}
        {labels && (
          <text className={drawn.gained ? 'hex-sub hex-sub--gain' : 'hex-sub'} x={x} y={y + LABEL.subY} style={{ fill: drawn.ink, fontSize: LABEL.size }}>
            {drawn.sub}
          </text>
        )}
      </g>
      {/* The pointer's target: the whole cell, drawn with no paint. The face under it is redrawn and narrowed
          by a flip, so it takes no pointer events itself; a click or a hover is never lost to one. */}
      <polygon className="hex-hit" points={hexPoints(x, y)} />
    </g>
  );
});

export const HexMap = memo(function HexMap({ seats, filters, hovered, selected, onHover, onSelect, theme = 'light', labels = true, bands = false, assembly = false }: HexMapProps) {
  const [view, setView] = useState<MapView>(INITIAL_VIEW);
  const [dragging, setDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  /** The view as of the last change. The state above is a render behind while a gesture is under way, and a gesture must not be. */
  const latest = useRef<MapView>(INITIAL_VIEW);
  const drag = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  /** The fingers on the map, by pointer id, and the pinch that two of them are making. */
  const fingers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ ids: readonly [number, number]; view: MapView; from: Pinch } | null>(null);
  /** True from the start of a pinch until every finger has lifted. */
  const pinched = useRef(false);
  /** True for the instant after a drag or a pinch ends, so the click that ends it selects nothing. */
  const justDragged = useRef(false);
  const seatCells = useMemo(() => seats.map((projection) => projection.seat), [seats]);
  const bounds = useMemo(() => mapBounds([...seatCells, ...WATER.flatMap((body) => body.cells)]), [seatCells]);
  // one line round the outer edge of the seats, the bays' shores included.
  const outline = useMemo(() => outlinePath(seatCells), [seatCells]);

  /** Every change to the view goes through here: it is settled within the panel, and `latest` never falls behind. */
  const changeView = useCallback((change: (current: MapView) => MapView) => {
    const element = viewportRef.current;
    const next = settleView(change(latest.current), element?.clientWidth ?? Infinity, element?.clientHeight ?? Infinity);
    latest.current = next;
    setView(next);
  }, []);

  const changeZoom = useCallback((change: (zoom: number) => number) => changeView((current) => ({ ...current, zoom: change(current.zoom) })), [changeView]);

  // Ctrl or Cmd with the scroll wheel zooms. The listener must be non-passive
  // so the browser's own page zoom can be cancelled.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      changeZoom((zoom) => wheelZoom(zoom, event.deltaY));
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [changeZoom]);

  // Once a pinch has begun, the fingers still down belong to the map until they have all lifted: at 100% the
  // browser would otherwise scroll the page with them. Like the wheel listener, this one must be non-passive to refuse.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const onTouchMove = (event: TouchEvent) => {
      if (pinched.current && event.cancelable) event.preventDefault();
    };
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => element.removeEventListener('touchmove', onTouchMove);
  }, []);

  /** The click that ends a drag or a pinch selects nothing. */
  const swallowClick = () => {
    justDragged.current = true;
    window.setTimeout(() => {
      justDragged.current = false;
      setDragging(false);
    }, 0);
  };

  /** The pinch two fingers are making now, measured from the middle of the panel. */
  const pinchBetween = (ids: readonly [number, number]): Pinch | null => {
    const first = fingers.current.get(ids[0]);
    const second = fingers.current.get(ids[1]);
    const panel = viewportRef.current?.getBoundingClientRect();
    if (!first || !second || !panel) return null;
    return pinchOf(first, second, { x: panel.left + panel.width / 2, y: panel.top + panel.height / 2 });
  };

  // pinch with two fingers to zoom, at any zoom; pan by dragging, only while zoom is above 100%.
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') {
      // A first finger starts afresh: no finger of an earlier touch can still be down.
      if (event.isPrimary) {
        fingers.current.clear();
        pinch.current = null;
        pinched.current = false;
      }
      fingers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (fingers.current.size > 2) return;
      if (fingers.current.size === 2) {
        const [first, second] = fingers.current.keys();
        const from = pinchBetween([first, second]);
        if (!from) return;
        // The drag the first finger may have begun gives way to the pinch.
        drag.current = null;
        pinch.current = { ids: [first, second], view: latest.current, from };
        pinched.current = true;
        onHover(null);
        return;
      }
    }
    if (!canPan(latest.current.zoom) || event.button !== 0) return;
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: latest.current.x, originY: latest.current.y, moved: false };
  };
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    if (current.moved) swallowClick();
  };
  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (fingers.current.delete(event.pointerId)) {
      if (pinch.current?.ids.includes(event.pointerId)) {
        pinch.current = null;
        // One finger left on a zoomed map carries on as a drag, from where the pinch left the map.
        const [rest] = fingers.current;
        if (rest && fingers.current.size === 1 && canPan(latest.current.zoom)) {
          drag.current = { pointerId: rest[0], startX: rest[1].x, startY: rest[1].y, originX: latest.current.x, originY: latest.current.y, moved: true };
          setDragging(true);
        }
      }
      if (fingers.current.size === 0 && pinched.current) {
        pinched.current = false;
        swallowClick();
      }
    }
    endDrag(event);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (fingers.current.has(event.pointerId)) fingers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pinching = pinch.current;
    if (pinching) {
      const to = pinching.ids.includes(event.pointerId) ? pinchBetween(pinching.ids) : null;
      if (to) changeView(() => pinchView(pinching.view, pinching.from, to));
      return;
    }
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    // The pointer is captured only once a drag has moved, so a button released outside the map before
    // then is never reported here. A move with the button up shows it: the drag ends instead of panning.
    if ((event.buttons & 1) === 0) return endDrag(event);
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (!current.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      current.moved = true;
      setDragging(true);
      onHover(null);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    changeView((state) => ({ zoom: state.zoom, x: current.originX + dx, y: current.originY + dy }));
  };
  /**
   * The viewport losing its capture of a pointer ends the drag. A finger is captured first by the seat it lands
   * on, and that capture passing to the viewport as a drag begins is reported here too; it ends nothing.
   */
  const onLostPointerCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) endDrag(event);
  };
  /** A press that leaves the map before it has become a drag is dropped: its release may happen out of sight. */
  const onPointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (current && current.pointerId === event.pointerId && !current.moved) drag.current = null;
  };

  const handleHover = useCallback((seat: string | null) => { if (!drag.current?.moved && !pinched.current) onHover(seat); }, [onHover]);
  const handleSelect = useCallback((seat: string) => { if (!drag.current?.moved && !pinched.current && !justDragged.current) onSelect(seat); }, [onSelect]);

  // the corner labels name districts at the map's geographical extremes. Mildura,
  // Benambra and Geelong sit beside their namesake edge seats; Gippsland names the region
  // from the eastern edge, as in the original two-label map.
  const centreOf = (name: string) => {
    const seat = seats.find((projection) => projection.seat.name === name)?.seat;
    return seat ? hexCentre(seat.col, seat.row) : null;
  };
  const mildura = centreOf('Mildura');
  const gippsland = centreOf('Gippsland East');
  const benambra = centreOf('Benambra');
  const geelong = centreOf('Geelong');
  const labelRise = HEX.radius + 6;
  const halfWidth = (Math.sqrt(3) * HEX.radius) / 2;
  // the selected seat's rings are drawn first, so a pointed-at seat beside it is never covered.
  const highlighted = [selected, hovered].filter((name, index, all): name is string => name !== null && all.indexOf(name) === index);

  return (
    <div className="map" data-testid="map" data-zoom={view.zoom.toFixed(4)} data-theme={theme} data-labels={labels} data-bands={bands}>
      <div className="zoom-controls" role="group" aria-label="Map zoom">
        <button type="button" data-testid="zoom-out" aria-label="Zoom out" onClick={() => changeZoom(zoomOut)} disabled={view.zoom <= ZOOM.min}>
          −
        </button>
        <output className="zoom-level" data-testid="zoom-level" aria-label="Zoom level">
          {zoomPercent(view.zoom)}
        </output>
        <button type="button" data-testid="zoom-in" aria-label="Zoom in" onClick={() => changeZoom(zoomIn)} disabled={view.zoom >= ZOOM.max}>
          +
        </button>
        <button type="button" className="zoom-reset" data-testid="zoom-reset" aria-label="Reset zoom" onClick={() => changeView(() => INITIAL_VIEW)}>
          Reset
        </button>
      </div>
      <div
        ref={viewportRef}
        className={`map-viewport${canPan(view.zoom) ? ' map-viewport--pannable' : ''}${dragging ? ' map-viewport--dragging' : ''}`}
        data-testid="map-viewport"
        data-pan-x={view.x.toFixed(1)}
        data-pan-y={view.y.toFixed(1)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onLostPointerCapture={onLostPointerCapture}
        onPointerLeave={onPointerLeave}
      >
        <svg
          className="map-svg"
          data-testid="map-svg"
          viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
          // the stylesheet divides line widths by --zoom, so the lines stay 1.5 px wide at any zoom.
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, '--zoom': view.zoom } as CSSProperties}
          role="img"
          aria-label="Hexagon map of the 88 Legislative Assembly seats"
        >
          {mildura && (
            <text className="map-label" data-testid="map-label-mildura" x={mildura.x - halfWidth} y={mildura.y - labelRise}>
              Mildura
            </text>
          )}
          {gippsland && (
            <text className="map-label map-label--end" data-testid="map-label-gippsland" x={bounds.x + bounds.width - MAP_PADDING} y={gippsland.y - labelRise}>
              Gippsland
            </text>
          )}
          {benambra && (
            <text className="map-label map-label--end" data-testid="map-label-benambra" x={benambra.x + halfWidth} y={benambra.y - labelRise}>
              Benambra
            </text>
          )}
          {geelong && (
            <text className="map-label map-label--end" data-testid="map-label-geelong" x={geelong.x - halfWidth} y={geelong.y}>
              Geelong
            </text>
          )}
          {/* the bays are scenery under the seats. They take no pointer events, so they cannot be pointed at or selected. */}
          <g className="water" data-testid="water">
            {WATER.map((body) => {
              const at = hexCentre(body.nameCell.col, body.nameCell.row);
              const lines = waterNameLines(body.name);
              return (
                <g key={body.name} data-water={body.name}>
                  {body.cells.map((cell) => {
                    const { x, y } = hexCentre(cell.col, cell.row);
                    return <polygon key={`${cell.col},${cell.row}`} className="water-tile" data-testid={`water-tile-${cell.col}-${cell.row}`} points={hexPoints(x, y)} />;
                  })}
                  <text className="water-name" data-testid={`water-name-${seatSlug(body.name)}`} x={at.x} y={at.y}>
                    {lines.map((line, index) => (
                      <tspan key={line} x={at.x} dy={index > 0 ? 12.5 : lines.length > 1 ? -2.5 : 4}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </g>
          <g className="seats" data-testid="seats">
            {seats.map((projection) => (
              <Hex
                key={projection.seat.name}
                seat={projection.seat}
                winner={projection.winner}
                vacant={projection.vacant}
                assembly={assembly}
                gained={projection.gained}
                filters={filters}
                active={projection.seat.name === hovered || projection.seat.name === selected}
                selected={projection.seat.name === selected}
                onHover={handleHover}
                onSelect={handleSelect}
                theme={theme}
                labels={labels}
                bands={bands}
              />
            ))}
          </g>
          {/* a hairline along every hexagon's edge, drawn over the fills. */}
          <g className="hex-borders" data-testid="hex-borders">
            {seats.map((projection) => {
              const { x, y } = hexCentre(projection.seat.col, projection.seat.row);
              return (
                <polygon
                  key={projection.seat.name}
                  className={isDimmed(projection, filters) ? 'hex-border hex-border--dimmed' : 'hex-border'}
                  data-testid={`hex-border-${seatSlug(projection.seat.name)}`}
                  points={hexPoints(x, y)}
                />
              );
            })}
          </g>
          <path className="map-outline" data-testid="map-outline" d={outline} />
          {/* the pointed-at or selected seat is ringed on top of everything else. */}
          {highlighted.map((name) => {
            const projection = seats.find((entry) => entry.seat.name === name);
            if (!projection) return null;
            const { x, y } = hexCentre(projection.seat.col, projection.seat.row);
            const isSelected = name === selected;
            return (
              <g key={name} className="hex-highlight" data-testid="hex-highlight" data-seat={name} data-kind={isSelected ? 'selected' : 'pointed'}>
                {highlightRings(isSelected).map((ring) => (
                  <polygon
                    key={ring.role}
                    className={`hex-highlight-ring hex-highlight-ring--${ring.role}`}
                    data-testid="hex-highlight-ring"
                    data-role={ring.role}
                    points={hexPoints(x, y, ring.radius)}
                    style={{ strokeWidth: ring.width }}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
});
