import React, { useState } from "react";
import { navigate } from "../../router/miniRouter";

const API_BASE = import.meta.env.VITE_API_URL;

export default function Register() {
  const [employeeId, setEmployeeId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // role optional; default User
  const [role, setRole] = useState("user");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Modern Input Styles
  const inputBase =
    "mt-1.5 w-full rounded-xl px-4 py-3 bg-white/50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 focus:border-indigo-500 transition-all duration-300 placeholder-gray-400 dark:placeholder-gray-600";

  const labelBase =
    "block text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const emp = employeeId.trim();
    const nm = name.trim();
    const generatedEmail = `${emp.toLowerCase()}@cognizant.com`;

    if (!emp || !nm || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    // 2. Validate Employee ID (Must be an integer and < 8 digits)
    if (!/^\d+$/.test(emp)) {
      setError("Employee ID must contain only numbers.");
      return;
    }

    if (emp.length >= 8) {
      setError("Employee ID must be less than 8 digits long.");
      return;
    }

    // 2. Check if passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // 3. Specific Password rule validation
    const missingCriteria = [];
    if (password.length < 6) missingCriteria.push("at least 6 characters");
    if (!/[A-Z]/.test(password)) missingCriteria.push("one uppercase letter");
    if (!/[a-z]/.test(password)) missingCriteria.push("one lowercase letter");
    if (!/[^a-zA-Z0-9]/.test(password))
      missingCriteria.push("one special character");

    if (missingCriteria.length > 0) {
      setError(`Password is missing: ${missingCriteria.join(", ")}.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // CSRF header completely removed since /register is an open route
        },
        credentials: "include",
        body: JSON.stringify({
          employeeId: emp,
          name: nm,
          email: generatedEmail,
          password,
          role,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          data?.message ||
            data?.error ||
            "Registration failed. Please try again.",
        );
        return;
      }

      setSuccess("✅ Identity registered! Initializing session transfer...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError("Network error. Please make sure backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden ai-bg-animated">
      {/* Background Orbs */}
      <div className="ai-orb ai-orb-1"></div>
      <div className="ai-orb ai-orb-2"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-panel rounded-3xl p-8 sm:p-10 transform transition-all duration-500 hover:scale-[1.01]">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-extrabold text-shimmer tracking-tight">
              Register
            </h1>
          </div>

          {/* Error Message */}
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

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm animate-in fade-in slide-in-from-top-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className={labelBase}>Employee ID</label>
              <input
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className={inputBase}
                placeholder="Employee ID"
                autoComplete="off"
                required
              />
            </div>

            <div className="space-y-1">
              <label className={labelBase}>Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputBase}
                placeholder="Full Name"
                autoComplete="name"
                required
              />
            </div>

            <div className="space-y-1">
              <label className={labelBase}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create password"
                  className={`${inputBase} pr-12`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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

              {/* Dynamic Missing Criteria Rendering */}
              {password.length > 0 && (
                <ul className="text-xs mt-2 pl-1 space-y-1">
                  {password.length < 6 && (
                    <li className="text-red-500 dark:text-red-400 tracking-wide">
                      • Needs at least 6 characters
                    </li>
                  )}
                  {!/[A-Z]/.test(password) && (
                    <li className="text-red-500 dark:text-red-400 tracking-wide">
                      • Needs 1 uppercase letter
                    </li>
                  )}
                  {!/[a-z]/.test(password) && (
                    <li className="text-red-500 dark:text-red-400 tracking-wide">
                      • Needs 1 lowercase letter
                    </li>
                  )}
                  {!/[^a-zA-Z0-9]/.test(password) && (
                    <li className="text-red-500 dark:text-red-400 tracking-wide">
                      • Needs 1 special character
                    </li>
                  )}
                </ul>
              )}
            </div>

            <div className="space-y-1">
              <label className={labelBase}>Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  className={`${inputBase} pr-12`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none mt-1.5"
                >
                  {showConfirmPassword ? (
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

            <div className="pt-2">
              <button
                type="submit"
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
                        Registering...
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors">
                      Register
                    </span>
                  )}
                </div>
              </button>
            </div>
          </form>

          <div className="mt-3 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <span className="text-gray-500 dark:text-gray-400">
                Already have an Account?
              </span>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 dark:from-indigo-400 dark:to-cyan-400 transition-all cursor-pointer border-b border-indigo-500/30 hover:border-indigo-500 pb-0.5"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
