# edge-api-gateway

이 repo는 플랫폼의 edge gateway를 소유한다.

현재 역할:
- Nginx reverse proxy
- front/admin/service API 단일 진입점
- auth header와 cookie forwarding

포함:
- `nginx.conf`
- gateway `Dockerfile`
- edge routing profile

포함하지 않음:
- token 발급 로직
- 도메인 비즈니스 로직
- front source
- 서비스 모델/serializer

아키텍처 정본:
- `../../docs/contracts/`
- `../../docs/mappings/`
