# 01. Target Service Map

## 문서 목적

이 문서는 우리가 만들고 싶은 목표 MSA 구조를 먼저 고정하는 문서다.

이 문서는 north-star target map이다. 현재 active runtime repo, compose service, gateway prefix, deploy truth를 알려주는 문서가 아니다. 그런 현재 상태는 `../mappings/current-runtime-inventory.md`와 `../runbooks/README.md`에서 본다.

이 문서에서는 현재 코드 경로나 레거시 API 이름보다, 앞으로 어떤 서비스 경계로 나눌지와 각 서비스가 무엇을 담당해야 하는지를 우선 정의한다.

## 이 문서가 답해야 하는 질문

1. 전체 시스템을 어떤 서비스 단위로 나눌 것인가
2. 각 서비스는 어떤 종류의 업무를 담당하는가
3. 어떤 서비스부터 먼저 경계를 고정해야 하는가
4. 어떤 서비스는 논리적으로 분리하되 물리적으로는 나중에 나눌 것인가

## 목표 분해 원칙

### 1. 인증과 업무 도메인을 분리한다

- 로그인과 자격 검증은 별도 서비스가 맡는다.
- 배송원, 차량, 정산, 결재는 각자 자기 업무의 정본을 가진다.

### 2. 사람, 차량, 운영자, 정산 대상을 한 모델에 섞지 않는다

- 로그인 가능한 주체와 업무상 관리 대상은 구분한다.
- 업무용 식별자와 인증용 식별자도 구분한다.

### 3. 조직 마스터와 소속 참조를 분리한다

- 회사와 플릿의 정본은 조직 마스터가 가진다.
- 배송원, 차량, 운영자는 자기 도메인에서 회사와 플릿을 참조만 한다.

### 4. 쓰기 모델 분리와 읽기 모델 분리를 함께 설계한다

- 서비스는 자기 쓰기 모델만 소유한다.
- 운영 화면에서 필요한 통합 조회는 읽기 모델로 푼다.

## 목표 서비스 목록

| 목표 서비스 | 핵심 목적 | 직접 소유하는 정본 |
|---|---|---|
| Identity Access | 로그인, 자격, 세션, 토큰 관리 | 계정, 자격, 계정 상태 |
| Organization Master | 회사, 플릿, 조직 구조 관리 | 회사, 플릿, 조직 기준 정보 |
| Driver Profile HR | 배송원 프로필과 인사성 상태 관리 | 배송원 프로필, 재직 상태, 회사/플릿 소속 참조 |
| Vehicle Asset | 제조사 기준 차량 마스터 관리 | `vehicle_id`, `manufacturer_company_id`, `plate_number`, `vin`, `vehicle_status`, 운영사 접근 관계 |
| Terminal Ops | 단말과 디바이스 레지스트리 관리 | 터미널, 단말, 디바이스 등록 정보 |
| Driver Vehicle Assignment | 운영사 기준 배송원-차량 배정 관리 | 배송원-차량 배정, 배정 이력, 배정/반납 워크플로 |
| Delivery Execution | 배송 오더 실행과 배송 상태 관리 | 배송 오더, 배송 상태, 실행 로그 |
| Driver Location | 배송원 위치 수집과 조회 | 위치 이벤트, 위치 스냅샷 |
| Settlement Payroll | 정산 계산과 지급 전후 상태 관리 | 정산 결과, 단가, 공제, 인센티브, 정산 식별자 |
| Route Knowledge and Region | 배송지 지식과 권역 기준 관리 | 팁, 제한 구역, 추천 주차, 권역 |
| Approval Workflow | 결재 흐름과 승인 상태 관리 | 결재 요청, 결재 단계, 승인 이력 |
| Communication Support | 알림, 티켓, 공지, 메시지 지원 | 알림, 티켓, 공지, 발송 기록 |
| Talent Acquisition | 채용 후보자와 전환 관리 | 후보자, 전형 상태, 전환 기록 |
| Telemetry Hub | 차량 텔레메트리와 관측 데이터 관리 | 진단, 텔레메트리, 시계열 수집 데이터 |

## 목표 구조에서 중요한 경계

### 1. Driver Profile HR

- 배송원은 회사와 플릿에 소속될 수 있다.
- 하지만 회사와 플릿 마스터 자체는 가지지 않는다.
- 배송원 상세 이력 중 프로필 변경은 직접 소유한다.
- 사고, 정비, 배차, 위치, 정산은 각 서비스가 소유하고 Driver 기준 읽기 모델에서 모아본다.

### 2. Vehicle Asset과 Terminal Ops

- 차량과 단말은 운영상 같이 보이지만 정본은 다르다.
- Vehicle Asset은 제조사 기준 차량 마스터와 운영사 접근 관계만 소유한다.
- Terminal Ops는 단말 레지스트리만 소유한다.
- 정비, 사고, 기사 배정, 배정/반납 워크플로, 위치/진단은 각각 Driver Vehicle Assignment, Telemetry, Vehicle Ops 같은 후속 도메인에서 다룬다.

### 3. Driver Vehicle Assignment와 Delivery Execution

- 배차와 배송 실행은 가까운 흐름이지만 정본은 다르다.
- 오늘 누가 어떤 차량에 붙어 있는지는 Driver Vehicle Assignment가 결정한다.
- 어떤 배송이 어디까지 진행됐는지는 Delivery Execution이 결정한다.

### 4. Settlement Payroll

- 정산은 배송원 프로필을 소유하지 않는다.
- 배송 수행 결과와 조직 소속을 참조해서 계산 결과만 소유한다.
- 공유계정성 정산 대상도 여기서 다룬다.

## 목표 우선순위

### 1차 경계 확정

1. Identity Access
2. Organization Master
3. Driver Profile HR
4. Vehicle Asset
5. Driver Vehicle Assignment
6. Settlement Payroll

### 2차 경계 확정

1. Terminal Ops
2. Delivery Execution
3. Driver Location
4. Route Knowledge and Region
5. Approval Workflow

### 3차 경계 확정

1. Communication Support
2. Talent Acquisition
3. Telemetry Hub

## 초기 물리 배치 원칙

- 논리 서비스는 세밀하게 나누되, 초기 물리 배치는 더 적게 가져간다.
- 조회 결합이 강한 서비스는 처음부터 완전히 분리하지 않는다.
- 인증, 조직, 사람, 차량, 운영, 정산, 지원 정도의 묶음으로 먼저 시작한다.

## 이 문서를 사용할 때의 규칙

1. 이 문서에는 앞으로의 목표 상태만 적는다.
2. 현재 코드 경로와 API 이름 근거는 reference 폴더 문서에 적는다.
3. 목표 문서에서 레거시 용어를 쓸 때는 반드시 교체 대상이라는 뜻으로만 쓴다.
4. 서비스별 상세 설계는 이 문서를 기준으로 내려간다.
5. 현재 active repo 이름과 운영 절차가 충돌하면 이 문서보다 `docs/mappings/`, `docs/runbooks/`, `docs/rollout/`의 living truth를 우선한다.

## 다음 문서

- `02-target-service-structure-and-join-risk-map.md`
- `03-roadmap.md`
- `10-target-account-auth-layer-plan.md`
- 현행 근거가 필요하면 `../reference/` 아래 문서를 본다
