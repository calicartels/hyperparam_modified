import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from setup_gc_credentials import setupGoogleCloudCredentials
from hyperparams import extract_hyperparameters, explain_hyperparameter
from flask_cors import CORS

# Load environment variables from .env file
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(dotenv_path)

app = Flask(__name__)
CORS(app)
PORT = int(os.getenv("BACKEND_PORT", 5000))

# Initialize Google creds if provided
setupGoogleCloudCredentials()

@app.route("/analyze", methods=["POST"])
def analyze():
    payload = request.get_json(force=True)
    code = payload.get("code", "")
    params = extract_hyperparameters(code)
    results = {}
    for name, val in params.items():
        results[name] = explain_hyperparameter(name, val)
    return jsonify(results)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)