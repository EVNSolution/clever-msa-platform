# service-account-access

이 repo는 계정 출입구와 접근 제어 `access` 정본을 소유한다.

현재 역할:
- 계정, 인증, 토큰, 접근 제어
- 로그인/refresh/logout
- lockout, change-password, account-driver link helper

포함:
- Django/DRF runtime
- account/auth migration
- account/auth test
- service-local seed command

포함하지 않음:
- 조직 정본
- 배송원 profile 정본
- vehicle/assignment 로직
- 플랫폼 전체 compose와 gateway 설정

아키텍처 정본:
- `../../docs/contracts/`
- `../../docs/mappings/`
