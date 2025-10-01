
## document

document 는 아래 요소로 구성된다.

type, document 의 type.
name, document 의 name.
sid, `type:name` 형태의 문자열
nid, 문서번호. 1부터 incremental 하는 값
acl, 문서에 적용되는 acl의 sid. 만약 빈 문자열 또는 null 일 경우, acl 검사를 하지 않음
mtime, 마지막으로 modifyed 된 시간
ctime, 생성 시간
nlink*, document를 참조하고 있는 document의 수
_link*, document를 참조하고 있는 document의 sid 나열. ; seperated value
nref*, document가 참조하고 있는 document의 수
_ref*, document가 참조하고 있는 document의 sid 나열. ; seperated value

document는 다른 document를 참조할 수 있다.
src: source의 sid
dst: destination의 sid
ctime: 생성 시간

_link 에는 존재하는 sid 만이 존재한다.
_ref 에는 아직 존재하지 않는 sid가 존재할 수 있다.

모든 document는 삭제될 때, 자신이 참조하고 있는 document 들의 link를 수정해야 한다. 따라서, 모든 document 는 반드시 존재하는 document 에게 참조된다.
모든 document는 삭제될 때, 자신을 참조하고 있는 document 가 있다면 자신을 [namespace:필요한 ${type}]에 등록한다.
document는 삭제될 때, 다음과 같은 기작을 수행한다.
자신을 참조하고 있는 document, this가 dst인 reference를 찾는다. 만약 이것이 존재한다면, 자신을 [namespace:필요한 ${type}]에 등록한다.
자신이 참조하고 있는 document, this가 src인 reference를 찾고, 이것을 지운다. 또한 이때, (this, dst) 를 지운 후, (dst 문서가 존재하지 않음 && 해당 문서를 dst로 삼는 다른 reference가 없음) 이라면, 이것을 [namespace: 필요한 ${dst.type}]에서 지운다.

* 이 붙어있는, nref, nlink, _ref, _link 값은, 실제 SQL table에 존재하지는 않고 개념적으로만 존재한다. user 레벨에서 query가 발생했을 때, 해당 정보가 계산되어 함께 전달된다.

document는 acl을 가질 수 있다.
acl은, random user가 this를 Read/Update/Delete 가능한지 판단한다
1. 만약 acl이 falsy 한 값일 경우, 모든 것을 allow 한다. RUD=111 이다.
2. 만약 acl이 존재하는 경우, acl의 모든 튜플에 대해 첫 튜플부터 2a~2c를 수행한다.
   2a. 초기에, RUD 값을 000으로 둔다.
   2b. 만약, 튜플의 target에 user가 포함되고, allow 하면, RUD |= tuple.RUD 이다.
   2c. 만약, 튜플의 target에 user가 포함되고, disallow 하면, RUD &= ~tuple.RUD 이다.
3. 최종으로 계산된 값이 user의 RUD이다.

document 를 상속하는 요소는 아래와 같다.

article
namespace
user
group
acl

### 글 article

article 은 document 를 상속한다.

아래 요소를 가진다.

document 가 가진 모든 요소
content, article의 글 내용. markdown + latex형식
table_of_content, article의 목차. HTML로 작성 형식. 렌더링 시 content의 [spec:목차] 가 이 HTML로 대체됨

아래같은 기능을 가진다.
_ref 중 namespace type 인 document 만 들러서, 이 문서의 분류 _space 를 만들 수 있다. 마찬가지로 개념적인 ㄱ밧이고, 실제 DB에는 존재하지 않는다.

### 분류 namespace

namespace 는 document 를 상속한다.

namespace는 서로를 참조할 수 있다. n -> m 인 동시에 m -> n 일 수 있다.

특수 namespace 들이 있다. 이들의 namespace는 admin acl 로 보호된다.
namespace:필요한 article
namsepace:필요한 namespace
namespace:필요한 user
namespace:필요한 group

### 사용자 user:snumail

user는 article를 상속한다.

아래 요소를 가진다.

article 가 가진 모든 요소
user_idx, 유저 번호

### 사용자그룹 group

group는 article을 상속한다.

아래 요소를 가진다

article가 가진 모든 요소
nuser, group에 속한 user의 수
_user, group에 속한 user 번호, ; seperated value

특수 group 들이 있다. 이들의 group은 admin acl로 보호된다.
group:snu.ac.kr
group:admin
group:users

## 사용자공간 acl

acl은 document 를 상속한다.

acl은 user, group를 참조할 수 있다. 참조하는 요소는 target의 일부다.

아래 요소를 가진다

document 가 가진 모든 요소
_acls, 아래 요소로 이루어진 튜플의 리스트
  tar, 타겟. user 또는 group
  type, Read-Update-Delete 의 세 값에 대한 bitmask. 예를 들어, Read-Update 라면, 110(2)=6
  allow, 참 또는 거짓. 참이라면 해당 권한을 allow, 거짓이라면 해당 권한을 disallow

특수 acl들이 있다. 이 acl은 admin acl로 보호된다.
acl:@snu.ac.kr - (group:snu.ac.kr, Read-Update-Delete, allow), (group:users, Read, allow)
acl:admin문서 - (group:admin, Read-Update-Delete, allow), (group:users, Read, allow)

## media

media 는 아래 요소로 구성된다.

mid, 미디어번호. 1부터 incremental 하는 값
type, media 의 type. image | file
upload_user, 업로드한 user
upload_name, 업로드될 당시의 파일 이름
name, 파일 이름. mid를 hash 한 뒤 적절히 자른 값.
ctime, 생성시각

media의 public url은 /media/{name} 이다.

### 사진 image

image는 media 이다.

upload에서 이미지 파일을 업로드 할 수 있다.
이후 [image:hashvalue] 또는 <img src=/media/hashvalue> 로 사용 가능하다.

### 파일 file

file은 media 이다

upload에서 이미지 파일을 업로드 할 수 있다.
이후 [file:hashvalue] 또는 `href=/media/hashvalue` 로 사용 가능하다.

## 사용자

id, user의 id
type, 가입방식
pw, 비밀번호의 hash 만약 가입방식이 자체로그인이 아니라면 빈 문자열
snumail, @snu.ac.kr의 prefix
name, 실제 이름. snumail 을 통해서 검증됨
mojor, 실제 전공. snumail 을 통해서 검증됨
snu_no_year, 학번의 년도
snu_no_post, 학번의 postfix 5자리
snu_no, f'{snu_no_year}_{snu_no_post}'

## 속성 config

config 테이블에는 여러 종류가 있다. 먼저 아래가 있다.

document base acl은 다음과 같이 구성된다.
type, document의 type
acl, 문서에 적용되는 acl의 sid. 만약 빈 문자열 또는 null일 경우, 검사를 하지 않음

만약 사용자가 U 권한을 가졌다면, 사용자는 새로운 type의 문서를 만들 권리를 가지고 있다.
