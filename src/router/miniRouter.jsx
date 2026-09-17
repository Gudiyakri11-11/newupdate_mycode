import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";

// Import Components
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import GenAiBuddy from "../pages/LearningHub/GenAiBuudy";
import Assessment from "../pages/LearningHub/Assessment";
import Personalized from "../pages/LearningHub/Personalized";
import Progress from "../pages/LearningHub/Progress";
import Expert from "../pages/LearningHub/Expert";
import LevelBeginner from "../pages/LearningHub/LevelBeginner";
import LevelIntermediate from "../pages/LearningHub/LevelIntermediate";
import LevelExpert from "../pages/LearningHub/LevelExpert";
import Gauge from "../pages/Gauge/Gauge";
import Welcome from "../pages/Welcome/Welcome";
import Onboarding from "../pages/Onboarding/Onboarding";
import DeepScanAI from "../components/DeepScan/DeepScanAI";
import BotStore from "../pages/Bot/botstore";
import SubmitBot from "../pages/Bot/SubmitBot";
import UseCaseStore from "../pages/UseCase/usecases";
import SubmitUseCase from "../pages/UseCase/submitUseCase";
import NeuroITStore from "../pages/NeuroIT/neuroit";
import SubmitNeuroIT from "../pages/NeuroIT/submitNeuroIT";
import BotInventory from "../pages/Bot/BotInventory";
import NeuroITInventory from "../pages/NeuroIT/NeuroItInventory";
import UseCaseInventory from "../pages/UseCase/UseCaseInventory";
import NotFound from "../pages/NotFound/NotFound";
import Gpi from "../pages/GPI/Gpi";
import mip from "../pages/MIP/mip";
import OnboardingEmployee from "../pages/Onboarding/OnboardingEmployee";
import ForgotPassword from "../pages/Auth/ForgotPassword";
import AddProject from "../components/AddProject";
import Panel from "../pages/PanelNomination/PanelNomination";
import PanelNomination from "../pages/PanelNomination/PanelNomination";
import jirapage from "../pages/JIRA/jira";
import UserManagement from "../pages/UserManagement";
import CopilotDashboard from "../pages/InsightHub/CopilotDashboard";
import TokenUsageAnalytics from "../pages/TokenUsage/TokenUsageAnalytics";
import PPTGenerator from "../pages/PPTGenerator/PPTGenerator";

const routes = [
  { path: "/", component: Login, public: true },
  { path: "/login", component: Login, public: true },
  { path: "/forgotpass", component: ForgotPassword, public: true },
  { path: "/genaibuddy", component: GenAiBuddy, public: true },
  { path: "/welcome", component: Welcome, public: true },
  { path: "/register", component: Register, public: true },
  { path: "/genaibuddy/assessment", component: Assessment, protected: true },
  { path: "/genaibuddy/personalized", component: Personalized, protected: true },
  { path: "/gauge", component: Gauge, protected: true },
  { path: "/genaibuddy/progress", component: Progress, protected: true },
  { path: "/genaibuddy/expert", component: Expert, protected: true },
  { path: "/genaibuddy/levels/beginner", component: LevelBeginner, protected: true },
  { path: "/genaibuddy/levels/intermediate", component: LevelIntermediate, protected: true },
  { path: "/genaibuddy/levels/expert", component: LevelExpert, protected: true },
  { path: "/onboarding", component: Onboarding, protected: true },
  { path: "/deep-scan", component: DeepScanAI, protected: true },
  { path: "/neuroit", component: NeuroITStore, protected: true },
  { path: "/usecase", component: UseCaseStore, protected: true },
  { path: "/botstore", component: BotStore, protected: true },
  { path: "/submitNeuroIT", component: SubmitNeuroIT, protected: true },
  { path: "/submitUseCase", component: SubmitUseCase, protected: true },
  { path: "/submit", component: SubmitBot, protected: true },
  { path: "/botinventory", component: BotInventory, protected: true },
  { path: "/neuroit-inventory", component: NeuroITInventory, protected: true },
  { path: "/usecase-inventory", component: UseCaseInventory, protected: true },
  { path: "/gpi", component: Gpi, protected: true },
  { path: "/mip", component: mip, protected: true },
  { path: "/OnboardingEmployee", component: OnboardingEmployee, protected: true },
  { path: "/Usermanagment", component: UserManagement, protected: true },
  { path: "/notfound", component: NotFound, public: true },
  { path: "/addproject", component: AddProject, protected: true },
  { path: "/panelnomination", component: PanelNomination, protected: true },
  { path: "/jira", component: jirapage, protected: true },
  { path: "/copilot-insights", component: CopilotDashboard, protected: true },
  { path: "/token-usage-analytics", component: TokenUsageAnalytics, protected: true },
  { path: "/ppt-generator", component: PPTGenerator, protected: true },
  { path: "*", component: NotFound, public: true }, // Wildcard for 404
];

// Helper to get current path and remove trailing slash for consistency
function getPathname() {
  const path = window.location.pathname || "/";
  return path.length > 1 ? path.replace(/\/$/, "") : path;
}

export function navigate(to, options = {}) {
  const { replace = false } = options;
  let target = to || "/";
  if (!target.startsWith("/")) target = `/${target}`;

  const current = window.location.pathname;
  if (current !== target) {
    if (replace) {
      window.history.replaceState({ path: target }, "", target);
    } else {
      window.history.pushState({ path: target }, "", target);
    }
  }
  window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
  window.dispatchEvent(new Event("routechange"));
}

export default function Router() {
  const { isAuthenticated } = useApp();
  const [currentPath, setCurrentPath] = useState(getPathname());

  useEffect(() => {
    const handler = () => setCurrentPath(getPathname());
    window.addEventListener("popstate", handler);
    window.addEventListener("routechange", handler);
    return () => {
      window.removeEventListener("popstate", handler);
      window.removeEventListener("routechange", handler);
    };
  }, []);

  // Updated Logic: Find exact match first, then fallback to wildcard "*"
  const match = useMemo(() => {
    const exact = routes.find((r) => r.path === currentPath);
    if (exact) return exact;

    // If no exact match, return the wildcard route (*)
    return routes.find((r) => r.path === "*");
  }, [currentPath]);

  // Route guard
  useEffect(() => {
    if (match?.protected && !isAuthenticated) {
      sessionStorage.setItem("gkp_post_login_redirect", currentPath);
      // Since Login is at "/", we navigate to "/"
      navigate("/");
    }
  }, [match, isAuthenticated, currentPath]);

  if (match?.protected && !isAuthenticated) return null;

  const Component = match?.component || NotFound;
  return <Component />;
}
