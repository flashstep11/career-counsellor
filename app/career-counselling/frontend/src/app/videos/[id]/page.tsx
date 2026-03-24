"use client";

// import VideoPlayer from "@/components/videos/video-player";
import YouTubePlayer from "@/components/videos/yt-video-player";
import VideoInfo from "@/components/videos/video-info";
import VideoDescription from "@/components/videos/video-description";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Video } from "@/types/index";
import { useParams } from "next/navigation";
import RelatedVideos from "@/components/videos/related-videos";
import VideoWatermark from "@/components/videos/video-watermark";
import CommentsSection from "@/components/shared/comments-section";
import BlogsCarousel from "@/components/shared/blogs-carousel";
import ExpertsCarousel from "@/components/shared/experts-carousel";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function VideoPage() {
  const [video, setVideo] = useState<Video | null>(null);
  const [userPhoneNumber, setUserPhoneNumber] = useState<string | undefined>(
    undefined
  );
  const pageRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const { user } = useAuth();
  const [isOwner, setIsOwner] = useState(false);

  // Enhanced protection against browser inspection and developer tools
  useEffect(() => {
    // 1. Prevent right-click
    const preventRightClick = (e: MouseEvent) => {
      e.preventDefault();
      toast.error("Right-clicking is disabled on this page", {
        duration: 2000,
        position: "bottom-center",
      });
      return false;
    };

    // 2. Prevent keyboard shortcuts for developer tools
    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j")) ||
        (e.ctrlKey && (e.key === "U" || e.key === "u"))
      ) {
        e.preventDefault();
        toast.error("This action is disabled", {
          duration: 2000,
          position: "bottom-center",
        });
        return false;
      }
    };

    // 3. Detect devtools opening (using resize method)
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        document.body.innerHTML = "Developer tools detected. This action is not allowed.";
      }
    };

    // 4. Override and disable console methods
    const disableConsole = () => {
      const noop = () => undefined;
      const methods: (keyof Console)[] = ['log', 'debug', 'info', 'warn', 'error', 'dir', 'trace'];
      
      methods.forEach(method => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (console as any)[method] = noop;
      });
    };

    // Add all event listeners
    document.addEventListener("contextmenu", preventRightClick);
    document.addEventListener("keydown", preventKeyboardShortcuts);
    window.addEventListener("resize", detectDevTools);
    
    // Disable console for non-development environments
    if (process.env.NODE_ENV !== 'development') {
      disableConsole();
    }

    // Clean up event listeners
    return () => {
      document.removeEventListener("contextmenu", preventRightClick);
      document.removeEventListener("keydown", preventKeyboardShortcuts);
      window.removeEventListener("resize", detectDevTools);
    };
  }, []);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const response = await axios.get(`/api/videos/${params.id}`);
        setVideo(response.data);

        // Check if the logged-in user is the video owner
        if (user && user.isExpert && user._id &&
            response.data.userId &&
            user._id.toString() === response.data.userId.toString()) {
          setIsOwner(true);
        }

        // Track in user history (DB-backed, per-user)
        const _token = localStorage.getItem("token");
        if (_token && response.data?.title) {
          fetch("/api/activity/view", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${_token}` },
            body: JSON.stringify({
              type: "video",
              itemId: response.data.videoID || String(params.id),
              title: response.data.title,
            }),
          }).catch(() => {});
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchVideo();

    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUserPhoneNumber(response.data.mobileNo);
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    const token = localStorage.getItem("token");
    if (token) {
      fetchUserProfile();
    }
  }, [params.id, user]);

  return (
    <div 
      ref={pageRef} 
      className="container mx-auto px-4 py-8" 
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3">
          {/* Video Player - now using the enhanced protection */}
          <div className="mb-6 relative rounded-2xl overflow-hidden">
            {/* Watermark overlay */}
            <VideoWatermark phoneNumber={userPhoneNumber} />
            {/* prevents typeError when URL is null. */}
            {video?.youtubeUrl ? (
              <YouTubePlayer 
                videoURL={video.youtubeUrl} 
                previewDuration={video.previewDuration} 
                expertId={video.expertID}
                isOwner={isOwner}
              />
            ) : null}
          </div>

          {/* Video Info (title, likes, views, etc.) */}
          {/* Prevent typeError when video is null initially. */}
          {video && <VideoInfo video={video} />}

          {/* Video Description */}
          {video && <VideoDescription video={video} />}
        </div>

        {/* Sidebar — LinkedIn profile panel style */}
        <div className="lg:w-1/3 space-y-4">
          {/* Similar Videos — LinkedIn-style panel */}
          <aside className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            {video?.videoID && <RelatedVideos currentVideoId={video.videoID} />}
          </aside>

          {/* Comments */}
          <aside className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <CommentsSection pageId={video?.videoID} type="video" />
          </aside>
        </div>
      </div>

      {/* ── Bottom Carousels: Related Blogs + Related Experts ──────── */}
      <section className="mt-12 space-y-10 border-t border-gray-100 pt-8">
        <BlogsCarousel
          title="Related Blogs"
          refType={video?.refType}
          typeId={video?.typeId ?? undefined}
        />
        <ExpertsCarousel title="Related Experts" />
      </section>
    </div>
  );
}
