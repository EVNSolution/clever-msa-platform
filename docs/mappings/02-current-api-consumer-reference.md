# 02. Current API Consumers

## 문서 목적

이 문서는 현재 소스코드 기준으로 채널별 API 소비 구조를 확인하는 참조 문서다.

즉 이 문서는 아래 질문에 바로 답하도록 만든다.

- 이 서비스 후보를 누가 호출하는가
- 어디 코드를 먼저 읽어야 하는가
- 현재 어떤 API prefix가 이미 소비되고 있는가

## 공통 베이스 URL 구조

| 채널 | 베이스 URL 설정 | 특징 |
|---|---|---|
| Web | `ev-dashboard-web-frontend/src/config/env.ts` | `https://api.evnlogistics.com` 기준 namespace별 URL 상수 보유 |
| Driver App | `ev-driver-android/.env*` + `lib/core/services/dio.dart` | path만 env로 분리하고 `Token` 인증 헤더 사용 |
| IVI | `ev-application-ivi/.../NetworkService.kt` | `https://api.evnlogistics.com/api/` 고정 후 Retrofit interface에서 상대/절대 경로 혼용 |

## 채널별 인증 진입점

| 채널 | 현재 인증 경로 | 대표 코드 |
|---|---|---|
| Web | `/api/auth/token/` -> `/api/users/me/` | `auth.repo.ts`, `router/index.ts` |
| Driver App | `/auth/token/`, `/auth/send_otp/`, `/auth/verify_otp/`, `/auth/social/kakao/`, `/auth/social/kakao/complete-registration/`, `/users/me` | `features/login/.../remote_datasource.dart`, `features/kakao_login/...`, `core/common/data/datasource/remote/auth_datasource.dart` |
| IVI | `auth/token/`, `/api/users/me`, `/api/schedule/driver-vehicle-match/current_match_user` | `AuthApi.kt`, `DriverVehicleApi.kt`, `UserSessionViewModel.kt` |

## 서비스 후보별 참조 지도

### 1. Identity Access

| 항목 | 참조 위치 |
|---|---|
| 서버 진입점 | `ev-dashboard-server/src/auth/urls.py`, `ev-dashboard-server/src/ev_dashboard/urls.py`, `ev-dashboard-server/src/core/urls.py` |
| Web | `ev-dashboard-web-frontend/src/data/remote/repository/auth.repo.ts`, `src/router/index.ts` |
| Driver App | `ev-driver-android/lib/features/login/data/datasource/remote/remote_datasource.dart`, `lib/features/kakao_login/data/provider/kakao_login_datasource.dart`, `lib/features/verify_otp/data/provider/kakao_otp_verify_datasource.dart`, `lib/core/common/data/datasource/remote/auth_datasource.dart` |
| IVI | `ev-application-ivi/.../features/auth/data/datasource/remote/AuthApi.kt`, `.../core/common/data/datasouce/remote/api/DriverVehicleApi.kt`, `.../core/session/UserSessionViewModel.kt` |
| 대표 API | `/api/auth/token/`, `/api/auth/send_otp/`, `/api/auth/verify_otp/`, `/api/auth/social/kakao/`, `/api/users/me`, `/api/core/users/*` |

### 2. Tenant Organization

| 항목 | 참조 위치 |
|---|---|
| 서버 진입점 | `ev-dashboard-server/src/core/urls.py`, `ev-dashboard-server/src/ev_dashboard/urls.py`, `ev-dashboard-server/src/dashboard/urls.py` |
| Web | `company.repo.ts`, `organization.repo.ts`, `contract-type.repo.ts`, `cold-chain/fleet.repo.ts`, `admin-user.repo.ts` |
| Driver App | `ev-driver-android/lib/features/calendar_v2/data/providers/dashboard_fleet_remote.dart`, `drop_list_fleet_remote.dart`, `create_as_inquiry/data/provider/as_inquiry_datasource.dart` |
| IVI | `ev-application-ivi/.../features/fleet/data/datasource/remote/FleetApi.kt` |
| 대표 API | `/api/company/*`, `/api/core/companies/*`, `/api/core/fleets/*`, `/api/core/business-unit/*`, `/api/core/department/*`, `/api/core/position/*`, `/api/dashboard/fleet/*` |

### 3. Driver Profile HR

| 항목 | 참조 위치 |
|---|---|
| 서버 진입점 | `ev-dashboard-server/src/documents/urls.py` |
| Web | `driver-information.repo.ts`, `document.repo.ts`, `team.repo.ts`, `annual-leave.repo.ts`, `client.repo.ts` |
| Driver App | `ev-driver-android/lib/core/common/data/datasource/remote/auth_datasource.dart`, `lib/features/kakao_register/data/provider/kakao_register_datasource.dart` |
| IVI | 현재 직접 소비는 제한적이며 `users/me`와 매칭 결과로 간접 참조 |
| 대표 API | `/api/documents/document/*`, `/api/documents/group/*`, `/api/documents/team/*`, `/api/documents/annual-leave/*` |

현행 코드에서는 배송원 소속 관련 경로가 `group`, `team`으로 노출되어 있다.

### 4. Settlement Payroll

| 항목 | 참조 위치 |
|---|---|
| 서버 진입점 | `ev-dashboard-server/src/documents/urls.py` |
| Web | `payroll-repo.ts`, `driver-price.repo.ts`, `incentive.repo.ts`, `claim-list-repo.ts`, `additional-adjustment.repo.ts`, `vehicle-delivery.repo.ts`, `settlement-policy.repo.ts`, `system-config.repo.ts` |
| Driver App | `ev-driver-android/lib/features/settlement/data/providers/settlement_remote.dart`, `lib/features/delivery/data/provider/delivery_datasource.dart` |
| IVI | 현재 직접 소비는 약함 |
| 대표 API | `/api/documents/daily-settlement/*`, `/api/documents/monthly-settlement/*`, `/api/documents/group-settlement/*`, `/api/documents/price/*`, `/api/documents/incentive/*`, `/api/documents/claim-list/*`, `/api/documents/additional-adjustment/*`, `/api/documents/settlement-policy/*` |

### 5. Workforce Schedule Match

| 항목 | 참조 위치 |
|---|---|
| 서버 진입점 | `ev-dashboard-server/src/schedule/urls.py` |
| Web | `schedule.repo.ts`, `vehicle-driver-match.repo.ts`, `camera-log.repo.ts`, `ble-log.repo.ts`, `step-log.repo.ts` |
| Driver App | `ev-driver-android/lib/features/attendance/data/provider/attendance_remote.dart`, `lib/features/calendar_v2/data/providers/shift_schedule_v2_remote.dart` |
| IVI | `AttendanceApi.kt`, `DriverVehicleApi.kt` |
| 대표 API | `/api/schedule/shift-schedule/*`, `/api/schedule/attendance-detail-log/*`, `/api/schedule/driver-vehicle-match/*`, `/api/schedule/vehicle-schedule/*`, `/api/schedule/ble-logs/*`, `/api/schedule/camera-logs/*` |

### 6. Delivery Execution

| 항목 | 참조 위치 |
|---|---|
| 서버 진입점 | `ev-dashboard-server/src/delivery/urls.py`, 일부 `documents/urls.py` |
| Web | `deli-log.repo.ts`, `driver-delivery.repo.ts`, `stop-history.repo.ts` |
| Driver App | `ev-driver-android/lib/features/delivery/data/provider/delivery_datasource.dart` |
| IVI | 직접 소비는 현재 적음 |
| 대표 API | `/api/delivery/delivery-list/*`, `/api/delivery/delivery-log/*`, `/api/delivery/stop-history/*`, `/api/delivery/delivery-list/delivery-address/update-status/` |

### 7. Route Knowledge

| 항목 | 참조 위치 |
|---|---|
| 서버 진입점 | `ev-dashboard-server/src/tip/urls.py`, `ev-dashboard-server/src/map/urls.py`, `ev-dashboard-server/src/regions/urls.py` |
| Web | `tip.repo.ts`, `delivery-tip.repo.ts`, `feedback-marker.repo.ts`, `region.repo.ts` |
| Driver App | `ev-driver-android/lib/features/delivery/data/provider/delivery_datasource.dart` |
| IVI | `MapSearchApi.kt` |
| 대표 API | `/api/tip/tips/*`, `/api/tip/restricted-areas/*`, `/api/tip/recommended-parking-areas/*`, `/api/tip/parking-lots/*`, `/api/tip/entrances/*`, `/api/tip/exits/*`, `/api/map/parking/*`, `/api/regions/*` |

### 8. Vehicle Asset Service

| 항목 | 참조 위치 |
|---|---|
| 서버 진입점 | `ev-dashboard-server/src/vehicle/urls.py` |
| Web | `VehicleCardRepository.ts`, `VehicleOperatingCostRepository.ts`, `cold-chain/service-inquiry.repo.ts`, `cold-chain/accident-report.repo.ts`, `cold-chain/invoice.repo.ts` |
| Driver App | `ev-driver-android/lib/features/create_as_inquiry/data/provider/as_inquiry_datasource.dart`, `lib/features/accident_report/data/datasource/accident_report_datasource.dart` |
| IVI | 현재 직접 소비는 약함 |
| 대표 API | `/api/vehicle/cards/*`, `/api/vehicle/operating-costs/*`, `/api/vehicle/service-inquiries/*`, `/api/vehicle/accident-reports/*`, `/api/vehicle/invoices/*` |

### 9. Terminal Ops

| 항목 | 참조 위치 |
|---|---|
| 서버 진입점 | `ev-dashboard-server/src/dashboard/urls.py` |
| Web | `fleet-settings.repo.ts`, `group-settlement.repo.ts`, `uvis.repo.ts`, `tid.repo.ts` |
| Driver App | `ev-driver-android/lib/features/vehicle_handover_admin/data/provider/vehicle_handover_provider.dart`, `lib/features/vehicle_handover_driver/data/provider/driver_handover_provider.dart`, `lib/features/vehicle_handover_admin/data/provider/user_search_provider.dart` |
| IVI | `DeviceApi.kt`, `FleetApi.kt` |
| 대표 API | `/api/dashboard/terminal/*`, `/api/dashboard/terminal-user-change-log/*`, `/api/dashboard/handover-records/*`, `/api/dashboard/device/*`, `/api/dashboard/fleet/*` |

### 10. Telemetry Hub

| 항목 | 참조 위치 |
|---|---|
| 서버 진입점 | `ev-dashboard-server/src/dashboard/urls.py`, `ev-dashboard-server/src/mqtt/urls.py` |
| Web | `mqtt-raw-data.repo.ts`, `ggfit.repo.ts` |
| Driver App | BLE/카메라 로그 송신부와 플러그인 패키지 확인 필요 |
| IVI | `TemperatureApi.kt` |
| 대표 API | `/api/dashboard/truck-data/*`, `/api/dashboard/diagnostic/*`, `/api/dashboard/fault-code/*`, `/api/dashboard/google-fitness/*`, `/api/mqtt/*` |

### 11. Driver Location

| 항목 | 참조 위치 |
|---|---|
| 서버 진입점 | `ev-dashboard-server/src/driver_location/urls.py` |
| Web | `driver-location.repo.ts` |
| Driver App | `ev-driver-android/lib/features/driver_location/data/datasource/driver_location_remote_datasource.dart` |
| IVI | 현재 직접 소비 없음 |
| 대표 API | `/api/driver-location/locations/*` |

### 12. Approval Workflow

| 항목 | 참조 위치 |
|---|---|
| 서버 진입점 | `ev-dashboard-server/src/approval/urls.py` |
| Web | `approval.repo.ts` |
| Driver App | `ev-driver-android/lib/features/my_requests/data/datasource/remote/remote_datasource.dart` |
| IVI | 현재 직접 소비 없음 |
| 대표 API | `/api/approval/requests/*`, `/api/approval/steps/*`, `/api/approval/workflows/*`, `/api/approval/stats/*` |

### 13. Support Ticket

| 항목 | 참조 위치 |
|---|---|
| 서버 진입점 | `ev-dashboard-server/src/ticket/urls.py` |
| Web | `DeliveryLocationModal.vue`에서 티켓 생성 호출, 추가 repo 확장 가능 |
| Driver App | `ev-driver-android/lib/features/inquiry/data/providers/ticket_datasource.dart` |
| IVI | 현재 직접 소비 없음 |
| 대표 API | `/api/ticket/tickets/*`, `/api/ticket/ticket-responses/*` |

### 14. Notification Messaging

| 항목 | 참조 위치 |
|---|---|
| 서버 진입점 | `ev-dashboard-server/src/notifications/urls.py`, `src/announcements/urls.py`, `src/email_service/urls.py` |
| Web | `notification.repo.ts`, `announcement.repo.ts` |
| Driver App | Kakao 로그인 후 FCM 토큰 전송 흐름과 알림 기능 모듈 확인 필요 |
| IVI | Firebase 설정 존재, 직접 API 소비는 후속 확인 필요 |
| 대표 API | `/api/notifications/general/*`, `/api/notifications/fcm/*`, `/api/announcements/*`, `/api/email/*` |

### 15. Talent Acquisition

| 항목 | 참조 위치 |
|---|---|
| 서버 진입점 | `ev-dashboard-server/src/talentpool/urls.py` |
| Web | `talent-pool.repo.ts` |
| Driver App | 직접 소비 없음 |
| IVI | 직접 소비 없음 |
| 대표 API | `/api/talentpool/candidates/*`, `/api/talentpool/statuses/*`, `/api/talentpool/timelines/*` |

## 먼저 읽어야 할 파일 순서

서비스별 분석을 시작할 때는 아래 순서를 추천한다.

1. 서버 URL 파일
2. Web env 또는 모바일 env 설정
3. 대표 소비 repo 또는 datasource
4. 필요할 때만 세부 serializer, viewset, model

예시

- 스케줄 분해를 보려면 `schedule/urls.py` -> `schedule.repo.ts` -> `attendance_remote.dart` -> `AttendanceApi.kt`
- 차량/터미널 분해를 보려면 `dashboard/urls.py` -> `fleet-settings.repo.ts` -> `vehicle_handover_provider.dart` -> `DeviceApi.kt`
- 기사/정산 분해를 보려면 `documents/urls.py` -> `driver-information.repo.ts` 또는 `payroll-repo.ts` -> Driver 앱의 `auth_datasource.dart`와 `settlement_remote.dart`

## 현재 바로 정리해야 할 중복 참조

### A. User/Company 중복 진입점

- Web, Driver, IVI가 모두 `/api/users/me` 계열을 사용한다.
- 동시에 서버에는 `/api/core/users`와 `/api/users`가 공존한다.

### B. Fleet 중복 진입점

- Web과 IVI는 플릿을 각기 다른 경로에서 읽는 구조가 남아 있다.
- `/api/dashboard/fleet` 와 `/api/core/fleets` 중 어떤 축을 정본으로 할지 먼저 정해야 한다.

### C. Driver와 Settlement 결합

- Web 기준 기사 관리와 정산이 모두 `documents`를 공유한다.
- Driver 앱도 회원/문서 조회와 정산 일부를 `documents`에서 이어 받는다.

## 이 문서의 사용 방식

1. 새 MSA 후보 서비스 문서를 쓸 때 먼저 해당 섹션을 복사한다.
2. 서버와 채널 참조 코드를 빠짐없이 적은 뒤에만 모델 설계로 내려간다.
3. 새 API를 추가할 때는 반드시 어느 후보 서비스에 속하는지 먼저 표기한다.
