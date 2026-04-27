import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DISPLAY_DURATION_MS, TopNotificationBar, type TopNotification } from './TopNotificationBar';

describe('TopNotificationBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders success notifications as a green status bar and auto dismisses after 3 seconds', () => {
    const notice: TopNotification = {
      id: 1,
      dedupeKey: 'test:success',
      message: '정산 기준이 저장되었습니다.',
      tone: 'success',
      expiresAt: Date.now() + DISPLAY_DURATION_MS,
    };
    const onDismiss = vi.fn();

    render(<TopNotificationBar notice={notice} onDismiss={onDismiss} />);

    const bar = screen.getByRole('status');
    expect(bar).toHaveAttribute('data-tone', 'success');
    expect(bar).toHaveClass('top-notice');
    expect(bar).toHaveClass('is-entered');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(DISPLAY_DURATION_MS);
    });

    expect(screen.getByRole('status')).toHaveClass('is-exiting');
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(240);
    });

    expect(onDismiss).toHaveBeenCalledWith(notice.id);
  });

  it('renders error notifications as a red alert bar', () => {
    const notice: TopNotification = {
      id: 2,
      dedupeKey: 'test:error',
      message: '권한 정책이 변경되어 이동했습니다.',
      tone: 'error',
      expiresAt: Date.now() + DISPLAY_DURATION_MS,
    };

    render(<TopNotificationBar notice={notice} onDismiss={vi.fn()} />);

    const bar = screen.getByRole('alert');
    expect(bar).toHaveAttribute('data-tone', 'error');
    expect(bar).toHaveTextContent(notice.message);
  });

  it('extends the same notification without replaying the enter state', () => {
    const onDismiss = vi.fn();
    const initialNow = Date.now();
    const { rerender } = render(
      <TopNotificationBar
        notice={{
          id: 3,
          dedupeKey: 'template:server-unavailable',
          message: '서버 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.',
          tone: 'error',
          expiresAt: initialNow + DISPLAY_DURATION_MS,
        }}
        onDismiss={onDismiss}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    rerender(
      <TopNotificationBar
        notice={{
          id: 3,
          dedupeKey: 'template:server-unavailable',
          message: '서버 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.',
          tone: 'error',
          expiresAt: initialNow + DISPLAY_DURATION_MS + 2500,
        }}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByRole('alert')).toHaveClass('is-entered');

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2600);
    });

    expect(screen.getByRole('alert')).toHaveClass('is-exiting');
  });
});
