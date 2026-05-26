.PHONY: help install dev test build lint docker-up docker-down docker-logs clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' Makefile | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	cd frontend && npm install
	cd backend && npm install

dev: ## Start dev servers (frontend + backend)
	@echo "Starting backend on :3456..."
	cd backend && npm run dev &
	@echo "Starting frontend on :3002..."
	cd frontend && npm run dev

test: ## Run backend tests
	cd backend && npm test

lint: ## Lint frontend
	cd frontend && npx eslint src --ext .js,.jsx,.vue 2>/dev/null || true

build: ## Build frontend for production
	cd frontend && npm run build

docker-build: ## Build Docker images
	docker compose build

docker-up: ## Start with docker compose
	docker compose up -d

docker-down: ## Stop docker compose
	docker compose down

docker-logs: ## View logs
	docker compose logs -f

docker-restart: ## Restart services
	docker compose restart

clean: ## Clean build artifacts
	rm -rf frontend/dist/ frontend/node_modules/
	rm -rf backend/node_modules/
