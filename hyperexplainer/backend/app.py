import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify, make_response
from setup_gc_credentials import setupGoogleCloudCredentials
from flask_cors import CORS

# Include the new function in imports
from hyperparams import extract_hyperparameters, explain_hyperparameter, predict_parameter_impact

# Load env from top‑level .env
dotenv_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    ".env"
)
load_dotenv(dotenv_path)

app = Flask(__name__)
# Remove automatic CORS handling - we'll do it manually
# CORS(app, resources={r"/*": {"origins": "*"}})
PORT = int(os.getenv("BACKEND_PORT", 3000))

# Google creds (optional)
setupGoogleCloudCredentials()

@app.after_request
def after_request(response):
    print(f"Request: {request.method} {request.path} -> Response: {response.status_code}")
    # Add CORS headers manually - don't use CORS extension
    response.headers.set('Access-Control-Allow-Origin', '*')  # Use 'set' not 'add'
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    print(f"CORS Headers: {response.headers.get('Access-Control-Allow-Origin', 'None')}")
    return response

@app.route("/extract", methods=["POST", "OPTIONS"])
def extract():
    """
    Step 1: returns JSON map hyperparam_name→value
    """
    if request.method == "OPTIONS":
        return make_response()
        
    code = request.get_json(force=True).get("code", "")
    params = extract_hyperparameters(code)
    return jsonify(params)

@app.route("/explain", methods=["POST", "OPTIONS"])
def explain():
    if request.method == "OPTIONS":
        return make_response()
        
    body = request.get_json(force=True)
    name = body.get("name", "")
    value = body.get("value", "")
    print(f"\n===== RECEIVED EXPLAIN REQUEST =====")
    print(f"Name: {name}, Value: {value}")
    
    # Call the function
    print(f"Calling explain_hyperparameter...")
    explanation = explain_hyperparameter(name, value)
    print(f"Type of explanation returned: {type(explanation)}")
    
    # Log a preview of the explanation
    exp_preview = str(explanation)[:200] + "..." if len(str(explanation)) > 200 else str(explanation)
    print(f"Raw explanation (first 200 chars): {exp_preview}")
    
    # Process the response - ensure it's a dictionary
    if isinstance(explanation, dict):
        print("Explanation is a dictionary - returning directly")
        # Return the explanation directly without any processing or truncation
        return jsonify(explanation)
    elif isinstance(explanation, str):
        print("Explanation is a string, attempting to parse as JSON")
        import json
        try:
            parsed = json.loads(explanation)
            print(f"Successfully parsed string as JSON")
            if isinstance(parsed, dict):
                return jsonify(parsed)
            else:
                print(f"Parsed result is not a dict, returning fallback")
        except Exception as e:
            print(f"Failed to parse JSON: {e}")
    
    # If we get here, something went wrong
    print("ERROR: Could not parse explanation properly")
    # Return a simple fallback that includes the full error message
    return jsonify({
        "importance": f"Error processing explanation for {name}",
        "definition": f"The {name} parameter could not be explained due to an error.",
        "currentValueAnalysis": f"Value {value} could not be analyzed.",
        "alternativeValues": [],
        "bestPractices": "Please try again with a different parameter.",
        "tradeOffs": "Could not determine trade-offs.",
        "impactVisualization": "Visualization not available."
    }), 500  # Return 500 status to indicate error

@app.route("/predict_performance", methods=["POST", "OPTIONS"])
def predict_performance():
    """
    Returns predicted performance metrics for given parameter values
    """
    # Handle OPTIONS request explicitly
    if request.method == "OPTIONS":
        return make_response()
        
    body = request.get_json(force=True)
    param_name = body.get("name", "")
    param_value = body.get("value", "")
    additional_params = body.get("additional_params", {})
    
    print(f"\n===== RECEIVED PREDICT_PERFORMANCE REQUEST =====")
    print(f"Name: {param_name}, Value: {param_value}")
    
    # Call the function
    performance_data = predict_parameter_impact(param_name, param_value, additional_params)
    return jsonify(performance_data)

if __name__ == "__main__":
    try:
        print(f"Starting server on port {PORT}...")
        app.run(host="0.0.0.0", port=PORT, debug=True)
    except Exception as e:
        print(f"ERROR starting server: {e}")