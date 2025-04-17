#!/usr/bin/env python
"""
Helper script to guide you through getting a Google Gemini API key
"""
import webbrowser
import os
import dotenv

def main():
    print("\n===== Google Gemini API Key Setup =====")
    print("This script will help you get a Google Gemini API key and set it up correctly.\n")
    
    # Open Google AI Studio in browser
    print("1. Opening Google AI Studio in your browser...")
    webbrowser.open("https://ai.google.dev/")
    
    print("\n2. Follow these steps to get an API key:")
    print("   a. Click on 'Get API key in Google AI Studio'")
    print("   b. Sign in with your Google account if needed")
    print("   c. Agree to the terms of service")
    print("   d. Click 'Create API key' and copy the generated key")
    
    print("\n3. Enter your API key below (it will be saved to your .env file)")
    print("   Note: The key should look like 'AIza...' and be about 40 characters long")
    
    api_key = input("\nPaste your Gemini API key here: ")
    
    if not api_key.strip():
        print("\n❌ No API key provided. Please run this script again when you have your key.")
        return
    
    # Path to .env file in parent directory
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    
    # Update .env file
    if os.path.exists(env_path):
        # Load existing .env
        dotenv.load_dotenv(env_path)
        
        # Update the content with new API key
        with open(env_path, 'r') as f:
            lines = f.readlines()
        
        found = False
        with open(env_path, 'w') as f:
            for line in lines:
                if line.startswith("GEMINI_API_KEY="):
                    f.write(f"GEMINI_API_KEY={api_key}\n")
                    found = True
                else:
                    f.write(line)
            
            if not found:
                f.write(f"\nGEMINI_API_KEY={api_key}\n")
    else:
        # Create new .env file
        with open(env_path, 'w') as f:
            f.write(f"GEMINI_API_KEY={api_key}\n")
    
    print("\n✅ API key successfully saved to .env file at:")
    print(f"   {env_path}")
    print("\nYou can now run the application with the new API key.")
    print("Try running 'python test_hyperparams.py' to verify it works.")

if __name__ == "__main__":
    main() 