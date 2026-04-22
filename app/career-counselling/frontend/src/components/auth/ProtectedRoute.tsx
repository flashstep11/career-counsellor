"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import AuthRequiredOverlay from "@/components/auth/AuthRequiredOverlay";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthRequiredOverlay
        open={true}
        redirectTo={pathname || "/"}
        dismissible={false}
        title="Sign in required"
        description="You need to be signed in to access this page."
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;