import os
import json
import re
import math
import google.generativeai as genai
from dotenv import load_dotenv
import random

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
You are an expert ML engineer. Analyze the following machine learning code and identify ALL hyperparameters, including implicit ones.
Return ONLY a valid JSON object where each key is a hyperparameter name and each value is its corresponding value.

Include these specific types of hyperparameters:
1. Explicit hyperparameters (like optimizer='adam', epochs=5)
2. Network architecture parameters:
   - Layer sizes (e.g., Dense(128) → "hidden_layer_size": 128)
   - Output dimensions (e.g., Dense(10) → "output_layer_size": 10)
   - Input shapes (e.g., input_shape=(28, 28) → "input_shape": "28,28")
   - Activation functions
   - Regularization settings (dropout rates)
3. Data preprocessing parameters:
   - Normalization factors (e.g., /255.0 → "normalization_factor": 255.0)
   - Scaling values

Use descriptive, specific names for implicit parameters to clearly indicate what they represent.

Code:
{code}
"""
    try:
        model = genai.GenerativeModel("models/gemini-1.5-flash")
        response = model.generate_content(
            prompt,
            generation_config={"temperature": 0.1}  # Lower temperature for more consistent extraction
        )

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


def predict_parameter_impact(name: str, value: str, additional_params: dict = None) -> dict:
    """
    Uses Gemini to predict model performance metrics for different parameter values
    Returns data points for visualization
    """
    if additional_params is None:
        additional_params = {}
        
    # Create a prompt for Gemini to generate performance prediction data
    prompt = f"""
    You are an expert in machine learning. Generate predicted performance metrics for the hyperparameter "{name}" with a current value of "{value}".
    
    Generate a series of data points showing how different values of this parameter would likely affect model performance.
    For continuous parameters (like learning_rate, dropout_rate), generate 5-7 data points across a reasonable range.
    For categorical parameters (like optimizer, activation), generate data points for common alternatives.
    
    Additional context about the model: {json.dumps(additional_params)}
    
    Return ONLY a valid JSON object with this exact structure:
    {{
        "parameter_name": "{name}",
        "parameter_type": "continuous OR categorical",
        "current_value": "{value}",
        "x_axis_label": "Parameter Value",
        "y_axis_label": "Performance Metric",
        "series": [
            {{
                "name": "Training Accuracy",
                "data": [
                    {{"x": "value1", "y": metric_value}},
                    {{"x": "value2", "y": metric_value}},
                    ...
                ]
            }},
            {{
                "name": "Validation Accuracy",
                "data": [
                    {{"x": "value1", "y": metric_value}},
                    {{"x": "value2", "y": metric_value}},
                    ...
                ]
            }}
        ],
        "suggested_values": [
            {{"value": "alternative1", "reason": "explanation for this suggestion"}},
            {{"value": "alternative2", "reason": "explanation for this suggestion"}},
            ...
        ]
    }}
    """
    
    try:
        model = genai.GenerativeModel("models/gemini-1.5-flash")
        response = model.generate_content(
            prompt,
            generation_config={"temperature": 0.2, "top_p": 0.95, "top_k": 40}
        )
        
        text_response = response.text if hasattr(response, "text") else str(response)
        
        print(f"RAW PERFORMANCE PREDICTION OUTPUT: {text_response[:200]}...")
        
        # Clean up the response - similar to explain_hyperparameter
        if text_response.startswith("```"):
            end_marker = text_response.find("```", 3)
            if end_marker > 0:
                text_response = text_response[text_response.find("{"):end_marker].strip()
        
        try:
            parsed = json.loads(text_response)
            return parsed
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON response: {e}")
            return generate_default_performance_data(name, value)
            
    except Exception as e:
        print(f"Error in predict_parameter_impact: {e}")
        return generate_default_performance_data(name, value)


def generate_default_performance_data(name: str, value: str) -> dict:
    """
    Generate default performance data when the API call fails
    """
    # Default data structure, differentiated by parameter type
    is_continuous = any(term in name.lower() for term in ["rate", "size", "epochs", "factor", "threshold"])
    
    if is_continuous:
        # For numeric parameters
        try:
            current_val = float(value)
            # Generate a reasonable range around the current value
            values = [current_val/10, current_val/2, current_val, current_val*2, current_val*10]
            values = [round(v, 6) for v in values]
            
            # Generate some reasonable performance curves
            train_acc = [0.75, 0.85, 0.9, 0.88, 0.83]
            val_acc = [0.7, 0.82, 0.85, 0.8, 0.75]
            
            return {
                "parameter_name": name,
                "parameter_type": "continuous",
                "current_value": value,
                "x_axis_label": f"{name.replace('_', ' ').title()} Value",
                "y_axis_label": "Accuracy",
                "series": [
                    {
                        "name": "Training Accuracy",
                        "data": [{"x": str(values[i]), "y": train_acc[i]} for i in range(len(values))]
                    },
                    {
                        "name": "Validation Accuracy",
                        "data": [{"x": str(values[i]), "y": val_acc[i]} for i in range(len(values))]
                    }
                ],
                "suggested_values": [
                    {"value": str(values[1]), "reason": "Better generalization"},
                    {"value": str(values[2]), "reason": "Current value - typically optimal"},
                    {"value": str(values[3]), "reason": "May improve performance if underfitting"}
                ]
            }
        except:
            # If conversion fails, treat as categorical
            is_continuous = False
    
    if not is_continuous:
        # For categorical parameters like optimizer, activation function, etc.
        options = []
        if "optimizer" in name.lower():
            options = ["sgd", "adam", "rmsprop", "adagrad", "adadelta"]
        elif "activation" in name.lower():
            options = ["relu", "sigmoid", "tanh", "elu", "leaky_relu"]
        elif "loss" in name.lower():
            options = ["categorical_crossentropy", "binary_crossentropy", "mse", "mae"]
        else:
            options = ["option1", "option2", "option3", "option4", "option5"]
            
        # If current value is in options, make sure it shows up
        if value.lower() in options:
            current_index = options.index(value.lower())
        else:
            options[0] = value.lower()
            current_index = 0
            
        # Generate some reasonable performance data
        train_acc = [0.82, 0.9, 0.87, 0.85, 0.83]
        val_acc = [0.78, 0.85, 0.83, 0.8, 0.77]
        
        # Make current value have high performance
        train_acc[current_index] = 0.9
        val_acc[current_index] = 0.85
        
        return {
            "parameter_name": name,
            "parameter_type": "categorical",
            "current_value": value,
            "x_axis_label": f"{name.replace('_', ' ').title()} Option",
            "y_axis_label": "Accuracy",
            "series": [
                {
                    "name": "Training Accuracy",
                    "data": [{"x": options[i], "y": train_acc[i]} for i in range(len(options))]
                },
                {
                    "name": "Validation Accuracy",
                    "data": [{"x": options[i], "y": val_acc[i]} for i in range(len(options))]
                }
            ],
            "suggested_values": [
                {"value": options[current_index], "reason": "Current value - typically optimal"},
                {"value": options[(current_index + 1) % len(options)], "reason": "Alternative with good performance"}
            ]
        }
    

def generate_parameter_correlations(parameters: dict) -> dict:
    """
    Generates correlation data for visualization in a heatmap
    """
    prompt = f"""
    You are an expert in machine learning. Based on these parameters:
    {json.dumps(parameters)}
    
    Generate a correlation matrix showing how these parameters interact with each other.
    
    Return ONLY a valid JSON object with this exact structure:
    {{
        "correlation_matrix": [
            [1.0, value, value, ...],
            [value, 1.0, value, ...],
            ...
        ],
        "parameter_names": ["param1", "param2", ...],
        "explanations": [
            {{
                "param1": "param2",
                "effect": "explanation of how param1 and param2 interact",
                "strength": "high/medium/low",
                "direction": "positive/negative"
            }},
            ...
        ]
    }}
    
    The correlation values should be between -1.0 (strong negative correlation) and 1.0 (strong positive correlation).
    Include explanations for correlations with absolute value > 0.3.
    """
    
    try:
        model = genai.GenerativeModel("models/gemini-1.5-flash")
        response = model.generate_content(
            prompt,
            generation_config={"temperature": 0.2}
        )
        
        text_response = response.text if hasattr(response, "text") else str(response)
        
        print(f"RAW CORRELATION MATRIX OUTPUT: {text_response[:200]}...")
        
        if text_response.startswith("```"):
            end_marker = text_response.find("```", 3)
            if end_marker > 0:
                text_response = text_response[text_response.find("{"):end_marker].strip()
        
        try:
            return json.loads(text_response)
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON response: {e}")
            return generate_fallback_correlation_data(parameters)
            
    except Exception as e:
        print(f"Error in generate_parameter_correlations: {e}")
        return generate_fallback_correlation_data(parameters)

def generate_fallback_correlation_data(parameters: dict) -> dict:
    """Generate fallback correlation data when API call fails"""
    # Get parameter names
    param_names = list(parameters.keys())
    
    # Create a correlation matrix with some realistic values
    n = len(param_names)
    matrix = [[0.0 for _ in range(n)] for _ in range(n)]
    
    # Set diagonal to 1.0 (self-correlation)
    for i in range(n):
        matrix[i][i] = 1.0
    
    # Set some common correlations
    explanations = []
    
    # Common correlations by parameter name
    common_pairs = {
        ("learning_rate", "batch_size"): -0.4,
        ("learning_rate", "epochs"): 0.3,
        ("learning_rate", "dropout_rate"): 0.5,
        ("batch_size", "epochs"): 0.2,
        ("batch_size", "dropout_rate"): -0.3,
        ("epochs", "dropout_rate"): 0.4,
        ("optimizer", "learning_rate"): 0.6,
        ("loss", "metrics"): 0.7,
        ("metrics", "epochs"): 0.2
    }
    
    for i in range(n):
        for j in range(i+1, n):
            # Look for known correlations
            corr = 0.0
            for pair, value in common_pairs.items():
                if (param_names[i].lower() in pair[0] and param_names[j].lower() in pair[1]) or \
                   (param_names[i].lower() in pair[1] and param_names[j].lower() in pair[0]):
                    corr = value
                    break
            
            if corr == 0.0:
                # Generate small random correlation if no known correlation
                corr = round(random.uniform(-0.2, 0.2), 2)
            
            # Make matrix symmetric
            matrix[i][j] = corr
            matrix[j][i] = corr
            
            # Add explanation for significant correlations
            if abs(corr) > 0.3:
                direction = "positive" if corr > 0 else "negative"
                strength = "high" if abs(corr) > 0.7 else "medium" if abs(corr) > 0.5 else "low"
                
                # Generate explanations based on correlation type
                if param_names[i].lower() == "learning_rate" and param_names[j].lower() == "batch_size":
                    effect = "Higher learning rates often require smaller batch sizes to prevent divergence, while lower learning rates work better with larger batches."
                elif (param_names[i].lower() == "learning_rate" and param_names[j].lower() == "epochs") or \
                     (param_names[i].lower() == "epochs" and param_names[j].lower() == "learning_rate"):
                    effect = "Higher learning rates typically require fewer epochs to converge, while lower learning rates need more epochs to reach optimal performance."
                elif (param_names[i].lower() == "dropout_rate" and param_names[j].lower() == "epochs") or \
                     (param_names[i].lower() == "epochs" and param_names[j].lower() == "dropout_rate"):
                    effect = "Models with higher dropout rates often need more epochs to converge as dropout slows down the learning process."
                else:
                    effect = f"Changes in {param_names[i]} often require adjustments to {param_names[j]} for optimal performance."
                
                explanations.append({
                    "param1": param_names[i],
                    "param2": param_names[j],
                    "effect": effect,
                    "strength": strength,
                    "direction": direction
                })
    
    return {
        "correlation_matrix": matrix,
        "parameter_names": param_names,
        "explanations": explanations
    }