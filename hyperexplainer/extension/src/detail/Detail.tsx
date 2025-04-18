// extension/src/detail/Detail.tsx
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./detail.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL!;

interface Explanation {
  importance: string;
  definition: string;
  currentValueAnalysis: string;
  alternativeValues: string[];
  bestPractices: string;
  tradeOffs: string;
  impactVisualization: string;
}

function DetailApp() {
  const [expl, setExpl] = useState<Explanation | null>(null);
  const [loading, setLoading] = useState(true);

  // Read name/value from URL
  const params = new URLSearchParams(window.location.search);
  const name = params.get("name") || "";
  const value = params.get("value") || "";

  useEffect(() => {
    fetch(`${BACKEND}/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, value }),
    })
      .then((r) => r.json())
      .then((d: Explanation) => setExpl(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Loading…</p>;
  if (!expl) return <p className="error">Failed to load.</p>;

  return (
    <div className="detail-container">
      <h1>{name}</h1>
      <div className="section">
        <h2>Impact</h2>
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