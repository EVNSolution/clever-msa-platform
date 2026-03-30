import { useEffect, useState, type FormEvent } from 'react';

import {
  createTerminal,
  createTerminalInstallation,
  listTerminalInstallations,
  listTerminals,
  updateTerminal,
  updateTerminalInstallation,
  type TerminalInstallationPayload,
  type TerminalPayload,
} from '../api/terminals';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { TerminalInstallation, TerminalRegistry } from '../types';
import {
  formatInstallationStatusLabel,
  formatLifecycleStatusLabel,
  formatProtectedIdentifier,
} from '../uiLabels';

type TerminalsPageProps = {
  client: HttpClient;
};

type TerminalFormState = {
  manufacturer_company_id: string;
  imei: string;
  iccid: string;
  firmware_version: string;
  protocol_version: string;
  app_version: string;
  terminal_status: string;
};

type InstallationFormState = {
  terminal_id: string;
  vehicle_id: string;
};

function createEmptyTerminalForm(): TerminalFormState {
  return {
    manufacturer_company_id: '',
    imei: '',
    iccid: '',
    firmware_version: '1.0.0',
    protocol_version: '1.0',
    app_version: '1.0.0',
    terminal_status: 'active',
  };
}

function createEmptyInstallationForm(): InstallationFormState {
  return {
    terminal_id: '',
    vehicle_id: '',
  };
}

function createTimestamp() {
  return new Date().toISOString();
}

function toTerminalPayload(form: TerminalFormState): TerminalPayload {
  return {
    manufacturer_company_id: form.manufacturer_company_id.trim(),
    imei: form.imei.trim(),
    iccid: form.iccid.trim(),
    firmware_version: form.firmware_version.trim(),
    protocol_version: form.protocol_version.trim(),
    app_version: form.app_version.trim(),
    terminal_status: form.terminal_status,
  };
}

function toInstallationPayload(form: InstallationFormState): TerminalInstallationPayload {
  return {
    terminal_id: form.terminal_id.trim(),
    vehicle_id: form.vehicle_id.trim(),
    installation_status: 'installed',
    installed_at: createTimestamp(),
    removed_at: null,
  };
}

export function TerminalsPage({ client }: TerminalsPageProps) {
  const [terminals, setTerminals] = useState<TerminalRegistry[]>([]);
  const [installations, setInstallations] = useState<TerminalInstallation[]>([]);
  const [terminalForm, setTerminalForm] = useState<TerminalFormState>(createEmptyTerminalForm());
  const [installationForm, setInstallationForm] = useState<InstallationFormState>(
    createEmptyInstallationForm(),
  );
  const [editingTerminalId, setEditingTerminalId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshData() {
    const [nextTerminals, nextInstallations] = await Promise.all([
      listTerminals(client),
      listTerminalInstallations(client),
    ]);
    setTerminals(nextTerminals);
    setInstallations(nextInstallations);
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [nextTerminals, nextInstallations] = await Promise.all([
          listTerminals(client),
          listTerminalInstallations(client),
        ]);
        if (!ignore) {
          setTerminals(nextTerminals);
          setInstallations(nextInstallations);
        }
      } catch (error) {
        if (!ignore) {
          setTerminals([]);
          setInstallations([]);
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [client]);

  function resetTerminalForm() {
    setEditingTerminalId(null);
    setTerminalForm(createEmptyTerminalForm());
  }

  function resetInstallationForm() {
    setInstallationForm(createEmptyInstallationForm());
  }

  function handleEditTerminal(terminal: TerminalRegistry) {
    setErrorMessage(null);
    setEditingTerminalId(terminal.terminal_id);
    setTerminalForm({
      manufacturer_company_id: terminal.manufacturer_company_id,
      imei: terminal.imei,
      iccid: terminal.iccid,
      firmware_version: terminal.firmware_version,
      protocol_version: terminal.protocol_version,
      app_version: terminal.app_version,
      terminal_status: terminal.terminal_status,
    });
  }

  async function handleTerminalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      const payload = toTerminalPayload(terminalForm);
      if (editingTerminalId) {
        await updateTerminal(client, editingTerminalId, payload);
      } else {
        await createTerminal(client, payload);
      }
      await refreshData();
      resetTerminalForm();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleInstallationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createTerminalInstallation(client, toInstallationPayload(installationForm));
      await refreshData();
      resetInstallationForm();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleRemoveInstallation(terminalInstallationId: string) {
    setErrorMessage(null);
    try {
      await updateTerminalInstallation(client, terminalInstallationId, {
        installation_status: 'removed',
        removed_at: createTimestamp(),
      });
      await refreshData();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  return (
    <div className="data-grid two-columns wide-left">
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">단말기 관리</p>
          <h2>{editingTerminalId ? '단말기 수정' : '단말기 생성'}</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        <form className="form-grid" onSubmit={handleTerminalSubmit}>
          <label className="field">
            <span>제조사 회사 ID</span>
            <input
              onChange={(event) =>
                setTerminalForm((current) => ({ ...current, manufacturer_company_id: event.target.value }))
              }
              value={terminalForm.manufacturer_company_id}
            />
          </label>
          <label className="field">
            <span>IMEI</span>
            <input
              onChange={(event) => setTerminalForm((current) => ({ ...current, imei: event.target.value }))}
              type="password"
              value={terminalForm.imei}
            />
          </label>
          <label className="field">
            <span>ICCID</span>
            <input
              onChange={(event) => setTerminalForm((current) => ({ ...current, iccid: event.target.value }))}
              type="password"
              value={terminalForm.iccid}
            />
          </label>
          <label className="field">
            <span>펌웨어 버전</span>
            <input
              onChange={(event) =>
                setTerminalForm((current) => ({ ...current, firmware_version: event.target.value }))
              }
              value={terminalForm.firmware_version}
            />
          </label>
          <label className="field">
            <span>프로토콜 버전</span>
            <input
              onChange={(event) =>
                setTerminalForm((current) => ({ ...current, protocol_version: event.target.value }))
              }
              value={terminalForm.protocol_version}
            />
          </label>
          <label className="field">
            <span>앱 버전</span>
            <input
              onChange={(event) =>
                setTerminalForm((current) => ({ ...current, app_version: event.target.value }))
              }
              value={terminalForm.app_version}
            />
          </label>
          <label className="field">
            <span>단말기 상태</span>
            <select
              onChange={(event) =>
                setTerminalForm((current) => ({ ...current, terminal_status: event.target.value }))
              }
              value={terminalForm.terminal_status}
            >
              <option value="active">운영</option>
              <option value="inactive">중지</option>
              <option value="retired">퇴역</option>
            </select>
          </label>
          <div className="form-actions">
            <button className="button primary" type="submit">
              {editingTerminalId ? '단말기 수정' : '단말기 생성'}
            </button>
            <button className="button ghost" onClick={resetTerminalForm} type="button">
              초기화
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">단말기 레지스트리</p>
          <h2>단말기 목록</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">단말기를 불러오는 중입니다...</p>
        ) : errorMessage ? null : terminals.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>단말기</th>
                <th>IMEI</th>
                <th>ICCID</th>
                <th>상태</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {terminals.map((terminal) => (
                <tr key={terminal.terminal_id}>
                  <td><code>{formatProtectedIdentifier(terminal.terminal_id)}</code></td>
                  <td>{formatProtectedIdentifier(terminal.imei)}</td>
                  <td>{formatProtectedIdentifier(terminal.iccid)}</td>
                  <td>{formatLifecycleStatusLabel(terminal.terminal_status)}</td>
                  <td>
                    <button
                      className="button ghost small"
                      onClick={() => handleEditTerminal(terminal)}
                      type="button"
                    >
                      단말기 수정
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">등록된 단말기가 없습니다.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">단말기 설치 관리</p>
          <h2>설치 생성</h2>
        </div>
        <form className="form-grid" onSubmit={handleInstallationSubmit}>
          <label className="field">
            <span>설치 단말기 ID</span>
            <input
              onChange={(event) =>
                setInstallationForm((current) => ({ ...current, terminal_id: event.target.value }))
              }
              value={installationForm.terminal_id}
            />
          </label>
          <label className="field">
            <span>설치 차량 ID</span>
            <input
              onChange={(event) =>
                setInstallationForm((current) => ({ ...current, vehicle_id: event.target.value }))
              }
              value={installationForm.vehicle_id}
            />
          </label>
          <div className="form-actions">
            <button className="button primary" type="submit">
              설치 생성
            </button>
            <button className="button ghost" onClick={resetInstallationForm} type="button">
              초기화
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">설치 레지스트리</p>
          <h2>설치 목록</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">설치 정보를 불러오는 중입니다...</p>
        ) : errorMessage ? null : installations.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>단말기</th>
                <th>차량</th>
                <th>상태</th>
                <th>설치됨</th>
                <th>해제됨</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {installations.map((installation) => (
                <tr key={installation.terminal_installation_id}>
                  <td><code>{formatProtectedIdentifier(installation.terminal_id)}</code></td>
                  <td><code>{formatProtectedIdentifier(installation.vehicle_id)}</code></td>
                  <td>{formatInstallationStatusLabel(installation.installation_status)}</td>
                  <td>{installation.installed_at}</td>
                  <td>{installation.removed_at ?? '-'}</td>
                  <td>
                    {installation.installation_status === 'installed' ? (
                      <button
                        className="button ghost small"
                        onClick={() => void handleRemoveInstallation(installation.terminal_installation_id)}
                        type="button"
                      >
                        설치 해제
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">등록된 설치 정보가 없습니다.</p>
        )}
      </section>
    </div>
  );
}
