import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  // =========================================================
  // LOAD HISTORY FROM LOCAL STORAGE
  // =========================================================

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("satquery-history");

      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Could not load analysis history:", error);
    }
  }, []);

  // =========================================================
  // SAVE HISTORY TO LOCAL STORAGE
  // =========================================================

  useEffect(() => {
    try {
      localStorage.setItem("satquery-history", JSON.stringify(history));
    } catch (error) {
      console.error("Could not save analysis history:", error);
    }
  }, [history]);

  // =========================================================
  // FILE UPLOAD
  // =========================================================

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    // Check image type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/tiff",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload JPG, PNG, WEBP or TIFF image.");
      setSelectedFile(null);
      setPreview(null);
      return;
    }

    // Optional size limit: 20 MB
    const maxSize = 20 * 1024 * 1024;

    if (file.size > maxSize) {
      setError("Image size must be less than 20 MB.");
      setSelectedFile(null);
      setPreview(null);
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));

    // Clear previous result
    setAnswer("");
    setError("");
  };

  // =========================================================
  // AI ANALYSIS
  // =========================================================

  const handleAnalyze = async () => {
    // -------------------------------------------------------
    // Check image
    // -------------------------------------------------------

    if (!selectedFile) {
      setError("Please upload a satellite image first.");
      setAnswer("");
      return;
    }

    // -------------------------------------------------------
    // Check question
    // -------------------------------------------------------

    if (!query.trim()) {
      setError("Please enter a question.");
      setAnswer("");
      return;
    }

    // -------------------------------------------------------
    // Start loading
    // -------------------------------------------------------

    setLoading(true);
    setAnswer("");
    setError("");

    try {
      // -----------------------------------------------------
      // Create FormData
      // -----------------------------------------------------

      const formData = new FormData();

      formData.append("image", selectedFile);
      formData.append("query", query.trim());

      // -----------------------------------------------------
      // Send request to FastAPI
      // -----------------------------------------------------

      const response = await fetch("http://127.0.0.1:8000/api/analyze", {
        method: "POST",
        body: formData,
      });

      // -----------------------------------------------------
      // Read JSON response
      // -----------------------------------------------------

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          `Backend returned an invalid response (${response.status}).`,
        );
      }

      console.log("Backend response:", data);

      // -----------------------------------------------------
      // HTTP error
      // -----------------------------------------------------

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.error ||
            `Backend request failed (${response.status})`,
        );
      }

      // -----------------------------------------------------
      // Successful AI response
      // -----------------------------------------------------

      if (data?.success === true && data?.answer) {
        const newAnalysis = {
          id: Date.now(),
          filename: data.filename || selectedFile.name,
          query: data.query || query.trim(),
          answer: data.answer,
          createdAt: new Date().toLocaleString(),
        };

        // Show answer
        setAnswer(data.answer);

        // Make sure old error disappears
        setError("");

        // Add to history
        setHistory((previousHistory) => [newAnalysis, ...previousHistory]);

        return;
      }

      // -----------------------------------------------------
      // Backend returned success:false
      // -----------------------------------------------------

      setAnswer("");

      setError(data?.error || "AI analysis failed. Please try again.");
    } catch (err) {
      console.error("Analysis error:", err);

      setAnswer("");

      setError(err?.message || "Could not connect to SatQuery AI backend.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // CLEAR HISTORY
  // =========================================================
  const handleClearHistory = () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all analysis history?",
    );

    if (!confirmed) {
      return;
    }

    setHistory([]);

    localStorage.removeItem("satquery-history");
  };
  // =========================================================
  // DELETE ONE HISTORY ITEM
  // =========================================================

  const handleDeleteHistory = (id) => {
    setHistory((previousHistory) =>
      previousHistory.filter((item) => item.id !== id),
    );
  };

  // =========================================================
  // COPY AI ANSWER
  // =========================================================

  const handleCopyAnswer = async (answer) => {
    try {
      await navigator.clipboard.writeText(answer);

      alert("AI answer copied successfully!");
    } catch (error) {
      console.error("Copy failed:", error);

      alert("Could not copy the AI answer.");
    }
  };

  // =========================================================
  // DOWNLOAD AI REPORT
  // =========================================================

  const handleDownloadReport = (item) => {
    const report = `
SatQuery AI
========================================

Image:
${item.filename}

Date:
${item.createdAt}

Question:
${item.query}

AI Analysis:
${item.answer}

========================================
Generated by SatQuery AI
`;

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `SatQuery-${item.filename
      .replace(/\.[^/.]+$/, "")
      .replace(/\s+/g, "-")}.txt`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="app">
      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">🛰️</span>

          <span>
            SatQuery <strong>AI</strong>
          </span>
        </div>

        <div className="nav-links">
          <a href="#analyze">Analyze</a>

          <a href="#features">Features</a>

          <a href="#about">About</a>
        </div>
      </nav>

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main>
        {/* ===================================================
            HERO
        ==================================================== */}

        <section className="hero">
          <div className="badge">✨ AI-Powered Remote Sensing</div>

          <h1>
            Understand Earth
            <br />
            <span>Through Natural Language</span>
          </h1>

          <p className="hero-description">
            Upload a satellite image, ask a question, and let SatQuery AI
            analyze the Earth from your data.
          </p>
        </section>

        {/* ===================================================
            ANALYSIS SECTION
        ==================================================== */}

        <section className="analysis-container" id="analyze">
          {/* =================================================
              UPLOAD CARD
          ================================================== */}

          <div className="upload-card">
            <div className="section-title">
              <span>01</span>

              <div>
                <h2>Upload Satellite Image</h2>

                <p>PNG, JPG, WEBP or GeoTIFF supported</p>
              </div>
            </div>

            {/* Upload Area */}

            <label className="upload-area">
              {preview ? (
                <img
                  src={preview}
                  alt="Satellite preview"
                  className="image-preview"
                />
              ) : (
                <>
                  <div className="upload-icon">☁️</div>

                  <h3>Drop your satellite image here</h3>

                  <p>or click to browse from your computer</p>

                  <span className="browse-button">Browse Image</span>
                </>
              )}

              <input
                type="file"
                accept="
                  image/png,
                  image/jpeg,
                  image/jpg,
                  image/webp,
                  image/tiff
                "
                onChange={handleFileChange}
                hidden
              />
            </label>

            {/* File Information */}

            {selectedFile && (
              <div className="file-info">
                <span>📄</span>

                <div>
                  <strong>{selectedFile.name}</strong>

                  <small>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </small>
                </div>
              </div>
            )}
          </div>

          {/* =================================================
              QUERY CARD
          ================================================== */}

          <div className="query-card">
            <div className="section-title">
              <span>02</span>

              <div>
                <h2>Ask SatQuery</h2>

                <p>Ask anything about your satellite image</p>
              </div>
            </div>

            {/* Query Box */}

            <div className="query-box">
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Example: What land cover types are visible in this image?"
                disabled={loading}
              />

              <div className="query-footer">
                <span>
                  💡 Try asking about forests, water, buildings or roads.
                </span>

                <button onClick={handleAnalyze} disabled={loading}>
                  {loading ? "🔄 Analyzing..." : "✨ Analyze with AI"}
                </button>
              </div>
            </div>

            {/* =================================================
                ERROR MESSAGE
            ================================================== */}

            {error && <div className="analysis-error">⚠️ {error}</div>}

            {/* =================================================
                LOADING
            ================================================== */}

            {loading && (
              <div className="analysis-loading">
                <div className="loading-icon">🧠</div>

                <div>
                  <strong>SatQuery AI is analyzing...</strong>

                  <p>Processing your satellite image.</p>
                </div>
              </div>
            )}

            {/* =================================================
                AI RESULT
            ================================================== */}

            {answer && !loading && (
              <div className="analysis-result">
                <div className="result-header">
                  <span>🧠</span>

                  <h2>AI Analysis</h2>
                </div>

                <div className="result-content">
                  <ReactMarkdown>{answer}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =====================================================
            ANALYSIS HISTORY
        ====================================================== */}

        {history.length > 0 && (
          <section className="history-section">
            <div className="history-title">
              <div className="history-heading">
                <span className="history-number">03</span>

                <div>
                  <h2>Analysis History</h2>

                  <p>Your recent satellite image analyses</p>
                </div>
              </div>

              <button className="clear-history" onClick={handleClearHistory}>
                Clear History
              </button>
            </div>

            <div className="history-list">
              {history.map((item) => (
                <div className="history-card" key={item.id}>
                  <div className="history-card-header">
                    <div className="history-file">
                      <span>🛰️</span>

                      <strong>{item.filename}</strong>
                    </div>

                    <span className="history-date">{item.createdAt}</span>
                  </div>

                  <div className="history-question">
                    <strong>Question</strong>

                    <p>{item.query}</p>
                  </div>
                  <div className="history-actions">
                    <button onClick={() => handleCopyAnswer(item.answer)}>
                      📋 Copy
                    </button>

                    <button onClick={() => handleDownloadReport(item)}>
                      📥 Download
                    </button>

                    <button onClick={() => handleDeleteHistory(item.id)}>
                      🗑️ Delete
                    </button>
                  </div>

                  <div className="history-answer">
                    <strong>🧠 AI Analysis</strong>

                    <div className="history-answer-content">
                      <ReactMarkdown>{item.answer}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* =====================================================
            FEATURES
        ====================================================== */}

        <section className="features" id="features">
          <div className="feature-card">
            <div className="feature-icon">🧠</div>

            <h3>Vision Intelligence</h3>

            <p>
              AI models analyze satellite imagery and extract meaningful visual
              information.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💬</div>

            <h3>Natural Language Queries</h3>

            <p>
              Ask questions about satellite images using simple natural
              language.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🌍</div>

            <h3>Remote Sensing Analysis</h3>

            <p>
              Detect and understand forests, water bodies, urban areas and other
              land features.
            </p>
          </div>
        </section>
      </main>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer id="about">
        <div className="footer-logo">🛰️ SatQuery AI</div>

        <p>Interactive Vision-Language Assistant for Remote Sensing</p>

        <span>© 2026 SatQuery AI</span>
      </footer>
    </div>
  );
}

export default App;
