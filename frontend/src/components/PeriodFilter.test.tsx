import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PeriodFilter from "./PeriodFilter";

describe("PeriodFilter", () => {
  it("renders all four period options", () => {
    render(<PeriodFilter value="week" onChange={() => {}} />);
    for (const label of ["Today", "Last week", "Last month", "Last quarter"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("marks the active period as pressed", () => {
    render(<PeriodFilter value="month" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Last month" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("fires onChange with the selected period value", async () => {
    const onChange = vi.fn();
    render(<PeriodFilter value="week" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Last quarter" }));
    expect(onChange).toHaveBeenCalledWith("quarter");
  });

  it("does not fire onChange when re-clicking the active period", async () => {
    const onChange = vi.fn();
    render(<PeriodFilter value="today" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
