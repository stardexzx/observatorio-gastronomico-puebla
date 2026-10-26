import { useEffect, useMemo, useRef, useState } from "react";
const COLORS = ["#EFEADC", "#F6E2B4", "#F1BD66", "#D9772B", "#B23A1F"];
const BASE = { x: 0, y: 0, w: 620, h: 440 };
function pointsOf(feature) {
  return (
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates
  ).flat(2);
}
export default function MunicipalMap({
  data,
  selected,
  onSelect,
  compact = false,
  selectionOnly = false,
}) {
  const [view, setView] = useState(BASE),
    [hover, setHover] = useState(null);
  const svg = useRef(null),
    drag = useRef(null),
    ignore = useRef(false);
  const drawing = useMemo(() => {
    const features = (data?.features || []).filter(
      (f) =>
        f.geometry && ["Polygon", "MultiPolygon"].includes(f.geometry.type),
    );
    const pts = features.flatMap(pointsOf);
    if (!pts.length) return null;
    let west = Infinity,
      east = -Infinity,
      south = Infinity,
      north = -Infinity;
    for (const [lng, lat] of pts) {
      west = Math.min(west, lng);
      east = Math.max(east, lng);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
    }
    const scale = Math.min(580 / (east - west), 400 / (north - south)),
      ox = (620 - (east - west) * scale) / 2,
      oy = (440 - (north - south) * scale) / 2;
    const project = ([lng, lat]) => [
      ox + (lng - west) * scale,
      oy + (north - lat) * scale,
    ];
    const path = (f) =>
      (f.geometry.type === "Polygon"
        ? [f.geometry.coordinates]
        : f.geometry.coordinates
      )
        .map((poly) =>
          poly
            .map(
              (ring) =>
                ring
                  .map((point, i) => {
                    const [x, y] = project(point);
                    return `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
                  })
                  .join("") + "Z",
            )
            .join(" "),
        )
        .join(" ");
    return {
      features: features.map((f) => ({ ...f, path: path(f) })),
      project,
      max: Math.max(1, ...features.map((f) => Number(f.properties.total || 0))),
    };
  }, [data]);
  function zoom(factor) {
    setView((v) => {
      const w = Math.max(BASE.w / 6, Math.min(BASE.w, v.w * factor)),
        h = (w * BASE.h) / BASE.w;
      return { x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h };
    });
  }
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const wheel = (event) => {
      event.preventDefault();
      zoom(event.deltaY > 0 ? 1.15 : 1 / 1.15);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [drawing]);
  if (!drawing)
    return (
      <div className="empty-state">
        No hay geometrías municipales disponibles.
      </div>
    );
  return (
    <div className={`municipal-map ${compact ? "compact" : ""}`}>
      <div className="municipal-canvas">
        <svg
          ref={svg}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          aria-label="Mapa de los 217 municipios de Puebla"
          role="group"
          onPointerDown={(e) => {
            if (e.button === 0)
              drag.current = { x: e.clientX, y: e.clientY, view, moved: false };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 5) {
              d.moved = true;
              svg.current.setPointerCapture(e.pointerId);
              const rect = svg.current.getBoundingClientRect();
              setView({
                ...d.view,
                x: d.view.x - ((e.clientX - d.x) * d.view.w) / rect.width,
                y: d.view.y - ((e.clientY - d.y) * d.view.h) / rect.height,
              });
            }
          }}
          onPointerUp={() => {
            if (drag.current?.moved) ignore.current = true;
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onClickCapture={(e) => {
            if (ignore.current) {
              ignore.current = false;
              e.stopPropagation();
            }
          }}
        >
          <rect
            x={view.x}
            y={view.y}
            width={view.w}
            height={view.h}
            fill="#E9EEE6"
          />
          {drawing.features.map((f) => {
            const p = f.properties,
              count = Number(p.total || 0),
              level = count
                ? Math.max(1, Math.ceil((count / drawing.max) * 4))
                : 0;
            return (
              <path
                key={p.code}
                d={f.path}
                fill={
                  selectionOnly && selected === p.code
                    ? "#D89A2E"
                    : COLORS[level]
                }
                stroke={selected === p.code ? "#10284C" : "#fff"}
                strokeWidth={selected === p.code ? 2 : 0.65}
                vectorEffect="non-scaling-stroke"
                fillRule="evenodd"
                tabIndex={0}
                role="button"
                aria-label={
                  selectionOnly ? p.name : `${p.name}: ${count} registros`
                }
                aria-pressed={selected === p.code}
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(p)}
                onBlur={() => setHover(null)}
                onClick={() => onSelect?.(p.code)}
                onKeyDown={(e) => {
                  if (["Enter", " "].includes(e.key)) {
                    e.preventDefault();
                    onSelect?.(p.code);
                  }
                }}
              >
                <title>
                  {selectionOnly
                    ? p.name
                    : `${p.name} · ${count} registros publicados`}
                </title>
              </path>
            );
          })}
          {(data.points || []).map((f) => {
            const [x, y] = drawing.project(f.geometry.coordinates);
            return (
              <a
                href={`/mercados/${f.id}`}
                key={f.id}
                aria-label={`Ver ficha de ${f.properties.nombre}`}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={(4 * view.w) / 620}
                  fill="#D89A2E"
                  stroke="#10284C"
                  strokeWidth={(1 * view.w) / 620}
                />
                <title>{f.properties.nombre}</title>
              </a>
            );
          })}
        </svg>
        <div className="map-toolbar" aria-label="Controles del mapa">
          <button
            className="g-btn"
            type="button"
            onClick={() => zoom(1 / 1.4)}
            aria-label="Acercar mapa"
          >
            +
          </button>
          <button
            className="g-btn"
            type="button"
            onClick={() => zoom(1.4)}
            aria-label="Alejar mapa"
          >
            −
          </button>
          <button
            className="g-btn"
            type="button"
            onClick={() => setView(BASE)}
            aria-label="Restablecer mapa"
          >
            ↺
          </button>
        </div>
        {hover && (
          <div className="municipality-tip" role="status">
            <b>{hover.name}</b>
            {!selectionOnly && (
              <span>{hover.total || 0} registros publicados</span>
            )}
          </div>
        )}
      </div>
      {selectionOnly ? (
        <p className="foot-note">
          Selecciona el municipio en el mapa o en la lista. La ficha se vincula
          al municipio, sin publicar una ubicación personal precisa.
        </p>
      ) : (
        <div className="municipal-legend">
          <span>
            {drawing.features.length} municipios · {data.mapped} registros con
            vínculo municipal
          </span>
          <div>
            <span>Sin registros</span>
            {COLORS.map((c) => (
              <i style={{ background: c }} key={c} />
            ))}
            <span>Mayor cantidad</span>
          </div>
        </div>
      )}
    </div>
  );
}
