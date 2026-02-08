"""
WebSocket Lambda Handler for API Gateway WebSocket Events
Handles $connect, $disconnect, and $default routes

UPDATED: Integrated with new DTR Pass 1 system
"""
import boto3
import json
import jwt
import os
from typing import Dict, Any


def get_jwks():
    """Fetch JSON Web Key Set from Cognito"""
    import requests
    
    region = os.getenv("AWS_REGION", "us-east-1")
    user_pool_id = os.getenv("USER_POOL_ID")
    
    url = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Failed to fetch JWKS: {e}")
        return None


def verify_websocket_token(token: str) -> Dict[str, Any]:
    """Verify JWT token for WebSocket connection"""
    try:
        region = os.getenv("AWS_REGION", "us-east-1")
        user_pool_id = os.getenv("USER_POOL_ID")
        issuer = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}"
        
        # Get JWKS
        jwks = get_jwks()
        if not jwks:
            print("Failed to fetch JWKS")
            return None
        
        # Get key ID from token
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        # Find matching key
        key = None
        for jwk in jwks.get("keys", []):
            if jwk.get("kid") == kid:
                key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
                break
        
        if not key:
            print("No matching key found")
            return None
        
        # Verify token
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=issuer,
            options={
                "verify_exp": True,
                "verify_aud": False
            }
        )
        
        # Check email domain
        email = payload.get("email")
        if not email or not email.endswith("@osyle.com"):
            print(f"Invalid email domain: {email}")
            return None
        
        return payload
        
    except jwt.ExpiredSignatureError:
        print("Token has expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"Invalid token: {e}")
        return None
    except Exception as e:
        print(f"Token verification failed: {e}")
        return None


def handle_websocket_event(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle API Gateway WebSocket events
    
    IMPORTANT: API Gateway V2 WebSocket events have a different structure!
    
    Event structure for WebSocket:
    {
        "requestContext": {
            "routeKey": "$connect" | "$disconnect" | "$default",
            "connectionId": "abc123",  # <-- This is in requestContext for WebSocket
            "domainName": "n6m806tmzk.execute-api.us-east-1.amazonaws.com",
            "stage": "production",
            "apiId": "n6m806tmzk",
            ...
        },
        "queryStringParameters": { "token": "..." },  # Only on $connect
        "body": "{...}"  # Only on $default
    }
    """
    
    # Print full event for debugging
    print(f"Full event: {json.dumps(event)}")
    
    request_context = event.get("requestContext", {})
    route_key = request_context.get("routeKey")
    
    # IMPORTANT: connectionId is in requestContext for WebSocket API Gateway V2
    connection_id = request_context.get("connectionId")
    
    # For WebSocket, these are also in requestContext
    domain_name = request_context.get("domainName")
    stage = request_context.get("stage")
    
    print(f"WebSocket event - Route: {route_key}, Connection: {connection_id}")
    
    if not connection_id:
        print("ERROR: No connectionId found in event!")
        print(f"requestContext keys: {request_context.keys()}")
        return {"statusCode": 400, "body": "Missing connectionId"}
    
    # Initialize API Gateway Management API for sending messages
    endpoint_url = f"https://{domain_name}/{stage}"
    apigw_management = boto3.client(
        'apigatewaymanagementapi',
        endpoint_url=endpoint_url
    )
    
    # Handle different routes
    if route_key == "$connect":
        return handle_connect(event, request_context, connection_id)
    
    elif route_key == "$disconnect":
        return handle_disconnect(event, request_context, connection_id)
    
    elif route_key == "$default":
        return handle_message(event, request_context, apigw_management, connection_id)
    
    else:
        print(f"Unknown route key: {route_key}")
        return {"statusCode": 400, "body": "Unknown route"}


def handle_connect(event: Dict[str, Any], request_context: Dict[str, Any], connection_id: str) -> Dict[str, Any]:
    """Handle WebSocket connection request"""
    
    # Get token from query string
    query_params = event.get("queryStringParameters") or {}
    token = query_params.get("token")
    
    if not token:
        print(f"Connection {connection_id}: No token provided")
        return {
            "statusCode": 401,
            "body": "Unauthorized: No token provided"
        }
    
    # Verify token
    user = verify_websocket_token(token)
    
    if not user:
        print(f"Connection {connection_id}: Invalid token")
        return {
            "statusCode": 403,
            "body": "Forbidden: Invalid token"
        }
    
    user_id = user.get("sub")
    email = user.get("email")
    
    print(f"Connection {connection_id}: Authenticated as {email} (user_id: {user_id})")
    
    # TODO: Store connection_id -> user_id mapping in DynamoDB for later use
    # This allows you to identify which user sent a message
    
    return {
        "statusCode": 200,
        "body": "Connected"
    }


def handle_disconnect(event: Dict[str, Any], request_context: Dict[str, Any], connection_id: str) -> Dict[str, Any]:
    """Handle WebSocket disconnection"""
    
    print(f"Connection {connection_id}: Disconnected")
    
    # TODO: Remove connection_id from DynamoDB
    
    return {
        "statusCode": 200,
        "body": "Disconnected"
    }


def handle_message(
    event: Dict[str, Any],
    request_context: Dict[str, Any],
    apigw_management: Any,
    connection_id: str
) -> Dict[str, Any]:
    """Handle WebSocket message"""
    
    try:
        # Parse message body
        body = event.get("body", "{}")
        message = json.loads(body)
        
        action = message.get("action")
        data = message.get("data", {})
        
        print(f"Connection {connection_id}: Action '{action}' with data keys: {data.keys()}")
        
        # TODO: Get user_id from DynamoDB using connection_id
        # For now, we'll need to pass it in the message or re-authenticate
        
        # Send acknowledgment
        send_message(apigw_management, connection_id, {
            "type": "progress",
            "stage": "received",
            "message": f"Processing action: {action}"
        })
        
        # Route to appropriate handler
        if action == "build-dtr":
            handle_build_dtr(data, apigw_management, connection_id)
        elif action == "generate-ui":
            handle_generate_ui(data, apigw_management, connection_id)
        else:
            send_error(apigw_management, connection_id, f"Unknown action: {action}")
        
        return {"statusCode": 200}
        
    except json.JSONDecodeError as e:
        print(f"Invalid JSON: {e}")
        send_error(apigw_management, connection_id, "Invalid JSON in message body")
        return {"statusCode": 400}
        
    except Exception as e:
        print(f"Error handling message: {e}")
        import traceback
        traceback.print_exc()
        send_error(apigw_management, connection_id, str(e))
        return {"statusCode": 500}


def send_message(apigw_management: Any, connection_id: str, data: Dict[str, Any]):
    """Send message to WebSocket client"""
    try:
        apigw_management.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(data)
        )
        print(f"Sent message to {connection_id}: {data.get('type', 'unknown')}")
    except apigw_management.exceptions.GoneException:
        print(f"Connection {connection_id} is no longer available")
    except Exception as e:
        print(f"Failed to send message to {connection_id}: {e}")


def send_error(apigw_management: Any, connection_id: str, error: str):
    """Send error message to client"""
    send_message(apigw_management, connection_id, {
        "type": "error",
        "error": error
    })


def handle_build_dtr(data: Dict[str, Any], apigw_management: Any, connection_id: str):
    """
    Handle build-dtr action with new Passes 1-4 DTR system
    
    UPDATED: Runs all four passes in parallel:
    - Pass 1: Structural Skeleton
    - Pass 2: Surface Treatment
    - Pass 3: Typography System
    - Pass 4: Image Usage Patterns
    """
    import asyncio
    from app import storage, db
    
    # Get user_id from message data (required for Lambda)
    user_id = data.get("user_id")
    
    if not user_id:
        send_error(apigw_management, connection_id, "user_id required in message data")
        return
    
    async def run_extraction():
        """Async extraction function"""
        try:
            # Extract parameters
            resource_id = data.get("resource_id")
            taste_id = data.get("taste_id")
            
            if not resource_id:
                send_error(apigw_management, connection_id, "resource_id is required")
                return
            
            if not taste_id:
                send_error(apigw_management, connection_id, "taste_id is required")
                return
            
            # Get resource from database
            resource = db.get_resource(resource_id)
            
            if not resource:
                send_error(apigw_management, connection_id, f"Resource {resource_id} not found")
                return
            
            # Verify ownership
            if resource.get("owner_id") != user_id:
                send_error(apigw_management, connection_id, "Access denied")
                return
            
            # Check if files are uploaded
            has_figma = resource.get("has_figma", False)
            has_image = resource.get("has_image", False)
            
            if not has_figma and not has_image:
                send_error(apigw_management, connection_id, "Resource has no files uploaded")
                return
            
            # Send progress: Downloading files
            send_message(apigw_management, connection_id, {
                "type": "progress",
                "stage": "download",
                "message": "Downloading resource files from S3..."
            })
            
            # Download files from S3
            figma_json = None
            image_bytes = None
            image_format = "png"
            
            if has_figma:
                figma_key = resource.get("figma_key")
                if figma_key:
                    try:
                        print(f"Downloading Figma JSON from S3: {figma_key}")
                        figma_obj = storage.s3_client.get_object(
                            Bucket=storage.S3_BUCKET,
                            Key=figma_key
                        )
                        figma_content = figma_obj['Body'].read()
                        figma_json = json.loads(figma_content)
                        print(f"✅ Downloaded Figma JSON ({len(figma_content)} bytes)")
                    except Exception as e:
                        print(f"❌ Failed to download Figma JSON: {e}")
            
            if has_image:
                image_key = resource.get("image_key")
                if image_key:
                    try:
                        print(f"Downloading image from S3: {image_key}")
                        image_obj = storage.s3_client.get_object(
                            Bucket=storage.S3_BUCKET,
                            Key=image_key
                        )
                        image_bytes = image_obj['Body'].read()
                        
                        # Detect format
                        if image_key.endswith('.jpg') or image_key.endswith('.jpeg'):
                            image_format = "jpeg"
                        elif image_key.endswith('.webp'):
                            image_format = "webp"
                        else:
                            image_format = "png"
                        
                        print(f"✅ Downloaded image ({len(image_bytes)} bytes, format: {image_format})")
                    except Exception as e:
                        print(f"❌ Failed to download image: {e}")
            
            # Verify at least one file downloaded
            if figma_json is None and image_bytes is None:
                send_error(apigw_management, connection_id, "Failed to download files from S3")
                return
            
            # Send progress: Starting extraction
            send_message(apigw_management, connection_id, {
                "type": "progress",
                "stage": "extraction",
                "message": "Starting DTR extraction..."
            })
            
            # Progress callback
            async def progress_callback(stage: str, message: str):
                send_message(apigw_management, connection_id, {
                    "type": "progress",
                    "stage": stage,
                    "message": message
                })
            
            # Run Passes 1-4 in parallel (they're independent)
            from app.dtr import extract_pass_1_only, extract_pass_2_only, extract_pass_3_only, extract_pass_4_only, extract_pass_5_only
            import asyncio
            
            print(f"Starting Passes 1-4 extraction in parallel for resource {resource_id}")
            
            # Run all four passes concurrently
            pass_1_task = extract_pass_1_only(
                resource_id=resource_id,
                taste_id=taste_id,
                figma_json=figma_json,
                image_bytes=image_bytes,
                image_format=image_format,
                progress_callback=progress_callback
            )
            
            pass_2_task = extract_pass_2_only(
                resource_id=resource_id,
                taste_id=taste_id,
                figma_json=figma_json,
                image_bytes=image_bytes,
                image_format=image_format,
                progress_callback=progress_callback
            )
            
            pass_3_task = extract_pass_3_only(
                resource_id=resource_id,
                taste_id=taste_id,
                figma_json=figma_json,
                image_bytes=image_bytes,
                image_format=image_format,
                progress_callback=progress_callback
            )
            
            pass_4_task = extract_pass_4_only(
                resource_id=resource_id,
                taste_id=taste_id,
                figma_json=figma_json,
                image_bytes=image_bytes,
                image_format=image_format,
                progress_callback=progress_callback
            )
            
            pass_5_task = extract_pass_5_only(
                resource_id=resource_id,
                taste_id=taste_id,
                figma_json=figma_json,
                image_bytes=image_bytes,
                image_format=image_format,
                progress_callback=progress_callback
            )
            
            # Wait for all five to complete
            pass_1_result, pass_2_result, pass_3_result, pass_4_result, pass_5_result = await asyncio.gather(
                pass_1_task, 
                pass_2_task,
                pass_3_task,
                pass_4_task,
                pass_5_task
            )
            
            print(f"✅ Pass 1 extraction completed!")
            print(f"   Authority: {pass_1_result.get('authority')}")
            print(f"   Confidence: {pass_1_result.get('confidence')}")
            print(f"   Layout type: {pass_1_result.get('layout', {}).get('type')}")
            
            print(f"✅ Pass 2 extraction completed!")
            print(f"   Authority: {pass_2_result.get('authority')}")
            print(f"   Confidence: {pass_2_result.get('confidence')}")
            print(f"   Colors found: {len(pass_2_result.get('colors', {}).get('exact_palette', []))}")
            
            print(f"✅ Pass 3 extraction completed!")
            print(f"   Authority: {pass_3_result.get('authority')}")
            print(f"   Confidence: {pass_3_result.get('confidence')}")
            print(f"   Families found: {len(pass_3_result.get('families', []))}")
            
            print(f"✅ Pass 4 extraction completed!")
            print(f"   Authority: {pass_4_result.get('authority')}")
            print(f"   Confidence: {pass_4_result.get('confidence')}")
            print(f"   Has images: {pass_4_result.get('has_images')}")
            print(f"   Image density: {pass_4_result.get('image_density')}")
            print(f"   Placements found: {len(pass_4_result.get('placements', []))}")
            
            print(f"✅ Pass 5 extraction completed!")
            print(f"   Authority: {pass_5_result.get('authority')}")
            print(f"   Confidence: {pass_5_result.get('confidence')}")
            print(f"   Components found: {pass_5_result.get('total_components')}")
            print(f"   Variants found: {pass_5_result.get('total_variants')}")
            
            # Send completion
            send_message(apigw_management, connection_id, {
                "type": "complete",
                "result": {
                    "status": "success",
                    "resource_id": resource_id,
                    "taste_id": taste_id,
                    "pass_1_completed": True,
                    "pass_2_completed": True,
                    "pass_3_completed": True,
                    "pass_4_completed": True,
                    "pass_5_completed": True,
                    "pass_1_authority": pass_1_result.get("authority"),
                    "pass_1_confidence": pass_1_result.get("confidence"),
                    "pass_2_authority": pass_2_result.get("authority"),
                    "pass_2_confidence": pass_2_result.get("confidence"),
                    "pass_3_authority": pass_3_result.get("authority"),
                    "pass_3_confidence": pass_3_result.get("confidence"),
                    "pass_4_authority": pass_4_result.get("authority"),
                    "pass_4_confidence": pass_4_result.get("confidence"),
                    "pass_5_authority": pass_5_result.get("authority"),
                    "pass_5_confidence": pass_5_result.get("confidence"),
                    "extraction_time_ms": (
                        pass_1_result.get("extraction_time_ms", 0) + 
                        pass_2_result.get("extraction_time_ms", 0) +
                        pass_3_result.get("extraction_time_ms", 0) +
                        pass_4_result.get("extraction_time_ms", 0) +
                        pass_5_result.get("extraction_time_ms", 0)
                    ),
                    "layout_type": pass_1_result.get("layout", {}).get("type"),
                    "spacing_quantum": pass_1_result.get("spacing", {}).get("quantum"),
                    "colors_count": len(pass_2_result.get("colors", {}).get("exact_palette", [])),
                    "families_count": len(pass_3_result.get("families", [])),
                    "has_images": pass_4_result.get("has_images"),
                    "image_density": pass_4_result.get("image_density"),
                    "placements_count": len(pass_4_result.get("placements", []))
                }
            })
            
        except Exception as e:
            import traceback
            error_msg = f"Extraction failed: {str(e)}"
            print(f"❌ ERROR in build_dtr: {traceback.format_exc()}")
            send_error(apigw_management, connection_id, error_msg)
    
    # Run async extraction
    try:
        asyncio.run(run_extraction())
    except Exception as e:
        print(f"Error running extraction: {e}")
        import traceback
        traceback.print_exc()
        send_error(apigw_management, connection_id, str(e))


def handle_generate_ui(data: Dict[str, Any], apigw_management: Any, connection_id: str):
    """
    Handle generate-ui action
    
    TODO: Update with new system
    """
    send_error(apigw_management, connection_id, "generate-ui not yet implemented with new system")