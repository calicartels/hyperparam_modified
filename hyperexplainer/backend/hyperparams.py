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
        
        # Replace Python single quotes with double quotes for valid JSON
        raw = raw.replace("'", '"')

        # Now parse clean JSON
        return json.loads(raw)

    except Exception as e:
        print(f"Error in extract_hyperparameters: {e}")
        return {}


def explain_hyperparameter(name: str, value: str) -> dict:
    """
    Calls the Gemini API to explain one hyperparameter.
    Returns a structured JSON object with explanation fields.
    """
    prompt = (
        f"Explain the hyperparameter **{name}** (current value: {value}). "
        "Structure your response as a JSON object with these keys: "
        "importance (why this parameter matters), "
        "definition (what this parameter does), "
        "currentValueAnalysis (analysis of the provided value), "
        "alternativeValues (array of other common values to consider), "
        "bestPractices (recommended practices for this parameter), "
        "tradeOffs (trade-offs to consider when tuning this parameter), "
        "and impactVisualization (description of how this parameter affects model behavior). "
        "Make sure your response is valid JSON."
    )
    try:
        model = genai.GenerativeModel("models/gemini-1.5-flash")
        response = model.generate_content(prompt)
        text_response = response.text if hasattr(response, "text") else str(response)
        
        print(f"RAW EXPLANATION OUTPUT: {text_response[:200]}...")
        
        # Try to parse as JSON first
        try:
            # Clean up the response if it has markdown code blocks
            text_response = re.sub(r"^```(?:json)?\s*", "", text_response, flags=re.DOTALL)
            text_response = re.sub(r"\s*```$", "", text_response, flags=re.DOTALL)
            text_response = text_response.strip()
            
            # Replace single quotes with double quotes for valid JSON
            text_response = text_response.replace("'", '"')
            
            parsed = json.loads(text_response)
            
            # Ensure all expected fields are present
            required_fields = [
                "importance", "definition", "currentValueAnalysis", 
                "alternativeValues", "bestPractices", "tradeOffs", "impactVisualization"
            ]
            
            for field in required_fields:
                if field not in parsed:
                    if field == "alternativeValues":
                        parsed[field] = []
                    else:
                        parsed[field] = f"No information provided for {field}"
            
            return parsed
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON response: {e}")
            # If not valid JSON, create a structured response from the text
            paragraphs = text_response.split('\n\n')
            return {
                "importance": paragraphs[0] if len(paragraphs) > 0 else "Understanding how this parameter affects your model.",
                "definition": paragraphs[1] if len(paragraphs) > 1 else text_response[:200] + "...",
                "currentValueAnalysis": f"Current value ({value}): " + (paragraphs[2] if len(paragraphs) > 2 else "Analysis not available."),
                "alternativeValues": [p.strip() for p in paragraphs[3].split(',')][:3] if len(paragraphs) > 3 else ["Other possible values..."],
                "bestPractices": paragraphs[4] if len(paragraphs) > 4 else "Best practices for this parameter...",
                "tradeOffs": paragraphs[5] if len(paragraphs) > 5 else "Trade-offs to consider...",
                "impactVisualization": paragraphs[6] if len(paragraphs) > 6 else "Impact visualization..."
            }
            
    except Exception as e:
        print(f"Error in explain_hyperparameter: {e}")
        return {
            "importance": f"Error explaining {name}",
            "definition": f"Could not generate explanation for {name} due to: {e}",
            "currentValueAnalysis": f"Current value: {value}",
            "alternativeValues": ["Alternative value 1", "Alternative value 2"],
            "bestPractices": "Best practices information unavailable",
            "tradeOffs": "Trade-offs information unavailable",
            "impactVisualization": "Visualization information unavailable"
        }