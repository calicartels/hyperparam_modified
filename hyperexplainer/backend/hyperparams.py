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
    # Special case for metrics parameter which was causing issues
    if name.lower() == "metrics":
        prompt = f"""
        Create a completely original explanation of the evaluation metric "{value}" in machine learning.
        
        Focus on explaining:
        - What "{value}" specifically measures and how it's calculated
        - Why selecting evaluation metrics like this is important
        - How this metric compares to other common evaluation metrics
        - When this metric is most appropriate to use
        
        Structure your response as a valid JSON with these keys:
        "importance": Why selecting appropriate metrics matters (3-4 original sentences)
        "definition": Technical explanation of what evaluation metrics are (3-4 original sentences)
        "currentValueAnalysis": Analysis of "{value}" specifically (3-4 original sentences) 
        "alternativeValues": Array of 4-6 alternative metrics, each with:
          * "value": Name of an alternative metric
          * "direction": "lower" or "higher" (indicating if it's more or less strict/sensitive)
          * "effect": What this alternative metric measures (2-3 sentences)
          * "complexity": "basic", "intermediate", or "advanced"
        "bestPractices": Advice for choosing and using metrics (3-4 original sentences)
        "tradeOffs": Insights about metric selection trade-offs (3-4 original sentences)
        "impactVisualization": How metrics can be visualized (3-4 original sentences)

        Ensure all content is 100% original and not copied from any source.
        Make sure your response is valid JSON.
        """
    else:
        # General prompt for other parameters
        prompt = f"""
        Provide a comprehensive, educational explanation of the hyperparameter **{name}** (current value: {value}) in machine learning.

        Structure your response EXACTLY as a JSON object with these keys:
        - "importance": Explain why this parameter matters for model performance (3-4 sentences)
        - "definition": Provide a clear, technical definition without repeating the parameter name at the beginning (3-4 sentences with specifics about mathematical role)
        - "currentValueAnalysis": Start with a direct analysis of the value {value} without repetition (3-4 sentences with practical insights)
        - "alternativeValues": An array of 4-6 objects, each containing:
          * "value": A specific alternative value (use concrete numbers or technique names)
          * "direction": Either "lower" or "higher"
          * "effect": A detailed 2-3 sentence explanation of effects
          * "complexity": "basic", "intermediate", or "advanced"

        - "bestPractices": Specific, practical tuning advice (3-4 sentences)
        - "tradeOffs": Key trade-offs when adjusting this parameter (3-4 sentences)
        - "impactVisualization": How parameter affects model behavior visually (3-4 sentences)

        Ensure each field has complete, natural sentences without repetition or awkward phrasing.
        Make alternatives show a range from basic to advanced approaches.
        Ensure VALID JSON with properly escaped quotes and no nested objects.
        Do not include markdown code blocks.
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
        
        # Clean up the response - simpler approach
        # Remove any markdown code blocks first
        if text_response.startswith("```"):
            # Find the end of the code block
            end_marker = text_response.find("```", 3)
            if end_marker > 0:
                # Extract content between markers, excluding the markers themselves
                text_response = text_response[text_response.find("{"):end_marker].strip()
        
        # Instead of trying to fix bad JSON, try again with a simpler prompt if parsing fails
        try:
            parsed = json.loads(text_response)
            
            # Ensure all alternativeValues have a complexity field
            if "alternativeValues" in parsed and isinstance(parsed["alternativeValues"], list):
                for i, alt in enumerate(parsed["alternativeValues"]):
                    if isinstance(alt, dict) and "complexity" not in alt:
                        # Add complexity based on index - earlier ones are more basic
                        if i < len(parsed["alternativeValues"]) / 3:
                            parsed["alternativeValues"][i]["complexity"] = "basic"
                        elif i < 2 * len(parsed["alternativeValues"]) / 3:
                            parsed["alternativeValues"][i]["complexity"] = "intermediate"
                        else:
                            parsed["alternativeValues"][i]["complexity"] = "advanced"
            
            return parsed
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON response: {e}")
            print(f"Response content: {text_response}")
            
            # Try again with a simpler prompt instead of fallback
            retry_prompt = f"""
            Explain the machine learning parameter "{name}" with value "{value}" clearly.
            
            Return your explanation as a simple JSON object with these keys:
            - importance: Why this parameter matters (2-3 sentences)
            - definition: What this parameter is (2-3 sentences)
            - currentValueAnalysis: Analysis of value {value} (2-3 sentences)
            - alternativeValues: Array of 4 alternative values/approaches with their effects
            - bestPractices: How to tune this parameter (2-3 sentences)
            - tradeOffs: Trade-offs to consider (2-3 sentences)
            - impactVisualization: How to visualize impact (2-3 sentences)
            
            Keep it simple and ensure valid JSON format.
            """
            
            retry_response = model.generate_content(
                retry_prompt,
                generation_config={"temperature": 0.1}
            )
            retry_text = retry_response.text if hasattr(retry_response, "text") else str(retry_response)
            
            # Clean up the retry response
            if retry_text.startswith("```"):
                end_marker = retry_text.find("```", 3)
                if end_marker > 0:
                    retry_text = retry_text[retry_text.find("{"):end_marker].strip()
                    
            try:
                return json.loads(retry_text)
            except:
                # If retry fails too, raise the original error
                raise e
            
    except Exception as e:
        print(f"Error in explain_hyperparameter: {e}")
        # No fallback, just raise the error
        raise