def lambda_handler(event, context):
    email = event['request']['userAttributes']['email']
    
    if not email.endswith('@osyle.com'):
        raise Exception('Only @osyle.com emails are allowed')
    
    return event