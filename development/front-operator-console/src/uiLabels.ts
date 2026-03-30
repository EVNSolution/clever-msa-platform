export function formatRoleLabel(role: string | null | undefined) {
  switch (role) {
    case 'admin':
      return '관리자';
    case 'user':
      return '사용자';
    default:
      return role ?? '-';
  }
}

export function formatProtectedIdentifier(
  value: string | null | undefined,
  { missingLabel = '-' }: { missingLabel?: string } = {},
) {
  if (value == null) {
    return missingLabel;
  }

  const normalized = value.trim();
  if (!normalized) {
    return missingLabel;
  }

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized)) {
    return '비공개';
  }

  if (/^[0-9-]{8,}$/.test(normalized)) {
    return '비공개';
  }

  return normalized;
}

export function formatBooleanLabel(value: boolean | null | undefined) {
  if (value == null) {
    return '-';
  }
  return value ? '예' : '아니오';
}

export function formatVehicleStatusLabel(value: string | null | undefined) {
  switch (value) {
    case 'active':
      return '운영';
    case 'inactive':
      return '중지';
    case 'retired':
      return '퇴역';
    default:
      return value ?? '-';
  }
}

export function formatSettlementStatusLabel(value: string | null | undefined) {
  switch (value) {
    case 'draft':
      return '초안';
    case 'closed':
      return '마감';
    default:
      return value ?? '-';
  }
}

export function formatPayoutStatusLabel(value: string | null | undefined) {
  switch (value) {
    case 'pending':
      return '대기';
    case 'paid':
      return '지급 완료';
    default:
      return value ?? '-';
  }
}

export function formatInstallationStatusLabel(value: string | null | undefined) {
  switch (value) {
    case 'installed':
      return '설치됨';
    case 'removed':
      return '해제됨';
    default:
      return value ?? '-';
  }
}

export function formatLocationStatusLabel(value: string | null | undefined) {
  switch (value) {
    case 'fresh':
      return '정상';
    case 'stale':
      return '지연';
    default:
      return value ?? '-';
  }
}
