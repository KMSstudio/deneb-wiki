// @/lib/docs.ts

import { q, one } from "../db";

export type DocType = "article" | "namespace" | "user" | "group" | "acl";

/** Basic Documents Row Query */
export type DocRaw = {
  id: number;
  sid: string;
  type: DocType;
  name: string;
  acl_id: number | null;
  mtime: string;
  ctime: string;
};

export type ArticleRow = {
  content_md: string;
  toc: string;
};

/* ─────────────────────────────────────────────────────────
 * Document Specified Type (discriminated union)
 * ───────────────────────────────────────────────────────── */
type Base = DocRaw & {
  refs: string[];
  links: string[];
};

type ArticleLike = Base & {
  content_md: string;
  toc: string;
};

export type Namespace = Base & { type: "namespace"; };
export type Article = ArticleLike & { type: "article"; namespaces: string[] };
export type dUser = ArticleLike & { type: "user"; user_idx: number };
export type dGroup = ArticleLike & { type: "group"; members: number[] };

export type RUDMask = number;
export type AclEntry = {
  target_t: "user" | "group";
  target_id: number;
  target_sid: string | null;
  rud_mask: RUDMask; // R=4, U=2, D=1
  allow: boolean;
};

export type dAcl = Base & { type: "acl"; entries: AclEntry[] };
export type Document = Article | Namespace | dUser | dGroup | dAcl;

/* ─────────────────────────────────────────────────────────
 * Lightweight Queries (Maintain)
 * ───────────────────────────────────────────────────────── */
export async function listRecentDocuments(limit = 50): Promise<DocRaw[]> {
  return q<DocRaw>(
    `SELECT id, sid, type::text AS type, name, acl_id, mtime, ctime
       FROM documents
      ORDER BY mtime DESC
      LIMIT $1`,
    [limit],
  );
}

export async function getDocumentBySid(sid: string): Promise<DocRaw | null> {
  const row = await one<any>(
    `SELECT id, sid, type::text AS type, name, acl_id, mtime, ctime
       FROM documents
      WHERE sid = $1`,
    [sid],
  );
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    acl_id: row.acl_id !== null ? Number(row.acl_id) : null,
  } as DocRaw;
}

export async function getArticleById(id: number): Promise<ArticleRow | null> {
  return one<ArticleRow>(
    `SELECT content_md, toc
       FROM articles
      WHERE id = $1`,
    [id],
  );
}

export async function getRefsOf(docId: number): Promise<{ ref_sid: string }[]> {
  return q<{ ref_sid: string }>(
    `SELECT COALESCE(d2.sid, r.dst_sid) AS ref_sid
       FROM doc_refs r
  LEFT JOIN documents d2 ON d2.id = r.dst_id
      WHERE r.src_id = $1
   ORDER BY ref_sid`,
    [docId],
  );
}

export async function getLinksOf(docId: number): Promise<{ src_sid: string }[]> {
  return q<{ src_sid: string }>(
    `SELECT d1.sid AS src_sid
       FROM doc_refs r
       JOIN documents d1 ON d1.id = r.src_id
      WHERE r.dst_id = $1
   ORDER BY d1.sid`,
    [docId],
  );
}

/* ─────────────────────────────────────────────────────────
 * Category Helper (namespace ↔ article)
 *  - When article is included in namespace, namespace reference artcle. "namespace → article"
 * ───────────────────────────────────────────────────────── */
export async function getNamespacesOfArticle(articleId: number) {
  return q<{ namespace_sid: string }>(
    `
    -- 권장 방향: namespace → article
    SELECT ns.sid AS namespace_sid
      FROM doc_refs r
      JOIN documents ns ON ns.id = r.src_id
     WHERE r.dst_id = $1
       AND ns.type = 'namespace'
    `,
    [articleId],
  );
}

/* ─────────────────────────────────────────────────────────
 * 메인: 상세 Document 로드 (sid 또는 단순 name)
 *  - ':' 없으면 article:${name} 로 해석
 * ───────────────────────────────────────────────────────── */
export async function getDocument(sidOrName: string): Promise<Document | null> {
  const sid = sidOrName.includes(":") ? sidOrName : `article:${sidOrName}`;
  const doc = await getDocumentBySid(sid);
  if (!doc) return null;

  // 새 schema: refs, links 는 doc_refs에서 직접 조회
  const refs = (await getRefsOf(doc.id)).map((r) => r.ref_sid);
  const links = (await getLinksOf(doc.id)).map((r) => r.src_sid);

  switch (doc.type) {
    case "article": {
      const art = await getArticleById(doc.id);
      const namespaces = (await getNamespacesOfArticle(doc.id)).map((r) => r.namespace_sid);
      return {
        ...doc,
        type: "article",
        content_md: art?.content_md ?? "",
        toc: art?.toc ?? "",
        refs,
        links,
        namespaces,
      };
    }

    case "namespace": {
      return {
        ...doc,
        type: "namespace",
        refs,
        links,
      };
    }

    case "user": {
      const art = await one<ArticleRow>(`SELECT content_md, toc FROM articles WHERE id=$1`, [doc.id]);
      const u = await one<{ user_idx: number }>(`SELECT user_idx FROM users_doc WHERE id=$1`, [doc.id]);
      return {
        ...doc,
        type: "user",
        content_md: art?.content_md ?? "",
        toc: art?.toc ?? "",
        user_idx: u?.user_idx ?? 0,
        refs,
        links,
      };
    }

    case "group": {
      const art = await one<ArticleRow>(`SELECT content_md, toc FROM articles WHERE id=$1`, [doc.id]);
      // NOTE: Collect `user_idx` list from `group_members` table. -- KMSStudio
      const members = (await q<{ user_idx: number }>(`SELECT user_idx FROM group_members WHERE group_id=$1 ORDER BY user_idx`, [doc.id]))
        .map((r) => r.user_idx)
        .map(Number);
      return {
        ...doc,
        type: "group",
        content_md: art?.content_md ?? "",
        toc: art?.toc ?? "",
        members,
        refs,
        links,
      };
    }

    case "acl": {
      const raw_entries = await q<AclEntry & { target_sid: string | null }>(
        `SELECT
            target_t::text AS target_t,
            target_id,
            d.sid AS target_sid,
            rud_mask,
            allow
         FROM acl_entries e
         LEFT JOIN documents d ON d.id = e.target_id
        WHERE e.acl_id = $1
        ORDER BY e.id`,
        [doc.id],
      );
      const entries: AclEntry[] = raw_entries.map((e) => ({
        ...e,
        target_id: Number(e.target_id),
      }));
      return {
        ...doc,
        type: "acl",
        entries,
        refs,
        links,
      };
    }
  }
}

// ─────────────────────────────────────────────────────────
// setDocument input union
// ─────────────────────────────────────────────────────────

type SetBase = {
  type: DocType;
  name: string;
  acl_id: number | null;
  refs?: string[];
};

type SetArticleLike = SetBase & {
  content_md?: string;
  toc?: string;
};

export type SetAclEntry = {
  target_sid: string;
  rud_mask: RUDMask; // R=4, U=2, D=1
  allow: boolean;
};

export type SetNamespace = SetBase & { type: "namespace" };
export type SetArticle = SetArticleLike & { type: "article" };
export type SetdUser = SetArticleLike & { type: "user"; user_idx: number };
export type SetdGroup = SetArticleLike & { type: "group"; members?: number[] };
export type SetdAcl = SetBase & { type: "acl"; entries?: SetAclEntry[] };

export type SetDocument = SetArticle | SetNamespace | SetdUser | SetdGroup | SetdAcl;

function assertValidName(name: string) {
  if (!name?.trim()) throw new Error("invalid_name");
  if (name.includes(":") || name.includes(";")) throw new Error("invalid_name_char");
}

/**
 * Parse SID string into type and name parts.
 *
 * @param {string} sid - Full sid string in "type:name" format
 * @returns {{type: DocType, name: string} | null} Parsed type and name or null if invalid
 */
export function parseSid(sid: string): { type: DocType; name: string } | null {
  if (!sid || !sid.includes(":")) return null;
  const [type, ...rest] = sid.split(":");
  const name = rest.join(":").trim();
  if (!name) return null;
  return { type: type as DocType, name };
}

/**
 * Upsert a document of any DocType, update its sub-table, reset relations,
 * and reconstruct references automatically from Markdown content.
 * If `refs` is `undefined`, it handles like empty array `[]`.
 *
 * @param {SetDocument} input - Input payload describing the document and its data
 * @returns {Promise<number>} The numeric id of the document
 */
export async function setDocument(input: SetDocument): Promise<number> {
  const { type, name } = input;
  assertValidName(name);

  const acl_id = input.acl_id;
  const docRow = await one<{ id: number }>(
    `
    INSERT INTO documents (type, name, acl_id)
    VALUES ($1::doc_type, $2, $3)
    ON CONFLICT (sid) DO UPDATE
      SET type   = EXCLUDED.type,
          name   = EXCLUDED.name,
          acl_id = EXCLUDED.acl_id
    RETURNING id
    `,
    [type, name, acl_id],
  );
  if (!docRow?.id) throw new Error("upsert_documents_failed");
  const id = docRow.id;

  switch (type) {
    case "article": {
      const a = input as SetArticle;
      await q(
        `
        INSERT INTO articles (id, content_md, toc)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE
          SET content_md = EXCLUDED.content_md,
              toc = EXCLUDED.toc
        `,
        [id, a.content_md ?? "", a.toc ?? ""],
      );
      break;
    }
    case "namespace": {
      await q(
        `
        INSERT INTO namespaces (id)
        VALUES ($1)
        ON CONFLICT (id) DO NOTHING
        `,
        [id],
      );
      break;
    }
    case "user": {
      const u = input as SetdUser;
      await q(
        `
        INSERT INTO articles (id, content_md, toc)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE
          SET content_md = EXCLUDED.content_md,
              toc = EXCLUDED.toc
        `,
        [id, u.content_md ?? "", u.toc ?? ""],
      );
      await q(
        `
        INSERT INTO users_doc (id, user_idx)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE
          SET user_idx = EXCLUDED.user_idx
        `,
        [id, u.user_idx],
      );
      break;
    }
    case "group": {
      const g = input as SetdGroup;
      await q(
        `
        INSERT INTO articles (id, content_md, toc)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE
          SET content_md = EXCLUDED.content_md,
              toc = EXCLUDED.toc
        `,
        [id, g.content_md ?? "", g.toc ?? ""],
      );
      await q(
        `
        INSERT INTO groups_doc (id)
        VALUES ($1)
        ON CONFLICT (id) DO NOTHING
        `,
        [id],
      );

      await q(`DELETE FROM group_members WHERE group_id = $1`, [id]);
      if (g.members && g.members.length > 0) {
        const uniq = Array.from(new Set(g.members.filter((v) => Number.isInteger(v)).map((v) => Number(v))));
        if (uniq.length > 0) {
          await q(
            `
            INSERT INTO group_members (group_id, user_idx)
            SELECT $1, unnest($2::int[])
            ON CONFLICT (group_id, user_idx) DO NOTHING
            `,
            [id, uniq],
          );
        }
      }
      break;
    }
    case "acl": {
      await q(
        `
        INSERT INTO acls (id)
        VALUES ($1)
        ON CONFLICT (id) DO NOTHING
        `,
        [id],
      );
      await q(`DELETE FROM acl_entries WHERE acl_id = $1`, [id]);

      if (input.entries?.length) {
        // Resolve target_sid 2 (target_t, target_id)
        const rows = await q<{ sid: string; id: number; type: "user" | "group" }>(
          `SELECT sid, id, type::text AS type
            FROM documents
            WHERE sid = ANY($1::text[])
              AND type IN ('user','group')`,
          [input.entries.map((e) => e.target_sid)],
        );
        const sidMap = new Map(rows.map((r) => [r.sid, r]));
        // Push values N query DB
        const values: string[] = [];
        for (const e of input.entries) {
          const resolved = sidMap.get(e.target_sid);
          if (!resolved) continue;
          values.push(`(${id}, '${resolved.type}', ${resolved.id}, ${e.rud_mask}, ${e.allow})`);
        }
        if (values.length) {
          await q(
            `
            INSERT INTO acl_entries (acl_id, target_t, target_id, rud_mask, allow)
            VALUES ${values.join(",")}
            `,
          );
        }
      }
      break;
    }
  }

  const refs = input.refs ?? [];
  await q(`DELETE FROM doc_refs WHERE src_id = $1`, [id]);
  if (refs.length) {
    const rows = await q<{ sid: string; id: number }>(`SELECT sid, id FROM documents WHERE sid = ANY($1::text[])`, [refs]);
    const sidToId = new Map(rows.map((r) => [r.sid, r.id]));

    const resolved: any[] = [];
    const pending: any[] = [];
    for (const refSid of refs) {
      const dstId = sidToId.get(refSid);
      if (dstId) {
        resolved.push([id, dstId]);
      } else {
        pending.push([id, refSid]);
      }
    }
    if (resolved.length) {
      await q(
        `
        INSERT INTO doc_refs (src_id, dst_id, dst_sid)
        SELECT x.src_id, x.dst_id, NULL
        FROM UNNEST($1::bigint[], $2::bigint[]) AS x(src_id, dst_id)
        ON CONFLICT DO NOTHING
        `,
        [resolved.map((r) => r[0]), resolved.map((r) => r[1])],
      );
    }
    if (pending.length) {
      await q(
        `
        INSERT INTO doc_refs (src_id, dst_id, dst_sid)
        SELECT x.src_id, NULL, x.dst_sid
        FROM UNNEST($1::bigint[], $2::text[]) AS x(src_id, dst_sid)
        ON CONFLICT DO NOTHING
        `,
        [pending.map((r) => r[0]), pending.map((r) => r[1])],
      );
    }
  }

  return id;
}
