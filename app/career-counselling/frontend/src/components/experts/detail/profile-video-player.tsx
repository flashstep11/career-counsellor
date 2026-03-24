"use client";

import { useEffect, useState } from "react";
import { Play, Loader2 } from "lucide-react";
import type { Video } from "@/types";

interface ProfileVideoPlayerProps {
  expertId: string;
}

/**
 * Extracts a YouTube video ID from various YouTube URL formats.
 * Returns null if the URL is not a YouTube URL.
 */
function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    // Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return u.searchParams.get("v");
    }
    // Short URL: https://youtu.be/VIDEO_ID
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).split("?")[0];
    }
    // Embed URL: https://www.youtube.com/embed/VIDEO_ID
    const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/);
    if (embedMatch) return embedMatch[1];
  } catch {
    // Not a valid URL, try regex
  }
  const regex =
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export default function ProfileVideoPlayer({ expertId }: ProfileVideoPlayerProps) {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasVideo, setHasVideo] = useState(true);

  useEffect(() => {
    if (!expertId) return;

    const fetchProfileVideo = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/experts/${expertId}/profile-video`);

        // 204 → expert has no videos
        if (res.status === 204) {
          setHasVideo(false);
          return;
        }

        if (!res.ok) {
          setHasVideo(false);
          return;
        }

        const data: Video = await res.json();
        setVideo(data);
        setHasVideo(true);
      } catch {
        setHasVideo(false);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileVideo();
  }, [expertId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading video…</span>
      </div>
    );
  }

  if (!hasVideo || !video) return null;

  const youtubeId = getYouTubeId(video.youtubeUrl as string);

  return (
    <div className="w-full">
      {/* Label row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-gray-100" />
        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 uppercase tracking-wide">
          <Play className="h-3.5 w-3.5 text-blue-600 fill-blue-600" />
          Featured Video
        </div>
        <div className="h-px flex-1 bg-gray-100" />
      </div>

      <p className="text-xs text-gray-400 mb-2 truncate text-center" title={video.title}>
        {video.title}
      </p>

      {/* 16:9 player */}
      <div className="relative w-full rounded-xl overflow-hidden shadow-md bg-black aspect-video">
        {youtubeId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        ) : (
          <video
            src={video.youtubeUrl as string}
            controls
            className="absolute inset-0 w-full h-full object-cover"
            title={video.title}
          />
        )}
      </div>
    </div>
  );
}
