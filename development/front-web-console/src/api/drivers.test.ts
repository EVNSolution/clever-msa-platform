import { describe, expect, it } from 'vitest';

import { ApiError, GENERIC_SERVER_ERROR_MESSAGE } from './http';
import { getEnsureDriversByExternalUserNamesErrorMessage } from './drivers';

describe('driver api error messaging', () => {
  it('explains 400 errors in the context of driver auto creation', () => {
    const error = new ApiError(400, 'invalid_request', 'company_id is required.', {
      company_id: ['This field is required.'],
    });

    expect(getEnsureDriversByExternalUserNamesErrorMessage(error)).toBe(
      '배송원 자동 생성 요청이 올바르지 않습니다. 회사, 플릿, 배송원 이름을 다시 확인해 주세요.',
    );
  });

  it('explains 401 errors as a login problem', () => {
    const error = new ApiError(401, 'authentication_failed', 'Authentication credentials were not provided.', null);

    expect(getEnsureDriversByExternalUserNamesErrorMessage(error)).toBe(
      '로그인 세션이 없어 배송원을 생성할 수 없습니다. 다시 로그인한 뒤 다시 시도해 주세요.',
    );
  });

  it('explains 404 errors as a missing auto-create API', () => {
    const error = new ApiError(404, 'not_found', 'Requested API endpoint was not found.', null);

    expect(getEnsureDriversByExternalUserNamesErrorMessage(error)).toBe(
      '배송원 자동 생성 API를 찾을 수 없습니다. 서비스 배포 상태를 확인해 주세요.',
    );
  });

  it('explains 405 errors as an unsupported auto-create endpoint', () => {
    const error = new ApiError(405, 'method_not_allowed', 'Method "POST" not allowed.', null);

    expect(getEnsureDriversByExternalUserNamesErrorMessage(error)).toBe(
      '현재 배송원 자동 생성 API가 POST 요청을 처리하지 못하고 있습니다. 서비스 배포 상태를 확인해 주세요.',
    );
  });

  it('falls back to the generic server message for 5xx errors', () => {
    const error = new ApiError(502, 'http_502', 'Bad Gateway', null);

    expect(getEnsureDriversByExternalUserNamesErrorMessage(error)).toBe(GENERIC_SERVER_ERROR_MESSAGE);
  });
});
