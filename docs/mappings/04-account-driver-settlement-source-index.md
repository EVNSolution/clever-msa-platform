# 04. Account / Driver / Settlement Source Index

## 문서 목적

이 문서는 Account / Driver / Settlement 재편 작업에서 먼저 읽어야 할 서버와 클라이언트 소스 경로를 정리한 인덱스다.

확인 순서는 `urls.py`를 먼저 보고, 앱별로 flat-file `views.py` / `serializers.py` 또는 package entry `views/__init__.py` / `serializers/__init__.py`를 이어서 보는 순서로 잡는다.

## 서버 측 우선 경로

core / documents 앱은 패키지형 구조라서 `views.py` / `serializers.py` 대신 `views/__init__.py` / `serializers/__init__.py`를 진입점으로 본다.

### 1. Root route entry

- `ev-dashboard-server/src/ev_dashboard/urls.py`

### 2. Identity Access (Account / Auth)

- `ev-dashboard-server/src/auth/urls.py`
- `ev-dashboard-server/src/auth/views.py`
- `ev-dashboard-server/src/auth/serializers.py`
- `ev-dashboard-server/src/core/urls.py`
- `ev-dashboard-server/src/core/views/__init__.py`
- `ev-dashboard-server/src/core/serializers/__init__.py`

### 3. Driver Profile HR / Settlement Payroll

- `ev-dashboard-server/src/documents/urls.py`
- `ev-dashboard-server/src/documents/views/__init__.py`
- `ev-dashboard-server/src/documents/serializers/__init__.py`

### 4. Organization Master

- `ev-dashboard-server/src/core/urls.py`
- `ev-dashboard-server/src/core/views/__init__.py`
- `ev-dashboard-server/src/core/serializers/__init__.py`

## 주의

이 문서는 source file path 인덱스만 담는다. API prefix의 소유 경계와 merge/split 판단은 `reference/03-account-driver-settlement-legacy-cut-map.md`와 `goal/07-legacy-api-mapping.md`에 둔다.

## 채널 측 우선 경로

### Web frontend

현재 플랫폼 current truth는 `front-web-console` 하나의 단일 웹 콘솔이다. 아래 경로는 legacy source를 읽을 때의 공통 frontend source entry로만 사용한다.

- `ev-dashboard-web-frontend/src/config/env.ts`
- `ev-dashboard-web-frontend/src/data/remote/repository/auth.repo.ts`
- `ev-dashboard-web-frontend/src/data/remote/repository/driver-information.repo.ts`
- `ev-dashboard-web-frontend/src/data/remote/repository/payroll-repo.ts`
- `ev-dashboard-web-frontend/src/data/remote/repository/company.repo.ts`
- `ev-dashboard-web-frontend/src/data/remote/repository/organization.repo.ts`
- `ev-dashboard-web-frontend/src/router/index.ts`

### Driver app

- `ev-driver-android/.env`
- `ev-driver-android/.env.production`
- `ev-driver-android/.env.development`
- `ev-driver-android/lib/core/services/dio.dart`

### IVI

- `ev-application-ivi/app/src/main/java/com/evn/ev_ivi/core/services/NetworkService.kt`

## 읽기 우선순위

1. 서버 root route entry를 먼저 본다.
2. `auth` namespace는 `urls.py` -> `views.py` -> `serializers.py` 순서로 본다.
3. `core` namespace는 `urls.py` -> `views/__init__.py` -> `serializers/__init__.py` 순서로 본다.
4. `documents` namespace는 `urls.py` -> `views/__init__.py` -> `serializers/__init__.py` 순서로 본다.
5. Web, Driver App, IVI의 base URL 설정을 확인하고 실제 소비 경로를 맞춘다.
