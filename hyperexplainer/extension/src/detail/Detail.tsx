// extension/src/detail/Detail.tsx
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./detail.css";

interface Explanation {
  importance: string;
  definition: string;
  currentValueAnalysis: string;
  alternativeValues: string[];
  bestPractices: string;
  tradeOffs: string;
  impactVisualization: string;
}

// Pick up the backend URL from env or fall back to localhost
const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
console.log("[HyperExplainer][Detail] Using BACKEND =", BACKEND);

const getParam = (key: string) =>
  new URLSearchParams(window.location.search).get(key) || "";

function DetailApp() {
  const name = getParam("name");
  const value = getParam("value");
  const [expl, setExpl] = useState<Explanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExplanation() {
      console.log("[HyperExplainer][Detail] Fetching", { name, value });
      try {
        const resp = await fetch(`${BACKEND}/explain`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, value }),
        });
        console.log("[HyperExplainer][Detail] HTTP status:", resp.status);
        if (!resp.ok) {
          throw new Error(`Server responded ${resp.status}: ${resp.statusText}`);
        }
        const data = (await resp.json()) as Partial<Explanation>;
        console.log("[HyperExplainer][Detail] Response JSON:", data);

        // Validate received object
        const explanation: Explanation = {
          importance: data.importance || "No importance provided.",
          definition: data.definition || "No definition provided.",
          currentValueAnalysis:
            data.currentValueAnalysis || `Current value: ${value}`,
          alternativeValues:
            Array.isArray(data.alternativeValues) && data.alternativeValues.length
              ? data.alternativeValues
              : ["No alternatives provided."],
          bestPractices: data.bestPractices || "No best practices provided.",
          tradeOffs: data.tradeOffs || "No trade‑offs provided.",
          impactVisualization:
            data.impactVisualization || "No visualization provided.",
        };

        setExpl(explanation);
      } catch (e: any) {
        console.error("[HyperExplainer][Detail] fetch failed:", e);
        setError(e.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchExplanation();
  }, [name, value]);

  if (loading) {
    return <div className="loading">Loading explanation…</div>;
  }
  if (error) {
    return <div className="error">Error: {error}</div>;
  }
  if (!expl) {
    return <div className="error">Failed to load explanation.</div>;
  }

  return (
    <div className="detail-container">
      <h1>{name}</h1>

      <div className="section">
        <h2>Importance</h2>
        <p>{expl.importance}</p>
      </div>

      <div className="section">
        <h2>Definition</h2>
        <p>{expl.definition}</p>
      </div>

      <div className="section">
        <h2>Current Value Analysis</h2>
        <p>{expl.currentValueAnalysis}</p>
      </div>

      <div className="section">
        <h2>Alternative Values</h2>
        <ul>
          {expl.alternativeValues.map((v, i) => (
            <li key={i}>{v}</li>
          ))}
        </ul>
      </div>

      <div className="section">
        <h2>Best Practices</h2>
        <p>{expl.bestPractices}</p>
      </div>

      <div className="section">
        <h2>Trade‑offs</h2>
        <p>{expl.tradeOffs}</p>
      </div>

      <div className="section">
        <h2>Impact Visualization</h2>
        <p>{expl.impactVisualization}</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<DetailApp />);