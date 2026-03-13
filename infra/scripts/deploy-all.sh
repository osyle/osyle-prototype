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

# 1. Deploy backend code FIRST (in case function needs recreation)
echo -e "${BLUE}🚀 Deploying backend code...${NC}"
bash "${PROJECT_ROOT}/infra/scripts/deploy-backend.sh"

# Wait for function to be ready
echo -e "${BLUE}Waiting for Lambda function to be ready...${NC}"
aws lambda wait function-active --function-name $LAMBDA_FUNCTION --region $REGION 2>/dev/null || sleep 5

# 2. Update Lambda environment variables AFTER deployment
echo -e "${BLUE}🔧 Updating Lambda environment variables...${NC}"
LAMBDA_ENV_JSON=$(grep -v '^#' "${PROJECT_ROOT}/services/backend/.env.production" \
    | grep '=' \
    | grep -v '^AWS_REGION=\|^AWS_ACCESS_KEY_ID=\|^AWS_SECRET_ACCESS_KEY=' \
    | while read -r line; do
        key="${line%%=*}"
        value="${line#*=}"
        printf '"%s":"%s",' "$key" "$value"
      done \
    | sed 's/,$//')
aws lambda update-function-configuration \
    --function-name $LAMBDA_FUNCTION \
    --region $REGION \
    --environment "{\"Variables\":{${LAMBDA_ENV_JSON}}}" \
    --no-cli-pager > /dev/null

echo -e "${GREEN}✓ Lambda environment variables updated${NC}"

# 3. Update HTTP API Gateway CORS (must include app.osyle.com or browser preflight will be blocked)
echo -e "${BLUE}🔧 Updating HTTP API Gateway CORS...${NC}"
HTTP_API_ID=$(aws apigatewayv2 get-apis \
    --region $REGION \
    --query 'Items[?Name==`osyle-api`].ApiId' \
    --output text)

if [ -n "$HTTP_API_ID" ]; then
    aws apigatewayv2 update-api \
        --api-id $HTTP_API_ID \
        --region $REGION \
        --cli-input-json "{\"ApiId\":\"$HTTP_API_ID\",\"CorsConfiguration\":{\"AllowOrigins\":[\"*\"],\"AllowMethods\":[\"GET\",\"POST\",\"PUT\",\"PATCH\",\"DELETE\",\"OPTIONS\"],\"AllowHeaders\":[\"content-type\",\"x-amz-date\",\"authorization\",\"x-api-key\",\"x-amz-security-token\"],\"AllowCredentials\":false,\"MaxAge\":3600}}" \
        --no-cli-pager > /dev/null
    echo -e "${GREEN}✓ HTTP API Gateway CORS updated${NC}"
else
    echo -e "${YELLOW}⚠️  Could not find HTTP API Gateway 'osyle-api' — skipping CORS update${NC}"
fi

# 4. Update S3 CORS (direct browser uploads via presigned URLs require this)
echo -e "${BLUE}🔧 Updating S3 CORS policy...${NC}"
aws s3api put-bucket-cors \
    --bucket osyle-shared-assets-prod \
    --cors-configuration '{"CORSRules":[{"AllowedOrigins":["https://app.osyle.com","https://main.d1z1przwpoqpmu.amplifyapp.com","http://localhost:3000","http://localhost:5173"],"AllowedMethods":["GET","PUT","POST","DELETE","HEAD"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3600}]}'
echo -e "${GREEN}✓ S3 CORS policy updated${NC}"

# 5. Ensure Amplify SPA rewrite rule exists (routes all paths to index.html for React Router)
echo -e "${BLUE}🔧 Configuring Amplify SPA rewrite rule...${NC}"
aws amplify update-app \
    --app-id $AMPLIFY_APP_ID \
    --region $REGION \
    --custom-rules '[{"source":"</^[^.]+$/>","target":"/index.html","status":"200"},{"source":"/<*>","target":"/index.html","status":"404-200"}]' \
    --no-cli-pager > /dev/null
echo -e "${GREEN}✓ Amplify SPA rewrite rule configured${NC}"

# 6. Update Amplify environment variables
echo -e "${BLUE}🔧 Updating Amplify environment variables...${NC}"
aws amplify update-app \
    --app-id $AMPLIFY_APP_ID \
    --region $REGION \
    --environment-variables VITE_API_URL=${VITE_API_URL},VITE_WS_URL=${VITE_WS_URL},VITE_AWS_REGION=${VITE_AWS_REGION},VITE_USER_POOL_ID=${VITE_USER_POOL_ID},VITE_USER_POOL_CLIENT_ID=${VITE_USER_POOL_CLIENT_ID},VITE_OAUTH_DOMAIN=${VITE_OAUTH_DOMAIN},VITE_REDIRECT_SIGNIN=${VITE_REDIRECT_SIGNIN},VITE_REDIRECT_SIGNOUT=${VITE_REDIRECT_SIGNOUT},VITE_RELAY_URL=${VITE_RELAY_URL} \
    --no-cli-pager > /dev/null

echo -e "${GREEN}✓ Amplify environment variables updated${NC}"

# 6. Trigger Amplify deployment
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