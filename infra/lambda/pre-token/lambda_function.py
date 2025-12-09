import json

def lambda_handler(event, context):
    """
    Pre-token generation Lambda trigger for Cognito
    Validates that user email is from @osyle.com domain
    """
    
    print(f"Pre-token generation trigger fired for: {event.get('userName', 'unknown')}")
    print(f"Event: {json.dumps(event)}")
    
    try:
        # Get user attributes
        user_attributes = event.get('request', {}).get('userAttributes', {})
        email = user_attributes.get('email', '')
        
        print(f"Validating email: {email}")
        
        # Check if email is from @osyle.com domain
        if not email.endswith('@osyle.com'):
            error_message = f"Only @osyle.com email addresses are allowed. Provided: {email}"
            print(f"VALIDATION FAILED: {error_message}")
            raise Exception(error_message)
        
        print(f"VALIDATION PASSED: Email {email} is from @osyle.com")
        
        # Return the event to allow token generation
        return event
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        # Re-raise to prevent token generation
        raise e
