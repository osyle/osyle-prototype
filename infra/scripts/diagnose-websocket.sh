#!/bin/bash

echo "🔍 Diagnosing WebSocket API Configuration..."
echo ""

REGION="us-east-1"
WEBSOCKET_API_ID="n6m806tmzk"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}WebSocket API ID:${NC} ${WEBSOCKET_API_ID}"
echo -e "${BLUE}Region:${NC} ${REGION}"
echo -e "${BLUE}Account:${NC} ${ACCOUNT_ID}"
echo ""

# Check if API exists
echo -e "${BLUE}[1/5] Checking if WebSocket API exists...${NC}"
WS_INFO=$(aws apigatewayv2 get-api \
    --api-id $WEBSOCKET_API_ID \
    --region $REGION 2>/dev/null)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ WebSocket API exists${NC}"
    echo "$WS_INFO" | jq '.Name, .ProtocolType, .RouteSelectionExpression'
else
    echo -e "${RED}❌ WebSocket API not found!${NC}"
    echo "This is the problem - the API doesn't exist or you don't have permissions."
    exit 1
fi

echo ""

# Check integrations
echo -e "${BLUE}[2/5] Checking Lambda integrations...${NC}"
INTEGRATIONS=$(aws apigatewayv2 get-integrations \
    --api-id $WEBSOCKET_API_ID \
    --region $REGION 2>/dev/null)

if [ $? -eq 0 ]; then
    INTEGRATION_COUNT=$(echo "$INTEGRATIONS" | jq '.Items | length')
    echo -e "${BLUE}Found ${INTEGRATION_COUNT} integration(s)${NC}"
    
    if [ "$INTEGRATION_COUNT" -eq 0 ]; then
        echo -e "${RED}❌ No integrations found! This is why WebSocket fails.${NC}"
    else
        echo "$INTEGRATIONS" | jq -r '.Items[] | "  - Type: \(.IntegrationType), URI: \(.IntegrationUri)"'
        echo -e "${GREEN}✓ Integrations configured${NC}"
    fi
else
    echo -e "${RED}❌ Failed to get integrations${NC}"
fi

echo ""

# Check routes
echo -e "${BLUE}[3/5] Checking routes...${NC}"
ROUTES=$(aws apigatewayv2 get-routes \
    --api-id $WEBSOCKET_API_ID \
    --region $REGION 2>/dev/null)

if [ $? -eq 0 ]; then
    ROUTE_COUNT=$(echo "$ROUTES" | jq '.Items | length')
    echo -e "${BLUE}Found ${ROUTE_COUNT} route(s)${NC}"
    
    if [ "$ROUTE_COUNT" -eq 0 ]; then
        echo -e "${RED}❌ No routes found! This is why WebSocket fails.${NC}"
        echo -e "${YELLOW}You need at least: \$connect, \$disconnect, and \$default routes${NC}"
    else
        echo "$ROUTES" | jq -r '.Items[] | "  - Route: \(.RouteKey), Target: \(.Target // "NONE")"'
        
        # Check for required routes
        HAS_CONNECT=$(echo "$ROUTES" | jq -r '.Items[] | select(.RouteKey == "$connect") | .RouteKey')
        HAS_DISCONNECT=$(echo "$ROUTES" | jq -r '.Items[] | select(.RouteKey == "$disconnect") | .RouteKey')
        HAS_DEFAULT=$(echo "$ROUTES" | jq -r '.Items[] | select(.RouteKey == "$default") | .RouteKey')
        
        if [ -z "$HAS_CONNECT" ]; then
            echo -e "${RED}  ❌ Missing \$connect route${NC}"
        else
            echo -e "${GREEN}  ✓ \$connect route exists${NC}"
        fi
        
        if [ -z "$HAS_DISCONNECT" ]; then
            echo -e "${RED}  ❌ Missing \$disconnect route${NC}"
        else
            echo -e "${GREEN}  ✓ \$disconnect route exists${NC}"
        fi
        
        if [ -z "$HAS_DEFAULT" ]; then
            echo -e "${RED}  ❌ Missing \$default route${NC}"
        else
            echo -e "${GREEN}  ✓ \$default route exists${NC}"
        fi
    fi
else
    echo -e "${RED}❌ Failed to get routes${NC}"
fi

echo ""

# Check stages
echo -e "${BLUE}[4/5] Checking stages...${NC}"
STAGES=$(aws apigatewayv2 get-stages \
    --api-id $WEBSOCKET_API_ID \
    --region $REGION 2>/dev/null)

if [ $? -eq 0 ]; then
    STAGE_COUNT=$(echo "$STAGES" | jq '.Items | length')
    echo -e "${BLUE}Found ${STAGE_COUNT} stage(s)${NC}"
    
    if [ "$STAGE_COUNT" -eq 0 ]; then
        echo -e "${RED}❌ No stages found! WebSocket needs a deployed stage.${NC}"
    else
        echo "$STAGES" | jq -r '.Items[] | "  - Stage: \(.StageName), DeploymentId: \(.DeploymentId // "NONE")"'
        
        HAS_PRODUCTION=$(echo "$STAGES" | jq -r '.Items[] | select(.StageName == "production") | .StageName')
        if [ -z "$HAS_PRODUCTION" ]; then
            echo -e "${RED}  ❌ 'production' stage not found${NC}"
        else
            echo -e "${GREEN}  ✓ 'production' stage exists${NC}"
        fi
    fi
else
    echo -e "${RED}❌ Failed to get stages${NC}"
fi

echo ""

# Check Lambda permissions
echo -e "${BLUE}[5/5] Checking Lambda permissions...${NC}"
LAMBDA_POLICY=$(aws lambda get-policy \
    --function-name osyle-api \
    --region $REGION 2>/dev/null)

if [ $? -eq 0 ]; then
    WS_PERMISSIONS=$(echo "$LAMBDA_POLICY" | jq -r '.Policy' | jq -r ".Statement[] | select(.Condition.ArnLike.\"AWS:SourceArn\" | contains(\"${WEBSOCKET_API_ID}\")) | .Sid")
    
    if [ -z "$WS_PERMISSIONS" ]; then
        echo -e "${RED}❌ No WebSocket permissions found for Lambda${NC}"
    else
        echo -e "${GREEN}✓ WebSocket permissions configured${NC}"
        echo "  Statements: $WS_PERMISSIONS"
    fi
else
    echo -e "${YELLOW}⚠ Could not check Lambda policy${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}DIAGNOSIS SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"

# Provide recommendation
if [ "$INTEGRATION_COUNT" -eq 0 ] || [ "$ROUTE_COUNT" -eq 0 ] || [ "$STAGE_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ WebSocket API is NOT properly configured${NC}"
    echo ""
    echo -e "${YELLOW}ISSUE IDENTIFIED:${NC}"
    if [ "$INTEGRATION_COUNT" -eq 0 ]; then
        echo "  - No Lambda integration configured"
    fi
    if [ "$ROUTE_COUNT" -eq 0 ]; then
        echo "  - No routes configured (\$connect, \$disconnect, \$default)"
    fi
    if [ "$STAGE_COUNT" -eq 0 ]; then
        echo "  - No deployment stage configured"
    fi
    echo ""
    echo -e "${GREEN}SOLUTION:${NC}"
    echo "  Run the fix-websocket-setup.sh script to configure everything automatically"
else
    echo -e "${GREEN}✓ WebSocket API appears to be configured${NC}"
    echo ""
    echo -e "${YELLOW}If connections still fail, check:${NC}"
    echo "  1. Lambda function is deployed and working"
    echo "  2. CORS/authentication in your Lambda code"
    echo "  3. CloudWatch logs for Lambda errors"
fi

echo ""