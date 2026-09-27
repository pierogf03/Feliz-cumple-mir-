import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "admin_session";

const DEFAULT_AUTH_SECRET = "feliz-cumple-admin-session-secret";

function secret() {
  const value = process.env.AUTH_SECRET?.trim() || DEFAULT_AUTH_SECRET;
  if (value.length < 16) {
    throw new Error("AUTH_SECRET must be at least 16 characters.");
  }
  return new TextEncoder().encode(value);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

export async function requireAdmin(returnTo: string): Promise<void> {
  if (await isAdmin()) return;
  const path = returnTo.startsWith("/") ? returnTo : "/admin";
  redirect(`/admin/login?return_to=${encodeURIComponent(path)}`);
}

export async function setAdminSession(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD?.trim() || "admin";
  return password === expected;
}
