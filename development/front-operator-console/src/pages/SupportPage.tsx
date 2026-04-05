import { useEffect, useMemo, useState } from 'react';

import {
  createSupportTicket,
  createSupportTicketResponse,
  listSupportTicketResponses,
  listSupportTickets,
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
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newPriority, setNewPriority] = useState<SupportTicket['priority']>('medium');
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
        if (!ignore) {
          setTickets(response);
          setSelectedTicketId(response[0]?.ticket_id ?? '');
        }
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

  async function reloadTickets() {
    const response = await listSupportTickets(client);
    setTickets(response);
    if (!response.some((ticket) => ticket.ticket_id === selectedTicketId)) {
      setSelectedTicketId(response[0]?.ticket_id ?? '');
    }
  }

  async function handleCreateTicket() {
    setErrorMessage(null);
    try {
      await createSupportTicket(client, {
        title: newTitle,
        body: newBody,
        priority: newPriority,
        status: 'open',
      });
      setNewTitle('');
      setNewBody('');
      setNewPriority('medium');
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
      <section className="panel form-panel">
        <div className="panel-header">
          <p className="panel-kicker">지원</p>
          <h2>지원</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        <label className="field">
          <span>문의 제목</span>
          <input aria-label="문의 제목" onChange={(event) => setNewTitle(event.target.value)} value={newTitle} />
        </label>
        <label className="field">
          <span>문의 본문</span>
          <textarea aria-label="문의 본문" onChange={(event) => setNewBody(event.target.value)} rows={4} value={newBody} />
        </label>
        <label className="field">
          <span>우선순위</span>
          <select aria-label="우선순위" onChange={(event) => setNewPriority(event.target.value as SupportTicket['priority'])} value={newPriority}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>
        <button className="button primary" onClick={() => void handleCreateTicket()} type="button">
          문의 등록
        </button>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">내 문의</p>
          <h2>{selectedTicket?.title ?? '지원 티켓 선택'}</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">지원 티켓을 불러오는 중입니다...</p>
        ) : tickets.length ? (
          <div className="stack">
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
            {selectedTicket ? (
              <>
                <p>{selectedTicket.body}</p>
                <article className="panel subtle-panel">
                  <div className="panel-header">
                    <h3>응답</h3>
                  </div>
                  <p className="empty-state">관리자 답변은 이 화면과 알림함에서 함께 확인할 수 있습니다.</p>
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
                <button className="button ghost" onClick={() => void handleCreateResponse()} type="button">
                  답변 등록
                </button>
              </>
            ) : null}
          </div>
        ) : (
          <p className="empty-state">등록된 문의가 없습니다.</p>
        )}
      </section>
    </div>
  );
}
