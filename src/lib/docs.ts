// @/lib/docs.ts

import { q, one } from "./db";

export type DocType =
  | "article"
  | "namespace"
  | "user"
  | "group"
  | "image"
  | "file"
  | "acl";

/** Basic Documents Row Query */
export type DocRow = {
  id: number;
  sid: string;
  type: DocType;
  name: string;
  mtime: string;
  ctime: string;
  nref: number;
  _ref: string;
  nlink: number;
  _link: string;
};

export type ArticleRow = {
  content_md: string;
  table_of_content: string;
};

/* ─────────────────────────────────────────────────────────
 * Document Specified Type (discriminated union)
 * ───────────────────────────────────────────────────────── */
type Base = DocRow & {
  /** 정규화된 참조 정보 */
  refs: string[];       // 내가 가리키는 sid 목록
  links: string[];  // 나를 가리키는 sid 목록
};

export type Article = Base & {
  type: "article";
  content_md: string;
  table_of_content: string;
  /** namespace that `this` is included. list of `sid` */
  namespaces: string[];
};

export type Namespace = Base & {
  type: "namespace";
  /** article that `this` includes. list of `sid` */
  articles: string[];
};

export type dUser = Base & {
  type: "user";
  content_md: string;
  table_of_content: string;
  user_idx: number;
};

export type dGroup = Base & {
  type: "group";
  content_md: string;
  table_of_content: string;
  nuser: number;
  _user: string; // ';' seperated `user_idx` list
};

export type dImage = Base & {
  type: "image";
  _img: string;
};

export type dFile = Base & {
  type: "file";
  _file: string;
};

export type AclEntry = {
  target_t: "user" | "group";
  target_id: number;
  target_sid: string | null;
  rud_mask: number; // R=4, U=2, D=1
  allow: boolean;
};

export type dAcl = Base & {
  type: "acl";
  entries: AclEntry[];
};

export type Document = Article | Namespace | dUser | dGroup | dImage | dFile | dAcl;

/* ─────────────────────────────────────────────────────────
 * Lightweight Queries (Maintain)
 * ───────────────────────────────────────────────────────── */
export async function listRecentDocuments(limit = 50): Promise<DocRow[]> {
  return q<DocRow>(
    `SELECT id, sid, type::text AS type, name, mtime, ctime, nref, _ref, nlink, _link
       FROM documents
      ORDER BY mtime DESC
      LIMIT $1`,
    [limit]
  );
}

export async function getDocumentBySid(sid: string): Promise<DocRow | null> {
  return one<DocRow>(
    `SELECT id, sid, type::text AS type, name, mtime, ctime, nref, _ref, nlink, _link
       FROM documents
      WHERE sid = $1`,
    [sid]
  );
}

export async function getArticleById(id: number): Promise<ArticleRow | null> {
  return one<ArticleRow>(
    `SELECT content_md, table_of_content
       FROM articles
      WHERE id = $1`,
    [id]
  );
}

export async function getRefsOf(docId: number): Promise<{ ref_sid: string }[]> {
  return q<{ ref_sid: string }>(
    `SELECT COALESCE(d2.sid, r.dst_sid) AS ref_sid
       FROM doc_refs r
  LEFT JOIN documents d2 ON d2.id = r.dst_id
      WHERE r.src_id = $1
   ORDER BY ref_sid`,
    [docId]
  );
}

export async function getLinksOf(docId: number): Promise<{ src_sid: string }[]> {
  return q<{ src_sid: string }>(
    `SELECT d1.sid AS src_sid
       FROM doc_refs r
       JOIN documents d1 ON d1.id = r.src_id
      WHERE r.dst_id = $1
   ORDER BY d1.sid`,
    [docId]
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
    [articleId]
  );
}

export async function listArticlesInNamespace(namespaceSid: string) {
  return q<{ article_sid: string }>(
    `
    WITH ns AS (
      SELECT id FROM documents WHERE sid = $1 AND type = 'namespace'
    )
    -- 권장 방향: namespace → article
    SELECT a.sid AS article_sid
      FROM doc_refs r
      JOIN ns ON ns.id = r.src_id
      JOIN documents a ON a.id = r.dst_id
     WHERE a.type = 'article'
    `,
    [namespaceSid]
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

  const refs = doc._ref ? doc._ref.split(";") : [];
  const links = doc._link ? doc._link.split(";") : [];

  switch (doc.type) {
    case "article": {
      const art = await getArticleById(doc.id);
      const namespaces = (await getNamespacesOfArticle(doc.id)).map((r) => r.namespace_sid);
      return {
        ...doc,
        type: "article",
        content_md: art?.content_md ?? "",
        table_of_content: art?.table_of_content ?? "",
        refs,
        links,
        namespaces,
      };
    }

    case "namespace": {
      const nsMembers = (await listArticlesInNamespace(doc.sid)).map((r) => r.article_sid);
      return {
        ...doc,
        type: "namespace",
        refs,
        links,
        articles: nsMembers,
      };
    }

    case "user": {
      // user(article)
      const art = await one<ArticleRow>(
        `SELECT content_md, table_of_content FROM articles WHERE id=$1`,
        [doc.id]
      );
      const u = await one<{ user_idx: number }>(
        `SELECT user_idx FROM users_doc WHERE id=$1`,
        [doc.id]
      );
      return {
        ...doc,
        type: "user",
        content_md: art?.content_md ?? "",
        table_of_content: art?.table_of_content ?? "",
        user_idx: u?.user_idx ?? 0,
        refs,
        links,
      };
    }

    case "group": {
      const art = await one<ArticleRow>(
        `SELECT content_md, table_of_content FROM articles WHERE id=$1`,
        [doc.id]
      );
      const g = await one<{ nuser: number; _user: string }>(
        `SELECT nuser, _user FROM groups_doc WHERE id=$1`,
        [doc.id]
      );
      return {
        ...doc,
        type: "group",
        content_md: art?.content_md ?? "",
        table_of_content: art?.table_of_content ?? "",
        nuser: g?.nuser ?? 0,
        _user: g?._user ?? "",
        refs,
        links,
      };
    }

    case "image": {
      const img = await one<{ _img: string }>(
        `SELECT _img FROM images WHERE id=$1`,
        [doc.id]
      );
      return {
        ...doc,
        type: "image",
        _img: img?._img ?? "",
        refs,
        links,
      };
    }

    case "file": {
      const f = await one<{ _file: string }>(
        `SELECT _file FROM files WHERE id=$1`,
        [doc.id]
      );
      return {
        ...doc,
        type: "file",
        _file: f?._file ?? "",
        refs,
        links: links,
      };
    }

    case "acl": {
      const entries = await q<AclEntry & { target_sid: string | null }>(
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
        [doc.id]
      );
      return {
        ...doc,
        type: "acl",
        entries,
        refs,
        links: links,
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
  acl_id?: number | null;
  refs?: string[];
};

export type SetArticle = SetBase & {
  type: "article";
  content_md?: string;
  table_of_content?: string;
};

export type SetNamespace = SetBase & {
  type: "namespace";
};

export type SetdUser = SetBase & {
  type: "user";
  user_idx: number;
  content_md?: string;
  table_of_content?: string;
};

export type SetdGroup = SetBase & {
  type: "group";
  content_md?: string;
  table_of_content?: string;
  members?: number[]; // replaces group_members if provided
};

export type SetdImage = SetBase & {
  type: "image";
  _img: string;
};

export type SetdFile = SetBase & {
  type: "file";
  _file: string;
};

export type SetdAcl = SetBase & {
  type: "acl";
  entries?: AclEntry[]; // replaces acl_entries if provided
};

export type SetDocument =
  | SetArticle
  | SetNamespace
  | SetdUser
  | SetdGroup
  | SetdImage
  | SetdFile
  | SetdAcl;

function assertValidName(name: string) {
  if (!name?.trim()) throw new Error("invalid_name");
  if (name.includes(":") || name.includes(";")) throw new Error("invalid_name_char");
}

// ─────────────────────────────────────────────────────────
// setDocument: upsert
//  - documents upsert for every DocType
//  - doc_refs reconstruct
//  - (acl) entries are deleted and reset
//  - (group) members are deleted and reset
// ─────────────────────────────────────────────────────────

export async function setDocument(input: SetDocument): Promise<number> {
  const { type, name } = input;
  assertValidName(name);

  const acl_id = input.acl_id ?? null;
  const refs = input.refs ?? [];

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
    [type, name, acl_id]
  );
  if (!docRow?.id) throw new Error("upsert_documents_failed");
  const id = docRow.id;

  switch (type) {
    case "article": {
      const a = input as SetArticle;
      await q(
        `
        INSERT INTO articles (id, content_md, table_of_content)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE
          SET content_md = EXCLUDED.content_md,
              table_of_content = EXCLUDED.table_of_content
        `,
        [id, a.content_md ?? "", a.table_of_content ?? ""]
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
        [id]
      );
      break;
    }
    case "user": {
      const u = input as SetdUser;
      await q(
        `
        INSERT INTO articles (id, content_md, table_of_content)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE
          SET content_md = EXCLUDED.content_md,
              table_of_content = EXCLUDED.table_of_content
        `,
        [id, u.content_md ?? "", u.table_of_content ?? ""]
      );
      await q(
        `
        INSERT INTO users_doc (id, user_idx)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE
          SET user_idx = EXCLUDED.user_idx
        `,
        [id, u.user_idx]
      );
      break;
    }
    case "group": {
      const g = input as SetdGroup;
      await q(
        `
        INSERT INTO articles (id, content_md, table_of_content)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE
          SET content_md = EXCLUDED.content_md,
              table_of_content = EXCLUDED.table_of_content
        `,
        [id, g.content_md ?? "", g.table_of_content ?? ""]
      );
      await q(
        `
        INSERT INTO groups_doc (id)
        VALUES ($1)
        ON CONFLICT (id) DO NOTHING
        `,
        [id]
      );
      
      await q(`DELETE FROM group_members WHERE group_id = $1`, [id]);
      if (g.members?.length) {
        const uniq = Array.from(new Set(g.members.filter((v) => Number.isInteger(v)).map(Number)));
        await q(
          `
          INSERT INTO group_members (group_id, user_idx)
          SELECT $1, x FROM UNNEST($2::int[]) AS x
          ON CONFLICT DO NOTHING
          `,
          [id, uniq]
        );
      }
      break;
    }
    case "image": {
      const im = input as SetdImage;
      await q(
        `
        INSERT INTO images (id, _img)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE
          SET _img = EXCLUDED._img
        `,
        [id, im._img]
      );
      break;
    }
    case "file": {
      const f = input as SetdFile;
      await q(
        `
        INSERT INTO files (id, _file)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE
          SET _file = EXCLUDED._file
        `,
        [id, f._file]
      );
      break;
    }
    case "acl": {
      const a = input as SetdAcl;
      await q(
        `
        INSERT INTO acls (id)
        VALUES ($1)
        ON CONFLICT (id) DO NOTHING
        `,
        [id]
      );
      await q(`DELETE FROM acl_entries WHERE acl_id = $1`, [id]);
      if (a.entries?.length) {
        for (const e of a.entries) {
          await q(
            `
            INSERT INTO acl_entries (acl_id, target_t, target_id, rud_mask, allow)
            VALUES ($1, $2::acl_target, $3, $4, $5)
            `,
            [id, e.target_t, e.target_id, e.rud_mask, e.allow]
          );
        }
      }
      break;
    }
  }

  await q(`DELETE FROM doc_refs WHERE src_id = $1`, [id]);
  if (refs.length) {
    for (const refSid of refs) {
      const dst = await one<{ id: number }>(
        `SELECT id FROM documents WHERE sid = $1`,
        [refSid]
      );
      if (dst?.id) {
        await q(
          `
          INSERT INTO doc_refs (src_id, dst_id, dst_sid)
          VALUES ($1, $2, NULL)
          ON CONFLICT DO NOTHING
          `,
          [id, dst.id]
        );
      } else {
        await q(
          `
          INSERT INTO doc_refs (src_id, dst_id, dst_sid)
          VALUES ($1, NULL, $2)
          ON CONFLICT DO NOTHING
          `,
          [id, refSid]
        );
      }
    }
  }

  return id;
}

/* ─────────────────────────────────────────────────────────
 * Utility Functions
 * ───────────────────────────────────────────────────────── */

export function parseSid(sid: string): { type: DocType; name: string } | null {
  if (!sid || !sid.includes(":")) return null;
  const [type, ...rest] = sid.split(":");
  const name = rest.join(":").trim();
  if (!name) return null;
  return { type: type as DocType, name };
}
