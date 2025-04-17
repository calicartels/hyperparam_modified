import re
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file (one directory up)
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(dotenv_path)

# Configure the Gemini API with the key from .env
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables")
genai.configure(api_key=api_key)

def extract_hyperparameters(code: str) -> dict:
    """
    Finds assignments like `learning_rate = 0.001` or `batch_size=32`
    Returns { name: value_str }
    """
    pattern = re.compile(r"(\w+)\s*=\s*([0-9]+(?:\.[0-9]+)?)")
    return {m.group(1): m.group(2) for m in pattern.finditer(code)}

def explain_hyperparameter(name: str, value: str) -> str:
    """
    Calls the Gemini API to explain one hyperparameter.
    """
    try:
        # First, get list of available models
        models = genai.list_models()
        available_models = [m.name for m in models]
        print(f"Available models: {available_models}")
        
        # Use the appropriate model method
        prompt = (
            f"Explain the hyperparameter **{name}** (current value: {value}). "
            "Include: description, impact, alternative values, best practices, and trade‑offs."
        )
        
        # Use gemini-1.5-flash model which is available based on the model list
        model = genai.GenerativeModel('models/gemini-1.5-flash')
        response = model.generate_content(prompt)
        
        return response.text
    except Exception as e:
        print(f"Error with Gemini API: {str(e)}")
        # Fallback explanation
        return f"Could not generate explanation for {name} (value: {value}) due to API error: {str(e)}"