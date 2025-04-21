import os
import json
import base64
import pathlib

def setupGoogleCloudCredentials():
    """Set up Google Cloud credentials from environment variables"""
    if not os.environ.get("GOOGLE_SERVICE_ACCOUNT_KEY"):
        print("No Google service account key found in environment variables")
        return False

    key = os.environ.get("GOOGLE_SERVICE_ACCOUNT_KEY")
    parsed = None

    # Try to parse JSON as-is
    try:
        parsed = json.loads(key)
    except json.JSONDecodeError:
        # Try replacing escaped newlines
        try:
            key = key.replace("\\n", "\n")
            parsed = json.loads(key)
        except json.JSONDecodeError:
            # Try base64
            try:
                decoded = base64.b64decode(key).decode('utf-8')
                parsed = json.loads(decoded)
                key = decoded
            except Exception as e:
                print("Failed to parse service account key in any format")
                return False

    # Write to disk
    cred_dir = pathlib.Path.cwd() / "credentials"
    cred_dir.mkdir(exist_ok=True)
    cred_path = cred_dir / "google-sa.json"
    
    with open(cred_path, "w") as f:
        json.dump(parsed, f, indent=2)
    
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(cred_path)
    print(f"Wrote Google creds to {cred_path}")

    if not os.environ.get("GOOGLE_PROJECT_ID"):
        print("Missing GOOGLE_PROJECT_ID")
        return False

    return True