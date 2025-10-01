
# API Edit Examples (`/api/e/[sid]`)

> 최초작성일 2025.09.29  
> 최신개정일 2025.09.29  
> 작성자 강명석  
> 최신개정자 강명석  

이 문서는 `POST /api/e/[sid]` 라우트에 전달할 **요청 본문(body)** 예시를 DocType 별로 정리합니다.  
본문은 **JSON** 이며, `sid`는 `type:name` 형식입니다. 예: `article:intro`, `group:scsc-core`, `acl:default`.

> 공통 규칙
> - `acl_id`는 `number|null` 입니다. 생략 시 `null` 취급됩니다.
> - 문서가 **이미 존재**하고 해당 문서에 `acl_id`가 설정되어 있으면, 업데이트 전 **U 비트(0b010)** 권한 검사를 수행합니다.
> - `doc_refs`(문서 간 링크)는 `content_md` 에 포함된 `/w/...` 링크에서 자동 추출됩니다. 예: `/w/article:intro`, `/w/user:john`

## 1 Article

- **SID 예시:** `/api/e/article:intro`
- **Body 필드:**
  - `content_md?: string` (기본값 `""`)
  - `table_of_content?: string|null` (생략 가능)

### 최소 예시
```json
{
  "content_md": "# 소개\nSCSC 아카이브에 오신 것을 환영합니다."
}
```

### 전체 예시
```json
{
  "acl_id": 10,
  "content_md": "# 소개\n[프로젝트](/w/article:project) 페이지를 참고하세요.",
  "table_of_content": "<ul><li>소개</li></ul>"
}
```

> 참고: `content_md`의 링크 중 `/w/`로 시작하는 것들은 참조로 인식되어 `doc_refs`로 저장됩니다.

## 2 Namespace

- **SID 예시:** `/api/e/namespace:docs`
- **Body 필드:** (없음, 옵션으로 `acl_id`만 허용)

### 최소 예시
```json
{}
```

### 전체 예시
```json
{
  "acl_id": 3
}
```

## 3 User

- **SID 예시:** `/api/e/user:john`
- **Body 필드:**
  - `user_idx_req: number` (**필수**) — 이 User 문서가 연결될 실제 사용자 식별자
  - `content_md?: string`
  - `table_of_content?: string|null`

### 최소 예시
```json
{
  "user_idx_req": 1024
}
```

### 전체 예시
```json
{
  "acl_id": 5,
  "user_idx_req": 1024,
  "content_md": "## 존의 페이지\n- 관심사: 분산시스템\n자세한 정보는 [/w/article:intro](/w/article:intro)",
  "table_of_content": "<ul><li>프로필</li></ul>"
}
```

> 주의: 새로운 User 문서를 생성할 때는, 실제 요청자와 매핑되는 사용자임을 별도 정책으로 확인하는 것을 권장합니다.

## 4 Group

- **SID 예시:** `/api/e/group:scsc-core`
- **Body 필드:**
  - `members?: number[]` — 유저 인덱스 배열(중복 및 비정수는 제거됨)
  - `content_md?: string`
  - `table_of_content?: string|null`

### 최소 예시
```json
{
  "members": [1, 2, 3]
}
```

### 전체 예시
```json
{
  "acl_id": 8,
  "members": [1, 2, 2, 3, 5],
  "content_md": "# SCSC Core\n- 운영진 소개 ([링크](/w/user:admin))",
  "table_of_content": "<ul><li>구성원</li></ul>"
}
```

> 참고: 기존 멤버 목록은 업데이트 시 **전부 삭제 후 재구성**됩니다.

## 5 Image

- **SID 예시:** `/api/e/image:logo`
- **Body 필드:**
  - `_img: string | Buffer-like` (**필수**) — 바이너리/베이스64 등 저장 전략은 서버 구현에 따름

### 최소 예시
```json
{
  "_img": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### 전체 예시
```json
{
  "acl_id": 2,
  "_img": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

## 6 File

- **SID 예시:** `/api/e/file:guide-pdf`
- **Body 필드:**
  - `_file: string | Buffer-like` (**필수**)

### 최소 예시
```json
{
  "_file": "UEsDBBQAAAAIA... (zip/pdf bytes encoded)"
}
```

### 전체 예시
```json
{
  "acl_id": 6,
  "_file": "UEsDBBQAAAAIA..."
}
```

## 7 ACL

- **SID 예시:** `/api/e/acl:default`
- **Body 필드:**
  - `entries?: Array<{ target_t: string, target_id: number, rud_mask: number, allow: boolean }>`

### 최소 예시
```json
{
  "entries": [
    { "target_t": "user", "target_id": 1, "rud_mask": 7, "allow": true }
  ]
}
```

### 전체 예시
```json
{
  "acl_id": null,
  "entries": [
    { "target_t": "group", "target_id": 10, "rud_mask": 6, "allow": true },
    { "target_t": "user", "target_id": 1024, "rud_mask": 4, "allow": true },
    { "target_t": "user", "target_id": 2048, "rud_mask": 1, "allow": false }
  ]
}
```

> 참고: 업데이트 시 기존 `acl_entries`는 **전부 삭제 후 재삽입**됩니다.

---

## cURL 예시 모음

### Article 생성/업데이트
```bash
curl -X POST "https://example.com/api/e/article:intro" \
  -H "Content-Type: application/json" \
  -d '{
    "acl_id": 10,
    "content_md": "# 소개\n[프로젝트](/w/article:project)",
    "table_of_content": "<ul><li>소개</li></ul>"
  }'
```

### User 생성/업데이트
```bash
curl -X POST "https://example.com/api/e/user:john" \
  -H "Content-Type: application/json" \
  -d '{
    "user_idx_req": 1024,
    "content_md": "## 존의 페이지",
    "table_of_content": null
  }'
```

### Group 생성/업데이트
```bash
curl -X POST "https://example.com/api/e/group:scsc-core" \
  -H "Content-Type: application/json" \
  -d '{
    "members": [1,2,3,5],
    "content_md": "# Core",
    "table_of_content": "<ul><li>구성원</li></ul>"
  }'
```

### ACL 생성/업데이트
```bash
curl -X POST "https://example.com/api/e/acl:default" \
  -H "Content-Type: application/json" \
  -d '{
    "entries": [
      { "target_t": "group", "target_id": 10, "rud_mask": 6, "allow": true },
      { "target_t": "user", "target_id": 1024, "rud_mask": 4, "allow": true }
    ]
  }'
```
