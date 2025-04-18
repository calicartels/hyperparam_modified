// extension/src/popup/Popup.tsx
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./popup.css";

// fallback to localhost if env var isn’t set
const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
console.log("[HyperExplainer][Popup] Using BACKEND =", BACKEND);

type Param = { name: string; value: string };

function App() {
  const [code, setCode] = useState<string>("");
  const [params, setParams] = useState<Param[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("[HyperExplainer][Popup] Popup mounted, reading storage");
    chrome.storage.local.get("latestCode", async (res) => {
      const snippet = (res.latestCode as string) || "";
      console.log("[HyperExplainer][Popup] Got latestCode from storage:", snippet);
      setCode(snippet);

      if (!snippet) {
        console.log("[HyperExplainer][Popup] No code snippet found, nothing to extract");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log("[HyperExplainer][Popup] Sending extract request to:", BACKEND + "/extract");
        const resp = await fetch(`${BACKEND}/extract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: snippet }),
        });

        console.log("[HyperExplainer][Popup] HTTP status:", resp.status);
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }

        const data = (await resp.json()) as Record<string, string>;
        console.log("[HyperExplainer][Popup] Extract response JSON:", data);

        const mapped = Object.entries(data).map(([name, value]) => ({ name, value }));
        setParams(mapped);
      } catch (e: any) {
        console.error("[HyperExplainer][Popup] Extract failed:", e);
        setError(e.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const openDetail = (p: Param) => {
    console.log("[HyperExplainer][Popup] Opening detail for:", p);
    const url = chrome.runtime.getURL(
      `detail.html?name=${encodeURIComponent(p.name)}&value=${encodeURIComponent(p.value)}`
    );
    chrome.tabs.create({ url });
  };

  return (
    <div className="popup-container">
      <h1>HyperExplainer</h1>

      {loading && <p className="hint">Analyzing code…</p>}

      {!loading && error && (
        <p className="error">Error fetching hyperparameters: {error}</p>
      )}

      {!loading && !error && params.length === 0 && (
        <p className="hint">
          {code ? "No hyperparameters found." : "Waiting for code…"}
        </p>
      )}

      {!loading && !error && params.length > 0 && (
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