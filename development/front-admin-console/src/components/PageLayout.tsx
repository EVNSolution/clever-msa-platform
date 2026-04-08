import type { ReactNode } from 'react';

type PageLayoutProps = {
  actions?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  filters?: ReactNode;
  subtitle?: ReactNode;
  tabs?: ReactNode;
  title?: ReactNode;
};

export function PageLayout({ actions, children, contentClassName, filters, subtitle, tabs, title }: PageLayoutProps) {
  const hasHeader = Boolean(title) || Boolean(subtitle);
  const hasToolbar = Boolean(filters) || Boolean(actions);

  return (
    <div className="page-layout">
      {hasHeader ? (
        <div className="page-layout-header">
          {title ? <h1 className="page-layout-title">{title}</h1> : null}
          {subtitle ? <p className="page-layout-subtitle">{subtitle}</p> : null}
        </div>
      ) : null}

      {tabs ? <div className="page-layout-tabs">{tabs}</div> : null}

      {hasToolbar ? (
        <div className="page-layout-toolbar">
          <div className="page-layout-filters">{filters}</div>
          <div className="page-layout-actions">{actions}</div>
        </div>
      ) : null}

      <div className={contentClassName ? `page-layout-content ${contentClassName}` : 'page-layout-content'}>{children}</div>
    </div>
  );
}
