import { FormEvent, useEffect, useState } from 'react';

import { getErrorMessage, type HttpClient } from '../api/http';
import type { SessionPayload } from '../api/http';
import {
  createSettlementPricingTable,
  getSettlementConfig,
  getSettlementConfigMetadata,
  listSettlementPricingTables,
  updateSettlementConfig,
  updateSettlementPricingTable,
  type CompanyFleetPricingTablePayload,
  type SettlementConfigPayload,
} from '../api/settlementRegistry';
import type {
  CompanyFleetPricingTable,
  SettlementConfig,
  SettlementConfigMetadata,
} from '../types';
import {
  canManageGlobalSettlementCriteria,
  canManageSettlementPricingScope,
} from '../authScopes';
import { useSettlementFlow } from '../components/SettlementFlowContext';

type SettlementCriteriaPageProps = {
  client: HttpClient;
  session: SessionPayload;
};

type CardFeedback = {
  tone: 'success' | 'error';
  message: string;
};

const EMPTY_CONFIG: SettlementConfig = {
  singleton_key: 'global',
  income_tax_rate: '',
  vat_tax_rate: '',
  reported_amount_rate: '',
  national_pension_rate: '',
  health_insurance_rate: '',
  medical_insurance_rate: '',
  employment_insurance_rate: '',
  industrial_accident_insurance_rate: '',
  special_employment_insurance_rate: '',
  special_industrial_accident_insurance_rate: '',
  two_insurance_min_settlement_amount: '',
  meal_allowance: '',
};

type ConfigFieldKey = keyof Omit<SettlementConfig, 'singleton_key'>;
type PricingFieldKey = keyof Omit<CompanyFleetPricingTable, 'pricing_table_id' | 'company_id' | 'fleet_id'>;
type SettlementMetadataSection = SettlementConfigMetadata['sections'][number];

const EMPTY_PRICING_FORM: Record<PricingFieldKey, string> = {
  box_sale_unit_price: '',
  box_purchase_unit_price: '',
  overtime_fee: '',
};

const SECTION_ORDER: Record<string, number> = {
  reported_amount: 1,
  tax_rates: 2,
  thresholds: 3,
  insurance_rates: 4,
};

function getInputStep(decimalPrecision: number | undefined, integerOnly: boolean | undefined) {
  if (integerOnly) {
    return '1';
  }
  if (!decimalPrecision) {
    return undefined;
  }
  return decimalPrecision <= 0 ? undefined : `0.${'0'.repeat(Math.max(decimalPrecision - 1, 0))}1`;
}

function getDisplayFieldValue(config: SettlementConfig, fieldKey: string) {
  return config[fieldKey as ConfigFieldKey] ?? '';
}

function buildSectionPayload(
  section: SettlementMetadataSection,
  config: SettlementConfig,
): Partial<SettlementConfigPayload> {
  return section.fields.reduce((acc: Partial<SettlementConfigPayload>, field) => {
    acc[field.key as keyof SettlementConfigPayload] = getDisplayFieldValue(config, field.key);
    return acc;
  }, {});
}

function mergeSectionResponse(
  currentConfig: SettlementConfig,
  section: SettlementMetadataSection,
  responseConfig: Partial<SettlementConfig>,
) {
  const nextConfig = { ...currentConfig };

  section.fields.forEach((field) => {
    const nextValue = responseConfig[field.key as ConfigFieldKey];
    if (nextValue !== undefined) {
      nextConfig[field.key as ConfigFieldKey] = nextValue;
    }
  });

  return nextConfig;
}

export function SettlementCriteriaPage({ client, session }: SettlementCriteriaPageProps) {
  const {
    companies,
    availableFleets,
    selectedCompanyId,
    selectedFleetId,
    showCompanySelector,
    showFleetSelector,
    isLoading: isContextLoading,
    errorMessage: contextErrorMessage,
    setSelectedCompanyId,
    setSelectedFleetId,
  } = useSettlementFlow();
  const [metadata, setMetadata] = useState<SettlementConfigMetadata | null>(null);
  const [config, setConfig] = useState<SettlementConfig>(EMPTY_CONFIG);
  const [pricingTables, setPricingTables] = useState<CompanyFleetPricingTable[]>([]);
  const [pricingForm, setPricingForm] = useState<Record<PricingFieldKey, string>>(EMPTY_PRICING_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [sectionSavingKey, setSectionSavingKey] = useState<string | null>(null);
  const [sectionFeedback, setSectionFeedback] = useState<Record<string, CardFeedback | undefined>>({});
  const [isPricingSaving, setIsPricingSaving] = useState(false);
  const [pricingFeedback, setPricingFeedback] = useState<CardFeedback | null>(null);
  const canManagePricing = canManageSettlementPricingScope(session);
  const canManageGlobalCriteria = canManageGlobalSettlementCriteria(session);

  useEffect(() => {
    let isCanceled = false;

    async function hydrate() {
      setIsLoading(true);
      setPageError(null);
      try {
        const [metadataResponse, configResponse, pricingTablesResponse] = await Promise.all([
          canManageGlobalCriteria ? getSettlementConfigMetadata(client) : Promise.resolve(null),
          canManageGlobalCriteria ? getSettlementConfig(client) : Promise.resolve(EMPTY_CONFIG),
          canManagePricing ? listSettlementPricingTables(client) : Promise.resolve([]),
        ]);

        if (isCanceled) {
          return;
        }

        setMetadata(metadataResponse);
        setConfig({
          ...EMPTY_CONFIG,
          ...configResponse,
        });
        setPricingTables(Array.isArray(pricingTablesResponse) ? pricingTablesResponse : []);
      } catch (error) {
        if (!isCanceled) {
          setPageError(getErrorMessage(error));
        }
      } finally {
        if (!isCanceled) {
          setIsLoading(false);
        }
      }
    }

    void hydrate();
    return () => {
      isCanceled = true;
    };
  }, [canManageGlobalCriteria, canManagePricing, client]);

  const safeCompanies = Array.isArray(companies) ? companies : [];
  const safePricingTables = Array.isArray(pricingTables) ? pricingTables : [];
  const orderedSections = metadata
    ? [...metadata.sections].sort(
        (left, right) => (SECTION_ORDER[left.key] ?? Number.MAX_SAFE_INTEGER) - (SECTION_ORDER[right.key] ?? Number.MAX_SAFE_INTEGER),
      )
    : [];
  const visibleFleets = availableFleets;

  const selectedPricingTable =
    safePricingTables.find(
      (pricingTable) =>
        pricingTable.company_id === selectedCompanyId && pricingTable.fleet_id === selectedFleetId,
    ) ?? null;
  const canSubmitPricing =
    !isLoading &&
    !isContextLoading &&
    Boolean(selectedCompanyId) &&
    Boolean(selectedFleetId);
  const hasPricingContext =
    Boolean(selectedCompanyId) &&
    Boolean(selectedFleetId) &&
    (!showCompanySelector || safeCompanies.length > 0) &&
    (!showFleetSelector || visibleFleets.length > 0);

  useEffect(() => {
    if (selectedPricingTable) {
      setPricingForm({
        box_sale_unit_price: selectedPricingTable.box_sale_unit_price,
        box_purchase_unit_price: selectedPricingTable.box_purchase_unit_price,
        overtime_fee: selectedPricingTable.overtime_fee,
      });
      return;
    }

    setPricingForm({ ...EMPTY_PRICING_FORM });
  }, [selectedPricingTable]);

  function handleFieldChange(fieldKey: ConfigFieldKey, nextValue: string) {
    setConfig((current) => ({
      ...current,
      [fieldKey]: nextValue,
    }));
    setSectionFeedback((current) => {
      if (!metadata) {
        return current;
      }
      const section = metadata.sections.find((candidate) =>
        candidate.fields.some((field) => field.key === fieldKey),
      );
      if (!section || !current[section.key]) {
        return current;
      }
      return {
        ...current,
        [section.key]: undefined,
      };
    });
  }

  function handlePricingFieldChange(fieldKey: PricingFieldKey, nextValue: string) {
    setPricingForm((current) => ({
      ...current,
      [fieldKey]: nextValue,
    }));
    setPricingFeedback(null);
  }

  async function handleSectionSubmit(event: FormEvent<HTMLFormElement>, section: SettlementMetadataSection) {
    event.preventDefault();
    if (sectionSavingKey) {
      return;
    }
    setSectionSavingKey(section.key);
    setSectionFeedback((current) => ({
      ...current,
      [section.key]: undefined,
    }));

    try {
      const payload = buildSectionPayload(section, config);
      const nextConfig = await updateSettlementConfig(client, payload);
      setConfig((current) => mergeSectionResponse(current, section, nextConfig));
      setSectionFeedback((current) => ({
        ...current,
        [section.key]: {
          tone: 'success',
          message: `${section.title}을 저장했습니다.`,
        },
      }));
    } catch (error) {
      setSectionFeedback((current) => ({
        ...current,
        [section.key]: {
          tone: 'error',
          message: getErrorMessage(error),
        },
      }));
    } finally {
      setSectionSavingKey((current) => (current === section.key ? null : current));
    }
  }

  async function handlePricingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitPricing || isPricingSaving) {
      return;
    }

    setIsPricingSaving(true);
    setPricingFeedback(null);

    const payload: CompanyFleetPricingTablePayload = {
      company_id: selectedCompanyId,
      fleet_id: selectedFleetId,
      box_sale_unit_price: pricingForm.box_sale_unit_price,
      box_purchase_unit_price: pricingForm.box_purchase_unit_price,
      overtime_fee: pricingForm.overtime_fee,
    };

    try {
      const nextPricingTable = selectedPricingTable
        ? await updateSettlementPricingTable(client, selectedPricingTable.pricing_table_id, payload)
        : await createSettlementPricingTable(client, payload);

      setPricingTables((current) => {
        const nextTables = current.filter(
          (pricingTable) => pricingTable.pricing_table_id !== nextPricingTable.pricing_table_id,
        );
        nextTables.push(nextPricingTable);
        return nextTables;
      });
      setPricingFeedback({
        tone: 'success',
        message: '단가표를 저장했습니다.',
      });
    } catch (error) {
      setPricingFeedback({
        tone: 'error',
        message: getErrorMessage(error),
      });
    } finally {
      setIsPricingSaving(false);
    }
  }

  return (
    <div className="settlement-criteria-page">
      {pageError ? <div className="error-banner">{pageError}</div> : null}
      {pageError || contextErrorMessage ? (
        <div className="error-banner">{pageError ?? contextErrorMessage}</div>
      ) : null}

      {canManageGlobalCriteria && !metadata ? (
        <section className="panel settlement-criteria-loading-card">
          <p className="empty-state">
            {isLoading ? '정산 기준 설정을 불러오는 중입니다...' : '정산 기준 설정 정보를 가져오지 못했습니다.'}
          </p>
        </section>
      ) : (
        <div className="settlement-criteria-workboard">
          {canManagePricing ? (
            <form className="settlement-criteria-card settlement-criteria-pricing-card" onSubmit={handlePricingSubmit}>
              <div className="settlement-criteria-card-header">
                <h3>회사·플릿 단가표</h3>
              </div>
              <div className="settlement-criteria-card-body">
                {isLoading || isContextLoading ? (
                  <p className="empty-state">회사·플릿 단가표를 불러오는 중입니다...</p>
                ) : !hasPricingContext ? (
                  <p className="empty-state">단가표를 연결할 회사 또는 플릿이 없습니다.</p>
                ) : (
                  <>
                    {showCompanySelector ? (
                      <label className="field settlement-criteria-field">
                        <span>회사</span>
                        <select
                          disabled={isPricingSaving}
                          name="company_id"
                          onChange={(event) => setSelectedCompanyId(event.target.value)}
                          value={selectedCompanyId}
                        >
                          {safeCompanies.map((company) => (
                            <option key={company.company_id} value={company.company_id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    {showFleetSelector ? (
                      <label className="field settlement-criteria-field">
                        <span>플릿</span>
                        <select
                          disabled={isPricingSaving}
                          name="fleet_id"
                          onChange={(event) => setSelectedFleetId(event.target.value)}
                          value={selectedFleetId}
                        >
                          {visibleFleets.map((fleet) => (
                            <option key={fleet.fleet_id} value={fleet.fleet_id}>
                              {fleet.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    <label className="field settlement-criteria-field">
                      <span>박스당 수신단가</span>
                      <input
                        disabled={isPricingSaving}
                        inputMode="decimal"
                        name="box_sale_unit_price"
                        onChange={(event) =>
                          handlePricingFieldChange('box_sale_unit_price', event.target.value)
                        }
                        required
                        type="text"
                        value={pricingForm.box_sale_unit_price}
                      />
                    </label>

                    <label className="field settlement-criteria-field">
                      <span>박스당 지급단가</span>
                      <input
                        disabled={isPricingSaving}
                        inputMode="decimal"
                        name="box_purchase_unit_price"
                        onChange={(event) =>
                          handlePricingFieldChange('box_purchase_unit_price', event.target.value)
                        }
                        required
                        type="text"
                        value={pricingForm.box_purchase_unit_price}
                      />
                    </label>

                    <label className="field settlement-criteria-field">
                      <span>특근비</span>
                      <input
                        disabled={isPricingSaving}
                        inputMode="decimal"
                        name="overtime_fee"
                        onChange={(event) => handlePricingFieldChange('overtime_fee', event.target.value)}
                        required
                        type="text"
                        value={pricingForm.overtime_fee}
                      />
                    </label>
                  </>
                )}
              </div>
              <div className="settlement-criteria-card-footer">
                <div className="settlement-criteria-card-message-wrap">
                  {pricingFeedback ? (
                    <p
                      className={`settlement-criteria-card-message settlement-criteria-card-message-${pricingFeedback.tone}`}
                      role={pricingFeedback.tone === 'error' ? 'alert' : 'status'}
                    >
                      {pricingFeedback.message}
                    </p>
                  ) : null}
                </div>
                <button className="button primary" disabled={!canSubmitPricing || isPricingSaving} type="submit">
                  {isPricingSaving ? '저장 중...' : '단가표 저장'}
                </button>
              </div>
            </form>
          ) : null}

          {canManageGlobalCriteria
            ? orderedSections.map((section) => {
            const feedback = sectionFeedback[section.key];
            const isSectionSaving = sectionSavingKey === section.key;
            const isAnySectionSaving = sectionSavingKey !== null;

            return (
              <form
                className="settlement-criteria-card"
                key={section.key}
                onSubmit={(event) => void handleSectionSubmit(event, section)}
              >
                <div className="settlement-criteria-card-header">
                  <h3>{section.title}</h3>
                </div>
                <div className="settlement-criteria-card-body">
                  {section.fields.map((field) => {
                    const step = getInputStep(field.decimal_precision, field.integer_only);
                    const fieldValue = getDisplayFieldValue(config, field.key);

                    return (
                      <label className="field settlement-criteria-field" key={field.key}>
                        <span>{field.label}</span>
                        <div className="settlement-criteria-input-row">
                          <input
                            disabled={isSectionSaving}
                            inputMode="decimal"
                            min={field.min}
                            max={field.max}
                            name={field.key}
                            onChange={(event) =>
                              handleFieldChange(field.key as ConfigFieldKey, event.target.value)
                            }
                            required={field.required}
                            step={step}
                            type="text"
                            value={fieldValue}
                          />
                          <span className="settlement-criteria-unit">{field.unit}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="settlement-criteria-card-footer">
                  <div className="settlement-criteria-card-message-wrap">
                    {feedback ? (
                      <p
                        className={`settlement-criteria-card-message settlement-criteria-card-message-${feedback.tone}`}
                        role={feedback.tone === 'error' ? 'alert' : 'status'}
                      >
                        {feedback.message}
                      </p>
                    ) : null}
                  </div>
                  <button className="button primary" disabled={isAnySectionSaving} type="submit">
                    {isSectionSaving ? '저장 중...' : `${section.title} 저장`}
                  </button>
                </div>
              </form>
            );
          })
            : null}

        </div>
      )}
    </div>
  );
}
