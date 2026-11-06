import React from "react";
import { Link } from "react-router-dom";
import Icon from "../assets/icons.jsx";
import PueblaHexMap from "../components/map/PueblaHexMap.jsx";
import Plate from "../components/illustrations/Plate.jsx";
import StallArt from "../components/illustrations/StallArt.jsx";
import useRemoteData from "./useRemoteData.js";
import { getInicioData } from "../services/api.js";
import MunicipalMapPreview from "../components/map/MunicipalMapPreview.jsx";

const TYPE = {
  ingrediente: { color: "#4F7A4A", icon: "leaf", label: "Ingrediente" },
  receta: { color: "#C1531E", icon: "recipe", label: "Receta histórica" },
  mercado: { color: "#D89A2E", icon: "stall", label: "Mercado" },
  coc: { color: "#10284C", icon: "person", label: "Cocinera tradicional" },
  leg: { color: "#B23A1F", icon: "shield", label: "Protección legal" },
};
const QUICK = [
  {
    to: "/mapa",
    color: "#10284C",
    icon: "pin",
    title: "Explorar el mapa",
    text: "Ingredientes, rutas y abasto",
  },
  {
    to: "/recetas",
    color: "#C1531E",
    icon: "recipe",
    title: "Recetas históricas",
    text: "Platillos y su linaje",
  },
  {
    to: "/mercados",
    color: "#D89A2E",
    icon: "stall",
    title: "Mercados y tianguis",
    text: "Dónde abastecerse",
  },
  {
    to: "/cocineras",
    color: "#10284C",
    icon: "person",
    title: "Cocineras y cocineros",
    text: "Portadores del saber",
  },
  {
    to: "/proteccion-legal",
    color: "#C1531E",
    icon: "shield",
    title: "Protección legal",
    text: "Declaratorias vigentes",
  },
];

function Dot({ color, icon, size = 40 }) {
  return (
    <span
      className="g-dot"
      style={{ width: size, height: size, background: color }}
    >
      <Icon name={icon} size={Math.round(size * 0.52)} />
    </span>
  );
}
function CategoryTag({ type }) {
  const meta = TYPE[type] || TYPE.receta;
  return (
    <span
      className={`g-tag ${type === "ingrediente" || type === "ing" ? "ok" : type === "mercado" || type === "mer" ? "gold" : type === "leg" ? "red" : "blue"}`}
    >
      {meta.label}
    </span>
  );
}

export default function Inicio() {
  const { loading, data, error } = useRemoteData(getInicioData, []);
  if (loading)
    return (
      <div className="loading-state">
        Cargando información del Observatorio…
      </div>
    );
  if (error || !data)
    return (
      <div className="empty-state">
        No fue posible cargar los datos de inicio.
      </div>
    );
  return (
    <>
      <div className="g-h">
        <h1>Bienvenida al Observatorio Gastronómico de Puebla</h1>
        <p>
          Explora, conoce y valora el patrimonio gastronómico de Puebla. Datos,
          historias y personas que preservan nuestras tradiciones.
        </p>
      </div>
      <div className="g-kpis">
        {data.kpis.map((kpi) => (
          <div className="g-kpi" key={kpi.label}>
            <Dot color={kpi.color} icon={kpi.icon} />
            <b>{kpi.value}</b>
            <small>{kpi.label}</small>
            <em>{kpi.delta}</em>
          </div>
        ))}
      </div>
      <div className="g-1-2">
        <section className="g-card">
          <div className="g-ch">
            <h3>
              <Icon name="pin" size={17} />
              Actividad reciente en Puebla
            </h3>
            <span className="g-tag">Últimos 30 días ▾</span>
          </div>
          <MunicipalMapPreview />
        </section>
        <section className="g-card">
          <div className="g-ch">
            <h3>
              <Icon name="shield" size={17} />
              Verificaciones recientes
            </h3>
            <Link className="g-link" to="/reportes">
              Ver todas
            </Link>
          </div>
          {data.verificaciones.map((item, index) => {
            const meta = TYPE[item.type] || TYPE.receta;
            return (
              <div className="g-row" key={`${item.name}-${index}`}>
                <Dot color={meta.color} icon={meta.icon} size={36} />
                <div>
                  <b>{item.name}</b>
                  <small>
                    {item.municipality} ·{" "}
                    <span
                      style={{
                        color: item.verified ? "#4F7A4A" : "#D89A2E",
                        fontWeight: 700,
                      }}
                    >
                      {item.verified ? "✓ Verificado" : "◐ En revisión"}
                    </span>
                  </small>
                </div>
                <div style={{ textAlign: "right", flex: "0 0 auto" }}>
                  <CategoryTag type={item.type} />
                  <br />
                  <small>{item.date}</small>
                </div>
              </div>
            );
          })}
          <Link
            className="g-btn"
            to="/reportes"
            style={{ marginTop: 10, justifyContent: "center", width: "100%" }}
          >
            Ver todas las verificaciones <Icon name="external" size={13} />
          </Link>
        </section>
      </div>
      <section className="g-card" style={{ marginBottom: 16 }}>
        <div className="g-ch">
          <h3>
            <Icon name="star" size={17} />
            Patrimonio destacado
          </h3>
        </div>
        <div className="g-pat">
          {data.destacados.map((item, index) => (
            <article className="g-rc" key={item.name}>
              <div className="g-thumb" style={{ height: 110 }}>
                {item.kind === "mercado" ? (
                  <StallArt color={item.colors[0]} />
                ) : (
                  <Plate
                    color1={item.colors[0]}
                    color2={item.colors[1]}
                    seed={item.seed}
                  />
                )}
              </div>
              <div className="g-rc-b">
                <b>{item.name}</b>
                <small>{item.place}</small>
                <small>{item.description}</small>
                <Link
                  className="g-btn"
                  to={
                    item.kind === "mercado"
                      ? "/mercados"
                      : item.kind === "receta"
                        ? "/recetas"
                        : "/mapa"
                  }
                >
                  Ver detalle
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      <h2 className="g-h2">Accesos rápidos — grupo “Explorar”</h2>
      <p className="g-sm" style={{ margin: "0 0 12px" }}>
        Las cinco puertas de entrada al contenido público, agrupadas por lo que
        el visitante busca activamente
      </p>
      <div className="g-quick">
        {QUICK.map((item) => (
          <Link to={item.to} className="g-qc" key={item.to}>
            <Dot color={item.color} icon={item.icon} size={38} />
            <b>{item.title}</b>
            <span>{item.text}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
