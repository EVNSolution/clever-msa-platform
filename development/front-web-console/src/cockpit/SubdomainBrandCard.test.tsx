import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { SubdomainBrandCard } from './SubdomainBrandCard';

describe('SubdomainBrandCard', () => {
  it('keeps the header row above the centered company name without wrapping the copy as a centered group', () => {
    render(
      <MemoryRouter>
        <SubdomainBrandCard companyName="천하운수" />
      </MemoryRouter>,
    );

    const headerRow = screen.getByTestId('subdomain-brand-header-row');

    expect(screen.queryByTestId('subdomain-brand-copy-group')).toBeNull();
    expect(within(headerRow).getByText('CLEVER')).toBeInTheDocument();
    expect(within(headerRow).getByText('EV&Solution')).toBeInTheDocument();
    expect(screen.getByText('천하운수')).toBeInTheDocument();
  });
});
