"use client";
// lib/authContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axiosClient, { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, ROLE_KEY } from "./axiosClient";
import { isTokenValid, getRoleRedirectPath } from "./jwtUtils";

interface UserInfo {
  user_id: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
}

interface AuthContextType {
  user: UserInfo | null;
  role: string | null;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  setUserInfo: (userData: Partial<UserInfo>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  logout: () => {},
  refreshAccessToken: async () => false,
  setUserInfo: () => {},
  isAuthenticated: false,
});

// LocalStorage keys for user info
const USER_INFO_KEYS = {
  USER_ID: "user_id",
  USERNAME: "username",
  FIRST_NAME: "first_name",
  LAST_NAME: "last_name",
  EMAIL: "email",
} as const;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const router = useRouter();

  // Helper function to save user info to localStorage and state
  const saveUserInfo = (userData: Partial<UserInfo>) => {
    const userInfo: UserInfo = {
      user_id: userData.user_id ?? localStorage.getItem(USER_INFO_KEYS.USER_ID),
      username: userData.username ?? localStorage.getItem(USER_INFO_KEYS.USERNAME),
      first_name: userData.first_name ?? localStorage.getItem(USER_INFO_KEYS.FIRST_NAME),
      last_name: userData.last_name ?? localStorage.getItem(USER_INFO_KEYS.LAST_NAME),
      email: userData.email ?? localStorage.getItem(USER_INFO_KEYS.EMAIL),
      role: userData.role ?? role,
    };

    // Save to localStorage
    if (userInfo.user_id) localStorage.setItem(USER_INFO_KEYS.USER_ID, userInfo.user_id);
    if (userInfo.username) localStorage.setItem(USER_INFO_KEYS.USERNAME, userInfo.username);
    if (userInfo.first_name) localStorage.setItem(USER_INFO_KEYS.FIRST_NAME, userInfo.first_name);
    if (userInfo.last_name) localStorage.setItem(USER_INFO_KEYS.LAST_NAME, userInfo.last_name);
    if (userInfo.email) localStorage.setItem(USER_INFO_KEYS.EMAIL, userInfo.email);

    // Update state
    setUser(userInfo);
  };

  // Helper function to load user info from localStorage
  const loadUserInfo = (): UserInfo | null => {
    const user_id = localStorage.getItem(USER_INFO_KEYS.USER_ID);
    const username = localStorage.getItem(USER_INFO_KEYS.USERNAME);
    const first_name = localStorage.getItem(USER_INFO_KEYS.FIRST_NAME);
    const last_name = localStorage.getItem(USER_INFO_KEYS.LAST_NAME);
    const email = localStorage.getItem(USER_INFO_KEYS.EMAIL);

    if (!user_id && !username) return null;

    return {
      user_id,
      username,
      first_name,
      last_name,
      email,
      role: role,
    };
  };

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
      
      // Update role
      if (data.role) {
        localStorage.setItem(ROLE_KEY, data.role);
        setRole(data.role);
      }

      // Update user info if provided in refresh response
      if (data.user_id || data.username || data.first_name || data.last_name || data.email) {
        saveUserInfo({
          user_id: data.user_id,
          username: data.username,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          role: data.role,
        });
      } else {
        // If not provided, restore from localStorage
        const storedUserInfo = loadUserInfo();
        if (storedUserInfo) {
          setUser({ ...storedUserInfo, role: data.role || role });
        }
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
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    try {
      if (refreshToken) {
        // Call Next.js API route /api/logout to blacklist token on backend (path relative to baseURL "/api")
        try {
          await axiosClient.post("logout", {
            refresh_token: refreshToken,
          });
        } catch (err) {
          // Ignore errors during logout - still clear local state
          console.error("Logout API failed", err);
        }
      }
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setUser(null);
      setRole(null);
      // Clear tokens
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(ROLE_KEY);
      // Clear user info
      localStorage.removeItem(USER_INFO_KEYS.USER_ID);
      localStorage.removeItem(USER_INFO_KEYS.USERNAME);
      localStorage.removeItem(USER_INFO_KEYS.FIRST_NAME);
      localStorage.removeItem(USER_INFO_KEYS.LAST_NAME);
      localStorage.removeItem(USER_INFO_KEYS.EMAIL);
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

        // If no tokens, user is not logged in
        if (!storedAccessToken && !storedRefreshToken) {
          setSessionChecked(true);
          return;
        }

        // Check if access token is valid
        if (storedAccessToken && isTokenValid(storedAccessToken)) {
          // Token is valid, restore user session
          if (storedRole) setRole(storedRole);
          const userInfo = loadUserInfo();
          if (userInfo) {
            setUser({ ...userInfo, role: storedRole });
          }
          setSessionChecked(true);
          return;
        }

        // Access token expired, try to refresh
        if (storedRefreshToken && isTokenValid(storedRefreshToken)) {
          const refreshed = await refreshAccessToken(true);
          if (refreshed) {
            // Token refreshed successfully, restore session
            const newRole = localStorage.getItem(ROLE_KEY);
            if (newRole) setRole(newRole);
            const userInfo = loadUserInfo();
            if (userInfo) {
              setUser({ ...userInfo, role: newRole });
            }
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
    <AuthContext.Provider value={{ user, role, logout, refreshAccessToken, setUserInfo: saveUserInfo, isAuthenticated }}>
      {sessionChecked ? children : null} {/* Wait until session is checked */}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
