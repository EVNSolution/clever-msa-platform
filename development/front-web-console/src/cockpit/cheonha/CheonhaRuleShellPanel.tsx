type CheonhaRuleShellPanelProps = {
  description: string;
  note?: string;
  summaryCards?: ReadonlyArray<{
    rows: ReadonlyArray<{
      label: string;
      value: number | string | null | undefined;
    }>;
    status: string;
    title: string;
  }>;
  title: string;
};

const DEFAULT_NOTE = '읽기 전용 요약';
const DISABLED_RULE_SECTIONS = [
  { fieldLabel: '회사 규칙', title: '회사', value: '회사 기준 정산 규칙 편집은 아직 비활성입니다.' },
  { fieldLabel: '플릿 규칙', title: '플릿', value: '플릿별 예외 규칙 편집은 아직 비활성입니다.' },
  { fieldLabel: '배송원 규칙', title: '배송원', value: '배송원 단위 override 편집은 아직 비활성입니다.' },
] as const;

function formatSummaryValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '없음';
  }

  return typeof value === 'number' ? String(value) : value;
}

export function CheonhaRuleShellPanel({
  description,
  note = DEFAULT_NOTE,
  summaryCards,
  title,
}: CheonhaRuleShellPanelProps) {
  return (
    <section className="cockpit-shell-panel" data-testid="settlement-workspace-panel">
      <div className="cockpit-shell-panel-header">
        <h2>{title}</h2>
        <span className="cockpit-shell-status">준비 중</span>
      </div>
      <p>{description}</p>
      <p className="cockpit-shell-panel-note">{note}</p>
      {summaryCards ? (
        <div className="cockpit-shell-summary-grid" aria-label={`${title} 요약`}>
          {summaryCards.map((card) => (
            <section className="cockpit-shell-summary-card" key={card.title}>
              <div className="cockpit-shell-summary-header">
                <h3>{card.title}</h3>
                <span className="cockpit-shell-status">{card.status}</span>
              </div>
              <dl className="cockpit-shell-summary-list">
                {card.rows.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{formatSummaryValue(row.value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      ) : (
        <div className="cockpit-shell-preview-grid" aria-label="비활성 규칙 섹션">
          {DISABLED_RULE_SECTIONS.map((section) => (
            <section className="cockpit-shell-preview-card" key={section.title}>
              <div className="cockpit-shell-preview-header">
                <h3>{section.title}</h3>
                <span className="cockpit-shell-status">비활성</span>
              </div>
              <label className="field cockpit-shell-preview-field">
                <span>{section.fieldLabel}</span>
                <input disabled readOnly type="text" value={section.value} />
              </label>
              <p className="cockpit-shell-panel-note">저장 액션 없음</p>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
