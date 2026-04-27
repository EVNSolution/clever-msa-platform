import { GENERIC_SERVER_ERROR_MESSAGE } from '../api/http';
import type { TopNotificationTone } from './TopNotificationBar';

export type TopNotificationTemplateKey =
  | 'server-unavailable'
  | 'navigation-policy-updated'
  | 'navigation-redirected';

export type TopNotificationTemplate = {
  key: TopNotificationTemplateKey;
  message: string;
  tone: TopNotificationTone;
  dedupeKey: string;
};

const TOP_NOTIFICATION_TEMPLATES: Record<TopNotificationTemplateKey, TopNotificationTemplate> = {
  'server-unavailable': {
    key: 'server-unavailable',
    message: GENERIC_SERVER_ERROR_MESSAGE,
    tone: 'error',
    dedupeKey: 'template:server-unavailable',
  },
  'navigation-policy-updated': {
    key: 'navigation-policy-updated',
    message: '권한 정책이 변경되어 현재 화면을 유지할 수 없습니다. 허용된 메뉴로 이동합니다.',
    tone: 'error',
    dedupeKey: 'template:navigation-policy-updated',
  },
  'navigation-redirected': {
    key: 'navigation-redirected',
    message: '권한 정책이 변경되어 현재 화면에 접근할 수 없습니다. 허용된 메뉴로 이동했습니다.',
    tone: 'error',
    dedupeKey: 'template:navigation-redirected',
  },
};

export function resolveTopNotificationTemplate(key: TopNotificationTemplateKey): TopNotificationTemplate {
  return TOP_NOTIFICATION_TEMPLATES[key];
}
