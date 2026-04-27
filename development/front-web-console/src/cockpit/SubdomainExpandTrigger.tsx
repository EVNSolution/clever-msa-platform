type SubdomainExpandTriggerProps = {
  isExpanded: boolean;
  isActive?: boolean;
  onToggle: () => void;
};

function LauncherIcon({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="cockpit-trigger-icon"
      data-testid="subdomain-trigger-icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      <rect
        height="13"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
        width="15"
        x="4.5"
        y="5.5"
      />
      <path d="M9.5 6.5v11" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      {isExpanded ? (
        <path
          d="m15 9.25-2.75 2.75L15 14.75"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      ) : (
        <path
          d="M13 9.25 15.75 12 13 14.75"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      )}
    </svg>
  );
}

export function SubdomainExpandTrigger({
  isExpanded,
  isActive = false,
  onToggle,
}: SubdomainExpandTriggerProps) {
  const ariaLabel = isExpanded ? '상위 메뉴 닫기' : '상위 메뉴 열기';

  return (
    <button
      aria-controls="subdomain-top-level-menu"
      aria-expanded={isExpanded}
      aria-label={ariaLabel}
      className={isActive ? 'cockpit-expand-trigger cockpit-card-toggle is-active' : 'cockpit-expand-trigger cockpit-card-toggle'}
      onClick={onToggle}
      type="button"
    >
      <LauncherIcon isExpanded={isExpanded} />
    </button>
  );
}
