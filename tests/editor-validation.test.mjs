import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizePerson,
  validDate,
  decodeUpload,
  validateSubmission,
} from "../server/editor-validation.mjs";
const base = {
  name: "Nombre público",
  role: "Cocinera tradicional",
  municipalityCode: "21114",
};
test("un borrador incompleto se guarda sin habilitar su envío ni aceptar fechas o cantidades imposibles", () => {
  const draft = normalizePerson(base);
  assert.equal(draft.biography, "");
  assert.throws(
    () => validateSubmission(draft),
    (e) => e.status === 422,
  );
  for (const date of ["2026-99-01", "2026-02-30", "2025-02-29", "no-fecha"])
    assert.throws(
      () => validDate(date),
      (e) => e.status === 422,
    );
  assert.equal(validDate("2024-02-29"), "2024-02-29");
  assert.throws(
    () => normalizePerson({ ...base, students: -1 }),
    (e) => e.status === 422,
  );
  assert.throws(
    () => normalizePerson({ ...base, yearsExperience: 30 }),
    (e) => e.status === 422,
  );
});
test("la unión de campos conserva los elementos del diseño y descarta actor, roles y verificación del cliente", () => {
  const record = normalizePerson({
    ...base,
    quote: "Una frase",
    collective: "Colectivo",
    lineage: ["Generación anterior"],
    students: 8,
    actorId: "not-allowed",
    permissions: { publicar: true },
    consent: { verified: true },
  });
  assert.equal(record.quote, "Una frase");
  assert.deepEqual(record.lineage, ["Generación anterior"]);
  assert.equal(record.students, 8);
  assert.equal(record.actorId, undefined);
  assert.equal(record.permissions, undefined);
  assert.equal(record.consent.verified, undefined);
});
test("los archivos públicos requieren formato real y respaldo; la evidencia privada no requiere metadatos de publicación", () => {
  assert.throws(
    () =>
      decodeUpload({
        kind: "foto",
        mime: "image/png",
        name: "falso.png",
        base64: Buffer.from("<svg/>").toString("base64"),
      }),
    (e) => e.status === 422,
  );
  const pdf = decodeUpload({
    kind: "consentimiento",
    mime: "application/pdf",
    name: "privado.pdf",
    base64: Buffer.from("%PDF-1.4\n%%EOF").toString("base64"),
  });
  assert.equal(pdf.kind, "consentimiento");
});
