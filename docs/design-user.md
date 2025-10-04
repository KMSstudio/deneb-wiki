## 사용자 Users

id, user의 id
email, 대표이메일
name, 이름. snumail 을 통해서 검증됨. 아니면 null
certified, 이름 검증 여부
ctime,
info, 유저정보, json string
{major, snu_year, snu_postfix}

### Credential

id, credential의 id
email, user의 email
provider, local | google
password, 비밀번호
ctime, 등록일

### 회원가입

사용자가 생성될 경우, 사용자는 group:user 에 추가됩니다.
만약 자신이 첫 사용자일 경우, 사용자는 group:admin, group:system 에 추가됩니다.
만약 사용자가 OAuth 이메일 @domain.com 를 통해 로그인했다면, group:domain.com 에 해당 유저를 추가합니다.

- 일반화원가입: 이메일과 비밀번호로 가입합니다. 이름을 입력하게 합니다.
- google OAuth 회원가입: 만약 도메인이 `snu.ac.kr` 이라면, 이에 맞는 회원가입 폼으로 이동합니다. 아니라면, 이름을 입력합니다.

### 로그인

사용자가 로그인했을 경우, 사용자는 JWT를 발급받습니다.
해당 JWT는 cookie에 저장되며, 저장되는 정보는 user의 id, name 입니다.
