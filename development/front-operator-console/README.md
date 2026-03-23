# front-operator-console

이 repo는 운영자/현장용 front UI를 소유한다.

현재 역할:
- 로그인 이후 일반 운영 화면
- driver/vehicle 운영 조회와 terminal/telemetry latest 상태 표시
- operator-facing API client와 router

포함:
- React/Vite app
- operator page test
- operator route와 API client

포함하지 않음:
- admin UI
- gateway 설정
- backend 도메인 로직

아키텍처 정본:
- `../../docs/contracts/`
- `../../docs/boundaries/`
