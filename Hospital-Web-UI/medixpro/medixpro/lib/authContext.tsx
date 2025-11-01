"use client";
// lib/authContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axiosClient, { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, ROLE_KEY } from "./axiosClient";

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

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem(ROLE_KEY);
      const storedUser = localStorage.getItem("username") || localStorage.getItem("user");
      const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      
      // Only set role/user if we have valid tokens
      if (storedAccessToken && storedRole) {
        setRole(storedRole);
        if (storedUser) setUser(storedUser);
      }
      setSessionChecked(true);
    }
  }, []);

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

  return (
    <AuthContext.Provider value={{ user, role, logout, refreshAccessToken }}>
      {sessionChecked ? children : null} {/* Wait until session is checked */}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
