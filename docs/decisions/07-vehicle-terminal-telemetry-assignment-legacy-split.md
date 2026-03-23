# 07. Vehicle Terminal Telemetry Assignment Legacy Split

## 문서 목적

이 문서는 `ev-dashboard-server`의 실제 코드 기준으로 차량 축을 어떻게 MSA 경계로 다시 잘라야 하는지 정리하는 참조 문서다.

핵심 원칙은 두 가지다.

1. 현재 Django app 이름을 서비스 경계로 그대로 승격하지 않는다.
2. `dashboard.Terminal` 하나에 섞여 있는 책임을 해체한 뒤에 MSA 경계를 세운다.

## 코드에서 확인한 현재 상태

### 1. `dashboard.Terminal`이 차량, 운영, 단말, 텔레메트리 캐시를 함께 가진다

핵심 필드 예시:

- 차량 정본 성격: `plate_number`, `vehicle_shippment_date`, `manufacturer_company`, `model`
- 운영 관계 성격: `company`, `fleet`, `user`
- 단말 레지스트리 성격: `tid`, `tms_imei`, `tms_iccid`, `device_iccid`, `device_msisdn`, `device_fw_version`, `device_protocol_version`, `device_app_version`
- 텔레메트리 캐시 성격: `latest_truck_data_time`, `latest_key_status`, `latest_pack_soc`, `latest_x_position`, `latest_y_position`, `latest_err`

근거:

- `ev-dashboard-server/src/dashboard/models/dashboard_models.py`

즉 현재 `Terminal`은 차량 자산 정본이 아니라 다음 네 축이 섞인 aggregate다.

1. 차량 마스터
2. 운영사/플릿/기사 연결
3. 단말 등록 정보
4. 최신 텔레메트리 snapshot/cache

### 2. 위치의 원천은 `Terminal`이 아니라 `TruckData`와 `MQTTData`다

위치/상태 원천:

- `TruckData.x_position`, `TruckData.y_position`
- raw 입력은 `mqtt.MQTTData`
- `Terminal.latest_x_position`, `Terminal.latest_y_position`는 읽기 최적화를 위한 캐시

근거:

- `ev-dashboard-server/src/dashboard/models/dashboard_models.py`
- `ev-dashboard-server/src/mqtt/models.py`
- `ev-dashboard-server/src/dashboard/serializers/terminal.py`

따라서 위치는 `Terminal Ops` 소유 정보가 아니라 `Telemetry` 소유 정보로 해석하는 것이 맞다.
터미널은 위치를 보내는 source endpoint일 수는 있지만, 위치 snapshot의 도메인 정본은 아니다.

### 3. `Handover`는 단말 자산 관리보다 기사-차량 배정 워크플로에 가깝다

현재 구조:

- `Terminal.user` 변경 이력 -> `TerminalUserChangeLog`
- 이 change log 생성 시 signal에서 `HandoverRecord` 자동 생성
- `HandoverRecord`는 `ASSIGNMENT`, `RETURN`, `INSPECTION` 흐름을 가진다

근거:

- `ev-dashboard-server/src/dashboard/signals.py`
- `ev-dashboard-server/src/dashboard/models/handover_models.py`

즉 현재 `handover`는 단말 하드웨어 provisioning이 아니라 기사-차량 배정/반납 절차다.
따라서 `Terminal Ops`보다 `Driver Vehicle Assignment` 쪽 보조 워크플로 엔티티로 재배치하는 것이 더 자연스럽다.

### 4. 실제 배정 정본은 `schedule.DriverVehicleMatch`다

`VehicleMatchingService.create_match()`는 다음 방식으로 동작한다.

1. `plate_number`로 `Terminal` 조회
2. 같은 `plate_number`의 vehicle user 조회
3. 활성 중복 배정 확인
4. `DriverVehicleMatch` 생성

근거:

- `ev-dashboard-server/src/schedule/models.py`
- `ev-dashboard-server/src/schedule/services/matching.py`

즉 현재 레거시에서 운영사의 실제 쓰기 행위는 `schedule` 앱의 일정 전체가 아니라 `driver-vehicle assignment`다.

### 5. `vehicle` 앱은 차량 정본 앱이 아니라 유지보수/비용 앱이다

현재 `vehicle` 앱이 직접 소유하는 것은 아래에 가깝다.

- 차량 카드
- 운영비
- A/S 문의
- 사고 보고
- 인보이스

근거:

- `ev-dashboard-server/src/vehicle/models.py`
- `ev-dashboard-server/src/vehicle/urls.py`

즉 `vehicle` 앱을 곧바로 `Vehicle Asset`로 보는 것은 맞지 않다.
차량 정본의 출발점은 `vehicle` 앱이 아니라 `dashboard.Terminal` 해체다.

## 추천 MSA 분리안

### 1. Vehicle Asset

제조사 정본 축

소유 예시:

- `vehicle_master`
- `vehicle_operator_access`

가져갈 레거시 성격:

- `Terminal.plate_number`
- `Terminal.vehicle_shippment_date`
- `Terminal.manufacturer_company`
- `Terminal.model`

가져가면 안 되는 것:

- `Terminal.user`
- `Terminal.latest_*`
- `Terminal.tid`
- `HandoverRecord`

### 2. Terminal Ops

단말/디바이스 레지스트리 축

소유 예시:

- `terminal_registry`
- `terminal_vehicle_link`
- `terminal_device_profile`

가져갈 레거시 성격:

- `Terminal.tid`
- `tms_imei`
- `tms_iccid`
- `device_iccid`
- `device_msisdn`
- `device_fw_version`
- `device_protocol_version`
- `device_app_version`

가져가면 안 되는 것:

- 위치 snapshot 정본
- 기사 배정 상태
- 차량번호/VIN 같은 차량 실체 정본

### 3. Telemetry

위치/진단/시계열 수집 축

소유 예시:

- `mqtt_raw_message`
- `truck_data`
- `vehicle_location_snapshot`
- `diagnostic_event`
- `fault_code_catalog`

가져갈 레거시 성격:

- `mqtt.MQTTData`
- `dashboard.TruckData`
- `dashboard.Diagnostic`
- `dashboard.FaultCode`
- `Terminal.latest_*`가 표현하던 최신 snapshot 의미

가져가면 안 되는 것:

- 제조사 차량 마스터 수정
- 운영사 배정 정본

### 4. Driver Vehicle Assignment

운영사 쓰기 축

소유 예시:

- `driver_vehicle_assignment`
- `assignment_history`
- `handover_record`

가져갈 레거시 성격:

- `schedule.DriverVehicleMatch`
- `dashboard.TerminalUserChangeLog`
- `dashboard.HandoverRecord`

가져가면 안 되는 것:

- 차량 정본
- 단말 레지스트리 정본
- 위치 snapshot 정본

### 5. Vehicle Ops

읽기 모델 축

읽는 원천:

- `Vehicle Asset`
- `Terminal Ops`
- `Telemetry`
- `Driver Vehicle Assignment`

이 축이 보여줄 것:

- 차량 기본 정보
- 현재 운영사 접근 관계
- 현재 배정 기사
- 최신 위치
- 단말 연결 상태
- 인수인계/배정 진행 상태

## 레거시 모델/필드 -> 타깃 축 매핑

| 레거시 소스 | 현재 의미 | 타깃 축 |
|---|---|---|
| `Terminal.plate_number` | 제조사 발급 차량번호 | `Vehicle Asset.vehicle_master` |
| `Terminal.manufacturer_company` | 제조사 | `Vehicle Asset.vehicle_master` |
| `Terminal.model` | 차량 모델 | `Vehicle Asset.vehicle_master` |
| `Terminal.vehicle_shippment_date` | 출하일 | `Vehicle Asset.vehicle_master` |
| `Terminal.company` | 운영사 관계 | `Vehicle Asset.vehicle_operator_access` |
| `Terminal.fleet` | 현재 운영 문맥 소속 | `Driver Vehicle Assignment` 또는 `Vehicle Ops` projection |
| `Terminal.user` | 현재 배정 기사 | `Driver Vehicle Assignment` |
| `Terminal.tid` | 단말 식별자 | `Terminal Ops` |
| `Terminal.tms_imei`, `tms_iccid`, `device_iccid`, `device_msisdn` | 단말 식별/회선 | `Terminal Ops` |
| `Terminal.device_fw_version`, `device_protocol_version`, `device_app_version` | 단말 소프트웨어 메타 | `Terminal Ops` |
| `TruckData.x_position`, `TruckData.y_position` | 위치 원천 시계열 | `Telemetry` |
| `TruckData.*` 나머지 센서값 | 차량 상태 원천 시계열 | `Telemetry` |
| `MQTTData.raw`, `vid`, `mid` | raw ingress | `Telemetry` |
| `Terminal.latest_x_position`, `latest_y_position`, `latest_key_status` 등 | 최신 snapshot 캐시 | `Telemetry` read snapshot |
| `Diagnostic`, `FaultCode` | 장애/진단 | `Telemetry` |
| `DriverVehicleMatch` | 운영사 배정 정본 | `Driver Vehicle Assignment` |
| `TerminalUserChangeLog` | 배정/반납 change log | `Driver Vehicle Assignment` |
| `HandoverRecord` | 배정/반납 workflow record | `Driver Vehicle Assignment` |
| `vehicle.VehicleCard` | 차량 부가 운영 자산 | 후속 `Vehicle Support` 또는 `Vehicle Finance` |
| `vehicle.VehicleOperatingCost` | 비용 입력 | 후속 비용/정산 주변 축 |
| `vehicle.VehicleServiceInquiry`, `VehicleAccidentReport` | 정비/사고 | 후속 `Vehicle Maintenance` |

## 지금 MSA 쪽에 바로 반영할 판단

1. 현재 bootstrap의 `Vehicle Asset`은 그대로 유지하되, 다음 refactor에서 `vehicle_master + vehicle_operator_access` 구조로 재정의한다.
2. `Terminal Ops`는 단말 레지스트리만 우선 설계하고, `handover`를 핵심 정본으로 넣지 않는다.
3. `Telemetry`는 위치/MQTT/TruckData/Diagnostic를 한 축으로 본다.
4. `Driver Vehicle Assignment`는 기존 `Schedule Match`보다 정확한 이름으로 채택한다.
5. `Vehicle Ops Phase 2`는 이 네 축을 읽는 projection으로 확장한다.

## 명시적으로 하지 않을 것

- `dashboard` 앱 경계를 서비스 경계로 그대로 복제하기
- `Terminal` 하나를 그대로 Vehicle master로 승격하기
- 위치를 `Terminal Ops` 소유로 해석하기
- `HandoverRecord`를 단말 자산 프로비저닝 엔티티로 해석하기
- `vehicle` 앱을 그대로 `Vehicle Asset`로 옮기기
