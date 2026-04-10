# API Docs Deploy Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 중앙 배포가 `clever-msa-platform`의 API docs refresh 성공 상태를 rollout 전 precondition으로 검사하도록 만든다.

**Architecture:** `clever-deploy-control`의 central deploy workflow에 `check_api_docs` job을 추가한다. 이 job은 `EVNSolution/clever-msa-platform`의 `refresh-api-docs.yml` 최신 main run 상태를 GitHub API로 읽고, 기본 모드 `enforce`에서는 실패 시 rollout을 중단한다. docs refresh workflow checkout은 `GH_ACTIONS_REPO_READ_TOKEN`을 우선 사용하고, legacy `GH_ACTIONS_CLEVER_PLATFORM_READ_TOKEN`도 fallback으로 허용한다. `skip`은 명시적 예외 경로다.

**Tech Stack:** GitHub Actions, GitHub REST API, curl, jq, Markdown runbooks

---

### Task 1: 운영 정책과 설계 문서를 고정한다

**Files:**
- Modify: `docs/superpowers/specs/2026-04-09-image-deploy-operating-policy-design.md`
- Add: `docs/superpowers/specs/2026-04-09-api-docs-deploy-gate-design.md`

- [ ] **Step 1: API docs gate의 기본 rule을 문서에 추가한다**

반영 내용:
- central deploy 기본 경로에 API docs freshness gate 포함
- 기본 모드는 `enforce`
- 예외 모드는 `skip`

- [ ] **Step 2: 전용 설계 문서를 추가한다**

아래를 고정한다.
- 왜 CI refresh만으로는 부족한지
- 왜 central deploy에서 gate해야 하는지
- 어떤 secret과 어떤 workflow run을 읽는지
- pass / fail / skip 조건

- [ ] **Step 3: 문서 diff를 확인한다**

Expected:
- 운영 정책과 설계 문서가 같은 gate semantics를 설명

### Task 2: central deploy 입력과 gate job을 추가한다

**Files:**
- Modify: `../clever-deploy-control/.github/workflows/central-deploy-dispatch.yml`
- Modify: `../clever-deploy-control/.github/workflows/central-deploy.yml`

- [ ] **Step 1: failing expectation을 정리한다**

현재 문제:
- 중앙 배포는 API docs freshness를 확인하지 않고 wave deploy로 바로 넘어간다

- [ ] **Step 2: dispatch workflow에 `api_docs_gate` 입력을 추가한다**

반영 내용:
- `enforce`
- `skip`
- 호출 workflow에 그대로 전달

- [ ] **Step 3: central deploy workflow에 `check_api_docs` job을 추가한다**

반영 내용:
- `plan` 이후 실행
- `deploy`는 `check_api_docs` 성공 이후만 진행
- `GH_ACTIONS_REPO_READ_TOKEN` 또는 legacy `GH_ACTIONS_CLEVER_PLATFORM_READ_TOKEN`으로 platform repo Actions run 조회

- [ ] **Step 4: gate 로직을 구현한다**

기준:
- 대상 workflow: `refresh-api-docs.yml`
- 대상 branch: `main`
- latest run must be `completed + success`
- token missing while `enforce`이면 실패
- `skip`이면 summary에 예외로 남기고 통과

- [ ] **Step 5: workflow 문법과 핵심 문자열을 점검한다**

Expected:
- `api_docs_gate` 입력이 dispatch와 central deploy 양쪽에 존재
- `deploy` job이 `check_api_docs`를 `needs`로 가진다
- `GH_ACTIONS_REPO_READ_TOKEN` 또는 legacy `GH_ACTIONS_CLEVER_PLATFORM_READ_TOKEN` 참조가 존재한다

### Task 3: runbook에 운영 절차와 예외를 반영한다

**Files:**
- Modify: `../clever-deploy-control/docs/runbooks/image-deploy-pilot.md`

- [ ] **Step 1: runbook에 API docs gate 섹션을 추가한다**

아래를 반영한다.
- default: `enforce`
- exception: `skip`
- required secret name
- latest refresh run을 확인한다는 운영 의미

- [ ] **Step 2: 문서 wording을 build-only / deploy-only 정책과 연결한다**

Expected:
- deploy gate가 service repo 책임이 아니라 central repo 책임으로 설명됨

- [ ] **Step 3: 문서 변경을 검토한다**

Expected:
- 운영자가 runbook만 읽어도 gate와 예외 경로를 이해할 수 있음
