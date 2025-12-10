DOCKER_DEV=infra/docker/docker-compose.dev.yml
DOCKER_PROD=infra/docker/docker-compose.prod.yml

FRONTEND_DIR=services/frontend
BACKEND_DIR=services/backend

BACKEND_IMAGE=osyle/backend:latest
FRONTEND_IMAGE=osyle/frontend:latest

.PHONY: help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

### DEV

dev: ## Start development environment (uses real AWS)
	@echo "🚀 Starting Osyle development environment..."
	@echo "⚠️  Using REAL AWS services (DynamoDB, S3, Cognito)"
	docker compose -f $(DOCKER_DEV) up --build

dev-down: ## Stop development environment
	docker compose -f $(DOCKER_DEV) down

dev-restart: ## Restart development environment
	@make dev-down
	@make dev

dev-clean: ## Stop and remove all containers, networks, volumes
	docker compose -f $(DOCKER_DEV) down -v
	docker system prune -f

### PROD

prod: ## Start production environment
	docker compose -f $(DOCKER_PROD) up --build -d

prod-down: ## Stop production environment
	docker compose -f $(DOCKER_PROD) down

### BUILD

build-fe: ## Build frontend Docker image
	docker build -t $(FRONTEND_IMAGE) -f infra/docker/frontend/Dockerfile .

build-be: ## Build backend Docker image
	docker build -t $(BACKEND_IMAGE) -f infra/docker/backend/Dockerfile .

### LINT

lint-fe: ## Lint frontend code
	cd $(FRONTEND_DIR) && npm run lint

lint-be: ## Lint backend code
	cd $(BACKEND_DIR) && ruff check .

format-fe: ## Format frontend code
	cd $(FRONTEND_DIR) && npm run format

format-be: ## Format backend code
	cd $(BACKEND_DIR) && black .

### UTIL

logs: ## Show development logs
	docker compose -f $(DOCKER_DEV) logs -f

### AWS SETUP (ONE-TIME)

aws-setup: ## Initial AWS setup instructions
	@echo "=============================================="
	@echo "AWS SETUP - Run these steps ONCE"
	@echo "=============================================="
	@echo ""
	@echo "1. Configure AWS CLI:"
	@echo "   aws configure"
	@echo ""
	@echo "2. Create DynamoDB tables (ONCE):"
	@echo "   make aws-create-tables"
	@echo ""
	@echo "3. Create S3 bucket (ONCE):"
	@echo "   make aws-create-bucket"
	@echo ""
	@echo "4. Configure S3 CORS (ONCE):"
	@echo "   make aws-setup-cors"
	@echo ""
	@echo "5. Verify setup:"
	@echo "   make aws-verify"
	@echo ""
	@echo "6. Start development:"
	@echo "   make dev"
	@echo ""

aws-create-tables: ## Create DynamoDB tables in AWS (run ONCE)
	@echo "Creating DynamoDB tables in AWS..."
	@cd $(BACKEND_DIR) && chmod +x ../../infra/scripts/create_dynamodb_tables.sh
	@./infra/scripts/create_dynamodb_tables.sh
	@echo "✅ Tables created successfully!"

aws-create-bucket: ## Create S3 bucket in AWS (run ONCE)
	@echo "Creating S3 bucket..."
	aws s3 mb s3://osyle-shared-assets --region us-east-1
	@echo "✅ Bucket created successfully!"

aws-setup-cors: ## Configure S3 CORS (run after bucket creation)
	@echo "Configuring S3 CORS..."
	cd $(BACKEND_DIR) && python configure_s3_cors.py

aws-verify: ## Verify AWS connection and setup
	@echo "Verifying AWS setup..."
	cd $(BACKEND_DIR) && python verify_aws_setup.py

### AWS STATUS

aws-db-status: ## Check DynamoDB tables status
	@echo "Checking DynamoDB tables..."
	@aws dynamodb list-tables --region us-east-1 --query 'TableNames' --output table
	@echo ""
	@cd $(BACKEND_DIR) && python -c "from verify_aws_setup import test_dynamodb_connection; test_dynamodb_connection()"

aws-s3-status: ## Check S3 bucket status
	@echo "Checking S3 bucket..."
	@aws s3 ls s3://osyle-shared-assets --region us-east-1 --summarize
	@echo ""
	@cd $(BACKEND_DIR) && python -c "from verify_aws_setup import test_s3_connection; test_s3_connection()"

aws-status: ## Check all AWS services status
	@echo "=============================================="
	@echo "AWS SERVICES STATUS"
	@echo "=============================================="
	@echo ""
	@make aws-db-status
	@echo ""
	@make aws-s3-status

### AWS DEPLOYMENT

deploy-backend: ## Deploy backend to AWS Lambda
	./infra/scripts/deploy-backend.sh

deploy-frontend: ## Deploy frontend to AWS Amplify
	git add . && git commit -m "Deploy" && git push origin main
	aws amplify start-job --app-id $(APP_ID) --branch-name main --job-type RELEASE

deploy-all: deploy-backend deploy-frontend ## Deploy both backend and frontend

aws-logs: ## Tail Lambda logs
	aws logs tail /aws/lambda/osyle-api --follow

aws-deployment-status: ## Check deployment status
	@echo "Backend:"
	@aws lambda get-function --function-name osyle-api --query 'Configuration.LastModified'
	@echo "Frontend:"
	@aws amplify get-app --app-id $(APP_ID) --query 'app.defaultDomain'

### FIRST TIME SETUP

first-time-setup: ## Complete first-time setup (run ONCE)
	@echo "=============================================="
	@echo "FIRST TIME SETUP"
	@echo "=============================================="
	@echo ""
	@echo "Step 1: Configuring AWS CLI..."
	@aws configure
	@echo ""
	@echo "Step 2: Creating DynamoDB tables..."
	@make aws-create-tables
	@echo ""
	@echo "Step 3: Creating S3 bucket..."
	@make aws-create-bucket || echo "Bucket may already exist"
	@echo ""
	@echo "Step 4: Configuring S3 CORS..."
	@make aws-setup-cors
	@echo ""
	@echo "Step 5: Verifying setup..."
	@make aws-verify
	@echo ""
	@echo "✅ Setup complete! Now run: make dev"

### QUICK START

start: aws-verify dev ## Verify AWS and start development (use this daily)
	@echo ""
	@echo "🎉 Development environment is ready!"
	@echo "   Backend:  http://localhost:8000"
	@echo "   Frontend: http://localhost:3000"

### CLEANUP

aws-delete-tables: ## Delete all DynamoDB tables (DESTRUCTIVE)
	@echo "⚠️  WARNING: This will DELETE all DynamoDB tables!"
	@read -p "Are you sure? (yes/no): " confirm && [ "$$confirm" = "yes" ] || exit 1
	aws dynamodb delete-table --table-name OsyleUsers --region us-east-1
	aws dynamodb delete-table --table-name OsyleTastes --region us-east-1
	aws dynamodb delete-table --table-name OsyleResources --region us-east-1
	aws dynamodb delete-table --table-name OsyleProjects --region us-east-1
	@echo "✅ All tables deleted"

aws-empty-bucket: ## Empty S3 bucket (DESTRUCTIVE)
	@echo "⚠️  WARNING: This will DELETE all files in S3 bucket!"
	@read -p "Are you sure? (yes/no): " confirm && [ "$$confirm" = "yes" ] || exit 1
	aws s3 rm s3://osyle-shared-assets --recursive
	@echo "✅ Bucket emptied"
