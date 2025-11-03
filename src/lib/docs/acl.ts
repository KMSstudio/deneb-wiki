// @/lib/acl.ts

import { q } from "@/lib/db";
import type { RUDMask, AclEntry, SetAclEntry } from "@/lib/docs/docs";

// ─────────────────────────────────────────────────────────
// RUD CLASS
// ─────────────────────────────────────────────────────────

/**
 * Encapsulates R/U/D bitmask and provides property-like accessors.
 */
export class Rud {
  private mask: RUDMask;

  /**
   * @param {RUDMask} mask - bitmask representing R/U/D permissions
   */
  constructor(mask: RUDMask) {
    this.mask = mask;
  }

  /** @returns {boolean} true if Read is allowed */
  get read(): boolean {
    return (this.mask & 0b100) !== 0;
  }

  /** @returns {boolean} true if Update is allowed */
  get update(): boolean {
    return (this.mask & 0b010) !== 0;
  }

  /** @returns {boolean} true if Delete is allowed */
  get delete(): boolean {
    return (this.mask & 0b001) !== 0;
  }

  /** @returns {RUDMask} numeric mask */
  toNumber(): RUDMask {
    return this.mask;
  }

  /** @returns {string} human-readable "RUD" style string */
  toString(): string {
    return `${this.read ? "R" : "-"}${this.update ? "U" : "-"}${this.delete ? "D" : "-"}`;
  }
}

// ─────────────────────────────────────────────────────────
// ACL QUERY
// ─────────────────────────────────────────────────────────

/**
 * Resolve effective Rud permissions for a given ACL and user.
 *
 * Rules:
 * 1. If acl_id is null → return full permission (0b111).
 * 2. If user_idx is null → return no permission (0b000).
 * 3. Otherwise, iterate over ACL entries in ascending order:
 *    - If target_t === "user": check if target_id (users_doc.id) maps to given user_idx.
 *    - If target_t === "group": check if user_idx is a member of group target_id.
 *    - If condition matches, apply Entry.
 *
 * Entry apply:
 *   - If allow === true → mask |= rud_mask
 *   - If allow === false → mask &= ~rud_mask
 */
export async function getRudByAcl(acl_id: number | null, user_idx: number | null): Promise<Rud> {
  if (acl_id === null) return new Rud(0b111);
  if (user_idx === null) return new Rud(0b000);

  const entries = await q<AclEntry>(
    `SELECT target_t, target_id, target_sid, rud_mask, allow
       FROM acl_entries
      WHERE acl_id = $1
      ORDER BY id ASC`,
    [acl_id],
  );

  let mask: RUDMask = 0b000;

  for (const entry of entries) {
    if (entry.target_t === "user") {
      const same = await isUserSame(user_idx, entry.target_id);
      if (same) mask = applyAclEntry(mask, entry);
    } else if (entry.target_t === "group") {
      const inGroup = await isUserInGroup(user_idx, entry.target_id);
      if (inGroup) mask = applyAclEntry(mask, entry);
    }
  }

  return new Rud(mask);
}

/** Apply ACL entry to current mask. */
function applyAclEntry(current: RUDMask, entry: AclEntry): RUDMask {
  return entry.allow ? current | entry.rud_mask : current & ~entry.rud_mask;
}

/**
 * Check if given users_doc.id corresponds to the provided auth_users.id.
 * @param user_idx - auth_users.id (logged-in user)
 * @param user_doc_id - users_doc.id (document id of type "user")
 */
async function isUserSame(user_idx: number, user_doc_id: number): Promise<boolean> {
  const row = await q<{ user_idx: number }>(`SELECT user_idx FROM users_doc WHERE id = $1`, [user_doc_id]);
  return row.length > 0 && row[0].user_idx === user_idx;
}

/**
 * Check if a user is a member of a given group.
 * @param user_idx - auth_users.id (logged-in user)
 * @param group_doc_id - groups_doc.id (document id of type "group")
 */
async function isUserInGroup(user_idx: number, group_doc_id: number): Promise<boolean> {
  const row = await q<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
         FROM group_members
        WHERE group_id = $1
          AND user_idx = $2
     ) AS exists`,
    [group_doc_id, user_idx],
  );
  return row[0]?.exists ?? false;
}

// ─────────────────────────────────────────────────────────
// ACL ENTRY UTILITIES
// ─────────────────────────────────────────────────────────

/**
 * Extract SetAclEntry[] from arbitrary input (e.g., API body).
 * Filters invalid entries and normalizes field types.
 *
 * @param {any} raw - input object (usually from API request body)
 * @returns {SetAclEntry[]} validated entries
 */
export function extractSetAclEntries(raw: any): SetAclEntry[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((e: any) => {
      const sid = typeof e?.target_sid === "string" ? e.target_sid.trim() : "";
      const rud_mask = Number(e?.rud_mask ?? 0);
      const allow = Boolean(e?.allow);
      if (!sid || !Number.isInteger(rud_mask)) return null;
      return { target_sid: sid, rud_mask, allow };
    })
    .filter((e): e is SetAclEntry => e !== null);
}

/**
 * Extract reference SIDs from ACL entries.
 *
 * @param {AclEntry[] | SetAclEntry[]} entries - array of ACL entries of SetAcl entries
 * @returns {string[]} list of target_sid values
 */
export function extractRefsFromAclEntries(entries: AclEntry[] | SetAclEntry[]): string[] {
  return entries.map((e) => e.target_sid).filter((sid): sid is string => typeof sid === "string" && sid.length > 0);
}
