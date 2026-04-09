# Dispatch Upload Settlement Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 배차표 업로드로 당일 인력을 확정하고, `external_user_name` 기반 매칭과 회사·플릿별 단가표를 통해 정산 생성까지 이어지는 1차 vertical slice를 구현한다.

**Architecture:** `service-dispatch-registry`가 업로드 batch와 raw row, 매칭 결과, 용차/특근 보정을 소유한다. `service-driver-profile`은 배송원 정본에 `external_user_name`을 추가하고, `service-settlement-registry`는 전역 정산 설정과 분리된 회사·플릿별 단가표를 제공하며, `service-delivery-record`는 확정된 배차 결과에서 정산용 snapshot을 생성한다.

**Tech Stack:** Django REST Framework, Django ORM, React, TypeScript, React Router, Vitest, Playwright, existing CLEVER gateway/API clients

---

## Scope Check

이 spec은 여러 repo를 건드리지만 하나의 vertical slice로 묶여 있다.

- 배송원 외부 사용자명 정본
- 배차 업로드/매칭
- 정산 단가표
- 정산 snapshot handoff
- 프런트 배차/정산 UX

즉 독립 하위 프로젝트로 쪼개기보다, repo별로 닫히는 작업 순서로 진행하는 편이 맞다.

## File Map

### Root Docs

- Reference spec: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-09-dispatch-upload-settlement-phase1-design.md`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/plans/2026-04-09-dispatch-upload-settlement-phase1-implementation-plan.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/contracts/18-single-web-console-screen-map.md`

### `development/service-driver-profile`

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile/drivers/models.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile/drivers/serializers.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile/drivers/views.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile/drivers/management/commands/seed_drivers.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile/drivers/migrations/0006_driverprofile_external_user_name.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile/drivers/tests/test_driver_api.py`

### `development/service-settlement-registry`

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/settlementregistry/models.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/settlementregistry/serializers.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/settlementregistry/views.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/settlementregistry/urls.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/settlementregistry/management/commands/seed_settlement_registry.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/settlementregistry/migrations/0003_companyfleetpricingtable.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/settlementregistry/tests/test_company_fleet_pricing_api.py`

### `development/service-dispatch-registry`

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/models.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/serializers.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/views.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/urls.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/services/source_clients.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/management/commands/seed_dispatch.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/migrations/0005_dispatchuploadbatch_dispatchuploadrow.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/services/dispatch_upload_service.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/tests/test_dispatch_upload_api.py`

### `development/service-delivery-record`

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/deliveryrecords/views.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/deliveryrecords/urls.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/deliveryrecords/tests/test_delivery_record_api.py`

### `development/service-settlement-payroll`

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll/settlements/views.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll/settlements/tests/test_settlement_api.py`

### `development/front-web-console`

- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/types.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/api/drivers.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/api/dispatchRegistry.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/api/settlementRegistry.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DriverFormPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DriverDetailPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DriversPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DispatchBoardDetailPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/SettlementCriteriaPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/SettlementInputsPage.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/DispatchUploadWizard.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/DispatchUploadWizard.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DriverFormPage.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DriverDetailPage.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DriversPage.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DispatchBoardDetailPage.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/SettlementCriteriaPage.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/SettlementInputsPage.test.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/e2e/dispatch-upload.spec.ts`

## Task 0: Preflight And Baseline

**Files:**
- Read only: spec + file map above

- [ ] **Step 1: worktree 오염 상태를 기록한다**

Run:

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform status --short
```

Expected:
- 현재 문서 변경 외 기존 dirty child repo가 보일 수 있다
- 이 plan 작업에서는 내가 만든 변경만 건드린다

- [ ] **Step 2: 현재 테스트 baseline을 저장한다**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console && npm run test -- DriverFormPage.test.tsx DriverDetailPage.test.tsx DriversPage.test.tsx DispatchBoardDetailPage.test.tsx SettlementCriteriaPage.test.tsx SettlementInputsPage.test.tsx
```

Expected:
- 현 시점 baseline PASS 또는 기존 known FAIL 기록

- [ ] **Step 3: backend baseline을 저장한다**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile && python3 manage.py test drivers.tests.test_driver_api -v 2
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry && python3 manage.py test dispatch.tests.test_dispatch_api -v 2
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry && python3 manage.py test settlementregistry.tests.test_global_settlement_config_api -v 2
```

Expected:
- 현재 API baseline PASS
- 이후 RED/GREEN 비교 기준이 생긴다

## Task 1: Add `external_user_name` To DriverProfile Backend Contract

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile/drivers/models.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile/drivers/serializers.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile/drivers/views.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile/drivers/management/commands/seed_drivers.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile/drivers/migrations/0006_driverprofile_external_user_name.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile/drivers/tests/test_driver_api.py`

- [ ] **Step 1: 배송원 API failing test를 먼저 쓴다**

```python
def test_driver_create_accepts_external_user_name(self):
    response = self.client.post(
        "/",
        {
            "company_id": str(self.company_id),
            "fleet_id": str(self.fleet_id),
            "name": "홍길동",
            "external_user_name": "ZD홍길동",
            "ev_id": "ev-1",
            "phone_number": "010-1111-2222",
            "address": "서울",
        },
        format="json",
    )
    assert response.status_code == 201
    assert response.data["external_user_name"] == "ZD홍길동"
```

- [ ] **Step 2: driver list filter test를 추가한다**

```python
def test_driver_list_filters_by_external_user_name(self):
    response = self.client.get("/", {"external_user_name": "ZD홍길동"})
    assert response.status_code == 200
    assert response.data[0]["external_user_name"] == "ZD홍길동"
```

- [ ] **Step 3: RED 확인**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile && python3 manage.py test drivers.tests.test_driver_api -v 2
```

Expected:
- FAIL with missing field or filter

- [ ] **Step 4: 최소 구현으로 모델/serializer/view를 확장한다**

```python
class DriverProfile(models.Model):
    external_user_name = models.CharField(max_length=120, blank=True, default="")
```

```python
class DriverProfileSerializer(serializers.ModelSerializer):
    class Meta:
        fields = (..., "external_user_name", ...)
```

```python
if external_user_name := request.query_params.get("external_user_name"):
    queryset = queryset.filter(external_user_name=external_user_name)
```

- [ ] **Step 5: GREEN 확인**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile && python3 manage.py test drivers.tests.test_driver_api -v 2
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile
git add drivers/models.py drivers/serializers.py drivers/views.py drivers/management/commands/seed_drivers.py drivers/migrations/0006_driverprofile_external_user_name.py drivers/tests/test_driver_api.py
git commit -m "feat: add driver external user name"
```

## Task 2: Surface `external_user_name` In Driver Console Screens

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/types.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/api/drivers.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DriverFormPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DriverDetailPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DriversPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DriverFormPage.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DriverDetailPage.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DriversPage.test.tsx`

- [ ] **Step 1: 폼과 상세 화면의 failing test를 먼저 쓴다**

```tsx
it("renders external user name field in driver form", async () => {
  render(<DriverFormPage client={client} mode="create" />);
  expect(await screen.findByLabelText("원청 앱 사용자명")).toBeInTheDocument();
});
```

```tsx
it("shows external user name in driver detail", async () => {
  expect(await screen.findByText("ZD홍길동")).toBeInTheDocument();
});
```

- [ ] **Step 2: RED 확인**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console && npm run test -- DriverFormPage.test.tsx DriverDetailPage.test.tsx DriversPage.test.tsx
```

Expected:
- FAIL because field is not in type/form/detail/list

- [ ] **Step 3: 타입과 화면을 최소 수정한다**

```ts
export type DriverProfile = {
  ...
  external_user_name: string;
}
```

```tsx
<label className="field">
  <span>원청 앱 사용자명</span>
  <input value={form.external_user_name} onChange={...} />
</label>
```

- [ ] **Step 4: GREEN 확인**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console && npm run test -- DriverFormPage.test.tsx DriverDetailPage.test.tsx DriversPage.test.tsx
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/types.ts src/api/drivers.ts src/pages/DriverFormPage.tsx src/pages/DriverDetailPage.tsx src/pages/DriversPage.tsx src/pages/DriverFormPage.test.tsx src/pages/DriverDetailPage.test.tsx src/pages/DriversPage.test.tsx
git commit -m "feat: expose driver external user name in console"
```

## Task 3: Add Company/Fleet Pricing Table To Settlement Registry

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/settlementregistry/models.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/settlementregistry/serializers.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/settlementregistry/views.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/settlementregistry/urls.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/settlementregistry/management/commands/seed_settlement_registry.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/settlementregistry/migrations/0003_companyfleetpricingtable.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/settlementregistry/tests/test_company_fleet_pricing_api.py`

- [ ] **Step 1: 단가표 API failing test를 쓴다**

```python
def test_can_create_company_fleet_pricing_table(self):
    response = self.client.post(
        "/pricing-tables/",
        {
            "company_id": str(self.company_id),
            "fleet_id": str(self.fleet_id),
            "box_sale_unit_price": "1000.00",
            "box_purchase_unit_price": "800.00",
            "overtime_fee": "20000.00",
        },
        format="json",
    )
    assert response.status_code == 201
```

- [ ] **Step 2: RED 확인**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry && python3 manage.py test settlementregistry.tests.test_company_fleet_pricing_api -v 2
```

Expected:
- FAIL with missing model/route

- [ ] **Step 3: 최소 구현으로 단가표 모델과 CRUD API를 만든다**

```python
class CompanyFleetPricingTable(models.Model):
    company_id = models.UUIDField()
    fleet_id = models.UUIDField()
    box_sale_unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    box_purchase_unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    overtime_fee = models.DecimalField(max_digits=12, decimal_places=2)
```

- [ ] **Step 4: GREEN 확인**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry && python3 manage.py test settlementregistry.tests.test_company_fleet_pricing_api settlementregistry.tests.test_global_settlement_config_api -v 2
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry
git add settlementregistry/models.py settlementregistry/serializers.py settlementregistry/views.py settlementregistry/urls.py settlementregistry/management/commands/seed_settlement_registry.py settlementregistry/migrations/0003_companyfleetpricingtable.py settlementregistry/tests/test_company_fleet_pricing_api.py
git commit -m "feat: add company fleet settlement pricing table"
```

## Task 4: Add Dispatch Upload Batch And Matching API

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/models.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/serializers.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/views.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/urls.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/services/source_clients.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/management/commands/seed_dispatch.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/migrations/0005_dispatchuploadbatch_dispatchuploadrow.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/services/dispatch_upload_service.py`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/dispatch/tests/test_dispatch_upload_api.py`

- [ ] **Step 1: upload preview API failing test를 쓴다**

```python
def test_preview_upload_creates_rows_with_driver_matches(self):
    response = self.client.post(
        "/upload-batches/preview/",
        {
            "dispatch_plan_id": str(self.dispatch_plan_id),
            "rows": [
                {
                    "delivery_manager_name": "ZD홍길동",
                    "small_region_text": "10H2",
                    "detailed_region_text": "10H2-가",
                    "box_count": 133,
                    "household_count": 90,
                }
            ],
        },
        format="json",
    )
    assert response.status_code == 200
    assert response.data["rows"][0]["matched_driver_id"] == str(self.driver_id)
```

- [ ] **Step 2: RED 확인**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry && python3 manage.py test dispatch.tests.test_dispatch_upload_api -v 2
```

Expected:
- FAIL with missing endpoint/model/service

- [ ] **Step 3: 최소 업로드 모델과 matching service를 구현한다**

```python
class DispatchUploadBatch(models.Model):
    dispatch_plan = models.ForeignKey(DispatchPlan, ...)
    source_filename = models.CharField(max_length=255)
    upload_status = models.CharField(max_length=32, default="draft")
```

```python
class DispatchUploadRow(models.Model):
    upload_batch = models.ForeignKey(DispatchUploadBatch, ...)
    external_user_name = models.CharField(max_length=120)
    small_region_text = models.CharField(max_length=255, blank=True, default="")
    detailed_region_text = models.CharField(max_length=255, blank=True, default="")
    box_count = models.PositiveIntegerField(default=0)
    household_count = models.PositiveIntegerField(default=0)
    matched_driver_id = models.UUIDField(null=True, blank=True)
```

```python
matched_driver = drivers_by_external_user_name.get(row["delivery_manager_name"])
```

- [ ] **Step 4: apply/confirm API failing test를 추가한다**

```python
def test_confirm_upload_marks_batch_confirmed(self):
    response = self.client.post(f"/upload-batches/{batch_id}/confirm/")
    assert response.status_code == 200
    assert response.data["upload_status"] == "confirmed"
```

- [ ] **Step 5: confirm endpoint를 구현하고 테스트를 green으로 만든다**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry && python3 manage.py test dispatch.tests.test_dispatch_upload_api dispatch.tests.test_dispatch_api -v 2
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry
git add dispatch/models.py dispatch/serializers.py dispatch/views.py dispatch/urls.py dispatch/services/source_clients.py dispatch/management/commands/seed_dispatch.py dispatch/migrations/0005_dispatchuploadbatch_dispatchuploadrow.py dispatch/services/dispatch_upload_service.py dispatch/tests/test_dispatch_upload_api.py
git commit -m "feat: add dispatch upload batch and matching flow"
```

## Task 5: Add Dispatch Upload Wizard To The Console

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/types.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/api/dispatchRegistry.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DispatchBoardDetailPage.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/DispatchUploadWizard.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/DispatchUploadWizard.test.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DispatchBoardDetailPage.test.tsx`
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/e2e/dispatch-upload.spec.ts`

- [ ] **Step 1: wizard component failing test를 쓴다**

```tsx
it("shows upload preview rows with driver match and box count", async () => {
  render(<DispatchUploadWizard ... />);
  await user.upload(screen.getByLabelText("배차표 업로드"), file);
  expect(await screen.findByText("ZD홍길동")).toBeInTheDocument();
  expect(screen.getByText("133")).toBeInTheDocument();
});
```

- [ ] **Step 2: RED 확인**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console && npm run test -- DispatchBoardDetailPage.test.tsx src/components/DispatchUploadWizard.test.tsx
```

Expected:
- FAIL because wizard and API client are missing

- [ ] **Step 3: 최소 wizard UI를 구현한다**

```tsx
<section className="panel">
  <h2>배차표 업로드</h2>
  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
  <table>...</table>
</section>
```

- [ ] **Step 4: DispatchBoardDetailPage에 wizard를 연결한다**
- 업로드 preview
- 매칭 실패 row 표시
- 용차/특근 보정 panel과 같은 문맥에서 confirm 액션

- [ ] **Step 5: unit tests GREEN 확인**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console && npm run test -- DispatchBoardDetailPage.test.tsx src/components/DispatchUploadWizard.test.tsx
```

Expected:
- PASS

- [ ] **Step 6: e2e spec를 추가하고 로컬 브라우저 기준으로 확인한다**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console && PLAYWRIGHT_BASE_URL=http://localhost:5174 npm run test:e2e -- e2e/dispatch-upload.spec.ts
```

Expected:
- PASS
- 업로드 preview, 인력 매칭, confirm 진입이 검증된다

- [ ] **Step 7: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/types.ts src/api/dispatchRegistry.ts src/pages/DispatchBoardDetailPage.tsx src/components/DispatchUploadWizard.tsx src/components/DispatchUploadWizard.test.tsx src/pages/DispatchBoardDetailPage.test.tsx e2e/dispatch-upload.spec.ts
git commit -m "feat: add dispatch upload wizard"
```

## Task 6: Generate Settlement Snapshots From Confirmed Dispatch Upload

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/deliveryrecords/views.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/deliveryrecords/urls.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/deliveryrecords/tests/test_delivery_record_api.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/SettlementInputsPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/SettlementInputsPage.test.tsx`

- [ ] **Step 1: bootstrap endpoint failing test를 쓴다**

```python
def test_bootstrap_from_dispatch_creates_daily_snapshots(self):
    response = self.client.post(
        "/daily-snapshots/bootstrap-from-dispatch/",
        {
            "company_id": str(self.company_id),
            "fleet_id": str(self.fleet_id),
            "service_date": "2026-04-09",
        },
        format="json",
    )
    assert response.status_code == 200
    assert response.data["created_count"] == 1
```

- [ ] **Step 2: RED 확인**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record && python3 manage.py test deliveryrecords.tests.test_delivery_record_api -v 2
```

Expected:
- FAIL with missing route

- [ ] **Step 3: bootstrap endpoint를 최소 구현한다**
- confirmed dispatch upload rows를 읽는다
- `box_count`를 `delivery_count`로 매핑한다
- `household_count`는 snapshot payload metadata로만 남기고 계산에는 직접 쓰지 않는다

```python
DailyDeliveryInputSnapshot.objects.create(
    company_id=row.company_id,
    fleet_id=row.fleet_id,
    driver_id=row.matched_driver_id,
    service_date=row.dispatch_date,
    delivery_count=row.box_count,
    total_distance_km=Decimal("0.00"),
    total_base_amount=Decimal("0.00"),
    source_record_count=1,
    status=DailyDeliveryInputSnapshot.Status.DRAFT,
)
```

- [ ] **Step 4: SettlementInputsPage failing test를 쓴다**

```tsx
it("renders upload-first review language ahead of manual correction", async () => {
  render(<SettlementInputsPage client={client} />);
  expect(await screen.findByText("업로드 결과로 만들어진 정산 대상 snapshot")).toBeInTheDocument();
});
```

- [ ] **Step 5: inputs review copy와 목록을 구현하고 GREEN 확인**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record && python3 manage.py test deliveryrecords.tests.test_delivery_record_api -v 2
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console && npm run test -- SettlementInputsPage.test.tsx DispatchBoardDetailPage.test.tsx
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record
git add deliveryrecords/views.py deliveryrecords/urls.py deliveryrecords/tests/test_delivery_record_api.py
git commit -m "feat: bootstrap delivery snapshots from dispatch upload"

cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/pages/SettlementInputsPage.tsx src/pages/SettlementInputsPage.test.tsx src/pages/DispatchBoardDetailPage.test.tsx
git commit -m "feat: make settlement inputs upload-first review"
```

## Task 7: Apply Company/Fleet Pricing During Settlement Execution

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll/settlements/views.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll/settlements/tests/test_settlement_api.py`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/api/settlementRegistry.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/SettlementCriteriaPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/SettlementCriteriaPage.test.tsx`

- [ ] **Step 1: settlement run failing test를 쓴다**

```python
def test_settlement_run_reads_company_fleet_pricing_table(self):
    response = self.client.post("/runs/", self._run_payload(), format="json")
    assert response.status_code == 201
    assert Decimal(response.data["items"][0]["amount"]) == Decimal("106400.00")
```

- [ ] **Step 2: RED 확인**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll && python3 manage.py test settlements.tests.test_settlement_api -v 2
```

Expected:
- FAIL because pricing table is not read in calculation

- [ ] **Step 3: payroll에서 pricing table을 읽어 계산식에 적용한다**
- 박스당 지급단가 * snapshot.delivery_count
- 특근비는 dispatch day exception/system kind `overtime`에만 추가
- 세금/보험은 existing global config path를 계속 사용

- [ ] **Step 4: criteria page failing test를 쓴다**

```tsx
it("renders company-fleet pricing editor separately from global config", async () => {
  expect(await screen.findByRole("heading", { name: "회사·플릿 단가표" })).toBeInTheDocument();
});
```

- [ ] **Step 5: criteria page에 단가표 editor를 추가하고 GREEN 확인**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll && python3 manage.py test settlements.tests.test_settlement_api -v 2
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console && npm run test -- SettlementCriteriaPage.test.tsx SettlementRunsPage.test.tsx SettlementResultsPage.test.tsx
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll
git add settlements/views.py settlements/tests/test_settlement_api.py
git commit -m "feat: apply company fleet pricing in settlement runs"

cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/api/settlementRegistry.ts src/pages/SettlementCriteriaPage.tsx src/pages/SettlementCriteriaPage.test.tsx
git commit -m "feat: add pricing editor to settlement criteria"
```

## Task 8: Final Verification And Contract Sync

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/contracts/18-single-web-console-screen-map.md`
- Read for verification: spec + modified repos

- [ ] **Step 1: screen map 문서를 현재 IA에 맞게 맞춘다**
- 배차에 업로드/검토/확정 흐름이 생겼다고 적는다.
- 정산 입력은 수기 입력 중심이 아니라 snapshot review 중심이라고 적는다.

- [ ] **Step 2: repo별 focused test를 모두 돌린다**

Run:

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile && python3 manage.py test drivers.tests.test_driver_api -v 2
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry && python3 manage.py test settlementregistry.tests.test_global_settlement_config_api settlementregistry.tests.test_company_fleet_pricing_api -v 2
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry && python3 manage.py test dispatch.tests.test_dispatch_api dispatch.tests.test_dispatch_upload_api -v 2
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record && python3 manage.py test deliveryrecords.tests.test_delivery_record_api -v 2
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll && python3 manage.py test settlements.tests.test_settlement_api -v 2
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console && npm run test -- DriverFormPage.test.tsx DriverDetailPage.test.tsx DriversPage.test.tsx DispatchBoardDetailPage.test.tsx SettlementCriteriaPage.test.tsx SettlementInputsPage.test.tsx SettlementRunsPage.test.tsx SettlementResultsPage.test.tsx
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console && PLAYWRIGHT_BASE_URL=http://localhost:5174 npm run test:e2e -- e2e/dispatch-upload.spec.ts e2e/settlement-navigation.spec.ts
```

Expected:
- PASS
- docker rebuild 없이 `5174` 기준 브라우저 검증 가능

- [ ] **Step 3: 최종 수동 확인**
- `http://localhost:5174`
- 배차 상세에서 업로드 preview, 당일 인력 매칭, 용차/특근 보정 확인
- 정산 기준에서 전역 설정과 회사·플릿별 단가표가 분리되어 보이는지 확인
- 정산 입력에서 upload-first review copy가 보이는지 확인

- [ ] **Step 4: Final docs commit**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform add docs/contracts/18-single-web-console-screen-map.md docs/superpowers/plans/2026-04-09-dispatch-upload-settlement-phase1-implementation-plan.md
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform commit -m "docs: sync dispatch upload settlement implementation plan"
```
