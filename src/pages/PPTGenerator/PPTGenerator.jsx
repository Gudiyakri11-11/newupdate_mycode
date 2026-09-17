import React, { useState } from "react";
import api from "../../Api";

export default function PPTGenerator() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setDownloadReady(false);
      setErrorMessage("");
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setDownloadReady(false);
    setErrorMessage("");
    const fileInput = document.getElementById("excelUpload");
    if (fileInput) fileInput.value = "";
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setDownloadReady(false);
      setErrorMessage("");
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile) {
      setErrorMessage("Please upload an Excel file first!");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await api.post(
        "/api/pptgenerator/generate",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          responseType: "arraybuffer",
        }
      );

      const blob = new Blob([response.data], { type: "application/zip" });
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `Generated_Decks_${selectedFile.name.replace(/\.[^/.]+$/, "")}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setDownloadReady(true);
    } catch (error) {
      console.error("PPT Generation Error:", error);
      let message = "Error connecting to backend server while generating PPTs.";
      if (error?.response?.data) {
        try {
          const text = new TextDecoder().decode(error.response.data);
          if (text) message = text;
        } catch {
          // ignore decode errors, fall back to default message
        }
      }
      setErrorMessage(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#030712] p-5 font-sans transition-colors duration-500">
      {showInstructions && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setShowInstructions(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-blue-50 p-4 dark:border-slate-800 dark:bg-blue-900/20">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                📖 How to Use the Idea-to-PPT Maker
              </h3>
              <button
                onClick={() => setShowInstructions(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-700 dark:text-slate-300">
                <li>Open <strong>OneCognizant</strong>.</li>
                <li>Navigate to <strong>BlueBolt Central</strong>.</li>
                <li>Go to the <strong>Idea Wall</strong> tab.</li>
                <li>Apply the filters as per your requirement.</li>
                <li>Click the <strong>Export Excel</strong> button and download the file.</li>
                <li>Upload that downloaded Excel file here (drag &amp; drop or browse).</li>
                <li>Click <strong>Generate</strong> — a ZIP file containing all the generated PPTs will download automatically.</li>
              </ol>
            </div>
            <div className="flex justify-end border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[950px] mx-auto">
        {/* BANNER HEADER */}
        <div className="bg-blue-700 dark:bg-blue-800 text-white px-5 py-10 rounded-3xl text-center shadow-[0_8px_24px_rgba(0,82,204,0.2)] mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-3xl sm:text-4xl font-bold">Bluebolt Idea-to-PPT</h1>
            <button
              type="button"
              onClick={() => setShowInstructions(true)}
              title="How to use this tool"
              className="shrink-0 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-white/20 flex items-center gap-1.5"
            >
              <span>📖</span> Instructions
            </button>
          </div>
          <p className="text-lg opacity-90 mb-6">
            Generate structured presentations directly from submitted ideas
          </p>

          <div className="inline-block bg-white/20 px-5 py-2 rounded-full text-xs tracking-wide overflow-hidden max-w-full">
            <div className="marquee-wrapper">
              <span className="marquee-text">
                Upload Excel File • Generate One PPT per Idea • Download ZIP Package • Fast • Automated • Consistent • Business Ready
              </span>
            </div>
          </div>
        </div>

        {/* WORKSPACE CARD */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
          <h3 className="mb-5 text-gray-800 dark:text-gray-100 text-lg font-semibold">
            Upload Idea Excel &amp; Generate
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-5">
            {/* Upload Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center relative flex flex-col items-center justify-center transition-colors ${
                dragActive
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40"
                  : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40"
              }`}
            >
              <input
                type="file"
                id="excelUpload"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="w-full relative">
                  <button
                    onClick={handleRemoveFile}
                    title="Remove file"
                    className="absolute -top-4 right-0 bg-red-500 text-white rounded-full w-6 h-6 text-xs font-bold"
                  >
                    ✕
                  </button>
                  <div className="text-4xl mb-2">📊</div>
                  <p className="mb-0.5 font-bold text-blue-700 dark:text-blue-400 text-sm">
                    ✓ {selectedFile.name}
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-3">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </span>
                  <label
                    htmlFor="excelUpload"
                    className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 px-3.5 py-1.5 rounded-md text-xs font-bold cursor-pointer"
                  >
                    🔄 Choose Another File
                  </label>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-2.5">📊</div>
                  <p className="mb-1.5 font-semibold text-gray-800 dark:text-gray-100">
                    Download your Excel from BlueBolt Central using the required filters and Drag it here.
                  </p>
                  <label
                    htmlFor="excelUpload"
                    className="text-blue-700 dark:text-blue-400 font-bold cursor-pointer text-sm underline"
                  >
                    Or Browse from your device
                  </label>
                </div>
              )}
            </div>

            {/* Action Box */}
            <div className="bg-gray-100 dark:bg-gray-800 p-5 rounded-xl flex flex-col justify-center items-center text-center">
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
                {selectedFile
                  ? "Ready to process ideas into decks."
                  : "Upload an Excel file to enable PPT generation."}
              </p>
              <button
                onClick={handleGenerate}
                disabled={isProcessing || !selectedFile}
                className={`w-full text-white border-0 px-5 py-3.5 rounded-lg font-bold text-sm ${
                  !selectedFile
                    ? "bg-gray-400 cursor-not-allowed"
                    : isProcessing
                    ? "bg-blue-500 cursor-not-allowed"
                    : "bg-blue-700 hover:bg-blue-800 cursor-pointer"
                }`}
              >
                {isProcessing ? "Processing Decks..." : "🚀 GENERATE PPTS"}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-6 px-5 py-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {errorMessage}
            </div>
          )}

          {downloadReady && (
            <div className="mt-6 px-5 py-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <strong className="text-emerald-800 dark:text-emerald-300 block">
                  Package Generation Complete!
                </strong>
                <span className="text-xs text-emerald-700 dark:text-emerald-400">
                  All PowerPoint decks were generated and packed into a ZIP file.
                </span>
              </div>
              <button
                onClick={handleGenerate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 px-5 py-2.5 rounded-md font-bold text-sm"
              >
                📥 Re-download ZIP Package
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
