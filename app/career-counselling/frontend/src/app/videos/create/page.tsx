"use client";

import VideoEditor from "@/components/videos/editor/video-editor";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { useRoleCheck } from "@/hooks/useRoleCheck";
import { Loader2 } from "lucide-react";

export default function CreateVideoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { isAuthorized, loading, error } = useRoleCheck(["expert", "admin"]);

  useEffect(() => {
    // Only redirect if we've finished checking and user is not authorized
    if (!loading) {
      // If user is not logged in
      if (!user) {
        toast.error("You must be logged in to create a video");
        router.push("/login");
      }
      // If user is logged in but not an expert/admin
      else if (!isAuthorized) {
        toast.error("Only experts can create videos");
        router.push("/videos");
      }
    }
  }, [user, isAuthorized, loading, router]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Checking permissions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  // Don't render the editor until we're sure the user is authorized
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Create New Video</h1>
      <VideoEditor />
    </div>
  );
}
