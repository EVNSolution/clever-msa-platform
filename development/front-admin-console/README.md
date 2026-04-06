# front-admin-console

이 repo는 현재 플랫폼의 단일 웹 콘솔 runtime을 소유한다.

현재 역할:
- 권한 기반 웹 shell과 공통 라우팅
- 관리자 CRUD 화면
- lower manager read/self-service 화면
- 단일 웹 API client와 page test

포함:
- React/Vite app
- single-web route와 API client
- page/component test

포함하지 않음:
- gateway 설정
- backend 도메인 로직
- 모바일 앱 UI

주의:
- repo 경로 이름은 아직 `front-admin-console`이지만, 사용자-facing current truth는 `통합 웹 콘솔`이다.
- 별도 `front-operator-console`는 active runtime이 아니라 legacy reference다.

아키텍처 정본:
- `../../docs/contracts/`
- `../../docs/boundaries/`
- `../../docs/decisions/specs/2026-04-06-single-web-console-cutover-design.md`
