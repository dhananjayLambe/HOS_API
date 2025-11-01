"use client";
// lib/authContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axiosClient, { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, ROLE_KEY } from "./axiosClient";
import { isTokenValid, getRoleRedirectPath } from "./jwtUtils";

interface AuthContextType {
  user: string | null;
  role: string | null;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  logout: () => {},
  refreshAccessToken: async () => false,
  isAuthenticated: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const router = useRouter();

  // Auto-refresh access token
  const refreshAccessToken = async (skipLogout = false): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      
      if (!refreshToken) {
        if (!skipLogout && (user || role)) {
          logout();
        }
        return false;
      }

      const res = await axiosClient.post("/refresh-token", {
        refresh_token: refreshToken,
      });

      const data = res.data;
      
      // Update tokens if provided
      if (data.tokens) {
        localStorage.setItem(ACCESS_TOKEN_KEY, data.tokens.access);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.tokens.refresh);
      }
      
      // Update user and role
      if (data.role) {
        localStorage.setItem(ROLE_KEY, data.role);
        setRole(data.role);
      }
      if (data.username) {
        localStorage.setItem("username", data.username);
        setUser(data.username);
      }

      return true;
    } catch (err) {
      // Only logout if session was previously valid and skipLogout is false
      if (!skipLogout && (user || role)) {
        logout();
      }
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log("Logout clicked");
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      
      if (refreshToken) {
        // Call Next.js logout API to blacklist token
        try {
          await axiosClient.post("/logout", { 
            refresh_token: refreshToken 
          });
        } catch (err) {
          // Ignore errors during logout
          console.error("Logout API failed", err);
        }
      }
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setUser(null);
      setRole(null);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(ROLE_KEY);
      localStorage.removeItem("username");
      localStorage.removeItem("user");
      router.replace("/auth/login");
    }
  };

  // Verify token and auto-login on app start
  useEffect(() => {
    if (typeof window === "undefined") {
      setSessionChecked(true);
      return;
    }

    const verifyAndAutoLogin = async () => {
      try {
        const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        const storedRole = localStorage.getItem(ROLE_KEY);
        const storedUser = localStorage.getItem("username") || localStorage.getItem("user");

        // If no tokens, user is not logged in
        if (!storedAccessToken && !storedRefreshToken) {
          setSessionChecked(true);
          return;
        }

        // Check if access token is valid
        if (storedAccessToken && isTokenValid(storedAccessToken)) {
          // Token is valid, restore user session
          if (storedRole) setRole(storedRole);
          if (storedUser) setUser(storedUser);
          setSessionChecked(true);
          return;
        }

        // Access token expired, try to refresh
        if (storedRefreshToken && isTokenValid(storedRefreshToken)) {
          const refreshed = await refreshAccessToken(true);
          if (refreshed) {
            // Token refreshed successfully, restore session
            const newRole = localStorage.getItem(ROLE_KEY);
            const newUser = localStorage.getItem("username") || localStorage.getItem("user");
            if (newRole) setRole(newRole);
            if (newUser) setUser(newUser);
          } else {
            // Refresh failed, clear tokens
            logout();
          }
        } else {
          // Both tokens invalid, clear and logout
          logout();
        }
      } catch (error) {
        console.error("Auto-login error:", error);
        logout();
      } finally {
        setSessionChecked(true);
      }
    };

    verifyAndAutoLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up periodic refresh only if we have a role (user is logged in)
  useEffect(() => {
    if (!role) return;
    
    let intervalId: NodeJS.Timeout | null = null;
    
    // Don't refresh immediately - wait 2 minutes to avoid race conditions after login
    const timeout = setTimeout(() => {
      // Set up periodic refresh (every 10 minutes)
      intervalId = setInterval(() => {
        refreshAccessToken(true); // Skip logout on failure during periodic refresh
      }, 1000 * 60 * 10); // 10 minutes
    }, 1000 * 60 * 2); // Wait 2 minutes before first refresh
    
    return () => {
      clearTimeout(timeout);
      if (intervalId) clearInterval(intervalId);
    };
  }, [role]);

  const isAuthenticated = !!(user && role);

  return (
    <AuthContext.Provider value={{ user, role, logout, refreshAccessToken, isAuthenticated }}>
      {sessionChecked ? children : null} {/* Wait until session is checked */}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
