import type { ReactNode } from 'react';

type PageLayoutProps = {
  actions?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  fillContent?: boolean;
  filters?: ReactNode;
  layoutClassName?: string;
  subtitle?: ReactNode;
  tabs?: ReactNode;
  template?: 'default' | 'workbench';
  title?: ReactNode;
};

export function PageLayout({
  actions,
  children,
  contentClassName,
  fillContent = false,
  filters,
  layoutClassName,
  subtitle,
  tabs,
  template = 'default',
  title,
}: PageLayoutProps) {
  const hasHeader = Boolean(title) || Boolean(subtitle);
  const hasToolbar = Boolean(filters) || Boolean(actions);
  const pageLayoutClassName = [
    'page-layout',
    fillContent ? 'page-layout-fill' : null,
    template !== 'default' ? `page-layout-template-${template}` : null,
    layoutClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={pageLayoutClassName}>
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
