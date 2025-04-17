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
    Uses Gemini to identify all parameters in the code
    """
    try:
        # Use the appropriate model
        model = genai.GenerativeModel('models/gemini-1.5-flash')
        
        prompt = """
        Analyze this machine learning code and identify ALL parameters, including:
        - Hyperparameters (learning rate, batch size, epochs, etc.)
        - Model architecture parameters (layers, units, activation functions)
        - Model types (SVM, neural network, etc.)
        - Optimizer choices
        - Loss functions
        - Any other configurable options
        
        Return ONLY a JSON object with parameter names as keys and values as strings.
        Example: {"learning_rate": "0.001", "optimizer": "Adam", "activation": "relu", "model_type": "Sequential", "dropout": "0.5"}
        
        CODE:
        ```
        {code}
        ```
        """
        
        response = model.generate_content(prompt.format(code=code))
        
        # Parse JSON response
        import json
        import re
        
        # Try to extract JSON from the response
        json_pattern = r'\{.*\}'
        json_match = re.search(json_pattern, response.text, re.DOTALL)
        
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                print(f"Failed to parse JSON in response: {response.text}")
                return {}
        else:
            print(f"No JSON found in response: {response.text}")
            return {}
        
    except Exception as e:
        print(f"Error with Gemini API: {str(e)}")
        return {}

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