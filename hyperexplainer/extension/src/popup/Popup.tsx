import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./popup.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL!;

type Param = { name: string; value: string };

function App() {
  const [code, setCode] = useState<string>("");
  const [params, setParams] = useState<Param[]>([]);

  // On popup open, grab latest code & extract hyperparameters
  useEffect(() => {
    chrome.storage.local.get("latestCode", async (res) => {
      const snippet = (res.latestCode as string) || "";
      setCode(snippet);
      if (!snippet) return;

      try {
        const resp = await fetch(`${BACKEND}/extract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: snippet }),
        });
        const data = (await resp.json()) as Record<string, string>;
        setParams(Object.entries(data).map(([name, value]) => ({ name, value })));
      } catch (err) {
        console.error("Extract failed:", err);
      }
    });
  }, []);

  // Open a new full‐screen window to detail.html for the clicked param
  const openDetail = (p: Param) => {
    const url = chrome.runtime.getURL(
      `detail.html?name=${encodeURIComponent(p.name)}&value=${encodeURIComponent(p.value)}`
    );
    chrome.tabs.create({ url });
  };

  return (
    <div className="popup-container">
      <h1>HyperExplainer</h1>

      {params.length === 0 ? (
        <p className="hint">
          {code ? "No hyperparameters found." : "Waiting for code…"}
        </p>
      ) : (
        <div className="cards">
          {params.map((p) => (
            <div key={p.name} className="card" onClick={() => openDetail(p)}>
              <span className="card-name">{p.name}</span>
              <span className="card-value">{p.value}</span>
              <span className="card-arrow">→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const container = document.getElementById("root")!;
createRoot(container).render(<App />);