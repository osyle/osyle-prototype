#!/bin/bash

# DynamoDB Table Creation Script for Osyle
# This script creates all required DynamoDB tables with proper indexes

set -e

REGION="us-east-1"

echo "Creating DynamoDB tables in region: $REGION"

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
    --region $REGION \
    --tags Key=Project,Value=Osyle Key=Environment,Value=Production

echo "✓ Users table created"

# ============================================================================
# TASTES TABLE with owner_id index
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
    --region $REGION \
    --tags Key=Project,Value=Osyle Key=Environment,Value=Production

echo "✓ Tastes table created with owner_id index"

# ============================================================================
# RESOURCES TABLE with taste_id index
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
    --region $REGION \
    --tags Key=Project,Value=Osyle Key=Environment,Value=Production

echo "✓ Resources table created with taste_id index"

# ============================================================================
# PROJECTS TABLE with owner_id index
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
    --region $REGION \
    --tags Key=Project,Value=Osyle Key=Environment,Value=Production

echo "✓ Projects table created with owner_id index"

# ============================================================================
# DESIGN MUTATIONS TABLE with project_id-screen_id index
# ============================================================================

echo "Creating Design Mutations table..."
aws dynamodb create-table \
    --table-name OsyleDesignMutations \
    --attribute-definitions \
        AttributeName=mutation_id,AttributeType=S \
        AttributeName=project_id,AttributeType=S \
        AttributeName=screen_id,AttributeType=S \
    --key-schema \
        AttributeName=mutation_id,KeyType=HASH \
    --global-secondary-indexes \
        "[
            {
                \"IndexName\": \"project_id-screen_id-index\",
                \"KeySchema\": [
                    {\"AttributeName\":\"project_id\",\"KeyType\":\"HASH\"},
                    {\"AttributeName\":\"screen_id\",\"KeyType\":\"RANGE\"}
                ],
                \"Projection\":{\"ProjectionType\":\"ALL\"}
            }
        ]" \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --tags Key=Project,Value=Osyle Key=Environment,Value=Production

echo "✓ Design Mutations table created with project_id-screen_id index"

# ============================================================================
# WAIT FOR TABLES TO BE ACTIVE
# ============================================================================

echo ""
echo "Waiting for tables to become active..."
aws dynamodb wait table-exists --table-name OsyleUsers --region $REGION
aws dynamodb wait table-exists --table-name OsyleTastes --region $REGION
aws dynamodb wait table-exists --table-name OsyleResources --region $REGION
aws dynamodb wait table-exists --table-name OsyleProjects --region $REGION
aws dynamodb wait table-exists --table-name OsyleDesignMutations --region $REGION

echo ""
echo "✓ All tables are active!"
echo ""
echo "Table Summary:"
echo "  - OsyleUsers"
echo "  - OsyleTastes (with owner_id-index)"
echo "  - OsyleResources (with taste_id-index)"
echo "  - OsyleProjects (with owner_id-index)"
echo "  - OsyleDesignMutations (with project_id-screen_id-index)"
echo ""
echo "Next steps:"
echo "  1. Update your backend .env file with table names"
echo "  2. Grant Lambda IAM permissions for DynamoDB access"
echo "  3. Grant Lambda IAM permissions for S3 access"