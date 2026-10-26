import pg from "pg";
import { adaptRecord, recordRoute } from "./records.mjs";

export function createStore(connectionString) {
  const pool = new pg.Pool({
    connectionString,
    max: 6,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    statement_timeout: 12000,
  });
  pool.on("error", (error) =>
    console.error("Conexión PostgreSQL interrumpida:", error.code || "error"),
  );
  async function namesFor(rows) {
    const ids = [
      ...new Set(
        rows
          .flatMap(({ contenido: c }) => [
            ...(c.relaciones || []).map((r) => r.registro_id),
            ...(c.detalle?.ingredientes || []).flatMap((i) => [
              i.ingrediente_id,
              i.unidad_id,
            ]),
            ...(c.detalle?.productos || []).map((i) => i.ingrediente_id),
            c.ficha?.tipo_id,
          ])
          .filter(Boolean),
      ),
    ];
    const names = new Map();
    for (let offset = 0; offset < ids.length; offset += 200) {
      const result = await pool.query(
        "SELECT * FROM ogp.consultar_nombres($1::uuid[])",
        [ids.slice(offset, offset + 200)],
      );
      for (const r of result.rows) names.set(r.registro_id, r);
      const catalogs = await pool.query(
        "SELECT * FROM ogp.consultar_catalogos() WHERE registro_id=ANY($1::uuid[])",
        [ids.slice(offset, offset + 200)],
      );
      for (const r of catalogs.rows) names.set(r.registro_id, r);
    }
    return names;
  }
  return {
    close: () => pool.end(),
    async publicFile(id) {
      return (
        (
          await pool.query("SELECT * FROM ogp.consultar_archivo_publico($1)", [
            id,
          ])
        ).rows[0] || null
      );
    },
    async municipalities() {
      return (await pool.query("SELECT ogp.consultar_municipios() AS items"))
        .rows[0].items;
    },
    async municipalMap({
      types = null,
      municipality = null,
      search = null,
      from = null,
      to = null,
    } = {}) {
      const result = (
        await pool.query(
          "SELECT ogp.consultar_mapa_municipal($1,$2,$3,$4,$5) AS mapa",
          [types, municipality, search, from, to],
        )
      ).rows[0].mapa;
      const names = await namesFor(result.records);
      return {
        ...result,
        records: result.records.map((row) => adaptRecord(row, names)),
        limited: result.total > 100,
      };
    },
    async health() {
      await pool.query("SELECT * FROM ogp.consultar_indicadores()");
      return { status: "ok", source: "database" };
    },
    async list({ type = null, search = null, limit = 12, offset = 0 } = {}) {
      const { rows } = await pool.query(
        "SELECT * FROM ogp.consultar_fichas($1,$2,$3,$4)",
        [type, search, limit + 1, offset],
      );
      const visible = rows.slice(0, limit),
        names = await namesFor(visible);
      return {
        items: visible.map((row) => adaptRecord(row, names)),
        hasMore: rows.length > limit,
      };
    },
    async detail(id) {
      const { rows } = await pool.query(
        "SELECT * FROM ogp.consultar_ficha($1::uuid)",
        [id],
      );
      return rows[0] ? adaptRecord(rows[0], await namesFor(rows)) : null;
    },
    async panel() {
      const { rows } = await pool.query(
        "SELECT ogp.consultar_panel() AS panel",
      );
      return {
        ...rows[0].panel,
        recent: (await this.list({ limit: 6 })).items,
      };
    },
    async map() {
      const { rows } = await pool.query(
        "SELECT ogp.consultar_mapa($1::uuid) AS mapa",
        [null],
      );
      return {
        ...rows[0].mapa,
        features: rows[0].mapa.features.filter((f) =>
          f.geometry?.coordinates?.every(Number.isFinite),
        ),
      };
    },
    async graph(id) {
      const roots = id
        ? [id]
        : (
            await pool.query(
              "SELECT * FROM ogp.consultar_fichas(NULL,NULL,24,0)",
            )
          ).rows.map((r) => r.registro_id);
      const edges = (
        await Promise.all(
          roots.map((root) =>
            pool.query("SELECT * FROM ogp.consultar_red($1::uuid)", [root]),
          ),
        )
      ).flatMap((r) => r.rows);
      const ids = [
        ...new Set([
          ...roots,
          ...edges.flatMap((e) => [e.origen_id, e.destino_id]),
        ]),
      ].slice(0, 200);
      const { rows } = await pool.query(
        "SELECT * FROM ogp.consultar_nombres($1::uuid[])",
        [ids],
      );
      const visible = new Set(rows.map((r) => r.registro_id));
      const types = {
        ingrediente: "ing",
        variedad: "ing",
        receta: "rec",
        preparacion: "rec",
        persona: "coc",
        mercado: "mer",
        instrumento: "leg",
        expediente: "leg",
      };
      const uniqueEdges = new Map(
        edges
          .filter((e) => visible.has(e.origen_id) && visible.has(e.destino_id))
          .map((e) => [
            `${e.origen_id}/${e.destino_id}/${e.relacion}`,
            { source: e.origen_id, target: e.destino_id, type: e.relacion },
          ]),
      );
      return {
        nodes: rows.map((r, i) => ({
          id: r.registro_id,
          n: r.nombre,
          t: types[r.tipo] || "mun",
          r: 16,
          x: 380 + 270 * Math.cos((i * 2 * Math.PI) / rows.length),
          y: 230 + 170 * Math.sin((i * 2 * Math.PI) / rows.length),
          to: recordRoute(r.registro_id, r.tipo),
        })),
        edges: [...uniqueEdges.values()],
        partial: !id,
      };
    },
  };
}
