SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help bootstrap system-deps ubuntu-deps arch-deps node rust npm-deps playwright verify build test rust-test e2e dev linux-tauri-deps

help:
	@printf "\nKovaak's Progression Tracker\n"
	@printf "  make bootstrap        Install Arch/Ubuntu dev deps, project deps, browsers, and run checks\n"
	@printf "  make verify           Run build, unit tests, Rust core tests, and Playwright smoke test\n"
	@printf "  make dev              Start the Vite web UI\n"
	@printf "  make system-deps      Install base packages with apt-get or pacman\n"
	@printf "  make ubuntu-deps      Install base Ubuntu packages with apt-get\n"
	@printf "  make arch-deps        Install base Arch packages with pacman\n"
	@printf "  make node             Install Node.js 22 when missing or too old\n"
	@printf "  make rust             Install Rust stable through rustup when missing\n"
	@printf "  make linux-tauri-deps Install optional Linux WebKitGTK deps for native Tauri shell\n\n"

bootstrap: system-deps node rust npm-deps playwright verify

system-deps:
	@if command -v apt-get >/dev/null 2>&1; then \
		$(MAKE) ubuntu-deps; \
	elif command -v pacman >/dev/null 2>&1; then \
		$(MAKE) arch-deps; \
	else \
		echo "Unsupported package manager. Install Node.js 22, npm, rustup, make, git, pkg-config, OpenSSL, and build tools manually."; \
		exit 1; \
	fi

ubuntu-deps:
	@if ! command -v apt-get >/dev/null 2>&1; then \
		echo "This target expects Ubuntu/WSL with apt-get."; \
		exit 1; \
	fi
	sudo apt-get update
	sudo apt-get install -y ca-certificates curl gnupg build-essential pkg-config libssl-dev git

arch-deps:
	@if ! command -v pacman >/dev/null 2>&1; then \
		echo "This target expects Arch Linux with pacman."; \
		exit 1; \
	fi
	sudo pacman -Syu --needed --noconfirm base-devel ca-certificates curl git make nodejs npm rustup pkgconf openssl nss nspr atk at-spi2-core cups gtk3 alsa-lib libxcomposite libxdamage libxrandr mesa pango cairo libxkbcommon libdrm glib2 expat dbus

node:
	@if command -v node >/dev/null 2>&1 && [ "$$(node -p "Number(process.versions.node.split('.')[0])")" -ge 22 ]; then \
		echo "Node $$(node --version) is already installed."; \
	elif command -v pacman >/dev/null 2>&1; then \
		echo "Installing Node.js and npm with pacman."; \
		sudo pacman -S --needed --noconfirm nodejs npm; \
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
	@if command -v apt-get >/dev/null 2>&1; then \
		npx playwright install --with-deps chromium; \
	else \
		npx playwright install chromium; \
	fi

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
