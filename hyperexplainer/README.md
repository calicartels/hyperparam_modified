# HyperExplainer

**HyperExplainer** is a Chrome extension + Python backend that:
- **Injects** into ChatGPT (or any code site) to let users select code.
- **Parses** hyperparameters dynamically.
- **Calls** Google Gemini (or OpenAI) to explain each hyperparameter, show alternatives and best practices.
- **Presents** a beautiful popup UI for lay‑users to tinker with hyperparameters on the fly.

## Features

- Select code on any page → open popup → see parsed hyperparameters
- One‑click “Analyze” → fetch explanations & alternatives
- Export parameter docs as JSON
- Fully dynamic via `GEMINI_API_KEY` or Google service account

## Getting Started

1. **Clone** this repo  
2. **Fill out** `.env` values (see `.env.example`)  
3. **Build & Run**:
   ```bash
   # In /backend
   docker build -t hyperexplainer-backend .
   docker run -e GEMINI_API_KEY -e GOOGLE_SERVICE_ACCOUNT_KEY -e GOOGLE_PROJECT_ID -p 5000:5000 hyperexplainer-backend

   # In /extension
   cd extension
   npm install
   npm run build
   # Load `extension/dist` as an unpacked Chrome extension