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
WEBSOCKET_API_ID="n6m806tmzk"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO_NAME="osyle-backend"

# Lambda limits
MAX_ZIP_SIZE=$((50 * 1024 * 1024))        # 50MB (direct upload limit)
MAX_UNZIPPED_SIZE=$((250 * 1024 * 1024))  # 250MB (unzipped limit)

echo -e "${BLUE}Account ID: ${ACCOUNT_ID}${NC}"
echo -e "${BLUE}Region: ${REGION}${NC}"

# Build backend package
echo -e "${BLUE}📦 Building backend package...${NC}"
cd services/backend

# Verify requirements.txt exists
if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}✗ requirements.txt not found${NC}"
    exit 1
fi

# Clean previous builds
rm -rf package deployment.zip

# Create package directory
mkdir -p package

# First, try to estimate package size by installing dependencies
echo -e "${BLUE}Estimating package size...${NC}"

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo -e "${BLUE}Using Docker to build Lambda-compatible package...${NC}"
    
    # Clean up any previous Docker artifacts
    echo -e "${BLUE}Cleaning Docker artifacts...${NC}"
    docker rmi lambda-builder:latest 2>/dev/null || true
    
    # Create a temporary Dockerfile
    cat > Dockerfile.build <<'EOF'
FROM public.ecr.aws/sam/build-python3.11:latest

WORKDIR /build

# Copy requirements
COPY requirements.txt .

# Upgrade pip first
RUN pip install --upgrade pip

# Install dependencies with platform-specific flags for Lambda compatibility
RUN pip install -r requirements.txt -t /build/package/ \
    --only-binary=:all: \
    --platform manylinux2014_x86_64 \
    --implementation cp \
    --python-version 3.11 \
    --no-cache-dir

# The output will be in /build/package/
EOF

    # Build the Docker image (without cache to avoid corruption)
    if ! docker build --platform linux/amd64 -f Dockerfile.build -t lambda-builder:latest --no-cache .; then
        echo -e "${RED}✗ Docker build failed${NC}"
        echo -e "${YELLOW}Try running these commands to fix Docker:${NC}"
        echo -e "  docker system prune -af"
        echo -e "  docker builder prune -af"
        echo -e "${YELLOW}Then try the deployment again.${NC}"
        rm -f Dockerfile.build
        exit 1
    fi
    
    # Run the container to extract the built packages
    docker run --rm \
        --platform linux/amd64 \
        -v "$(pwd)/package":/output \
        lambda-builder:latest \
        bash -c "cp -r /build/package/* /output/"
    
    # Clean up
    rm -f Dockerfile.build
    docker rmi lambda-builder:latest 2>/dev/null || true
    
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

# Check package size before zipping
cd package
UNZIPPED_SIZE=$(du -sk . | cut -f1)
UNZIPPED_SIZE_BYTES=$((UNZIPPED_SIZE * 1024))
UNZIPPED_SIZE_MB=$((UNZIPPED_SIZE / 1024))

echo -e "${BLUE}Unzipped package size: ${UNZIPPED_SIZE_MB}MB${NC}"

# Decide deployment method based on size
USE_CONTAINER=false
if [ "$UNZIPPED_SIZE_BYTES" -gt "$MAX_UNZIPPED_SIZE" ]; then
    echo -e "${YELLOW}⚠️  Package exceeds 250MB unzipped limit (${UNZIPPED_SIZE_MB}MB)${NC}"
    echo -e "${YELLOW}📦 Switching to Docker container deployment...${NC}"
    USE_CONTAINER=true
fi

cd ..

if [ "$USE_CONTAINER" = true ]; then
    # Deploy using Docker container
    echo -e "${BLUE}🐳 Building Lambda container image...${NC}"
    
    # Create ECR repository if it doesn't exist
    echo -e "${BLUE}Checking ECR repository...${NC}"
    if ! aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $REGION 2>/dev/null; then
        echo -e "${BLUE}Creating ECR repository...${NC}"
        aws ecr create-repository \
            --repository-name $ECR_REPO_NAME \
            --region $REGION \
            --no-cli-pager
    fi
    
    # Get ECR login
    echo -e "${BLUE}Logging into ECR...${NC}"
    aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com
    
    # Delete old image from ECR if exists (to avoid manifest conflicts)
    echo -e "${BLUE}Cleaning old images from ECR...${NC}"
    aws ecr batch-delete-image \
        --repository-name $ECR_REPO_NAME \
        --region $REGION \
        --image-ids imageTag=latest 2>/dev/null || true
    
    # Copy Dockerfile.lambda if needed
    if [ ! -f "Dockerfile.lambda" ]; then
        cat > Dockerfile.lambda <<'EOF'
# Lambda Container Dockerfile
FROM public.ecr.aws/lambda/python:3.11

# Copy requirements and install (all packages now have pre-built wheels)
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

# Copy application code
COPY app ${LAMBDA_TASK_ROOT}/app

# Set the handler
CMD ["app.main.handler"]
EOF
    fi
    
    # Build and tag the image
    IMAGE_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO_NAME}:latest"
    echo -e "${BLUE}Building image: ${IMAGE_URI}${NC}"
    
    # Remove local image if exists
    docker rmi $IMAGE_URI 2>/dev/null || true
    
    # Build for Lambda's platform (linux/amd64) - use buildx for single platform
    docker buildx build \
        --platform linux/amd64 \
        --provenance=false \
        --sbom=false \
        -f Dockerfile.lambda \
        -t $IMAGE_URI \
        --load \
        .
    
    # Push to ECR
    echo -e "${BLUE}Pushing image to ECR...${NC}"
    docker push $IMAGE_URI
    
    # Check if Lambda function exists
    echo -e "${BLUE}Checking if Lambda function exists...${NC}"
    if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
        # Check current package type
        CURRENT_PACKAGE_TYPE=$(aws lambda get-function-configuration \
            --function-name $FUNCTION_NAME \
            --region $REGION \
            --query 'PackageType' \
            --output text)
        
        if [ "$CURRENT_PACKAGE_TYPE" = "Zip" ]; then
            echo -e "${YELLOW}⚠️  Function exists as Zip package, switching to Image requires recreation${NC}"
            echo -e "${BLUE}Deleting existing function...${NC}"
            aws lambda delete-function \
                --function-name $FUNCTION_NAME \
                --region $REGION \
                --no-cli-pager
            sleep 5
            
            echo -e "${BLUE}Creating Lambda function with container image...${NC}"
            aws lambda create-function \
                --function-name $FUNCTION_NAME \
                --package-type Image \
                --code ImageUri=$IMAGE_URI \
                --role arn:aws:iam::${ACCOUNT_ID}:role/lambda-execution-role \
                --timeout 900 \
                --memory-size 512 \
                --region $REGION \
                --no-cli-pager
        else
            echo -e "${BLUE}Updating Lambda function with container image...${NC}"
            aws lambda update-function-code \
                --function-name $FUNCTION_NAME \
                --image-uri $IMAGE_URI \
                --region $REGION \
                --no-cli-pager
        fi
    else
        echo -e "${BLUE}Creating Lambda function with container image...${NC}"
        aws lambda create-function \
            --function-name $FUNCTION_NAME \
            --package-type Image \
            --code ImageUri=$IMAGE_URI \
            --role arn:aws:iam::${ACCOUNT_ID}:role/lambda-execution-role \
            --timeout 900 \
            --memory-size 512 \
            --region $REGION \
            --no-cli-pager
    fi
    
    echo -e "${GREEN}✓ Lambda function deployed using container image${NC}"
    
else
    # Deploy using ZIP file
    echo -e "${BLUE}Creating ZIP deployment package...${NC}"
    cd package
    zip -r ../deployment.zip . -q
    cd ..
    
    PACKAGE_SIZE=$(ls -lh deployment.zip | awk '{print $5}')
    PACKAGE_SIZE_BYTES=$(stat -f%z deployment.zip 2>/dev/null || stat -c%s deployment.zip 2>/dev/null)
    echo -e "${GREEN}✓ Package created: ${PACKAGE_SIZE}${NC}"
    
    # Check if we need to use S3
    USE_S3=false
    if [ "$PACKAGE_SIZE_BYTES" -gt "$MAX_ZIP_SIZE" ]; then
        echo -e "${YELLOW}Package exceeds 50MB, will use S3 upload${NC}"
        USE_S3=true
    fi
    
    # Check if Lambda function exists
    echo -e "${BLUE}Checking if Lambda function exists...${NC}"
    if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
        echo -e "${BLUE}Updating existing Lambda function...${NC}"
        
        if [ "$USE_S3" = true ]; then
            # Upload to S3 first
            echo -e "${BLUE}Uploading package to S3...${NC}"
            aws s3 cp deployment.zip s3://osyle-shared-assets-prod/lambda/deployment.zip --region $REGION
            
            aws lambda update-function-code \
                --function-name $FUNCTION_NAME \
                --s3-bucket osyle-shared-assets-prod \
                --s3-key lambda/deployment.zip \
                --region $REGION \
                --no-cli-pager
        else
            aws lambda update-function-code \
                --function-name $FUNCTION_NAME \
                --zip-file fileb://deployment.zip \
                --region $REGION \
                --no-cli-pager
        fi
        
        echo -e "${GREEN}✓ Lambda function updated${NC}"
    else
        echo -e "${BLUE}Creating new Lambda function...${NC}"
        aws lambda create-function \
            --function-name $FUNCTION_NAME \
            --runtime python3.11 \
            --role arn:aws:iam::${ACCOUNT_ID}:role/lambda-execution-role \
            --handler app.main.handler \
            --zip-file fileb://deployment.zip \
            --timeout 900 \
            --memory-size 512 \
            --region $REGION \
            --no-cli-pager
        
        echo -e "${GREEN}✓ Lambda function created${NC}"
    fi
fi

# Wait for Lambda to be ready
echo -e "${BLUE}Waiting for Lambda to be ready...${NC}"
aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION

# Ensure Lambda timeout is 900 seconds
echo -e "${BLUE}Verifying Lambda timeout (15 minutes)...${NC}"
CURRENT_TIMEOUT=$(aws lambda get-function-configuration \
    --function-name $FUNCTION_NAME \
    --region $REGION \
    --query 'Timeout' \
    --output text)

if [ "$CURRENT_TIMEOUT" != "900" ]; then
    echo -e "${YELLOW}Updating Lambda timeout to 900 seconds...${NC}"
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --timeout 900 \
        --region $REGION \
        --no-cli-pager > /dev/null
    echo -e "${GREEN}✓ Lambda timeout updated${NC}"
else
    echo -e "${GREEN}✓ Lambda timeout already set to 900 seconds${NC}"
fi

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
echo -e "${GREEN}╔═════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Backend deployed successfully!${NC}"
echo -e "${GREEN}╚═════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Deployment Method:${NC} $([ "$USE_CONTAINER" = true ] && echo "Docker Container" || echo "ZIP Package")"
echo -e "${BLUE}HTTP API Endpoint:${NC} ${API_ENDPOINT}"
echo -e "${BLUE}WebSocket Endpoint:${NC} ${WS_ENDPOINT}"
echo -e "${BLUE}Lambda Function:${NC} ${FUNCTION_NAME}"
echo -e "${BLUE}HTTP API Gateway ID:${NC} ${API_ID}"
echo -e "${BLUE}WebSocket API Gateway ID:${NC} ${WEBSOCKET_API_ID}"
echo ""
echo -e "${BLUE}Test your APIs:${NC}"
echo -e "  curl ${API_ENDPOINT}/"
echo -e "  curl ${API_ENDPOINT}/api/health"
echo ""
echo -e "${BLUE}Update your frontend .env:${NC}"
echo -e "  VITE_API_URL=${API_ENDPOINT}"
echo ""

# Clean up
rm -rf package deployment.zip Dockerfile.lambda 2>/dev/null || true

cd ../..