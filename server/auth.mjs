import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password, hash) {
  const [salt, encoded] = (hash || "").split(":");
  if (!salt || !encoded || !/^[0-9a-f]{128}$/.test(encoded)) return false;
  const actual = await derive(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(encoded, "hex"));
}
export const sessionHash = (value) =>
  createHash("sha256").update(value).digest("hex");
export const newSession = () => randomBytes(32).toString("hex");
