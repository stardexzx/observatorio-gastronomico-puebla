import { usesDatabase } from "./api.js";
export async function editorRequest(path, { method = "GET", body } = {}) {
  if (!usesDatabase)
    throw new Error(
      "La captura requiere el modo conectado a la base de datos.",
    );
  const response = await fetch(`/api/editor/${path}`, {
    method,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw Object.assign(
      new Error(result.error || "No fue posible completar la operación."),
      { status: response.status },
    );
  return result;
}
export const editorSession = () => editorRequest("session");
export const editorLogin = (email, password) =>
  editorRequest("session", { method: "POST", body: { email, password } });
export const editorLogout = () =>
  editorRequest("session", { method: "DELETE" });
export const editorOptions = (query) =>
  editorRequest(`catalogos?${new URLSearchParams({ q: query || "" })}`);
export const editorPeople = (query = "", status = "") =>
  editorRequest(
    `personas?${new URLSearchParams({ q: query, estado: status })}`,
  );
export const editorPerson = (id) => editorRequest(`personas/${id}`);
export const createPerson = (data) =>
  editorRequest("personas", { method: "POST", body: data });
export const savePerson = (id, data, version) =>
  editorRequest(`personas/${id}`, { method: "PUT", body: { data, version } });
export const personAction = (id, action, body = {}) =>
  editorRequest(`personas/${id}/${action}`, { method: "POST", body });
export async function uploadPersonFile(id, file, metadata) {
  const bytes = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return editorRequest(`personas/${id}/archivos`, {
    method: "POST",
    body: { ...metadata, name: file.name, mime: file.type, base64: bytes },
  });
}
export const editorialStatus = {
  borrador: "Borrador",
  en_revision: "En revisión",
  correcciones: "Requiere correcciones",
  validado: "Validada",
  publicado: "Publicada",
  archivado: "Archivada",
};
