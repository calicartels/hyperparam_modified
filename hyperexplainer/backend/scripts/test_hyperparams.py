import os
from hyperparams import extract_hyperparameters, explain_hyperparameter
from dotenv import load_dotenv

# Load environment variables from .env file (one directory up)
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(dotenv_path)

# Test code with hyperparameters
test_code = """
# Training hyperparameters
learning_rate = 0.001
batch_size = 32
num_epochs = 100
dropout_rate = 0.2
"""

# Extract and explain hyperparameters
params = extract_hyperparameters(test_code)
print(f"Found parameters: {params}")

# Get explanation for one parameter
if params:
    param_name = list(params.keys())[0]
    param_value = params[param_name]
    print(f"\nExplanation for {param_name}:")
    try:
        explanation = explain_hyperparameter(param_name, param_value)
        print(explanation)
        print("\n✅ API call successful! Your API key is working correctly.")
    except Exception as e:
        print(f"Error: {e}")
        print("\n❌ API call failed. Check your API key and internet connection.") 