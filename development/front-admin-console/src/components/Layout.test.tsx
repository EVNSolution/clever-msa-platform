import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { Layout } from './Layout';

describe('Layout', () => {
  it('omits standalone terminal navigation from the admin shell', () => {
    render(
      <MemoryRouter>
        <Layout
          account={{
            account_id: '20000000-0000-0000-0000-000000000001',
            email: 'admin@example.com',
            role: 'admin',
            is_active: true,
          }}
          onLogout={vi.fn()}
        />,
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '차량' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '차량 배정' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '단말기' })).not.toBeInTheDocument();
  });
});
