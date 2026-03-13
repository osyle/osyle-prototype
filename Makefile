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
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-28s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

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

### FIGMA RELAY (LOCAL DEV)
# In local dev the relay runs as a plain Node.js process (figma-relay.mjs).
# No DynamoDB needed — all payloads are in-memory with a 10min TTL.
# In production the relay is hosted on Lambda + DynamoDB (HTTPS required).

relay: ## Start local Figma relay server (run alongside dev server)
	@echo "🔌 Starting Figma relay on http://localhost:8765"
	@echo "   Keep this running while using the Figma plugin locally."
	cd $(FRONTEND_DIR) && node figma-relay.mjs

relay-status: ## Check if local Figma relay is running
	@echo "Checking local Figma relay (localhost:8765)..."
	@curl -sf http://localhost:8765/figma-ping \
		&& echo "✅ Relay is running" \
		|| echo "❌ Relay is offline — run: make relay"

relay-dev: ## Start Vite dev server + Figma relay together
	@echo "🚀 Starting Vite + Figma relay..."
	cd $(FRONTEND_DIR) && npm run dev:figma

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
	@echo "   make dev        (backend + frontend in Docker)"
	@echo "   make relay      (Figma relay — run in a separate terminal)"
	@echo ""
	@echo "Note: No relay DynamoDB table needed for local dev."
	@echo "      figma-relay.mjs is pure in-memory."
	@echo ""

aws-create-tables: ## Create DEV DynamoDB tables in AWS (run ONCE)
	@echo "Creating DynamoDB tables in AWS..."
	@chmod +x infra/scripts/create_dynamodb_tables.sh
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

aws-db-status: ## Check DEV DynamoDB tables status
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

first-time-setup: ## Complete first-time DEV setup (run ONCE)
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
	@echo "✅ Setup complete!"
	@echo ""
	@echo "To start developing:"
	@echo "  Terminal 1: make dev"
	@echo "  Terminal 2: make relay   (Figma plugin bridge)"
	@echo ""

### QUICK START

start: aws-verify dev ## Verify AWS and start development (use this daily)
	@echo ""
	@echo "🎉 Development environment is ready!"
	@echo "   Backend:  http://localhost:8000"
	@echo "   Frontend: http://localhost:3000"
	@echo ""
	@echo "💡 Also start the Figma relay in a separate terminal:"
	@echo "   make relay"

### CLEANUP

aws-delete-tables: ## Delete DEV DynamoDB tables (DESTRUCTIVE)
	@echo "⚠️  WARNING: This will DELETE all DEV DynamoDB tables!"
	@read -p "Are you sure? (yes/no): " confirm && [ "$$confirm" = "yes" ] || exit 1
	aws dynamodb delete-table --table-name OsyleUsers --region us-east-1 2>/dev/null || true
	aws dynamodb delete-table --table-name OsyleTastes --region us-east-1 2>/dev/null || true
	aws dynamodb delete-table --table-name OsyleResources --region us-east-1 2>/dev/null || true
	aws dynamodb delete-table --table-name OsyleProjects --region us-east-1 2>/dev/null || true
	aws dynamodb delete-table --table-name OsyleDesignMutations --region us-east-1 2>/dev/null || true
	@echo "✅ All DEV tables deleted"
	@echo "Note: No relay table exists for dev (figma-relay.mjs is in-memory)."

aws-empty-bucket: ## Empty S3 bucket (DESTRUCTIVE)
	@echo "⚠️  WARNING: This will DELETE all files in S3 bucket!"
	@read -p "Are you sure? (yes/no): " confirm && [ "$$confirm" = "yes" ] || exit 1
	aws s3 rm s3://osyle-shared-assets --recursive
	@echo "✅ Bucket emptied"

### PRODUCTION AWS SETUP (ONE-TIME)

aws-create-relay-table: ## Create Figma relay DynamoDB table — prod only (idempotent)
	@echo "Creating Figma relay DynamoDB table..."
	@chmod +x infra/scripts/create_relay_table.sh
	@./infra/scripts/create_relay_table.sh

aws-create-tables-prod: ## Create PRODUCTION DynamoDB tables (run ONCE, includes relay table)
	@echo "Creating PRODUCTION DynamoDB tables in AWS..."
	@chmod +x infra/scripts/create_dynamodb_tables_prod.sh
	@./infra/scripts/create_dynamodb_tables_prod.sh
	@echo "✅ Production tables created successfully!"

aws-create-bucket-prod: ## Create PRODUCTION S3 bucket in AWS (run ONCE)
	@echo "Creating PRODUCTION S3 bucket..."
	aws s3 mb s3://osyle-shared-assets-prod --region us-east-1
	aws s3api put-bucket-cors --bucket osyle-shared-assets-prod --cors-configuration '{"CORSRules":[{"AllowedOrigins":["https://main.d1z1przwpoqpmu.amplifyapp.com","https://app.osyle.com"],"AllowedMethods":["GET","PUT","POST","DELETE","HEAD"],"AllowedHeaders":["*"],"MaxAgeSeconds":3600}]}'
	@echo "✅ Production bucket created successfully!"

aws-verify-prod: ## Verify PRODUCTION AWS setup
	@echo "Verifying PRODUCTION AWS setup..."
	cd $(BACKEND_DIR) && python3 verify_aws_setup_prod.py

### PRODUCTION AWS STATUS

aws-db-status-prod: ## Check PRODUCTION DynamoDB tables status
	@echo "Checking PRODUCTION DynamoDB tables..."
	@aws dynamodb describe-table --table-name OsyleUsers-Prod --region us-east-1 \
		--query 'Table.[TableName,TableStatus,ItemCount]' --output table 2>/dev/null || echo "  OsyleUsers-Prod: Not found"
	@aws dynamodb describe-table --table-name OsyleTastes-Prod --region us-east-1 \
		--query 'Table.[TableName,TableStatus,ItemCount]' --output table 2>/dev/null || echo "  OsyleTastes-Prod: Not found"
	@aws dynamodb describe-table --table-name OsyleResources-Prod --region us-east-1 \
		--query 'Table.[TableName,TableStatus,ItemCount]' --output table 2>/dev/null || echo "  OsyleResources-Prod: Not found"
	@aws dynamodb describe-table --table-name OsyleProjects-Prod --region us-east-1 \
		--query 'Table.[TableName,TableStatus,ItemCount]' --output table 2>/dev/null || echo "  OsyleProjects-Prod: Not found"
	@aws dynamodb describe-table --table-name OsyleDesignMutations-Prod --region us-east-1 \
		--query 'Table.[TableName,TableStatus,ItemCount]' --output table 2>/dev/null || echo "  OsyleDesignMutations-Prod: Not found"
	@aws dynamodb describe-table --table-name OsyleFigmaRelay-Prod --region us-east-1 \
		--query 'Table.[TableName,TableStatus,ItemCount]' --output table 2>/dev/null || echo "  OsyleFigmaRelay-Prod: Not found (run: make aws-create-relay-table)"

aws-relay-status: ## Show active Figma relay payloads in PRODUCTION (debugging)
	@echo "Checking OsyleFigmaRelay-Prod (active payloads)..."
	@aws dynamodb scan \
		--table-name OsyleFigmaRelay-Prod \
		--region us-east-1 \
		--filter-expression "acked = :f" \
		--expression-attribute-values '{":f":{"BOOL":false}}' \
		--query 'Items[*].{token:token.S, direction:direction.S, ttl:ttl.N}' \
		--output table 2>/dev/null || echo "  Table not found or empty"

aws-relay-flush: ## Delete all active relay payloads in PRODUCTION (unblocks stuck state)
	@echo "⚠️  Flushing all active Figma relay payloads..."
	@aws dynamodb scan \
		--table-name OsyleFigmaRelay-Prod \
		--region us-east-1 \
		--query 'Items[*].token.S' \
		--output text 2>/dev/null | tr '\t' '\n' | while read token; do \
			[ -n "$$token" ] && aws dynamodb delete-item \
				--table-name OsyleFigmaRelay-Prod \
				--region us-east-1 \
				--key "{\"token\":{\"S\":\"$$token\"}}" 2>/dev/null && echo "  Deleted: $$token"; \
		done
	@echo "✅ Relay flushed"

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
	@echo ""
	@make relay-status

### PRODUCTION DEPLOYMENT

deploy-prod: ## Deploy to PRODUCTION (backend + frontend)
	@echo "🚀 Deploying to PRODUCTION..."
	./infra/scripts/deploy-all.sh

### PRODUCTION CLEANUP (DANGEROUS)

aws-delete-tables-prod: ## Delete PRODUCTION DynamoDB tables (DESTRUCTIVE)
	@echo "⚠️  WARNING: This will DELETE all PRODUCTION DynamoDB tables!"
	@echo "⚠️  This will permanently delete production data!"
	@read -p "Type 'delete-prod' to confirm: " confirm && [ "$$confirm" = "delete-prod" ] || exit 1
	aws dynamodb delete-table --table-name OsyleUsers-Prod --region us-east-1 2>/dev/null || true
	aws dynamodb delete-table --table-name OsyleTastes-Prod --region us-east-1 2>/dev/null || true
	aws dynamodb delete-table --table-name OsyleResources-Prod --region us-east-1 2>/dev/null || true
	aws dynamodb delete-table --table-name OsyleProjects-Prod --region us-east-1 2>/dev/null || true
	aws dynamodb delete-table --table-name OsyleDesignMutations-Prod --region us-east-1 2>/dev/null || true
	aws dynamodb delete-table --table-name OsyleFigmaRelay-Prod --region us-east-1 2>/dev/null || true
	@echo "✅ All production tables deleted"

aws-empty-bucket-prod: ## Empty PRODUCTION S3 bucket (DESTRUCTIVE)
	@echo "⚠️  WARNING: This will DELETE all files in PRODUCTION S3 bucket!"
	@echo "⚠️  This will permanently delete production data!"
	@read -p "Are you sure? (yes/no): " confirm && [ "$$confirm" = "yes" ] || exit 1
	aws s3 rm s3://osyle-shared-assets-prod --recursive
	@echo "✅ Production bucket emptied"

### DEVELOPMENT BACKUP
# Note: OsyleFigmaRelay is in-memory for dev — no DynamoDB table, nothing to back up.

aws-backup-tables: ## Backup DEV DynamoDB tables to local JSON files
	@echo "📦 Backing up DEV DynamoDB tables..."
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
	echo "✅ DEV tables backed up to $$BACKUP_DIR/"

aws-backup-bucket: ## Backup DEV S3 bucket to local files
	@echo "📦 Backing up DEV S3 bucket..."
	@mkdir -p backups/s3/dev/$$(date +%Y%m%d-%H%M%S)
	@BACKUP_DIR="backups/s3/dev/$$(date +%Y%m%d-%H%M%S)" && \
	aws s3 sync s3://osyle-shared-assets $$BACKUP_DIR/ && \
	echo "✅ DEV bucket backed up to $$BACKUP_DIR/"

aws-backup-all: ## Backup DEV DynamoDB tables and S3 bucket
	@echo "📦 Creating full DEV backup..."
	@$(MAKE) aws-backup-tables
	@$(MAKE) aws-backup-bucket
	@echo "✅ Full DEV backup complete"

### PRODUCTION BACKUP
# Note: OsyleFigmaRelay-Prod is intentionally excluded from backups.
#       Payloads are ephemeral (10min TTL, auto-deleted by DynamoDB).
#       Backing them up serves no purpose — they are transient bridge data.

aws-backup-tables-prod: ## Backup PRODUCTION DynamoDB tables to local JSON files
	@echo "📦 Backing up PRODUCTION DynamoDB tables..."
	@echo "   (Skipping OsyleFigmaRelay-Prod — ephemeral, 10min TTL, no value backing up)"
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
	echo "✅ PRODUCTION tables backed up to $$BACKUP_DIR/"

aws-backup-bucket-prod: ## Backup PRODUCTION S3 bucket to local files
	@echo "📦 Backing up PRODUCTION S3 bucket..."
	@mkdir -p backups/s3/prod/$$(date +%Y%m%d-%H%M%S)
	@BACKUP_DIR="backups/s3/prod/$$(date +%Y%m%d-%H%M%S)" && \
	aws s3 sync s3://osyle-shared-assets-prod $$BACKUP_DIR/ && \
	echo "✅ PRODUCTION bucket backed up to $$BACKUP_DIR/"

aws-backup-all-prod: ## Backup PRODUCTION DynamoDB tables and S3 bucket
	@echo "📦 Creating full PRODUCTION backup..."
	@$(MAKE) aws-backup-tables-prod
	@$(MAKE) aws-backup-bucket-prod
	@echo "✅ Full PRODUCTION backup complete"

### PRODUCTION FIRST TIME SETUP

first-time-setup-prod: ## Complete PRODUCTION first-time setup (run ONCE)
	@echo "=============================================="
	@echo "PRODUCTION FIRST TIME SETUP"
	@echo "=============================================="
	@echo ""
	@echo "Step 1: Creating PRODUCTION DynamoDB tables (includes relay table)..."
	@make aws-create-tables-prod
	@echo ""
	@echo "Step 2: Creating PRODUCTION S3 bucket..."
	@make aws-create-bucket-prod || echo "Bucket may already exist"
	@echo ""
	@echo "Step 3: Verifying PRODUCTION setup..."
	@make aws-verify-prod
	@echo ""
	@echo "✅ Production setup complete! Now run: make deploy-prod"