# 21. Design System And Surface Rules

## 문서 목적

이 문서는 CLEVER 플랫폼의 공통 디자인 정본을 고정한다.

목표는 아래 세 가지다.

1. `front-web-console`의 현재 시각 언어와 운영형 UI 규칙을 한 문서에 모은다.
2. 이후 에이전트와 사람이 함께 사용할 수 있는 루트 `DESIGN.md`의 canonical source를 제공한다.
3. 향후 `front-driver-app` 같은 추가 surface가 들어와도 같은 브랜드와 규칙 축을 공유하게 만든다.

## 적용 범위

- active runtime web: `development/front-web-console/`
- planned mobile appendix: `docs/superpowers/specs/2026-04-13-driver-app-mvp-design.md`
- 관련 contract: `docs/contracts/10-front-ui-rules.md`, `docs/contracts/18-single-web-console-screen-map.md`

이 문서는 마케팅 사이트 규칙이나 외부 브랜딩 가이드를 다루지 않는다.

## 현재 surface 상태

### 1. 단일 웹 콘솔이 현재 active surface다

- 현재 active web runtime은 `front-web-console` 하나다.
- 사용자-facing 기준은 `권한 기반 단일 웹 콘솔`이다.
- 관리/운영 앱을 별도 웹으로 다시 나누지 않는다.

### 2. driver app은 아직 planned surface다

- `front-driver-app`은 아직 active child repo가 아니다.
- mobile appendix는 [2026-04-13-driver-app-mvp-design.md](../superpowers/specs/2026-04-13-driver-app-mvp-design.md)를 기반으로 한 target guidance다.
- 구현이 아직 없는 부분은 `확인 필요` 또는 `TBD`로 남긴다.

## Mission

CLEVER UI는 화려한 브랜드 쇼케이스가 아니라, 운영자가 빠르게 읽고 판단하고 수정할 수 있는 high-signal operations surface를 지향한다.

핵심 경험은 아래와 같다.

1. 첫 화면에서 현재 상태를 빠르게 스캔할 수 있어야 한다.
2. 목록, 상세, 생성, 수정의 역할이 섞이지 않아야 한다.
3. 권한 차이는 앱 분리가 아니라 같은 surface 안의 view/action 차이로 설명되어야 한다.
4. 모바일이 추가되더라도 브랜드 축과 상태 의미는 유지되어야 한다.

## Brand

- 제품/브랜드: `CLEVER`
- 현재 핵심 surface: `front-web-console`
- 확장 예정 surface: 배송원 self-service mobile app
- 사용 맥락: 배차, 차량, 배송원, 정산, 공지, 알림, 문의, 권한 운영
- 시각 방향: `light workspace + dark shell + lime action accent`
- 경험 키워드: `operational`, `precise`, `restrained`, `tactile`, `high-signal`

## Style Foundations

### 1. 시각 스타일

현재 CLEVER는 완전 flat UI도 아니고, 과장된 glass/gradient UI도 아니다.

유지할 기준은 아래와 같다.

1. 작업 영역은 밝고 읽기 쉬워야 한다.
2. shell 영역은 어둡고 안정적이어야 한다.
3. 강조는 lime 계열 하나를 중심으로 절제해서 사용한다.
4. 카드, 모달, summary panel에는 약한 depth를 허용한다.
5. decoration보다 정보 구조를 우선한다.

### 2. 현재 확인된 색상 토큰

아래 값은 현재 `front-web-console/src/styles.css`에서 확인된 foundation이다.

| Token | Value | 역할 |
| --- | --- | --- |
| `accent` | `#cdde00` | 주요 CTA, 강조, active selection |
| `accent-soft` | `#f4f8c7` | accent의 약한 배경 |
| `panel-bg` | `#ffffff` | 카드/폼/표면 배경 |
| `panel-border` | `#e7e9ee` | 카드/구획 border |
| `text-default` | `#181818` | 기본 본문 |
| `text-muted` | `#6f7785` | 보조 정보 |
| `danger` | `#c5352c` | 에러, destructive action |
| `console-dark` | `#171817` | 상단/좌측 shell 핵심 배경 |
| `console-dark-soft` | `#1f201f` | shell 보조 배경 |

### 3. 현재 확인된 상태 토큰

현재 구현에는 일반 semantic alias보다 `policy-*` 계열이 먼저 정리돼 있다.

| State family | Current token/value | 현재 의미 |
| --- | --- | --- |
| `allow` | `rgba(205, 222, 0, 0.16)` / `#4d6600` | 허용, success에 가까운 긍정 상태 |
| `deny` | `rgba(181, 41, 67, 0.08)` / `#a11d45` | 차단, 거부, negative state |
| `locked` | `rgba(28, 32, 43, 0.05)` / `#66707f` | read-only, 잠금, 중립 제약 |
| `changed` | `rgba(181, 41, 67, 0.10)` / `#8f1137` | 변경 주의, draft difference |

### 4. 추가가 필요한 semantic state

아래 상태는 디자인 문서에는 포함하되, exact token value는 아직 current code에서 완전히 고정되지 않았다.

- `info`
- `pending`
- `live`
- `stale`
- `offline`
- `archived`

원칙:

1. 위 상태를 추가할 때 primary lime을 재사용해 모든 상태를 설명하지 않는다.
2. `negative`와 `warning`을 같은 색 의미로 섞지 않는다.
3. exact hex/value는 실제 도입 시 `확인 필요` 또는 `TBD`로 둔다.

### 5. 타이포그래피

현재 typography foundation은 아래를 기준으로 고정한다.

- body UI font: `IBM Plex Sans`
- heading / numeric emphasis / code-like accent font: `Space Grotesk`

규칙:

1. 본문, 입력, 표, 일반 설명은 `IBM Plex Sans`를 사용한다.
2. 헤드라인, 페이지 타이틀, metric, 강한 label, code/identifier는 `Space Grotesk`를 사용한다.
3. 제3의 primary font를 추가하지 않는다.
4. mobile appendix도 같은 font 축을 우선 검토하되, 실제 Flutter runtime font 세팅은 `확인 필요`다.

### 6. 레이아웃과 밀도

현재 web console의 고정 레이아웃 원칙은 아래와 같다.

1. 로그인 이후는 `topbar + page-body` 구조를 유지한다.
2. 주요 정보 단위는 `panel`로 끊는다.
3. 목록/상세/생성/수정은 route를 분리한다.
4. 신규 생성/수정 폼은 1열을 기본으로 한다.
5. 관계 설명이 필요한 상세만 제한적으로 2열을 허용한다.
6. 목록은 표 중심이고, row click으로 상세에 진입한다.

### 7. 깊이, radius, motion

현재 구현상 depth와 motion은 약하게 사용한다.

유지할 기준:

1. card/panel shadow는 약하게 둔다.
2. hover/press motion은 짧고 미세해야 한다.
3. 과장된 parallax, long spring, heavy blur는 사용하지 않는다.
4. rounded corner는 small control과 card surface에서 허용하되, 지나치게 playful한 radius는 피한다.

현재 code에서 확인된 패턴:

- button radius: `8px`
- pill badge/button radius: `999px`
- card/panel radius: `16px`, 일부 large surface는 `22px`
- short interaction transition: 약 `120ms`
- banner entry/exit motion: 약 `240ms`

### 8. spacing

현재는 centralized spacing token file이 없다.
대신 CSS 전반에 `0.45rem ~ 1.3rem` 간격과 `4px` 배수에 가까운 리듬이 반복된다.

규칙:

1. 새 surface는 사실상 `4px` base rhythm을 따른다고 보고 작성한다.
2. one-off spacing exception을 추가하지 않는다.
3. layout spacing은 component마다 새 숫자를 invent하지 않고 기존 간격군으로 묶는다.

## Accessibility

CLEVER UI는 novelty보다 접근성을 우선한다.

기본 규칙:

1. target은 `WCAG 2.2 AA`다.
2. 모든 interactive element는 `focus-visible` 상태를 가져야 한다.
3. keyboard-only 이동이 가능해야 한다.
4. color만으로 상태를 구분하지 않는다.
5. empty / error / unavailable을 같은 문구로 처리하지 않는다.
6. 표와 상세 구조는 semantic HTML을 우선 사용한다.

## Writing Tone

UI 문구와 문서 톤은 아래를 따른다.

- concise
- operational
- direct
- implementation-focused

규칙:

1. empty state는 짧고 작업 유도형으로 쓴다.
2. error는 raw backend message 전체를 그대로 뿌리지 않는다.
3. 상태 문구는 현재 문맥에서 필요한 정보만 남긴다.
4. 관리자/운영자 문구는 과한 마케팅 tone을 쓰지 않는다.

## Rules: Do

- semantic token 이름을 우선 사용하고, component rule에서 raw hex를 직접 늘리지 않는다.
- 모든 interactive component에 `default`, `hover`, `focus-visible`, `active`, `disabled` 상태를 정의한다.
- 필요하면 `loading`, `success`, `error` 상태도 명시한다.
- web console에서는 목록/상세/생성/수정 route 분리를 유지한다.
- 표는 운영형 스캔에 맞게 dense하지만 읽을 수 있는 line-height를 유지한다.
- row click 상세 진입 규칙을 새 리소스에도 일관되게 적용한다.
- shell은 dark, work area는 light라는 대비 구조를 유지한다.
- accent lime은 action hierarchy의 1순위에만 사용한다.
- status badge는 상태 의미를 먼저 정하고 색을 배정한다.
- driver app이 들어와도 brand foundation과 state meaning을 웹과 맞춘다.

## Rules: Don't

- admin web / operator web 분리 모델로 되돌리지 않는다.
- gradient, glass, blur, neon 효과를 기본 visual language로 쓰지 않는다.
- purple 중심 brand palette를 새 primary처럼 도입하지 않는다.
- 같은 의미의 상태를 화면마다 다른 색으로 다시 정의하지 않는다.
- 목록 화면 안에 긴 수정 폼을 펼치지 않는다.
- 테이블에 `보기`, `수정` 버튼 열을 기본으로 두지 않는다.
- low-contrast text나 hidden focus ring을 허용하지 않는다.
- raw identifier나 내부 값 때문에 page-level horizontal overflow를 만들지 않는다.

## Component Rule Expectations

### 1. App Shell

1. 로그인 이후 shell은 dark navigation + light content 구조를 유지한다.
2. shell은 화면의 정보 위계를 설명하는 프레임이어야지, 자체가 주인공이 되면 안 된다.
3. mobile에서는 drawer로 접히더라도 같은 정보 구조를 유지한다.

### 2. Panel / Card

1. 주요 읽기/입력 블록은 `panel` 계열을 기본으로 한다.
2. panel은 white surface, soft border, restrained shadow를 공유한다.
3. summary card와 detail sheet는 같은 family 안에서 밀도만 달라져야 한다.

### 3. Button

1. primary button은 lime accent를 사용한다.
2. secondary/ghost는 neutral surface를 사용한다.
3. destructive action은 danger 계열로만 표현한다.
4. small button은 dense table/action bar 문맥에서만 사용한다.

### 4. Input / Select / Textarea

1. field는 full width를 기본으로 한다.
2. label은 field 위에 둔다.
3. focus는 border + ring으로 명확하게 보이게 한다.
4. read-only value를 editable control처럼 위장하지 않는다.

### 5. Table / List

1. 운영형 목록은 `table-layout: fixed`를 기본으로 한다.
2. header는 muted + uppercase small label 규칙을 유지한다.
3. row hover/selected state는 subtle background 변화로 표현한다.
4. 목록은 핵심 정보와 상태만 보여주고, 긴 관계 정보는 detail로 넘긴다.

### 6. Detail View

1. 상세는 읽기 전용 요약과 관계 정보 중심이다.
2. 수정 진입은 상세에서만 연다.
3. 상하 관계가 명확할 때만 2열 관계 화면 예외를 허용한다.

### 7. Modal / Drawer

1. modal은 예외 입력, 확인, 작은 편집에만 사용한다.
2. 긴 운영 흐름은 full-page route를 우선한다.
3. drawer는 mobile navigation이나 보조 surface로만 사용한다.

### 8. Empty / Loading / Error / Notice

1. empty state는 무채색 보조 문구로 시작한다.
2. error는 danger 계열 banner로 분리한다.
3. top notice는 success/error의 짧은 global feedback에만 사용한다.
4. loading과 empty는 같은 tone으로 섞지 않는다.

### 9. Badge / Status

1. badge는 state 의미를 압축하는 용도다.
2. 같은 shape family를 공유하되, state마다 semantic color를 쓴다.
3. policy badge와 일반 status badge가 완전히 다른 체계로 분리되지 않게 정리한다.

### 10. Analytics / Telemetry

1. 차트와 freshness surface는 추가 semantic token 정리가 필요하다.
2. `live/stale/offline`은 단순 success/danger로 대체하지 않는다.
3. exact analytics palette는 `TBD`다.

## Web Console Appendix

### 현재 확정 규칙

- active runtime repo: `front-web-console`
- base route surface: `/`
- 권한 차이는 route 분리보다 화면/액션 분기로 설명
- UI-first working mode 유지

핵심 UI 계약:

1. 탭 첫 화면은 목록이다.
2. 생성/상세/수정은 route를 분리한다.
3. 입력 폼은 1열 기본이다.
4. detail은 읽기 전용 요약과 관계 정보 중심이다.
5. list row는 상세 진입 trigger다.

관련 정본:

- [10-front-ui-rules.md](10-front-ui-rules.md)
- [18-single-web-console-screen-map.md](18-single-web-console-screen-map.md)
- [../rollout/15-ui-first-working-mode.md](../rollout/15-ui-first-working-mode.md)

## Driver App Appendix

### 현재 문서 기준 확정 사항

- 앱 방향: 배송원 전용 mobile app MVP
- target repo: `development/front-driver-app/`
- 현재 상태: planned, not active runtime
- 기술 방향: `Flutter`
- 앱 범위: `auth`, `announcements`, `notifications`, `support`, `account`, `attendance`, `dispatch`

### 웹과 공유해야 하는 foundation

1. brand tone은 CLEVER web과 맞춘다.
2. status 의미는 웹과 동일한 semantic을 사용한다.
3. auth/session language는 웹과 같은 contract를 따른다.
4. mobile은 더 큰 touch target과 단순한 정보 구조를 사용하되, 다른 브랜드처럼 보이면 안 된다.

### mobile에서 달라져야 하는 점

1. form과 action density를 더 낮춘다.
2. thumb reach와 one-hand navigation을 우선한다.
3. 정보는 dashboard/table보다 summary/list card 중심으로 재구성한다.
4. exact mobile component library와 design token export 방식은 `확인 필요`다.

### 확인 필요

- 실제 `front-driver-app` repo 생성 시점
- Flutter runtime font 설정 방식
- mobile semantic token export 방식
- notification, attendance, dispatch self-scoped endpoint 실제 구현 시점

## Quality Gates

아래를 모두 만족해야 이 문서 기준을 지킨 것으로 본다.

1. non-negotiable 규칙은 `must` 수준으로 해석 가능해야 한다.
2. state meaning은 component마다 흔들리지 않아야 한다.
3. 새 화면은 기존 route/layout grammar를 깨지 않아야 한다.
4. accessibility 규칙은 실제 구현에서 테스트 가능해야 한다.
5. current code에서 확인되지 않은 값은 `확인 필요` 또는 `TBD`로 남겨야 한다.

## 연결 문서

- [10-front-ui-rules.md](10-front-ui-rules.md)
- [15-auth-api-scenario-map.md](15-auth-api-scenario-map.md)
- [17-admin-communication-pages.md](17-admin-communication-pages.md)
- [18-single-web-console-screen-map.md](18-single-web-console-screen-map.md)
- [../decisions/specs/2026-04-06-single-web-console-cutover-design.md](../decisions/specs/2026-04-06-single-web-console-cutover-design.md)
- [../superpowers/specs/2026-04-13-driver-app-mvp-design.md](../superpowers/specs/2026-04-13-driver-app-mvp-design.md)
