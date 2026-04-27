import { describe, expect, it } from 'vitest';

import { ApiError, getErrorMessage, resolveDefaultApiBaseUrl } from './http';

describe('http error messaging', () => {
  it('masks 5xx api errors behind a generic user-facing message', () => {
    const error = new ApiError(500, 'http_500', 'database stack trace', {
      debug: 'should not leak',
    });

    expect(getErrorMessage(error)).toBe('서버 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  });

  it('masks gateway failures behind the same generic message', () => {
    const error = new ApiError(502, 'http_502', 'Bad Gateway', null);

    expect(getErrorMessage(error)).toBe('서버 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  });

  it('keeps 4xx api messages intact', () => {
    const error = new ApiError(403, 'forbidden', 'Permission denied.', null);

    expect(getErrorMessage(error)).toBe('Permission denied.');
  });

  it('maps fetch failures to a generic user-facing message', () => {
    expect(getErrorMessage(new TypeError('Failed to fetch'))).toBe(
      '서버 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.',
    );
  });
});

describe('resolveDefaultApiBaseUrl', () => {
  it('falls back to same-host /api when the build variable is undefined', () => {
    expect(resolveDefaultApiBaseUrl(undefined)).toBe('/api');
  });

  it('falls back to same-host /api when the build variable is blank', () => {
    expect(resolveDefaultApiBaseUrl('')).toBe('/api');
    expect(resolveDefaultApiBaseUrl('   ')).toBe('/api');
  });

  it('keeps an explicit API base URL override intact', () => {
    expect(resolveDefaultApiBaseUrl('https://api.example.com/api')).toBe('https://api.example.com/api');
  });
});
