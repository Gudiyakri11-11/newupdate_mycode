// src/guards/useRole.js
import { useApp } from "../context/AppContext";

const roleRank = { user: 1, guides: 2, moderator: 3, admin: 4 };

export function useRole() {
  const { user } = useApp();
  const activeRole = (sessionStorage.getItem("activeRole") || user?.role || "user").toLowerCase();

  function canAtLeast(minRole) {
    const currentRank = roleRank[activeRole] || 1;
    const needRank = roleRank[minRole] || 1;
    return currentRank >= needRank;
  }

  return { activeRole, canAtLeast };
}