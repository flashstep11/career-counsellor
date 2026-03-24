"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Custom hook to check if a user has specific roles
 * @param {string[]} allowedRoles - Array of roles that are allowed
 * @returns {Object} - Object containing isAuthorized and loading states
 */
export function useRoleCheck(allowedRoles: string[]) {
  const { user, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      if (authLoading) return;

      // If there's no user, they're not authorized
      if (!user) {
        setIsChecking(false);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setIsChecking(false);
          return;
        }

        const response = await axios.get("/api/role", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data && response.data.role) {
          setUserRole(response.data.role);
        }
      } catch (err) {
        console.error("Error checking role:", err);
        setError("Failed to verify authorization");
      } finally {
        setIsChecking(false);
      }
    };

    checkRole();
  }, [user, authLoading]);

  const isAuthorized = userRole ? allowedRoles.includes(userRole) : false;

  return {
    isAuthorized,
    loading: authLoading || isChecking,
    role: userRole,
    error,
  };
}
