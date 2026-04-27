import { Link } from 'react-router-dom';

type SettlementChip = {
  active?: boolean;
  label: string;
};

type SettlementKpiLabel = '수신합계' | '지급합계' | '조정비용' | '수익';

type SettlementProcessStep =
  | {
      kind: 'link';
      label: string;
      to: string;
      status: string;
    }
  | {
      kind: 'status';
      label: string;
      status: string;
    };

type CheonhaSettlementHomePageProps = {
  companyName?: string;
  chips?: ReadonlyArray<SettlementChip>;
  kpis?: Partial<Record<SettlementKpiLabel, number | string | null | undefined>>;
  recentSettlement?: {
    period?: number | string | null;
    status?: string | null;
    note?: string | null;
  } | null;
  steps?: ReadonlyArray<SettlementProcessStep>;
};

const DEFAULT_CHIPS: ReadonlyArray<SettlementChip> = [
  { active: true, label: '이번 달' },
  { label: '미처리' },
  { label: '확정' },
  { label: '전체' },
] as const;

const KPI_LABELS: ReadonlyArray<SettlementKpiLabel> = ['수신합계', '지급합계', '조정비용', '수익'] as const;

const DEFAULT_STEPS: ReadonlyArray<SettlementProcessStep> = [
  {
    kind: 'link',
    label: '배차 업로드',
    status: '바로 이동',
    to: '/settlement/dispatch',
  },
  {
    kind: 'status',
    label: '특근 설정',
    status: '준비 중',
  },
  {
    kind: 'status',
    label: '단가 확인',
    status: '준비 중',
  },
  {
    kind: 'link',
    label: '정산 처리',
    status: '검토 화면',
    to: '/settlement/process',
  },
] as const;

function formatCurrency(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '0원';
  }

  if (typeof value === 'number') {
    return `${value.toLocaleString('ko-KR')}원`;
  }

  return value;
}

function formatText(value: number | string | null | undefined, fallback = '없음') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return typeof value === 'number' ? String(value) : value;
}

export function CheonhaSettlementHomePage({
  chips = DEFAULT_CHIPS,
  companyName = '천하운수',
  kpis,
  recentSettlement,
  steps = DEFAULT_STEPS,
}: CheonhaSettlementHomePageProps) {
  return (
    <div className="cockpit-home-page cockpit-cheonha-settlement-home">
      <section className="cockpit-settlement-home-banner" data-testid="settlement-greeting-banner">
        <div className="cockpit-settlement-home-banner-copy">
          <h1>{companyName} 정산</h1>
          <p className="cockpit-copy">정산 현황</p>
        </div>
      </section>

      <div className="cockpit-settlement-chip-row" aria-label="정산 필터">
        {chips.map((chip, index) => (
          <span
            className={chip.active ? 'cockpit-settlement-chip is-active' : 'cockpit-settlement-chip'}
            key={`${chip.label}-${index}`}
          >
            {chip.label}
          </span>
        ))}
      </div>

      <section
        className="cockpit-workspace-panel cockpit-settlement-process-card"
        data-testid="settlement-process-card"
      >
        <div className="cockpit-shell-panel-header">
          <h2>업무 프로세스</h2>
          <span className="cockpit-shell-status">정산 흐름</span>
        </div>
        <ol className="cockpit-settlement-process-list">
          {steps.map((step) => (
            <li className="cockpit-settlement-process-step" data-testid="settlement-process-step" key={step.label}>
              <div className="cockpit-settlement-process-step-copy">
                <strong data-testid="settlement-process-step-title">{step.label}</strong>
                <span data-testid="settlement-process-step-status">{step.status}</span>
              </div>
              {step.kind === 'link' ? (
                <Link className="button ghost small cockpit-settlement-process-link" to={step.to}>
                  {step.label}
                </Link>
              ) : (
                <span className="cockpit-settlement-process-status" aria-label={`${step.label} 상태`}>
                  {step.status}
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="정산 KPI" className="cockpit-settlement-kpi-strip" data-testid="settlement-kpi-strip">
        {KPI_LABELS.map((label, index) => (
          <article className="cockpit-settlement-kpi-card" key={`${label}-${index}`}>
            <span className="cockpit-settlement-kpi-label" data-testid="settlement-kpi-label">
              {label}
            </span>
            <strong className="cockpit-settlement-kpi-value">{formatCurrency(kpis?.[label])}</strong>
          </article>
        ))}
      </section>

      <section
        className="cockpit-workspace-panel cockpit-settlement-recent-box"
        data-testid="settlement-recent-section"
      >
        <div className="cockpit-shell-panel-header">
          <h2>최근 정산</h2>
          <span className="cockpit-shell-status">{formatText(recentSettlement?.status)}</span>
        </div>
        <p className="cockpit-copy">
          {recentSettlement ? formatText(recentSettlement.note, '정산 내역이 없습니다') : '정산 내역이 없습니다'}
        </p>
        <dl className="cockpit-settlement-recent-grid">
          <div>
            <dt>정산 주기</dt>
            <dd>{formatText(recentSettlement?.period)}</dd>
          </div>
          <div>
            <dt>상태</dt>
            <dd>{formatText(recentSettlement?.status)}</dd>
          </div>
          <div>
            <dt>비고</dt>
            <dd>{formatText(recentSettlement?.note)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
