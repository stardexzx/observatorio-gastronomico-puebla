export const routes = {
  receta: "/recetas",
  mercado: "/mercados",
  persona: "/cocineras",
  instrumento: "/proteccion-legal",
};
export const typeLabels = {
  preparacion: "Preparación",
  receta: "Receta histórica",
  ingrediente: "Ingrediente",
  variedad: "Variedad",
  mercado: "Mercado",
  persona: "Cocinera o cocinero",
  instrumento: "Protección legal",
  expediente: "Expediente legal",
  podcast: "Podcast",
  episodio: "Episodio",
  institucional: "Contenido institucional",
};
export const recordName = (content) =>
  content.ficha?.titulo ||
  content.ficha?.nombre ||
  content.ficha?.nombre_publico ||
  content.ficha?.nombre_oficial ||
  "Sin título";
export const recordRoute = (id, type) => `${routes[type] || "/registro"}/${id}`;
const text = (value) => value ?? "";
const days = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
function schedule(items = []) {
  return items
    .map(
      (h) =>
        `${days[h.dia_semana - 1]}: ${h.horario_texto || `${h.apertura?.slice(0, 5)}–${h.cierre?.slice(0, 5)}${h.cierra_dia_siguiente ? " (día siguiente)" : ""}`}`,
    )
    .join(" · ");
}

// Adapta únicamente el snapshot público; nunca consulta las tablas de trabajo.
export function adaptRecord(row, names = new Map()) {
  const c = row.contenido,
    f = c.ficha || {},
    d = c.detalle || {};
  const territories = c.territorios || [];
  const place =
    territories
      .map((t) => t.nombre)
      .filter(Boolean)
      .join(" · ") || "Ubicación no documentada";
  const relations = (c.relaciones || []).flatMap((r) => {
    const target = names.get(r.registro_id);
    return target
      ? [
          {
            id: r.registro_id,
            name: target.nombre,
            type: target.tipo,
            relation: r.relacion,
            to: recordRoute(r.registro_id, target.tipo),
          },
        ]
      : [];
  });
  const base = {
    id: row.registro_id,
    type: row.tipo,
    n: recordName(c),
    d: text(
      f.descripcion || f.resumen || f.cuerpo || f.alcance || f.caracteristicas,
    ),
    p: place,
    m: place,
    v: 1,
    rel: relations.length,
    relations,
    source: "database",
    to: recordRoute(row.registro_id, row.tipo),
    fu: (c.fuentes || []).map((s) => s.cita).filter(Boolean),
    archivos: c.archivos || [],
    publishedAt: row.publicado_en,
  };
  if (row.tipo === "receta")
    return {
      ...base,
      e: f.referencia_temporal || f.fecha_original || "Fecha no documentada",
      ing: (d.ingredientes || []).map((i) => [
        names.get(i.ingrediente_id)?.nombre || "Ingrediente sin ficha pública",
        [
          i.cantidad_texto ||
            [i.cantidad, names.get(i.unidad_id)?.nombre]
              .filter((value) => value != null)
              .join(" "),
          i.forma_uso,
          i.observaciones_publicas,
        ]
          .filter(Boolean)
          .join(" · "),
      ]),
      steps: d.pasos || [],
      techniques: d.tecnicas || [],
      limitations: f.limitaciones_documentacion,
      context: f.contexto_cultural,
    };
  if (row.tipo === "mercado")
    return {
      ...base,
      tp: f.tipo === "tianguis" ? "Tianguis" : "Mercado",
      h: schedule(d.ubicacion?.horarios),
      address: d.ubicacion?.direccion || d.ubicacion?.descripcion,
      coordinates:
        d.ubicacion?.longitud != null && d.ubicacion?.latitud != null
          ? [d.ubicacion.longitud, d.ubicacion.latitud]
          : null,
      prod: (d.productos || []).flatMap((i) =>
        names.has(i.ingrediente_id) ? [names.get(i.ingrediente_id).nombre] : [],
      ),
      services: d.servicios || [],
    };
  if (row.tipo === "persona")
    return {
      ...base,
      bio: [f.semblanza, f.trayectoria].filter(Boolean).join("\n\n"),
      q: d.perfil?.frase || "",
      c: "#10284C",
      rol:
        d.perfil?.tipo_participacion || (d.participaciones || []).join(" · "),
      esp: d.especialidades || [],
      len: (d.lenguas || []).join(", ") || "No documentado",
      ins: relations.filter((r) => r.type === "receta").map((r) => r.name),
      rec: relations.filter((r) => r.type === "receta").length,
      mer: relations.filter((r) => r.type === "mercado").length,
      org: d.perfil?.colectivo || "",
      ver: [],
      community: d.perfil?.localidad || "",
      region: d.perfil?.region || "",
      lin: d.perfil?.linaje || [],
      es: d.perfil?.establecimiento || "",
      est: d.perfil?.estudiantes ?? null,
      recognitions: [
        ...(d.reconocimientos || []).map((r) => r.nombre),
        d.perfil?.reconocimientos_publicos,
      ].filter(Boolean),
      photos: [
        ...(d.multimedia || [])
          .filter((m) => m.clase === "foto")
          .map((m) => ({ ...m, url: `/api/media/${m.id}` })),
        ...(c.archivos || [])
          .filter((a) => a.tipo_mime?.startsWith("image/"))
          .map((a) => ({
            ...a,
            metadatos: {
              title: a.nombre,
              alt: a.texto_alternativo,
              credit: a.credito,
              license: a.licencia,
              description: a.descripcion,
            },
          })),
      ],
      oral: [
        ...(d.multimedia || [])
          .filter((m) => m.clase === "audio")
          .map((m) => ({ ...m, url: `/api/media/${m.id}` })),
        ...(c.archivos || [])
          .filter((a) => a.tipo_mime?.startsWith("audio/"))
          .map((a) => ({
            ...a,
            metadatos: {
              title: a.nombre,
              credit: a.credito,
              license: a.licencia,
              description: a.descripcion,
            },
          })),
      ],
    };
  if (row.tipo === "instrumento")
    return {
      ...base,
      tpn: names.get(f.tipo_id)?.nombre || "Instrumento legal",
      j: place,
      st:
        {
          vigente_documentada: "Vigente",
          vencido: "Vencido",
          revocado: "Revocado",
        }[f.situacion] || "No determinada",
      f: f.fecha_emision || f.referencia_temporal || "No documentada",
      a: f.autoridad,
      alc: f.alcance,
      car: [],
      docs: (c.fuentes || []).map((s) => [
        s.cita,
        s.afirmacion || "Fuente publicada",
      ]),
    };
  return {
    ...base,
    purpose: f.proposito,
    transcript: f.transcripcion,
    date: f.fecha_original,
    links: d.enlaces || [],
    credits: d.creditos || [],
    key: f.clave,
  };
}
