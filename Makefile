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

deploy-all: ## Deploy both backend and frontend
	./infra/scripts/deploy-all.sh

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

### PRODUCTION AWS SETUP (ONE-TIME)

aws-create-tables-prod: ## Create PRODUCTION DynamoDB tables in AWS (run ONCE)
	@echo "Creating PRODUCTION DynamoDB tables in AWS..."
	@chmod +x infra/scripts/create_dynamodb_tables_prod.sh
	@./infra/scripts/create_dynamodb_tables_prod.sh
	@echo "✅ Production tables created successfully!"

aws-create-bucket-prod: ## Create PRODUCTION S3 bucket in AWS (run ONCE)
	@echo "Creating PRODUCTION S3 bucket..."
	aws s3 mb s3://osyle-shared-assets-prod --region us-east-1
	aws s3api put-bucket-cors --bucket osyle-shared-assets-prod --cors-configuration '{"CORSRules":[{"AllowedOrigins":["https://main.d1z1przwpoqpmu.amplifyapp.com"],"AllowedMethods":["GET","PUT","POST","DELETE","HEAD"],"AllowedHeaders":["*"],"MaxAgeSeconds":3600}]}'
	@echo "✅ Production bucket created successfully!"

aws-verify-prod: ## Verify PRODUCTION AWS setup
	@echo "Verifying PRODUCTION AWS setup..."
	cd $(BACKEND_DIR) && python3 verify_aws_setup_prod.py

### PRODUCTION AWS STATUS

aws-db-status-prod: ## Check PRODUCTION DynamoDB tables status
	@echo "Checking PRODUCTION DynamoDB tables..."
	@aws dynamodb describe-table --table-name OsyleUsers-Prod --region us-east-1 --query 'Table.[TableName,ItemCount]' --output table 2>/dev/null || echo "OsyleUsers-Prod: Not found"
	@aws dynamodb describe-table --table-name OsyleTastes-Prod --region us-east-1 --query 'Table.[TableName,ItemCount]' --output table 2>/dev/null || echo "OsyleTastes-Prod: Not found"
	@aws dynamodb describe-table --table-name OsyleResources-Prod --region us-east-1 --query 'Table.[TableName,ItemCount]' --output table 2>/dev/null || echo "OsyleResources-Prod: Not found"
	@aws dynamodb describe-table --table-name OsyleProjects-Prod --region us-east-1 --query 'Table.[TableName,ItemCount]' --output table 2>/dev/null || echo "OsyleProjects-Prod: Not found"

aws-s3-status-prod: ## Check PRODUCTION S3 bucket status
	@echo "Checking PRODUCTION S3 bucket..."
	@aws s3 ls s3://osyle-shared-assets-prod --region us-east-1 --summarize 2>/dev/null || echo "Bucket not found"

aws-status-prod: ## Check all PRODUCTION AWS services status
	@echo "=============================================="
	@echo "PRODUCTION AWS SERVICES STATUS"
	@echo "=============================================="
	@echo ""
	@make aws-db-status-prod
	@echo ""
	@make aws-s3-status-prod

### PRODUCTION DEPLOYMENT

deploy-prod: ## Deploy to PRODUCTION (backend + frontend)
	@echo "🚀 Deploying to PRODUCTION..."
	./infra/scripts/deploy-all.sh

### PRODUCTION CLEANUP (DANGEROUS)

aws-delete-tables-prod: ## Delete PRODUCTION DynamoDB tables (DESTRUCTIVE)
	@echo "⚠️  WARNING: This will DELETE all PRODUCTION DynamoDB tables!"
	@echo "⚠️  This will permanently delete production data!"
	@read -p "Are you sure? (yes/no): " confirm && [ "$$confirm" = "yes" ] || exit 1
	aws dynamodb delete-table --table-name OsyleUsers-Prod --region us-east-1
	aws dynamodb delete-table --table-name OsyleTastes-Prod --region us-east-1
	aws dynamodb delete-table --table-name OsyleResources-Prod --region us-east-1
	aws dynamodb delete-table --table-name OsyleProjects-Prod --region us-east-1
	@echo "✅ All production tables deleted"

aws-empty-bucket-prod: ## Empty PRODUCTION S3 bucket (DESTRUCTIVE)
	@echo "⚠️  WARNING: This will DELETE all files in PRODUCTION S3 bucket!"
	@echo "⚠️  This will permanently delete production data!"
	@read -p "Are you sure? (yes/no): " confirm && [ "$$confirm" = "yes" ] || exit 1
	aws s3 rm s3://osyle-shared-assets-prod --recursive
	@echo "✅ Production bucket emptied"

### PRODUCTION FIRST TIME SETUP

first-time-setup-prod: ## Complete PRODUCTION first-time setup (run ONCE)
	@echo "=============================================="
	@echo "PRODUCTION FIRST TIME SETUP"
	@echo "=============================================="
	@echo ""
	@echo "Step 1: Creating PRODUCTION DynamoDB tables..."
	@make aws-create-tables-prod
	@echo ""
	@echo "Step 2: Creating PRODUCTION S3 bucket..."
	@make aws-create-bucket-prod || echo "Bucket may already exist"
	@echo ""
	@echo "Step 3: Verifying PRODUCTION setup..."
	@make aws-verify-prod
	@echo ""
	@echo "✅ Production setup complete! Now run: make deploy-prod"


### DEVELOPMENT LOCAL BACKUP

aws-backup-tables: ## Create local backup of DynamoDB tables
	@echo "📦 Backing up DynamoDB tables..."
	@mkdir -p backups/dynamodb/dev/$$(date +%Y%m%d-%H%M%S)
	@BACKUP_DIR="backups/dynamodb/dev/$$(date +%Y%m%d-%H%M%S)" && \
	echo "Exporting OsyleUsers..." && \
	aws dynamodb scan --table-name OsyleUsers --region us-east-1 > $$BACKUP_DIR/OsyleUsers.json && \
	echo "Exporting OsyleTastes..." && \
	aws dynamodb scan --table-name OsyleTastes --region us-east-1 > $$BACKUP_DIR/OsyleTastes.json && \
	echo "Exporting OsyleResources..." && \
	aws dynamodb scan --table-name OsyleResources --region us-east-1 > $$BACKUP_DIR/OsyleResources.json && \
	echo "Exporting OsyleProjects..." && \
	aws dynamodb scan --table-name OsyleProjects --region us-east-1 > $$BACKUP_DIR/OsyleProjects.json && \
	echo "✅ All tables backed up to $$BACKUP_DIR/"

aws-backup-bucket: ## Create local backup of S3 bucket
	@echo "📦 Backing up S3 bucket..."
	@mkdir -p backups/s3/dev/$$(date +%Y%m%d-%H%M%S)
	@BACKUP_DIR="backups/s3/dev/$$(date +%Y%m%d-%H%M%S)" && \
	aws s3 sync s3://osyle-shared-assets $$BACKUP_DIR/ && \
	echo "✅ Bucket backed up to $$BACKUP_DIR/"

aws-backup-all: ## Backup both DynamoDB tables and S3 bucket
	@echo "📦 Creating full backup..."
	@$(MAKE) aws-backup-tables
	@$(MAKE) aws-backup-bucket
	@echo "✅ Full backup complete"


### PRODUCTION LOCAL BACKUP

aws-backup-tables-prod: ## Create local backup of PRODUCTION DynamoDB tables
	@echo "📦 Backing up PRODUCTION DynamoDB tables..."
	@mkdir -p backups/dynamodb/prod/$$(date +%Y%m%d-%H%M%S)
	@BACKUP_DIR="backups/dynamodb/prod/$$(date +%Y%m%d-%H%M%S)" && \
	echo "Exporting OsyleUsers-Prod..." && \
	aws dynamodb scan --table-name OsyleUsers-Prod --region us-east-1 > $$BACKUP_DIR/OsyleUsers-Prod.json && \
	echo "Exporting OsyleTastes-Prod..." && \
	aws dynamodb scan --table-name OsyleTastes-Prod --region us-east-1 > $$BACKUP_DIR/OsyleTastes-Prod.json && \
	echo "Exporting OsyleResources-Prod..." && \
	aws dynamodb scan --table-name OsyleResources-Prod --region us-east-1 > $$BACKUP_DIR/OsyleResources-Prod.json && \
	echo "Exporting OsyleProjects-Prod..." && \
	aws dynamodb scan --table-name OsyleProjects-Prod --region us-east-1 > $$BACKUP_DIR/OsyleProjects-Prod.json && \
	echo "✅ All production tables backed up to $$BACKUP_DIR/"

aws-backup-bucket-prod: ## Create local backup of PRODUCTION S3 bucket
	@echo "📦 Backing up PRODUCTION S3 bucket..."
	@mkdir -p backups/s3/prod/$$(date +%Y%m%d-%H%M%S)
	@BACKUP_DIR="backups/s3/prod/$$(date +%Y%m%d-%H%M%S)" && \
	aws s3 sync s3://osyle-shared-assets-prod $$BACKUP_DIR/ && \
	echo "✅ Production bucket backed up to $$BACKUP_DIR/"

aws-backup-all-prod: ## Backup both PRODUCTION DynamoDB tables and S3 bucket
	@echo "📦 Creating full PRODUCTION backup..."
	@$(MAKE) aws-backup-tables-prod
	@$(MAKE) aws-backup-bucket-prod
	@echo "✅ Full production backup complete"