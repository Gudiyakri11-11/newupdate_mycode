import React from "react";
import { useApp } from "../../context/AppContext";

const Maintenance = () => {
    const {logout} = useApp();
  // A simple hard refresh to check if the app is back online
  const handleRetry = () => {
    window.location.replace(`/?_clear=${Date.now()}`);
    logout();
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col items-center justify-center p-6 text-center z-0">
      {/* --- Ambient Background Glows (Pure CSS) --- */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-50"></div>

      {/* --- Main Content Card (Glassmorphism) --- */}
      <div className="relative z-10 bg-white/80 backdrop-blur-lg p-10 sm:p-12 rounded-[2.5rem] shadow-2xl border border-white max-w-lg w-full mx-4 transform transition-all">
        {/* --- Animated SVG Gears --- */}
        <div className="flex justify-center items-center mb-8 h-24 relative">
          {/* Large Gear (Spins Clockwise) */}
          <svg
            className="w-20 h-20 text-indigo-600 animate-[spin_6s_linear_infinite] drop-shadow-md"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
          </svg>

          {/* Small Gear (Spins Counter-Clockwise) */}
          <svg
            className="w-12 h-12 text-blue-400 absolute ml-16 mt-12 animate-[spin_4s_linear_infinite_reverse] drop-shadow-sm"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
          </svg>
        </div>

        {/* --- Text Content --- */}
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-800 to-blue-600 mb-4 tracking-tight">
          We're upgrading!
        </h1>

        <p className="text-slate-600 mb-8 leading-relaxed text-[15px]">
          Our system is currently undergoing scheduled maintenance to improve
          your experience and roll out new features. We'll be back online
          shortly!
        </p>

        {/* --- Action Button --- */}
        <button
          onClick={handleRetry}
          className="w-full px-6 py-3.5 bg-gray-900 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0 flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Check Status Again
        </button>

        {/* --- Contact Line --- */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-sm text-slate-500 font-medium">
            For any query please reach out to <br />
            <a
              href="mailto:abc@gmail.com"
              className="text-indigo-600 font-bold hover:text-indigo-800 hover:underline transition-colors mt-1 inline-block"
            >
              ManulifeVM@cognizant.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
