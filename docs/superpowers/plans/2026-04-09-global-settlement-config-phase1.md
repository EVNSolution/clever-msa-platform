# Global Settlement Config Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace policy/version/assignment-based settlement criteria with a singleton global settlement config, while keeping settlement input and read flows scoped by company and fleet.

**Architecture:** `service-settlement-registry` becomes the owner of a typed `GlobalSettlementConfig` singleton plus metadata endpoints for dynamic UI rendering. `front-web-console` renders the criteria screen entirely from server metadata, and settlement input/read services add `company_id` and `fleet_id` filters so company-fleet context is enforced by APIs instead of local-only filtering.

**Tech Stack:** Django REST Framework, Django ORM, React, TypeScript, Vitest, Vite

---

## File Map

### Root docs

- Create: `docs/superpowers/plans/2026-04-09-global-settlement-config-phase1.md`
- Reference spec: `docs/superpowers/specs/2026-04-09-global-settlement-config-phase1-design.md`

### `development/service-settlement-registry`

- Create: `settlementregistry/settlement_config_metadata.py`
- Create: `settlementregistry/tests/test_global_settlement_config_api.py`
- Modify: `settlementregistry/models.py`
- Modify: `settlementregistry/serializers.py`
- Modify: `settlementregistry/views.py`
- Modify: `settlementregistry/urls.py`
- Modify: `settlementregistry/management/commands/seed_settlement_registry.py`

### `development/front-web-console`

- Create: `src/api/settlementConfig.ts`
- Modify: `src/types.ts`
- Modify: `src/pages/SettlementCriteriaPage.tsx`
- Modify: `src/pages/SettlementCriteriaPage.test.tsx`
- Modify: `src/api/deliveryRecords.ts`
- Modify: `src/api/settlements.ts`
- Modify: `src/api/settlementOps.ts`
- Modify: `src/pages/SettlementInputsPage.tsx`
- Modify: `src/pages/SettlementInputsPage.test.tsx`
- Modify: `src/pages/SettlementRunsPage.tsx`
- Modify: `src/pages/SettlementRunsPage.test.tsx`
- Modify: `src/pages/SettlementResultsPage.tsx`
- Modify: `src/pages/SettlementResultsPage.test.tsx`
- Modify: `src/pages/SettlementOverviewPage.tsx`
- Modify: `src/pages/SettlementOverviewPage.test.tsx`

### `development/service-delivery-record`

- Modify: `deliveryrecords/views.py`
- Modify: `deliveryrecords/tests/test_delivery_record_api.py`

### `development/service-settlement-payroll`

- Modify: `settlements/views.py`
- Modify: `settlements/tests/test_settlement_api.py`

### `development/service-settlement-operations-view`

- Modify: `settlements/views.py`
- Modify: `settlements/services/source_clients.py`
- Modify: `settlements/tests/test_settlement_api.py`
- Modify: `settlements/tests/test_source_clients.py`

## Task 1: Add Global Settlement Config Singleton To Registry

**Files:**
- Create: `development/service-settlement-registry/settlementregistry/settlement_config_metadata.py`
- Create: `development/service-settlement-registry/settlementregistry/tests/test_global_settlement_config_api.py`
- Modify: `development/service-settlement-registry/settlementregistry/models.py`
- Modify: `development/service-settlement-registry/settlementregistry/serializers.py`
- Modify: `development/service-settlement-registry/settlementregistry/views.py`
- Modify: `development/service-settlement-registry/settlementregistry/urls.py`
- Modify: `development/service-settlement-registry/settlementregistry/management/commands/seed_settlement_registry.py`

- [ ] **Step 1: Write the failing registry API tests**

```python
def test_get_settlement_config_metadata_returns_sections(self):
    response = self.client.get("/settlement-config/metadata/")
    assert response.status_code == 200
    assert response.data["sections"][0]["fields"][0]["key"] == "income_tax_rate"

def test_get_settlement_config_returns_singleton_defaults(self):
    response = self.client.get("/settlement-config/")
    assert response.status_code == 200
    assert response.data["income_tax_rate"] == "0.0000"

def test_patch_settlement_config_updates_singleton(self):
    response = self.client.patch(
        "/settlement-config/",
        {"income_tax_rate": "0.0330"},
        format="json",
    )
    assert response.status_code == 200
    assert response.data["income_tax_rate"] == "0.0330"
```

- [ ] **Step 2: Run the new registry tests to verify they fail**

Run: `cd development/service-settlement-registry && python3 manage.py test settlementregistry.tests.test_global_settlement_config_api -v 2`
Expected: FAIL with missing model, missing route, or `404` on `/settlement-config/`

- [ ] **Step 3: Implement the singleton model, metadata module, serializer, views, and seed defaults**

```python
class GlobalSettlementConfig(models.Model):
    singleton_key = models.CharField(max_length=32, unique=True, default="global")
    income_tax_rate = models.DecimalField(max_digits=8, decimal_places=4, default=Decimal("0.0000"))
    vat_tax_rate = models.DecimalField(max_digits=8, decimal_places=4, default=Decimal("0.0000"))

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(singleton_key="global")
        return obj
```

```python
SETTLEMENT_CONFIG_METADATA = {
    "sections": [
        {
            "key": "tax_rates",
            "title": "세율",
            "fields": [
                {"key": "income_tax_rate", "input_type": "decimal", "unit": "%"},
            ],
        },
    ],
}
```

```python
class SettlementConfigView(APIView):
    def get(self, request):
        return Response(GlobalSettlementConfigSerializer(GlobalSettlementConfig.load()).data)

    def patch(self, request):
        serializer = GlobalSettlementConfigSerializer(GlobalSettlementConfig.load(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
```

- [ ] **Step 4: Run the registry tests again**

Run: `cd development/service-settlement-registry && python3 manage.py test settlementregistry.tests.test_global_settlement_config_api settlementregistry.tests.test_health_api -v 2`
Expected: PASS

- [ ] **Step 5: Commit the registry singleton contract**

```bash
cd development/service-settlement-registry
git add settlementregistry/settlement_config_metadata.py settlementregistry/tests/test_global_settlement_config_api.py settlementregistry/models.py settlementregistry/serializers.py settlementregistry/views.py settlementregistry/urls.py settlementregistry/management/commands/seed_settlement_registry.py
git commit -m "feat: add global settlement config singleton"
```

## Task 2: Replace Criteria Screen With Metadata-Driven Global Config UI

**Files:**
- Create: `development/front-web-console/src/api/settlementConfig.ts`
- Modify: `development/front-web-console/src/types.ts`
- Modify: `development/front-web-console/src/pages/SettlementCriteriaPage.tsx`
- Modify: `development/front-web-console/src/pages/SettlementCriteriaPage.test.tsx`

- [ ] **Step 1: Write the failing front-end criteria tests**

```tsx
it("renders metadata-driven sections instead of policy/version tables", async () => {
  apiMocks.getSettlementConfigMetadata.mockResolvedValue({
    sections: [{ key: "tax_rates", title: "세율", fields: [{ key: "income_tax_rate", label: "소득세율" }] }],
  });
  apiMocks.getSettlementConfig.mockResolvedValue({ income_tax_rate: "0.0330" });

  render(<SettlementCriteriaPage client={{ request: vi.fn() }} />);

  await screen.findByRole("heading", { name: "전역 정산 기준" });
  expect(screen.getByText("소득세율")).toBeInTheDocument();
  expect(screen.queryByText("정책 목록")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the criteria page test to verify it fails**

Run: `cd development/front-web-console && npm run test -- SettlementCriteriaPage.test.tsx`
Expected: FAIL because metadata API mocks and UI do not exist

- [ ] **Step 3: Implement the new typed config client, types, and metadata renderer**

```ts
export type SettlementConfigFieldMeta = {
  key: string;
  label: string;
  input_type: "decimal" | "currency";
  unit: string | null;
};

export function getSettlementConfig(client: HttpClient) {
  return client.request<GlobalSettlementConfig>("/settlement-registry/settlement-config/");
}
```

```tsx
{metadata.sections.map((section) => (
  <section key={section.key} className="panel">
    <h2>{section.title}</h2>
    {section.fields.map((field) => (
      <label key={field.key} className="field">
        <span>{field.label}</span>
        <input value={form[field.key] ?? ""} onChange={(event) => updateField(field.key, event.target.value)} />
      </label>
    ))}
  </section>
))}
```

- [ ] **Step 4: Run the criteria page test again**

Run: `cd development/front-web-console && npm run test -- SettlementCriteriaPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the front-end criteria rewrite**

```bash
cd development/front-web-console
git add src/api/settlementConfig.ts src/types.ts src/pages/SettlementCriteriaPage.tsx src/pages/SettlementCriteriaPage.test.tsx
git commit -m "feat: render global settlement config from metadata"
```

## Task 3: Add Company/Fleet Filters To Delivery Record APIs And Inputs Flow

**Files:**
- Modify: `development/service-delivery-record/deliveryrecords/views.py`
- Modify: `development/service-delivery-record/deliveryrecords/tests/test_delivery_record_api.py`
- Modify: `development/front-web-console/src/api/deliveryRecords.ts`
- Modify: `development/front-web-console/src/pages/SettlementInputsPage.tsx`
- Modify: `development/front-web-console/src/pages/SettlementInputsPage.test.tsx`
- Modify: `development/front-web-console/src/pages/SettlementRunsPage.tsx`
- Modify: `development/front-web-console/src/pages/SettlementRunsPage.test.tsx`

- [ ] **Step 1: Write failing delivery-record filter tests**

```python
def test_delivery_record_list_filters_by_company_and_fleet(self):
    response = self.client.get(f"/records/?company_id={self.company_id}&fleet_id={self.fleet_id}")
    assert response.status_code == 200
    assert len(response.data) == 1
```

```tsx
expect(listDeliveryRecords).toHaveBeenCalledWith(
  expect.anything(),
  expect.objectContaining({ company_id: "company-1", fleet_id: "fleet-1" }),
);
```

- [ ] **Step 2: Run the delivery-record and page tests to verify failure**

Run: `cd development/service-delivery-record && python3 manage.py test deliveryrecords.tests.test_delivery_record_api -v 2`
Expected: FAIL because `DeliveryRecordViewSet` ignores `company_id` and `fleet_id`

Run: `cd development/front-web-console && npm run test -- SettlementInputsPage.test.tsx SettlementRunsPage.test.tsx`
Expected: FAIL because list calls are unfiltered

- [ ] **Step 3: Implement filter parsing in the API and wire selected context into the front-end queries**

```python
company_id = self.request.query_params.get("company_id")
fleet_id = self.request.query_params.get("fleet_id")
if company_id:
    queryset = queryset.filter(company_id=_parse_uuid_filter(company_id, field_name="company_id"))
if fleet_id:
    queryset = queryset.filter(fleet_id=_parse_uuid_filter(fleet_id, field_name="fleet_id"))
```

```ts
export function listDeliveryRecords(client: HttpClient, filters?: Partial<Pick<DeliveryRecord, "company_id" | "fleet_id" | "driver_id" | "status">>) {
  const query = new URLSearchParams();
  if (filters?.company_id) query.set("company_id", filters.company_id);
  if (filters?.fleet_id) query.set("fleet_id", filters.fleet_id);
  return client.request<DeliveryRecord[]>(path);
}
```

- [ ] **Step 4: Run the delivery-record and page tests again**

Run: `cd development/service-delivery-record && python3 manage.py test deliveryrecords.tests.test_delivery_record_api -v 2`
Expected: PASS

Run: `cd development/front-web-console && npm run test -- SettlementInputsPage.test.tsx SettlementRunsPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the input filter work**

```bash
cd development/service-delivery-record
git add deliveryrecords/views.py deliveryrecords/tests/test_delivery_record_api.py
git commit -m "feat: filter delivery records by company and fleet"
```

```bash
cd development/front-web-console
git add src/api/deliveryRecords.ts src/pages/SettlementInputsPage.tsx src/pages/SettlementInputsPage.test.tsx src/pages/SettlementRunsPage.tsx src/pages/SettlementRunsPage.test.tsx
git commit -m "feat: request settlement input data by company and fleet"
```

## Task 4: Add Company/Fleet Filters To Settlement Payroll Runs And Results

**Files:**
- Modify: `development/service-settlement-payroll/settlements/views.py`
- Modify: `development/service-settlement-payroll/settlements/tests/test_settlement_api.py`
- Modify: `development/front-web-console/src/api/settlements.ts`
- Modify: `development/front-web-console/src/pages/SettlementRunsPage.tsx`
- Modify: `development/front-web-console/src/pages/SettlementRunsPage.test.tsx`
- Modify: `development/front-web-console/src/pages/SettlementResultsPage.tsx`
- Modify: `development/front-web-console/src/pages/SettlementResultsPage.test.tsx`

- [ ] **Step 1: Write failing payroll filter tests**

```python
def test_settlement_run_list_filters_by_company_and_fleet(self):
    response = self.client.get(f"/runs/?company_id={self.company_id}&fleet_id={self.fleet_id}")
    assert response.status_code == 200
    assert all(item["company_id"] == str(self.company_id) for item in response.data)
```

```tsx
expect(listSettlementRuns).toHaveBeenCalledWith(
  expect.anything(),
  expect.objectContaining({ company_id: "company-1", fleet_id: "fleet-1" }),
);
```

- [ ] **Step 2: Run the payroll and front-end tests to verify failure**

Run: `cd development/service-settlement-payroll && python3 manage.py test settlements.tests.test_settlement_api -v 2`
Expected: FAIL because list endpoints do not filter

Run: `cd development/front-web-console && npm run test -- SettlementRunsPage.test.tsx SettlementResultsPage.test.tsx`
Expected: FAIL because the page still fetches global runs/items

- [ ] **Step 3: Implement queryset filtering in payroll and add filtered list helpers on the front end**

```python
class SettlementRunViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = super().get_queryset()
        company_id = self.request.query_params.get("company_id")
        fleet_id = self.request.query_params.get("fleet_id")
        if company_id:
            queryset = queryset.filter(company_id=UUID(company_id))
        if fleet_id:
            queryset = queryset.filter(fleet_id=UUID(fleet_id))
        return queryset
```

```ts
export function listSettlementRuns(client: HttpClient, filters?: Pick<SettlementRun, "company_id" | "fleet_id">) {
  const query = new URLSearchParams();
  if (filters?.company_id) query.set("company_id", filters.company_id);
  if (filters?.fleet_id) query.set("fleet_id", filters.fleet_id);
  return client.request<SettlementRun[]>(path);
}
```

- [ ] **Step 4: Run the payroll and front-end tests again**

Run: `cd development/service-settlement-payroll && python3 manage.py test settlements.tests.test_settlement_api -v 2`
Expected: PASS

Run: `cd development/front-web-console && npm run test -- SettlementRunsPage.test.tsx SettlementResultsPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the payroll filter work**

```bash
cd development/service-settlement-payroll
git add settlements/views.py settlements/tests/test_settlement_api.py
git commit -m "feat: filter settlement payroll lists by company and fleet"
```

```bash
cd development/front-web-console
git add src/api/settlements.ts src/pages/SettlementRunsPage.tsx src/pages/SettlementRunsPage.test.tsx src/pages/SettlementResultsPage.tsx src/pages/SettlementResultsPage.test.tsx
git commit -m "feat: scope settlement run and result queries by context"
```

## Task 5: Add Company/Fleet Filters To Settlement Ops Read APIs And Overview Page

**Files:**
- Modify: `development/service-settlement-operations-view/settlements/views.py`
- Modify: `development/service-settlement-operations-view/settlements/services/source_clients.py`
- Modify: `development/service-settlement-operations-view/settlements/tests/test_settlement_api.py`
- Modify: `development/service-settlement-operations-view/settlements/tests/test_source_clients.py`
- Modify: `development/front-web-console/src/api/settlementOps.ts`
- Modify: `development/front-web-console/src/pages/SettlementOverviewPage.tsx`
- Modify: `development/front-web-console/src/pages/SettlementOverviewPage.test.tsx`

- [ ] **Step 1: Write failing settlement-ops filter tests**

```python
def test_settlement_ops_run_list_passes_company_and_fleet_filters(self):
    response = self.client.get(f"/runs/?company_id={self.company_id}&fleet_id={self.fleet_id}")
    assert response.status_code == 200
    self.assertEqual(self.source_client.last_params["company_id"], str(self.company_id))
```

```tsx
expect(listSettlementReadRuns).toHaveBeenCalledWith(
  expect.anything(),
  expect.objectContaining({ company_id: "company-1", fleet_id: "fleet-1" }),
);
```

- [ ] **Step 2: Run the settlement-ops and overview tests to verify failure**

Run: `cd development/service-settlement-operations-view && python3 manage.py test settlements.tests.test_settlement_api settlements.tests.test_source_clients -v 2`
Expected: FAIL because read APIs do not forward filters upstream

Run: `cd development/front-web-console && npm run test -- SettlementOverviewPage.test.tsx`
Expected: FAIL because overview still loads global read data

- [ ] **Step 3: Implement filter forwarding in settlement-ops and context-bound overview fetching**

```python
filters = {
    "company_id": request.query_params.get("company_id"),
    "fleet_id": request.query_params.get("fleet_id"),
}
items = SourceClients().list_settlement_items(
    authorization=request.META.get("HTTP_AUTHORIZATION", ""),
    filters={k: v for k, v in filters.items() if v},
)
```

```ts
export function listSettlementReadRuns(client: HttpClient, filters?: Pick<SettlementRun, "company_id" | "fleet_id">) {
  const query = new URLSearchParams();
  if (filters?.company_id) query.set("company_id", filters.company_id);
  if (filters?.fleet_id) query.set("fleet_id", filters.fleet_id);
  return client.request<SettlementRun[]>(path);
}
```

- [ ] **Step 4: Run the settlement-ops and overview tests again**

Run: `cd development/service-settlement-operations-view && python3 manage.py test settlements.tests.test_settlement_api settlements.tests.test_source_clients -v 2`
Expected: PASS

Run: `cd development/front-web-console && npm run test -- SettlementOverviewPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the settlement-ops scope work**

```bash
cd development/service-settlement-operations-view
git add settlements/views.py settlements/services/source_clients.py settlements/tests/test_settlement_api.py settlements/tests/test_source_clients.py
git commit -m "feat: forward settlement ops filters by company and fleet"
```

```bash
cd development/front-web-console
git add src/api/settlementOps.ts src/pages/SettlementOverviewPage.tsx src/pages/SettlementOverviewPage.test.tsx
git commit -m "feat: scope settlement overview by company and fleet"
```

## Task 6: Verify The End-To-End Local Loop Without Docker Rebuilds

**Files:**
- No code changes required
- Verify repos modified in Tasks 1-5

- [ ] **Step 1: Run focused backend test suites**

Run:

```bash
cd development/service-settlement-registry && python3 manage.py test settlementregistry.tests.test_global_settlement_config_api settlementregistry.tests.test_health_api -v 2
cd development/service-delivery-record && python3 manage.py test deliveryrecords.tests.test_delivery_record_api -v 2
cd development/service-settlement-payroll && python3 manage.py test settlements.tests.test_settlement_api -v 2
cd development/service-settlement-operations-view && python3 manage.py test settlements.tests.test_settlement_api settlements.tests.test_source_clients -v 2
```

Expected: all PASS

- [ ] **Step 2: Run focused front-end tests**

Run:

```bash
cd development/front-web-console && npm run test -- SettlementCriteriaPage.test.tsx SettlementInputsPage.test.tsx SettlementRunsPage.test.tsx SettlementResultsPage.test.tsx SettlementOverviewPage.test.tsx
```

Expected: PASS

- [ ] **Step 3: Start the allowed local loop**

Run:

```bash
cd development/integration-local-stack && docker compose -f docker-compose.account-driver-settlement.yml up -d gateway
cd development/front-web-console && npm run dev
```

Expected:

- gateway stays up
- front dev server binds to `http://localhost:5174`
- no Docker rebuild for front-end edits

- [ ] **Step 4: Perform browser verification**

Run:

```text
Open http://localhost:5174 for fast UI verification
Open http://localhost:8080 only for final integrated gateway verification
```

Expected:

- `정산 기준` shows metadata-driven global config sections
- `정산 입력`, `정산 실행`, `정산 결과`, `정산 조회` only show data for the selected company/fleet context
- no policy/version/assignment UI remains on the criteria screen

- [ ] **Step 5: Final commits per repo**

```bash
cd development/service-settlement-registry && git status
cd development/service-delivery-record && git status
cd development/service-settlement-payroll && git status
cd development/service-settlement-operations-view && git status
cd development/front-web-console && git status
```

Expected: only intentional changes remain
