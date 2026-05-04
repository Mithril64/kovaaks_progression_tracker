SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help bootstrap ubuntu-deps node rust npm-deps playwright verify build test rust-test e2e dev linux-tauri-deps

help:
	@printf "\nKovaak's Progression Tracker\n"
	@printf "  make bootstrap        Install WSL/Ubuntu deps, project deps, browsers, and run checks\n"
	@printf "  make verify           Run build, unit tests, Rust core tests, and Playwright smoke test\n"
	@printf "  make dev              Start the Vite web UI\n"
	@printf "  make ubuntu-deps      Install base Ubuntu packages\n"
	@printf "  make node             Install Node.js 22 when missing or too old\n"
	@printf "  make rust             Install Rust stable through rustup when missing\n"
	@printf "  make linux-tauri-deps Install optional Linux WebKitGTK deps for native Tauri shell\n\n"

bootstrap: ubuntu-deps node rust npm-deps playwright verify

ubuntu-deps:
	@if ! command -v apt-get >/dev/null 2>&1; then \
		echo "This target expects Ubuntu/WSL with apt-get."; \
		exit 1; \
	fi
	sudo apt-get update
	sudo apt-get install -y ca-certificates curl gnupg build-essential pkg-config libssl-dev git

node:
	@if command -v node >/dev/null 2>&1 && [ "$$(node -p "Number(process.versions.node.split('.')[0])")" -ge 22 ]; then \
		echo "Node $$(node --version) is already installed."; \
	else \
		echo "Installing Node.js 22 from NodeSource."; \
		curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -; \
		sudo apt-get install -y nodejs; \
	fi
	node --version
	npm --version

rust:
	@if command -v rustup >/dev/null 2>&1; then \
		echo "rustup $$(rustup --version | head -n 1) is already installed."; \
	else \
		echo "Installing Rust stable with rustup."; \
		curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y; \
	fi
	@source "$$HOME/.cargo/env" 2>/dev/null || true; \
	rustup toolchain install stable; \
	rustup default stable; \
	rustc --version; \
	cargo --version

npm-deps:
	npm ci

playwright:
	npx playwright install --with-deps chromium

verify: build test rust-test e2e

build:
	npm run build

test:
	npm test

rust-test:
	@source "$$HOME/.cargo/env" 2>/dev/null || true; \
	npm run rust:test

e2e:
	npm run e2e

dev:
	npm run dev -- --host 127.0.0.1

linux-tauri-deps:
	@if ! command -v apt-get >/dev/null 2>&1; then \
		echo "This target expects Ubuntu/WSL with apt-get."; \
		exit 1; \
	fi
	sudo apt-get update
	sudo apt-get install -y libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf
