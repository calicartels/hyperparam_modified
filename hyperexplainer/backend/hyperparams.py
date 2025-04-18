import os
import json
import re
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from the top‐level .env
dotenv_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    ".env"
)
load_dotenv(dotenv_path)

# Configure the Gemini API key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables")
genai.configure(api_key=api_key)


def extract_hyperparameters(code: str) -> dict:
    """
    Uses Gemini to generate a pure JSON object mapping hyperparameter names to values.
    Logs raw output and strips Markdown fences if present.
    """
    prompt = f"""
You are a helpful assistant. Analyze the following machine learning code and identify all hyperparameters.
Return ONLY a valid JSON object where each key is a hyperparameter name and each value is its corresponding value.
Do NOT include any other text outside the JSON.

Code:
{code}
"""
    try:
        model = genai.GenerativeModel("models/gemini-1.5-flash")
        response = model.generate_content(prompt)

        # DEBUG: inspect raw model output
        raw = response.text if hasattr(response, "text") else str(response)
        print("RAW HYPERPARAMETERS OUTPUT:", raw)

        # Strip any leading ```json and trailing ``` fences
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.DOTALL)
        raw = re.sub(r"\s*```$", "", raw, flags=re.DOTALL)
        raw = raw.strip()

        # Now parse clean JSON
        return json.loads(raw)

    except Exception as e:
        print(f"Error in extract_hyperparameters: {e}")
        return {}


def explain_hyperparameter(name: str, value: str) -> str:
    """
    Calls the Gemini API to explain one hyperparameter.
    """
    prompt = (
        f"Explain the hyperparameter **{name}** (current value: {value}). "
        "Include: description, impact, alternative values, best practices, and trade‑offs."
    )
    try:
        model = genai.GenerativeModel("models/gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text if hasattr(response, "text") else str(response)
    except Exception as e:
        print(f"Error in explain_hyperparameter: {e}")
        return (
            f"Could not generate explanation for {name} "
            f"(value: {value}) due to API error: {e}"
        )