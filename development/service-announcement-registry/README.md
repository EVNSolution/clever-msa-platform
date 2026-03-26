# service-announcement-registry

이 repo는 공지 게시 정본 runtime이다.

현재 역할:
- `Announcement` CRUD
- 게시 상태, 게시 범위, 게시 시각 관리
- admin-only management API와 `health` endpoint
- deterministic bootstrap seed command

이 repo는 절대 소유하지 않음:
- push send
- FCM token registry
- inbox notifications
- notification delivery log
- support ticket workflow

현재 API:
- internal path: `/health/`
- internal path: `/`
- internal path: `/<announcement_id>/`
- gateway prefix: `/api/announcements/`

아직 포함하지 않음:
- public announcement feed
- 읽음 처리
- attachment metadata
- support workflow merge

현재 정본:
- `../../docs/mappings/`
- `../../docs/decisions/specs/2026-03-26-announcement-registry-phase-1-activation-design.md`
