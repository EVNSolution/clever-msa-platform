import { NavLink } from 'react-router-dom';

type SubdomainBrandCardProps = {
  companyName: string;
};

export function SubdomainBrandCard({ companyName }: SubdomainBrandCardProps) {
  return (
    <NavLink className="cockpit-brand-card cockpit-brand-link" to="/">
      <span className="cockpit-brand-header-row" data-testid="subdomain-brand-header-row">
        <span className="cockpit-brand-kicker">CLEVER</span>
        <span className="cockpit-brand-caption">EV&Solution</span>
      </span>
      <span className="cockpit-brand-company">{companyName}</span>
    </NavLink>
  );
}
