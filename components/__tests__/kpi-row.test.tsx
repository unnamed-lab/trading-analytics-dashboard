import React from 'react';
import { render, screen } from '@testing-library/react';
import KPIRow from '@/components/dashboard/kpi-row';

jest.mock('@/hooks/use-trade-queries', () => ({
  useTradeAnalytics: () => ({ data: {
    summary: { totalPnl: 5000, winRate: 50, totalVolume: 100000 },
    fees: { totalFees: -200 }
  }}),
  useCalculatedPnL: () => ({ data: new Array(3) })
}));

describe('KPIRow', () => {
  it('renders KPI cards with values from analytics', () => {
    render(<KPIRow />);
    expect(screen.getByText(/TOTAL PNL/i)).toBeInTheDocument();
    expect(screen.getByText(/\$5,000.00/)).toBeInTheDocument();
    expect(screen.getByText(/WIN RATE/i)).toBeInTheDocument();
    expect(screen.getByText(/50.0%/)).toBeInTheDocument();
  });
});
