import { createServer } from "node:http";
import { createEditorHandler, sendFile } from "./editor-api.mjs";
const catalogTypes = {
  recetas: "receta",
  mercados: "mercado",
  cocineras: "persona",
  "proteccion-legal": "instrumento",
  podcasts: "podcast",
  episodios: "episodio",
  institucional: "institucional",
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function positiveInt(value, fallback, min, max) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max)
    throw Object.assign(new Error("Paginación no válida."), { status: 400 });
  return Number(value);
}
export function createApi(
  store,
  { onError = () => {}, editor = null, secureCookies = false } = {},
) {
  const editorial = createEditorHandler(editor, { secureCookies });
  return createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(JSON.stringify(data));
    };
    try {
      const url = new URL(req.url, "http://localhost");
      if (
        url.pathname === "/api/editor" ||
        url.pathname.startsWith("/api/editor/")
      )
        return await editorial(req, res, url, send);
      if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return send(405, { error: "Esta API es de consulta pública." });
      }
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] !== "api" || parts.length > 3)
        return send(404, { error: "Ruta no encontrada." });
      const [, resource, id] = parts;
      if (id && !uuid.test(id))
        return send(400, {
          error: "El identificador debe ser un UUID válido.",
        });
      if (resource === "media" && id)
        return sendFile(res, await store.publicFile(id));
      if (!id && resource === "municipios")
        return send(200, await store.municipalities());
      if (!id && resource === "mapa-municipal") {
        const types = url.searchParams.get("tipos");
        const allowed = [
          "ingrediente",
          "receta",
          "mercado",
          "persona",
          "instrumento",
        ];
        const selected =
          types === null ? null : types.split(",").filter(Boolean);
        if (selected?.some((t) => !allowed.includes(t)))
          return send(400, { error: "Tipo de capa no válido." });
        const municipality = url.searchParams.get("municipio") || null;
        if (municipality && !/^21\d{3}$/.test(municipality))
          return send(400, { error: "Municipio no válido." });
        const search = (url.searchParams.get("q") || "").trim();
        if (search.length > 200)
          return send(400, {
            error: "La búsqueda admite hasta 200 caracteres.",
          });
        const dates = ["desde", "hasta"].map(
          (key) => url.searchParams.get(key) || null,
        );
        if (
          dates.some(
            (d) =>
              d &&
              (!/^\d{4}-\d{2}-\d{2}$/.test(d) ||
                !Number.isFinite(Date.parse(d + "T12:00:00Z")) ||
                new Date(d + "T12:00:00Z").toISOString().slice(0, 10) !== d),
          ) ||
          (dates[0] && dates[1] && dates[0] > dates[1])
        )
          return send(400, { error: "El periodo no es válido." });
        return send(
          200,
          await store.municipalMap({
            types: selected,
            municipality,
            search: search || null,
            from: dates[0],
            to: dates[1],
          }),
        );
      }
      if (!id && resource === "health") return send(200, await store.health());
      if (!id && ["inicio", "reportes"].includes(resource))
        return send(200, await store.panel());
      if (!id && resource === "mapa") return send(200, await store.map());
      if (!id && resource === "red-conocimiento") {
        const focus = url.searchParams.get("registro");
        if (focus && !uuid.test(focus))
          return send(400, {
            error: "El identificador debe ser un UUID válido.",
          });
        if (focus && !(await store.detail(focus)))
          return send(404, { error: "Ficha no encontrada." });
        return send(200, await store.graph(focus));
      }
      const type = catalogTypes[resource];
      if (id && (type || resource === "registros")) {
        const record = await store.detail(id);
        return record && (!type || record.type === type)
          ? send(200, record)
          : send(404, { error: "Ficha no encontrada." });
      }
      if (!id && (type || resource === "buscar")) {
        const search = url.searchParams.get("q")?.trim() || null;
        if (search && search.length > 200)
          return send(400, {
            error: "La búsqueda admite hasta 200 caracteres.",
          });
        return send(
          200,
          await store.list({
            type: type || null,
            search,
            limit: positiveInt(url.searchParams.get("limit"), 12, 1, 50),
            offset: positiveInt(url.searchParams.get("offset"), 0, 0, 1000000),
          }),
        );
      }
      send(404, { error: "Ruta no encontrada." });
    } catch (error) {
      onError(error);
      const status =
        error.status ||
        (error.code === "42501"
          ? 403
          : ["23503", "23505", "23514", "P0001"].includes(error.code)
            ? 422
            : 503);
      send(status, {
        error: error.status
          ? error.message
          : error.code === "P0001"
            ? error.message
            : status === 403
              ? "No tienes permiso para esta acción."
              : status === 422
                ? "No se pudo completar la operación. Revisa los datos y el estado de la ficha."
                : "No fue posible consultar o guardar el contenido. Intenta nuevamente más tarde.",
      });
    }
  });
}
