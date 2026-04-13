# Public Repo Transition Design

## Purpose

이 문서는 `clever-msa-platform` root와 `development/*` linked child repo를 private에서 public으로 전환할 때 필요한 현재 트리 위생 기준과 history rewrite 범위를 고정한다.

이번 결정의 목적은 두 가지다.

1. GitHub private Actions 사용량 제한 때문에 MSA 관련 repo를 public으로 전환한다.
2. 공개 전환과 동시에 example credential, local artifact ignore, synthetic fixture rule을 문서 기준으로 정리한다.

## Scope

공개 전환 범위는 아래다.

- `EVNSolution/clever-msa-platform`
- `repo-map.md`에 있는 active `development/*` linked child repo 전체

즉 root만 public으로 바꾸고 child repo를 private로 남기지 않는다. umbrella workspace와 active child repo visibility는 같이 움직인다.

## Current Risks

현재 전환 전에 닫아야 하는 위험은 아래다.

### 1. Dev-only example credential literal이 일부 repo history에 남아 있다

기존 dev 검증 과정에서 쓰던 example admin email/password literal이 아래 repo history에 남아 있다.

- root `clever-msa-platform`
- `front-web-console`
- `integration-local-stack`
- `service-account-access`

이 상태로 public 전환하면 현재 HEAD만 아니라 과거 commit도 그대로 공개된다.

### 2. Repo-local ignore baseline이 제각각이다

여러 repo가 `.venv`, cache, coverage, sqlite, editor artifact ignore를 일부만 가지고 있다.

public 전환 뒤에는 local artifact가 다시 commit되는 실수를 줄여야 한다.

### 3. Synthetic fixture와 example env는 남기되 real-looking 값을 줄여야 한다

fixture와 `.env.example` 자체는 로컬 검증용으로 유지한다. 대신 공개 repo에 남는 값은 placeholder이거나 synthetic data여야 한다.

## Decisions

### Decision 1. Example credential은 공개용 placeholder로 통일한다

현재 트리 기준 example credential은 아래로 통일한다.

- seed admin email: `seed-admin@example.com`
- seed admin password: `ChangeMe123!`
- 문의/support note email: `support@example.com`

이 값들은 local verification용 placeholder일 뿐이고 실운영 계정이나 실제 지원 메일이 아니다.

### Decision 2. History rewrite는 4개 repo에 대해 선행한다

아래 repo는 public 전환 전에 history rewrite를 수행한다.

- root `clever-msa-platform`
- `front-web-console`
- `integration-local-stack`
- `service-account-access`

목표는 기존 example credential literal을 reachable history에서 제거하는 것이다.

### Decision 3. `.gitignore` baseline을 public hygiene 기준으로 맞춘다

root와 child repo는 최소 아래 artifact를 ignore해야 한다.

- `.env`, `.env.local`, `.env.*.local`
- `.venv`, `.venv312`, `venv`
- `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.ruff_cache`
- `coverage`, `.coverage`, `htmlcov`
- `dist`, `build`
- `db.sqlite3`, `*.sqlite3`
- editor/log artifact

### Decision 4. Synthetic fixture는 유지하되 real secret replacement는 금지한다

아래는 유지한다.

- `ops-derived-sample.json` 같은 synthetic fixture
- `.env.example` 템플릿
- seed command / import command / smoke script

아래는 금지한다.

- 실제 사람 이메일
- 실제 운영 비밀번호
- 실제 remote target secret
- local virtualenv 산출물 재추적

## Execution Order

1. current-tree hygiene patch 적용
2. affected tests로 example literal 치환 영향 확인
3. rewrite 대상 4개 repo history 정리와 force-push
4. child repo push 결과를 root submodule pointer에 반영
5. root와 child repo 전부 visibility를 `public`으로 변경

## Acceptance Criteria

- active root + child repo 전체가 public 상태다.
- rewrite 대상 4개 repo의 reachable history에서 이전 example credential literal이 사라진다.
- current tree에 old example credential literal이 남지 않는다.
- `.gitignore` baseline이 local artifact 재추적을 줄이는 수준으로 보강된다.
- example env와 fixture는 계속 로컬 검증에 쓸 수 있다.
