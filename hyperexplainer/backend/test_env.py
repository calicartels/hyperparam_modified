import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file (one directory up)
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(dotenv_path)

# Check if the API key exists (without printing the actual key)
gemini_key = os.getenv("GEMINI_API_KEY")
if gemini_key:
    print("✅ GEMINI_API_KEY loaded successfully")
    print(f"   Length: {len(gemini_key)} characters")
else:
    print("❌ GEMINI_API_KEY not found in .env file")
    sys.exit(1)

# Check for Google Cloud credentials
gc_key = os.getenv("GOOGLE_SERVICE_ACCOUNT_KEY")
if gc_key:
    print("✅ GOOGLE_SERVICE_ACCOUNT_KEY loaded successfully")
    print(f"   Length: {len(gc_key)} characters")
else:
    print("ℹ️ GOOGLE_SERVICE_ACCOUNT_KEY not found (optional)")

gc_project = os.getenv("GOOGLE_PROJECT_ID")
if gc_project:
    print("✅ GOOGLE_PROJECT_ID loaded successfully")
else:
    print("ℹ️ GOOGLE_PROJECT_ID not found (optional)")

# Check if we have all required environment variables
required_keys = ["GEMINI_API_KEY"]
if all(os.getenv(key) for key in required_keys):
    print("\n✅ All required environment variables are set")
    print("   The application should work correctly")
else:
    print("\n❌ Some required environment variables are missing")
    print("   Please check your .env file")
    sys.exit(1) 