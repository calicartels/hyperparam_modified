import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

type Explanations = Record<string, string>;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function App() {
  const [code, setCode] = useState<string>("");
  const [explanations, setExplanations] = useState<Explanations | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    chrome.storage.local.get("selectedCode", (res: { selectedCode?: string }) => {
      if (res.selectedCode) setCode(res.selectedCode);
    });
  }, []);

  const analyze = async () => {
    console.log("Analyze button clicked!");
    setLoading(true);
    const resp = await fetch(`${BACKEND_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    const data: Explanations = await resp.json();
    setExplanations(data);
    setLoading(false);
  };

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif", width: 300 }}>
      <h2>HyperExplainer</h2>
      <button onClick={analyze} disabled={!code || loading}>
        {loading ? "Analyzing…" : "Analyze"}
      </button>

      {explanations && (
        <div style={{ marginTop: 16, maxHeight: 400, overflowY: "auto" }}>
          {Object.entries(explanations).map(([param, text]) => (
            <div key={param} style={{ marginBottom: 12 }}>
              <h4>{param}</h4>
              <p style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const container = document.getElementById("root")!;
createRoot(container).render(<App />);