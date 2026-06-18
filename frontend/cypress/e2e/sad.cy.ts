/// <reference types="cypress" />
import type { ApiErrorBody } from "../support/commands";

const serverError: ApiErrorBody = {
  error: "The market-data service is temporarily unavailable. Please try again shortly.",
  code: "upstream_error",
  status: 500,
};

const rateLimit: ApiErrorBody = {
  error: "CoinGecko's rate limit was reached. Please wait a moment and try again.",
  code: "rate_limited",
  status: 429,
};

/** Stub every endpoint with the same canned response. */
function stubAll(reply: Record<string, unknown>) {
  cy.intercept("GET", "/api/markets", reply).as("markets");
  cy.intercept("GET", "/api/global", reply).as("global");
  cy.intercept("GET", "/api/trending", reply).as("trending");
  cy.intercept("GET", "/api/exchanges", reply).as("exchanges");
  cy.intercept({ method: "GET", url: /\/api\/chart\// }, reply).as("chart");
}

describe("Crypto Dashboard — sad paths", () => {
  it("shows an inline error + Retry on every widget when the API returns 500", () => {
    stubAll({ statusCode: 500, body: serverError });
    cy.visit("/");

    cy.contains("Couldn't load market overview").should("be.visible");
    cy.contains("Couldn't load data").should("be.visible");
    cy.contains(serverError.error).should("be.visible");
    cy.contains("button", "Retry").should("be.visible");
  });

  it("raises a global toast notification on failure", () => {
    stubAll({ statusCode: 500, body: serverError });
    cy.visit("/");

    // The deduped Snackbar surfaces the message at least once.
    cy.get(".MuiSnackbar-root").should("be.visible").and("contain", serverError.error);
  });

  it("surfaces a rate-limit warning (429) rather than a generic error", () => {
    stubAll({ statusCode: 429, body: rateLimit });
    cy.visit("/");

    cy.contains("Rate limited").should("be.visible");
    cy.contains(rateLimit.error).should("be.visible");
  });

  it("handles a network failure (backend unreachable)", () => {
    stubAll({ forceNetworkError: true });
    cy.visit("/");

    cy.contains("Can't reach the server").should("be.visible");
  });

  it("recovers when the user clicks Retry and the request succeeds", () => {
    // Markets fails once, then succeeds; everything else is healthy.
    let calls = 0;
    cy.intercept("GET", "/api/markets", (req) => {
      calls += 1;
      if (calls === 1) {
        req.reply({ statusCode: 500, body: serverError });
      } else {
        req.reply({ fixture: "markets.json" });
      }
    }).as("markets");
    cy.intercept("GET", "/api/global", { fixture: "global.json" });
    cy.intercept("GET", "/api/trending", { fixture: "trending.json" });
    cy.intercept("GET", "/api/exchanges", { fixture: "exchanges.json" });
    cy.intercept({ method: "GET", url: /\/api\/chart\// }, { fixture: "chart.json" });

    cy.visit("/");

    cy.contains("h2", "Live Prices")
      .closest(".MuiCard-root")
      .within(() => {
        cy.contains("Couldn't load data").should("be.visible");
        cy.contains("button", "Retry").click();
        cy.contains("tr", "Bitcoin").should("be.visible");
        cy.contains("Couldn't load data").should("not.exist");
      });
  });

  it("isolates a single failing widget without taking down the others", () => {
    cy.intercept("GET", "/api/markets", { statusCode: 500, body: serverError }).as("markets");
    cy.intercept("GET", "/api/global", { fixture: "global.json" });
    cy.intercept("GET", "/api/trending", { fixture: "trending.json" });
    cy.intercept("GET", "/api/exchanges", { fixture: "exchanges.json" });
    cy.intercept({ method: "GET", url: /\/api\/chart\// }, { fixture: "chart.json" });

    cy.visit("/");

    // Live Prices is broken…
    cy.contains("h2", "Live Prices")
      .closest(".MuiCard-root")
      .within(() => cy.contains("Couldn't load data").should("be.visible"));

    // …but the rest of the dashboard still renders.
    cy.contains("$2.24T").should("be.visible");
    cy.contains("Popcat").should("be.visible");
    cy.contains("Binance").should("be.visible");
    cy.contains("h2", "Trending")
      .closest(".MuiCard-root")
      .within(() => cy.contains("Couldn't load data").should("not.exist"));
  });

  it("shows an empty state when the chart has no data points", () => {
    cy.intercept("GET", "/api/markets", { fixture: "markets.json" });
    cy.intercept("GET", "/api/global", { fixture: "global.json" });
    cy.intercept("GET", "/api/trending", { fixture: "trending.json" });
    cy.intercept("GET", "/api/exchanges", { fixture: "exchanges.json" });
    cy.intercept({ method: "GET", url: /\/api\/chart\// }, { body: { prices: [] } });

    cy.visit("/");

    cy.contains("No price data available.").should("be.visible");
  });
});
