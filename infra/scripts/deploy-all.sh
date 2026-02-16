#!/bin/bash
set -e

echo "🚀 Deploying Osyle Full Stack..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

REGION="us-east-1"
LAMBDA_FUNCTION="osyle-api"
AMPLIFY_APP_ID="d1z1przwpoqpmu"

# Get project root (2 levels up from this script)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo -e "${BLUE}Project root: ${PROJECT_ROOT}${NC}"

# Load backend .env
echo -e "${BLUE}📝 Loading backend environment variables...${NC}"
if [ -f "${PROJECT_ROOT}/services/backend/.env.production" ]; then
    export $(cat "${PROJECT_ROOT}/services/backend/.env.production" | grep -v '^#' | xargs)
    echo -e "${GREEN}✓ Backend .env loaded${NC}"
else
    echo -e "${RED}✗ services/backend/.env not found${NC}"
    exit 1
fi

# Load frontend production .env
echo -e "${BLUE}📝 Loading frontend production environment variables...${NC}"
if [ -f "${PROJECT_ROOT}/services/frontend/.env.production" ]; then
    export $(cat "${PROJECT_ROOT}/services/frontend/.env.production" | grep -v '^#' | xargs)
    echo -e "${GREEN}✓ Frontend .env.production loaded${NC}"
else
    echo -e "${RED}✗ services/frontend/.env.production not found${NC}"
    exit 1
fi

# Escape ALLOWED_ORIGINS for JSON (replace commas with escaped version)
ALLOWED_ORIGINS_ESCAPED=$(echo "$ALLOWED_ORIGINS" | sed 's/,/\\,/g')

# 1. Deploy backend code FIRST (in case function needs recreation)
echo -e "${BLUE}🚀 Deploying backend code...${NC}"
bash "${PROJECT_ROOT}/infra/scripts/deploy-backend.sh"

# Wait for function to be ready
echo -e "${BLUE}Waiting for Lambda function to be ready...${NC}"
aws lambda wait function-active --function-name $LAMBDA_FUNCTION --region $REGION 2>/dev/null || sleep 5

# 2. Update Lambda environment variables AFTER deployment
echo -e "${BLUE}🔧 Updating Lambda environment variables...${NC}"
aws lambda update-function-configuration \
    --function-name $LAMBDA_FUNCTION \
    --region $REGION \
    --environment "Variables={USER_POOL_ID=${USER_POOL_ID},S3_BUCKET=${S3_BUCKET},PRESIGNED_EXPIRATION=${PRESIGNED_EXPIRATION},USERS_TABLE=${USERS_TABLE},TASTES_TABLE=${TASTES_TABLE},RESOURCES_TABLE=${RESOURCES_TABLE},PROJECTS_TABLE=${PROJECTS_TABLE},ALLOWED_ORIGINS=${ALLOWED_ORIGINS_ESCAPED},ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}}" \
    --no-cli-pager > /dev/null

echo -e "${GREEN}✓ Lambda environment variables updated${NC}"

# 3. Update Amplify environment variables
echo -e "${BLUE}🔧 Updating Amplify environment variables...${NC}"
aws amplify update-app \
    --app-id $AMPLIFY_APP_ID \
    --region $REGION \
    --environment-variables VITE_API_URL=${VITE_API_URL},VITE_AWS_REGION=${VITE_AWS_REGION},VITE_USER_POOL_ID=${VITE_USER_POOL_ID},VITE_USER_POOL_CLIENT_ID=${VITE_USER_POOL_CLIENT_ID},VITE_OAUTH_DOMAIN=${VITE_OAUTH_DOMAIN},VITE_REDIRECT_SIGNIN=${VITE_REDIRECT_SIGNIN},VITE_REDIRECT_SIGNOUT=${VITE_REDIRECT_SIGNOUT} \
    --no-cli-pager > /dev/null

echo -e "${GREEN}✓ Amplify environment variables updated${NC}"

# 4. Trigger Amplify deployment
echo -e "${BLUE}🚀 Triggering Amplify deployment...${NC}"
JOB_ID=$(aws amplify start-job \
    --app-id $AMPLIFY_APP_ID \
    --branch-name main \
    --job-type RELEASE \
    --region $REGION \
    --query 'jobSummary.jobId' \
    --output text)

echo -e "${GREEN}✓ Amplify deployment triggered (Job ID: ${JOB_ID})${NC}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Full stack deployment complete!                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Frontend:${NC} https://main.d1z1przwpoqpmu.amplifyapp.com"
echo -e "${BLUE}Backend:${NC} ${VITE_API_URL}"
echo ""
echo -e "${YELLOW}Monitor Amplify build:${NC}"
echo -e "  aws amplify get-job --app-id $AMPLIFY_APP_ID --branch-name main --job-id $JOB_ID --region $REGION"
echo ""