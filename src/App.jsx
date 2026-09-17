import React, { useEffect, useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import Navbar from "./components/Welcome/Navbar";
import Router from "./router/miniRouter";
import ChatbotWidget from "./components/ChatBot/ChatbotWidget";
import { sendToGemini } from "./lib/geminiClient";
import { textMuted, surface } from "./styles";
import "./index.css";
import Maintenance from "./pages/Maintenance/Maintenance";

// ✅ Current path from History API
function getPathname() {
  return window.location.pathname || "/";
}

// Optional: force a default start route
const DEFAULT_START_ROUTE = "/login";
const FORCE_DEFAULT_ON_LOAD = false;

// 1. ✅ CREATE THE INNER COMPONENT THAT CONSUMES THE CONTEXT
function AppContent() {
  const { isSystemHealthy } = useApp();
  const [path, setPath] = useState(getPathname());

  useEffect(() => {
    const onPopState = () => setPath(getPathname());
    const onRouteChange = () => setPath(getPathname());

    window.addEventListener("popstate", onPopState);
    window.addEventListener("routechange", onRouteChange);

    if (FORCE_DEFAULT_ON_LOAD && window.location.pathname === "/") {
      const target = DEFAULT_START_ROUTE.startsWith("/")
        ? DEFAULT_START_ROUTE
        : `/${DEFAULT_START_ROUTE}`;

      if (window.location.pathname !== target) {
        window.history.replaceState({ path: target }, "", target);
        setPath(target);
      }
    }

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("routechange", onRouteChange);
    };
  }, []);

  // ✅ If heartbeat fails, immediately intercept the UI and show Maintenance
  // if (isSystemHealthy === false) {
  //   return <Maintenance />;
  // }

  // ✅ Hide chatbot on Assessment page
  const hideChatbot = path === "/assessment";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* ✅ Navbar */}
      <Navbar />

      {/* ✅ Main router-controlled content */}
      <main className="flex-1">
        <Router />
      </main>

      {/* ✅ Chatbot (hidden on /assessment) */}
      {!hideChatbot && (
        <ChatbotWidget
          title="AI Buddy"
          sendMessage={(message, history) => sendToGemini(message, history)}
        />
      )}

      {/* ✅ Footer */}
      <footer
        className={[
          "border-t",
          surface,
          "border-gray-200 dark:border-gray-800",
        ].join(" ")}
      >
        <div className="mx-auto max-w-7xl px-3 py-3 text-sm">
          <span className={textMuted}>
            © {new Date().getFullYear()} Cognizant, All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}

// 2. ✅ CREATE THE OUTER COMPONENT THAT PROVIDES THE CONTEXT
export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}