// Shared formatters for currency, large numbers, and percentages.

export function formatCurrency(value: number): string {
  if (value == null || Number.isNaN(value)) return "—";
  const fractionDigits = value < 1 ? 6 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatCompact(value: number): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
