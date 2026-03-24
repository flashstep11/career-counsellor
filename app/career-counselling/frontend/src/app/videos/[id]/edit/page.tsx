"use client";

import VideoEditor from "@/components/videos/editor/video-editor";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Video } from "@/types";
import { Loader2 } from "lucide-react";

export default function EditVideoPage() {
  const { user, loading: authLoading } = useAuth(); // Renamed isLoading to loading
  const router = useRouter();
  const params = useParams();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated and is an expert
    if (!authLoading && !user) {
      toast.error("You must be logged in to edit a video");
      router.push("/login");
      return;
    } else if (!authLoading && user && !user.isExpert && !user.isAdmin) {
      toast.error("Only experts and admins can edit videos");
      router.push("/videos");
      return;
    }

    // Fetch the video data if authenticated
    const fetchVideo = async () => {
      try {
        const response = await fetch(`/api/videos/${params.id}`);
        if (!response.ok) {
          throw new Error("Video not found");
        }
        const data = await response.json();

        // Check if the user is the owner or an admin
        if (user && user._id !== data.userId && !user.isAdmin) {
          toast.error("You can only edit your own videos");
          router.push(`/videos/${params.id}`);
          return;
        }

        setVideo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch video");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchVideo();
    }
  }, [user, authLoading, router, params.id]);

  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
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

  if (!video) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Edit Video</h1>
      <VideoEditor video={video} isEdit={true} />
    </div>
  );
}
