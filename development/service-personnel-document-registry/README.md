# service-personnel-document-registry

기사 인사문서 메타데이터 정본 runtime repo다.

현재 역할:
- 기사 단위 계약, 증빙, 계좌증빙, 사업자등록 문서 메타데이터 정본
- 문서 종류, 상태, 유효기간, 외부 참조, 부가 payload 관리
- admin-only CRUD와 bootstrap seed 제공

현재 API:
- internal route: `/health/`
- internal route: `/documents/`
- gateway prefix: `/api/personnel-documents/`

상태:
- active runtime
- compose service: `personnel-document-registry-api`
- database: `personnel-document-db`

비스코프:
- 파일 바이너리 저장
- approval workflow
- driver profile 정본 복제
- 회사 단위 문서 aggregate

정본 문서:
- 플랫폼 아키텍처 정본은 `../../docs/` 아래 문서를 따른다.
