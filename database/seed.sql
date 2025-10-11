-- =====================================
-- seed.sql
-- =====================================

-- ENUM 타입은 schema.sql 에서 이미 정의됨
-- 기본 데이터는 schema.sql 실행 후 주입

-- =====================================
-- 기본 namespace 생성
-- =====================================
INSERT INTO documents (type, name)
VALUES 
  ('namespace', '필요한 article'),
  ('namespace', '필요한 namespace'),
  ('namespace', '필요한 user'),
  ('namespace', '필요한 group');

-- =====================================
-- 기본 group 생성
-- =====================================
INSERT INTO documents (type, name)
VALUES 
  ('group', 'snu.ac.kr'),
  ('group', 'admin'),
  ('group', 'users');

-- 그룹을 article 기반으로 만들어야 하므로 article → group_doc 삽입
INSERT INTO articles (id, content_md)
SELECT id, 'Default group description' 
FROM documents WHERE type='group';

INSERT INTO groups_doc (id)
SELECT id FROM documents WHERE type='group';

-- =====================================
-- admin ACL 생성
-- =====================================
INSERT INTO documents (type, name)
VALUES 
  ('acl', 'admin문서'),
  ('acl', '@snu.ac.kr');

-- ACL article stub
INSERT INTO articles (id, content_md)
SELECT id, 'Default ACL description' 
FROM documents WHERE type='acl';

INSERT INTO acls (id)
SELECT id FROM documents WHERE type='acl';

-- admin ACL entries
INSERT INTO acl_entries (acl_id, target_t, target_id, rud_mask, allow)
SELECT d.id, 'group', g.id, 7, TRUE
FROM documents d, documents g
WHERE d.type='acl' AND d.name='admin문서' AND g.type='group' AND g.name='admin';

INSERT INTO acl_entries (acl_id, target_t, target_id, rud_mask, allow)
SELECT d.id, 'group', g.id, 4, TRUE
FROM documents d, documents g
WHERE d.type='acl' AND d.name='admin문서' AND g.type='group' AND g.name='users';

-- snu.ac.kr ACL entries
INSERT INTO acl_entries (acl_id, target_t, target_id, rud_mask, allow)
SELECT d.id, 'group', g.id, 7, TRUE
FROM documents d, documents g
WHERE d.type='acl' AND d.name='@snu.ac.kr' AND g.type='group' AND g.name='snu.ac.kr';

INSERT INTO acl_entries (acl_id, target_t, target_id, rud_mask, allow)
SELECT d.id, 'group', g.id, 4, TRUE
FROM documents d, documents g
WHERE d.type='acl' AND d.name='@snu.ac.kr' AND g.type='group' AND g.name='users';

-- =====================================
-- base_acl: document type 기본 ACL
-- =====================================
INSERT INTO base_acl (type, acl)
VALUES
  ('article', NULL),
  ('namespace', NULL),
  ('user', NULL),
  ('group', NULL),
  ('acl', NULL);

-- =====================================
-- config: 빈 KV 테이블 (초기값 없음)
-- =====================================

