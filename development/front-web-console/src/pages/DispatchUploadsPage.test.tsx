import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DispatchUploadsPage } from './DispatchUploadsPage';
import { ApiError, type SessionPayload } from '../api/http';

const dispatchRegistryMocks = vi.hoisted(() => ({
  listDispatchUploadBatches: vi.fn(),
}));

const deliveryRecordMocks = vi.hoisted(() => ({
  bootstrapDailySnapshotsFromDispatch: vi.fn(),
}));

const driverMocks = vi.hoisted(() => ({
  listDrivers: vi.fn(),
  ensureDriversByExternalUserNames: vi.fn(),
}));

const organizationMocks = vi.hoisted(() => ({
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
  createFleet: vi.fn(),
}));

const xlsxMocks = vi.hoisted(() => ({
  read: vi.fn(),
  sheetToJson: vi.fn(),
}));

vi.mock('../api/dispatchRegistry', async () => {
  const actual = await vi.importActual<typeof import('../api/dispatchRegistry')>('../api/dispatchRegistry');
  return {
    ...actual,
    listDispatchUploadBatches: dispatchRegistryMocks.listDispatchUploadBatches,
  };
});

vi.mock('../api/deliveryRecords', () => ({
  bootstrapDailySnapshotsFromDispatch: deliveryRecordMocks.bootstrapDailySnapshotsFromDispatch,
}));

vi.mock('../api/drivers', async () => {
  const actual = await vi.importActual<typeof import('../api/drivers')>('../api/drivers');
  return {
    ...actual,
    listDrivers: driverMocks.listDrivers,
    ensureDriversByExternalUserNames: driverMocks.ensureDriversByExternalUserNames,
  };
});

vi.mock('../api/organization', () => ({
  listCompanies: organizationMocks.listCompanies,
  listFleets: organizationMocks.listFleets,
  createFleet: organizationMocks.createFleet,
}));

vi.mock('xlsx', () => ({
  read: xlsxMocks.read,
  utils: {
    sheet_to_json: xlsxMocks.sheetToJson,
  },
}));

const systemAdminSession: SessionPayload = {
  accessToken: 'token',
  sessionKind: 'normal',
  email: 'admin@example.com',
  identity: {
    identityId: 'identity-1',
    name: 'System Admin',
    birthDate: '1990-01-01',
    status: 'active',
  },
  activeAccount: {
    accountType: 'system_admin',
    accountId: 'system-account-1',
    companyId: null,
    roleType: null,
    roleDisplayName: null,
  },
  availableAccountTypes: ['system_admin'],
};

const companyManagerSession: SessionPayload = {
  ...systemAdminSession,
  email: 'manager@example.com',
  activeAccount: {
    accountType: 'manager',
    accountId: 'manager-account-1',
    companyId: '30000000-0000-0000-0000-000000000002',
    roleType: 'company_super_admin',
    roleDisplayName: '회사 관리자',
  },
  availableAccountTypes: ['manager'],
};

describe('DispatchUploadsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    driverMocks.listDrivers.mockReset();
    driverMocks.ensureDriversByExternalUserNames.mockReset();
    organizationMocks.createFleet.mockReset();
    xlsxMocks.read.mockReset();
    xlsxMocks.sheetToJson.mockReset();
    driverMocks.listDrivers.mockResolvedValue([]);
    driverMocks.ensureDriversByExternalUserNames.mockResolvedValue({
      drivers: [],
      created_external_user_names: [],
      existing_external_user_names: [],
    });
    organizationMocks.listCompanies.mockResolvedValue([
      {
        company_id: '30000000-0000-0000-0000-000000000001',
        route_no: 31,
        name: '알파 회사',
      },
      {
        company_id: '30000000-0000-0000-0000-000000000002',
        route_no: 32,
        name: '베타 회사',
      },
    ]);
    organizationMocks.listFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        route_no: 41,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: '서울 플릿',
      },
      {
        fleet_id: '40000000-0000-0000-0000-000000000002',
        route_no: 42,
        company_id: '30000000-0000-0000-0000-000000000002',
        name: '부산 플릿',
      },
    ]);
    dispatchRegistryMocks.listDispatchUploadBatches.mockResolvedValue([]);
    deliveryRecordMocks.bootstrapDailySnapshotsFromDispatch.mockResolvedValue({
      created_count: 1,
      skipped_count: 0,
      created_snapshot_ids: ['snapshot-1'],
    });
    organizationMocks.createFleet.mockResolvedValue({
      fleet_id: '40000000-0000-0000-0000-000000000003',
      route_no: 43,
      company_id: '30000000-0000-0000-0000-000000000001',
      name: 'H',
    });
  });

  function mockWorksheetRows(rows: Record<string, unknown>[]) {
    xlsxMocks.read.mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} },
    });
    xlsxMocks.sheetToJson.mockReturnValue(rows);
  }

  function createSpreadsheetFile(name: string) {
    const file = new File(['dummy'], name, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
    return file;
  }

  function LocationProbe() {
    const location = useLocation();

    return <p data-testid="location">{location.pathname}</p>;
  }

  it('boots settlement preparation from the upload scope without a dispatch plan', async () => {
    dispatchRegistryMocks.listDispatchUploadBatches.mockResolvedValue([
      {
        upload_batch_id: 'upload-batch-1',
        dispatch_plan_id: null,
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        dispatch_date: '2026-03-24',
        source_filename: 'dispatch.xlsx',
        upload_status: 'confirmed',
        created_at: '2026-03-24T09:00:00Z',
        updated_at: '2026-03-24T09:10:00Z',
        rows: [
          {
            upload_row_id: 'upload-row-1',
            row_index: 1,
            external_user_name: 'ZD홍길동',
            small_region_text: '10H2',
            detailed_region_text: '10H2-가',
            box_count: 133,
            household_count: 90,
            matched_driver_id: 'driver-1',
          },
        ],
      },
    ]);

    render(
      <MemoryRouter>
        <DispatchUploadsPage client={{ request: vi.fn() }} session={systemAdminSession} />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '배차표 업로드', level: 1 })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('배차일'), '2026-03-24');
    const uploadFileHeading = await screen.findByRole('heading', { name: '업로드 파일', level: 2 });
    const uploadFileHeader = uploadFileHeading.closest('.panel-header-inline');
    expect(uploadFileHeader).not.toBeNull();
    const settlementStartButton = within(uploadFileHeader as HTMLElement).getByRole('button', {
      name: '정산 시작하기',
    });
    expect(settlementStartButton).toBeEnabled();
    expect(screen.getAllByRole('button', { name: '정산 시작하기' })).toHaveLength(1);
    await user.click(settlementStartButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('정산을 시작하시겠습니까?');
      expect(deliveryRecordMocks.bootstrapDailySnapshotsFromDispatch).toHaveBeenCalledWith(
        expect.anything(),
        {
          company_id: '30000000-0000-0000-0000-000000000001',
          fleet_id: '40000000-0000-0000-0000-000000000001',
          service_date: expect.any(String),
        },
      );
    });
    expect(screen.getByTestId('location')).toHaveTextContent('/settlements/inputs');
  });

  it('keeps the settlement handoff CTA at the top and disables it before confirmed uploads exist', async () => {
    render(
      <MemoryRouter>
        <DispatchUploadsPage client={{ request: vi.fn() }} session={systemAdminSession} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '배차표 업로드', level: 1 })).toBeInTheDocument();

    const uploadFileHeading = await screen.findByRole('heading', { name: '업로드 파일', level: 2 });
    const uploadFileHeader = uploadFileHeading.closest('.panel-header-inline');
    expect(uploadFileHeader).not.toBeNull();
    const settlementStartButton = within(uploadFileHeader as HTMLElement).getByRole('button', {
      name: '정산 시작하기',
    });
    expect(settlementStartButton).toBeDisabled();
    expect(screen.getAllByRole('button', { name: '정산 시작하기' })).toHaveLength(1);
  });

  it('renders compact scope stats once confirmed upload data is loaded', async () => {
    dispatchRegistryMocks.listDispatchUploadBatches.mockResolvedValue([
      {
        upload_batch_id: 'upload-batch-1',
        dispatch_plan_id: null,
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        dispatch_date: '2026-03-24',
        source_filename: 'dispatch.xlsx',
        upload_status: 'confirmed',
        created_at: '2026-03-24T09:00:00Z',
        updated_at: '2026-03-24T09:10:00Z',
        rows: [
          {
            upload_row_id: 'upload-row-1',
            row_index: 1,
            external_user_name: 'ZD홍길동',
            small_region_text: '10H2',
            detailed_region_text: '10H2-가',
            box_count: 133,
            household_count: 90,
            matched_driver_id: 'driver-1',
          },
        ],
      },
    ]);

    render(
      <MemoryRouter>
        <DispatchUploadsPage client={{ request: vi.fn() }} session={systemAdminSession} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '배차표 업로드', level: 1 })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('배차일'), '2026-03-24');

    expect(await screen.findByText('확정 1')).toBeInTheDocument();
    expect(screen.getByText('매칭 1')).toBeInTheDocument();
    expect(screen.getByText('박스 133')).toBeInTheDocument();
  });

  it('asks for approval before switching to a detected existing fleet', async () => {
    organizationMocks.listFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000010',
        route_no: 41,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'C',
      },
      {
        fleet_id: '40000000-0000-0000-0000-000000000011',
        route_no: 42,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'H',
      },
    ]);
    mockWorksheetRows([
      {
        '배송매니저 이름': 'ZD홍길동',
        '소분류 권역': '10H2',
        '세분류 권역': '10H2-가',
        '박스 수': 133,
        '가구 수': 90,
      },
    ]);

    render(
      <MemoryRouter>
        <DispatchUploadsPage client={{ request: vi.fn() }} session={systemAdminSession} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '배차표 업로드', level: 1 })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText('배차표 업로드'), createSpreadsheetFile('dispatch.xlsx'));

    expect(await screen.findByText('감지된 플릿 H')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '감지된 플릿 적용' }));

    expect(screen.getByLabelText('플릿')).toHaveValue('40000000-0000-0000-0000-000000000011');
  });

  it('asks for approval before creating a missing detected fleet', async () => {
    organizationMocks.listFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000010',
        route_no: 41,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'C',
      },
    ]);
    mockWorksheetRows([
      {
        '배송매니저 이름': 'ZD홍길동',
        '소분류 권역': '10H2',
        '세분류 권역': '10H2-가',
        '박스 수': 133,
        '가구 수': 90,
      },
    ]);

    render(
      <MemoryRouter>
        <DispatchUploadsPage client={{ request: vi.fn() }} session={systemAdminSession} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '배차표 업로드', level: 1 })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText('배차표 업로드'), createSpreadsheetFile('dispatch.xlsx'));

    expect(await screen.findByText('감지된 플릿 H')).toBeInTheDocument();
    expect(screen.getByText('현재 회사에 일치하는 플릿이 없습니다. 생성하시겠습니까?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '플릿 생성' }));

    await waitFor(() => {
      expect(organizationMocks.createFleet).toHaveBeenCalledWith(expect.anything(), {
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'H',
      });
    });
    expect(screen.getByLabelText('플릿')).toHaveValue('40000000-0000-0000-0000-000000000003');
  });

  it('asks for approval before creating missing drivers detected from uploaded external user names', async () => {
    organizationMocks.listFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        route_no: 41,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'H',
      },
    ]);
    mockWorksheetRows([
      {
        '배송매니저 이름': 'ZD홍길동',
        '소분류 권역': '10H2',
        '세분류 권역': '10H2-가',
        '박스 수': 133,
        '가구 수': 90,
      },
    ]);
    driverMocks.listDrivers
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          driver_id: '10000000-0000-0000-0000-000000000001',
          route_no: 81,
          company_id: '30000000-0000-0000-0000-000000000001',
          fleet_id: '40000000-0000-0000-0000-000000000001',
          name: 'ZD홍길동',
          external_user_name: 'ZD홍길동',
          ev_id: '',
          phone_number: '',
          address: '',
        },
      ]);
    driverMocks.ensureDriversByExternalUserNames.mockResolvedValue({
      drivers: [
        {
          driver_id: '10000000-0000-0000-0000-000000000001',
          route_no: 81,
          company_id: '30000000-0000-0000-0000-000000000001',
          fleet_id: '40000000-0000-0000-0000-000000000001',
          name: 'ZD홍길동',
          external_user_name: 'ZD홍길동',
          ev_id: '',
          phone_number: '',
          address: '',
        },
      ],
      created_external_user_names: ['ZD홍길동'],
      existing_external_user_names: [],
    });

    render(
      <MemoryRouter>
        <DispatchUploadsPage client={{ request: vi.fn() }} session={systemAdminSession} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '배차표 업로드', level: 1 })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText('배차표 업로드'), createSpreadsheetFile('dispatch.xlsx'));

    expect(await screen.findByText('미등록 배송원 1명')).toBeInTheDocument();
    expect(screen.getByText('ZD홍길동')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '배송원 생성' }));

    await waitFor(() => {
      expect(driverMocks.ensureDriversByExternalUserNames).toHaveBeenCalledWith(expect.anything(), {
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        external_user_names: ['ZD홍길동'],
      });
    });
    expect(await screen.findByText('배송원 1명을 생성했습니다.')).toBeInTheDocument();
  });

  it('shows a contextual message when missing driver creation is not supported by the backend yet', async () => {
    organizationMocks.listFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        route_no: 41,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'H',
      },
    ]);
    mockWorksheetRows([
      {
        '배송매니저 이름': 'ZD홍길동',
        '소분류 권역': '10H2',
        '세분류 권역': '10H2-가',
        '박스 수': 133,
        '가구 수': 90,
      },
    ]);
    driverMocks.ensureDriversByExternalUserNames.mockRejectedValue(
      new ApiError(405, 'method_not_allowed', 'Method "POST" not allowed.', null),
    );

    render(
      <MemoryRouter>
        <DispatchUploadsPage client={{ request: vi.fn() }} session={systemAdminSession} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '배차표 업로드', level: 1 })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText('배차표 업로드'), createSpreadsheetFile('dispatch.xlsx'));
    await user.click(screen.getByRole('button', { name: '배송원 생성' }));

    expect(
      await screen.findByText('현재 배송원 자동 생성 API가 POST 요청을 처리하지 못하고 있습니다. 서비스 배포 상태를 확인해 주세요.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Method "POST" not allowed.')).not.toBeInTheDocument();
  });

  it('keeps the upload screen alive when the drivers api returns a malformed payload', async () => {
    driverMocks.listDrivers.mockResolvedValue({ results: [] });

    render(
      <MemoryRouter>
        <DispatchUploadsPage client={{ request: vi.fn() }} session={systemAdminSession} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '배차표 업로드', level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText('플릿')).toBeInTheDocument();
    expect(screen.getByLabelText('배차일')).toBeInTheDocument();
  });

  it('keeps the upload page copy short and emphasizes upload actions', async () => {
    render(
      <MemoryRouter>
        <DispatchUploadsPage client={{ request: vi.fn() }} session={systemAdminSession} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '배차표 업로드', level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText('배차표 업로드')).toBeInTheDocument();
    expect(screen.getByLabelText('회사')).toBeInTheDocument();
    expect(screen.getByLabelText('플릿')).toBeInTheDocument();
    expect(screen.getByLabelText('배차일')).toBeInTheDocument();
    expect(screen.queryByText(/^회사$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^플릿$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^배차일$/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '정산 시작하기' })).toBeDisabled();
    expect(screen.queryByText(/1차 MVP/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/phase 1/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/정산 근거로 사용합니다/i)).not.toBeInTheDocument();
  });

  it('can override cockpit CTA targets without changing the main-hub defaults', async () => {
    dispatchRegistryMocks.listDispatchUploadBatches.mockResolvedValue([
      {
        upload_batch_id: 'upload-batch-1',
        dispatch_plan_id: null,
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        dispatch_date: '2026-03-24',
        source_filename: 'dispatch.xlsx',
        upload_status: 'confirmed',
        created_at: '2026-03-24T09:00:00Z',
        updated_at: '2026-03-24T09:10:00Z',
        rows: [
          {
            upload_row_id: 'upload-row-1',
            row_index: 1,
            external_user_name: 'ZD홍길동',
            small_region_text: '10H2',
            detailed_region_text: '10H2-가',
            box_count: 133,
            household_count: 90,
            matched_driver_id: 'driver-1',
          },
        ],
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/settlement/dispatch']}>
        <DispatchUploadsPage
          client={{ request: vi.fn() }}
          dispatchBoardsPath="/settlement/dispatch"
          session={systemAdminSession}
          settlementInputsPath="/settlement/process"
        />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '배차표 업로드', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '배차 계획 보기' })).toHaveAttribute('href', '/settlement/dispatch');

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('배차일'), '2026-03-24');
    await user.click(screen.getByRole('button', { name: '정산 시작하기' }));

    await waitFor(() => {
      expect(deliveryRecordMocks.bootstrapDailySnapshotsFromDispatch).toHaveBeenCalled();
    });
    expect(screen.getByTestId('location')).toHaveTextContent('/settlement/process');
  });

  it('lets the settlement upload scope collapse into a horizontal launcher surface', async () => {
    render(
      <MemoryRouter initialEntries={['/settlement/dispatch']}>
        <DispatchUploadsPage
          client={{ request: vi.fn() }}
          dispatchBoardsPath="/settlement/dispatch"
          layoutVariant="settlement"
          session={systemAdminSession}
          settlementInputsPath="/settlement/process"
        />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '배차표 업로드', level: 1 })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '업로드 범위 접기' }));

    const collapsedSummary = screen.getByRole('button', { name: '업로드 범위 펼치기' });
    expect(collapsedSummary).toBeInTheDocument();
    expect(collapsedSummary).toHaveClass('dispatch-upload-scope-inline-summary');
    expect(screen.queryByRole('heading', { name: '회사, 플릿, 날짜', level: 2 })).not.toBeInTheDocument();
    expect(screen.queryByText('업로드와 정산 기준 범위를 먼저 고릅니다.')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('플릿')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('배차일')).not.toBeInTheDocument();

    await user.click(collapsedSummary);
    expect(screen.getByLabelText('플릿')).toBeInTheDocument();
    expect(screen.getByLabelText('배차일')).toBeInTheDocument();
  });

  it('hides company selection for company managers and locks the upload scope to the active company', async () => {
    render(
      <MemoryRouter>
        <DispatchUploadsPage client={{ request: vi.fn() }} session={companyManagerSession} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '배차표 업로드', level: 1 })).toBeInTheDocument();
    expect(screen.queryByLabelText('회사')).not.toBeInTheDocument();
    expect(screen.getByLabelText('플릿')).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('배차일'), '2026-03-24');

    await waitFor(() => {
      expect(dispatchRegistryMocks.listDispatchUploadBatches).toHaveBeenCalledWith(expect.anything(), {
        company_id: '30000000-0000-0000-0000-000000000002',
        fleet_id: '40000000-0000-0000-0000-000000000002',
        dispatch_date: expect.any(String),
        upload_status: 'confirmed',
      });
    });
  });
});
