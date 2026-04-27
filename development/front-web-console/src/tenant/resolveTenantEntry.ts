export type TenantEntry = {
  type: 'company';
  tenantCode: string;
  host: string;
  source: 'host' | 'path';
  basePath: string;
};

const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'admin']);
const RESERVED_PATH_SEGMENTS = new Set([
  '__dev__',
  'account',
  'accounts',
  'admin',
  'announcements',
  'block',
  'companies',
  'company',
  'dispatch',
  'drivers',
  'login',
  'me',
  'notifications',
  'organization',
  'personnel-documents',
  'regions',
  'settlement',
  'settlements',
  'support',
  'vehicle',
  'vehicle-assignments',
  'vehicles',
]);

function resolveTenantPathEntry(normalizedHost: string, pathname: string | undefined): TenantEntry | null {
  if (normalizedHost !== 'ev-dashboard.com') {
    return null;
  }

  const normalizedPathname = pathname?.trim() || '/';
  const [firstSegment] = normalizedPathname.replace(/^\/+/, '').split('/');
  if (!firstSegment || RESERVED_PATH_SEGMENTS.has(firstSegment)) {
    return null;
  }

  return {
    type: 'company',
    tenantCode: firstSegment,
    host: normalizedHost,
    source: 'path',
    basePath: `/${firstSegment}`,
  };
}

export function resolveTenantEntry(hostname: string | undefined, pathname?: string): TenantEntry | null {
  const normalizedHost = hostname?.trim().toLowerCase() ?? '';
  if (!normalizedHost || normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') {
    return null;
  }

  const pathEntry = resolveTenantPathEntry(normalizedHost, pathname);
  if (pathEntry) {
    return pathEntry;
  }

  const hostParts = normalizedHost.split('.');
  if (hostParts.length !== 3 || hostParts.some((part) => part.length === 0)) {
    return null;
  }

  const apexDomain = hostParts.slice(-2).join('.');
  if (apexDomain !== 'ev-dashboard.com') {
    return null;
  }

  const subdomain = hostParts[0];
  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) {
    return null;
  }

  return {
    type: 'company',
    tenantCode: subdomain,
    host: normalizedHost,
    source: 'host',
    basePath: '',
  };
}
