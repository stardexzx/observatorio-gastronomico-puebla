export const roles = [
  "Cocinera tradicional",
  "Cocinero tradicional",
  "Portadora o portador de saberes",
  "Colectivo comunitario",
];
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const string = (value, max = 5000) => {
  if (value == null) return "";
  if (typeof value !== "string" || value.length > max)
    fail(422, "Hay un texto con formato o longitud no válidos.");
  return value.trim();
};
function list(value, max = 30) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > max)
    fail(422, "La lista contiene demasiados elementos.");
  return [...new Set(value.map((v) => string(v, 250)).filter(Boolean))];
}
function ids(value) {
  const result = list(value, 50);
  if (result.some((v) => !uuidPattern.test(v)))
    fail(422, "Una relación contiene un identificador no válido.");
  return result;
}
function number(value, max) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max)
    fail(422, "Hay una cantidad fuera del rango permitido.");
  return n;
}
export function validDate(value) {
  if (!value) return null;
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value + "T12:00:00Z")) ||
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) !== value
  )
    fail(422, "La fecha no es válida.");
  return value;
}
export function normalizePerson(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    fail(422, "La ficha no es válida.");
  const consent = input.consent || {},
    source = input.source || {};
  const result = {
    name: string(input.name, 160),
    role: string(input.role, 100),
    municipalityCode: string(input.municipalityCode, 5),
    community: string(input.community, 250),
    region: string(input.region, 100),
    biography: string(input.biography, 12000),
    trajectory: string(input.trajectory, 12000),
    quote: string(input.quote, 1000),
    collective: string(input.collective, 250),
    establishment: string(input.establishment, 300),
    recognitions: string(input.recognitions, 3000),
    lineage: list(input.lineage, 25),
    languages: list(input.languages, 20),
    specialties: list(input.specialties, 30),
    yearsExperience: number(input.yearsExperience, 120),
    experienceDate: validDate(input.experienceDate),
    students: number(input.students, 100000),
    recipeIds: ids(input.recipeIds),
    marketIds: ids(input.marketIds),
    mediaIds: ids(input.mediaIds),
    source: {
      type: string(source.type, 50),
      reference: string(source.reference, 4000),
      consultationDate: validDate(source.consultationDate),
    },
    consent: {
      requested: consent.requested === true,
      authorizer: string(consent.authorizer, 250),
      capacity: string(consent.capacity, 250),
      date: validDate(consent.date),
      expires: validDate(consent.expires),
      scope: string(consent.scope, 3000),
      allowedUse: string(consent.allowedUse, 3000),
      evidenceId: consent.evidenceId ? string(consent.evidenceId, 36) : "",
    },
  };
  if (result.name.length < 2) fail(422, "Escribe el nombre público.");
  if (!roles.includes(result.role))
    fail(422, "Selecciona el tipo de registro.");
  if (!/^21\d{3}$/.test(result.municipalityCode))
    fail(422, "Selecciona un municipio de Puebla.");
  if (result.students !== null && !Number.isInteger(result.students))
    fail(422, "El número documentado de estudiantes debe ser entero.");
  if (result.yearsExperience !== null && !result.experienceDate)
    fail(422, "Indica la fecha de referencia de los años de experiencia.");
  if (result.consent.evidenceId && !uuidPattern.test(result.consent.evidenceId))
    fail(422, "La evidencia no es válida.");
  if (
    result.consent.expires &&
    result.consent.date &&
    result.consent.expires < result.consent.date
  )
    fail(422, "El vencimiento del consentimiento precede a su fecha.");
  return result;
}
export function validateSubmission(data) {
  const missing = [];
  if (!data.biography && !data.trajectory)
    missing.push("semblanza o trayectoria");
  if (!data.community) missing.push("comunidad o localidad");
  if (data.yearsExperience === null || !data.specialties.length)
    missing.push("experiencia y especialidades");
  if (!data.source.type || !data.source.reference)
    missing.push("fuente y referencia");
  if (!data.consent.requested) missing.push("solicitud de autorización");
  if (missing.length)
    fail(422, "Completa antes de enviar: " + missing.join(", ") + ".");
}
export function decodeUpload(data) {
  const kind = data?.kind;
  if (!["foto", "audio", "consentimiento"].includes(kind))
    fail(422, "Tipo de archivo no válido.");
  if (
    typeof data.base64 !== "string" ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(data.base64)
  )
    fail(422, "El archivo no está codificado correctamente.");
  const bytes = Buffer.from(data.base64, "base64"),
    max = kind === "audio" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  if (!bytes.length || bytes.length > max)
    fail(
      413,
      kind === "audio" ? "El audio supera 50 MB." : "El archivo supera 10 MB.",
    );
  const signatures = {
    "image/png": bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/jpeg": bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    "image/webp":
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP",
    "application/pdf": bytes.toString("ascii", 0, 5) === "%PDF-",
    "audio/mpeg":
      bytes.toString("ascii", 0, 3) === "ID3" ||
      (bytes[0] === 255 && (bytes[1] & 224) === 224),
    "audio/wav":
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WAVE",
    "audio/mp4": bytes.toString("ascii", 4, 8) === "ftyp",
  };
  const mime = string(data.mime, 80)
    .replace("audio/x-wav", "audio/wav")
    .replace("audio/x-m4a", "audio/mp4");
  if (
    !signatures[mime] ||
    (kind === "foto" && !mime.startsWith("image/")) ||
    (kind === "audio" && !mime.startsWith("audio/")) ||
    (kind === "consentimiento" &&
      mime !== "application/pdf" &&
      !mime.startsWith("image/"))
  )
    fail(422, "El contenido no corresponde a un formato de archivo admitido.");
  const meta = {
    title: string(data.title, 250),
    description: string(data.description, 1500),
    credit: string(data.credit, 250),
    license: string(data.license, 250),
    alt: string(data.alt, 500),
    date: validDate(data.date),
  };
  if (
    kind !== "consentimiento" &&
    (!meta.title ||
      !meta.credit ||
      !meta.license ||
      (kind === "foto" && !meta.alt))
  )
    fail(
      422,
      "Añade título, crédito y licencia; las fotografías necesitan texto alternativo.",
    );
  return {
    kind,
    bytes,
    mime,
    name: string(data.name, 200).replace(/[\r\n/\\]/g, "_") || "archivo",
    meta,
  };
}
