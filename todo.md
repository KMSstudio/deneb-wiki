# TODO.md

## KMSstudio

- `@/lib/acl.ts` 작성. 필요기능: `user` 권한 검증, 객체의 `acl_entry`화 및 유효 `acl_entry[]` check, acl에서 `refs` 추출. 함수 이름은 `extractRefsFromAcl`.
- `as any` 빼놓고 `"@typescript-eslint/no-explicit-any": "off",` `eslint.config.mjs`에서 빼기
