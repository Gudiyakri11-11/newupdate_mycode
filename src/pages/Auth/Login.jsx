import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { navigate } from "../../router/miniRouter";

const API_URL = import.meta.env.VITE_API_URL;
const roleRank = { user: 1, moderator: 2, admin: 3 };

export default function Login() {
  const { isAuthenticated, loginWithBackend } = useApp();

  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  

  if (isAuthenticated) {
    navigate("/welcome");
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: "include", // This ensures the HttpOnly cookie is saved upon success
        body: JSON.stringify({ employeeId, password, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      const actualRole = data.user.role.toLowerCase();
      if (roleRank[role] > roleRank[actualRole]) {
        throw new Error("Privilege escalation detected.");
      }

      // ✅ 3. Call the context. 
      // As per our updated AppContext, THIS is the function that will now safely 
      // fetch the CSRF token behind the scenes because the user is actually logged in!
      await loginWithBackend(data.user, role);
      navigate("/welcome");
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  // Modern Input Styles
  const inputBase =
    "mt-1.5 w-full rounded-xl px-4 py-3 bg-white/50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 focus:border-indigo-500 transition-all duration-300 placeholder-gray-400 dark:placeholder-gray-600";

  const labelBase =
    "block text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300";

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden ai-bg-animated p-4">
      {/* Background Orbs */}
      <div className="ai-orb ai-orb-1"></div>
      <div className="ai-orb ai-orb-2"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-panel rounded-3xl p-8 sm:p-10 transform transition-all duration-500 hover:scale-[1.01]">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-shimmer tracking-tight">
              Welcome
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
              Authenticate to enter the workspace
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50/80 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className={labelBase}>Employee ID</label>
              <input
                className={inputBase}
                placeholder="Employee ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className={labelBase}>Password</label>
                <button
                  type="button"
                  onClick={() => navigate("/forgotpass")}
                  className="text-xs font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className={`${inputBase} pr-12`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none mt-1.5"
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              disabled={loading}
              className={`w-full relative group overflow-hidden rounded-xl p-[1px] ${
                loading ? "cursor-wait opacity-80" : ""
              }`}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-xl opacity-80 group-hover:opacity-100 transition-opacity duration-300"></span>
              <div className="relative bg-white dark:bg-gray-950 px-4 py-3 rounded-xl flex items-center justify-center gap-2 group-hover:bg-opacity-0 transition-all duration-300">
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-indigo-500 group-hover:text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors">
                      Authenticating...
                    </span>
                  </>
                ) : (
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors">
                    Login
                  </span>
                )}
              </div>
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-sm font-medium">
            <span className="text-gray-500 dark:text-gray-400">
              Don't have an account?
            </span>
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 dark:from-indigo-400 dark:to-cyan-400 transition-all cursor-pointer border-b border-indigo-500/30 hover:border-indigo-500 pb-0.5"
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}