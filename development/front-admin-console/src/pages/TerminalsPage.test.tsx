import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TerminalsPage } from './TerminalsPage';

const apiMocks = vi.hoisted(() => ({
  listTerminals: vi.fn(),
  createTerminal: vi.fn(),
  updateTerminal: vi.fn(),
  listTerminalInstallations: vi.fn(),
  createTerminalInstallation: vi.fn(),
  updateTerminalInstallation: vi.fn(),
}));

vi.mock('../api/terminals', () => ({
  listTerminals: apiMocks.listTerminals,
  createTerminal: apiMocks.createTerminal,
  updateTerminal: apiMocks.updateTerminal,
  listTerminalInstallations: apiMocks.listTerminalInstallations,
  createTerminalInstallation: apiMocks.createTerminalInstallation,
  updateTerminalInstallation: apiMocks.updateTerminalInstallation,
}));

function makeTerminal(overrides: Partial<Record<string, string | null>> = {}) {
  return {
    terminal_id: '70000000-0000-0000-0000-000000000001',
    manufacturer_company_id: '30000000-0000-0000-0000-000000000001',
    imei: '356123456789012',
    iccid: '8982123456789012345',
    firmware_version: '1.0.0',
    protocol_version: '1.0',
    app_version: '1.0.0',
    terminal_status: 'active',
    created_at: '2026-03-20T00:00:00Z',
    updated_at: '2026-03-20T00:00:00Z',
    ...overrides,
  };
}

function makeInstallation(overrides: Partial<Record<string, string | null>> = {}) {
  return {
    terminal_installation_id: '71000000-0000-0000-0000-000000000001',
    terminal_id: '70000000-0000-0000-0000-000000000001',
    vehicle_id: '50000000-0000-0000-0000-000000000001',
    installation_status: 'installed',
    installed_at: '2026-03-20T01:00:00Z',
    removed_at: null,
    created_at: '2026-03-20T01:00:00Z',
    updated_at: '2026-03-20T01:00:00Z',
    ...overrides,
  };
}

describe('Admin TerminalsPage', () => {
  it('creates a terminal with registry fields only', async () => {
    apiMocks.listTerminals.mockResolvedValue([]);
    apiMocks.listTerminalInstallations.mockResolvedValue([]);
    apiMocks.createTerminal.mockResolvedValue(makeTerminal());

    render(<TerminalsPage client={{ request: vi.fn() }} />);

    await screen.findByRole('heading', { name: /단말기 생성/i });

    expect(screen.queryByLabelText(/latitude/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/diagnostic/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/제조사 회사 id/i), {
      target: { value: '30000000-0000-0000-0000-000000000001' },
    });
    fireEvent.change(screen.getByLabelText(/^imei$/i), {
      target: { value: '356123456789012' },
    });
    fireEvent.change(screen.getByLabelText(/^iccid$/i), {
      target: { value: '8982123456789012345' },
    });
    fireEvent.change(screen.getByLabelText(/펌웨어 버전/i), {
      target: { value: '1.0.0' },
    });
    fireEvent.change(screen.getByLabelText(/프로토콜 버전/i), {
      target: { value: '1.0' },
    });
    fireEvent.change(screen.getByLabelText(/앱 버전/i), {
      target: { value: '1.0.0' },
    });

    fireEvent.click(screen.getByRole('button', { name: /단말기 생성/i }));

    await waitFor(() => {
      expect(apiMocks.createTerminal).toHaveBeenCalledWith(expect.anything(), {
        manufacturer_company_id: '30000000-0000-0000-0000-000000000001',
        imei: '356123456789012',
        iccid: '8982123456789012345',
        firmware_version: '1.0.0',
        protocol_version: '1.0',
        app_version: '1.0.0',
        terminal_status: 'active',
      });
    });
  });

  it('loads terminal data into the edit form and updates terminal status', async () => {
    apiMocks.listTerminals.mockResolvedValue([makeTerminal()]);
    apiMocks.listTerminalInstallations.mockResolvedValue([]);
    apiMocks.updateTerminal.mockResolvedValue(makeTerminal({ terminal_status: 'inactive' }));

    render(<TerminalsPage client={{ request: vi.fn() }} />);

    await screen.findByText('356123456789012');
    fireEvent.click(screen.getByRole('button', { name: /단말기 수정/i }));

    expect(screen.getByDisplayValue('356123456789012')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/단말기 상태/i), {
      target: { value: 'inactive' },
    });
    const formSection = screen.getByRole('heading', { name: /단말기 수정/i }).closest('section') as HTMLElement;
    fireEvent.click(within(formSection).getByRole('button', { name: /단말기 수정/i }));

    await waitFor(() => {
      expect(apiMocks.updateTerminal).toHaveBeenCalledWith(
        expect.anything(),
        '70000000-0000-0000-0000-000000000001',
        {
          manufacturer_company_id: '30000000-0000-0000-0000-000000000001',
          imei: '356123456789012',
          iccid: '8982123456789012345',
          firmware_version: '1.0.0',
          protocol_version: '1.0',
          app_version: '1.0.0',
          terminal_status: 'inactive',
        },
      );
    });
  });

  it('creates and removes terminal installation records', async () => {
    apiMocks.listTerminals.mockResolvedValue([makeTerminal()]);
    apiMocks.listTerminalInstallations
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeInstallation()])
      .mockResolvedValueOnce([
        makeInstallation({
          installation_status: 'removed',
          removed_at: '2026-03-21T00:00:00Z',
        }),
      ]);
    apiMocks.createTerminalInstallation.mockResolvedValue(makeInstallation());
    apiMocks.updateTerminalInstallation.mockResolvedValue(
      makeInstallation({
        installation_status: 'removed',
        removed_at: '2026-03-21T00:00:00Z',
      }),
    );

    render(<TerminalsPage client={{ request: vi.fn() }} />);

    await screen.findByText('356123456789012');

    fireEvent.change(screen.getByLabelText(/설치 단말기 id/i), {
      target: { value: '70000000-0000-0000-0000-000000000001' },
    });
    fireEvent.change(screen.getByLabelText(/설치 차량 id/i), {
      target: { value: '50000000-0000-0000-0000-000000000001' },
    });
    fireEvent.click(screen.getByRole('button', { name: /설치 생성/i }));

    await waitFor(() => {
      expect(apiMocks.createTerminalInstallation).toHaveBeenCalledWith(expect.anything(), {
        terminal_id: '70000000-0000-0000-0000-000000000001',
        vehicle_id: '50000000-0000-0000-0000-000000000001',
        installation_status: 'installed',
        installed_at: expect.any(String),
        removed_at: null,
      });
    });

    const registrySection = screen.getByRole('heading', { name: /설치 목록/i }).closest('section') as HTMLElement;
    const removeButton = await within(registrySection).findByRole('button', { name: /설치 해제/i });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(apiMocks.updateTerminalInstallation).toHaveBeenCalledWith(
        expect.anything(),
        '71000000-0000-0000-0000-000000000001',
        {
          installation_status: 'removed',
          removed_at: expect.any(String),
        },
      );
    });
  });
});
