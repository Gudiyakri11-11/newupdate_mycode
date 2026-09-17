import React, { useState } from "react";
// import { Header } from "@/components/Header";
import { FileUpload } from "./FileUpload";
import { TextAnalyzer } from "./TextAnalyzer";
import { Dashboard } from "./Dashboard";

const API_URL = import.meta.env.VITE_API_URL;

export default function DeepScanAI() {
  const [view, setView] = useState("upload");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelected = async (file) => {
    setView("analyzing");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `Analysis failed (HTTP ${response.status})`);
      }

      const data = await response.json();
      setResult(data);
      setView("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setView("upload");
    }
  };

  const handleReset = () => {
    setView("upload");
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* <Header onReset={handleReset} hasResults={view === "results"} /> */}

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {view === "upload" && (
          <>
            <FileUpload onFileSelected={handleFileSelected} isAnalyzing={false} />
            <TextAnalyzer />
          </>
        )}

        {view === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-10 h-10 border-4 border-indigo-200 rounded-full animate-spin border-t-indigo-600"
                  style={{ animationDirection: "reverse" }}
                />
              </div>
            </div>
            <p className="mt-6 text-lg font-semibold text-gray-700">Analyzing your data...</p>
            <p className="text-sm text-gray-500 mt-1">Running rule-based categorization engine</p>
          </div>
        )}

        {view === "results" && result && <Dashboard result={result} />}
      </main>

      <footer className="border-t bg-white/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-gray-400">
            Deep Scan AI v1.0 — Intelligent Debt Analysis & Smart Categorization Engine
          </p>
        </div>
      </footer>
    </div>
  );
}