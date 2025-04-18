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
    Returns a structured JSON object with comprehensive explanation fields.
    """
    prompt = f"""
Provide a comprehensive, educational explanation of the hyperparameter **{name}** (current value: {value}).

Structure your response EXACTLY as a JSON object with these keys:
- "importance": Explain why this parameter matters and its impact on model performance (2-3 sentences)
- "definition": Provide a clear, technical definition of what this parameter controls (2-3 sentences)
- "currentValueAnalysis": Analyze the specific provided value of {value}, discussing whether it's typical, high, or low, and what effects this specific value would have (2-3 sentences)
- "alternativeValues": An array of EXACTLY TWO objects, each containing:
  * "value": A specific alternative value (typically one lower and one higher than the current value)
  * "direction": Either "lower" or "higher" to indicate if this is a lower or higher alternative
  * "effect": A 1-2 sentence explanation of what effect this alternative value would have

- "bestPractices": Provide specific, practical advice for tuning this parameter (2-3 sentences)
- "tradeOffs": Explain the key trade-offs involved when adjusting this parameter (2-3 sentences)
- "impactVisualization": Describe how this parameter affects model behavior in terms a visualization might show (2-3 sentences)

Make your response extremely educational and insightful for machine learning practitioners.
Make sure your response is VALID JSON with properly escaped quotes. Do not nest JSON objects inside fields.
"""
    try:
        model = genai.GenerativeModel("models/gemini-1.5-flash")
        # Set more structured output with temperature 0.2 for more reliable JSON
        response = model.generate_content(
            prompt,
            generation_config={"temperature": 0.2, "top_p": 0.95, "top_k": 40}
        )
        text_response = response.text if hasattr(response, "text") else str(response)
        
        print(f"RAW EXPLANATION OUTPUT: {text_response[:200]}...")
        
        # Clean up the response
        # Remove any markdown code blocks
        text_response = re.sub(r"^```(?:json)?\s*", "", text_response, flags=re.DOTALL)
        text_response = re.sub(r"\s*```$", "", text_response, flags=re.DOTALL)
        text_response = text_response.strip()
        
        # Fix common JSON issues
        # Replace escaped quotes with temporary placeholder
        text_response = text_response.replace('\\"', '##QUOTE##')
        # Replace unescaped quotes inside strings with escaped quotes
        text_response = re.sub(r'(?<="[^"]*)"(?=[^"]*")', '\\"', text_response)
        # Restore properly escaped quotes
        text_response = text_response.replace('##QUOTE##', '\\"')
        
        # Try to parse the fixed JSON
        try:
            parsed = json.loads(text_response)
            
            # Process alternative values to ensure they have the right structure
            if "alternativeValues" in parsed and isinstance(parsed["alternativeValues"], list):
                # Ensure each alternative value has the right structure
                for i, alt in enumerate(parsed["alternativeValues"]):
                    if not isinstance(alt, dict):
                        # Convert string alternatives to properly structured objects
                        if isinstance(alt, str):
                            # Try to determine if this is higher or lower
                            direction = "higher" if "higher" in alt.lower() else "lower"
                            # Extract a value if possible
                            value_match = re.search(r'(\d+\.?\d*)', alt)
                            alt_value = value_match.group(1) if value_match else ("0.5" if direction == "higher" else "0.1")
                            # Create a structured alternative
                            parsed["alternativeValues"][i] = {
                                "value": alt_value,
                                "direction": direction,
                                "effect": alt
                            }
            else:
                # Create default alternative values if missing
                parsed["alternativeValues"] = [
                    {
                        "value": "0.1" if str(value) != "0.1" else "0.05",
                        "direction": "lower",
                        "effect": "A lower value may provide better generalization but slower training."
                    },
                    {
                        "value": "0.5" if str(value) != "0.5" else "0.8",
                        "direction": "higher",
                        "effect": "A higher value may lead to faster training but could reduce generalization."
                    }
                ]
            
            # Ensure all expected fields are present with meaningful content
            required_fields = [
                "importance", "definition", "currentValueAnalysis", 
                "alternativeValues", "bestPractices", "tradeOffs", "impactVisualization"
            ]
            
            for field in required_fields:
                if field not in parsed or not parsed[field]:
                    if field == "alternativeValues":
                        # Already handled above
                        pass
                    elif field == "importance":
                        parsed[field] = f"The {name} parameter is crucial for model performance as it directly impacts how the model learns from data."
                    elif field == "definition":
                        parsed[field] = f"The {name} parameter controls an aspect of model training or architecture."
                    elif field == "currentValueAnalysis":
                        parsed[field] = f"The value {value} is a common setting that provides a balance of performance and generalization."
                    elif field == "bestPractices":
                        parsed[field] = f"It's typically recommended to start with the default value and adjust based on validation performance."
                    elif field == "tradeOffs":
                        parsed[field] = f"Modifying this parameter often involves a tradeoff between training speed, model performance, and generalization ability."
                    elif field == "impactVisualization":
                        parsed[field] = f"Visualizing the effect of {name} would show how different values impact the model's learning curve and final performance."
            
            return parsed
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON response: {e}")
            
            # Create a more comprehensive fallback response
            alt_value1 = "0.1" if str(value) != "0.1" else "0.05"
            alt_value2 = "0.5" if str(value) != "0.5" else "0.8"
            
            return {
                "importance": f"The {name} parameter is crucial for model performance as it directly impacts how the model learns from data.",
                "definition": f"The {name} parameter controls an aspect of model training or architecture that affects the learning process.",
                "currentValueAnalysis": f"The value {value} is a common setting that provides a balance of performance and generalization.",
                "alternativeValues": [
                    {
                        "value": alt_value1,
                        "direction": "lower",
                        "effect": "A lower value may provide better generalization but slower training."
                    },
                    {
                        "value": alt_value2,
                        "direction": "higher",
                        "effect": "A higher value may lead to faster training but could reduce generalization."
                    }
                ],
                "bestPractices": "It's typically recommended to start with the default value and adjust based on validation performance.",
                "tradeOffs": "Modifying this parameter often involves a tradeoff between training speed, model performance, and generalization ability.",
                "impactVisualization": f"Visualizing the effect of {name} would show how different values impact the model's learning curve and final performance."
            }
            
    except Exception as e:
        print(f"Error in explain_hyperparameter: {e}")
        
        # Create a comprehensive fallback response
        alt_value1 = "0.1" if str(value) != "0.1" else "0.05"
        alt_value2 = "0.5" if str(value) != "0.5" else "0.8"
        
        return {
            "importance": f"The {name} parameter is crucial for model performance as it directly impacts how the model learns from data.",
            "definition": f"The {name} parameter controls an aspect of model training or architecture that affects the learning process.",
            "currentValueAnalysis": f"The value {value} is a common setting that provides a balance of performance and generalization.",
            "alternativeValues": [
                {
                    "value": alt_value1,
                    "direction": "lower",
                    "effect": "A lower value may provide better generalization but slower training."
                },
                {
                    "value": alt_value2,
                    "direction": "higher",
                    "effect": "A higher value may lead to faster training but could reduce generalization."
                }
            ],
            "bestPractices": "It's typically recommended to start with the default value and adjust based on validation performance.",
            "tradeOffs": "Modifying this parameter often involves a tradeoff between training speed, model performance, and generalization ability.",
            "impactVisualization": f"Visualizing the effect of {name} would show how different values impact the model's learning curve and final performance."
        }