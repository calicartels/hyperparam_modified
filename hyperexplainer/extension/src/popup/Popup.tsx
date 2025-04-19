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
  category?: string;
};

type CategoryMap = Record<string, string[]>;

function App() {
  const [code, setCode] = useState<string>("");
  const [params, setParams] = useState<Param[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [groupedParams, setGroupedParams] = useState<Record<string, Param[]>>({});
  
  const [paramCategories] = useState<CategoryModel>({
    categories: {
      architecture: [
        'units', 'layer', 'shape', 'hidden', 'filters', 'kernel', 'pool', 
        'dense', 'dropout', 'conv', 'lstm', 'hidden_layer_size', 'output_layer_size',
        'output_units', 'input_shape'
      ],
      preprocessing: [
        'normalization', 'scaling', 'factor', 'augmentation', 'resize',
        'normalization_factor', 'standardization'
      ],
      activation: ['activation', 'relu', 'sigmoid', 'tanh', 'softmax', 'leaky', 'swish', 'mish', 'gelu'],
      optimization: ['optimizer', 'learning_rate', 'momentum', 'decay', 'beta', 'adam', 'sgd', 'rmsprop'],
      training: ['epochs', 'batch', 'steps', 'patience', 'callbacks', 'monitor'],
      evaluation: ['loss', 'metric', 'accuracy', 'precision', 'recall', 'f1', 'auc', 'mae'],
      regularization: ['dropout', 'l1', 'l2', 'regulariz', 'penalty']
    },
    displayNames: {
      architecture: "NETWORK ARCHITECTURE",
      preprocessing: "DATA PREPROCESSING",
      activation: "ACTIVATION FUNCTIONS",
      optimization: "OPTIMIZATION",
      training: "TRAINING PARAMETERS",
      evaluation: "EVALUATION METRICS",
      regularization: "REGULARIZATION",
      other: "OTHER PARAMETERS"
    },
    impacts: {
      high: ['learning_rate', 'optimizer', 'loss', 'epochs', 'batch_size'],
      medium: ['dropout', 'activation', 'layers', 'units', 'hidden_layer_size'],
      low: ['momentum', 'beta', 'epsilon', 'seed', 'normalization_factor']
    }
  });

  // Function to categorize parameters based on name
  const categorizeParameter = (name: string) => {
    const lowerName = name.toLowerCase();
    
    for (const [category, keywords] of Object.entries(paramCategories.categories)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return category;
      }
    }
    return "other";
  };

  // Function to determine impact based on parameter name
  const determineImpact = (name: string): "High" | "Medium" | "Low" => {
    const lowerName = name.toLowerCase();
    
    if (paramCategories.impacts.high.some(keyword => lowerName.includes(keyword))) {
      return "High";
    } else if (paramCategories.impacts.medium.some(keyword => lowerName.includes(keyword))) {
      return "Medium";
    }
    
    return "Low";
  };

  // Function to determine framework based on parameter name
  const determineFramework = (name: string): "TensorFlow" | "PyTorch" | "Common" => {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes("torch") || lowerName.includes("nn.")) {
      return "PyTorch";
    } else if (lowerName.includes("tf.") || lowerName.includes("keras")) {
      return "TensorFlow";
    }
    
    return "Common";
  };

  // Group parameters by category
  useEffect(() => {
    if (params.length > 0) {
      const grouped: Record<string, Param[]> = {};
      
      params.forEach(param => {
        const category = param.category || 'other';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(param);
      });
      
      // Sort categories to ensure consistent order
      const sortedGroups: Record<string, Param[]> = {};
      const orderedCategories = [
        'architecture',
        'activation',
        'optimization',
        'training',
        'evaluation',
        'regularization',
        'other'
      ];
      
      orderedCategories.forEach(cat => {
        if (grouped[cat]?.length > 0) {
          sortedGroups[cat] = grouped[cat];
        }
      });
      
      setGroupedParams(sortedGroups);
    }
  }, [params]);

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

            // Enhanced param mapping with dynamic categorization
            const mapped = Object.entries(data).map(([name, value]) => {
              // Handle null values
              const safeValue = value === null ? "null" : String(value);
              const category = categorizeParameter(name);
              const impact = determineImpact(name);
              const framework = determineFramework(name);
              
              return { 
                name, 
                value: safeValue, 
                impact, 
                framework,
                category 
              };
            });
            
            // Store parameters to chrome storage for other components
            try {
              chrome.storage.local.set({ 
                hyperparams: Object.fromEntries(mapped.map(p => [p.name, p.value]))
              });
            } catch (err) {
              console.warn("Could not store params to chrome storage", err);
            }
            
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

  // Group params by framework
  const paramsByFramework = {
    "TensorFlow": params.filter(p => p.framework === "TensorFlow"),
    "PyTorch": params.filter(p => p.framework === "PyTorch"),
    "Common": params.filter(p => p.framework === "Common")
  };

  // Helper functions for styling
  const getImpactClass = (impact?: string) => {
    if (!impact) return "";
    return impact === "High" ? "high-impact" : impact === "Medium" ? "medium-impact" : "low-impact";
  };

  const getImpactColorClass = (impact?: string) => {
    if (!impact) return "";
    return impact === "High" ? "impact-high" : impact === "Medium" ? "impact-medium" : "impact-low";
  };

  // Render param card
  const renderParamCard = (param: Param) => (
    <div key={param.name} className={`card ${getImpactClass(param.impact)}`} onClick={() => openDetail(param)}>
      <span className="card-name">{param.name}</span>
      <div className="card-details">
        <div className="card-value-section">
          <span className="card-label">Value:</span>
          <span className="card-value">{param.value}</span>
        </div>
        <div className="card-impact-section">
          <span className="card-label">Impact:</span>
          <span className={`card-impact ${getImpactColorClass(param.impact)}`}>
            {param.impact || "Medium"}
          </span>
        </div>
      </div>
      <span className="card-arrow">→</span>
    </div>
  );

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
          {Object.entries(paramsByFramework).map(([framework, params]) => 
            params.length > 0 ? (
              <div 
                key={framework}
                className={`tab ${activeTab === framework ? "active" : ""}`}
                onClick={() => setActiveTab(framework)}
              >
                {framework}
              </div>
            ) : null
          )}
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

      {!loading && !error && params.length > 0 && activeTab === "all" && (
        // Render grouped parameters by category
        Object.entries(groupedParams).map(([category, params]) => (
          <div key={category} className="param-category">
            <div className="section-header">
              {(paramCategories.displayNames as any)[category] || category.toUpperCase()}
            </div>
            <div className="cards">
              {params.map(param => renderParamCard(param))}
            </div>
          </div>
        ))
      )}

      {!loading && !error && activeTab !== "all" && (
        <div className="cards">
          {filteredParams.map(param => renderParamCard(param))}
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

// Type for parameter categorization model
interface CategoryModel {
  categories: Record<string, string[]>;
  displayNames: Record<string, string>;
  impacts: Record<string, string[]>;
}

const container = document.getElementById("root")!;
createRoot(container).render(<App />);