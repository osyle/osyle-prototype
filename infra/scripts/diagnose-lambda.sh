#!/bin/bash

echo "🔍 Diagnosing Lambda Function and WebSocket Handler..."
echo ""

REGION="us-east-1"
FUNCTION_NAME="osyle-api"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Lambda function configuration
echo -e "${BLUE}[1/4] Checking Lambda function configuration...${NC}"
LAMBDA_CONFIG=$(aws lambda get-function-configuration \
    --function-name $FUNCTION_NAME \
    --region $REGION 2>/dev/null)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Lambda function exists${NC}"
    echo "$LAMBDA_CONFIG" | jq -r '"  Runtime: \(.Runtime)\n  Timeout: \(.Timeout)s\n  Memory: \(.MemorySize)MB\n  Handler: \(.Handler)"'
    
    # Check environment variables
    HAS_USER_POOL=$(echo "$LAMBDA_CONFIG" | jq -r '.Environment.Variables.USER_POOL_ID // "NOT_SET"')
    HAS_ANTHROPIC_KEY=$(echo "$LAMBDA_CONFIG" | jq -r '.Environment.Variables.ANTHROPIC_API_KEY // "NOT_SET"')
    
    if [ "$HAS_USER_POOL" = "NOT_SET" ]; then
        echo -e "${RED}  ❌ USER_POOL_ID not set in Lambda environment${NC}"
    else
        echo -e "${GREEN}  ✓ USER_POOL_ID: $HAS_USER_POOL${NC}"
    fi
    
    if [ "$HAS_ANTHROPIC_KEY" = "NOT_SET" ]; then
        echo -e "${RED}  ❌ ANTHROPIC_API_KEY not set in Lambda environment${NC}"
    else
        echo -e "${GREEN}  ✓ ANTHROPIC_API_KEY is set${NC}"
    fi
else
    echo -e "${RED}❌ Lambda function not found!${NC}"
    exit 1
fi

echo ""

# Check recent Lambda invocations
echo -e "${BLUE}[2/4] Checking recent Lambda invocations (last 5 minutes)...${NC}"
START_TIME=$(($(date +%s) - 300))000  # 5 minutes ago in milliseconds
LOG_GROUP="/aws/lambda/$FUNCTION_NAME"

# Check if log group exists
aws logs describe-log-groups \
    --log-group-name-prefix "$LOG_GROUP" \
    --region $REGION 2>/dev/null | grep -q "$LOG_GROUP"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Log group exists: $LOG_GROUP${NC}"
    
    # Get recent log streams
    RECENT_STREAMS=$(aws logs describe-log-streams \
        --log-group-name "$LOG_GROUP" \
        --order-by LastEventTime \
        --descending \
        --max-items 3 \
        --region $REGION 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        STREAM_COUNT=$(echo "$RECENT_STREAMS" | jq '.logStreams | length')
        echo -e "${BLUE}Found $STREAM_COUNT recent log stream(s)${NC}"
        
        # Get latest stream
        LATEST_STREAM=$(echo "$RECENT_STREAMS" | jq -r '.logStreams[0].logStreamName // empty')
        
        if [ ! -z "$LATEST_STREAM" ]; then
            echo -e "${BLUE}Latest stream: $LATEST_STREAM${NC}"
            echo ""
            echo -e "${YELLOW}Recent log events (last 20):${NC}"
            
            # Get recent events
            aws logs get-log-events \
                --log-group-name "$LOG_GROUP" \
                --log-stream-name "$LATEST_STREAM" \
                --limit 20 \
                --region $REGION 2>/dev/null | \
                jq -r '.events[] | "  [\(.timestamp | todate)] \(.message)"' | tail -20
        fi
    fi
else
    echo -e "${YELLOW}⚠ No log group found${NC}"
fi

echo ""

# Check for WebSocket-specific errors in logs
echo -e "${BLUE}[3/4] Searching for WebSocket errors in logs (last 1 hour)...${NC}"
START_TIME=$(($(date +%s) - 3600))000  # 1 hour ago

# Search for error patterns
ERROR_PATTERNS=(
    "WebSocket"
    "websocket"
    "WS_1008"
    "connection"
    "POLICY_VIOLATION"
    "unauthorized"
    "authentication"
    "Error"
    "Exception"
    "Traceback"
)

for PATTERN in "${ERROR_PATTERNS[@]}"; do
    RESULTS=$(aws logs filter-log-events \
        --log-group-name "$LOG_GROUP" \
        --start-time $START_TIME \
        --filter-pattern "$PATTERN" \
        --region $REGION 2>/dev/null | \
        jq -r '.events[].message' 2>/dev/null | head -5)
    
    if [ ! -z "$RESULTS" ]; then
        echo -e "${YELLOW}Found '$PATTERN' in logs:${NC}"
        echo "$RESULTS" | sed 's/^/  /'
        echo ""
    fi
done

echo ""

# Check Lambda package size and dependencies
echo -e "${BLUE}[4/4] Checking Lambda deployment package...${NC}"
CODE_SIZE=$(echo "$LAMBDA_CONFIG" | jq -r '.CodeSize')
CODE_SIZE_MB=$((CODE_SIZE / 1024 / 1024))

echo -e "${BLUE}Code size: ${CODE_SIZE_MB}MB${NC}"

if [ $CODE_SIZE_MB -gt 250 ]; then
    echo -e "${YELLOW}⚠ Code size is large (${CODE_SIZE_MB}MB). Verify all dependencies are needed.${NC}"
else
    echo -e "${GREEN}✓ Code size is reasonable${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}NEXT STEPS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}To see real-time logs when testing WebSocket:${NC}"
echo "  aws logs tail $LOG_GROUP --follow --region $REGION"
echo ""
echo -e "${YELLOW}To test WebSocket connection with a real token:${NC}"
echo "  1. Get a valid JWT token from your frontend auth"
echo "  2. Test with: wscat -c 'wss://n6m806tmzk.execute-api.us-east-1.amazonaws.com/production?token=YOUR_TOKEN'"
echo ""