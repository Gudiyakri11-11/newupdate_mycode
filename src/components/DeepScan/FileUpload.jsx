import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, X, Zap, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function FileUpload({ onFileSelected, isAnalyzing }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      setSelectedFile(files[0]);
    }
  }, []);

  const handleFileInput = useCallback((e) => {
    const files = e.target.files;
    if (files && files[0]) {
      setSelectedFile(files[0]);
    }
  }, []);

  const handleAnalyze = () => {
    if (selectedFile) {
      onFileSelected(selectedFile);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero section */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4">
          <Zap size={14} />
          Rule-based Smart Categorization
        </div>
        <h2 className="text-4xl font-bold text-gray-900 mb-3">
          Analyze & Categorize Your
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            {" "}Incident Data
          </span>
        </h2>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Upload your Incident and Service Request data to automatically categorize items into
          Operational, Technical, Functional, and Knowledge debt categories.
        </p>
      </div>

      {/* Upload area */}
      <Card className="border-2 border-dashed hover:border-blue-300 transition-colors">
        <CardContent className="p-8">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center py-10 rounded-lg transition-colors ${
              dragActive ? "bg-blue-50" : "bg-gray-50/50"
            }`}
          >
            {!selectedFile ? (
              <>
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
                  <Upload size={28} />
                </div>
                <p className="text-lg font-medium text-gray-700 mb-1">
                  Drag & drop your file here
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Supports CSV, XLSX, XLS files (up to 50MB)
                </p>
                <label className="cursor-pointer px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Browse Files
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileInput}
                  />
                </label>
              </>
            ) : (
              <div className="w-full max-w-md">
                <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
                  <FileSpreadsheet size={24} className="text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={removeFile}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                  >
                    <X size={18} />
                  </button>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <ScanIcon />
                      Analyze & Categorize
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category previews */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        {[
          { name: "Operational", color: "bg-blue-500", desc: "Process & workflow issues" },
          { name: "Technical", color: "bg-red-500", desc: "Code & infrastructure defects" },
          { name: "Functional", color: "bg-emerald-500", desc: "Feature & logic issues" },
          { name: "Knowledge", color: "bg-amber-500", desc: "Documentation & training gaps" },
        ].map((cat) => (
          <div
            key={cat.name}
            className="flex items-center gap-3 p-4 rounded-lg bg-white border border-gray-100 shadow-sm"
          >
            <div className={`w-3 h-3 rounded-full ${cat.color}`} />
            <div>
              <p className="text-sm font-semibold text-gray-900">{cat.name}</p>
              <p className="text-xs text-gray-500">{cat.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </svg>
  );
}
