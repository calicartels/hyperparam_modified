// extension/src/popup/Popup.tsx
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./popup.css";

// fallback to localhost if env var isn't set
const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
console.log("[HyperExplainer][Popup] Using BACKEND =", BACKEND);

type Param = { 
  name: string; 
  value: string; 
  impact?: "High" | "Medium" | "Low";
  framework?: "TensorFlow" | "PyTorch" | "Common"; 
};

function App() {
  const [code, setCode] = useState<string>("");
  const [params, setParams] = useState<Param[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    console.log("[HyperExplainer][Popup] Popup mounted, reading storage");
    try {
      chrome.storage.local.get("latestCode", async (res) => {
        try {
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

            // Enhance params with mock impact and framework data
            const mapped = Object.entries(data).map(([name, value]) => {
              // Handle null values
              const safeValue = value === null ? "null" : String(value);
              
              // Default values
              let impact: "High" | "Medium" | "Low" = "Medium";
              let framework: "TensorFlow" | "PyTorch" | "Common" = "Common";
              
              // Assign framework and impact
              if (name.includes("learning_rate")) {
                impact = "High";
                framework = "TensorFlow";
              } else if (name.includes("dropout")) {
                impact = "Low";
                framework = "Common";
              } else if (name.includes("optimizer")) {
                impact = "Medium";
                framework = "TensorFlow";
              } else if (name.includes("batch")) {
                impact = "Medium";
                framework = "Common";
              }
              
              return { name, value: safeValue, impact, framework };
            });
            
            setParams(mapped);
          } catch (e: any) {
            console.error("[HyperExplainer][Popup] Extract failed:", e);
            setError(e.message || "Unknown error");
          } finally {
            setLoading(false);
          }
        } catch (e) {
          console.error("[HyperExplainer][Popup] Error processing storage data:", e);
          setError("Error loading data. Please try again.");
          setLoading(false);
        }
      });
    } catch (e) {
      console.error("[HyperExplainer][Popup] Error accessing chrome storage:", e);
      setError("Error accessing extension storage. Please reload the extension.");
      setLoading(false);
    }
  }, []);

  const openDetail = (p: Param) => {
    try {
      console.log("[HyperExplainer][Popup] Opening detail for:", p);
      const url = chrome.runtime.getURL(
        `detail.html?name=${encodeURIComponent(p.name)}&value=${encodeURIComponent(p.value || "")}`
      );
      chrome.tabs.create({ url });
    } catch (e) {
      console.error("[HyperExplainer][Popup] Error opening detail view:", e);
    }
  };

  // Filter params based on active tab
  const filteredParams = params.filter(p => {
    if (activeTab === "all") return true;
    return p.framework === activeTab;
  });

  // Group params by framework or category
  const tfParams = params.filter(p => p.framework === "TensorFlow");
  const commonParams = params.filter(p => p.framework === "Common");

  const getImpactClass = (impact?: string) => {
    if (!impact) return "";
    return impact === "High" ? "high-impact" : impact === "Medium" ? "medium-impact" : "low-impact";
  };

  const getImpactColorClass = (impact?: string) => {
    if (!impact) return "";
    return impact === "High" ? "impact-high" : impact === "Medium" ? "impact-medium" : "impact-low";
  };

  return (
    <div className="popup-container">
      <h1>HyperExplainer</h1>
      <p className="subtitle">AI-powered hyperparameter analysis</p>

      {!loading && !error && params.length > 0 && (
        <div className="info-row">
          <span className="info-icon">ℹ️</span>
          <span className="info-text">Found {params.length} hyperparameters</span>
        </div>
      )}

      {!loading && !error && params.length > 0 && (
        <div className="tabs">
          <div 
            className={`tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All
          </div>
          <div 
            className={`tab ${activeTab === "TensorFlow" ? "active" : ""}`}
            onClick={() => setActiveTab("TensorFlow")}
          >
            TensorFlow
          </div>
          <div 
            className={`tab ${activeTab === "PyTorch" ? "active" : ""}`}
            onClick={() => setActiveTab("PyTorch")}
          >
            PyTorch
          </div>
        </div>
      )}

      {loading && <p className="hint">Analyzing code…</p>}

      {!loading && error && (
        <p className="error">Error fetching hyperparameters: {error}</p>
      )}

      {!loading && !error && params.length === 0 && (
        <p className="hint">
          {code ? "No hyperparameters found." : "Waiting for code…"}
        </p>
      )}

      {!loading && !error && tfParams.length > 0 && activeTab === "all" && (
        <>
          <div className="section-header">TENSORFLOW</div>
          <div className="cards">
            {tfParams.map((p) => (
              <div key={p.name} className={`card ${getImpactClass(p.impact)}`} onClick={() => openDetail(p)}>
                <span className="card-name">{p.name}</span>
                <div className="card-details">
                  <div className="card-value-section">
                    <span className="card-label">Value:</span>
                    <span className="card-value">{p.value || "null"}</span>
                  </div>
                  <div className="card-impact-section">
                    <span className="card-label">Impact:</span>
                    <span className={`card-impact ${getImpactColorClass(p.impact)}`}>{p.impact || "Medium"}</span>
                  </div>
                </div>
                <span className="card-arrow">→</span>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && !error && commonParams.length > 0 && activeTab === "all" && (
        <>
          <div className="section-header">COMMON PARAMETERS</div>
          <div className="cards">
            {commonParams.map((p) => (
              <div key={p.name} className={`card ${getImpactClass(p.impact)}`} onClick={() => openDetail(p)}>
                <span className="card-name">{p.name}</span>
                <div className="card-details">
                  <div className="card-value-section">
                    <span className="card-label">Value:</span>
                    <span className="card-value">{p.value || "null"}</span>
                  </div>
                  <div className="card-impact-section">
                    <span className="card-label">Impact:</span>
                    <span className={`card-impact ${getImpactColorClass(p.impact)}`}>{p.impact || "Medium"}</span>
                  </div>
                </div>
                <span className="card-arrow">→</span>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && !error && filteredParams.length > 0 && activeTab !== "all" && (
        <div className="cards">
          {filteredParams.map((p) => (
            <div key={p.name} className={`card ${getImpactClass(p.impact)}`} onClick={() => openDetail(p)}>
              <span className="card-name">{p.name}</span>
              <div className="card-details">
                <div className="card-value-section">
                  <span className="card-label">Value:</span>
                  <span className="card-value">{p.value || "null"}</span>
                </div>
                <div className="card-impact-section">
                  <span className="card-label">Impact:</span>
                  <span className={`card-impact ${getImpactColorClass(p.impact)}`}>{p.impact || "Medium"}</span>
                </div>
              </div>
              <span className="card-arrow">→</span>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && params.length > 0 && (
        <button className="action-button" onClick={() => {
          // This would open a comprehensive view with all parameters
          const url = chrome.runtime.getURL('detail.html?fullAnalysis=true');
          chrome.tabs.create({ url });
        }}>
          See detailed analysis
        </button>
      )}

      {!loading && !error && params.length > 0 && (
        <div className="footer">
          Powered by Google Cloud Vertex AI
        </div>
      )}
    </div>
  );
}

const container = document.getElementById("root")!;
createRoot(container).render(<App />);