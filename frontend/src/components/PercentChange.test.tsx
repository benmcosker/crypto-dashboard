import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PercentChange from "./PercentChange";

describe("PercentChange", () => {
  it("shows a formatted gain", () => {
    render(<PercentChange value={4.21} />);
    expect(screen.getByText("+4.21%")).toBeInTheDocument();
  });

  it("shows a formatted loss", () => {
    render(<PercentChange value={-2.5} />);
    expect(screen.getByText("-2.50%")).toBeInTheDocument();
  });

  it("renders an em dash when the value is missing", () => {
    render(<PercentChange value={undefined} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
