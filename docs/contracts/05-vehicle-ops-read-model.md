# 05. Vehicle Ops

## 문서 목적

이 문서는 현재 런타임의 `Vehicle Ops` 읽기 모델 계약을 고정한다.

`Vehicle Ops`는 정본 서비스가 아니다. 차량 운영 화면에 필요한 요약을 `registry`, `assignment`, `terminal`, `telemetry`, `organization` source에서 읽어 조합하는 `operations-view`다.

## 현재 런타임 Source

| Source service | Vehicle Ops가 읽는 것 |
| --- | --- |
| `service-vehicle-registry` | `vehicle_master`, 활성 `vehicle_operator_access` |
| `service-vehicle-assignment` | 현재 `assigned` 배정 |
| `service-terminal-registry` | 현재 `installed` terminal installation, terminal registry detail |
| `service-telemetry-hub` | latest location, latest diagnostic |
| `service-organization-registry` | 제조사/운영사 회사명 |

`front-operator-console`은 source service를 직접 fan-out하지 않고 `Vehicle Ops` contract만 사용한다.

## 조회 질문

1. 이 차량은 어떤 차량인가
2. 제조사와 현재 활성 운영사는 누구인가
3. 현재 어떤 배송원이 배정돼 있는가
4. 현재 어떤 terminal이 설치돼 있는가
5. 최신 위치와 latest diagnostic 상태는 어떤가

## API Surface

- `GET /api/vehicle-ops/health/`
- `GET /api/vehicle-ops/vehicles/`
- `GET /api/vehicle-ops/vehicles/{vehicle_id}/`

권한:
- 인증된 `user`: 조회 가능
- 인증된 `admin`: 조회 가능
- 쓰기 API 없음

## Summary Contract

- `vehicle_id`: string UUID
- `plate_number`: string
- `vin`: string
- `vehicle_status`: `active | inactive | retired`
- `manufacturer_company.company_id`: string UUID
- `manufacturer_company.company_name`: string or `null`
- `active_operator_company.company_id`: string UUID or `null`
- `active_operator_company.company_name`: string or `null`
- `active_operator_company.access_status`: `active | suspended | ended` or `null`
- `current_assignment.driver_vehicle_assignment_id`: string UUID or `null`
- `current_assignment.driver_id`: string UUID or `null`
- `current_assignment.assignment_status`: `assigned` or `null`
- `current_assignment.assigned_at`: string datetime or `null`
- `current_terminal.terminal_id`: string UUID or `null`
- `current_terminal.installation_status`: `installed | removed` or `null`
- `current_terminal.installed_at`: string datetime or `null`
- `current_terminal.imei`: string or `null`
- `current_terminal.iccid`: string or `null`
- `current_terminal.firmware_version`: string or `null`
- `current_terminal.protocol_version`: string or `null`
- `current_terminal.app_version`: string or `null`
- `telemetry.latest_location.lat`: number or `null`
- `telemetry.latest_location.lng`: number or `null`
- `telemetry.latest_location.captured_at`: string datetime or `null`
- `telemetry.latest_location.snapshot_status`: `fresh | stale | unavailable` or `null`
- `telemetry.latest_diagnostic.event_code`: string or `null`
- `telemetry.latest_diagnostic.severity`: `info | warning | critical` or `null`
- `telemetry.latest_diagnostic.event_status`: `open | cleared` or `null`
- `telemetry.latest_diagnostic.captured_at`: string datetime or `null`
- `warnings`: string array

```json
{
  "vehicle_id": "11111111-1111-1111-1111-111111111111",
  "plate_number": "12가3456",
  "vin": "KMH00000000000001",
  "vehicle_status": "active",
  "manufacturer_company": {
    "company_id": "22222222-2222-2222-2222-222222222222",
    "company_name": "Manufacturer Co"
  },
  "active_operator_company": {
    "company_id": "33333333-3333-3333-3333-333333333333",
    "company_name": "Operator Co",
    "access_status": "active"
  },
  "current_assignment": {
    "driver_vehicle_assignment_id": "44444444-4444-4444-4444-444444444444",
    "driver_id": "55555555-5555-5555-5555-555555555555",
    "assignment_status": "assigned",
    "assigned_at": "2026-03-20T10:00:00Z"
  },
  "current_terminal": {
    "terminal_id": "66666666-6666-6666-6666-666666666666",
    "installation_status": "installed",
    "installed_at": "2026-03-20T09:55:00Z",
    "imei": "356123456789012",
    "iccid": "8982123456789012345",
    "firmware_version": "1.0.0",
    "protocol_version": "1.0",
    "app_version": "1.0.0"
  },
  "telemetry": {
    "latest_location": {
      "lat": 37.5665,
      "lng": 126.978,
      "captured_at": "2026-03-20T10:05:00Z",
      "snapshot_status": "fresh"
    },
    "latest_diagnostic": {
      "event_code": "BAT_LOW",
      "severity": "warning",
      "event_status": "open",
      "captured_at": "2026-03-20T10:04:00Z"
    }
  },
  "warnings": []
}
```

## Nullability 와 Warning 규칙

- 활성 운영사가 없으면 `active_operator_company.*`는 모두 `null`을 허용한다.
- 현재 배정이 없으면 `current_assignment`는 `null`이다.
- terminal 설치가 없으면 `current_terminal`은 `null`이고 `warnings`에 `current_terminal_missing`을 추가한다.
- terminal installation은 있으나 registry detail을 읽지 못하면 `current_terminal`은 partial block으로 유지하고 `warnings`에 `current_terminal_unavailable`을 추가한다.
- latest location이 없으면 `telemetry.latest_location.*`는 모두 `null`을 허용하고 `warnings`에 `latest_location_missing`을 추가한다.
- latest diagnostic이 없으면 `telemetry.latest_diagnostic.*`는 모두 `null`을 허용하고 `warnings`에 `latest_diagnostic_missing`을 추가한다.
- 제조사 또는 활성 운영사의 회사명을 찾지 못하면 summary는 유지하고 `manufacturer_company_name_missing`, `active_operator_company_name_missing` warning만 남긴다.

## 화면 규칙

### 목록

- `front /vehicles`는 `Vehicle Ops` 목록 contract만 사용한다.
- `front /vehicles`는 browser에서 terminal을 별도 리소스로 분리하지 않는다.
- vehicle row는 terminal 연결 상태와 telemetry freshness를 함께 요약할 수 있어야 한다.
- terminal이 없으면 `미연결`, freshness가 떨어지면 `지연` 같은 상태를 차량 행 안에서 표현한다.

### 상세

차량 상세는 아래 블록을 같은 화면에서 함께 노출한다.

- 기본 차량 정보
- terminal 정보
- telemetry freshness / latest 상태

아래 terminal 필드를 차량 상세 안에서 함께 노출한다.

- `Terminal ID`
- `Installation Status`
- `Installed At`
- `IMEI`
- `ICCID`
- `Firmware Version`
- `Protocol Version`
- `App Version`

브라우저 규칙:

- 별도 browser `terminal` 상세 페이지를 기본 운영 흐름으로 두지 않는다.
- browser에서 terminal 설치/해제를 수동으로 실행하지 않는다.
- terminal과 vehicle의 연결은 MQTT ingress와 `vin` 기준 시스템 연결 결과로 본다.
- UI는 수동 새로고침 없이 terminal/telemetry 상태 변화를 반영해야 한다.
- UI는 항상 마지막 수집 시각과 freshness 상태를 보여줘야 한다.

`admin-front`는 계속 각 정본 서비스의 write API를 사용한다. `Vehicle Ops`는 admin write 경로를 대체하지 않는다.

## 금지 규칙

1. `Vehicle Ops`에서 source service 정본을 수정하지 않는다.
2. `front`가 source service를 직접 fan-out 호출하지 않는다.
3. terminal/telemetry 값을 `vehicle_registry` 정본 컬럼으로 끌어올리지 않는다.
4. `Vehicle Ops`에서 handover workflow나 assignment write를 흉내 내지 않는다.
5. 긴 기간 시계열 조회나 분석 API를 이 contract에 끌어오지 않는다.

## 후속 확장

후속 phase에서만 검토한다.

- handover workflow summary
- terminal 교체 이력
- 긴 기간 telemetry timeline
- maintenance / accident overlay

## 연결 문서

- `04-driver-360-read-model.md`
- `09-integration-rules.md`
- `../decisions/specs/2026-03-20-vehicle-ownership-and-assignment-design.md`
- `../decisions/specs/2026-03-20-terminal-registry-design.md`
- `../decisions/specs/2026-03-20-telemetry-hub-design.md`
