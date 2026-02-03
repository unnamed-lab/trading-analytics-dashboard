// lib/utils/format.ts
export function formatCurrency(value: number): string {
  if (value >= 0) {
    return `$${Math.abs(value).toFixed(2)}`;
  } else {
    return `-$${Math.abs(value).toFixed(2)}`;
  }
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return formatCurrency(value);
}

export function getColorForPnL(value: number): string {
  if (value > 0) return '#22c55e'; // green-500
  if (value < 0) return '#f43f5e'; // red-500
  return '#64748b'; // slate-500
}