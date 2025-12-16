#!/usr/bin/env python3
"""
Mobbin Token Extractor
Extract your Mobbin session tokens manually for use in the API

This is a ONE-TIME setup. The tokens last 24 hours and auto-refresh.
"""

print("""
╔══════════════════════════════════════════════════════════════════════╗
║                    MOBBIN TOKEN EXTRACTION GUIDE                     ║
╚══════════════════════════════════════════════════════════════════════╝

Follow these steps to extract your Mobbin tokens:

STEP 1: Login to Mobbin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Open https://mobbin.com/login in your browser
2. Login with your credentials (email/password or magic link)
3. Wait until you're logged in and see the browse page


STEP 2: Open Browser DevTools
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Press F12 (or Cmd+Option+I on Mac)
2. Click on the "Application" tab (Chrome) or "Storage" tab (Firefox)
3. In the left sidebar, expand "Local Storage"
4. Click on "https://mobbin.com"


STEP 3: Extract Tokens
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Look for these keys in Local Storage:

Key: supabase.auth.token
Value: A JSON string containing your tokens

Copy the entire value (it will look like a long JSON string).


STEP 4: Parse the JSON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The value contains a JSON object. You need:
- access_token
- refresh_token
- expires_at (or expires_in)

Paste the JSON below and we'll extract the tokens:
""")

import json

json_input = input("\nPaste the JSON from Local Storage here:\n> ")

try:
    data = json.loads(json_input)
    
    # Handle different possible structures
    if isinstance(data, str):
        data = json.loads(data)
    
    # Try to extract tokens from various possible structures
    access_token = None
    refresh_token = None
    
    # Structure 1: Direct tokens
    if "access_token" in data:
        access_token = data["access_token"]
        refresh_token = data.get("refresh_token")
    
    # Structure 2: Nested in currentSession or session
    elif "currentSession" in data:
        session = data["currentSession"]
        access_token = session.get("access_token")
        refresh_token = session.get("refresh_token")
    
    elif "session" in data:
        session = data["session"]
        access_token = session.get("access_token")
        refresh_token = session.get("refresh_token")
    
    if not access_token:
        print("\n❌ Could not find access_token in the JSON. Please check the format.")
        print("\nThe JSON should contain 'access_token' and 'refresh_token' fields.")
        exit(1)
    
    print("\n" + "="*70)
    print("✅ TOKENS EXTRACTED SUCCESSFULLY!")
    print("="*70)
    
    print("\n📝 Add these to your .env file:\n")
    print(f"MOBBIN_ACCESS_TOKEN={access_token}")
    if refresh_token:
        print(f"MOBBIN_REFRESH_TOKEN={refresh_token}")
    
    print("\n" + "="*70)
    print("\n💡 NEXT STEPS:\n")
    print("1. Copy the above lines to your .env file")
    print("2. Restart your backend")
    print("3. The tokens will auto-refresh every 24 hours")
    print("\n" + "="*70)
    
    # Optionally create .env snippet
    create_file = input("\n📄 Create .env.mobbin file with these tokens? (y/n): ")
    if create_file.lower() == 'y':
        with open('.env.mobbin', 'w') as f:
            f.write(f"# Mobbin Tokens - Add these to your main .env file\n")
            f.write(f"MOBBIN_ACCESS_TOKEN={access_token}\n")
            if refresh_token:
                f.write(f"MOBBIN_REFRESH_TOKEN={refresh_token}\n")
        print("✅ Created .env.mobbin file!")
        print("   Copy its contents to your main .env file")

except json.JSONDecodeError as e:
    print(f"\n❌ Error parsing JSON: {e}")
    print("\nMake sure you copied the entire value from Local Storage.")
    print("It should be valid JSON format.")
except Exception as e:
    print(f"\n❌ Error: {e}")