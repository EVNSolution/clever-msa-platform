# 18. Single Web Console Screen Map

## 문서 목적

이 문서는 `front-admin-console` 단일 웹 cutover에서 어떤 화면이 이미 shared route로 흡수됐는지 current migration map으로 정리한다.

이 문서는 구현 순서와 누락 점검용이다.  
현재 runtime truth는 `current-runtime-inventory.md`와 이 문서가 함께 따른다.

## 기준 원칙

1. 최종 단일 웹은 `front-admin-console` 하나다.
2. 경로는 `admin/operator`로 다시 나누지 않는다.
3. 같은 경로에서 `role + scope + self-service`로 화면을 분기한다.
4. `front-operator-console` 기능은 아래 세 분류로 나눈다.
   - shared route로 흡수
   - 기존 admin route 안의 role-specific panel로 흡수
   - obsolete and removable

## Route Map

| 이전 operator route | 이전 operator 역할 | 현재 단일 웹 대응 | 최종 경로 | 이관 방식 |
| --- | --- | --- | --- | --- |
| `/` | dashboard | `DashboardPage` | `/` | 단일 홈/dashboard로 유지 |
| `/account` | self-service | `/account` | `/me` | self-service canonical path를 `/me`로 이동, legacy redirect 유지 |
| `/announcements` | published announcement read | `/announcements` | `/announcements` | shared route 유지, 권한별 read/write 분기 |
| `/support` | self-service support | `/support` | `/support` | shared route 유지, 권한별 panel 분기 |
| `/notifications` | own inbox read | `/notifications` | `/notifications` | shared route 유지, 권한별 panel 분기 |
| `/drivers` | read list | `/drivers` | `/drivers` | shared route 유지, 권한별 row/action 분기 |
| `/drivers/new` | self-service request-like create | `/drivers/new` | `/drivers/new` | shared route 유지, 권한별 폼/제약 분기 |
| `/drivers/:driverRef` | driver summary read | `/drivers/:driverRef` | `/drivers/:driverRef` | detail 합치기 필요 |
| `/drivers/:driverRef/edit` | limited edit | `/drivers/:driverRef/edit` | `/drivers/:driverRef/edit` | shared route 유지, 권한별 폼 분기 |
| `/vehicles` | read list | `/vehicles` | `/vehicles` | shared route 유지, 권한별 row/action 분기 |
| `/vehicles/:vehicleRef` | read detail | `/vehicles/:vehicleRef` | `/vehicles/:vehicleRef` | shared route 유지, 권한별 panel 분기 |
| `/settlements` | read summary | `/settlements/*` | `/settlements` | admin 그룹 route 안으로 재구성 완료 |

## Governance Route Contract Sync

관리/회사 거버넌스 화면은 subject-first namespace로 고정한다.

| 화면 | 현재 route | canonical route | 비고 |
| --- | --- | --- | --- |
| 내 계정 | `/account` | `/me` | self-service namespace |
| 계정 요청 | `/accounts` | `/admin/account-requests` | admin governance namespace |
| 메뉴 정책 | `/admin/navigation-policy` | `/admin/menu-policy` | system admin governance namespace |
| 관리자 역할 | `/admin/manager-roles` | `/admin/manager-roles` | canonical 유지 |
| 회사 메뉴 정책 | `/company/navigation-policy` | `/company/menu-policy` | company governance namespace |

Legacy route는 runtime에서 삭제하지 않고 redirect alias로만 유지한다.

## Operator-only Pages

이전 cutover 시작 시점 기준 operator-only였던 화면은 아래 세 개였다.

1. `DashboardPage`
2. `Driver360Page`
3. `SettlementsPage`

현재 상태는 아래처럼 고정한다.

### 1. `DashboardPage`

- 최종 단일 웹의 `/` 홈으로 흡수 완료
- 로그인 후 첫 화면 역할
- 권한에 따라 요약 카드/빠른 링크를 다르게 노출

### 2. `Driver360Page`

- `front-admin-console`의 driver detail route로 흡수 완료
- detail 상단은 공통으로 유지하고
- role에 따라 보이는 summary panel만 달라지게 만든다

### 3. `SettlementsPage`

- `front-admin-console`의 settlement 그룹 route로 흡수 완료
- `read-only summary`는 shared page
- `criteria / inputs / runs / results` 중 write 성격은 권한 있는 사용자에게만 노출

## Operator Route Without Separate Value

아래는 별도 앱으로 남을 가치가 없다.

1. `AnnouncementsPage`
2. `SupportPage`
3. `NotificationsPage`
4. `DriversPage`
5. `VehiclesPage`
6. `AccountPage`
7. `ConsentRecoveryPage`
8. `LoginPage`

이 화면들은 이미 admin 쪽에도 route가 있거나 public/shared 성격이므로, 별도 app split보다 role-based page branching이 더 맞다.

## Cutover Order

1. `front-admin-console`에 `/` dashboard 도입 완료
2. `front-operator-console` only pages 기능 admin repo 이관 완료
3. shared route role-based panel 분기 완료
4. settlement shared read를 admin route tree 안으로 재구성 완료
5. gateway와 compose를 단일 웹 runtime으로 변경
6. `front-operator-console`를 active flow에서 제거

## 완료 기준

아래가 모두 성립하면 이 map은 완료로 본다.

1. operator-only route가 더 이상 남지 않는다.
2. 같은 도메인은 같은 route 집합만 가진다.
3. 각 route 차이는 앱 구분이 아니라 권한/액션 구분으로 설명된다.
4. `front-operator-console`는 runtime inventory에서 제거된다.
