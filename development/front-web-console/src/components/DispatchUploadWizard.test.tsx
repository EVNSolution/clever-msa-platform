import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DispatchUploadWizard } from './DispatchUploadWizard';

const dispatchRegistryMocks = vi.hoisted(() => ({
  previewDispatchUpload: vi.fn(),
  confirmDispatchUpload: vi.fn(),
}));

const xlsxMocks = vi.hoisted(() => ({
  read: vi.fn(),
  sheetToJson: vi.fn(),
}));

vi.mock('../api/dispatchRegistry', () => ({
  previewDispatchUpload: dispatchRegistryMocks.previewDispatchUpload,
  confirmDispatchUpload: dispatchRegistryMocks.confirmDispatchUpload,
}));

vi.mock('xlsx', () => ({
  read: xlsxMocks.read,
  utils: {
    sheet_to_json: xlsxMocks.sheetToJson,
  },
}));

describe('DispatchUploadWizard', () => {
  beforeEach(() => {
    dispatchRegistryMocks.previewDispatchUpload.mockReset();
    dispatchRegistryMocks.confirmDispatchUpload.mockReset();
    xlsxMocks.read.mockReset();
    xlsxMocks.sheetToJson.mockReset();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  function mockSingleWorksheetRow() {
    xlsxMocks.read.mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} },
    });
    xlsxMocks.sheetToJson.mockReturnValue([
      {
        '배송매니저 이름': 'ZD홍길동',
        '소분류 권역': '10H2',
        '세분류 권역': '10H2-가',
        '박스 수': 133,
        '가구 수': 90,
      },
    ]);
  }

  function createSpreadsheetFile(name: string, content = 'dummy') {
    const file = new File([content], name, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
    return file;
  }

  it('does not propose a fleet code when multiple uppercase region codes are mixed', async () => {
    xlsxMocks.read.mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} },
    });
    xlsxMocks.sheetToJson.mockReturnValue([
      {
        '배송매니저 이름': 'ZD홍길동',
        '소분류 권역': '10H2',
        '세분류 권역': '10H2-가',
        '박스 수': 133,
        '가구 수': 90,
      },
      {
        '배송매니저 이름': 'ZD김영희',
        '소분류 권역': '10C2',
        '세분류 권역': '10C2-나',
        '박스 수': 211,
        '가구 수': 120,
      },
    ]);
    const handleFleetCodeDetected = vi.fn();

    render(
      <DispatchUploadWizard
        client={{ request: vi.fn() }}
        confirmedBatches={[]}
        companyId="company-1"
        fleetId=""
        dispatchDate="2026-03-24"
        onFleetCodeDetected={handleFleetCodeDetected}
      />,
    );

    const user = userEvent.setup();
    const file = createSpreadsheetFile('dispatch.xlsx');

    await user.upload(screen.getByLabelText('배차표 업로드'), file);

    expect(await screen.findByDisplayValue('ZD홍길동')).toBeInTheDocument();
    expect(handleFleetCodeDetected).toHaveBeenCalledWith(null);
  });

  it('automatically validates uploaded rows right after upload', async () => {
    xlsxMocks.read.mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} },
    });
    xlsxMocks.sheetToJson.mockReturnValue([
      {
        '배송매니저 이름': 'ZD홍길동',
        '소분류 권역': '10H2',
        '세분류 권역': '10H2-가',
        '박스 수': 133,
        '가구 수': 90,
      },
    ]);
    dispatchRegistryMocks.previewDispatchUpload.mockResolvedValue({
      upload_batch_id: 'upload-batch-1',
      dispatch_plan_id: null,
      company_id: 'company-1',
      fleet_id: 'fleet-1',
      dispatch_date: '2026-03-24',
      source_filename: 'dispatch.xlsx',
      upload_status: 'draft',
      created_at: '2026-03-24T09:00:00Z',
      updated_at: '2026-03-24T09:00:00Z',
      rows: [
        {
          upload_row_id: 'upload-row-1',
          row_index: 1,
          external_user_name: 'ZD김영희',
          small_region_text: '10H2',
          detailed_region_text: '10H2-가',
          box_count: 144,
          household_count: 90,
          matched_driver_id: 'driver-1',
        },
      ],
    });

    render(
      <DispatchUploadWizard
        client={{ request: vi.fn() }}
        confirmedBatches={[]}
        companyId="company-1"
        fleetId="fleet-1"
        dispatchDate="2026-03-24"
        drivers={[
          {
            driver_id: 'driver-1',
            route_no: 1,
            company_id: 'company-1',
            fleet_id: 'fleet-1',
            name: '김영희',
            external_user_name: 'ZD김영희',
            ev_id: '',
            phone_number: '',
            address: '',
          },
        ]}
      />,
    );

    const user = userEvent.setup();
    const file = createSpreadsheetFile('dispatch.xlsx');

    await user.upload(screen.getByLabelText('배차표 업로드'), file);

    expect(await screen.findByDisplayValue('ZD홍길동')).toBeInTheDocument();
    expect(screen.getByDisplayValue('133')).toBeInTheDocument();
    expect(screen.getByDisplayValue('90')).toBeInTheDocument();

    await waitFor(() => {
      expect(dispatchRegistryMocks.previewDispatchUpload).toHaveBeenCalledWith(expect.anything(), {
        company_id: 'company-1',
        fleet_id: 'fleet-1',
        dispatch_date: '2026-03-24',
        source_filename: 'dispatch.xlsx',
        rows: [
          {
            delivery_manager_name: 'ZD홍길동',
            small_region_text: '10H2',
            detailed_region_text: '10H2-가',
            box_count: 133,
            household_count: 90,
          },
        ],
      });
    });
    expect(await screen.findByText('검증 완료')).toBeInTheDocument();
    expect(screen.getByText('김영희 - ZD김영희')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '서버 검증' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '업로드 확정' })).not.toBeInTheDocument();
  });

  it('shows a simple drag-and-drop upload surface before any file is selected', () => {
    render(
      <DispatchUploadWizard
        client={{ request: vi.fn() }}
        confirmedBatches={[]}
        companyId="company-1"
        fleetId="fleet-1"
        dispatchDate=""
      />,
    );

    expect(screen.getByRole('group', { name: '배차표 업로드 영역' })).toBeInTheDocument();
    expect(screen.getByText('파일을 드래그해 업로드 하세요.')).toBeInTheDocument();
    expect(screen.getByText('또는 클릭해 배차표 파일을 선택할 수 있습니다.')).toBeInTheDocument();
    expect(screen.queryByText('예시 row')).not.toBeInTheDocument();
  });

  it('replaces the current sheet when a new file is dropped onto the upload surface', async () => {
    xlsxMocks.read
      .mockReturnValueOnce({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      })
      .mockReturnValueOnce({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
    xlsxMocks.sheetToJson
      .mockReturnValueOnce([
        {
          '배송매니저 이름': 'ZD홍길동',
          '소분류 권역': '10H2',
          '세분류 권역': '10H2-가',
          '박스 수': 133,
          '가구 수': 90,
        },
      ])
      .mockReturnValueOnce([
        {
          '배송매니저 이름': 'ZD김영희',
          '소분류 권역': '11A1',
          '세분류 권역': '11A1-나',
          '박스 수': 211,
          '가구 수': 120,
        },
      ]);

    render(
      <DispatchUploadWizard
        client={{ request: vi.fn() }}
        confirmedBatches={[]}
        companyId="company-1"
        fleetId="fleet-1"
        dispatchDate="2026-03-24"
      />,
    );

    const user = userEvent.setup();
    const initialFile = createSpreadsheetFile('dispatch-first.xlsx', 'first');

    await user.upload(screen.getByLabelText('배차표 업로드'), initialFile);

    expect(await screen.findByDisplayValue('ZD홍길동')).toBeInTheDocument();
    expect(screen.getByText('dispatch-first.xlsx')).toBeInTheDocument();

    const replacementFile = createSpreadsheetFile('dispatch-second.xlsx', 'second');

    const uploadSurface = screen.getByRole('group', { name: '배차표 업로드 영역' });
    fireEvent.dragEnter(uploadSurface, {
      dataTransfer: {
        files: [replacementFile],
        items: [{ kind: 'file', type: replacementFile.type }],
        types: ['Files'],
      },
    });

    expect(screen.getByText('업로드 + 중복 덮어씌워짐')).toBeInTheDocument();

    fireEvent.drop(uploadSurface, {
      dataTransfer: {
        files: [replacementFile],
        items: [{ kind: 'file', type: replacementFile.type }],
        types: ['Files'],
      },
    });

    expect(await screen.findByDisplayValue('ZD김영희')).toBeInTheDocument();
    expect(screen.getByText('dispatch-second.xlsx')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('ZD홍길동')).not.toBeInTheDocument();
  });

  it('renders a compact inline summary above the uploaded sheet', async () => {
    mockSingleWorksheetRow();

    render(
      <DispatchUploadWizard
        client={{ request: vi.fn() }}
        confirmedBatches={[]}
        companyId="company-1"
        fleetId="fleet-1"
        dispatchDate="2026-03-24"
      />,
    );

    const user = userEvent.setup();
    const file = createSpreadsheetFile('dispatch.xlsx');

    await user.upload(screen.getByLabelText('배차표 업로드'), file);

    expect(await screen.findByDisplayValue('ZD홍길동')).toBeInTheDocument();
    expect(screen.getByText('파일')).toBeInTheDocument();
    expect(screen.getByText('dispatch.xlsx')).toBeInTheDocument();
    expect(screen.getByText('매칭 0')).toBeInTheDocument();
    expect(screen.getByText('확인 1')).toBeInTheDocument();
    expect(screen.getByText('박스 133')).toBeInTheDocument();
  });

  it('asks for confirmation before using a detected dispatch date from the filename', async () => {
    mockSingleWorksheetRow();
    dispatchRegistryMocks.previewDispatchUpload.mockResolvedValue({
      upload_batch_id: 'upload-batch-1',
      dispatch_plan_id: null,
      company_id: 'company-1',
      fleet_id: 'fleet-1',
      dispatch_date: '2026-02-13',
      source_filename: '배차현황_2026-02-13 02_29_07.xlsx',
      upload_status: 'draft',
      created_at: '2026-03-24T09:00:00Z',
      updated_at: '2026-03-24T09:00:00Z',
      rows: [],
    });
    const handleDispatchDateDetected = vi.fn();

    function StatefulWizard() {
      const [dispatchDate, setDispatchDate] = useState('');

      return (
        <DispatchUploadWizard
          client={{ request: vi.fn() }}
          companyId="company-1"
          confirmedBatches={[]}
          dispatchDate={dispatchDate}
          fleetId="fleet-1"
          onDispatchDateDetected={(nextDispatchDate) => {
            handleDispatchDateDetected(nextDispatchDate);
            setDispatchDate(nextDispatchDate);
          }}
        />
      );
    }

    render(<StatefulWizard />);

    const user = userEvent.setup();
    const file = createSpreadsheetFile('배차현황_2026-02-13 02_29_07.xlsx');

    await user.upload(screen.getByLabelText('배차표 업로드'), file);

    expect(await screen.findByDisplayValue('ZD홍길동')).toBeInTheDocument();
    expect(handleDispatchDateDetected).not.toHaveBeenCalled();
    expect(screen.getByText('감지된 배차일 2026-02-13')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '정산 시작하기' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '감지된 날짜 적용' }));

    expect(handleDispatchDateDetected).toHaveBeenCalledWith('2026-02-13');
    await waitFor(() => {
      expect(dispatchRegistryMocks.previewDispatchUpload).toHaveBeenCalledWith(expect.anything(), {
        company_id: 'company-1',
        fleet_id: 'fleet-1',
        dispatch_date: '2026-02-13',
        source_filename: '배차현황_2026-02-13 02_29_07.xlsx',
        rows: [
          {
            delivery_manager_name: 'ZD홍길동',
            small_region_text: '10H2',
            detailed_region_text: '10H2-가',
            box_count: 133,
            household_count: 90,
          },
        ],
      });
    });
  });

  it.each([
    ['underscore pattern', '배차현황_2026_02_13.xlsx', '2026-02-13'],
    ['compact pattern', '배차현황_20260213.xlsx', '2026-02-13'],
  ])('detects dispatch date from %s', async (_label, filename, expectedDate) => {
    mockSingleWorksheetRow();
    const handleDispatchDateDetected = vi.fn();

    function StatefulWizard() {
      const [dispatchDate, setDispatchDate] = useState('');

      return (
        <DispatchUploadWizard
          client={{ request: vi.fn() }}
          companyId="company-1"
          confirmedBatches={[]}
          dispatchDate={dispatchDate}
          fleetId="fleet-1"
          onDispatchDateDetected={(nextDispatchDate) => {
            handleDispatchDateDetected(nextDispatchDate);
            setDispatchDate(nextDispatchDate);
          }}
        />
      );
    }

    render(<StatefulWizard />);

    const user = userEvent.setup();
    const file = createSpreadsheetFile(filename);

    await user.upload(screen.getByLabelText('배차표 업로드'), file);

    expect(await screen.findByDisplayValue('ZD홍길동')).toBeInTheDocument();
    expect(screen.getByText(`감지된 배차일 ${expectedDate}`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '감지된 날짜 적용' }));

    expect(handleDispatchDateDetected).toHaveBeenCalledWith(expectedDate);
  });

  it('falls back to manual date selection when the filename does not match a supported pattern', async () => {
    mockSingleWorksheetRow();

    render(
      <DispatchUploadWizard
        client={{ request: vi.fn() }}
        companyId="company-1"
        confirmedBatches={[]}
        dispatchDate=""
        fleetId="fleet-1"
      />,
    );

    const user = userEvent.setup();
    const file = createSpreadsheetFile('배차현황_13-02-2026.xlsx');

    await user.upload(screen.getByLabelText('배차표 업로드'), file);

    expect(await screen.findByDisplayValue('ZD홍길동')).toBeInTheDocument();
    expect(screen.queryByText(/감지된 배차일/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '정산 시작하기' })).toBeDisabled();
    expect(
      screen.getByText('파일명에서 날짜를 찾지 못했거나 아직 확인하지 않았습니다. 배차일을 선택하면 자동 검증합니다.'),
    ).toBeInTheDocument();
  });

  it.each([
    '배차현황_2026-13-40.xlsx',
    '배차현황_2026_02_31.xlsx',
    '배차현황_20260230.xlsx',
  ])('falls back to manual date selection when filename contains an invalid calendar date: %s', async (filename) => {
    mockSingleWorksheetRow();

    render(
      <DispatchUploadWizard
        client={{ request: vi.fn() }}
        companyId="company-1"
        confirmedBatches={[]}
        dispatchDate=""
        fleetId="fleet-1"
      />,
    );

    const user = userEvent.setup();
    const file = createSpreadsheetFile(filename);

    await user.upload(screen.getByLabelText('배차표 업로드'), file);

    expect(await screen.findByDisplayValue('ZD홍길동')).toBeInTheDocument();
    expect(screen.queryByText(/감지된 배차일/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '정산 시작하기' })).toBeDisabled();
    expect(
      screen.getByText('파일명에서 날짜를 찾지 못했거나 아직 확인하지 않았습니다. 배차일을 선택하면 자동 검증합니다.'),
    ).toBeInTheDocument();
  });

  it('revalidates, confirms, and starts settlement from the single header CTA', async () => {
    xlsxMocks.read.mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} },
    });
    xlsxMocks.sheetToJson.mockReturnValue([
      {
        '배송매니저 이름': 'ZD홍길동',
        '소분류 권역': '10H2',
        '세분류 권역': '10H2-가',
        '박스 수': 133,
        '가구 수': 90,
      },
    ]);
    dispatchRegistryMocks.previewDispatchUpload
      .mockResolvedValueOnce({
        upload_batch_id: 'upload-batch-1',
        dispatch_plan_id: null,
        company_id: 'company-1',
        fleet_id: 'fleet-1',
        dispatch_date: '2026-03-24',
        source_filename: 'dispatch.xlsx',
        upload_status: 'draft',
        created_at: '2026-03-24T09:00:00Z',
        updated_at: '2026-03-24T09:00:00Z',
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
      })
      .mockResolvedValueOnce({
        upload_batch_id: 'upload-batch-1',
        dispatch_plan_id: null,
        company_id: 'company-1',
        fleet_id: 'fleet-1',
        dispatch_date: '2026-03-24',
        source_filename: 'dispatch.xlsx',
        upload_status: 'draft',
        created_at: '2026-03-24T09:00:00Z',
        updated_at: '2026-03-24T09:05:00Z',
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
      });
    dispatchRegistryMocks.confirmDispatchUpload.mockResolvedValue({
      upload_batch_id: 'upload-batch-1',
      dispatch_plan_id: null,
      company_id: 'company-1',
      fleet_id: 'fleet-1',
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
    });
    const handleConfirmed = vi.fn().mockResolvedValue(undefined);
    const handleStartSettlement = vi.fn().mockResolvedValue(undefined);

    render(
      <DispatchUploadWizard
        client={{ request: vi.fn() }}
        confirmedBatches={[]}
        companyId="company-1"
        fleetId="fleet-1"
        dispatchDate="2026-03-24"
        onConfirmed={handleConfirmed}
        onStartSettlement={handleStartSettlement}
      />,
    );

    const user = userEvent.setup();
    const file = createSpreadsheetFile('dispatch.xlsx');

    await user.upload(screen.getByLabelText('배차표 업로드'), file);
    await user.click(await screen.findByRole('button', { name: '정산 시작하기' }));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('정산을 시작하시겠습니까?');
      expect(dispatchRegistryMocks.previewDispatchUpload).toHaveBeenCalledTimes(2);
      expect(dispatchRegistryMocks.confirmDispatchUpload).toHaveBeenCalledWith(
        expect.anything(),
        'upload-batch-1',
      );
      expect(handleConfirmed).toHaveBeenCalled();
      expect(handleStartSettlement).toHaveBeenCalled();
    });
    expect(await screen.findByText('확정 완료')).toBeInTheDocument();
  });
});
