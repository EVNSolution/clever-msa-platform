# 07. Legacy API Mapping

## 문서 목적

이 문서는 현재 API namespace와 레거시 경로를 목표 서비스 구조에 어떻게 매핑할지 정리하는 문서다.

목표는 기존 경로를 그대로 존치할지, 분리할지, 다른 경로와 통합할지, 이름을 정리할지, 추가 확인 대상으로 둘지를 먼저 구분하는 것이다.

## 분류 규칙

### keep

- 현재 의미와 목표 서비스가 거의 일치한다.

### split

- 한 namespace 안에 두 개 이상 목표 서비스가 섞여 있다.

### merge

- 서로 다른 경로지만 목표 서비스 기준으로는 하나로 합쳐야 한다.

### rename

- 경로는 남겨도 되지만 의미가 목표 구조와 맞지 않는다.

### pending

- 현행 코드 근거가 부족하거나 추가 확인이 필요하다.

## 매핑 보조 컬럼

- `target_domain`: 최종 정리할 목표 서비스 축
- `keep_or_split`: 현재 경로를 유지할지, 분리할지에 대한 1차 판단
- `ownership_reason`: 해당 판단을 뒷받침하는 소유 책임 근거

### 예시 행

| current_path | target_domain | keep_or_split | ownership_reason |
|---|---|---|---|
| `/api/documents/*` | Driver Profile HR or Settlement Payroll | split | people-finance mixed |
| `/api/auth/*` | Identity Access (Account / Auth) | keep | auth boundary matches |
| `/api/core/companies/*` | Organization Master | keep | org source of truth |

## 매핑 표

| 현재 경로 축 | 목표 서비스 | 분류 | 메모 |
|---|---|---|---|
| `/api/auth/*` | Identity Access | keep | 인증 경로는 유지 가능 |
| `/api/auth/token/*` | Identity Access | keep | 토큰 발급 경로 유지 가능 |
| `/api/users/*` | Identity Access | merge | `/api/core/users/*`와 통합 필요 |
| `/api/core/users/*` | Identity Access | merge | `/api/users/*`와 통합 필요 |
| `/api/company/*` | Organization Master | merge | `/api/core/companies/*`와 통합 필요 |
| `/api/core/companies/*` | Organization Master | merge | 회사 정본 경로로 통합 필요 |
| `/api/core/fleets/*` | Organization Master | merge | `/api/dashboard/fleet/*`와 통합 필요 |
| `/api/dashboard/fleet/*` | Organization Master | merge | 플릿 레거시 읽기 경로 정리 필요 |
| `/api/documents/document/*` | Driver Profile HR | split | documents에서 분리 필요 |
| `/api/documents/group/*` | Driver Profile HR | rename | 회사와 플릿 기준 의미로 정리 필요 |
| `/api/documents/team/*` | Driver Profile HR | rename | 회사와 플릿 기준 의미로 정리 필요 |
| `/api/documents/annual-leave/*` | Driver Profile HR | split | Driver Profile HR로 분리 |
| `/api/documents/daily-settlement/*` | Settlement Payroll | split | documents에서 분리 |
| `/api/documents/monthly-settlement/*` | Settlement Payroll | split | documents에서 분리 |
| `/api/documents/group-settlement/*` | Settlement Payroll | rename | 정산 대상 의미 재정리 필요 |
| `/api/documents/price/*` | Settlement Payroll | split | documents에서 분리 |
| `/api/documents/incentive/*` | Settlement Payroll | split | documents에서 분리 |
| `/api/documents/claim-list/*` | Settlement Payroll | split | documents에서 분리 |
| `/api/documents/additional-adjustment/*` | Settlement Payroll | split | documents에서 분리 |
| `/api/documents/settlement-policy/*` | Settlement Payroll | split | documents에서 분리 |
| `/api/schedule/*` | pending | pending | 일정, 출근 상세, 기사-차량 배정이 섞여 있어 직접 승격하지 않음 |
| `/api/schedule/driver-vehicle-match/*` | Driver Vehicle Assignment | split | 기사-차량 배정 정본으로 재배치 |
| `/api/delivery/*` | Delivery Execution | keep | 배송 실행 도메인으로 유지 가능 |
| `/api/tip/*` | Route Knowledge and Region | merge | `/api/map/*`, `/api/regions/*`와 함께 정리 |
| `/api/map/*` | Route Knowledge and Region | merge | Route Knowledge 축으로 정리 |
| `/api/regions/*` | Route Knowledge and Region | merge | 권역 기준과 함께 정리 |
| `/api/vehicle/*` | pending | pending | 카드/운영비/A/S/사고가 섞여 있어 Vehicle Asset로 직접 승격하지 않음 |
| `/api/dashboard/terminal/*` | Vehicle Asset / Terminal Ops / Telemetry Hub | split | 차량 마스터 성격은 Vehicle Asset, 단말 성격은 Terminal Ops, 최신 캐시는 Telemetry Hub로 분리 |
| `/api/dashboard/terminal-user-change-log/*` | Driver Vehicle Assignment | split | 배정/반납 change log로 재배치 |
| `/api/dashboard/handover-records/*` | Driver Vehicle Assignment | split | 기사-차량 배정/반납 workflow로 재배치 |
| `/api/dashboard/device/*` | Terminal Ops | split | dashboard에서 분리 |
| `/api/dashboard/truck-data/*` | Telemetry Hub | split | dashboard에서 분리 |
| `/api/dashboard/diagnostic/*` | Telemetry Hub | split | dashboard에서 분리 |
| `/api/dashboard/fault-code/*` | Telemetry Hub | split | dashboard에서 분리 |
| `/api/dashboard/google-fitness/*` | Telemetry Hub | split | dashboard에서 분리 |
| `/api/mqtt/*` | Telemetry Hub | merge | 텔레메트리 축과 함께 정리 |
| `/api/driver-location/*` | Driver Location | keep | 위치 도메인 유지 가능 |
| `/api/approval/*` | Approval Workflow | keep | 결재 도메인 유지 가능 |
| `/api/ticket/*` | Communication Support | merge | 지원성 커뮤니케이션 축으로 통합 |
| `/api/notifications/*` | Communication Support | merge | 알림 축으로 통합 |
| `/api/email/*` | Communication Support | merge | 메시지 발송 축으로 통합 |
| `/api/announcements/*` | Communication Support | merge | 공지 축으로 통합 |
| `/api/talentpool/*` | Talent Acquisition | keep | 채용 도메인 유지 가능 |
| `/api/delivery-plan/*` | pending | pending | 현행 코드 위치 추가 확인 필요 |

## 우선 정리 대상

### 1차

1. `/api/users/*` 와 `/api/core/users/*`
2. `/api/company/*` 와 `/api/core/companies/*`
3. `/api/core/fleets/*` 와 `/api/dashboard/fleet/*`
4. `documents` 하위 Driver 영역
5. `documents` 하위 Settlement 영역
6. `dashboard` 하위 Terminal 과 Telemetry Hub 영역

### 2차

1. `tip`, `map`, `regions`
2. `ticket`, `notifications`, `email`, `announcements`
3. `delivery-plan`

## 연결 문서

- `03-roadmap.md`
- `06-id-and-state-dictionary.md`
- `../reference/01-current-api-inventory-and-overlap.md`
- `../reference/02-current-api-consumer-reference.md`
