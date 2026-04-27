import type { SessionPayload } from '../api/http';

export type DevSessionPresetName = 'system_admin' | 'cheonha_manager';

type DevSessionPreset = {
  name: DevSessionPresetName;
  session: SessionPayload;
};

const HOST_PRESET_MAP: Record<string, DevSessionPresetName[]> = {
  'ev-dashboard.com': ['system_admin'],
  'cheonha.ev-dashboard.com': ['cheonha_manager'],
};

const DEV_SESSION_PRESETS: Record<DevSessionPresetName, DevSessionPreset> = {
  system_admin: {
    name: 'system_admin',
    session: {
      accessToken: 'dev-sandbox-system-admin-token',
      sessionKind: 'normal',
      email: 'system-admin@example.com',
      identity: {
        identityId: '10000000-0000-0000-0000-000000000001',
        name: '관리자',
        birthDate: '1990-01-01',
        status: 'active',
      },
      activeAccount: {
        accountType: 'system_admin',
        accountId: '20000000-0000-0000-0000-000000000001',
        companyId: null,
        roleType: null,
      },
      availableAccountTypes: ['system_admin'],
    },
  },
  cheonha_manager: {
    name: 'cheonha_manager',
    session: {
      accessToken: 'dev-sandbox-cheonha-manager-token',
      sessionKind: 'normal',
      email: 'cheonha-manager@example.com',
      identity: {
        identityId: '10000000-0000-0000-0000-000000000010',
        name: '천하 관리자',
        birthDate: '1990-01-01',
        status: 'active',
      },
      activeAccount: {
        accountType: 'manager',
        accountId: '20000000-0000-0000-0000-000000000010',
        companyId: '30000000-0000-0000-0000-000000000001',
        roleType: 'company_super_admin',
      },
      availableAccountTypes: ['manager'],
    },
  },
};

function normalizeHost(hostname: string | undefined): string {
  const normalized = hostname?.trim().toLowerCase() ?? '';
  if (!normalized) {
    return '';
  }

  try {
    return new URL(`http://${normalized}`).hostname;
  } catch {
    if (normalized.startsWith('[')) {
      const closingBracketIndex = normalized.indexOf(']');
      if (closingBracketIndex > 0) {
        return normalized.slice(1, closingBracketIndex);
      }
    }

    return normalized;
  }
}

export function resolveAllowedSessionPreset(hostname: string | undefined): DevSessionPresetName[] {
  return HOST_PRESET_MAP[normalizeHost(hostname)] ?? [];
}

export function resolveDevSessionPreset(hostname: string | undefined): DevSessionPreset | null {
  const [presetName] = resolveAllowedSessionPreset(hostname);
  if (!presetName) {
    return null;
  }

  return DEV_SESSION_PRESETS[presetName];
}
