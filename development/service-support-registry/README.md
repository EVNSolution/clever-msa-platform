# service-support-registry

이 repo는 지원 정본 runtime이다.

현재 역할:
- `SupportTicket` CRUD
- `SupportTicketResponse` CRUD
- 처리 상태, priority 관리
- authenticated ticket create와 admin handling API
- deterministic bootstrap seed command

이 repo는 절대 소유하지 않음:
- push send
- inbox notifications
- announcement posting
- approval truth
- attachment binary storage

현재 API:
- internal path: `/health/`
- internal path: `/tickets/`
- internal path: `/tickets/<ticket_id>/`
- internal path: `/ticket-responses/`
- gateway prefix: `/api/ticket/`

아직 포함하지 않음:
- support read-model
- SLA dashboard
- external chatbot integration

현재 정본:
- `../../docs/mappings/`
- `../../docs/decisions/specs/2026-03-26-support-registry-phase-1-activation-design.md`
