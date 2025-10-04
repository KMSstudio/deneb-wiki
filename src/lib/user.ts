// @/lib/user.ts
import { q, one } from "@/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export type UserInfo = {
  major?: string;
  snu_year?: string;
  snu_postfix?: string;
} | null;

export interface User {
  idx: number;
  email: string;
  name: string | null;
  certified: boolean;
  ctime: Date;
  info: UserInfo;
}

// ─────────────────────────────────────────────
// Helper: parse user row safely
// ─────────────────────────────────────────────
function parseUser(row: any | null): User | null {
  if (!row) return null;
  return {
    idx: row.idx,
    email: row.email,
    name: row.name,
    certified: row.certified,
    ctime: row.ctime,
    info: row.info ? (JSON.parse(row.info) as UserInfo) : null,
  };
}

// ─────────────────────────────────────────────
// LOCAL USER
// ─────────────────────────────────────────────
export async function createUserLocal(
  email: string,
  password: string,
  name: string,
  info?: UserInfo,
): Promise<User> {
  const hashed = await bcrypt.hash(password, 10);

  // check existing credential
  const existingCred = await one<{ id: number }>(
    `SELECT id FROM credentials WHERE email=$1 AND provider='local'`,
    [email],
  );
  if (existingCred) throw new Error("local_credential_already_exists");

  // create user
  const userRow = await one<any>(
    `INSERT INTO auth_users (email, name, certified, ctime, info)
     VALUES ($1, $2, false, now(), $3)
     RETURNING *`,
    [email, name, info ? JSON.stringify(info) : null],
  );
  const user = parseUser(userRow);
  if (!user) throw new Error("user_insert_failed");

  // create credential
  await q(
    `INSERT INTO credentials (user_idx, provider, email, password, ctime)
     VALUES ($1, 'local', $2, $3, now())`,
    [user.idx, email, hashed],
  );

  return user;
}

export async function verifyUserLocal(email: string, password: string): Promise<User | null> {
  const cred = await one<{ password: string; user_idx: number }>(
    `SELECT password, user_idx FROM credentials WHERE email=$1 AND provider='local'`,
    [email],
  );
  if (!cred) return null;

  const ok = await bcrypt.compare(password, cred.password);
  if (!ok) return null;

  const userRow = await one<any>(`SELECT * FROM auth_users WHERE idx=$1`, [cred.user_idx]);
  return parseUser(userRow);
}

// ─────────────────────────────────────────────
// OAUTH USER
// ─────────────────────────────────────────────
export async function getUserByOAuth(
  email: string,
  provider: "google" | "github",
): Promise<User | null> {
  const cred = await one<{ user_idx: number }>(
    `SELECT user_idx FROM credentials WHERE email=$1 AND provider=$2`,
    [email, provider],
  );
  if (!cred) return null;

  const userRow = await one<any>(`SELECT * FROM auth_users WHERE idx=$1`, [cred.user_idx]);
  return parseUser(userRow);
}

export async function createUserOAuth(
  email: string,
  name: string,
  provider: "google" | "github",
  info?: UserInfo,
): Promise<User> {
  // check existing credential
  const existingCred = await one<{ id: number }>(
    `SELECT id FROM credentials WHERE email=$1 AND provider=$2`,
    [email, provider],
  );
  if (existingCred) throw new Error("oauth_credential_already_exists");

  // try to reuse existing user by email
  let userRow = await one<any>(`SELECT * FROM auth_users WHERE email=$1 LIMIT 1`, [email]);
  let user = parseUser(userRow);

  if (!user) {
    // create new user
    userRow = await one<any>(
      `INSERT INTO auth_users (email, name, certified, ctime, info)
       VALUES ($1, $2, true, now(), $3)
       RETURNING *`,
      [email, name, info ? JSON.stringify(info) : null],
    );
    user = parseUser(userRow);
    if (!user) throw new Error("user_insert_failed");
  }

  // create credential
  await q(
    `INSERT INTO credentials (user_idx, provider, email, ctime)
     VALUES ($1, $2, $3, now())`,
    [user.idx, provider, email],
  );

  return user;
}

// ─────────────────────────────────────────────
// JWT
// ─────────────────────────────────────────────
export function issueJwt(user: User): string {
  return jwt.sign({ uid: user.idx, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyJwt(token: string): { uid: number; email: string; name: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { uid: number; email: string; name: string };
  } catch {
    return null;
  }
}
