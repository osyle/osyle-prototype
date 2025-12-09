#!/bin/bash
set -e

echo "🚀 Deploying Osyle Backend..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

REGION="us-east-1"
FUNCTION_NAME="osyle-api"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo -e "${BLUE}Account ID: ${ACCOUNT_ID}${NC}"
echo -e "${BLUE}Region: ${REGION}${NC}"

# Build backend package
echo -e "${BLUE}📦 Building backend package...${NC}"
cd services/backend

# Clean previous builds
rm -rf package deployment.zip

# Create package directory
mkdir -p package

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo -e "${BLUE}Using Docker to build Lambda-compatible package...${NC}"
    
    # Create a temporary Dockerfile
    cat > Dockerfile.build <<'EOF'
FROM public.ecr.aws/sam/build-python3.11:latest

WORKDIR /build

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install -r requirements.txt -t /build/package/ --no-cache-dir

# The output will be in /build/package/
EOF

    # Build the Docker image
    docker build --platform linux/amd64 -f Dockerfile.build -t lambda-builder:latest . -q
    
    # Run the container to extract the built packages
    docker run --rm \
        --platform linux/amd64 \
        -v "$(pwd)/package":/output \
        lambda-builder:latest \
        bash -c "cp -r /build/package/* /output/"
    
    # Clean up
    rm -f Dockerfile.build
    
    # Fix permissions on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sudo chown -R $(id -u):$(id -g) package 2>/dev/null || chown -R $(id -u):$(id -g) package
    fi
    
    echo -e "${GREEN}✓ Dependencies installed in Lambda-compatible environment${NC}"
else
    echo -e "${YELLOW}⚠️  Docker not found. Installing dependencies locally...${NC}"
    echo -e "${YELLOW}⚠️  This may cause issues if you're not on Amazon Linux${NC}"
    
    # Fallback: Install with platform-specific flags
    pip3 install -r requirements.txt -t package/ \
        --platform manylinux2014_x86_64 \
        --implementation cp \
        --python-version 3.11 \
        --only-binary=:all: \
        --upgrade \
        --no-cache-dir
fi

# Copy application code
echo -e "${BLUE}Copying application code...${NC}"
cp -r app package/

# Create deployment package
cd package
echo -e "${BLUE}Creating deployment package...${NC}"
zip -r ../deployment.zip . -q
cd ..

PACKAGE_SIZE=$(ls -lh deployment.zip | awk '{print $5}')
echo -e "${GREEN}✓ Package created: ${PACKAGE_SIZE}${NC}"

# Check package size (Lambda has a 50MB direct upload limit)
PACKAGE_SIZE_BYTES=$(stat -f%z deployment.zip 2>/dev/null || stat -c%s deployment.zip 2>/dev/null)
if [ "$PACKAGE_SIZE_BYTES" -gt 52428800 ]; then
    echo -e "${RED}✗ Package size exceeds 50MB. Consider using Lambda layers or S3.${NC}"
    exit 1
fi

# Check if Lambda function exists
echo -e "${BLUE}Checking if Lambda function exists...${NC}"
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
    echo -e "${BLUE}Updating existing Lambda function...${NC}"
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://deployment.zip \
        --region $REGION \
        --no-cli-pager
    
    echo -e "${GREEN}✓ Lambda function updated${NC}"
else
    echo -e "${BLUE}Creating new Lambda function...${NC}"
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime python3.11 \
        --role arn:aws:iam::${ACCOUNT_ID}:role/lambda-execution-role \
        --handler app.main.handler \
        --zip-file fileb://deployment.zip \
        --timeout 30 \
        --memory-size 512 \
        --region $REGION \
        --no-cli-pager
    
    echo -e "${GREEN}✓ Lambda function created${NC}"
fi

# Wait for Lambda to be ready
echo -e "${BLUE}Waiting for Lambda to be ready...${NC}"
aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION

# Check if API Gateway exists
echo -e "${BLUE}Checking API Gateway...${NC}"
API_ID=$(aws apigatewayv2 get-apis \
    --region $REGION \
    --query "Items[?Name=='osyle-api'].ApiId" \
    --output text)

if [ -z "$API_ID" ]; then
    echo -e "${BLUE}Creating API Gateway...${NC}"
    API_ID=$(aws apigatewayv2 create-api \
        --name osyle-api \
        --protocol-type HTTP \
        --target arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME} \
        --region $REGION \
        --query 'ApiId' \
        --output text)
    
    echo -e "${GREEN}✓ API Gateway created${NC}"
else
    echo -e "${GREEN}✓ API Gateway already exists${NC}"
fi

# Grant API Gateway permission to invoke Lambda
echo -e "${BLUE}Configuring API Gateway permissions...${NC}"
aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id apigateway-invoke-$(date +%s) \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*" \
    --region $REGION \
    --no-cli-pager 2>/dev/null || echo "Permission already exists"

# Get API endpoint
API_ENDPOINT="https://${API_ID}.execute-api.${REGION}.amazonaws.com"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Backend deployed successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}API Endpoint:${NC} ${API_ENDPOINT}"
echo -e "${BLUE}Lambda Function:${NC} ${FUNCTION_NAME}"
echo -e "${BLUE}API Gateway ID:${NC} ${API_ID}"
echo ""
echo -e "${BLUE}Test your API:${NC}"
echo -e "  curl ${API_ENDPOINT}/"
echo -e "  curl ${API_ENDPOINT}/api/health"
echo ""
echo -e "${BLUE}Update your frontend .env:${NC}"
echo -e "  VITE_API_URL=${API_ENDPOINT}"
echo ""

# Clean up
rm -rf package deployment.zip

cd ../..