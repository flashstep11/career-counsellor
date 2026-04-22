"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

// Define types
interface User {
  _id: string;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  isAdmin?: boolean;
  isExpert?: boolean;
  expertId?: string;
  type: string;
  wallet?: number;
  profile_picture_url?: string | null;
  // Onboarding fields
  grade?: string;
  preferred_stream?: string;
  target_college?: string;
  interests?: string[];
  career_goals?: string;
  onboarding_completed?: boolean;
  [key: string]: unknown; // For other fields that may have any type
}

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  user: User | null;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfilePicture: (url: string) => void;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: true,
  user: null,
  logout: () => { },
  refreshUser: async () => { },
  updateProfilePicture: () => { },
});

// The Auth Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authCheckInFlightRef = useRef(false);

  const getStoredToken = useCallback((): string | null => {
    const raw = localStorage.getItem("token");
    if (!raw) return null;
    const token = raw.trim();
    if (!token || token === "null" || token === "undefined") return null;
    return token;
  }, []);

  const clearLogoutTimer = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  // Function to handle logout
  const logout = useCallback(() => {
    clearLogoutTimer();
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setUser(null);
    setLoading(false);
    router.replace("/login");
  }, [clearLogoutTimer, router]);

  const establishSessionFromToken = useCallback((token: string) => {
    clearLogoutTimer();

    try {
      const base64Url = token.split(".")[1];
      if (!base64Url) {
        return false;
      }
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64 + "===".slice((base64.length + 3) % 4);
      const jsonPayload = atob(padded);

      const payload = JSON.parse(jsonPayload);
      if (!payload.exp) {
        return true;
      }

      const expiresAt = payload.exp * 1000;
      const timeUntilExpiry = expiresAt - Date.now();

      if (timeUntilExpiry <= 0) {
        return false;
      }

      logoutTimerRef.current = setTimeout(() => {
        logout();
      }, timeUntilExpiry);

      return true;
    } catch (error) {
      // If we cannot parse expiry, treat the token as invalid.
      return false;
    }
  }, [clearLogoutTimer, logout]);

  // Re-fetch the current user profile from the API
  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;
    try {
      const tokenIsUsable = establishSessionFromToken(token);
      if (!tokenIsUsable) {
        logout();
        return;
      }

      const response = await axios.get("/api/profile");
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        logout();
        return;
      }
      // ignore other errors; keep last known user
    }
  }, [establishSessionFromToken, getStoredToken, logout]);

  // Optimistically update profile picture in context without a full refetch
  const updateProfilePicture = useCallback((url: string) => {
    setUser((prev) => prev ? { ...prev, profile_picture_url: url } : prev);
  }, []);

  // Set up interceptors for authentication
  useEffect(() => {
    // Request interceptor to add token to all requests
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Check token on mount
    const checkAuth = async () => {
      if (authCheckInFlightRef.current) {
        return;
      }

      authCheckInFlightRef.current = true;
      const token = getStoredToken();

      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        authCheckInFlightRef.current = false;
        return;
      }

      const tokenIsUsable = establishSessionFromToken(token);
      if (!tokenIsUsable) {
        logout();
        authCheckInFlightRef.current = false;
        return;
      }

      setLoading(true);
      try {
        // Always fetch the latest user profile to get current subscription status
        const response = await axios.get("/api/profile");

        // Use the user type directly from the API response, not from token
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          // Session expired/invalid token: clean logout without scary console error.
          logout();
          return;
        }
        console.error("Auth check error:", error);
        logout();
      } finally {
        setLoading(false);
        authCheckInFlightRef.current = false;
      }
    };

    // Listen for authentication events
    const handleAuthEvent = () => {
      checkAuth();
    };

    window.addEventListener("user-authenticated", handleAuthEvent);
    checkAuth();

    // Cleanup function
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      window.removeEventListener("user-authenticated", handleAuthEvent);
      clearLogoutTimer();
    };
  }, [clearLogoutTimer, establishSessionFromToken, getStoredToken, logout]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, user, logout, refreshUser, updateProfilePicture }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
