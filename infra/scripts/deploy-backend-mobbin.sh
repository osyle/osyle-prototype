#!/bin/bash
set -e

echo "🚀 Deploying Osyle Backend with Playwright to Lambda..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

REGION="us-east-1"
FUNCTION_NAME="osyle-api"
WEBSOCKET_API_ID="n6m806tmzk"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO_NAME="osyle-backend"

echo -e "${BLUE}Account ID: ${ACCOUNT_ID}${NC}"
echo -e "${BLUE}Region: ${REGION}${NC}"

# Navigate to backend directory
cd services/backend

# Check if ECR repository exists
echo -e "${BLUE}📦 Checking ECR repository...${NC}"
ECR_REPO_URI=$(aws ecr describe-repositories \
    --repository-names ${ECR_REPO_NAME} \
    --region ${REGION} \
    --query 'repositories[0].repositoryUri' \
    --output text 2>/dev/null || echo "")

if [ -z "$ECR_REPO_URI" ]; then
    echo -e "${BLUE}Creating ECR repository...${NC}"
    ECR_REPO_URI=$(aws ecr create-repository \
        --repository-name ${ECR_REPO_NAME} \
        --region ${REGION} \
        --query 'repository.repositoryUri' \
        --output text)
    echo -e "${GREEN}✓ ECR repository created${NC}"
else
    echo -e "${GREEN}✓ ECR repository exists${NC}"
fi

echo -e "${BLUE}ECR Repository: ${ECR_REPO_URI}${NC}"

# Login to ECR
echo -e "${BLUE}🔐 Logging in to ECR...${NC}"
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REPO_URI}

# Build Docker image for Lambda with Playwright
echo -e "${BLUE}🐳 Building Docker image with Playwright...${NC}"
docker build --platform linux/amd64 -t ${ECR_REPO_NAME}:latest -f Dockerfile.lambda .

# Tag image for ECR
docker tag ${ECR_REPO_NAME}:latest ${ECR_REPO_URI}:latest

# Push to ECR
echo -e "${BLUE}⬆️  Pushing image to ECR...${NC}"
docker push ${ECR_REPO_URI}:latest

# Get image digest
IMAGE_URI="${ECR_REPO_URI}:latest"

# Check if Lambda function exists
echo -e "${BLUE}Checking if Lambda function exists...${NC}"
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
    echo -e "${BLUE}Updating existing Lambda function...${NC}"
    
    # Update function code
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --image-uri ${IMAGE_URI} \
        --region $REGION \
        --no-cli-pager
    
    echo -e "${GREEN}✓ Lambda function code updated${NC}"
else
    echo -e "${BLUE}Creating new Lambda function...${NC}"
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --package-type Image \
        --code ImageUri=${IMAGE_URI} \
        --role arn:aws:iam::${ACCOUNT_ID}:role/lambda-execution-role \
        --timeout 900 \
        --memory-size 2048 \
        --ephemeral-storage '{"Size": 1024}' \
        --region $REGION \
        --no-cli-pager
    
    echo -e "${GREEN}✓ Lambda function created${NC}"
fi

# Wait for Lambda to be ready
echo -e "${BLUE}Waiting for Lambda to be ready...${NC}"
aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION

# Update function configuration (for existing functions)
echo -e "${BLUE}Verifying Lambda configuration...${NC}"
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --timeout 900 \
    --memory-size 2048 \
    --ephemeral-storage '{"Size": 1024}' \
    --region $REGION \
    --no-cli-pager > /dev/null

# Wait for configuration update
aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION

# Verify configuration
CONFIG=$(aws lambda get-function-configuration \
    --function-name $FUNCTION_NAME \
    --region $REGION)

MEMORY=$(echo $CONFIG | jq -r '.MemorySize')
TIMEOUT=$(echo $CONFIG | jq -r '.Timeout')
STORAGE=$(echo $CONFIG | jq -r '.EphemeralStorage.Size')

echo -e "${GREEN}✓ Memory: ${MEMORY} MB${NC}"
echo -e "${GREEN}✓ Timeout: ${TIMEOUT} seconds${NC}"
echo -e "${GREEN}✓ Ephemeral Storage: ${STORAGE} MB${NC}"

# Check if HTTP API Gateway exists
echo -e "${BLUE}Checking HTTP API Gateway...${NC}"
API_ID=$(aws apigatewayv2 get-apis \
    --region $REGION \
    --query "Items[?Name=='osyle-api'].ApiId" \
    --output text)

if [ -z "$API_ID" ]; then
    echo -e "${BLUE}Creating HTTP API Gateway...${NC}"
    API_ID=$(aws apigatewayv2 create-api \
        --name osyle-api \
        --protocol-type HTTP \
        --target arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME} \
        --region $REGION \
        --query 'ApiId' \
        --output text)
    
    echo -e "${GREEN}✓ HTTP API Gateway created${NC}"
else
    echo -e "${GREEN}✓ HTTP API Gateway already exists${NC}"
fi

# Grant HTTP API Gateway permission to invoke Lambda
echo -e "${BLUE}Configuring HTTP API Gateway permissions...${NC}"
aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id apigateway-invoke-$(date +%s) \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*" \
    --region $REGION \
    --no-cli-pager 2>/dev/null || echo "  (Permission already exists)"

# Check WebSocket API exists
echo -e "${BLUE}Checking WebSocket API Gateway...${NC}"
WS_EXISTS=$(aws apigatewayv2 get-api \
    --api-id $WEBSOCKET_API_ID \
    --region $REGION \
    --query 'ApiId' \
    --output text 2>/dev/null || echo "")

if [ -z "$WS_EXISTS" ]; then
    echo -e "${RED}✗ WebSocket API not found!${NC}"
    echo -e "${YELLOW}Run this once to create it:${NC}"
    echo -e "  aws apigatewayv2 create-api --name osyle-websocket-api --protocol-type WEBSOCKET --route-selection-expression '\$request.body.action' --region us-east-1"
    exit 1
else
    echo -e "${GREEN}✓ WebSocket API exists${NC}"
fi

# Grant WebSocket API permission to invoke Lambda
echo -e "${BLUE}Configuring WebSocket API Gateway permissions...${NC}"
aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id websocket-invoke-$(date +%s) \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${WEBSOCKET_API_ID}/*" \
    --region $REGION \
    --no-cli-pager 2>/dev/null || echo "  (Permission already exists)"

# Get API endpoints
API_ENDPOINT="https://${API_ID}.execute-api.${REGION}.amazonaws.com"
WS_ENDPOINT="wss://${WEBSOCKET_API_ID}.execute-api.${REGION}.amazonaws.com/production"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Backend deployed successfully with Playwright!${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}HTTP API Endpoint:${NC} ${API_ENDPOINT}"
echo -e "${BLUE}WebSocket Endpoint:${NC} ${WS_ENDPOINT}"
echo -e "${BLUE}Lambda Function:${NC} ${FUNCTION_NAME}"
echo -e "${BLUE}Lambda Memory:${NC} ${MEMORY} MB"
echo -e "${BLUE}Lambda Timeout:${NC} ${TIMEOUT} seconds"
echo -e "${BLUE}HTTP API Gateway ID:${NC} ${API_ID}"
echo -e "${BLUE}WebSocket API Gateway ID:${NC} ${WEBSOCKET_API_ID}"
echo -e "${BLUE}ECR Image:${NC} ${IMAGE_URI}"
echo ""
echo -e "${BLUE}Test your APIs:${NC}"
echo -e "  curl ${API_ENDPOINT}/"
echo -e "  curl ${API_ENDPOINT}/api/health"
echo -e "  curl ${API_ENDPOINT}/api/mobbin/status"
echo ""
echo -e "${BLUE}Update your frontend .env:${NC}"
echo -e "  VITE_API_URL=${API_ENDPOINT}"
echo ""
echo -e "${YELLOW}⚠️  Note: First Mobbin request will be slow (~10s) as browser launches${NC}"
echo ""

cd ../..