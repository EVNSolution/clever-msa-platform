# 09. Remaining Empty-Shell Service Priority

## 문서 목적

이 문서는 마지막 `empty shell` 이었던 서비스 repo의 구현 우선순위와 완료 상태를 기록한다.

이번 문서는 아래 두 가지를 동시에 만족해야 한다.

1. 이미 `active runtime` 으로 올라온 서비스와 마지막 구현 대상을 섞지 않는다.
2. 문서에 이미 적혀 있는 선후 관계만 완료 근거로 사용한다.

## 스코프

이번 문서의 대상은 아래 repo 하나였다.

- `service-notification-hub`

아래 repo는 이번 우선순위 문서의 대상이 아니다.

- 이미 `active runtime` 인 repo
- 이미 `migrated-target` 인 repo
- internal-only worker인 `service-telemetry-listener`

## 현재 남은 구현 대상

| Repo | 현재 문서 상태 | 핵심 역할 |
| --- | --- | --- |
| 없음 | 없음 | empty shell backlog 해소 완료 |

## 구현 우선순위

1. 남은 empty shell 없음

## 근거

1. `service-region-analytics` 는 이미 active runtime으로 승격됐다.
2. `service-notification-hub` 가 마지막 empty shell이었다.
3. `service-notification-hub` 는 공지 / 지원 / 결재 / 정산 이벤트의 전달 채널로 정의돼 있다.
4. 따라서 정본 업무 데이터 repo들이 올라온 뒤에 두는 현재 순서가 문서 정합성과 맞았다.
5. 현재는 `service-notification-hub`까지 runtime으로 승격돼 empty shell backlog가 없다.

## 제외 기준 재확인

아래 repo는 이미 현재 runtime에 포함돼 있으므로 이번 문서의 다음 구현 대상이 아니다.

- `service-dispatch-registry`
- `service-dispatch-operations-view`
- `service-personnel-document-registry`
- `service-region-registry`
- `service-region-analytics`
- `service-announcement-registry`
- `service-support-registry`

## 연결 문서

- `../mappings/current-runtime-inventory.md`
- `../../repo-map.md`
- `../decisions/specs/2026-03-23-additional-business-domain-units-design.md`
- `../decisions/specs/2026-03-23-planned-business-domain-skeleton-targets-design.md`
