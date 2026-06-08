import { describe, expect, it } from "vitest";
import { formatCompact, formatCurrency, formatPercent } from "./format";

describe("formatCurrency", () => {
  it("formats whole-dollar amounts with two decimals", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("shows more precision for sub-dollar prices", () => {
    expect(formatCurrency(0.012345)).toBe("$0.012345");
  });

  it("returns an em dash for NaN", () => {
    expect(formatCurrency(NaN)).toBe("—");
  });
});

describe("formatCompact", () => {
  it("abbreviates large numbers", () => {
    expect(formatCompact(2_500_000_000)).toBe("2.5B");
  });
});

describe("formatPercent", () => {
  it("prefixes a plus sign for gains", () => {
    expect(formatPercent(3.2)).toBe("+3.20%");
  });

  it("keeps the minus sign for losses", () => {
    expect(formatPercent(-1.5)).toBe("-1.50%");
  });

  it("returns an em dash when undefined", () => {
    expect(formatPercent(undefined)).toBe("—");
  });
});
