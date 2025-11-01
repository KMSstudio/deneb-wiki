// @/lib/auth.ts
import "server-only";
import { cookies } from "next/headers";
import type { User } from "@/lib/docs/user";
import jwt, { JwtPayload } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) { throw new Error("JWT_SECRET is not set"); }

export type SessionUser = { idx: number; email: string; name?: string };

/**
 * Issue a signed JWT for the given user.
 * Uses `sub` as the canonical user identifier and includes `email` and optional `name`.
 * @param user Domain user object
 * @returns Signed JWT string
 */
export function issueJwt(user: User): string {
  return jwt.sign(
    { sub: String(user.idx), email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d", algorithm: "HS256" }
  );
}

/**
 * Verify a JWT and return a normalized session user if valid.
 * Returns null when the token is invalid, expired, or missing required claims.
 * @param token JWT string from cookie or header
 * @returns SessionUser or null
 */
export function verifyJwt(token: string): SessionUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload & { email?: string; name?: string };
    const sub = payload.sub;
    const idx = typeof sub === "string" ? Number(sub) : typeof sub === "number" ? sub : NaN;
    if (!Number.isFinite(idx) || !payload.email) return null;
    return { idx, email: String(payload.email), name: payload.name ? String(payload.name) : undefined };
  } catch {
    return null;
  }
}

/**
 * Read the `session` cookie in the current request and return the verified session user.
 * Intended for Server Components, layouts, and server actions.
 * @returns SessionUser or null
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;
  return verifyJwt(token);
}
