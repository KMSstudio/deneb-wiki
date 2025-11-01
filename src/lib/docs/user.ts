// @/lib/user.ts
import { setDocument, getDocument, getDocumentBySid, type SetdGroup } from "@/lib/docs/docs";
import { q, one } from "@/lib/db";
import bcrypt from "bcrypt";

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
    idx: Number(row.idx),
    email: row.email,
    name: row.name,
    certified: row.certified,
    ctime: row.ctime,
    info: row.info ? (JSON.parse(row.info) as UserInfo) : null,
  };
}

/**
 * Ensure a group exists. If not, create it using setDocument.
 */
async function ensureGroup(name: string): Promise<number> {
  const sid = `group:${name}`;

  const existing = await getDocumentBySid(sid);
  if (existing) return existing.id;

  const input: SetdGroup = {
    type: "group",
    name,
    acl_id: null,
    content_md: "",
    toc: "",
    members: [],
  };

  const id = await setDocument(input);
  return id;
}

/**
 * CHeck is given user exist on group.
 * @param userIdx auth_users.idx
 * @param groupSid ex) "group:admin"
 */
export async function isUserInGroup(userIdx: number, groupSid: string): Promise<boolean> {
  const group = await one<{ id: number }>(
    `SELECT d.id
       FROM documents d
       JOIN groups_doc g ON g.id = d.id
      WHERE d.sid=$1 AND d.type='group'`,
    [groupSid],
  );
  if (!group) return false;

  const ref = await one<{ id: number }>(`SELECT id FROM group_members WHERE group_id=$1 AND user_idx=$2`, [group.id, userIdx]);
  return !!ref;
}

/**
 * Add user to a group. Safe with conflict.
 */
async function addUserToGroup(userIdx: number, groupName: string) {
  await ensureGroup(groupName);
  const group = await getDocument(`group:${groupName}`);
  if (!group) throw new Error("group_fetch_failed");

  const input: SetdGroup = {
    type: "group",
    name: groupName,
    acl_id: group.acl_id,
    content_md: "",
    toc: "",
    members: [...new Set([...((group as any).members ?? []), userIdx])].map(Number),
  };
  await setDocument(input);
}

/**
 * Check if given user exists on documents table by ID
 */
export async function userExistsId(documentId: number): Promise<boolean> {
  const row = await one<{ id: number }>(`SELECT id FROM documents WHERE type='user' AND id=$1`, [documentId]);
  return !!row;
}

/**
 * Check if given user exists on user table by INDEX
 */
export async function userExistsIdx(userIdx: number): Promise<boolean> {
  const row = await one<{ idx: number }>(`SELECT idx FROM auth_users WHERE idx=$1`, [userIdx]);
  return !!row;
}

/**
 * Create a local user with email/password.
 */
export async function createUserLocal(email: string, password: string, name: string, info?: UserInfo): Promise<User> {
  const hashed = await bcrypt.hash(password, 10);

  // check existing credential
  const existingCred = await one<{ id: number }>(`SELECT id FROM credentials WHERE email=$1 AND provider='local'`, [email]);
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

  await q(
    `INSERT INTO credentials (user_idx, provider, email, password, ctime)
     VALUES ($1, 'local', $2, $3, now())`,
    [user.idx, email, hashed],
  );

  // add user to group
  await addUserToGroup(user.idx, "users");

  const userCount = await one<{ count: string }>(`SELECT COUNT(*) FROM auth_users`);
  if (userCount && parseInt(userCount.count) === 1) {
    await addUserToGroup(user.idx, "admin");
    await addUserToGroup(user.idx, "system");
  }

  const domain = email.split("@")[1] || "";
  const validDomains = ["snu.ac.kr", "kaist.ac.kr", "gov.kr"];
  if (validDomains.includes(domain)) {
    await addUserToGroup(user.idx, domain);
  }

  return user;
}

/**
 * Verify local user by email and password.
 */
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

/**
 * Get user by OAuth credential.
 */
export async function getUserByOAuth(email: string, provider: "google" | "github"): Promise<User | null> {
  const cred = await one<{ user_idx: number }>(`SELECT user_idx FROM credentials WHERE email=$1 AND provider=$2`, [email, provider]);
  if (!cred) return null;

  const userRow = await one<any>(`SELECT * FROM auth_users WHERE idx=$1`, [cred.user_idx]);
  return parseUser(userRow);
}

/**
 * Create user via OAuth. If email already exists, reuse the account.
 */
export async function createUserOAuth(email: string, name: string, provider: "google" | "github", info?: UserInfo): Promise<User> {
  const existingCred = await one<{ id: number }>(`SELECT id FROM credentials WHERE email=$1 AND provider=$2`, [email, provider]);
  if (existingCred) throw new Error("oauth_credential_already_exists");

  let userRow = await one<any>(`SELECT * FROM auth_users WHERE email=$1 LIMIT 1`, [email]);
  let user = parseUser(userRow);

  if (!user) {
    userRow = await one<any>(
      `INSERT INTO auth_users (email, name, certified, ctime, info)
       VALUES ($1, $2, true, now(), $3)
       RETURNING *`,
      [email, name, info ? JSON.stringify(info) : null],
    );
    user = parseUser(userRow);
    if (!user) throw new Error("user_insert_failed");
  }

  await q(
    `INSERT INTO credentials (user_idx, provider, email, ctime)
     VALUES ($1, $2, $3, now())`,
    [user.idx, provider, email],
  );

  await addUserToGroup(user.idx, "user");

  const userCount = await one<{ count: string }>(`SELECT COUNT(*) FROM auth_users`);
  if (userCount && parseInt(userCount.count) === 1) {
    await addUserToGroup(user.idx, "admin");
    await addUserToGroup(user.idx, "system");
  }

  const domain = email.split("@")[1] || "";
  const validDomains = ["snu.ac.kr", "kaist.ac.kr", "gov.kr"];
  if (validDomains.includes(domain)) {
    await addUserToGroup(user.idx, domain);
  }

  return user;
}
