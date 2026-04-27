import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CheonhaRuleShellPanel } from './CheonhaRuleShellPanel';

describe('CheonhaRuleShellPanel', () => {
  it('renders a disabled shell panel for unfinished rule surfaces', () => {
    render(
      <CheonhaRuleShellPanel
        description="배송원 운영 규칙과 연계 화면은 아직 cockpit shell만 제공합니다."
        title="배송원 관리"
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: '배송원 관리' })).toBeInTheDocument();
    expect(screen.getByText('준비 중')).toBeInTheDocument();
    expect(screen.getByText('배송원 운영 규칙과 연계 화면은 아직 cockpit shell만 제공합니다.')).toBeInTheDocument();
    expect(screen.getByText('실제 업무 흐름은 홈, 배차 데이터, 정산 처리에서 이어집니다.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '회사' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '플릿' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '배송원' })).toBeInTheDocument();
    expect(screen.getByLabelText('회사 규칙')).toBeDisabled();
    expect(screen.getByLabelText('플릿 규칙')).toBeDisabled();
    expect(screen.getByLabelText('배송원 규칙')).toBeDisabled();
    expect(screen.getAllByText('저장 액션 없음')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /저장/ })).not.toBeInTheDocument();
  });

  it('renders a box-style summary shell with explicit empty states', () => {
    render(
      <CheonhaRuleShellPanel
        description="운영 현황은 날짜, 배차, 근태를 같은 박스로 보여 줍니다."
        note="실제 값이 없으면 없음과 0을 그대로 노출합니다."
        summaryCards={[
          {
            rows: [
              { label: '기준 날짜', value: '없음' },
              { label: '마지막 갱신', value: '없음' },
              { label: '다음 반영', value: 0 },
            ],
            status: '오늘',
            title: '날짜',
          },
          {
            rows: [
              { label: '배차 건수', value: 0 },
              { label: '미할당', value: 0 },
              { label: '예외', value: '없음' },
            ],
            status: '0건',
            title: '배차',
          },
          {
            rows: [
              { label: '출근', value: 0 },
              { label: '지각', value: 0 },
              { label: '결근', value: 0 },
            ],
            status: '0명',
            title: '근태',
          },
        ]}
        title="운영 현황"
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: '운영 현황' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '날짜' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '배차' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '근태' })).toBeInTheDocument();
    expect(screen.getAllByText('없음')).toHaveLength(3);
    expect(screen.getAllByText('0')).toHaveLength(6);
    expect(screen.getAllByText('오늘')).toHaveLength(1);
    expect(screen.getAllByText('0건')).toHaveLength(1);
    expect(screen.getAllByText('0명')).toHaveLength(1);
  });
});
