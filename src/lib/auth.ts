import crypto from "crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";

const SESSION_COOKIE = "icecrm_session";
const SESSION_DAYS = 14;

function hashPassword(password: string, salt: string) {
  return crypto.pbkdf2Sync(password, salt, 210000, 32, "sha256").toString("hex");
}
function hashToken(token: string) { return crypto.createHash("sha256").update(token).digest("hex"); }

export function hasUsers() {
  return (getDb().prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count > 0;
}
export function setupAdmin(username: string, password: string) {
  if (hasUsers()) throw new Error("Администратор уже создан");
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) throw new Error("Логин: 3–40 символов (буквы, цифры, . _ -)");
  if (password.length < 12) throw new Error("Пароль должен содержать минимум 12 символов");
  const salt = crypto.randomBytes(16).toString("hex");
  getDb().prepare("INSERT INTO users (username, password_hash, password_salt, role) VALUES (?, ?, ?, 'admin')")
    .run(username, hashPassword(password, salt), salt);
  return createSession(username);
}
export function createUser(username:string,password:string,role:string,clientId?:number) { if(!["admin","manager","warehouse","driver","client"].includes(role)) throw new Error("Недопустимая роль"); if(!/^[a-zA-Z0-9._-]{3,40}$/.test(username)||password.length<12) throw new Error("Логин 3+ символа и пароль от 12 символов"); const salt=crypto.randomBytes(16).toString("hex"); getDb().prepare("INSERT INTO users(username,password_hash,password_salt,role,client_id) VALUES(?,?,?,?,?)").run(username,hashPassword(password,salt),salt,role,clientId??null); }
export function login(username: string, password: string) {
  const user = getDb().prepare("SELECT username, password_hash, password_salt FROM users WHERE username = ?").get(username) as {username:string;password_hash:string;password_salt:string} | undefined;
  if (!user || !crypto.timingSafeEqual(Buffer.from(user.password_hash, "hex"), Buffer.from(hashPassword(password, user.password_salt), "hex"))) return null;
  return createSession(user.username);
}
function createSession(username: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  getDb().prepare("INSERT INTO sessions (token_hash, username, expires_at) VALUES (?, ?, ?)").run(hashToken(token), username, expiresAt);
  return { token, expiresAt, username };
}
export function destroySession(token?: string) { if (token) getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token)); }
export function getSession(token?: string) {
  if (!token) return null;
  return getDb().prepare("SELECT s.username,s.expires_at,u.role,u.client_id FROM sessions s JOIN users u ON u.username=s.username WHERE s.token_hash = ? AND s.expires_at > datetime('now')")
    .get(hashToken(token)) as {username:string;expires_at:string;role:string;client_id:number|null} | undefined ?? null;
}
export async function currentUser() { return getSession((await cookies()).get(SESSION_COOKIE)?.value); }
export async function requireUser() { const u = await currentUser(); if (!u) throw new Error("UNAUTHORIZED"); return u; }
export const sessionCookie = { name: SESSION_COOKIE, options: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: SESSION_DAYS * 86400 } };
