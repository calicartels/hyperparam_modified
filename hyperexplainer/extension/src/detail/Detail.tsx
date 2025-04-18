// extension/src/detail/Detail.tsx
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./detail.css";

// Updated interface to handle both old and new alternativeValues formats
interface AlternativeValue {
  value: string;
  direction: "higher" | "lower";
  effect: string;
  complexity?: "basic" | "intermediate" | "advanced";
}

interface Explanation {
  importance: string;
  definition: string;
  currentValueAnalysis: string;
  alternativeValues: (AlternativeValue | string)[];
  bestPractices: string;
  tradeOffs: string;
  impactVisualization: string;
}

// Pick up the backend URL from env or fall back to localhost
const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
console.log("[HyperExplainer][Detail] Using BACKEND =", BACKEND);

const getParam = (key: string) => {
  try {
    return new URLSearchParams(window.location.search).get(key) || "";
  } catch (e) {
    console.error("[HyperExplainer][Detail] Error parsing URL param:", e);
    return "";
  }
};

function DetailApp() {
  const [name, setName] = useState(getParam("name"));
  const [value, setValue] = useState(getParam("value"));
  const [framework, setFramework] = useState("TensorFlow");
  const [context, setContext] = useState("");
  const [useFallback, setUseFallback] = useState(false);
  const [expl, setExpl] = useState<Explanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("parameter");
  const [impact, setImpact] = useState("Medium");
  const [complexityFilter, setComplexityFilter] = useState<string | null>(null);

  useEffect(() => {
    if (name) {
      fetchExplanation();
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchExplanation() {
    console.log("[HyperExplainer][Detail] Fetching", { name, value });
    try {
      setLoading(true);
      setError(null);

      // Ensure value is a string to prevent errors
      const safeValue = value === null ? "null" : value;
      
      const resp = await fetch(`${BACKEND}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, value: safeValue }),
      });
      
      console.log("[HyperExplainer][Detail] HTTP status:", resp.status);
      if (!resp.ok) {
        throw new Error(`Server responded ${resp.status}: ${resp.statusText}`);
      }
      
      const data = (await resp.json()) as Partial<Explanation>;
      console.log("[HyperExplainer][Detail] Response JSON:", data);

      // Validate received object and ensure defaults
      const explanation: Explanation = {
        importance: data.importance || "",
        definition: data.definition || "",
        currentValueAnalysis: data.currentValueAnalysis || "",
        alternativeValues: data.alternativeValues || [],
        bestPractices: data.bestPractices || "",
        tradeOffs: data.tradeOffs || "",
        impactVisualization: data.impactVisualization || "",
      };

      setExpl(explanation);
      
      // Update impact based on parameter name if not set
      if (name.toLowerCase().includes('learning_rate') || 
          name.toLowerCase().includes('optimizer') || 
          name.toLowerCase().includes('loss')) {
        setImpact("High");
      } else if (name.toLowerCase().includes('dropout') || 
                name.toLowerCase().includes('batch_size')) {
        setImpact("Medium");
      }
    } catch (e: any) {
      console.error("[HyperExplainer][Detail] fetch failed:", e);
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const handleGetExplanation = () => {
    if (name) {
      fetchExplanation();
    }
  };

  const impactClass = `impact-${impact.toLowerCase()}`;

  // Helper function to safely split strings
  const safeSplit = (str: string, separator: string): string[] => {
    if (typeof str !== 'string') {
      return [String(str)];
    }
    return str.split(separator);
  };

  // Helper to safely get first word
  const getFirstWord = (str: string): string => {
    if (!str || typeof str !== 'string') return String(str);
    const parts = safeSplit(str, ' ');
    return parts[0] || '';
  };

  // Helper to get the rest of the words
  const getRestOfWords = (str: string): string => {
    if (!str || typeof str !== 'string') return '';
    const parts = safeSplit(str, ' ');
    return parts.slice(1).join(' ');
  };

  // Helper to determine if string alternative is higher or lower
  const getAlternativeDirection = (alt: string): "higher" | "lower" => {
    if (typeof alt === 'string' && alt.toLowerCase().includes('lower')) {
      return "lower";
    }
    return "higher";
  };

  // Function to render alternative value card
  const renderAlternativeCard = (alt: any, index: number) => {
    // Handle object format
    if (typeof alt === 'object' && alt !== null) {
      const complexityClass = alt.complexity ? `complexity-${alt.complexity}` : '';
      
      return (
        <div key={index} className={`alternative-card ${complexityClass}`}>
          <div className="alternative-value">{alt.value || ""}</div>
          <div className="alternative-metadata">
            <div className={`alternative-label ${alt.direction || "higher"}`}>
              {alt.direction || "higher"}
            </div>
            {alt.complexity && (
              <div className={`complexity-badge ${alt.complexity}`}>
                {alt.complexity}
              </div>
            )}
          </div>
          <p>{alt.effect || ""}</p>
        </div>
      );
    }
    
    // Handle string format
    const firstWord = getFirstWord(alt);
    const rest = getRestOfWords(alt);
    const direction = getAlternativeDirection(alt);
    
    return (
      <div key={index} className="alternative-card">
        <div className="alternative-value">{firstWord}</div>
        <div className={`alternative-label ${direction}`}>
          {direction}
        </div>
        <p>{rest}</p>
      </div>
    );
  };

  // Filter alternatives based on complexity
  const getFilteredAlternatives = () => {
    if (!expl || !Array.isArray(expl.alternativeValues)) {
      return [];
    }

    // If no filter or the alternatives don't have complexity, return all
    if (!complexityFilter) {
      return expl.alternativeValues;
    }

    // Filter by complexity
    return expl.alternativeValues.filter(alt => {
      if (typeof alt === 'object' && alt !== null && alt.complexity) {
        return alt.complexity === complexityFilter;
      }
      // For alternatives without complexity, include them only in 'all' view
      return false;
    });
  };

  return (
    <div className="detail-container">
      {/* Left Panel - Input Form */}
      <div className="input-panel">
        <h1>Hyperparameter Input</h1>
        <p className="subtitle">Enter hyperparameter details below to get an explanation</p>

        <div className="form-group">
          <label className="form-label">Parameter Name</label>
          <input
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. learning_rate"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Parameter Value</label>
          <input
            type="text"
            className="form-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 0.001"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Framework</label>
          <select
            className="form-select"
            value={framework}
            onChange={(e) => setFramework(e.target.value)}
          >
            <option value="TensorFlow">TensorFlow</option>
            <option value="PyTorch">PyTorch</option>
            <option value="JAX">JAX</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Code Context</label>
          <textarea
            className="code-input"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="model = Sequential()
model.add(Dense(64, activation='relu'))
model.add(Dense(10, activation='softmax'))

optimizer = Adam(learning_rate=0.001)
model.compile(loss='categorical_crossentropy',
              optimizer=optimizer,
              metrics=['accuracy'])"
          />
        </div>

        <div className="toggle-container">
          <label className="toggle">
            <input 
              type="checkbox" 
              checked={useFallback}
              onChange={(e) => setUseFallback(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">Use fallback (no LLM)</span>
        </div>

        <button className="action-button" onClick={handleGetExplanation}>
          Get Explanation
        </button>
      </div>

      {/* Right Panel - Results */}
      <div className="output-panel">
        {loading && <div className="loading">Loading explanation…</div>}
        
        {!loading && error && (
          <div className="error">Error: {error}</div>
        )}
        
        {!loading && !error && !expl && !name && (
          <div className="hint">
            Enter hyperparameter details on the left to get an explanation.
          </div>
        )}
        
        {!loading && !error && expl && (
          <>
            <div className="header-with-badge">
              <h1>
                {name || "Parameter"}
                <span className={`impact-badge ${impactClass}`}>{impact}</span>
              </h1>
              <div className="ai-badge">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                AI Powered
              </div>
            </div>

            <div className="section">
            <h3>Definition</h3>
            <p>{expl.definition}</p>
            </div>

            <div className="section">
            <h3>Current Value Analysis</h3>
            <p>{expl.currentValueAnalysis}</p>
            </div>

            <div className="section">
              <h3>Alternative Values</h3>
              
              {/* Complexity filter tabs */}
              <div className="complexity-tabs">
                <button 
                  className={`complexity-tab ${complexityFilter === null ? 'active' : ''}`}
                  onClick={() => setComplexityFilter(null)}
                >
                  All
                </button>
                <button 
                  className={`complexity-tab basic ${complexityFilter === 'basic' ? 'active' : ''}`}
                  onClick={() => setComplexityFilter('basic')}
                >
                  Basic
                </button>
                <button 
                  className={`complexity-tab intermediate ${complexityFilter === 'intermediate' ? 'active' : ''}`}
                  onClick={() => setComplexityFilter('intermediate')}
                >
                  Intermediate
                </button>
                <button 
                  className={`complexity-tab advanced ${complexityFilter === 'advanced' ? 'active' : ''}`}
                  onClick={() => setComplexityFilter('advanced')}
                >
                  Advanced
                </button>
              </div>
              
              <div className="alternative-values">
                {Array.isArray(expl.alternativeValues) && 
                 getFilteredAlternatives().map((alt, i) => renderAlternativeCard(alt, i))}
              </div>
              
              {getFilteredAlternatives().length === 0 && (
                <p className="no-alternatives">No alternatives match the selected complexity level.</p>
              )}
            </div>

            <div className="section">
            <h3>Best Practices</h3>
            <p>{expl.bestPractices}</p>
            </div>

            <div className="section">
            <h3>Trade-offs</h3>
            <p>{expl.tradeOffs}</p>
            </div>

            <div className="tab-container">
              <div className="tab-buttons">
                <button 
                  className={`tab-button ${activeTab === 'parameter' ? 'active' : ''}`}
                  onClick={() => setActiveTab('parameter')}
                >
                  Parameter Visualization
                </button>
                <button 
                  className={`tab-button ${activeTab === 'neural' ? 'active' : ''}`}
                  onClick={() => setActiveTab('neural')}
                >
                  Neural Network
                </button>
                <button 
                  className={`tab-button ${activeTab === 'benchmark' ? 'active' : ''}`}
                  onClick={() => setActiveTab('benchmark')}
                >
                  Benchmark
                </button>
              </div>

              {activeTab === 'parameter' && (
                <div className="section">
                  <h3>Impact Visualization</h3>
                  <p>{expl.impactVisualization}</p>
                </div>
              )}

              {activeTab === 'neural' && (
                <div className="section">
                  <h3>Neural Network Visualization</h3>
                  <p>Visualization of how this parameter affects neural network architecture and training.</p>
                </div>
              )}

              {activeTab === 'benchmark' && (
                <div className="section">
                  <h3>Benchmark Results</h3>
                  <p>Performance benchmarks comparing different values of this parameter.</p>
                </div>
              )}
            </div>

            <div className="footer">
              Powered by Google Vertex AI (gemini-pro)
            </div>
          </>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<DetailApp />);