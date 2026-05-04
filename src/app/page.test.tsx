import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from './page';

describe('PAP dashboard', () => {
  it('renders the core V1 surfaces', () => {
    render(<Home />);

    expect(screen.getByText('PAP V1')).toBeInTheDocument();
    expect(screen.getByText('Today Briefing')).toBeInTheDocument();
    expect(screen.getByText('Pending Confirmation')).toBeInTheDocument();
    expect(screen.getByText('Automatically Handled')).toBeInTheDocument();
    expect(screen.getByText('Meeting Coordination')).toBeInTheDocument();
    expect(screen.getByText('Automation Boundaries')).toBeInTheDocument();
  });
});
