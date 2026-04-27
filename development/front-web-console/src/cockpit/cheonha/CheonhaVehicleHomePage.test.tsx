import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CheonhaVehicleHomePage } from './CheonhaVehicleHomePage';

describe('CheonhaVehicleHomePage', () => {
  it('renders a blank vehicle home surface', () => {
    render(<CheonhaVehicleHomePage />);

    expect(screen.getByRole('region', { name: '차량 홈' })).toBeInTheDocument();
    expect(screen.queryByText(/최근/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
