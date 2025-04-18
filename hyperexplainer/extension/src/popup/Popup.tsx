import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./popup.css";  // we'll add some simple styles

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

type Explanations = Record<string, string>;

function App() {
  const [code, setCode] = useState("");
  const [params, setParams] = useState<Explanations>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    chrome.storage.local.get("latestCode", (res) => {
      if (res.latestCode) setCode(res.latestCode);
    });
  }, []);

  const analyze = async () => {
    console.log("Backend URL is:", BACKEND_URL);
    setLoading(true);
    try {
      const resp = await fetch(`${BACKEND_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data: Explanations = await resp.json();
      setParams(data);
    } catch (e) {
      console.error("Fetch failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="popup-container">
      <h1 className="title">HyperExplainer</h1>
      {code ? (
        <pre className="code-block">{code}</pre>
      ) : (
        <p className="hint">Waiting for code from ChatGPT…</p>
      )}

      <button
        className="analyze-btn"
        onClick={analyze}
        disabled={!code || loading}
      >
        {loading ? "Analyzing…" : "Analyze"}
      </button>

      {Object.keys(params).length > 0 && (
        <div className="results">
          {Object.entries(params).map(([name, text]) => (
            <div key={name} className="param-card">
              <div className="param-header">{name}</div>
              <div className="param-body">{text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const root = document.getElementById("root")!;
createRoot(root).render(<App />);