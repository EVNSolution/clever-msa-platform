import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageLayout } from './PageLayout';

describe('PageLayout', () => {
  it('renders title, subtitle, tabs, filters, actions, and content in a consistent page shell', () => {
    render(
      <PageLayout
        actions={<button type="button">생성</button>}
        filters={<button type="button">필터</button>}
        subtitle="운영 기준으로 데이터를 읽고 관리합니다."
        tabs={<button type="button">탭 1</button>}
        title="운영 관리 현황"
      >
        <div>본문 컨텐츠</div>
      </PageLayout>,
    );

    expect(screen.getByRole('heading', { name: '운영 관리 현황' })).toBeInTheDocument();
    expect(screen.getByText('운영 기준으로 데이터를 읽고 관리합니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '탭 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '필터' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '생성' })).toBeInTheDocument();
    expect(screen.getByText('본문 컨텐츠')).toBeInTheDocument();
  });
});
