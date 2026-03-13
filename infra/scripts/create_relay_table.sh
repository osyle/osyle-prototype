#!/bin/bash
# create_relay_table.sh
# Run once to create the OsyleFigmaRelay-Prod DynamoDB table.
# Safe to re-run — exits gracefully if the table already exists.

set -e
REGION="us-east-1"
TABLE="OsyleFigmaRelay-Prod"

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