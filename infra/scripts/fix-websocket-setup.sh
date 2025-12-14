#!/bin/bash
set -e

echo "🔧 Setting Up WebSocket API Gateway for Osyle..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

REGION="us-east-1"
FUNCTION_NAME="osyle-api"
WEBSOCKET_API_ID="n6m806tmzk"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo -e "${BLUE}Account ID: ${ACCOUNT_ID}${NC}"
echo -e "${BLUE}Region: ${REGION}${NC}"
echo -e "${BLUE}WebSocket API ID: ${WEBSOCKET_API_ID}${NC}"

# Check if WebSocket API exists
echo -e "${BLUE}Checking WebSocket API...${NC}"
WS_EXISTS=$(aws apigatewayv2 get-api \
    --api-id $WEBSOCKET_API_ID \
    --region $REGION \
    --query 'ApiId' \
    --output text 2>/dev/null || echo "")

if [ -z "$WS_EXISTS" ]; then
    echo -e "${RED}❌ WebSocket API not found!${NC}"
    echo -e "${YELLOW}Creating WebSocket API...${NC}"
    
    WEBSOCKET_API_ID=$(aws apigatewayv2 create-api \
        --name osyle-websocket-api \
        --protocol-type WEBSOCKET \
        --route-selection-expression '\$request.body.action' \
        --region $REGION \
        --query 'ApiId' \
        --output text)
    
    echo -e "${GREEN}✓ WebSocket API created: ${WEBSOCKET_API_ID}${NC}"
else
    echo -e "${GREEN}✓ WebSocket API exists${NC}"
fi

# Get Lambda ARN
LAMBDA_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}"
echo -e "${BLUE}Lambda ARN: ${LAMBDA_ARN}${NC}"

# Create Integration
echo -e "${BLUE}Creating/Updating Lambda integration...${NC}"

# Check if integration exists
EXISTING_INTEGRATIONS=$(aws apigatewayv2 get-integrations \
    --api-id $WEBSOCKET_API_ID \
    --region $REGION \
    --query 'Items[?IntegrationUri==`'$LAMBDA_ARN'`].IntegrationId' \
    --output text 2>/dev/null || echo "")

if [ -z "$EXISTING_INTEGRATIONS" ]; then
    echo -e "${YELLOW}Creating new integration...${NC}"
    INTEGRATION_ID=$(aws apigatewayv2 create-integration \
        --api-id $WEBSOCKET_API_ID \
        --integration-type AWS_PROXY \
        --integration-uri $LAMBDA_ARN \
        --region $REGION \
        --query 'IntegrationId' \
        --output text)
    echo -e "${GREEN}✓ Integration created: ${INTEGRATION_ID}${NC}"
else
    INTEGRATION_ID=$EXISTING_INTEGRATIONS
    echo -e "${GREEN}✓ Integration already exists: ${INTEGRATION_ID}${NC}"
fi

# Create Routes
echo -e "${BLUE}Creating/Updating routes...${NC}"

# Function to create or update route
create_or_update_route() {
    local ROUTE_KEY=$1
    local ROUTE_NAME=$2
    
    # Check if route exists
    EXISTING_ROUTE=$(aws apigatewayv2 get-routes \
        --api-id $WEBSOCKET_API_ID \
        --region $REGION \
        --query "Items[?RouteKey=='${ROUTE_KEY}'].RouteId" \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$EXISTING_ROUTE" ]; then
        echo -e "${YELLOW}  Creating ${ROUTE_NAME} route...${NC}"
        aws apigatewayv2 create-route \
            --api-id $WEBSOCKET_API_ID \
            --route-key "$ROUTE_KEY" \
            --target "integrations/${INTEGRATION_ID}" \
            --region $REGION \
            --no-cli-pager > /dev/null
        echo -e "${GREEN}  ✓ ${ROUTE_NAME} route created${NC}"
    else
        echo -e "${YELLOW}  Updating ${ROUTE_NAME} route...${NC}"
        aws apigatewayv2 update-route \
            --api-id $WEBSOCKET_API_ID \
            --route-id "$EXISTING_ROUTE" \
            --target "integrations/${INTEGRATION_ID}" \
            --region $REGION \
            --no-cli-pager > /dev/null
        echo -e "${GREEN}  ✓ ${ROUTE_NAME} route updated${NC}"
    fi
}

# Create all necessary routes
create_or_update_route '$connect' 'Connect'
create_or_update_route '$disconnect' 'Disconnect'
create_or_update_route '$default' 'Default'

# Grant API Gateway permission to invoke Lambda
echo -e "${BLUE}Configuring Lambda permissions...${NC}"

# Remove old permission if exists (to avoid conflicts)
aws lambda remove-permission \
    --function-name $FUNCTION_NAME \
    --statement-id websocket-connect \
    --region $REGION \
    --no-cli-pager 2>/dev/null || true

aws lambda remove-permission \
    --function-name $FUNCTION_NAME \
    --statement-id websocket-default \
    --region $REGION \
    --no-cli-pager 2>/dev/null || true

# Add permissions for WebSocket routes
aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id websocket-connect \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${WEBSOCKET_API_ID}/*" \
    --region $REGION \
    --no-cli-pager > /dev/null

echo -e "${GREEN}✓ Lambda permissions configured${NC}"

# Check if deployment/stage exists
echo -e "${BLUE}Checking deployment stage...${NC}"

STAGE_EXISTS=$(aws apigatewayv2 get-stages \
    --api-id $WEBSOCKET_API_ID \
    --region $REGION \
    --query "Items[?StageName=='production'].StageName" \
    --output text 2>/dev/null || echo "")

if [ -z "$STAGE_EXISTS" ]; then
    echo -e "${YELLOW}Creating production stage...${NC}"
    
    # Create deployment first
    DEPLOYMENT_ID=$(aws apigatewayv2 create-deployment \
        --api-id $WEBSOCKET_API_ID \
        --region $REGION \
        --query 'DeploymentId' \
        --output text)
    
    # Create stage
    aws apigatewayv2 create-stage \
        --api-id $WEBSOCKET_API_ID \
        --stage-name production \
        --deployment-id $DEPLOYMENT_ID \
        --region $REGION \
        --no-cli-pager > /dev/null
    
    echo -e "${GREEN}✓ Production stage created${NC}"
else
    echo -e "${YELLOW}Redeploying to production stage...${NC}"
    
    # Create new deployment
    DEPLOYMENT_ID=$(aws apigatewayv2 create-deployment \
        --api-id $WEBSOCKET_API_ID \
        --region $REGION \
        --query 'DeploymentId' \
        --output text)
    
    # Update stage
    aws apigatewayv2 update-stage \
        --api-id $WEBSOCKET_API_ID \
        --stage-name production \
        --deployment-id $DEPLOYMENT_ID \
        --region $REGION \
        --no-cli-pager > /dev/null
    
    echo -e "${GREEN}✓ Redeployed to production stage${NC}"
fi

# Get WebSocket endpoint
WS_ENDPOINT="wss://${WEBSOCKET_API_ID}.execute-api.${REGION}.amazonaws.com/production"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ WebSocket API Setup Complete!              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}WebSocket Endpoint:${NC} ${WS_ENDPOINT}"
echo -e "${BLUE}API ID:${NC} ${WEBSOCKET_API_ID}"
echo -e "${BLUE}Integration ID:${NC} ${INTEGRATION_ID}"
echo ""
echo -e "${YELLOW}Update your frontend .env:${NC}"
echo -e "  VITE_WS_URL=${WS_ENDPOINT}"
echo ""
echo -e "${BLUE}Test WebSocket connection:${NC}"
echo -e "  Use a WebSocket client to connect to: ${WS_ENDPOINT}"
echo ""
echo -e "${BLUE}Verify routes:${NC}"
echo -e "  aws apigatewayv2 get-routes --api-id ${WEBSOCKET_API_ID} --region ${REGION}"
echo ""