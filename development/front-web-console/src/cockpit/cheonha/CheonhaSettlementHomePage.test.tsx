import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { CheonhaSettlementHomePage } from './CheonhaSettlementHomePage';

describe('CheonhaSettlementHomePage', () => {
  it('locks the cheonha settlement home layout contract', () => {
    render(
      <MemoryRouter
        future={{
          v7_relativeSplatPath: true,
          v7_startTransition: true,
        }}
      >
        <CheonhaSettlementHomePage />
      </MemoryRouter>,
    );

    const greetingBanner = screen.getByTestId('settlement-greeting-banner');
    const processCard = screen.getByTestId('settlement-process-card');
    const processSteps = within(processCard).getAllByTestId('settlement-process-step');
    const kpiStrip = screen.getByTestId('settlement-kpi-strip');
    const kpiLabels = within(kpiStrip).getAllByTestId('settlement-kpi-label');
    const recentSettlement = screen.getByTestId('settlement-recent-section');

    expect(greetingBanner).toBeInTheDocument();
    expect(within(greetingBanner).getByRole('heading', { name: '천하운수 정산' })).toBeInTheDocument();
    expect(within(greetingBanner).getByText('정산 현황')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: '천하운수 정산' })).toHaveLength(1);

    expect(processCard).toBeInTheDocument();
    expect(processSteps).toHaveLength(4);
    expect(
      processSteps.map((step) => within(step).getByTestId('settlement-process-step-title').textContent),
    ).toEqual(['배차 업로드', '특근 설정', '단가 확인', '정산 처리']);
    expect(screen.getByRole('link', { name: '배차 업로드' })).toHaveAttribute('href', '/settlement/dispatch');
    expect(screen.getByRole('link', { name: '정산 처리' })).toHaveAttribute('href', '/settlement/process');

    expect(kpiStrip).toBeInTheDocument();
    expect(kpiLabels).toHaveLength(4);
    expect(kpiLabels.map((label) => label.textContent)).toEqual(['수신합계', '지급합계', '조정비용', '수익']);

    expect(recentSettlement).toBeInTheDocument();
    expect(within(recentSettlement).getByText('정산 내역이 없습니다')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '운영 현황' })).not.toBeInTheDocument();
  });
});
