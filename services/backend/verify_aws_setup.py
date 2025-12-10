"""
AWS Connection Verification Script
Run this to verify your AWS credentials and services are working
"""
import boto3
import os
from dotenv import load_dotenv
from botocore.exceptions import ClientError, NoCredentialsError

load_dotenv()

def check_env_vars():
    """Check if required environment variables are set"""
    print("=" * 60)
    print("CHECKING ENVIRONMENT VARIABLES")
    print("=" * 60)
    
    required_vars = [
        'AWS_REGION',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'S3_BUCKET',
        'USERS_TABLE',
        'TASTES_TABLE',
        'RESOURCES_TABLE',
        'PROJECTS_TABLE',
        'USER_POOL_ID',
        'ANTHROPIC_API_KEY',
    ]
    
    missing = []
    for var in required_vars:
        value = os.getenv(var)
        if value:
            # Mask sensitive values
            if 'KEY' in var or 'SECRET' in var:
                display_value = f"{value[:8]}...{value[-4:]}" if len(value) > 12 else "***"
            else:
                display_value = value
            print(f"✅ {var}: {display_value}")
        else:
            print(f"❌ {var}: NOT SET")
            missing.append(var)
    
    # Check for LocalStack endpoints (should NOT be set)
    localstack_vars = ['DYNAMODB_ENDPOINT_URL', 'S3_ENDPOINT_URL']
    for var in localstack_vars:
        value = os.getenv(var)
        if value:
            print(f"⚠️  {var}: {value} (Should be commented out for real AWS)")
        else:
            print(f"✅ {var}: Not set (Good - using real AWS)")
    
    print()
    if missing:
        print(f"❌ Missing {len(missing)} required environment variable(s)")
        return False
    else:
        print("✅ All required environment variables are set")
        return True


def test_s3_connection():
    """Test S3 connection and bucket access"""
    print("=" * 60)
    print("TESTING S3 CONNECTION")
    print("=" * 60)
    
    try:
        bucket_name = os.getenv('S3_BUCKET')
        region = os.getenv('AWS_REGION')
        
        # Check for LocalStack endpoint
        s3_endpoint = os.getenv('S3_ENDPOINT_URL')
        if s3_endpoint:
            print(f"⚠️  WARNING: S3_ENDPOINT_URL is set to {s3_endpoint}")
            print("    This will use LocalStack instead of real AWS!")
            s3_client = boto3.client('s3', region_name=region, endpoint_url=s3_endpoint)
        else:
            print("✅ Using real AWS S3")
            s3_client = boto3.client('s3', region_name=region)
        
        # Check if bucket exists
        response = s3_client.head_bucket(Bucket=bucket_name)
        print(f"✅ Successfully connected to S3 bucket: {bucket_name}")
        
        # Check bucket location
        location = s3_client.get_bucket_location(Bucket=bucket_name)
        bucket_region = location['LocationConstraint'] or 'us-east-1'
        print(f"✅ Bucket region: {bucket_region}")
        
        # Check CORS configuration
        try:
            cors = s3_client.get_bucket_cors(Bucket=bucket_name)
            print(f"✅ CORS is configured ({len(cors['CORSRules'])} rule(s))")
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchCORSConfiguration':
                print("⚠️  CORS is NOT configured - you need to set this up!")
            else:
                print(f"⚠️  Could not check CORS: {e}")
        
        return True
        
    except NoCredentialsError:
        print("❌ No AWS credentials found")
        print("   Make sure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set")
        return False
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == '403':
            print(f"❌ Access denied to bucket: {bucket_name}")
            print("   Check your AWS credentials have S3 permissions")
        elif error_code == '404':
            print(f"❌ Bucket not found: {bucket_name}")
            print("   Check the bucket name in your .env file")
        else:
            print(f"❌ S3 Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_dynamodb_connection():
    """Test DynamoDB connection and table access"""
    print("=" * 60)
    print("TESTING DYNAMODB CONNECTION")
    print("=" * 60)
    
    try:
        region = os.getenv('AWS_REGION')
        
        # Check for LocalStack endpoint
        dynamo_endpoint = os.getenv('DYNAMODB_ENDPOINT_URL')
        if dynamo_endpoint:
            print(f"⚠️  WARNING: DYNAMODB_ENDPOINT_URL is set to {dynamo_endpoint}")
            print("    This will use LocalStack instead of real AWS!")
            dynamodb = boto3.resource('dynamodb', region_name=region, endpoint_url=dynamo_endpoint)
        else:
            print("✅ Using real AWS DynamoDB")
            dynamodb = boto3.resource('dynamodb', region_name=region)
        
        tables = [
            os.getenv('USERS_TABLE'),
            os.getenv('TASTES_TABLE'),
            os.getenv('RESOURCES_TABLE'),
            os.getenv('PROJECTS_TABLE'),
        ]
        
        existing_tables = []
        missing_tables = []
        
        for table_name in tables:
            try:
                table = dynamodb.Table(table_name)
                table.load()  # Forces a DescribeTable call
                item_count = table.item_count
                print(f"✅ Table '{table_name}' exists ({item_count} items)")
                existing_tables.append(table_name)
            except ClientError as e:
                if e.response['Error']['Code'] == 'ResourceNotFoundException':
                    print(f"❌ Table '{table_name}' does not exist")
                    missing_tables.append(table_name)
                else:
                    print(f"⚠️  Error checking table '{table_name}': {e}")
        
        print()
        if missing_tables:
            print(f"⚠️  {len(missing_tables)} table(s) need to be created")
            print("   Run your table creation scripts to set up DynamoDB")
            return False
        else:
            print(f"✅ All {len(existing_tables)} DynamoDB tables exist")
            return True
            
    except NoCredentialsError:
        print("❌ No AWS credentials found")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_cognito_connection():
    """Test Cognito connection"""
    print("=" * 60)
    print("TESTING COGNITO CONNECTION")
    print("=" * 60)
    
    try:
        region = os.getenv('AWS_REGION')
        user_pool_id = os.getenv('USER_POOL_ID')
        
        cognito = boto3.client('cognito-idp', region_name=region)
        
        response = cognito.describe_user_pool(UserPoolId=user_pool_id)
        pool_name = response['UserPool']['Name']
        print(f"✅ Successfully connected to Cognito User Pool: {pool_name}")
        print(f"   Pool ID: {user_pool_id}")
        return True
        
    except ClientError as e:
        print(f"❌ Cognito Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def main():
    """Run all verification checks"""
    print()
    print("🔍 OSYLE AWS SERVICES VERIFICATION")
    print()
    
    results = {
        'env_vars': check_env_vars(),
        's3': test_s3_connection(),
        'dynamodb': test_dynamodb_connection(),
        'cognito': test_cognito_connection(),
    }
    
    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    for service, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {service.upper()}")
    
    print()
    
    if all(results.values()):
        print("🎉 All checks passed! Your AWS setup is ready.")
        print()
        print("Next steps:")
        print("1. Run: python configure_s3_cors.py (if CORS not configured)")
        print("2. Restart your backend server")
        print("3. Test file uploads from frontend")
    else:
        print("⚠️  Some checks failed. Please fix the issues above.")
        print()
        print("Common fixes:")
        print("- Update .env with real AWS credentials")
        print("- Comment out DYNAMODB_ENDPOINT_URL and S3_ENDPOINT_URL")
        print("- Create missing DynamoDB tables")
        print("- Configure S3 CORS (run configure_s3_cors.py)")


if __name__ == "__main__":
    main()