import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { read, utils } from 'xlsx';

import type { DispatchUploadBatch, DriverProfile } from '../types';
import {
  confirmDispatchUpload,
  previewDispatchUpload,
  type DispatchUploadPreviewRowPayload,
} from '../api/dispatchRegistry';
import { getErrorMessage, type HttpClient } from '../api/http';

type DispatchUploadWizardProps = {
  client: HttpClient;
  companyId: string;
  fleetId: string;
  dispatchDate: string;
  drivers?: DriverProfile[];
  onDispatchDateDetected?: (dispatchDate: string) => void;
  onFleetCodeDetected?: (fleetCode: string | null) => void;
  pendingDetectedFleetCode?: string | null;
  requiresDetectedFleetCreation?: boolean;
  isCreatingDetectedFleet?: boolean;
  onApplyDetectedFleet?: () => void;
  onCreateDetectedFleet?: () => Promise<void> | void;
  onDismissDetectedFleet?: () => void;
  pendingMissingDriverNames?: string[];
  isCreatingMissingDrivers?: boolean;
  onCreateMissingDrivers?: () => Promise<void> | void;
  onExternalUserNamesChanged?: (externalUserNames: string[]) => void;
  dispatchPlanId?: string | null;
  confirmedBatches: DispatchUploadBatch[];
  isStartingSettlement?: boolean;
  onConfirmed?: () => Promise<void> | void;
  onStartSettlement?: () => Promise<void> | void;
};

type EditableUploadRow = DispatchUploadPreviewRowPayload & {
  row_index: number;
};

function parseNumericCell(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized) {
      return 0;
    }
    const parsed = Number.parseInt(normalized, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function mapWorksheetRows(rows: Record<string, unknown>[]) {
  return rows
    .map<DispatchUploadPreviewRowPayload | null>((row) => {
      const deliveryManagerName = String(row['배송매니저 이름'] ?? '').trim();
      const smallRegionText = String(row['소분류 권역'] ?? '').trim();
      const detailedRegionText = String(row['세분류 권역'] ?? '').trim();
      const boxCount = parseNumericCell(row['박스 수']);
      const householdCount = parseNumericCell(row['가구 수']);

      if (!deliveryManagerName && !smallRegionText && !detailedRegionText && boxCount === 0 && householdCount === 0) {
        return null;
      }

      return {
        delivery_manager_name: deliveryManagerName,
        small_region_text: smallRegionText,
        detailed_region_text: detailedRegionText,
        box_count: boxCount,
        household_count: householdCount,
      };
    })
    .filter((row): row is DispatchUploadPreviewRowPayload => row !== null);
}

function summarizeBatch(batch: DispatchUploadBatch | null) {
  if (!batch) {
    return null;
  }

  const matchedCount = batch.rows.filter((row) => Boolean(row.matched_driver_id)).length;
  const unmatchedCount = batch.rows.length - matchedCount;
  const totalBoxCount = batch.rows.reduce((sum, row) => sum + row.box_count, 0);

  return {
    matchedCount,
    unmatchedCount,
    totalBoxCount,
  };
}

function extractDispatchDateFromFilename(filename: string) {
  const normalized = filename.trim();
  if (!normalized) {
    return null;
  }

  function toValidDispatchDate(year: string, month: string, day: string) {
    const monthNumber = Number.parseInt(month, 10);
    const dayNumber = Number.parseInt(day, 10);
    if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) {
      return null;
    }

    const candidate = new Date(`${year}-${month}-${day}T00:00:00Z`);
    if (
      Number.isNaN(candidate.getTime()) ||
      candidate.getUTCFullYear() !== Number.parseInt(year, 10) ||
      candidate.getUTCMonth() + 1 !== monthNumber ||
      candidate.getUTCDate() !== dayNumber
    ) {
      return null;
    }

    return `${year}-${month}-${day}`;
  }

  const dottedMatch = normalized.match(/(20\d{2})[-_.](\d{2})[-_.](\d{2})/);
  if (dottedMatch) {
    return toValidDispatchDate(dottedMatch[1], dottedMatch[2], dottedMatch[3]);
  }

  const compactMatch = normalized.match(/(20\d{2})(\d{2})(\d{2})/);
  if (compactMatch) {
    return toValidDispatchDate(compactMatch[1], compactMatch[2], compactMatch[3]);
  }

  return null;
}

function summarizeEditableRows(rows: EditableUploadRow[], validatedBatch: DispatchUploadBatch | null) {
  const totalBoxCount = rows.reduce((sum, row) => sum + row.box_count, 0);
  const matchedCount = validatedBatch
    ? validatedBatch.rows.filter((row) => Boolean(row.matched_driver_id)).length
    : 0;
  return {
    matchedCount,
    unmatchedCount: Math.max(rows.length - matchedCount, 0),
    totalBoxCount,
  };
}

function extractFleetTokens(text: string) {
  return Array.from(new Set(text.toUpperCase().match(/[A-Z]+/g) ?? []));
}

function extractFleetCodeFromRows(rows: DispatchUploadPreviewRowPayload[]) {
  const fleetTokens = new Set<string>();

  rows.forEach((row) => {
    extractFleetTokens(row.small_region_text).forEach((token) => fleetTokens.add(token));
    extractFleetTokens(row.detailed_region_text).forEach((token) => fleetTokens.add(token));
  });

  if (fleetTokens.size !== 1) {
    return null;
  }

  return Array.from(fleetTokens)[0];
}

function extractExternalUserNamesFromRows(rows: DispatchUploadPreviewRowPayload[]) {
  const externalUserNames = new Set<string>();
  rows.forEach((row) => {
    const normalizedName = row.delivery_manager_name.trim();
    if (normalizedName) {
      externalUserNames.add(normalizedName);
    }
  });
  return Array.from(externalUserNames);
}

function clampColumnWidth(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatValidatedMatchLabel(
  row: DispatchUploadBatch['rows'][number] | undefined,
  driverById: Map<string, DriverProfile>,
) {
  if (!row) {
    return {
      status: '검증 대기',
      detail: '자동 검증 대기',
    };
  }

  if (row.matched_driver_id) {
    const matchedDriver = driverById.get(row.matched_driver_id);
    const driverName = matchedDriver?.name.trim() ?? '';
    const externalUserName =
      matchedDriver?.external_user_name.trim() || row.external_user_name.trim();
    return {
      status: '매칭 완료',
      detail: driverName ? `${driverName} - ${externalUserName}` : externalUserName,
    };
  }

  return {
    status: '미매칭',
    detail: '연결된 배송원 없음',
  };
}

function hasDraggedFiles(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

export function DispatchUploadWizard({
  client,
  companyId,
  fleetId,
  dispatchDate,
  drivers = [],
  onDispatchDateDetected,
  onFleetCodeDetected,
  pendingDetectedFleetCode = null,
  requiresDetectedFleetCreation = false,
  isCreatingDetectedFleet = false,
  onApplyDetectedFleet,
  onCreateDetectedFleet,
  onDismissDetectedFleet,
  pendingMissingDriverNames = [],
  isCreatingMissingDrivers = false,
  onCreateMissingDrivers,
  onExternalUserNamesChanged,
  dispatchPlanId,
  confirmedBatches,
  isStartingSettlement = false,
  onConfirmed,
  onStartSettlement,
}: DispatchUploadWizardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);
  const shouldAutoValidateRef = useRef(false);
  const [editableRows, setEditableRows] = useState<EditableUploadRow[]>([]);
  const [pendingDetectedDispatchDate, setPendingDetectedDispatchDate] = useState<string | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [previewBatch, setPreviewBatch] = useState<DispatchUploadBatch | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const isSettlementActionRunning = isStartingSettlement || isValidating || isConfirming;
  const previewSummary = useMemo(
    () =>
      editableRows.length > 0
        ? summarizeEditableRows(editableRows, previewBatch)
        : summarizeBatch(previewBatch),
    [editableRows, previewBatch],
  );
  const driverById = useMemo(
    () => new Map(drivers.map((driver) => [driver.driver_id, driver])),
    [drivers],
  );
  const sheetColumnWidths = useMemo(() => {
    const rows = editableRows;
    const nameWidth = clampColumnWidth(
      Math.max('배송매니저 이름'.length, ...rows.map((row) => row.delivery_manager_name.length)) + 2,
      10,
      18,
    );
    const smallRegionWidth = clampColumnWidth(
      Math.max('소분류 권역'.length, ...rows.map((row) => row.small_region_text.length)) + 2,
      8,
      14,
    );
    const detailedRegionWidth = clampColumnWidth(
      Math.max('세분류 권역'.length, ...rows.map((row) => row.detailed_region_text.length)) + 2,
      9,
      16,
    );
    const boxWidth = clampColumnWidth(
      Math.max('박스 수'.length, ...rows.map((row) => String(row.box_count).length)) + 2,
      6,
      9,
    );
    const householdWidth = clampColumnWidth(
      Math.max('가구 수'.length, ...rows.map((row) => String(row.household_count).length)) + 2,
      6,
      9,
    );
    const matchWidth = clampColumnWidth(
      Math.max(
        '배송원 매칭'.length,
        ...rows.map(
          (row) =>
            formatValidatedMatchLabel(
              previewBatch?.rows.find((candidate) => candidate.row_index === row.row_index),
              driverById,
            ).detail.length,
        ),
      ) + 2,
      12,
      22,
    );

    return {
      index: '3.5rem',
      deliveryManager: `${nameWidth}ch`,
      smallRegion: `${smallRegionWidth}ch`,
      detailedRegion: `${detailedRegionWidth}ch`,
      boxCount: `${boxWidth}ch`,
      householdCount: `${householdWidth}ch`,
      match: `${matchWidth}ch`,
    };
  }, [driverById, editableRows, previewBatch]);
  const isUploadDisabled = !companyId || isUploading || isValidating || isConfirming;
  const requiresFleetConfirmation = Boolean(pendingDetectedFleetCode);
  const requiresMissingDriverCreation = pendingMissingDriverNames.length > 0;
  const hasEditableRows = editableRows.length > 0;
  const effectiveDispatchDate = dispatchDate;
  const requiresDispatchDateConfirmation = Boolean(pendingDetectedDispatchDate && !dispatchDate);
  const canStartSettlement =
    Boolean(onStartSettlement) &&
    (hasEditableRows
      ? Boolean(companyId && fleetId && effectiveDispatchDate) &&
        !requiresDispatchDateConfirmation &&
        !requiresFleetConfirmation
      : previewBatch?.upload_status === 'confirmed' || confirmedBatches.length > 0);
  const toolbarMessage = editableRows.length
    ? requiresDispatchDateConfirmation
      ? `파일명에서 배차일 ${pendingDetectedDispatchDate}을 감지했습니다. 적용하면 자동 검증합니다.`
      : requiresFleetConfirmation
        ? `시트에서 플릿 ${pendingDetectedFleetCode}을 감지했습니다. 적용하면 자동 검증합니다.`
      : effectiveDispatchDate
        ? fleetId
          ? '업로드 후 자동 검증됩니다. 수정 내용은 정산 시작 시 다시 확인합니다.'
          : '플릿을 선택하거나 감지된 플릿을 승인하면 자동 검증합니다.'
        : '파일명에서 날짜를 찾지 못했거나 아직 확인하지 않았습니다. 배차일을 선택하면 자동 검증합니다.'
    : confirmedBatches.length > 0
      ? '확정 업로드 내역입니다.'
      : '파일을 올리면 자동 검증 후 정산 시작 단계로 넘길 수 있습니다.';

  useEffect(() => {
    if (dispatchDate) {
      setPendingDetectedDispatchDate(null);
    }
  }, [dispatchDate]);

  useEffect(() => {
    onExternalUserNamesChanged?.(
      extractExternalUserNamesFromRows(
        editableRows.map((row) => ({
          delivery_manager_name: row.delivery_manager_name,
          small_region_text: row.small_region_text,
          detailed_region_text: row.detailed_region_text,
          box_count: row.box_count,
          household_count: row.household_count,
        })),
      ),
    );
  }, [editableRows, onExternalUserNamesChanged]);

  async function runPreviewValidation(rows: EditableUploadRow[]) {
    if (!rows.length || !companyId || !fleetId || !effectiveDispatchDate) {
      return null;
    }

    setIsValidating(true);
    setErrorMessage(null);
    try {
      const response = await previewDispatchUpload(client, {
        company_id: companyId,
        fleet_id: fleetId,
        dispatch_date: effectiveDispatchDate,
        ...(dispatchPlanId ? { dispatch_plan_id: dispatchPlanId } : {}),
        source_filename: uploadedFilename ?? undefined,
        rows: rows.map((row) => ({
          delivery_manager_name: row.delivery_manager_name,
          small_region_text: row.small_region_text,
          detailed_region_text: row.detailed_region_text,
          box_count: row.box_count,
          household_count: row.household_count,
        })),
      });
      setPreviewBatch(response);
      return response;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return null;
    } finally {
      setIsValidating(false);
    }
  }

  async function confirmPreviewBatch(uploadBatchId: string) {
    setIsConfirming(true);
    setErrorMessage(null);
    try {
      const confirmedBatch = await confirmDispatchUpload(client, uploadBatchId);
      setPreviewBatch(confirmedBatch);
      await onConfirmed?.();
      return confirmedBatch;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return null;
    } finally {
      setIsConfirming(false);
    }
  }

  useEffect(() => {
    if (
      !shouldAutoValidateRef.current ||
      !editableRows.length ||
      !companyId ||
      !fleetId ||
      !effectiveDispatchDate ||
      requiresDispatchDateConfirmation ||
      requiresFleetConfirmation ||
      isUploading ||
      isValidating ||
      isConfirming
    ) {
      return;
    }

    shouldAutoValidateRef.current = false;
    void runPreviewValidation(editableRows);
  }, [
    companyId,
    editableRows,
    effectiveDispatchDate,
    fleetId,
    isConfirming,
    isUploading,
    isValidating,
    requiresDispatchDateConfirmation,
    requiresFleetConfirmation,
  ]);

  async function processUploadFile(file: File) {
    if (!file || !companyId) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    try {
      const nextDetectedDispatchDate = !dispatchDate ? extractDispatchDateFromFilename(file.name) : null;
      const workbook = read(await file.arrayBuffer(), { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const worksheetRows = utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
      const rows = mapWorksheetRows(worksheetRows);
      const nextDetectedFleetCode = extractFleetCodeFromRows(rows);

      if (!rows.length) {
        throw new Error('업로드할 배차 row가 없습니다.');
      }
      setUploadedFilename(file.name);
      setPendingDetectedDispatchDate(nextDetectedDispatchDate);
      shouldAutoValidateRef.current = true;
      setEditableRows(rows.map((row, index) => ({ ...row, row_index: index + 1 })));
      setPreviewBatch(null);
      onFleetCodeDetected?.(nextDetectedFleetCode);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await processUploadFile(file);
    event.target.value = '';
  }

  function handleUploadSurfaceClick() {
    if (isUploadDisabled) {
      return;
    }
    fileInputRef.current?.click();
  }

  function handleSurfaceDragEnter(event: DragEvent<HTMLDivElement>) {
    if (isUploadDisabled || !hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  }

  function handleSurfaceDragOver(event: DragEvent<HTMLDivElement>) {
    if (isUploadDisabled || !hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    if (!isDragActive) {
      setIsDragActive(true);
    }
  }

  function handleSurfaceDragLeave(event: DragEvent<HTMLDivElement>) {
    if (isUploadDisabled) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = Math.max(dragDepthRef.current - 1, 0);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  }

  function handleSurfaceDrop(event: DragEvent<HTMLDivElement>) {
    if (isUploadDisabled || !hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    void processUploadFile(file);
  }

  function updateEditableRow(
    rowIndex: number,
    field: keyof DispatchUploadPreviewRowPayload,
    value: string | number,
  ) {
    shouldAutoValidateRef.current = false;
    setEditableRows((currentRows) =>
      currentRows.map((row) =>
        row.row_index === rowIndex
          ? {
              ...row,
              [field]:
                field === 'box_count' || field === 'household_count'
                  ? Number.parseInt(String(value), 10) || 0
                  : String(value),
            }
          : row,
      ),
    );
    setPreviewBatch(null);
  }

  function handleApplyDetectedDispatchDate() {
    if (!pendingDetectedDispatchDate) {
      return;
    }
    onDispatchDateDetected?.(pendingDetectedDispatchDate);
    setPendingDetectedDispatchDate(null);
  }

  function handleChooseDispatchDateManually() {
    setPendingDetectedDispatchDate(null);
  }

  async function handleStartSettlement() {
    if (!canStartSettlement || !onStartSettlement || isSettlementActionRunning) {
      return;
    }

    if (typeof window !== 'undefined' && !window.confirm('정산을 시작하시겠습니까?')) {
      return;
    }

    if (editableRows.length > 0) {
      const nextPreviewBatch = await runPreviewValidation(editableRows);
      if (!nextPreviewBatch) {
        return;
      }

      if (nextPreviewBatch.upload_status === 'draft') {
        const confirmedBatch = await confirmPreviewBatch(nextPreviewBatch.upload_batch_id);
        if (!confirmedBatch) {
          return;
        }
      }
    }

    await onStartSettlement();
  }

  return (
    <section className="panel dispatch-upload-panel">
      <div className="panel-header panel-header-inline">
        <div>
          <p className="panel-kicker">배차 업로드</p>
          <h2>업로드 파일</h2>
        </div>
        <button
          className="button primary"
          disabled={!canStartSettlement || isSettlementActionRunning}
          onClick={() => void handleStartSettlement()}
          type="button"
        >
          {isSettlementActionRunning ? '정산 준비 중...' : '정산 시작하기'}
        </button>
      </div>
      <input
        accept=".xlsx,.xls,.csv"
        aria-label="배차표 업로드"
        disabled={isUploadDisabled}
        onChange={handleFileUpload}
        ref={fileInputRef}
        style={{ display: 'none' }}
        type="file"
      />
      <div className="panel-toolbar">
        <span className="table-meta">{toolbarMessage}</span>
        {editableRows.length > 0 ? (
          <div className="panel-toolbar-actions">
            {previewBatch ? (
              <span className="status-badge">{previewBatch.upload_status === 'confirmed' ? '확정 완료' : '검증 완료'}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      {requiresDispatchDateConfirmation ? (
        <div className="dispatch-upload-date-detection">
          <div>
            <strong>감지된 배차일 {pendingDetectedDispatchDate}</strong>
            <p>지원 패턴: YYYY-MM-DD, YYYY_MM_DD, YYYYMMDD</p>
          </div>
          <div className="panel-toolbar-actions">
            <button
              className="button secondary small dispatch-upload-detection-action"
              onClick={handleApplyDetectedDispatchDate}
              type="button"
            >
              감지된 날짜 적용
            </button>
            <button className="button ghost small" onClick={handleChooseDispatchDateManually} type="button">
              직접 선택
            </button>
          </div>
        </div>
      ) : null}
      {pendingDetectedFleetCode ? (
        <div className="dispatch-upload-date-detection">
          <div>
            <strong>감지된 플릿 {pendingDetectedFleetCode}</strong>
            <p>
              {requiresDetectedFleetCreation
                ? '현재 회사에 일치하는 플릿이 없습니다. 생성하시겠습니까?'
                : '업로드 내용과 일치하는 플릿으로 전환합니다.'}
            </p>
          </div>
          <div className="panel-toolbar-actions">
            {requiresDetectedFleetCreation ? (
              <button
                className="button secondary small dispatch-upload-detection-action"
                disabled={isCreatingDetectedFleet}
                onClick={() => void onCreateDetectedFleet?.()}
                type="button"
              >
                {isCreatingDetectedFleet ? '생성 중...' : '플릿 생성'}
              </button>
            ) : (
              <button
                className="button secondary small dispatch-upload-detection-action"
                onClick={onApplyDetectedFleet}
                type="button"
              >
                감지된 플릿 적용
              </button>
            )}
            <button className="button ghost small" onClick={onDismissDetectedFleet} type="button">
              직접 선택
            </button>
          </div>
        </div>
      ) : null}
      {requiresMissingDriverCreation ? (
        <div className="dispatch-upload-date-detection">
          <div>
            <strong>미등록 배송원 {pendingMissingDriverNames.length}명</strong>
            <p>배송원.외부계정명 기준으로 누락된 배송원 프로필을 생성합니다.</p>
            <p>{pendingMissingDriverNames.join(', ')}</p>
          </div>
          <div className="panel-toolbar-actions">
            <button
              className="button secondary small dispatch-upload-detection-action"
              disabled={isCreatingMissingDrivers}
              onClick={() => void onCreateMissingDrivers?.()}
              type="button"
            >
              {isCreatingMissingDrivers ? '생성 중...' : '배송원 생성'}
            </button>
          </div>
        </div>
      ) : null}
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

      <div
        aria-label="배차표 업로드 영역"
        className={`dispatch-upload-surface${editableRows.length > 0 ? ' has-sheet' : ''}${isDragActive ? ' is-drag-active' : ''}`}
        onDragEnter={handleSurfaceDragEnter}
        onDragLeave={handleSurfaceDragLeave}
        onDragOver={handleSurfaceDragOver}
        onDrop={handleSurfaceDrop}
        role="group"
      >
        <div className="dispatch-upload-surface-body">
          {editableRows.length > 0 ? (
            <div className="stack">
              <div className="dispatch-upload-sheet-summary">
                <div className="dispatch-upload-file-meta">
                  <span>파일</span>
                  <strong>{uploadedFilename || previewBatch?.source_filename || '이름 없음'}</strong>
                </div>
                <div className="dispatch-upload-stat-chips">
                  <span className="dispatch-upload-stat-chip">매칭 {previewSummary?.matchedCount ?? 0}</span>
                  <span className="dispatch-upload-stat-chip">확인 {previewSummary?.unmatchedCount ?? 0}</span>
                  <span className="dispatch-upload-stat-chip">박스 {previewSummary?.totalBoxCount ?? 0}</span>
                </div>
              </div>

              <table className="table dispatch-upload-sheet">
                <colgroup>
                  <col style={{ width: sheetColumnWidths.index }} />
                  <col style={{ width: sheetColumnWidths.deliveryManager }} />
                  <col style={{ width: sheetColumnWidths.smallRegion }} />
                  <col style={{ width: sheetColumnWidths.detailedRegion }} />
                  <col style={{ width: sheetColumnWidths.boxCount }} />
                  <col style={{ width: sheetColumnWidths.householdCount }} />
                  <col style={{ width: sheetColumnWidths.match }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>배송매니저 이름</th>
                    <th>소분류 권역</th>
                    <th>세분류 권역</th>
                    <th>박스 수</th>
                    <th>가구 수</th>
                    <th>배송원 매칭</th>
                  </tr>
                </thead>
                <tbody>
                  {editableRows.map((row) => {
                    const validatedRow = previewBatch?.rows.find((candidate) => candidate.row_index === row.row_index);
                    const matchLabel = formatValidatedMatchLabel(validatedRow, driverById);

                    return (
                      <tr key={row.row_index}>
                        <td>{row.row_index}</td>
                        <td>
                          <input
                            aria-label={`배송매니저 이름 ${row.row_index}`}
                            onChange={(event) =>
                              updateEditableRow(row.row_index, 'delivery_manager_name', event.target.value)
                            }
                            value={row.delivery_manager_name}
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`소분류 권역 ${row.row_index}`}
                            onChange={(event) => updateEditableRow(row.row_index, 'small_region_text', event.target.value)}
                            value={row.small_region_text}
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`세분류 권역 ${row.row_index}`}
                            onChange={(event) =>
                              updateEditableRow(row.row_index, 'detailed_region_text', event.target.value)
                            }
                            value={row.detailed_region_text}
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`박스 수 ${row.row_index}`}
                            inputMode="numeric"
                            onChange={(event) => updateEditableRow(row.row_index, 'box_count', event.target.value)}
                            value={row.box_count}
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`가구 수 ${row.row_index}`}
                            inputMode="numeric"
                            onChange={(event) => updateEditableRow(row.row_index, 'household_count', event.target.value)}
                            value={row.household_count}
                          />
                        </td>
                        <td>
                          <div className="dispatch-upload-match-cell">
                            <strong>{matchLabel.status}</strong>
                            <small>{matchLabel.detail}</small>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : confirmedBatches.length ? (
            <div className="dispatch-upload-history">
              {confirmedBatches.map((batch) => (
                <div className="list-card" key={batch.upload_batch_id}>
                  <div className="list-card-header">
                    <div>
                      <h3>{batch.source_filename || '업로드 파일'}</h3>
                      <p>
                        {batch.rows.length}개 row · {batch.rows.filter((row) => Boolean(row.matched_driver_id)).length}개
                        매칭
                      </p>
                    </div>
                    <span className="status-badge">확정됨</span>
                  </div>
                  <div className="stack tight">
                    {batch.rows.slice(0, 3).map((row) => (
                      <p key={row.upload_row_id}>
                        {row.external_user_name} · {row.small_region_text || '-'} · 박스 {row.box_count}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <button
              className="dispatch-upload-empty-surface"
              disabled={isUploadDisabled}
              onClick={handleUploadSurfaceClick}
              type="button"
            >
              <div className="dispatch-upload-empty-copy">
                <h3>파일을 드래그해 업로드 하세요.</h3>
                <p>또는 클릭해 배차표 파일을 선택할 수 있습니다.</p>
              </div>
            </button>
          )}
        </div>
        {isDragActive ? (
          <div className="dispatch-upload-surface-overlay">
            <strong>업로드 + 중복 덮어씌워짐</strong>
            <span>현재 시트와 요약 정보가 새 파일 기준으로 즉시 교체됩니다.</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
