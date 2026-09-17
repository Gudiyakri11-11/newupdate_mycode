import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import AdminDashboard from "../../components/OnboardingX/AdminDashboard";
import OnboardingEmployee from "./OnboardingEmployee"; // ✅ Import the component here
import { useRole } from "../../../src/gurds/userRole";
import api from "../../Api";

const api_url = import.meta.env.VITE_API_URL;

export default function DeveloperSurvey() {
  const { user } = useApp();
  const { canAtLeast } = useRole();

  const [techStack, setTechStack] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(true);

  // ✅ NEW STATE: Tracks if the survey is completed to toggle the component
  const [isSurveyCompleted, setIsSurveyCompleted] = useState(false);

  const techStackOptions = [
    "Java / Spring Boot",
    ".NET / C#",
    "Node.js / Express",
    "Python / Django / FastAPI",
    "PHP / Laravel",
    "Ruby on Rails",
    "Go / Golang",
    "Frontend (React / Angular / Vue)",
    "Mobile Native (iOS / Android)",
    "Mobile Cross-Platform (Flutter / React Native)",
    "Data Engineering / Big Data",
    "Data Science / Machine Learning / AI",
    "DevOps / Cloud (AWS / Azure / GCP)",
    "QA / Test Automation",
    "Mainframe (COBOL / CICS / DB2)",
    "Salesforce",
    "ServiceNow",
    "SAP",
    "C / C++ / Embedded",
    "Other",
  ];

  const locationOptions = [
    "Kolkata",
    "Chennai",
    "Bengaluru",
    "Mumbai",
    "Mangalore",
    "Indore",
    "Gurugram",
    "Bhubaneshwar",
    "Pune",
    "Hyderabad",
    "Coimbatore",
    "Visakhapatnam",
    "Kochi",
    "Other PAN India",
  ];

  // useEffect(() => {
  //   const checkSurveyStatus = async () => {
  //     if (!user?.employeeId) return;
  //     try {
  //       const res = await fetch(`${api_url}/api/onboard/checkSurvey?employeeId=${user.employeeId}`);
  //       const data = await res.json();

  //       if (data.hasCompletedSurvey) {
  //         setIsSurveyCompleted(true); // Set to true instead of navigating
  //       }
  //     } catch (err) {
  //       console.error("Failed to check status", err);
  //     } finally {
  //       // Run this in finally block so it clears loading state even if it fails
  //       setCheckingStatus(false);
  //     }
  //   };

  //   if (!canAtLeast("admin") && !canAtLeast("moderator")) {
  //     checkSurveyStatus();
  //   } else {
  //     setCheckingStatus(false);
  //   }
  // }, [user?.employeeId, canAtLeast]);

  useEffect(() => {
    const checkSurveyStatus = async () => {
      if (!user?.employeeId) return;
      try {
        const cacheBuster = Date.now();

        // 🔒 Dispatched over the secure centralized client instance.
        // Legacy client-side user identification parameters are removed as the backend extracts them safely on the server.
        const res = await api.get(`/api/onboard/checkSurvey?_t=${cacheBuster}`);

        if (res.data && res.data.hasCompletedSurvey) {
          setIsSurveyCompleted(true);
        }
      } catch (err) {
        console.error("Failed to check survey completion status securely", err);
      } finally {
        setCheckingStatus(false);
      }
    };

    if (!canAtLeast("admin") && !canAtLeast("moderator")) {
      checkSurveyStatus();
    } else {
      setCheckingStatus(false);
    }
  }, [user?.employeeId, canAtLeast]);

  const handleSubmit = async () => {
    if (!techStack || !location) {
      setError("Please select both a Tech Stack and a Base Location.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // 🔒 Dispatched over proper semantic action paths using standard Axios methods
      const response = await api.post("/api/onboard/submitSurvey", {
        techStack,
        location,
      });

      if (response.status === 201 || response.data?.success) {
        setIsSurveyCompleted(true);
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to submit survey context data safely.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // CONDITIONAL RENDERING LOGIC
  // =========================================================

  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // Condition 1: User is Admin/Moderator -> Render AdminDashboard
  if (canAtLeast("admin") || canAtLeast("moderator")) {
    return <AdminDashboard />;
  }

  // Condition 2: Regular User has ALREADY completed the survey -> Render OnboardingEmployee
  if (isSurveyCompleted) {
    return <OnboardingEmployee />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-start justify-center pt-20 px-4 transition-colors duration-300 relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="fixed inset-0 bg-cyber-grid opacity-40 dark:opacity-100 pointer-events-none"></div>

      <div className="w-full max-w-2xl z-10">
        <div className="tech-bracket bg-white dark:bg-gray-900 rounded-2xl shadow-2xl shadow-blue-100/50 dark:shadow-none border border-gray-100 dark:border-gray-800 transition-all duration-300 overflow-hidden">
          {/* Top Accent Line */}
          <div className="cyber-nav-border relative"></div>

          <div className="p-8 md:p-12">
            <header className="mb-10">
              <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                <span className="w-2 h-8 bg-blue-600 dark:bg-cyan-500 rounded-full"></span>
                Developer Survey
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                Help us tailor your experience by providing your technical
                background.
              </p>
            </header>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-3 animate-pulse">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-bold">{error}</span>
              </div>
            )}

            <div className="space-y-8">
              {/* Tech Stack Field */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                  Preferred Tech Stack
                </label>
                <div className="relative">
                  <select
                    value={techStack}
                    onChange={(e) => setTechStack(e.target.value)}
                    className="cyber-select w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled>
                      Select Primary Stack
                    </option>
                    {techStackOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Location Field */}
              <div className="group">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                  Current Base Location
                </label>
                <div className="relative">
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="cyber-select w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled>
                      Select Region
                    </option>
                    {locationOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="group relative w-full md:w-auto px-10 py-4 bg-blue-600 dark:bg-cyan-600 hover:bg-blue-700 dark:hover:bg-cyan-500 text-white font-black rounded-xl shadow-xl shadow-blue-200 dark:shadow-none transition-all transform active:scale-95 disabled:opacity-50 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? "Transmitting..." : "Initialize Profile"}
                    {!loading && (
                      <svg
                        className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    )}
                  </span>
                  {/* Subtle shimmer effect on button */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center mt-8 text-xs text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] font-bold">
          Secure Terminal Session // Port 443
        </p>
      </div>
    </div>
  );
}
