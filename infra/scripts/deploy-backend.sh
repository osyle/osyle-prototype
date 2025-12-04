#!/bin/bash
set -e

echo "Building backend..."
cd services/backend

# Install dependencies
pip install -r requirements.txt -t package/
cp -r app package/
cd package
zip -r ../deployment.zip .
cd ..

# Create/Update Lambda
FUNCTION_NAME="osyle-api"

if aws lambda get-function --function-name $FUNCTION_NAME 2>/dev/null; then
    echo "Updating Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://deployment.zip
else
    echo "Creating Lambda function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime python3.11 \
        --role arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/lambda-execution-role \
        --handler app.main.handler \
        --zip-file fileb://deployment.zip \
        --timeout 30 \
        --memory-size 512
fi

# Create API Gateway
API_ID=$(aws apigatewayv2 create-api \
    --name osyle-api \
    --protocol-type HTTP \
    --target arn:aws:lambda:us-east-1:$(aws sts get-caller-identity --query Account --output text):function:$FUNCTION_NAME \
    --query 'ApiId' \
    --output text)

echo "API Gateway URL: https://${API_ID}.execute-api.us-east-1.amazonaws.com"

# Grant API Gateway permission to invoke Lambda
aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:$(aws sts get-caller-identity --query Account --output text):${API_ID}/*" || true

echo "Backend deployed successfully!"