"use client";
// lib/authContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: string | null;
  role: string | null;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  logout: () => {},
  refreshAccessToken: async () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const router = useRouter();

  // Auto-refresh access token
  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/refresh-token", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Refresh failed");

      const data = await res.json();
      if (data.role) setRole(data.role);
      if (data.username) setUser(data.username);

      return true;
    } catch (err) {
      // Only logout if session was previously valid
      if (user || role) logout();
      return false;
    } finally {
      setSessionChecked(true);
    }
  };

  const logout = async () => {
    try {
      console.log("Logout clicked");
      console.log("Logging out");
      // Call Next.js logout API
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } catch (err) {
      console.error("Logout API failed", err);
    } finally {
      setUser(null);
      setRole(null);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("role");
      router.replace("/auth/login");
    }
  };

  // Only check session once on mount
  useEffect(() => {
    refreshAccessToken();
  }, []);

  // Auto-refresh only if logged in
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      refreshAccessToken();
    }, 1000 * 60 * 10); // 10 minutes
    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, role, logout, refreshAccessToken }}>
      {sessionChecked ? children : null} {/* Wait until session is checked */}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
