// extension/src/detail/Detail.tsx
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./detail.css";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceLine, BarChart, Bar
} from 'recharts';

// New interfaces for performance data
interface PerformanceDataPoint {
  x: string;
  y: number;
}

interface PerformanceSeries {
  name: string;
  data: PerformanceDataPoint[];
}

interface SuggestedValue {
  value: string;
  reason: string;
}

interface PerformanceData {
  parameter_name: string;
  parameter_type: 'continuous' | 'categorical';
  current_value: string;
  x_axis_label: string;
  y_axis_label: string;
  series: PerformanceSeries[];
  suggested_values: SuggestedValue[];
}

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

// Scenario interface for What-If builder
interface ScenarioConfig {
  id: string;
  name: string;
  paramName: string;
  paramValue: string;
  performanceData: PerformanceData | null;
  color: string;
}

// Interfaces for correlation matrix
interface CorrelationExplanation {
  param1: string;
  param2: string;
  effect: string;
  strength: "high" | "medium" | "low";
  direction: "positive" | "negative";
}

interface CorrelationData {
  correlation_matrix: number[][];
  parameter_names: string[];
  explanations: CorrelationExplanation[];
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
  
  // Parameter Playground state variables
  const [sliderValue, setSliderValue] = useState(value);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(false);
  
  // What-If Scenario Builder state variables
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>([]);
  const [showScenarioBuilder, setShowScenarioBuilder] = useState<boolean>(false);
  const [scenarioName, setScenarioName] = useState<string>('');
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe'];
  
  // Correlation Matrix state variables
  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null);
  const [isLoadingCorrelations, setIsLoadingCorrelations] = useState(false);

  useEffect(() => {
    if (name) {
      fetchExplanation();
      fetchPerformanceData(value); // Fetch initial performance data
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

  // Function to fetch performance data
  async function fetchPerformanceData(paramValue: string) {
    console.log("[HyperExplainer][Detail] Fetching performance data", { name, value: paramValue });
    try {
      setIsLoadingPerformance(true);
      
      const resp = await fetch(`${BACKEND}/predict_performance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          value: paramValue,
          additional_params: { framework } 
        }),
      });
      
      if (!resp.ok) {
        throw new Error(`Server responded ${resp.status}: ${resp.statusText}`);
      }
      
      const data = await resp.json() as PerformanceData;
      setPerformanceData(data);
    } catch (e: any) {
      console.error("[HyperExplainer][Detail] fetch performance data failed:", e);
    } finally {
      setIsLoadingPerformance(false);
    }
  }

  // Function to fetch correlation data
  const fetchCorrelationData = async () => {
    console.log("[HyperExplainer][Detail] Fetching correlation data");
    try {
      setIsLoadingCorrelations(true);
      
      // Get detected parameters from the popup storage or use a default set
      let allParams: Record<string, string> = {};
      
      try {
        // Try to get parameters from chrome storage
        chrome.storage.local.get("hyperparams", (result) => {
          if (result.hyperparams) {
            allParams = result.hyperparams;
          } else {
            // Fallback to some default parameters
            allParams = {
              [name]: value,
              "learning_rate": "0.001",
              "batch_size": "32",
              "epochs": "10",
              "dropout_rate": "0.2"
            };
          }
          
          // Continue with the fetch once we have parameters
          fetchCorrelationDataWithParams(allParams);
        });
      } catch (e) {
        // If storage access fails, use fallback parameters
        allParams = {
          [name]: value,
          "learning_rate": "0.001",
          "batch_size": "32",
          "epochs": "10",
          "dropout_rate": "0.2"
        };
        fetchCorrelationDataWithParams(allParams);
      }
      
    } catch (e: any) {
      console.error("[HyperExplainer][Detail] fetch correlation data failed:", e);
    }
  };

  const fetchCorrelationDataWithParams = async (params: Record<string, string>) => {
    try {
      const resp = await fetch(`${BACKEND}/parameter_correlations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parameters: params }),
      });
      
      if (!resp.ok) {
        throw new Error(`Server responded ${resp.status}: ${resp.statusText}`);
      }
      
      const data = await resp.json() as CorrelationData;
      setCorrelationData(data);
    } catch (e: any) {
      console.error("[HyperExplainer][Detail] fetch correlation data failed:", e);
    } finally {
      setIsLoadingCorrelations(false);
    }
  };

  // Handle slider changes
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = performanceData?.parameter_type === 'continuous' 
      ? parseFloat(event.target.value) 
      : event.target.value;
    setSliderValue(String(newValue));
  };

  // Handle slider release - fetch new data
  const handleSliderRelease = () => {
    fetchPerformanceData(sliderValue);
  };

  // Save current configuration as a scenario
  const saveScenario = () => {
    if (!performanceData) return;
    
    const newScenario: ScenarioConfig = {
      id: `scenario-${Date.now()}`,
      name: scenarioName || `${name}=${sliderValue}`,
      paramName: name,
      paramValue: sliderValue,
      performanceData: performanceData,
      color: COLORS[scenarios.length % COLORS.length]
    };
    
    setScenarios([...scenarios, newScenario]);
    setScenarioName('');
    setShowScenarioBuilder(true);
  };

  // Delete a scenario
  const deleteScenario = (id: string) => {
    setScenarios(scenarios.filter(s => s.id !== id));
  };

  // Format data for comparison chart
  const prepareComparisonData = () => {
    if (scenarios.length === 0) return [];
    
    // Create data points for each metric we want to compare
    return [
      {
        name: 'Training Accuracy',
        ...scenarios.reduce((acc, scenario) => {
          if (scenario.performanceData?.series && scenario.performanceData.series.length > 0) {
            // Find the data point closest to the current value for training accuracy
            const trainingData = scenario.performanceData.series[0].data;
            const currentIndex = trainingData.findIndex(d => d.x === scenario.paramValue) || 
                               Math.floor(trainingData.length / 2);
            acc[scenario.name] = trainingData[currentIndex]?.y || 0;
          }
          return acc;
        }, {} as Record<string, number>)
      },
      {
        name: 'Validation Accuracy',
        ...scenarios.reduce((acc, scenario) => {
          if (scenario.performanceData?.series && scenario.performanceData.series.length > 1) {
            // Find the data point closest to the current value for validation accuracy
            const validationData = scenario.performanceData.series[1].data;
            const currentIndex = validationData.findIndex(d => d.x === scenario.paramValue) || 
                               Math.floor(validationData.length / 2);
            acc[scenario.name] = validationData[currentIndex]?.y || 0;
          }
          return acc;
        }, {} as Record<string, number>)
      }
    ];
  };

  // Prepare data for chart
  const prepareChartData = () => {
    if (!performanceData) return [];
    
    // Convert series data format to recharts format
    const dataPoints = performanceData.series[0].data.map((point, index) => {
      const result: any = { 
        // For continuous parameters, convert x value to number
        x: performanceData.parameter_type === 'continuous' ? parseFloat(point.x) : point.x 
      };
      
      // Add each series y value to the data point
      performanceData.series.forEach(series => {
        result[series.name] = series.data[index].y;
      });
      
      return result;
    });
    
    return dataPoints;
  };

  const handleGetExplanation = () => {
    if (name) {
      fetchExplanation();
      fetchPerformanceData(value); // Fetch performance data when getting new explanation
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

  // Helper function to render correlation matrix cells
  const renderCorrelationCell = (value: number, i: number, j: number, names: string[]) => {
    const colorValue = value === 1 ? '#f0f0f0' : 
                      value > 0 ? `rgba(0, 123, 255, ${Math.min(Math.abs(value), 1)})` : 
                      `rgba(255, 0, 0, ${Math.min(Math.abs(value), 1)})`;
    
    const textColor = Math.abs(value) > 0.5 ? 'white' : 'black';
    
    return (
      <div 
        key={`${i}-${j}`} 
        className="matrix-cell" 
        style={{ 
          backgroundColor: colorValue,
          color: textColor
        }}
        title={`${names[i]} × ${names[j]}: ${value.toFixed(2)}`}
      >
        {value.toFixed(2)}
      </div>
    );
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
                  className={`tab-button ${activeTab === 'correlations' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('correlations');
                    if (!correlationData) {
                      fetchCorrelationData();
                    }
                  }}
                >
                  Parameter Correlations
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
                  <h3>Parameter Playground</h3>
                  
                  {performanceData && performanceData.parameter_type === 'continuous' && (
                    <div className="slider-container">
                      <label className="slider-label">Adjust {name} value:</label>
                      <input
                        type="range"
                        min={performanceData.series[0].data[0].x}
                        max={performanceData.series[0].data[performanceData.series[0].data.length - 1].x}
                        step={(parseFloat(performanceData.series[0].data[performanceData.series[0].data.length - 1].x) - 
                              parseFloat(performanceData.series[0].data[0].x)) / 100}
                        value={sliderValue}
                        onChange={handleSliderChange}
                        onMouseUp={handleSliderRelease}
                        onTouchEnd={handleSliderRelease}
                        className="parameter-slider"
                      />
                      <div className="slider-value">{sliderValue}</div>
                    </div>
                  )}
                  
                  {performanceData && performanceData.parameter_type === 'categorical' && (
                    <div className="categorical-selector">
                      <label className="selector-label">Select {name} value:</label>
                      <select 
                        value={sliderValue} 
                        onChange={(e) => {
                          setSliderValue(e.target.value);
                          fetchPerformanceData(e.target.value);
                        }}
                        className="parameter-selector"
                      >
                        {performanceData.series[0].data.map(point => (
                          <option key={point.x} value={point.x}>{point.x}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {isLoadingPerformance && <div className="loading">Loading performance data...</div>}
                  
                  {performanceData && !isLoadingPerformance && (
                    <div className="performance-chart">
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                          data={prepareChartData()}
                          margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="x" 
                            label={{ value: performanceData.x_axis_label, position: 'bottom', offset: 0 }}
                            scale={performanceData.parameter_type === 'continuous' ? 'linear' : 'band'}
                            tickFormatter={(value) => typeof value === 'number' ? value.toFixed(0) : value}
                            ticks={performanceData?.parameter_type === 'continuous' ? 
                                [5, 10, 15, 20, 25] : undefined}
                          />
                          <YAxis 
                            label={{ value: performanceData.y_axis_label, angle: -90, position: 'insideLeft' }}
                            domain={[0, 1]}
                          />
                          <Tooltip />
                          <Legend />
                          {performanceData.series.map((series, index) => (
                            <Line
                              key={series.name}
                              type="monotone"
                              dataKey={series.name}
                              stroke={index === 0 ? "#82ca9d" : "#8884d8"}
                              activeDot={{ r: 8 }}
                              strokeWidth={2}
                            />
                          ))}
                          <ReferenceLine
                            x={sliderValue}
                            stroke="red"
                            strokeDasharray="3 3"
                            label={{ value: "Current", position: 'top' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  
                  {performanceData && performanceData.suggested_values && (
                    <div className="suggested-values">
                      <h4>Suggested Values</h4>
                      <div className="suggestion-cards">
                        {performanceData.suggested_values.map((suggestion, index) => (
                          <div 
                            key={index} 
                            className="suggestion-card"
                            onClick={() => {
                              setSliderValue(suggestion.value);
                              fetchPerformanceData(suggestion.value);
                            }}
                          >
                            <div className="suggestion-value">{suggestion.value}</div>
                            <p className="suggestion-reason">{suggestion.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* What-If Scenario Builder */}
                  <div className="section-header-with-controls">
                    <h3>What-If Scenario Builder</h3>
                    <button 
                      className={`toggle-button ${showScenarioBuilder ? 'active' : ''}`}
                      onClick={() => setShowScenarioBuilder(!showScenarioBuilder)}
                    >
                      {showScenarioBuilder ? 'Hide' : 'Show'} Scenarios
                    </button>
                  </div>
                  
                  {performanceData && (
                    <div className="scenario-controls">
                      <div className="save-scenario-form">
                        <input
                          type="text"
                          placeholder={`${name}=${sliderValue}`}
                          value={scenarioName}
                          onChange={(e) => setScenarioName(e.target.value)}
                          className="scenario-name-input"
                        />
                        <button className="save-scenario-button" onClick={saveScenario}>
                          Save Current Configuration
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {showScenarioBuilder && (
                    <>
                      {scenarios.length === 0 ? (
                        <p className="no-scenarios">No scenarios saved yet. Adjust parameters and save configurations to compare them.</p>
                      ) : (
                        <>
                          <div className="scenarios-list">
                            {scenarios.map(scenario => (
                              <div key={scenario.id} className="scenario-card" style={{borderLeftColor: scenario.color}}>
                                <div className="scenario-header">
                                  <span className="scenario-name">{scenario.name}</span>
                                  <button 
                                    className="delete-scenario-button"
                                    onClick={() => deleteScenario(scenario.id)}
                                  >
                                    ✕
                                  </button>
                                </div>
                                <div className="scenario-details">
                                  <span className="scenario-param">{scenario.paramName}: {scenario.paramValue}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="comparison-chart">
                            <h4>Performance Comparison</h4>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart
                                data={prepareComparisonData()}
                                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis domain={[0, 1]} />
                                <Tooltip />
                                <Legend />
                                {scenarios.map(scenario => (
                                  <Bar 
                                    key={scenario.id}
                                    dataKey={scenario.name} 
                                    fill={scenario.color}
                                  />
                                ))}
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </>
                      )}
                    </>
                  )}
                  
                  <h3>Impact Visualization</h3>
                  <p>{expl.impactVisualization}</p>
                </div>
              )}

              {activeTab === 'correlations' && (
                <div className="section">
                  <h3>Hyperparameter Correlation Matrix</h3>
                  <p className="matrix-description">
                    This heatmap shows how different hyperparameters interact with each other. 
                    Blue cells indicate positive correlations (parameters that work well together),
                    while red cells indicate negative correlations (parameters that require balancing).
                  </p>
                  
                  {isLoadingCorrelations && <div className="loading">Loading correlation data...</div>}
                  
                  {correlationData && !isLoadingCorrelations && (
                    <>
                      <div className="correlation-matrix">
                        <div className="matrix-container">
                          <div className="matrix-header">
                            <div className="matrix-corner"></div>
                            {correlationData.parameter_names.map((name, i) => (
                              <div key={i} className="matrix-column-header">{name}</div>
                            ))}
                          </div>
                          
                          {correlationData.correlation_matrix.map((row, i) => (
                            <div key={i} className="matrix-row">
                              <div className="matrix-row-header">{correlationData.parameter_names[i]}</div>
                              {row.map((value, j) => renderCorrelationCell(value, i, j, correlationData.parameter_names))}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="correlation-explanations">
                        <h4>Key Interactions</h4>
                        {correlationData.explanations.length === 0 ? (
                          <p>No significant parameter interactions detected.</p>
                        ) : (
                          <div className="explanation-cards">
                            {correlationData.explanations.map((explanation, index) => (
                              <div 
                                key={index} 
                                className={`explanation-card ${explanation.direction} ${explanation.strength}`}
                              >
                                <div className="explanation-header">
                                  <span className="param1">{explanation.param1}</span>
                                  <span className="direction-arrow">
                                    {explanation.direction === 'positive' ? '↗' : '↘'}
                                  </span>
                                  <span className="param2">{explanation.param2}</span>
                                </div>
                                <div className="explanation-strength">
                                  {explanation.strength} {explanation.direction} correlation
                                </div>
                                <p className="explanation-effect">{explanation.effect}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
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