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

export function formatBooleanLabel(value: boolean | null | undefined) {
  if (value == null) {
    return '-';
  }
  return value ? '활성' : '비활성';
}

export function formatLifecycleStatusLabel(value: string | null | undefined) {
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

export function formatAccessStatusLabel(value: string | null | undefined) {
  switch (value) {
    case 'active':
      return '활성';
    case 'ended':
      return '종료';
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

export function formatAssignmentStatusLabel(value: string | null | undefined) {
  switch (value) {
    case 'assigned':
      return '배정됨';
    case 'unassigned':
      return '배정 해제';
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
