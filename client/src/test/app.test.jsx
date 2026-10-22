import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge, PriorityBadge, SLABadge, RoleBadge } from '../components/common/Badge';

describe('ResolveIQ UI Component Tests', () => {
  it('renders status badges with correct text and styling', () => {
    const { rerender } = render(<StatusBadge status="OPEN" />);
    expect(screen.getByText('Open')).toBeInTheDocument();

    rerender(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();

    rerender(<StatusBadge status="RESOLVED" />);
    expect(screen.getByText('Resolved')).toBeInTheDocument();

    rerender(<StatusBadge status="REOPENED" />);
    expect(screen.getByText('Reopened')).toBeInTheDocument();
  });

  it('renders priority badges accurately', () => {
    const { rerender } = render(<PriorityBadge priority="CRITICAL" />);
    expect(screen.getByText('Critical')).toBeInTheDocument();

    rerender(<PriorityBadge priority="HIGH" />);
    expect(screen.getByText('High')).toBeInTheDocument();

    rerender(<PriorityBadge priority="LOW" />);
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('renders SLA badges correctly according to status', () => {
    const overdueSLA = { status: 'OVERDUE', label: 'Overdue by 3h', isBreached: true };
    const { rerender } = render(<SLABadge sla={overdueSLA} />);
    expect(screen.getByText('Overdue by 3h')).toBeInTheDocument();

    const atRiskSLA = { status: 'AT_RISK', label: 'At Risk (1.2h remaining)', isBreached: false };
    rerender(<SLABadge sla={atRiskSLA} />);
    expect(screen.getByText('At Risk (1.2h remaining)')).toBeInTheDocument();
  });

  it('renders role badges correctly', () => {
    const { rerender } = render(<RoleBadge role="MANAGER" />);
    expect(screen.getByText('Manager / Admin')).toBeInTheDocument();

    rerender(<RoleBadge role="AGENT" />);
    expect(screen.getByText('Support Agent')).toBeInTheDocument();

    rerender(<RoleBadge role="CUSTOMER" />);
    expect(screen.getByText('Customer')).toBeInTheDocument();
  });
});
