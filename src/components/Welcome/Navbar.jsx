import React, { useEffect, useMemo, useState } from "react";
import { navigate } from "../../router/miniRouter";
import { useApp } from "../../context/AppContext";
import image from "../../../public/data/ai-robot.png";

// Map path -> display name
const ROUTE_TITLES = {
  // Public Routes
  "/": "Home",
  "/login": "Login",
  "/register": "Registration",
  "/welcome": "Welcome",
  "/onboarding": "Onboarding X",

  // GenAI Buddy Ecosystem
  "/genaibuddy": "GenAI Buddy",
  "/genaibuddy/assessment": "Knowledge Assessment",
  "/genaibuddy/personalized": "Personalized Path",
  "/genaibuddy/progress": "My Progress",
  "/genaibuddy/expert": "Expert Connect",

  // Learning Levels
  "/genaibuddy/levels/beginner": "Beginner Track",
  "/genaibuddy/levels/intermediate": "Intermediate Track",
  "/genaibuddy/levels/expert": "Expert Track",

  // AI & Tool Stores
  "/neuroit": "NeuroIT Store",
  "/usecase": "Use Case Hub",
  "/botstore": "Bot Store",
  "/deep-scan": "DeepScan AI",
  "/gauge": "Gauge",
  "/addproject": "Add Project",
  "/learninghub": "Learning Hub",

  // Submission Modules
  "/submitNeuroIT": "Submit NeuroIT Use Case",
  "/submitUseCase": "Submit Use Case",
  "/submit": "Submit Bot Details",

  // Inventory & Management
  "/botinventory": "Bot Inventory",
  "/neuroit-inventory": "NeuroIT Inventory",
  "/usecase-inventory": "Use Case Inventory",
  "/OnboardingEmployee": "Onboarding X",

  // Admin Panels
  "/gpi": "GPI",
  "/mip": "MIP",

  "/jira": "Parent Council",

  // Panel Nomination
  "/panelnomination": "Panel Nomination",

  // Fallback
  "/notfound": "404 Not Found",
  "*": "Page Not Found",
};

function getPathname() {
  return window.location.pathname || "/";
}

// 1. Helper function to map paths to video files based on Role
function getTutorialVideoForPath(path, isAdmin) {
  // Auth / Home
  if (path === "/login" || path === "/register" || path === "/")
    return "/Videos/Register.mp4";

  // Auth / Home
  if (path === "/forgotpass") return "/Videos/forgotpswd-final.mp4";

  // Welcome
  if (path === "/welcome")
    return isAdmin ? "/Videos/Intro-final.mp4" : "/Videos/Intro-final.mp4";

  // Gauge
  if (path === "/gauge")
    return isAdmin ? "/Videos/gauge-final.mp4" : "/Videos/Gauge.mp4";

  // GPI
  if (path === "/gpi")
    return isAdmin ? "/Videos/gpi-final.mp4" : "/Videos/GPI.mp4";

  // MIP
  if (path === "/mip") return isAdmin ? "/Videos/MIP-final.mp4" : null;

  // Onboarding
  if (path === "/onboarding" || path === "/OnboardingEmployee")
    return isAdmin
      ? "/Videos/onboardng-final.mp4"
      : "/Videos/onboardingmerged.mp4";

  // Use Case
  if (path.includes("/usecase") || path === "/submitUseCase")
    return isAdmin ? "/Videos/UseCase-final.mp4" : "/Videos/UseCase.mp4";

  // Bot Store / Bot Inventory
  if (
    path.includes("/botstore") ||
    path === "/submit" ||
    path === "/botinventory"
  )
    return isAdmin ? "/Videos/bot-final.mp4" : "/Videos/botstoremerged.mp4";

  // NeuroIT Store
  if (path.includes("/neuroit") || path === "/submitNeuroIT")
    return isAdmin ? "/Videos/Neuroit-final.mp4" : "/Videos/NeuroIT.mp4";

  return null;
}

function ThemeToggle() {
  const { theme, toggleTheme } = useApp();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={[
        "group relative inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-all duration-300 outline-none",
        "bg-gray-100/80 hover:bg-gray-200 dark:bg-gray-800/60 dark:hover:bg-gray-800",
        "border border-gray-200 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-cyan-500/50",
        "focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-cyan-400/50",
      ].join(" ")}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle theme"
    >
      <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500 dark:text-cyan-400/70 group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors">
        {isDark ? "NIGHT" : "DAY"}
      </span>

      {/* Cybernetic Slider */}
      <span
        className={[
          "relative inline-flex h-4 w-9 items-center rounded-full transition-colors duration-300 shadow-inner",
          isDark
            ? "bg-cyan-900/50 border border-cyan-800"
            : "bg-gray-300 border border-gray-400",
        ].join(" ")}
        aria-hidden="true"
      >
        <span
          className={[
            "inline-block h-3 w-3 transform rounded-full transition-transform duration-300",
            isDark
              ? "translate-x-5 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
              : "translate-x-1 bg-white shadow-sm",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

export default function Navbar() {
  const {
    isAuthenticated,
    user,
    logout,
    activeRole,
    setActiveRole,
    canSwitchTo,
    roleOptions,
    isSystemHealthy,
  } = useApp();
  const [currentPath, setCurrentPath] = useState(getPathname());

  // 2. State for the Tutorial Modal
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  useEffect(() => {
    const handler = () => setCurrentPath(getPathname());
    window.addEventListener("popstate", handler);
    window.addEventListener("routechange", handler);
    return () => {
      window.removeEventListener("popstate", handler);
      window.removeEventListener("routechange", handler);
    };
  }, []);

  const activeTitle = useMemo(() => {
    if (ROUTE_TITLES[currentPath]) return ROUTE_TITLES[currentPath];
    const key = Object.keys(ROUTE_TITLES).find((p) =>
      currentPath.startsWith(p + "/"),
    );
    return ROUTE_TITLES[key] ?? "";
  }, [currentPath]);

  const showActive = activeTitle && currentPath !== "/";

  // ✅ Determine if the user holds an admin/moderator role
  const isAdmin =
    activeRole === "admin" ||
    activeRole === "moderator" ||
    activeRole === "superadmin";

  // ✅ Logic to disable Tutorial Button for specific routes
  const disableTutorialRoutes = [
    "/deep-scan",
    "/learninghub",
    "/addproject",
    "/panelnomination",
  ];
  const isTutorialDisabled = disableTutorialRoutes.some((route) =>
    currentPath.toLowerCase().includes(route),
  );

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/70 dark:bg-[#030712]/70 backdrop-blur-xl transition-colors duration-500">
        {/* The Glowing Cyber Border from CSS */}
        <div className="cyber-nav-border"></div>

        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          {/* LEFT: Brand/Home + Active App name */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate("/welcome")}
              className="group flex items-center gap-2.5 focus:outline-none"
              aria-label="Go to Home"
            >
              <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 border border-blue-200/50 dark:border-gray-700 overflow-hidden group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] dark:group-hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all">
                <img
                  src={image}
                  alt="AI Robot"
                  className="h-7 w-7 object-contain relative z-10 group-hover:scale-110 transition-transform duration-300"
                />
              </span>

              <span className="font-extrabold tracking-tight text-lg text-gray-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-cyan-200">
                GenAI Buddy
              </span>
            </button>

            {/* Breadcrumbs (Tech Style) */}
            {showActive && (
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-blue-500/40 dark:text-cyan-500/40 font-mono font-bold select-none">
                  //
                </span>
                <div
                  // onClick={() => navigate(currentPath)}
                  className="text-sm font-semibold text-gray-600 dark:text-cyan-400 hover:text-blue-600 dark:hover:text-cyan-300 hover:drop-shadow-[0_0_5px_rgba(6,182,212,0.5)] transition-all focus:outline-none"
                  // title={`Return to ${activeTitle}`}
                >
                  {activeTitle}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* 3. Tutorial Button (Updated with Disabled Logic) */}
            <button
              onClick={() => !isTutorialDisabled && setIsTutorialOpen(true)}
              disabled={isTutorialDisabled}
              className={`group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-300 border focus:outline-none focus:ring-2 
                ${
                  isTutorialDisabled
                    ? "opacity-40 cursor-not-allowed bg-gray-100 border-gray-200 text-gray-400 dark:bg-gray-800/40 dark:border-gray-800 dark:text-gray-500"
                    : "border-gray-200 bg-gray-100/50 text-gray-700 hover:bg-white hover:border-blue-300 hover:text-blue-600 dark:border-gray-700/50 dark:bg-gray-800/40 dark:text-cyan-400/90 dark:hover:bg-gray-800 dark:hover:border-cyan-500/50 dark:hover:text-cyan-300 focus:ring-blue-500/50 dark:focus:ring-cyan-400/50"
                }`}
              title={
                isTutorialDisabled
                  ? "Tutorial not available for this section"
                  : "Page Tutorial"
              }
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="hidden sm:inline tracking-wide uppercase text-xs">
                Tutorial
              </span>
            </button>

            <ThemeToggle />

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {/* User Info Glass Pill */}
                <div className="hidden md:flex items-center gap-3 rounded-full pl-3 pr-4 py-1.5 bg-gray-100/50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50 backdrop-blur-md">
                  <div className="flex items-center gap-2 text-sm">
                    {/* Monospace Employee ID */}
                    <span className="font-mono text-xs text-blue-700 dark:text-cyan-400 font-bold tracking-wider pl-4">
                      {user?.employeeId || "0x00"}
                    </span>

                    {user?.name && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">
                          |
                        </span>
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          {user.name}
                        </span>
                      </>
                    )}

                    {/* Role Switcher */}
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <div className="relative flex items-center">
                      <select
                        id="role-switcher"
                        value={activeRole}
                        onChange={(e) => {
                          const res = setActiveRole(e.target.value);
                          if (!res.ok) {
                            alert(
                              res.reason ||
                                "Insufficient privileges to assume this role.",
                            );
                          }
                        }}
                        className="cyber-select pr-4 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 cursor-pointer focus:outline-none focus:text-blue-600 dark:focus:text-cyan-300 transition-colors bg-transparent appearance-none"
                        title="Change operational role"
                      >
                        {roleOptions
                          .filter(
                            (role) => canSwitchTo(role) || role === activeRole,
                          )
                          .map((r) => (
                            <option
                              key={r}
                              value={r}
                              className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            >
                              {r}
                            </option>
                          ))}
                      </select>
                      <svg
                        className="pointer-events-none absolute right-0 h-3 w-3 text-gray-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  className="group p-2 rounded-lg bg-gray-100 hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-800/50 transition-all text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 focus:outline-none"
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                  title="Disconnect (Logout)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                className="relative overflow-hidden group inline-flex items-center gap-2 rounded-lg bg-blue-600 dark:bg-cyan-600 px-4 py-1.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 dark:hover:bg-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] focus:outline-none"
                onClick={() => {
                  // ✅ Dynamic navigation based on current route
                  const isLoginPage = window.location.pathname === "/login";
                  navigate(isLoginPage ? "/register" : "/login");
                }}
                title={
                  window.location.pathname === "/login"
                    ? "Register New Account"
                    : "Initialize Session"
                }
              >
                {/* Button Glitch/Shine effect */}
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>

                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 relative z-10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3h6a3 3 0 013 3v1"
                  />
                </svg>
                <span className="relative z-10 tracking-wide uppercase text-xs">
                  {/* ✅ Dynamic text based on current route */}
                  {window.location.pathname === "/login" ? "Register" : "Login"}
                </span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 4. The Video Modal Popup */}
      {isTutorialOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              <h3 className="font-bold text-gray-800 dark:text-cyan-400 flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                {ROUTE_TITLES[currentPath] || "Page"}{" "}
                {isAdmin ? "Admin Tutorial" : "Tutorial"}
              </h3>
              <button
                onClick={() => setIsTutorialOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus:outline-none"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Video Player */}
            <div className="aspect-video bg-black flex items-center justify-center relative">
              <video
                src={getTutorialVideoForPath(currentPath, isAdmin)}
                controls
                autoPlay
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextElementSibling.style.display = "flex";
                }}
              >
                Your browser does not support the video tag.
              </video>

              {/* Fallback UI if video file is missing */}
              <div className="hidden absolute inset-0 flex-col items-center justify-center text-gray-400 bg-gray-900">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="h-16 w-16 mb-4 text-gray-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p>Video not found for this path.</p>
                <p className="text-sm font-mono mt-2">
                  Expected: {getTutorialVideoForPath(currentPath, isAdmin)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
