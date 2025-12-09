#!/bin/bash

# Create DynamoDB tables in LOCAL DynamoDB for development
# Run this after starting docker-compose with DynamoDB Local

set -e

ENDPOINT="http://localhost:8001"

echo "Creating LOCAL DynamoDB tables at: $ENDPOINT"

# ============================================================================
# USERS TABLE
# ============================================================================

echo "Creating Users table..."
aws dynamodb create-table \
    --table-name OsyleUsers \
    --attribute-definitions \
        AttributeName=user_id,AttributeType=S \
    --key-schema \
        AttributeName=user_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url $ENDPOINT \
    --region us-east-1 \
    --no-cli-pager

echo "✓ Users table created"

# ============================================================================
# TASTES TABLE
# ============================================================================

echo "Creating Tastes table..."
aws dynamodb create-table \
    --table-name OsyleTastes \
    --attribute-definitions \
        AttributeName=taste_id,AttributeType=S \
        AttributeName=owner_id,AttributeType=S \
    --key-schema \
        AttributeName=taste_id,KeyType=HASH \
    --global-secondary-indexes \
        "[
            {
                \"IndexName\": \"owner_id-index\",
                \"KeySchema\": [{\"AttributeName\":\"owner_id\",\"KeyType\":\"HASH\"}],
                \"Projection\":{\"ProjectionType\":\"ALL\"}
            }
        ]" \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url $ENDPOINT \
    --region us-east-1 \
    --no-cli-pager

echo "✓ Tastes table created"

# ============================================================================
# RESOURCES TABLE
# ============================================================================

echo "Creating Resources table..."
aws dynamodb create-table \
    --table-name OsyleResources \
    --attribute-definitions \
        AttributeName=resource_id,AttributeType=S \
        AttributeName=taste_id,AttributeType=S \
    --key-schema \
        AttributeName=resource_id,KeyType=HASH \
    --global-secondary-indexes \
        "[
            {
                \"IndexName\": \"taste_id-index\",
                \"KeySchema\": [{\"AttributeName\":\"taste_id\",\"KeyType\":\"HASH\"}],
                \"Projection\":{\"ProjectionType\":\"ALL\"}
            }
        ]" \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url $ENDPOINT \
    --region us-east-1 \
    --no-cli-pager

echo "✓ Resources table created"

# ============================================================================
# PROJECTS TABLE
# ============================================================================

echo "Creating Projects table..."
aws dynamodb create-table \
    --table-name OsyleProjects \
    --attribute-definitions \
        AttributeName=project_id,AttributeType=S \
        AttributeName=owner_id,AttributeType=S \
    --key-schema \
        AttributeName=project_id,KeyType=HASH \
    --global-secondary-indexes \
        "[
            {
                \"IndexName\": \"owner_id-index\",
                \"KeySchema\": [{\"AttributeName\":\"owner_id\",\"KeyType\":\"HASH\"}],
                \"Projection\":{\"ProjectionType\":\"ALL\"}
            }
        ]" \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url $ENDPOINT \
    --region us-east-1 \
    --no-cli-pager

echo "✓ Projects table created"

echo ""
echo "✓ All LOCAL tables created successfully!"
echo ""
echo "List tables:"
echo "  aws dynamodb list-tables --endpoint-url $ENDPOINT --region us-east-1"
