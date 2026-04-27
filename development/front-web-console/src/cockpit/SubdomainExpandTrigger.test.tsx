import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SubdomainExpandTrigger } from './SubdomainExpandTrigger';

describe('SubdomainExpandTrigger', () => {
  it('renders an icon-only launcher trigger', () => {
    render(<SubdomainExpandTrigger isExpanded={false} onToggle={vi.fn()} />);

    const button = screen.getByRole('button', { name: '상위 메뉴 열기' });
    const icon = within(button).getByTestId('subdomain-trigger-icon');

    expect(within(button).queryByText('펼치기')).toBeNull();
    expect(within(button).queryByText('닫힘')).toBeNull();
    expect(icon.tagName.toLowerCase()).toBe('svg');
  });
});
