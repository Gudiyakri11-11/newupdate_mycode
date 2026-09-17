import React from "react";
import { navigate } from "../../router/miniRouter";

export default function NotFound() {
  return (
    <div className="relative min-h-[calc(100vh-64px)] flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-[#030712] transition-colors duration-500">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full bg-blue-600/5 dark:bg-cyan-500/10 blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 text-center px-4">
        {/* The Big Glitchy 404 */}
        <div className="relative inline-block">
          <h1 className="text-[120px] sm:text-[180px] font-black leading-none tracking-tighter text-gray-900 dark:text-white opacity-10 select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <h2 className="text-5xl sm:text-7xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-cyan-400 dark:to-purple-500">
              LOST IN SPACE
            </h2>
          </div>
        </div>

        {/* Terminal Style Message */}
        <div className="mt-8 max-w-md mx-auto">
          <div className="font-mono text-sm sm:text-base text-gray-600 dark:text-cyan-400/80 mb-8 space-y-2">
            {/* <p className="opacity-70">{">"} Don't Refresh This App...</p> */}
            <p className="font-bold text-red-500 dark:text-red-400 animate-pulse">
              [!] REQUESTED_MODULE_MISSING
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="relative group px-8 py-3 rounded-xl bg-blue-600 dark:bg-cyan-600 text-white font-bold tracking-wide transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                RE-ROUTE HOME
              </span>
            </button>
            
            <button
              onClick={() => window.history.back()}
              className="px-8 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              GO BACK
            </button>
          </div>
        </div>
      </div>

      {/* Decorative HUD Lines */}
      <div className="absolute bottom-10 left-10 hidden lg:block font-mono text-[10px] text-gray-400 dark:text-cyan-900 tracking-widest pointer-events-none uppercase">
        <p>Object: 404_Page</p>
        <p>Status: Disconnected</p>
        <p>Sector: Unknown_Null</p>
      </div>
    </div>
  );
}