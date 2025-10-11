-- =====================================
-- schema.sql (revised to requested real DB shape)
-- =====================================

-- ENUMS
CREATE TYPE doc_type   AS ENUM ('article','namespace','user','group','acl');
DROP TYPE IF EXISTS acl_target CASCADE;
CREATE TYPE acl_target AS ENUM ('user','group');

-- IMMUTABLE helper for generated column (sid)
CREATE OR REPLACE FUNCTION make_sid(p_type doc_type, p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$ SELECT p_type::text || ':' || p_name $$;

-- =====================================
-- USERS
-- =====================================
CREATE TABLE auth_users (
  idx       BIGSERIAL PRIMARY KEY,
  email     TEXT NOT NULL,
  name      TEXT,
  certified BOOLEAN NOT NULL DEFAULT false,
  info      TEXT,
  ctime     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================
-- CREDENTIALS
-- =====================================
CREATE TABLE credentials (
  id        BIGSERIAL PRIMARY KEY,
  user_idx  BIGINT NOT NULL REFERENCES auth_users(idx) ON DELETE CASCADE,
  provider  TEXT NOT NULL CHECK (provider IN ('local','google')),
  email     TEXT NOT NULL,
  password  TEXT NOT NULL DEFAULT '',
  ctime     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, email),
  UNIQUE (provider, user_idx)
);

-- =====================================
-- BASE: documents
-- =====================================
CREATE TABLE documents (
  id      BIGSERIAL PRIMARY KEY,                 -- internal numeric PK
  type    doc_type NOT NULL,                     -- document type
  name    TEXT NOT NULL,                         -- local name (no ':' or ';')
  sid     TEXT GENERATED ALWAYS AS (make_sid(type, name)) STORED UNIQUE, -- global id 'type:name'
  nid     BIGINT GENERATED ALWAYS AS IDENTITY,   -- global incremental number
  acl_id  BIGINT NULL,                           -- -> acls.id (FK added after acls created)
  mtime   TIMESTAMPTZ NOT NULL DEFAULT now(),    -- last modified
  ctime   TIMESTAMPTZ NOT NULL DEFAULT now(),    -- created

  -- input guard for name (keep sid well-formed)
  CONSTRAINT ck_documents_name_format CHECK (name !~ '[:;]')
);

CREATE UNIQUE INDEX documents_nid_unique    ON documents(nid);
CREATE INDEX documents_type_name_idx        ON documents(type, name);
CREATE INDEX documents_acl_idx              ON documents(acl_id);
CREATE INDEX documents_mtime_idx            ON documents(mtime);

-- =====================================
-- REFERENCES graph (normalized)
-- =====================================
CREATE TABLE doc_refs (
  id      BIGSERIAL PRIMARY KEY,
  src_id  BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE, -- linking doc
  dst_id  BIGINT NULL  REFERENCES documents(id) ON DELETE SET NULL,   -- target doc (if present)
  dst_sid TEXT   NULL,                                                -- pending target sid (type:name)
  ctime   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- prevent duplicates per mode
  CONSTRAINT uq_doc_refs_resolved UNIQUE (src_id, dst_id),
  CONSTRAINT uq_doc_refs_pending  UNIQUE (src_id, dst_sid),

  -- exactly one of (dst_id, dst_sid)
  CONSTRAINT ck_doc_refs_one_of CHECK (
    (dst_id IS NOT NULL AND dst_sid IS NULL)
    OR
    (dst_id IS NULL AND dst_sid IS NOT NULL)
  ),

  -- sid format 'type:name' and disallow ':'/';' in name part
  CONSTRAINT ck_dst_sid_format CHECK (dst_sid IS NULL OR dst_sid ~ '^[a-z]+:[^:;]+$')
);

CREATE INDEX doc_refs_src_idx    ON doc_refs(src_id);
CREATE INDEX doc_refs_dst_idx    ON doc_refs(dst_id);
CREATE INDEX doc_refs_dstsid_idx ON doc_refs(dst_sid);

-- =====================================
-- ARTICLE (inherits document)
-- =====================================
CREATE TABLE articles (
  id   BIGINT PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  content_md       TEXT NOT NULL,             -- markdown + LaTeX
  toc TEXT NOT NULL DEFAULT ''   -- HTML (used to replace [spec:목차] at render)
);

-- =====================================
-- NAMESPACE (inherits document)
-- =====================================
CREATE TABLE namespaces (
  id BIGINT PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE
);

-- =====================================
-- USER (inherits article)
-- =====================================
CREATE TABLE users_doc (
  id       BIGINT PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
  user_idx BIGINT NOT NULL REFERENCES auth_users(idx) ON DELETE CASCADE
);

-- =====================================
-- GROUP (inherits article)
-- =====================================
CREATE TABLE groups_doc (
  id    BIGINT PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE
);

-- normalized group membership
CREATE TABLE group_members (
  id        BIGSERIAL PRIMARY KEY,
  group_id  BIGINT NOT NULL REFERENCES groups_doc(id) ON DELETE CASCADE,
  user_idx  BIGINT NOT NULL REFERENCES auth_users(idx) ON DELETE CASCADE,
  UNIQUE (group_id, user_idx)
);

CREATE INDEX group_members_gid_idx ON group_members(group_id);
CREATE INDEX group_members_uidx    ON group_members(user_idx);



-- =====================================
-- (removed) IMAGE/FILE tables: per request, not part of doc_type nor schema
-- =====================================

-- =====================================
-- ACL (inherits document) + entries
-- =====================================
CREATE TABLE acls (
  id BIGINT PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE acl_entries (
  id        BIGSERIAL PRIMARY KEY,
  acl_id    BIGINT NOT NULL REFERENCES acls(id) ON DELETE CASCADE,
  target_t  acl_target NOT NULL,        -- 'user' | 'group'
  target_id BIGINT NOT NULL,            -- users_doc.id or groups_doc.id (validated in app)
  rud_mask  SMALLINT NOT NULL CHECK (rud_mask BETWEEN 0 AND 7), -- R=4, U=2, D=1
  allow     BOOLEAN  NOT NULL
);
CREATE INDEX acl_entries_acl_idx ON acl_entries(acl_id);
CREATE INDEX acl_entries_target  ON acl_entries(target_t, target_id);

-- add FK for documents.acl_id now that acls exists (breaks the cycle cleanly)
ALTER TABLE documents
  ADD CONSTRAINT documents_acl_fk
  FOREIGN KEY (acl_id) REFERENCES acls(id) ON DELETE SET NULL;

-- =====================================
-- MEDIA (independent from documents)
-- =====================================
CREATE TABLE media (
  mid         BIGSERIAL PRIMARY KEY,
  type        TEXT NOT NULL CHECK (type IN ('image','file')),
  upload_user BIGINT NOT NULL REFERENCES users_doc(id) ON DELETE CASCADE,
  upload_name TEXT NOT NULL,
  name        TEXT NOT NULL UNIQUE,
  ctime       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- specialized views
CREATE TABLE images (
  mid  BIGINT PRIMARY KEY REFERENCES media(mid) ON DELETE CASCADE
);

CREATE TABLE files (
  mid  BIGINT PRIMARY KEY REFERENCES media(mid) ON DELETE CASCADE
);

-- =====================================
-- CONFIG (base acl, KV store)
-- =====================================

CREATE TABLE base_acl (
  type doc_type PRIMARY KEY,
  acl  TEXT NULL
);

CREATE TABLE config (
  key   TEXT PRIMARY KEY,
  value TEXT NULL
);

-- =====================================
-- TRIGGERS / FUNCTIONS
-- =====================================

-- documents.mtime auto-update on documents UPDATE
CREATE OR REPLACE FUNCTION set_mtime_now()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.mtime := now();
  RETURN NEW;
END$$;

CREATE TRIGGER documents_mtime_trg
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION set_mtime_now();

-- touch parent documents.mtime when child rows change
CREATE OR REPLACE FUNCTION touch_document_mtime()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE documents SET mtime = now() WHERE id = NEW.id;
  RETURN NEW;
END$$;

CREATE TRIGGER articles_touch_doc_mtime    AFTER UPDATE ON articles    FOR EACH ROW EXECUTE FUNCTION touch_document_mtime();
CREATE TRIGGER users_doc_touch_doc_mtime   AFTER UPDATE ON users_doc   FOR EACH ROW EXECUTE FUNCTION touch_document_mtime();
CREATE TRIGGER groups_doc_touch_doc_mtime  AFTER UPDATE ON groups_doc  FOR EACH ROW EXECUTE FUNCTION touch_document_mtime();
CREATE TRIGGER namespaces_touch_doc_mtime  AFTER UPDATE ON namespaces  FOR EACH ROW EXECUTE FUNCTION touch_document_mtime();
CREATE TRIGGER acls_touch_doc_mtime        AFTER UPDATE ON acls        FOR EACH ROW EXECUTE FUNCTION touch_document_mtime();

-- resolve doc_refs.dst_sid immediately if target exists
CREATE OR REPLACE FUNCTION trg_doc_refs_resolve_immediate()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_id BIGINT;
BEGIN
  IF NEW.dst_sid IS NOT NULL THEN
    SELECT id INTO v_id FROM documents WHERE sid = NEW.dst_sid;
    IF FOUND THEN
      NEW.dst_id := v_id;
      NEW.dst_sid := NULL;
    END IF;
  END IF;
  RETURN NEW;
END$$;

CREATE TRIGGER doc_refs_resolve_immediate_trg
BEFORE INSERT OR UPDATE ON doc_refs
FOR EACH ROW EXECUTE FUNCTION trg_doc_refs_resolve_immediate();

-- auto-resolve pending refs when a new document appears
CREATE OR REPLACE FUNCTION trg_documents_resolve_pending()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE doc_refs
     SET dst_id = NEW.id, dst_sid = NULL
   WHERE dst_id IS NULL AND dst_sid = NEW.sid;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS documents_resolve_refs_trg ON documents;
CREATE TRIGGER documents_resolve_refs_trg
AFTER INSERT ON documents
FOR EACH ROW EXECUTE FUNCTION trg_documents_resolve_pending();

-- when a dst document is deleted, convert dst_id -> NULL and keep its sid in dst_sid
CREATE OR REPLACE FUNCTION trg_documents_handle_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE doc_refs
     SET dst_sid = OLD.sid,
         dst_id = NULL
   WHERE dst_id = OLD.id;
  RETURN OLD;
END$$;

DROP TRIGGER IF EXISTS documents_delete_refs_trg ON documents;
CREATE TRIGGER documents_delete_refs_trg
AFTER DELETE ON documents
FOR EACH ROW EXECUTE FUNCTION trg_documents_handle_delete();
