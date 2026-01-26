#!/bin/bash
set -e

REGION="us-east-1"
ENV="Prod"

echo "Creating DynamoDB tables for PRODUCTION in region: $REGION"

# Users
aws dynamodb create-table \
    --table-name OsyleUsers-${ENV} \
    --attribute-definitions AttributeName=user_id,AttributeType=S \
    --key-schema AttributeName=user_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --tags Key=Project,Value=Osyle Key=Environment,Value=Production

# Tastes
aws dynamodb create-table \
    --table-name OsyleTastes-${ENV} \
    --attribute-definitions AttributeName=taste_id,AttributeType=S AttributeName=owner_id,AttributeType=S \
    --key-schema AttributeName=taste_id,KeyType=HASH \
    --global-secondary-indexes "[{\"IndexName\":\"owner_id-index\",\"KeySchema\":[{\"AttributeName\":\"owner_id\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --tags Key=Project,Value=Osyle Key=Environment,Value=Production

# Resources
aws dynamodb create-table \
    --table-name OsyleResources-${ENV} \
    --attribute-definitions AttributeName=resource_id,AttributeType=S AttributeName=taste_id,AttributeType=S \
    --key-schema AttributeName=resource_id,KeyType=HASH \
    --global-secondary-indexes "[{\"IndexName\":\"taste_id-index\",\"KeySchema\":[{\"AttributeName\":\"taste_id\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --tags Key=Project,Value=Osyle Key=Environment,Value=Production

# Projects
aws dynamodb create-table \
    --table-name OsyleProjects-${ENV} \
    --attribute-definitions AttributeName=project_id,AttributeType=S AttributeName=owner_id,AttributeType=S \
    --key-schema AttributeName=project_id,KeyType=HASH \
    --global-secondary-indexes "[{\"IndexName\":\"owner_id-index\",\"KeySchema\":[{\"AttributeName\":\"owner_id\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --tags Key=Project,Value=Osyle Key=Environment,Value=Production

# Design Mutations
aws dynamodb create-table \
    --table-name OsyleDesignMutations-${ENV} \
    --attribute-definitions AttributeName=mutation_id,AttributeType=S AttributeName=project_id,AttributeType=S AttributeName=screen_id,AttributeType=S \
    --key-schema AttributeName=mutation_id,KeyType=HASH \
    --global-secondary-indexes "[{\"IndexName\":\"project_id-screen_id-index\",\"KeySchema\":[{\"AttributeName\":\"project_id\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"screen_id\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --tags Key=Project,Value=Osyle Key=Environment,Value=Production

echo "Waiting for tables..."
aws dynamodb wait table-exists --table-name OsyleUsers-${ENV} --region $REGION
aws dynamodb wait table-exists --table-name OsyleTastes-${ENV} --region $REGION
aws dynamodb wait table-exists --table-name OsyleResources-${ENV} --region $REGION
aws dynamodb wait table-exists --table-name OsyleProjects-${ENV} --region $REGION
aws dynamodb wait table-exists --table-name OsyleDesignMutations-${ENV} --region $REGION

echo "✓ All PRODUCTION tables created"