import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api, { initializeAppSecurity } from "../Api";

const STORAGE_KEYS = {
  score: "gkp_assessment_score",
  progress: "gkp_progress",
  theme: "gkp_theme",
  authFlag: "gkp_is_authenticated", // ✅ Added the gatekeeper flag key
};

const AppContext = createContext(null);

const ROLE_OPTIONS = ["user", "guides", "moderator", "admin"];
const SWITCHABLE_BY_ROLE = {
  user: ["user"],
  guides: ["user", "guides"],
  moderator: ["user", "moderator"],
  admin: ["user", "guides", "moderator", "admin"],
};
const ACTIVE_ROLE_KEY = "activeRole";

function applyThemeToHtml(theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function AppProvider({ children }) {
  const [isSystemHealthy, setIsSystemHealthy] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [user, setUser] = useState(null);

  /* --- UI Preferences --- */
  const [assessmentScore, setAssessmentScore] = useState(() => {
    const savedScore = localStorage.getItem(STORAGE_KEYS.score);
    return savedScore !== null ? Number(savedScore) : null;
  });

  const [progress, setProgress] = useState(() => {
    const savedProgress = localStorage.getItem(STORAGE_KEYS.progress);
    return savedProgress ? JSON.parse(savedProgress) : {};
  });

  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
    if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  });

  const [activeRole, setActiveRoleState] = useState(() => {
    const saved = sessionStorage.getItem(ACTIVE_ROLE_KEY);
    return ROLE_OPTIONS.includes((saved || "").toLowerCase())
      ? saved.toLowerCase()
      : "user";
  });

  /* --- Base Effects --- */
  useEffect(() => {
    if (assessmentScore !== null)
      localStorage.setItem(STORAGE_KEYS.score, String(assessmentScore));
  }, [assessmentScore]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
    applyThemeToHtml(theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      const base = (user.role || "user").toLowerCase();
      const saved = (
        sessionStorage.getItem(ACTIVE_ROLE_KEY) || ""
      ).toLowerCase();
      const candidate = ROLE_OPTIONS.includes(saved) ? saved : base;
      setActiveRoleState(candidate);
      sessionStorage.setItem(ACTIVE_ROLE_KEY, candidate);
    }
  }, [user]);

  useEffect(() => {
    async function bootApplication() {
      // 🛑 THE GATEKEEPER (Step 2)
      // If the user hasn't logged in, skip the APIs entirely to prevent 401 errors on load.
      if (localStorage.getItem(STORAGE_KEYS.authFlag) !== "true") {
        setIsLoadingSession(false);
        return; 
      }

      try {
        // 1. Fetch CSRF token
        await initializeAppSecurity();

        // 2. Fetch Session Data
        const res = await api.get("/api/auth/me");

        if (res.status === 200) {
          const data = res.data;

          const baseRole = data.user.realRole || data.user.role || "user";
          const savedRole = (
            sessionStorage.getItem(ACTIVE_ROLE_KEY) || ""
          ).toLowerCase();
          const resolvedActiveRole = ROLE_OPTIONS.includes(savedRole)
            ? savedRole
            : baseRole.toLowerCase();

          setUser({
            employeeId: data.user.employeeId,
            name: data.user.name,
            email: data.user.email,
            role: data.user.realRole || data.user.role,
            activeRole: resolvedActiveRole, 
          });
          setIsSystemHealthy(true);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.warn("No active session found or network error.");
        setUser(null);

        // ✅ INTEGRATED HEALTH CHECK LOGIC
        if (
          error.response &&
          (error.response.status === 401 || error.response.status === 403)
        ) {
          // Wipe the flag so it doesn't keep trying on next refresh if session died
          localStorage.removeItem(STORAGE_KEYS.authFlag);
          setIsSystemHealthy(true);
        } else {
          setIsSystemHealthy(false);
        }
      } finally {
        setIsLoadingSession(false);
      }
    }

    bootApplication();
  }, []);

  /* --- Functions --- */
  function setScore(score) {
    setAssessmentScore(score);
  }

  function resetProgress(roadmapType) {
    setProgress((prev) => ({ ...prev, [roadmapType]: {} }));
  }

  function toggleModule(roadmapType, moduleId) {
    setProgress((prev) => {
      const current = prev[roadmapType] || {};
      return {
        ...prev,
        [roadmapType]: { ...current, [moduleId]: !current[moduleId] },
      };
    });
  }

  const isAuthenticated = !!user;

  /* ✅ BACKEND LOGIN */
  async function loginWithBackend(apiUser, selectedRole) {
    // ✅ PERMISSION GRANTED (Step 3)
    // Set the flag so the Gatekeeper lets the app fetch the session on the next refresh.
    localStorage.setItem(STORAGE_KEYS.authFlag, "true");
    
    // Immediately fetch the CSRF token now that we have the HttpOnly cookie
    await initializeAppSecurity(true); 

    const safeUser = {
      employeeId: apiUser.employeeId,
      name: apiUser.name,
      email: apiUser.email,
      role: apiUser.role,
    };

    setUser(safeUser);
    sessionStorage.setItem(ACTIVE_ROLE_KEY, selectedRole);
    setActiveRoleState(selectedRole);
  }

  /* ✅ SECURE BACKEND LOGOUT */
  async function logout() {
    try {
      await api.post("/api/auth/logout");
    } catch (error) {
      console.warn("Logout request failed on server side.", error);
    } finally {
      setUser(null);
      localStorage.clear(); // This safely wipes the authFlag too
      sessionStorage.clear();
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
      });
      window.location.replace(`/login?_clear=${Date.now()}`);
    }
  }

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function canSwitchTo(targetRole) {
    const base = (user?.role || "user").toLowerCase();
    return (SWITCHABLE_BY_ROLE[base] || ["user"]).includes(targetRole);
  }

  function setActiveRole(nextRole) {
    if (!canSwitchTo(nextRole))
      return { ok: false, reason: "Permission denied" };
    setActiveRoleState(nextRole);
    sessionStorage.setItem(ACTIVE_ROLE_KEY, nextRole);
    return { ok: true };
  }

  const value = useMemo(
    () => ({
      assessmentScore,
      setScore,
      progress,
      toggleModule,
      resetProgress,

      user,
      isAuthenticated,
      isLoadingSession,
      loginWithBackend,
      logout,

      theme,
      setTheme,
      toggleTheme,
      activeRole,
      setActiveRole,
      canSwitchTo,
      roleOptions: ROLE_OPTIONS,
      isSystemHealthy,
      setIsSystemHealthy,
    }),
    [
      assessmentScore,
      progress,
      user,
      theme,
      activeRole,
      isSystemHealthy,
      isLoadingSession,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function getRoadmapTypeByScore(score) {
  if (score == null || Number.isNaN(Number(score))) return null;
  const s = Number(score);
  if (s <= 3) return "foundational";
  if (s <= 6) return "intermediate";
  return "advanced";
}