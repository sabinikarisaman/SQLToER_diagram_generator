// App.js - Clean Professional Version with Console Logging
import React, { useState, useRef } from "react";
import EnglishInput from "./components/EnglishInput";
import ERCanvas from "./components/ERCanvas";
import Examples from "./components/Examples";
import { parseERWithGemini } from "./utils/parser";
import { exportToSvg, exportToPng } from "./utils/exporter";
import "./App.css";

export default function App() {
  const [diagram, setDiagram] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [textValue, setTextValue] = useState("");
  
  const svgRef = useRef(null);

  async function handleInput(text) {
    console.log("=== ER DIAGRAM GENERATION PIPELINE STARTED ===");
    console.log("STEP 1: User provided natural language description");
    console.log("User Input:", text);
    
    setLoading(true);
    setError("");
    
    try {
      console.log("STEP 2: Sending to Gemini API for text-to-JSON conversion");
      console.log("Note: Gemini only converts text to structured data, no visual capabilities");
      
      const data = await parseERWithGemini(text);
      
      console.log("STEP 3: Gemini API returned basic JSON structure");
      console.log("Gemini Output Summary:", {
        entities: data.entities?.length || 0,
        attributes: data.attributes?.length || 0, 
        relationships: data.relationships?.length || 0,
        cardinalities: data.cardinalities?.length || 0
      });
      console.log("Raw JSON from Gemini:", JSON.stringify(data, null, 2));
      
      console.log("STEP 4: My rendering engine taking over - processing JSON into visual diagram");
      console.log("My Code: Converting data structure into complete visual representation");
      
      setDiagram(data);
      
    } catch (e) {
      console.error("Error in Gemini API communication:", e.toString());
      setError(e.toString());
      setDiagram(null);
    } finally {
      setLoading(false);
      console.log("=== MY REACT COMPONENTS NOW HANDLING VISUAL RENDERING ===");
    }
  }

  function resetDiagramLayout() {
    console.log("User action: Layout reset requested - My algorithm recalculating positions");
    if (diagram) {
      window.dispatchEvent(new CustomEvent('resetDiagram', { detail: diagram }));
    }
  }

  const handleExportSvg = () => {
    console.log("Export functionality: My SVG export system processing diagram");
    exportToSvg(svgRef, 'er-diagram');
  };

  const handleExportPng = () => {
    console.log("Export functionality: My PNG conversion system processing diagram");
    exportToPng(svgRef, 'er-diagram');
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">⚡</div>
            <h1>NL to ER Diagram Generator</h1>
          </div>
          <div className="header-actions">
            {diagram && (
              <>
                <button 
                  className="btn btn-secondary"
                  onClick={handleExportSvg}
                >
                  Export SVG
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={handleExportPng}
                >
                  Export PNG
                </button>
                <button 
                  className="btn btn-outline"
                  onClick={resetDiagramLayout}
                >
                  Reset Layout
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        {/* Sidebar - Input Section */}
        <aside className="sidebar">
          <div className="input-section">
            <h2>Describe Your Schema</h2>
            <p className="subtitle">Use plain English to describe your database tables and relationships</p>
            
            <EnglishInput 
              value={textValue}
              onChange={setTextValue}
              onSubmit={handleInput} 
              loading={loading} 
            />
            
            <Examples onSelect={setTextValue} disabled={loading} />
            
            {error && (
              <div className="error-message">
                <span>⚠️</span>
                {error}
              </div>
            )}
          </div>
        </aside>

        {/* Diagram Area */}
        <section className="diagram-area">
          <div className="diagram-container">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Generating ER diagram...</p>
              </div>
            ) : diagram ? (
              <ERCanvas er={diagram} svgRef={svgRef} />
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>Your ER Diagram Will Appear Here</h3>
                <p>Enter a description or select an example to generate your first diagram</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}