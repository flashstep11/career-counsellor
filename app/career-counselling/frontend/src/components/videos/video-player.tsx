"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Settings,
  SkipBack,
  SkipForward,
  Lock,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";
import { SubscribeButton } from "@/components/subscription/subscribe-button";

interface VideoPlayerProps {
  video: {
    videoUrl: string;
    thumbnail: string;
    title: string;
    previewDuration?: number; // Duration in seconds for preview (default to 60s if not provided)
    expertId?: string; // ID of the expert who owns the video
  };
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSubscriptionPrompt, setShowSubscriptionPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const router = useRouter();

  const isPaidUser = user?.type === "paid";
  // Updated check: now we use user._id instead of user.expertId
  const isExpertOwnVideo = user?.isExpert && user._id && video.expertId && 
                          (user._id.toString() === video.expertId.toString());
  const isAdmin = user?.isAdmin;
  const hasFullAccess = isPaidUser || isExpertOwnVideo || isAdmin;
  const previewDuration = video.previewDuration || 60; // Default preview of 60 seconds

  useEffect(() => {
    // Check if we should show the subscription prompt for free users
    // Don't show for paid users, admins, or experts viewing their own videos
    if (!hasFullAccess && currentTime >= previewDuration) {
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      setShowSubscriptionPrompt(true);
    }
  }, [currentTime, hasFullAccess, previewDuration]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      // Don't allow playing beyond preview duration for free users
      if (!hasFullAccess && currentTime >= previewDuration) {
        setShowSubscriptionPrompt(true);
        return;
      }

      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying, currentTime, hasFullAccess, previewDuration]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);

      // Check if free user reaches preview limit
      if (!hasFullAccess && videoRef.current.currentTime >= previewDuration && isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        setShowSubscriptionPrompt(true);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);

    // Don't allow seeking beyond preview duration for free users
    if (!hasFullAccess && time > previewDuration) {
      setShowSubscriptionPrompt(true);
      return;
    }

    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Calculate background gradient percentage safely
  const getProgressPercentage = () => {
    if (duration === 0) return "0%";
    return `${(currentTime / duration) * 100}%`;
  };

  // Calculate preview limit percentage
  const getPreviewLimitPercentage = () => {
    if (duration === 0) return "100%";
    return `${(previewDuration / duration) * 100}%`;
  };

  const handleSubscribe = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      setIsSubscribing(true);

      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Authentication token not found. Please login again.");
        router.push("/login");
        return;
      }

      const response = await axios.post(
        "/api/users/subscribe",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data && response.data.success) {
        // Show success message
        toast.success("Subscription successful! You now have premium access.");

        // Just reload the page to refresh the user context
        window.location.reload();
      } else {
        // Show error message from backend if available
        toast.error(response.data?.message || "Failed to subscribe");
      }
    } catch (error: any) {
      // Show more detailed error message if available
      const errorMessage =
        error.response?.data?.detail || error.message || "Failed to subscribe";
      toast.error(errorMessage);
      console.error("Subscription error:", error);
    } finally {
      setIsSubscribing(false);
    }
  };

  // Keyboard event handlers
  const handleSkipForward = useCallback(() => {
    if (videoRef.current) {
      const newTime = Math.min(currentTime + 10, duration);
      
      // Don't allow skipping beyond preview duration for free users
      if (!hasFullAccess && newTime > previewDuration) {
        setShowSubscriptionPrompt(true);
        return;
      }
      
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [currentTime, duration, hasFullAccess, previewDuration]);

  const handleSkipBackward = useCallback(() => {
    if (videoRef.current) {
      const newTime = Math.max(currentTime - 10, 0);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [currentTime]);

  // Add keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard events when video element is focused or when no other input is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || 
                           activeElement?.tagName === 'TEXTAREA' || 
                           (activeElement as HTMLElement)?.contentEditable === 'true';
      
      if (isInputFocused) return;

      // Check if the video player container is in view/focused
      const videoContainer = videoRef.current?.closest('.relative');
      if (!videoContainer) return;

      switch (e.key) {
        case ' ':
        case 'Spacebar':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSkipForward();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSkipBackward();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlay, handleSkipForward, handleSkipBackward]);

  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full aspect-video"
        poster={video.thumbnail}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      >
        <source src={video.videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Subscription Prompt Overlay */}
      {showSubscriptionPrompt && !hasFullAccess && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-8 text-center">
          <Lock className="h-12 w-12 text-primary-blue mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Preview Limit Reached</h3>
          <p className="text-gray-300 mb-6">
            Subscribe now to watch the full video and get unlimited access to all content
          </p>
          <div className="space-y-3">
            <SubscribeButton
              variant="primary"
              text="Subscribe Now (10,000 coins)"
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        {/* Progress Bar */}
        <div className="mb-4 relative">
          <input
            type="range"
            min={0}
            max={duration}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-gray-400 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #4169E1 ${getProgressPercentage()}, #ffffff40 ${getProgressPercentage()})`,
            }}
          />
          {/* Preview limit indicator for free users */}
          {!hasFullAccess && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500"
              style={{
                left: getPreviewLimitPercentage(),
                transform: "translateX(-50%)",
              }}
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-white bg-red-500 px-1 rounded">
                Preview Limit
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={togglePlay}
                    className="hover:text-primary-blue transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isPlaying ? "Pause" : "Play"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSkipBackward}
                    className="hover:text-primary-blue transition-colors"
                  >
                    <SkipBack className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Skip Backward (-10s)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSkipForward}
                    className="hover:text-primary-blue transition-colors"
                  >
                    <SkipForward className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Skip Forward (+10s)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleMute}
                    className="hover:text-primary-blue transition-colors"
                  >
                    {isMuted ? (
                      <VolumeX className="h-6 w-6" />
                    ) : (
                      <Volume2 className="h-6 w-6" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isMuted ? "Unmute" : "Mute"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <span className="text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {!hasFullAccess && (
              <SubscribeButton
                variant="outline"
                size="sm"
                text="Subscribe"
                showIcon={false}
                className="text-xs border-primary-blue text-primary-blue hover:bg-primary-blue/10"
              />
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="hover:text-primary-blue transition-colors">
                    <Settings className="h-6 w-6" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="hover:text-primary-blue transition-colors">
                    <Maximize2 className="h-6 w-6" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Full Screen</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
