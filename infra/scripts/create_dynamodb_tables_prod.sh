#!/bin/bash
set -e

REGION="us-east-1"
ENV="Prod"

echo "Creating DynamoDB tables for PRODUCTION in region: $REGION"

# ============================================================================
# USERS TABLE
# ============================================================================
echo "Creating OsyleUsers-${ENV}..."
aws dynamodb create-table \
    --table-name OsyleUsers-${ENV} \
    --attribute-definitions AttributeName=user_id,AttributeType=S \
    --key-schema AttributeName=user_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --tags Key=Project,Value=Osyle Key=Environment,Value=Production \
    2>&1 | grep -v "ResourceInUseException" || true

# ============================================================================
# TASTES TABLE
# ============================================================================
echo "Creating OsyleTastes-${ENV}..."
aws dynamodb create-table \
    --table-name OsyleTastes-${ENV} \
    --attribute-definitions AttributeName=taste_id,AttributeType=S AttributeName=owner_id,AttributeType=S \
    --key-schema AttributeName=taste_id,KeyType=HASH \
    --global-secondary-indexes "[{\"IndexName\":\"owner_id-index\",\"KeySchema\":[{\"AttributeName\":\"owner_id\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --tags Key=Project,Value=Osyle Key=Environment,Value=Production \
    2>&1 | grep -v "ResourceInUseException" || true

# ============================================================================
# RESOURCES TABLE
# ============================================================================
echo "Creating OsyleResources-${ENV}..."
aws dynamodb create-table \
    --table-name OsyleResources-${ENV} \
    --attribute-definitions AttributeName=resource_id,AttributeType=S AttributeName=taste_id,AttributeType=S \
    --key-schema AttributeName=resource_id,KeyType=HASH \
    --global-secondary-indexes "[{\"IndexName\":\"taste_id-index\",\"KeySchema\":[{\"AttributeName\":\"taste_id\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --tags Key=Project,Value=Osyle Key=Environment,Value=Production \
    2>&1 | grep -v "ResourceInUseException" || true

# ============================================================================
# PROJECTS TABLE
# ============================================================================
echo "Creating OsyleProjects-${ENV}..."
aws dynamodb create-table \
    --table-name OsyleProjects-${ENV} \
    --attribute-definitions AttributeName=project_id,AttributeType=S AttributeName=owner_id,AttributeType=S \
    --key-schema AttributeName=project_id,KeyType=HASH \
    --global-secondary-indexes "[{\"IndexName\":\"owner_id-index\",\"KeySchema\":[{\"AttributeName\":\"owner_id\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --tags Key=Project,Value=Osyle Key=Environment,Value=Production \
    2>&1 | grep -v "ResourceInUseException" || true

# ============================================================================
# DESIGN MUTATIONS TABLE
# ============================================================================
echo "Creating OsyleDesignMutations-${ENV}..."
aws dynamodb create-table \
    --table-name OsyleDesignMutations-${ENV} \
    --attribute-definitions AttributeName=mutation_id,AttributeType=S AttributeName=project_id,AttributeType=S AttributeName=screen_id,AttributeType=S \
    --key-schema AttributeName=mutation_id,KeyType=HASH \
    --global-secondary-indexes "[{\"IndexName\":\"project_id-screen_id-index\",\"KeySchema\":[{\"AttributeName\":\"project_id\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"screen_id\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --tags Key=Project,Value=Osyle Key=Environment,Value=Production \
    2>&1 | grep -v "ResourceInUseException" || true

# ============================================================================
# FIGMA RELAY TABLE
# Ephemeral bridge table for bidirectional Figma <-> Osyle plugin communication.
# All items auto-expire after 10 minutes via DynamoDB TTL — no manual cleanup needed.
# Required in production because the Figma plugin can't reach localhost:8765
# from HTTPS pages (mixed content policy). Lambda endpoint is HTTPS.
# ============================================================================
echo "Creating OsyleFigmaRelay-${ENV}..."
aws dynamodb create-table \
    --table-name OsyleFigmaRelay-${ENV} \
    --attribute-definitions AttributeName=token,AttributeType=S \
    --key-schema AttributeName=token,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --tags Key=Project,Value=Osyle Key=Environment,Value=Production \
    2>&1 | grep -v "ResourceInUseException" || true

# ============================================================================
# WAIT FOR ALL TABLES
# ============================================================================
echo ""
echo "Waiting for tables to become active..."
aws dynamodb wait table-exists --table-name OsyleUsers-${ENV} --region $REGION
aws dynamodb wait table-exists --table-name OsyleTastes-${ENV} --region $REGION
aws dynamodb wait table-exists --table-name OsyleResources-${ENV} --region $REGION
aws dynamodb wait table-exists --table-name OsyleProjects-${ENV} --region $REGION
aws dynamodb wait table-exists --table-name OsyleDesignMutations-${ENV} --region $REGION
aws dynamodb wait table-exists --table-name OsyleFigmaRelay-${ENV} --region $REGION

# Enable TTL on relay table so DynamoDB auto-deletes payloads after 10 minutes
echo "Enabling TTL on OsyleFigmaRelay-${ENV}..."
aws dynamodb update-time-to-live \
    --table-name OsyleFigmaRelay-${ENV} \
    --time-to-live-specification "Enabled=true,AttributeName=ttl" \
    --region $REGION \
    2>&1 | grep -v "already enabled" || true

echo ""
echo "✓ All PRODUCTION tables created:"
echo "  - OsyleUsers-Prod"
echo "  - OsyleTastes-Prod            (owner_id-index)"
echo "  - OsyleResources-Prod         (taste_id-index)"
echo "  - OsyleProjects-Prod          (owner_id-index)"
echo "  - OsyleDesignMutations-Prod   (project_id-screen_id-index)"
echo "  - OsyleFigmaRelay-Prod        (TTL: 10min, ephemeral)"