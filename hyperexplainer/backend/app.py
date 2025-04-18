import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from setup_gc_credentials import setupGoogleCloudCredentials
from flask_cors import CORS

from hyperparams import extract_hyperparameters, explain_hyperparameter

# Load env from top‑level .env
dotenv_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    ".env"
)
load_dotenv(dotenv_path)

app = Flask(__name__)
CORS(app)
PORT = int(os.getenv("BACKEND_PORT", 5000))

# Google creds (optional)
setupGoogleCloudCredentials()

@app.route("/extract", methods=["POST"])
def extract():
    """
    Step 1: returns JSON map hyperparam_name→value
    """
    code = request.get_json(force=True).get("code", "")
    params = extract_hyperparameters(code)
    return jsonify(params)

@app.route("/explain", methods=["POST"])
def explain():
    """
    Step 2: returns structured explanation for one param
    """
    body  = request.get_json(force=True)
    name  = body.get("name", "")
    value = body.get("value", "")
    explan = explain_hyperparameter(name, value)
    # if explan is a dict, jsonify directly; if string, wrap
    if isinstance(explan, dict):
        return jsonify(explan)
    else:
        return jsonify({"explanation": explan})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)