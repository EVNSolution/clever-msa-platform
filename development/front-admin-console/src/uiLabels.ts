export function formatRoleLabel(role: string | null | undefined) {
  switch (role) {
    case 'system_admin':
      return '시스템 관리자';
    case 'company_super_admin':
      return '회사 전체 관리자';
    case 'vehicle_manager':
      return '차량 관리자';
    case 'settlement_manager':
      return '정산 관리자';
    case 'fleet_manager':
      return '플릿 관리자';
    case 'manager':
      return '관리자';
    case 'driver':
      return '배송원';
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
  return value ? '활성' : '비활성';
}

export function formatAccountStatusLabel(value: string | null | undefined) {
  switch (value) {
    case 'active':
      return '활성';
    case 'archived':
      return '보관';
    default:
      return value ?? '-';
  }
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
    case 'calculated':
      return '계산 완료';
    case 'reviewed':
      return '검토 완료';
    case 'approved':
      return '승인됨';
    case 'paid':
      return '지급됨';
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

export function formatPolicyStatusLabel(value: string | null | undefined) {
  switch (value) {
    case 'active':
      return '활성';
    case 'inactive':
      return '비활성';
    default:
      return value ?? '-';
  }
}

export function formatPolicyVersionStatusLabel(value: string | null | undefined) {
  switch (value) {
    case 'draft':
      return '초안';
    case 'published':
      return '게시됨';
    case 'retired':
      return '종료';
    default:
      return value ?? '-';
  }
}

export function formatAnnouncementStatusLabel(value: string | null | undefined) {
  switch (value) {
    case 'draft':
      return '초안';
    case 'published':
      return '게시됨';
    case 'archived':
      return '보관';
    default:
      return value ?? '-';
  }
}

export function formatAnnouncementScopeLabel(value: string | null | undefined) {
  switch (value) {
    case 'all':
      return '전체용';
    case 'driver':
      return '배송원용';
    case 'operator':
      return '운영자용';
    default:
      return value ?? '-';
  }
}

export function formatSupportTicketStatusLabel(value: string | null | undefined) {
  switch (value) {
    case 'open':
      return '열림';
    case 'in_progress':
      return '처리 중';
    case 'resolved':
      return '해결됨';
    case 'closed':
      return '종료';
    default:
      return value ?? '-';
  }
}

export function formatSupportTicketPriorityLabel(value: string | null | undefined) {
  switch (value) {
    case 'low':
      return '낮음';
    case 'medium':
      return '보통';
    case 'high':
      return '높음';
    default:
      return value ?? '-';
  }
}

export function formatPersonnelDocumentTypeLabel(value: string | null | undefined) {
  switch (value) {
    case 'contract':
      return '계약서';
    case 'license_or_certificate':
      return '자격/증빙';
    case 'bank_account_proof':
      return '계좌 증빙';
    case 'business_registration':
      return '사업자 등록';
    default:
      return value ?? '-';
  }
}

export function formatPersonnelDocumentStatusLabel(value: string | null | undefined) {
  switch (value) {
    case 'draft':
      return '초안';
    case 'active':
      return '활성';
    case 'expired':
      return '만료';
    case 'revoked':
      return '해제';
    default:
      return value ?? '-';
  }
}

export function formatNotificationStatusLabel(value: string | null | undefined) {
  switch (value) {
    case 'unread':
      return '읽지 않음';
    case 'read':
      return '읽음';
    case 'archived':
      return '보관';
    default:
      return value ?? '-';
  }
}

export function formatPushDeliveryStatusLabel(value: string | null | undefined) {
  switch (value) {
    case 'simulated_sent':
      return '발송됨';
    case 'failed':
      return '실패';
    default:
      return value ?? '-';
  }
}

export function formatDeliveryRecordStatusLabel(value: string | null | undefined) {
  switch (value) {
    case 'draft':
      return '초안';
    case 'confirmed':
      return '확정';
    case 'void':
      return '무효';
    default:
      return value ?? '-';
  }
}

export function formatDeliverySnapshotStatusLabel(value: string | null | undefined) {
  switch (value) {
    case 'active':
      return '활성';
    case 'superseded':
      return '대체됨';
    default:
      return value ?? '-';
  }
}

export function formatNullableBooleanLabel(value: boolean | null | undefined) {
  if (value == null) {
    return '확인 불가';
  }

  return value ? '예' : '아니오';
}
