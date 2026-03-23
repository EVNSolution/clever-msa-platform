# 03. Account / Driver / Settlement Legacy Cut Map

## 문서 목적

이 문서는 기존 레거시 경로를 Account / Driver / Settlement 재편 기준으로 어떻게 1차 절단할지 정리하는 출발점이다.

여기서의 목적은 최종 API 이름을 확정하는 것이 아니라, 어떤 경로를 먼저 분리 후보로 잡아야 하는지 정하는 데 있다.

## 1차 절단 후보

| 현재 경로 | 1차 목표 | 분류 | 메모 |
|---|---|---|---|
| `/api/auth` | Identity Access (Account / Auth) | keep | 인증 경계는 우선 유지 |
| `/api/users` | Identity Access (Account / Auth) | merge/cleanup target | 계정 조회는 Identity Access로 정리 |
| `/api/core/users` | Identity Access (Account / Auth) | merge/cleanup target | core 사용자 경로는 Identity Access로 정리 |
| `/api/documents` | Driver Profile HR + Settlement Payroll | split target | 사람/정산 혼재 경로 |
| `/api/core/companies` | Organization Master | keep | 회사 정본 |
| `/api/core/fleets` | Organization Master | keep | 플릿 정본 |

## 우선 판정 기준

1. 인증과 자격은 Identity Access (Account / Auth) 쪽으로 둔다.
2. 사람 프로필과 인사성 문서는 Driver Profile HR 쪽으로 둔다.
3. 정산 계산과 결과 항목은 Settlement Payroll 쪽으로 둔다.
4. 회사, 플릿, 조직 단위는 Organization Master만 정본으로 둔다.
