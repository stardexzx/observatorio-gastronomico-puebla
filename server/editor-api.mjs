import { fail, uuidPattern } from "./editor-validation.mjs";
function cookie(req) {
  const value = (req.headers.cookie || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("ogp_session="));
  return value?.slice("ogp_session=".length) || "";
}
export function jsonBody(req, limit = 1024 * 1024) {
  if (!req.headers["content-type"]?.startsWith("application/json"))
    fail(415, "Envía los datos como JSON.");
  if (Number(req.headers["content-length"]) > limit) {
    req.resume();
    fail(413, "La solicitud supera el tamaño permitido.");
  }
  return new Promise((resolve, reject) => {
    let length = 0,
      parts = [],
      done = false;
    const error = (e) => {
      if (!done) {
        done = true;
        reject(e);
      }
    };
    req.on("data", (chunk) => {
      if (done) return;
      length += chunk.length;
      if (length > limit) {
        parts = [];
        error(
          Object.assign(new Error("El archivo supera el tamaño permitido."), {
            status: 413,
          }),
        );
      } else parts.push(chunk);
    });
    req.on("error", error);
    req.on("aborted", () =>
      error(
        Object.assign(new Error("La solicitud se interrumpió."), {
          status: 400,
        }),
      ),
    );
    req.on("end", () => {
      if (done) return;
      try {
        const value = JSON.parse(Buffer.concat(parts).toString("utf8"));
        done = true;
        resolve(value);
      } catch {
        error(
          Object.assign(new Error("La solicitud no contiene un JSON válido."), {
            status: 400,
          }),
        );
      }
    });
  });
}
export function sendFile(res, file, { privateFile = false } = {}) {
  if (!file) fail(404, "Archivo no encontrado.");
  res.writeHead(200, {
    "Content-Type": file.mime,
    "Content-Length": file.contenido.length,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Content-Disposition": `${privateFile ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.nombre)}`,
  });
  res.end(file.contenido);
}
export function createEditorHandler(store, { secureCookies = false } = {}) {
  const attempts = new Map();
  return async (req, res, url, send) => {
    if (!store) fail(503, "El acceso editorial no está configurado.");
    const parts = url.pathname.split("/").filter(Boolean).slice(2);
    if (req.method !== "GET") {
      let origin;
      try {
        origin = new URL(req.headers.origin).host;
      } catch {
        fail(403, "No se pudo verificar el origen de la solicitud.");
      }
      if (origin !== req.headers.host)
        fail(403, "La solicitud debe proceder del mismo sitio.");
    }
    const token = cookie(req);
    if (parts[0] === "session" && parts.length === 1) {
      if (req.method === "GET")
        return send(200, { user: await store.session(token) });
      if (req.method === "POST") {
        const body = await jsonBody(req, 8192);
        if (
          typeof body.email !== "string" ||
          body.email.length > 250 ||
          typeof body.password !== "string" ||
          body.password.length > 500
        )
          fail(400, "Correo o contraseña no válidos.");
        const key =
          (req.socket.remoteAddress || "") +
          "/" +
          body.email.trim().toLowerCase();
        const now = Date.now(),
          old = attempts.get(key);
        if (old && old.until > now && old.count >= 8)
          fail(
            429,
            "Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
          );
        if (attempts.size > 2000)
          for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
        attempts.set(key, {
          count: old && old.until > now ? old.count + 1 : 1,
          until: old && old.until > now ? old.until : now + 60000,
        });
        const result = await store.login(body.email, body.password);
        attempts.delete(key);
        res.setHeader(
          "Set-Cookie",
          `ogp_session=${result.token}; Path=/api/editor; HttpOnly; SameSite=Strict; Max-Age=28800${secureCookies ? "; Secure" : ""}`,
        );
        return send(200, { user: result.user });
      }
      if (req.method === "DELETE") {
        await store.logout(token);
        res.setHeader(
          "Set-Cookie",
          `ogp_session=; Path=/api/editor; HttpOnly; SameSite=Strict; Max-Age=0${secureCookies ? "; Secure" : ""}`,
        );
        return send(200, { ok: true });
      }
    }
    const user = await store.session(token);
    if (!user) fail(401, "Inicia sesión para acceder a la captura.");
    if (parts[0] === "catalogos" && parts.length === 1 && req.method === "GET")
      return send(
        200,
        await store.options(
          user,
          (url.searchParams.get("q") || "").slice(0, 200),
        ),
      );
    if (parts[0] === "archivos" && parts.length === 2 && req.method === "GET") {
      if (!uuidPattern.test(parts[1])) fail(400, "Identificador no válido.");
      return sendFile(res, await store.privateFile(user, parts[1]), {
        privateFile: true,
      });
    }
    if (parts[0] === "personas") {
      if (parts.length === 1) {
        if (req.method === "GET")
          return send(
            200,
            await store.list(user, {
              search: (url.searchParams.get("q") || "").slice(0, 200),
              status: url.searchParams.get("estado") || "",
            }),
          );
        if (req.method === "POST")
          return send(201, await store.create(user, await jsonBody(req)));
      }
      const id = parts[1];
      if (!uuidPattern.test(id || "")) fail(400, "Identificador no válido.");
      if (parts.length === 2) {
        if (req.method === "GET")
          return send(200, await store.detail(user, id));
        if (req.method === "PUT") {
          const body = await jsonBody(req);
          return send(200, await store.save(user, id, body.data, body.version));
        }
      }
      if (parts.length === 3 && req.method === "POST") {
        if (parts[2] === "archivos")
          return send(
            201,
            await store.upload(user, id, await jsonBody(req, 71 * 1024 * 1024)),
          );
        return send(
          200,
          await store.action(user, id, parts[2], await jsonBody(req)),
        );
      }
    }
    fail(404, "Ruta editorial no encontrada.");
  };
}
