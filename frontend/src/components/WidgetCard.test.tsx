import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WidgetCard from "./WidgetCard";
import { ApiError } from "../api/client";

describe("WidgetCard", () => {
  it("renders children when there is no error or loading", () => {
    render(
      <WidgetCard title="Prices">
        <div>content</div>
      </WidgetCard>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("shows a spinner while loading", () => {
    render(
      <WidgetCard title="Prices" isLoading>
        <div>content</div>
      </WidgetCard>,
    );
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("renders the ApiError message and a Retry button, and calls onRetry", async () => {
    const onRetry = vi.fn();
    render(
      <WidgetCard
        title="Prices"
        error={new ApiError("Couldn't reach the market-data service.", 502, "upstream_unreachable")}
        onRetry={onRetry}
      >
        <div>content</div>
      </WidgetCard>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't reach the market-data service.");
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("uses a warning severity title for rate-limit errors", () => {
    render(
      <WidgetCard
        title="Prices"
        error={new ApiError("Rate limit reached.", 429, "rate_limited")}
        onRetry={() => {}}
      >
        <div>content</div>
      </WidgetCard>,
    );
    expect(screen.getByText("Rate limited")).toBeInTheDocument();
  });

  it("disables the Retry button while refetching", () => {
    render(
      <WidgetCard
        title="Prices"
        error={new Error("boom")}
        onRetry={() => {}}
        isRefetching
      >
        <div>content</div>
      </WidgetCard>,
    );
    expect(screen.getByRole("button", { name: /retrying/i })).toBeDisabled();
  });
});
