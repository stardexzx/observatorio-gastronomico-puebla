import { createServer } from 'node:http';
const catalogTypes = { recetas: 'receta', mercados: 'mercado', cocineras: 'persona', 'proteccion-legal': 'instrumento', podcasts: 'podcast', episodios: 'episodio', institucional: 'institucional' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function positiveInt(value, fallback, min, max) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) throw Object.assign(new Error('Paginación no válida.'), { status: 400 });
  return Number(value);
}
export function createApi(store, { onError = () => {} } = {}) {
  return createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify(data));
    };
    try {
      if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return send(405, { error: 'Esta API es de consulta pública.' }); }
      const url = new URL(req.url, 'http://localhost');
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] !== 'api' || parts.length > 3) return send(404, { error: 'Ruta no encontrada.' });
      const [, resource, id] = parts;
      if (id && !uuid.test(id)) return send(400, { error: 'El identificador debe ser un UUID válido.' });
      if (!id && resource === 'health') return send(200, await store.health());
      if (!id && ['inicio', 'reportes'].includes(resource)) return send(200, await store.panel());
      if (!id && resource === 'mapa') return send(200, await store.map());
      if (!id && resource === 'red-conocimiento') {
        const focus = url.searchParams.get('registro');
        if (focus && !uuid.test(focus)) return send(400, { error: 'El identificador debe ser un UUID válido.' });
        if (focus && !await store.detail(focus)) return send(404, { error: 'Ficha no encontrada.' });
        return send(200, await store.graph(focus));
      }
      const type = catalogTypes[resource];
      if (id && (type || resource === 'registros')) {
        const record = await store.detail(id);
        return record && (!type || record.type === type) ? send(200, record) : send(404, { error: 'Ficha no encontrada.' });
      }
      if (!id && (type || resource === 'buscar')) {
        const search = url.searchParams.get('q')?.trim() || null;
        if (search && search.length > 200) return send(400, { error: 'La búsqueda admite hasta 200 caracteres.' });
        return send(200, await store.list({ type: type || null, search, limit: positiveInt(url.searchParams.get('limit'), 12, 1, 50), offset: positiveInt(url.searchParams.get('offset'), 0, 0, 1000000) }));
      }
      send(404, { error: 'Ruta no encontrada.' });
    } catch (error) {
      onError(error);
      send(error.status || 503, { error: error.status ? error.message : 'No fue posible consultar el contenido publicado. Intenta nuevamente más tarde.' });
    }
  });
}
