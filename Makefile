DOCKER_DEV=infra/docker/docker-compose.dev.yml
DOCKER_PROD=infra/docker/docker-compose.prod.yml

FRONTEND_DIR=services/frontend
BACKEND_DIR=services/backend

BACKEND_IMAGE=osyle/backend:latest
FRONTEND_IMAGE=osyle/frontend:latest

### DEV

dev:
	docker compose -f $(DOCKER_DEV) up --build

dev-down:
	docker compose -f $(DOCKER_DEV) down

### PROD

prod:
	docker compose -f $(DOCKER_PROD) up --build -d

prod-down:
	docker compose -f $(DOCKER_PROD) down

### BUILD

build-fe:
	docker build -t $(FRONTEND_IMAGE) -f infra/docker/frontend/Dockerfile .

build-be:
	docker build -t $(BACKEND_IMAGE) -f infra/docker/backend/Dockerfile .

### LINT

lint-fe:
	cd $(FRONTEND_DIR) && npm run lint

lint-be:
	cd $(BACKEND_DIR) && ruff check .

format-fe:
	cd $(FRONTEND_DIR) && npm run format

format-be:
	cd $(BACKEND_DIR) && black .

### UTIL

logs:
	docker compose -f $(DOCKER_DEV) logs -f
