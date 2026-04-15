# Service Repo Template Baseline Design

## Purpose

이 문서는 CLEVER 서비스 repo들을 완전한 동일 구조로 강제하지 않고, 배포와 운영 위생에 필요한 최소 baseline만 표준화하는 기준을 고정한다.

목표는 아래다.

1. 서비스 repo마다 반복되는 deploy-facing 구조를 통일한다.
2. README, `.gitignore`, image build workflow, lesson 운영 규칙을 같은 기준으로 맞춘다.
3. 비즈니스 코드 구조는 각 repo 경계에 맞게 남기고, 무리한 획일화는 피한다.

## Why This Exists

현재 `development/*` repo들은 이미 각기 다른 역할과 기술 스택을 가진다.

- `front-web-console`
- `edge-api-gateway`
- `service-account-access`
- `integration-local-stack`

이 repo들을 강제로 같은 코드 구조로 맞추면 경계가 흐려진다. 반면 아래 영역은 이미 반복적으로 운영 실수를 만든다.

1. `.gitignore` 편차
2. README 섹션 편차
3. image build workflow naming과 baseline 편차
4. Docker/entrypoint contract 편차
5. lesson 파일 존재와 갱신 규칙 편차

따라서 표준화 대상은 “코드 내부 구조”가 아니라 “repo 운영 표면”이다.

## Decision

표준화는 아래 세 층으로 나눈다.

### 1. Mandatory Baseline

모든 active implementation repo는 아래를 기본적으로 갖는다.

- `.gitignore`
- `README.md`
- `lesson.md`

추가로 deployable runtime repo는 아래를 갖는다.

- `Dockerfile`
- `.github/workflows/build-image.yml` 또는 해당 runtime의 표준 build workflow

### 2. Archetype Baseline

repo 타입별로 필요한 최소 구조를 구분한다.

#### A. Frontend Repo Archetype

예: `front-web-console`

필수 baseline:

- `.env.local.example`
- `.env.local-test.example`
- `Dockerfile`
- `README.md`
- `lesson.md`
- image build workflow

권장 baseline:

- `e2e/`
- `docker/`

#### B. Gateway Repo Archetype

예: `edge-api-gateway`

필수 baseline:

- `nginx.conf`
- `tests/`
- `Dockerfile`
- `README.md`
- `lesson.md`
- image build workflow

#### C. Django Service Repo Archetype

예: `service-account-access`, 다수 `service-*`

필수 baseline:

- `manage.py`
- `config/`
- primary app package
- `entrypoint.sh`
- `requirements.txt`
- `tests` 또는 app-local tests
- `Dockerfile`
- `README.md`
- `lesson.md`
- image build workflow

#### D. Local Stack / Orchestration Repo Archetype

예: `integration-local-stack`

필수 baseline:

- `compose/`
- `infra/`
- `scripts/`
- `tests/`
- `README.md`
- `lesson.md`

이 archetype은 image build workflow를 필수로 요구하지 않는다. 목적이 orchestration이기 때문이다.

### 3. Repo-Specific Freedom

아래는 강제 표준화하지 않는다.

1. business module naming
2. 내부 package depth
3. read-model repo와 write-model repo의 domain layout
4. UI component tree
5. serializer/view/service folder 분리 방식

즉 baseline은 운영 위생을 맞추는 기준이지, repo 경계를 무시하는 monorepo-style uniformity가 아니다.

## Standard README Sections

active repo README는 가능하면 아래 순서를 따른다.

1. Purpose / boundary
2. Runtime contract or local role
3. Local run / verification
4. Image build / deploy contract
5. Environment files and safety notes
6. Key tests or verification commands
7. Link to root docs/runbook when needed

섹션 이름은 약간 달라도 되지만, 이 정보는 빠지지 않는 것을 기본값으로 본다.

## `.gitignore` Baseline

repo 성격에 따라 약간 다르더라도 아래 범주는 커버해야 한다.

### Common

- `.env`
- `.env.local`
- `.env.*.local`
- editor artifact
- logs
- coverage output
- build output if generated locally

### Python

- `.venv`
- `venv`
- `__pycache__`
- `.pytest_cache`
- `.mypy_cache`
- `.ruff_cache`
- `*.sqlite3`

### Node / Frontend

- `node_modules`
- `.vite`
- `dist`
- `build`
- Playwright artifacts if generated locally

## Build Workflow Baseline

image-backed repo의 build workflow는 아래 baseline을 따른다.

1. workflow name is explicit and repo-specific
2. immutable SHA tag push
3. ECR build role uses the standard org variable
4. README documents the workflow name and image contract
5. workflow output is artifact evidence, not direct runtime deploy

즉 서비스 repo는 build-only producer 역할을 우선한다.

## Lesson File Rule

모든 active implementation repo는 `lesson.md`를 루트에 둔다.

규칙:

1. runtime/deploy 실수는 repo-local lesson에 먼저 남긴다.
2. cross-repo 가치가 있는 lesson만 root `lesson.md`로 승격한다.
3. lesson은 changelog가 아니라 operator rule과 failure pattern을 적는다.

## Non-Goals

이 baseline은 아래를 하지 않는다.

1. 모든 repo를 같은 폴더 트리로 강제
2. business code를 공통 package로 추출
3. repo boundary를 희석
4. 한 번에 전체 repo 대규모 리네임

## Adoption Rule

이 baseline은 한 번에 전체 repo에 강제하지 않는다.

적용 순서:

1. high-frequency repos부터
   - `front-web-console`
   - `edge-api-gateway`
   - `service-account-access`
   - `integration-local-stack`
2. 그 다음 나머지 active `service-*`

새 repo를 만들 때는 처음부터 이 baseline을 따른다.

## Acceptance Criteria

이 설계가 채택됐다고 볼 기준은 아래다.

1. repo archetype별 mandatory baseline이 문서로 고정된다.
2. README / `.gitignore` / build workflow / lesson 규칙이 명시된다.
3. “무엇을 통일하지 않는지”가 함께 적혀 과도한 획일화가 방지된다.
