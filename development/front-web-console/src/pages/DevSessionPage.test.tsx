import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearStoredSession, persistSession } from '../sessionPersistence';
import { resetLocalSandboxMockState } from '../devSandbox/mockState';
import { DevSessionPage } from './DevSessionPage';

const navigate = vi.fn();
const ROUTER_FUTURE = {
  v7_relativeSplatPath: true,
  v7_startTransition: true,
} as const;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('../sessionPersistence', () => ({
  clearStoredSession: vi.fn(),
  persistSession: vi.fn(),
}));

vi.mock('../devSandbox/mockState', () => ({
  resetLocalSandboxMockState: vi.fn(),
}));

function withHostname<T>(url: string, run: () => T): T {
  const originalLocation = window.location;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: new URL(url),
  });

  try {
    return run();
  } finally {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  }
}

describe('DevSessionPage', () => {
  beforeEach(() => {
    navigate.mockReset();
    vi.mocked(persistSession).mockReset();
    vi.mocked(clearStoredSession).mockReset();
    vi.mocked(resetLocalSandboxMockState).mockReset();
    window.history.replaceState({}, '', '/__dev__/session');
  });

  it('shows the current host and the only allowed preset for ev-dashboard.com', () => {
    withHostname('https://ev-dashboard.com:5174/__dev__/session', () => {
      render(
        <MemoryRouter future={ROUTER_FUTURE}>
          <DevSessionPage />
        </MemoryRouter>,
      );
    });

    expect(screen.getByText('ev-dashboard.com:5174')).toBeInTheDocument();
    expect(screen.getByText('system_admin')).toBeInTheDocument();
    expect(screen.queryByText('cheonha_manager')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '세션 주입' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '세션 초기화' })).toBeInTheDocument();
  });

  it('shows the cheonha preset for the cheonha subdomain', () => {
    withHostname('https://cheonha.ev-dashboard.com:5174/__dev__/session', () => {
      render(
        <MemoryRouter future={ROUTER_FUTURE}>
          <DevSessionPage />
        </MemoryRouter>,
      );
    });

    expect(screen.getByText('cheonha.ev-dashboard.com:5174')).toBeInTheDocument();
    expect(screen.getByText('cheonha_manager')).toBeInTheDocument();
    expect(screen.queryByText('system_admin')).not.toBeInTheDocument();
  });

  it('persists the preset session and redirects home when injecting', async () => {
    const user = userEvent.setup();

    withHostname('https://ev-dashboard.com:5174/__dev__/session', () => {
      render(
        <MemoryRouter future={ROUTER_FUTURE}>
          <DevSessionPage />
        </MemoryRouter>,
      );
    });

    await user.click(screen.getByRole('button', { name: '세션 주입' }));

    expect(persistSession).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('clears the stored session and sandbox bookkeeping when resetting', async () => {
    const user = userEvent.setup();

    withHostname('https://cheonha.ev-dashboard.com:5174/__dev__/session', () => {
      render(
        <MemoryRouter future={ROUTER_FUTURE}>
          <DevSessionPage />
        </MemoryRouter>,
      );
    });

    await user.click(screen.getByRole('button', { name: '세션 초기화' }));

    expect(clearStoredSession).toHaveBeenCalledTimes(1);
    expect(resetLocalSandboxMockState).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });
});
