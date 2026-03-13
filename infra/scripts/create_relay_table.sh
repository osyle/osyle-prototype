#!/bin/bash
# create_relay_table.sh
# Run once to create the OsyleFigmaRelay-Prod DynamoDB table and grant
# the Lambda execution role access to it.
# Safe to re-run — exits gracefully if the table already exists.

set -e
REGION="us-east-1"
TABLE="OsyleFigmaRelay-Prod"
ROLE="lambda-execution-role"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "Creating DynamoDB relay table: $TABLE"

aws dynamodb create-table \
    --table-name "$TABLE" \
    --attribute-definitions AttributeName=token,AttributeType=S \
    --key-schema AttributeName=token,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION" \
    --tags Key=Project,Value=Osyle Key=Environment,Value=Production \
    2>&1 | grep -v "ResourceInUseException" || true

echo "Waiting for table to be active..."
aws dynamodb wait table-exists --table-name "$TABLE" --region "$REGION"

echo "Enabling TTL (auto-delete after 10 min)..."
aws dynamodb update-time-to-live \
    --table-name "$TABLE" \
    --time-to-live-specification "Enabled=true,AttributeName=ttl" \
    --region "$REGION"

echo "✓ $TABLE is ready"

echo "Updating IAM policy to grant Lambda access to all prod tables..."
aws iam put-role-policy \
  --role-name $ROLE \
  --policy-name DynamoDBProdAccess \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Action\": [\"dynamodb:GetItem\",\"dynamodb:PutItem\",\"dynamodb:UpdateItem\",\"dynamodb:DeleteItem\",\"dynamodb:Query\",\"dynamodb:Scan\"],
      \"Resource\": [
        \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/OsyleUsers-Prod\",
        \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/OsyleTastes-Prod\",
        \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/OsyleResources-Prod\",
        \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/OsyleProjects-Prod\",
        \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/OsyleFigmaRelay-Prod\",
        \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/OsyleTastes-Prod/index/*\",
        \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/OsyleResources-Prod/index/*\",
        \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/OsyleProjects-Prod/index/*\"
      ]
    }]
  }"

echo "✓ IAM policy updated"