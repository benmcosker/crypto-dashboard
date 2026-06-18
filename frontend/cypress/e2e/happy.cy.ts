/// <reference types="cypress" />

describe("Crypto Dashboard — happy paths", () => {
  beforeEach(() => {
    cy.stubHappy();
    cy.visit("/");
    cy.wait(["@markets", "@global", "@trending", "@exchanges", "@chart"]);
  });

  it("renders all five metric widgets populated with data", () => {
    // 2) Market overview (global)
    cy.contains("Total Market Cap").should("be.visible");
    cy.contains("$2.24T").should("be.visible");
    cy.contains("BTC Dominance").should("be.visible");
    cy.contains("55.9%").should("be.visible");

    // 1) Live prices
    cy.contains("h2", "Live Prices").should("be.visible");
    cy.contains("tr", "Bitcoin").should("be.visible");
    cy.contains("tr", "Bitcoin").should("contain", "$62,628.00");

    // 3) Price history chart
    cy.contains("h2", "Price History").should("be.visible");
    cy.get("svg").should("exist");

    // 4) Trending
    cy.contains("h2", "Trending").should("be.visible");
    cy.contains("Popcat").should("be.visible");

    // 5) Exchange volume
    cy.contains("h2", "Exchange Volume").should("be.visible");
    cy.contains("Binance").should("be.visible");

    // No error state anywhere on the happy path.
    cy.get('[role="alert"]').should("not.exist");
  });

  it("defaults the price chart to Bitcoin over Last week", () => {
    cy.contains("BITCOIN · Last week").should("be.visible");
  });

  it("filters by time period and refetches the chart for the new range", () => {
    cy.contains("button", "Last quarter").click();

    cy.wait("@chart").its("request.url").should("include", "period=quarter");
    cy.contains("BITCOIN · Last quarter").should("be.visible");

    // The Live Prices change column switches to the matching window (30d).
    cy.contains("h2", "Live Prices")
      .closest(".MuiCard-root")
      .within(() => cy.contains("30d %").should("be.visible"));
  });

  it("updates the chart when a coin row is selected", () => {
    cy.contains("tr", "Ethereum").click();

    cy.wait("@chart").its("request.url").should("include", "/api/chart/ethereum");
    cy.contains("ETHEREUM ·").should("be.visible");
  });

  it("updates the chart when a trending coin is clicked", () => {
    // Popcat only appears in the Trending widget, so this is unambiguous.
    cy.contains("Popcat").click();

    cy.wait("@chart").its("request.url").should("include", "/api/chart/popcat");
    cy.contains("POPCAT ·").should("be.visible");
  });
});
