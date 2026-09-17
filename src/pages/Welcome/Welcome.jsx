import React from "react";
import WelcomeCard from "../../components/Welcome/WelcomeCard";
import { useRole } from "../../gurds/userRole";
import { useApp } from "../../context/AppContext";

export default function Welcome() {
  const { activeRole } = useRole();
  const { user } = useApp();
  // Clean, explicit role checks
  const isAdmin = activeRole === "admin";
  const isModerator = activeRole === "moderator";
  const isUser = activeRole === "user";
  const isGuides = activeRole === "guides";

  const apps = [
    {
      title: "GAUGE - GenAI Analytics for Usage, Growth & Effectiveness",
      description: "GenAI Usage Tracker",
      to: "/gauge",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
          <path d="M12 14l2-6" />
          <path d="M12 9l4.5-4.5" />
        </svg>
      ),
    },
    {
      title: "GenAI Productivity Index (GPI)",
      description: "Overall productivity and delivery speed Tracker.",
      to: "/gpi",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="20" x2="12" y2="10" />
          <line x1="18" y1="20" x2="18" y2="4" />
          <line x1="6" y1="20" x2="6" y2="16" />
        </svg>
      ),
    },
    {
      title: "Onboarding X",
      description: "Where First Steps Become Success Stories",
      to: "/onboarding",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      ),
    },
    {
      title: "Bluebolt Deck Generator",
      description: "Generate structured presentations directly from submitted ideas",
      to: "/ppt-generator",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 2L3 14h7l-1 8 10-12h-7z" />
        </svg>
      ),
    },
    {
      title: "Neuro IT for Use Cases",
      description:
        "One Agentic AI solution to get information from Neuro IT Platform",
      to: "/neuroit",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      ),
    },
    {
      title: "Bot Store",
      description: "A catalog of ready-to-use GenAI bots for business tasks",
      to: "/botstore",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
          <line x1="8" y1="16" x2="8" y2="16" />
          <line x1="16" y1="16" x2="16" y2="16" />
        </svg>
      ),
    },
    {
      title: "GenAI Use Case Repository",
      description:
        "A searchable library of approved GenAI use cases and solutions",
      to: "/usecase",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
    },
    {
      title: "MIP",
      description: "Associate Optimization Tracker",
      to: "/mip",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M3 15h18" />
          <path d="M9 3v18" />
          <path d="M15 3v18" />
        </svg>
      ),
    },
    {
      title: "Add Project",
      description: "Onboard Project into GenAI Buddy",
      to: "/addproject",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        </svg>
      ),
    },
    {
      title: "Panel Nomination",
      description: "Panel Nomination",
      to: "/panelnomination",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        </svg>
      ),
    },
    {
      title: "Parent Council",
      description: "Manage Task",
      to: "/jira",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        </svg>
      ),
    },
    {
      title: "GenAI Learning Hub",
      description: "Take the skill assessment to build your personalized plan.",
      to: "/genaibuddy",
      disabled: !isAdmin,
      badge: "In Progress",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      ),
    },
    {
      title: "Deep Scan AI",
      description: "Intelligent Debt Analysis & Smart Categorization Engine",
      to: "/deep-scan",
      disabled: !isAdmin,
      badge: "In Progress",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        </svg>
      ),
    },
    {
      title: "User Management",
      description: "Change User Role and Reset Password",
      to: "/Usermanagment",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        </svg>
      ),
    },
    {
      title: "Copilot Insights Hub",
      description: "Copilot Adoption & Usage Dashboard",
      to: "/copilot-insights",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
  ];

  const visibleApps = apps.filter((app) => {
    // 1. ADMIN OVERRIDE: Admin can see absolutely everything.
    const ishiddenformadmin = app.title === "Panel Nomination";
    if (isAdmin) {
      return !ishiddenformadmin;
    }

    // 2. These apps are restricted to Admin and Moderator ONLY
    const isModeratorPlusApp = app.title === "MIP";

    // 3. for guides role, only allow specific apps
    if (isGuides) {
      const allowedForSupport = [
        "GAUGE - GenAI Analytics for Usage, Growth & Effectiveness",
        "GenAI Productivity Index (GPI)",
        "User Management",
        "Add Project"
      ];
      return allowedForSupport.includes(app.title);
    }
    // 4. These apps are hidden from Moderator ONLY (Users & Admins CAN see them)
    const isHiddenFromModeratorApp =
      app.title === "Neuro IT for Use Cases" ||
      app.title === "Bot Store" ||
      app.title === "Add Project" ||
      app.title === "Panel Nomination" ||
      app.title === "User Management" ||
      app.title === "Parent Council" ||
      app.title === "GenAI Use Case Repository";

    const isHiddenFromUserApp =
      app.title === "Add Project" ||
      app.title === "Parent Council" ||
      app.title === "User Management" ||
      app.title === "MIP" ||
      app.title === "Panel Nomination" ||
      app.title === "Copilot Insights Hub";

    // Since Admin is already handled, if it's a Moderator+ app, it's ONLY visible to Moderators at this point
    if (isUser) {
      return !isHiddenFromUserApp;
    }

    if (isModeratorPlusApp) {
      return isModerator;
    }

    // Hide these specific apps if the user is a Moderator
    if (isHiddenFromModeratorApp) {
      return !isModerator;
    }

    // All other apps remain visible to everyone else
    return true;
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50 dark:bg-[#030712] transition-colors duration-500">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 dark:bg-purple-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 dark:bg-cyan-600/15 blur-[120px] pointer-events-none" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex flex-col items-start gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-gray-900 to-blue-800 dark:from-white dark:to-cyan-400 pb-1">
              Welcome to GenAI Buddy
            </h1>
            <p className="mt-1 max-w-2xl text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Your one-stop platform for personalized upskilling, guided use
              cases, Gauge Tracking and NeuroIt Repository integration.
            </p>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleApps.map((app) => (
            <WelcomeCard key={app.to} {...app} />
          ))}
        </div>
      </div>
    </div>
  );
}
