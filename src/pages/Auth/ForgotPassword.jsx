import React, { useState } from "react";
import { navigate } from "../../router/miniRouter";

const API_BASE = import.meta.env.VITE_API_URL;

export default function ForgotPassword() {
  const [employeeId, setEmployeeId] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showTempPassword, setShowTempPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const inputBase =
    "mt-1.5 w-full rounded-xl px-4 py-3 bg-white/50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 focus:border-indigo-500 transition-all duration-300 placeholder-gray-400 dark:placeholder-gray-600";
  const labelBase =
    "block text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!employeeId || !tempPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    const missingCriteria = [];
    if (newPassword.length < 6) missingCriteria.push("at least 6 characters");
    if (!/[A-Z]/.test(newPassword))
      missingCriteria.push("one uppercase letter");
    if (!/[a-z]/.test(newPassword))
      missingCriteria.push("one lowercase letter");
    if (!/[^a-zA-Z0-9]/.test(newPassword))
      missingCriteria.push("one special character");

    if (missingCriteria.length > 0) {
      setError(`New Password is missing: ${missingCriteria.join(", ")}.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // CSRF header completely removed since /reset-password is an open route
        },
        credentials: "include",
        body: JSON.stringify({
          employeeId: employeeId.trim(),
          tempPassword,
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          data?.message ||
            data?.error ||
            "Reset failed. Please check your temporary password.",
        );
        return;
      }

      setSuccess("✅ Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError("Network error. Please make sure backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden ai-bg-animated p-4">
      <div className="ai-orb ai-orb-1"></div>
      <div className="ai-orb ai-orb-2"></div>

      <div className="relative z-10 w-full max-w-md my-8">
        <div className="glass-panel rounded-3xl p-8 sm:p-10 transform transition-all duration-500 hover:scale-[1.01]">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-shimmer tracking-tight">
              Reset Password
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
              To reset your password, email ManulifeVM@cognizant.com with your
              Employee ID. Only do this if you already created an account on the
              GenAI Buddy Portal and forgot your password. Your Cognizant login
              will not work here—you must create a separate account.
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
                required
              />
            </div>

            <div className="space-y-1">
              <label className={labelBase}>Temporary Password</label>
              <div className="relative">
                <input
                  type={showTempPassword ? "text" : "password"}
                  className={`${inputBase} pr-12`}
                  placeholder="Provided by Admin"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowTempPassword(!showTempPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none mt-1.5"
                >
                  {showTempPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelBase}>New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Create new password"
                  className={`${inputBase} pr-12`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none mt-1.5"
                >
                  {showNewPassword ? "Hide" : "Show"}
                </button>
              </div>

              {/* Dynamic Error Rendering */}
              {newPassword.length > 0 && (
                <ul className="text-xs mt-2 pl-1 space-y-1">
                  {newPassword.length < 6 && (
                    <li className="text-red-500 dark:text-red-400 tracking-wide">
                      • Needs at least 6 characters
                    </li>
                  )}
                  {!/[A-Z]/.test(newPassword) && (
                    <li className="text-red-500 dark:text-red-400 tracking-wide">
                      • Needs 1 uppercase letter
                    </li>
                  )}
                  {!/[a-z]/.test(newPassword) && (
                    <li className="text-red-500 dark:text-red-400 tracking-wide">
                      • Needs 1 lowercase letter
                    </li>
                  )}
                  {!/[^a-zA-Z0-9]/.test(newPassword) && (
                    <li className="text-red-500 dark:text-red-400 tracking-wide">
                      • Needs 1 special character
                    </li>
                  )}
                </ul>
              )}
            </div>

            <div className="space-y-1">
              <label className={labelBase}>Confirm New Password</label>
              <input
                type="password"
                placeholder="Confirm password"
                className={inputBase}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full relative group overflow-hidden rounded-xl p-[1px] ${loading ? "cursor-wait opacity-80" : ""}`}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-xl opacity-80 group-hover:opacity-100 transition-opacity duration-300"></span>
                <div className="relative bg-white dark:bg-gray-950 px-4 py-3 rounded-xl flex items-center justify-center gap-2 group-hover:bg-opacity-0 transition-all duration-300">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors">
                    {loading ? "Resetting..." : "Set New Password"}
                  </span>
                </div>
              </button>
            </div>
          </form>

          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800/60 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700/50 transition-all focus:outline-none"
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => navigate("/register")}
              className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800/60 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700/50 transition-all focus:outline-none"
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
