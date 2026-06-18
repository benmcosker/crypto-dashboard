/// <reference types="cypress" />

// Backend error-response shape (mirrors the Go API).
export interface ApiErrorBody {
  error: string;
  code: string;
  status: number;
}

declare global {
  namespace Cypress {
    interface Chainable {
      /** Stub all five API endpoints with successful fixtures and alias them. */
      stubHappy(): Chainable<void>;
    }
  }
}

Cypress.Commands.add("stubHappy", () => {
  cy.intercept("GET", "/api/markets", { fixture: "markets.json" }).as("markets");
  cy.intercept("GET", "/api/global", { fixture: "global.json" }).as("global");
  cy.intercept("GET", "/api/trending", { fixture: "trending.json" }).as("trending");
  cy.intercept("GET", "/api/exchanges", { fixture: "exchanges.json" }).as("exchanges");
  cy.intercept({ method: "GET", url: /\/api\/chart\// }, { fixture: "chart.json" }).as("chart");
});

export {};
