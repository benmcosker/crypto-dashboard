# Crypto Dashboard — developer tasks
#
# Quick start (live hot-reload for both backend and frontend):
#   make install      # one-time: deps + air
#   make dev          # runs backend (air) + frontend (vite) together
#
# Or run them in separate terminals:
#   make dev-backend
#   make dev-frontend

# Resolve the `air` binary whether or not $GOPATH/bin is on PATH.
AIR := $(shell command -v air 2>/dev/null || echo "$(shell go env GOPATH)/bin/air")

.PHONY: dev dev-backend dev-frontend install install-tools test test-backend test-frontend build clean

## Run backend + frontend with hot-reload, side by side (Ctrl-C stops both).
dev:
	@echo "Starting backend (air) + frontend (vite) with hot-reload..."
	@trap 'kill 0' EXIT INT TERM; \
		$(MAKE) --no-print-directory dev-backend & \
		$(MAKE) --no-print-directory dev-frontend & \
		wait

## Backend with live reload (rebuilds on .go changes).
dev-backend:
	@cd backend && "$(AIR)" -c .air.toml

## Frontend with Vite HMR.
dev-frontend:
	@cd frontend && npm run dev

## Install all dependencies + dev tools.
install: install-tools
	@cd frontend && npm install
	@cd backend && go mod download

## Install the `air` live-reload tool.
install-tools:
	@command -v air >/dev/null 2>&1 || go install github.com/air-verse/air@latest

## Run the full test suite.
test: test-backend test-frontend

test-backend:
	@cd backend && go test ./...

test-frontend:
	@cd frontend && npm test

## Production build (Go binary + frontend bundle).
build:
	@cd backend && go build -o server ./cmd/server
	@cd frontend && npm run build

## Remove build artifacts.
clean:
	@rm -rf backend/tmp backend/server backend/build-errors.log frontend/dist
