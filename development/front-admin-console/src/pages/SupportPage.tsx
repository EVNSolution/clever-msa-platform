import { useEffect, useMemo, useState } from 'react';

import {
  createSupportTicketResponse,
  listSupportTicketResponses,
  listSupportTickets,
  updateSupportTicket,
} from '../api/support';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { SupportTicket, SupportTicketResponse } from '../types';
import { formatRoleLabel, formatSupportTicketPriorityLabel, formatSupportTicketStatusLabel } from '../uiLabels';

type SupportPageProps = {
  client: HttpClient;
};

export function SupportPage({ client }: SupportPageProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [responses, setResponses] = useState<SupportTicketResponse[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [ticketStatus, setTicketStatus] = useState<SupportTicket['status']>('open');
  const [ticketPriority, setTicketPriority] = useState<SupportTicket['priority']>('medium');
  const [responseBody, setResponseBody] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.ticket_id === selectedTicketId) ?? null,
    [selectedTicketId, tickets],
  );

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await listSupportTickets(client);
        if (ignore) {
          return;
        }
        setTickets(response);
        const nextTicketId = response[0]?.ticket_id ?? '';
        setSelectedTicketId(nextTicketId);
        const nextTicket = response[0];
        setTicketStatus(nextTicket?.status ?? 'open');
        setTicketPriority(nextTicket?.priority ?? 'medium');
      } catch (error) {
        if (!ignore) {
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

  useEffect(() => {
    if (!selectedTicketId) {
      setResponses([]);
      return;
    }

    let ignore = false;

    async function loadResponses() {
      try {
        const response = await listSupportTicketResponses(client, selectedTicketId);
        if (!ignore) {
          setResponses(response);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(getErrorMessage(error));
        }
      }
    }

    void loadResponses();
    return () => {
      ignore = true;
    };
  }, [client, selectedTicketId]);

  useEffect(() => {
    if (!selectedTicket) {
      return;
    }
    setTicketStatus(selectedTicket.status);
    setTicketPriority(selectedTicket.priority);
  }, [selectedTicket]);

  async function reloadTickets() {
    const response = await listSupportTickets(client);
    setTickets(response);
    if (!response.some((ticket) => ticket.ticket_id === selectedTicketId)) {
      const nextTicket = response[0];
      setSelectedTicketId(nextTicket?.ticket_id ?? '');
      setTicketStatus(nextTicket?.status ?? 'open');
      setTicketPriority(nextTicket?.priority ?? 'medium');
    }
  }

  async function handleTicketUpdate() {
    if (!selectedTicket) {
      return;
    }
    setErrorMessage(null);
    try {
      await updateSupportTicket(client, String(selectedTicket.route_no), {
        status: ticketStatus,
        priority: ticketPriority,
      });
      await reloadTickets();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleCreateResponse() {
    if (!selectedTicketId || !responseBody.trim()) {
      return;
    }
    setErrorMessage(null);
    try {
      await createSupportTicketResponse(client, {
        ticket_id: selectedTicketId,
        body: responseBody,
      });
      setResponseBody('');
      setResponses(await listSupportTicketResponses(client, selectedTicketId));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  return (
    <div className="data-grid two-columns">
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">지원</p>
          <h2>지원 관리</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? (
          <p className="empty-state">지원 티켓을 불러오는 중입니다...</p>
        ) : tickets.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>번호</th>
                <th>제목</th>
                <th>상태</th>
                <th>우선순위</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.ticket_id}
                  className={ticket.ticket_id === selectedTicketId ? 'interactive-row selected-row' : 'interactive-row'}
                  onClick={() => setSelectedTicketId(ticket.ticket_id)}
                >
                  <td>{ticket.route_no}</td>
                  <td>{ticket.title}</td>
                  <td>{formatSupportTicketStatusLabel(ticket.status)}</td>
                  <td>{formatSupportTicketPriorityLabel(ticket.priority)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">표시할 지원 티켓이 없습니다.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">티켓 상세</p>
          <h2>{selectedTicket?.title ?? '지원 티켓 선택'}</h2>
        </div>
        {selectedTicket ? (
          <div className="stack">
            <dl className="detail-list">
              <div>
                <dt>요청자 account_id</dt>
                <dd>{selectedTicket.requester_account_id}</dd>
              </div>
              <div>
                <dt>본문</dt>
                <dd>{selectedTicket.body}</dd>
              </div>
            </dl>
            <div className="form-grid">
              <label className="field">
                <span>상태</span>
                <select onChange={(event) => setTicketStatus(event.target.value as SupportTicket['status'])} value={ticketStatus}>
                  <option value="open">open</option>
                  <option value="in_progress">in_progress</option>
                  <option value="resolved">resolved</option>
                  <option value="closed">closed</option>
                </select>
              </label>
              <label className="field">
                <span>우선순위</span>
                <select
                  onChange={(event) => setTicketPriority(event.target.value as SupportTicket['priority'])}
                  value={ticketPriority}
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </label>
            </div>
            <button className="button ghost" onClick={() => void handleTicketUpdate()} type="button">
              티켓 상태 저장
            </button>
            <article className="panel subtle-panel">
              <div className="panel-header">
                <h3>응답</h3>
              </div>
              {responses.length ? (
                <div className="stack">
                  {responses.map((response) => (
                    <article key={response.response_id} className="stack small-gap">
                      <strong>{formatRoleLabel(response.author_role)}</strong>
                      <p>{response.body}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="empty-state">등록된 응답이 없습니다.</p>
              )}
            </article>
            <label className="field">
              <span>답변 내용</span>
              <textarea aria-label="답변 내용" onChange={(event) => setResponseBody(event.target.value)} rows={4} value={responseBody} />
            </label>
            <p className="empty-state">답변을 등록하면 요청자 알림함에 일반 알림이 자동 생성됩니다. Push는 자동 발송되지 않습니다.</p>
            <button className="button primary" onClick={() => void handleCreateResponse()} type="button">
              답변 등록
            </button>
          </div>
        ) : (
          <p className="empty-state">선택된 지원 티켓이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
