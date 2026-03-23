# 11. Account / Driver / Settlement Boundary Map

## 문서 목적
이 문서는 `Account / Auth`, `Driver Profile HR`, `Settlement Payroll`, `Organization Master` 경계를 기존 목표 문서 체계 안으로 편입하는 문서다.
문서 내에서 `Identity Access`는 `Account / Auth`의 동의어로 본다.

## 포함 서비스
1. Organization Master
2. Account / Auth
3. Driver Profile HR
4. Settlement Payroll

## 경계 규칙
1. `account_id`와 `driver_id`는 절대 합치지 않는다.
2. Organization Master는 `company`, `fleet`, `org_unit`, `org_membership_policy`, `affiliation_reference_dictionary`를 정본으로 가진다.
3. Settlement는 계산 결과와 지급 상태만 소유한다.
4. Driver는 프로필과 재직 상태를 소유하고 자격 증명은 소유하지 않는다.
5. 이전의 `공유계정` / `정산용 식별자` 개념은 로그인 정체성 모델에 넣지 않고, 비로그인 정산 식별자로서 `Settlement Payroll` 쪽에서 별도로 관리한다.
