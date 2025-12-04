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

### AWS DEPLOYMENT

deploy-backend:
	./infra/scripts/deploy-backend.sh

deploy-frontend:
	git add . && git commit -m "Deploy" && git push origin main
	aws amplify start-job --app-id $(APP_ID) --branch-name main --job-type RELEASE

deploy-all: deploy-backend deploy-frontend

aws-setup:
	@echo "Run these commands manually:"
	@echo "1. Configure AWS CLI: aws configure"
	@echo "2. Set up Cognito User Pool"
	@echo "3. Configure Google OAuth"
	@echo "4. Run deploy-all"

aws-logs:
	aws logs tail /aws/lambda/osyle-api --follow

aws-status:
	@echo "Backend:"
	@aws lambda get-function --function-name osyle-api --query 'Configuration.LastModified'
	@echo "Frontend:"
	@aws amplify get-app --app-id $(APP_ID) --query 'app.defaultDomain'
