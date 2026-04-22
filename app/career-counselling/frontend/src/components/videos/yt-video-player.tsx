"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { SubscribeButton } from "@/components/subscription/subscribe-button";
import styles from './video-player.module.css';

interface YouTubePlayerProps {
  videoURL: string;
  title?: string;
  previewDuration?: number;
  expertId?: string;
  isOwner?: boolean;
}

// YouTube Player API interface
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function YouTubePlayer({
  videoURL,
  title = "YouTube video player",
  previewDuration = 120, // Default 2 minutes preview
  expertId,
  isOwner = false
}: YouTubePlayerProps) {
  const [showSubscriptionPrompt, setShowSubscriptionPrompt] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [playerInitialized, setPlayerInitialized] = useState(false);
  
  const playerRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const router = useRouter();
  const isPaidUser = user?.type === "paid";
  const isAdmin = user?.isAdmin;
  
  // Has full access if user is paid, admin, or the expert who created the video
  const hasFullAccess = isPaidUser || isOwner || isAdmin;
  
  // Extract videoId from URL
  useEffect(() => {
    try {
      let extractedId = '';
      
      if (videoURL.includes('embed/')) {
        extractedId = videoURL.split('embed/')[1].split('?')[0];
      } else if (videoURL.includes('watch?v=')) {
        extractedId = new URL(videoURL).searchParams.get('v') || '';
      } else if (videoURL.includes('youtu.be/')) {
        extractedId = videoURL.split('youtu.be/')[1].split('?')[0];
      } else {
        extractedId = videoURL;
      }
      
      setVideoId(extractedId);
    } catch (error) {
      console.error('Error extracting YouTube video ID:', error);
    }
  }, [videoURL]);
  
  // Initialize the YouTube Player API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      
      window.onYouTubeIframeAPIReady = () => {
        setApiLoaded(true);
      };
    } else {
      setApiLoaded(true);
    }

    // Handle keyboard events for video controls
    const handleKeyboardControls = (e: KeyboardEvent) => {
      // Only handle keyboard events when no input is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || 
                           activeElement?.tagName === 'TEXTAREA' || 
                           (activeElement as HTMLElement)?.contentEditable === 'true';
      
      if (isInputFocused) return;

      // Check if the video player container is in view
      const videoContainer = playerContainerRef.current;
      if (!videoContainer || !videoContainer.contains(activeElement)) return;

      switch (e.key) {
        case ' ':
        case 'Spacebar':
          e.preventDefault();
          if (player) {
            if (player.getPlayerState() === window.YT.PlayerState.PLAYING) {
              player.pauseVideo();
            } else {
              player.playVideo();
            }
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (player) {
            const currentTime = player.getCurrentTime();
            const newTime = Math.min(currentTime + 10, player.getDuration());
            
            // Don't allow skipping beyond preview duration for free users
            if (!hasFullAccess && newTime > previewDuration) {
              setShowSubscriptionPrompt(true);
              return;
            }
            
            player.seekTo(newTime, true);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (player) {
            const currentTime = player.getCurrentTime();
            const newTime = Math.max(currentTime - 10, 0);
            player.seekTo(newTime, true);
          }
          break;
      }
    };

    // Add keyboard event listeners
    document.addEventListener('keydown', handleKeyboardControls);

    return () => {
      // Clean up listeners
      document.removeEventListener('keydown', handleKeyboardControls);
      
      if (player && player.destroy) {
        player.destroy();
      }
    };
  }, [player, hasFullAccess, previewDuration]);
  
  // Comprehensive right-click protection for the embedded YouTube iframe
  useEffect(() => {
    if (!playerInitialized) return;

    // Function to prevent right-clicking
    const preventRightClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toast.error("Right-clicking is disabled on this video", {
        duration: 2000,
        position: "bottom-center",
      });
      return false;
    };

    // Create an invisible overlay to intercept right-clicks
    const createOverlay = () => {
      if (!playerContainerRef.current) return;
      
      // Clean up any existing overlay
      const existingOverlay = overlayRef.current;
      if (existingOverlay) existingOverlay.remove();
      
      // Find the iframe
      const iframe = playerContainerRef.current.querySelector('iframe');
      if (!iframe) return;
      
      // Create an overlay div that sits on top of the iframe
      const overlay = document.createElement('div');
      overlay.className = styles.videoOverlay || 'video-overlay';
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.zIndex = '10';
      overlay.style.opacity = '0';  // Completely invisible
      overlay.style.pointerEvents = 'none';  // Don't interfere with normal controls
      
      // Only activate on right-click
      overlay.addEventListener('mousedown', (e) => {
        // Only prevent right mouse button (button 2)
        if (e.button === 2) {
          overlay.style.pointerEvents = 'auto'; // Temporarily capture events
          preventRightClick(e);
          
          // Reset after a short delay
          setTimeout(() => {
            if (overlay && overlay.parentNode) {
              overlay.style.pointerEvents = 'none';
            }
          }, 100);
        }
      });
      
      // Add the overlay to the player container
      playerContainerRef.current.appendChild(overlay);
      overlayRef.current = overlay;
    };

    // Apply protection both immediately and with delay to ensure it works
    createOverlay();
    
    // Reapply overlay periodically to ensure it remains effective
    const intervalId = setInterval(createOverlay, 2000);
    
    // Also protect the iframe directly
    const protectIframe = () => {
      if (!playerContainerRef.current) return;
      
      const iframe = playerContainerRef.current.querySelector('iframe');
      if (!iframe) return;
      
      iframe.addEventListener('contextmenu', preventRightClick);
    };
    
    protectIframe();
    const iframeProtectionInterval = setInterval(protectIframe, 1000);
    
    // Add event listeners to the container
    if (playerContainerRef.current) {
      playerContainerRef.current.addEventListener('contextmenu', preventRightClick);
    }
    
    // Clean up
    return () => {
      clearInterval(intervalId);
      clearInterval(iframeProtectionInterval);
      if (playerContainerRef.current) {
        playerContainerRef.current.removeEventListener('contextmenu', preventRightClick);
        
        const iframe = playerContainerRef.current.querySelector('iframe');
        if (iframe) {
          iframe.removeEventListener('contextmenu', preventRightClick);
        }
      }
      
      if (overlayRef.current) {
        overlayRef.current.removeEventListener('contextmenu', preventRightClick);
        overlayRef.current.remove();
      }
    };
  }, [playerInitialized]);

  // Initialize the player when API is ready and we have a video ID
  useEffect(() => {
    if (apiLoaded && videoId && playerRef.current && !playerInitialized) {
      const newPlayer = new window.YT.Player(playerRef.current, {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          // Enable keyboard controls in YouTube player (we'll handle them ourselves)
          disablekb: 0,
          // Enable regular controls for all users
          controls: 1,
          // Additional parameters to restrict functionality
          fs: 1, // Allow fullscreen for better user experience
          playsinline: 1,
          iv_load_policy: 3, // Hide annotations
        },
        events: {
          onReady: (event: any) => {
            setPlayer(event.target);
          },
          onStateChange: (event: any) => {
            // Check if video is playing (1) and user does not have full access
            if (event.data === window.YT.PlayerState.PLAYING && !hasFullAccess) {
              // Start checking the current time
              const timeCheckInterval = setInterval(() => {
                const currentTime = event.target.getCurrentTime();
                if (currentTime >= previewDuration) {
                  // Exit fullscreen mode if it's currently in fullscreen
                  try {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    } else if ((document as any).webkitExitFullscreen) {
                      (document as any).webkitExitFullscreen();
                    } else if ((document as any).mozCancelFullScreen) {
                      (document as any).mozCancelFullScreen();
                    } else if ((document as any).msExitFullscreen) {
                      (document as any).msExitFullscreen();
                    }
                  } catch (e) {
                    console.error("Failed to exit fullscreen:", e);
                  }

                  // Pause the video
                  event.target.pauseVideo();
                  // Show subscription prompt
                  setTimeout(() => {
                    setShowSubscriptionPrompt(true);
                  }, 500); // Small delay to ensure fullscreen exit is complete
                  clearInterval(timeCheckInterval);
                }
              }, 1000); // Check every second

              // Store the interval in the player object to clear it later
              event.target._timeCheckInterval = timeCheckInterval;
            } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
              // Clear interval when video is paused or ended
              if (event.target._timeCheckInterval) {
                clearInterval(event.target._timeCheckInterval);
              }
            }
          }
        }
      });
      
      setPlayerInitialized(true);
    }
  }, [apiLoaded, videoId, hasFullAccess, previewDuration, playerInitialized]);

  return (
    <div 
      ref={playerContainerRef}
      className="relative w-full"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toast.error("Right-clicking is disabled on this video", {
          duration: 2000,
          position: "bottom-center",
        });
        return false;
      }}
      // Make the container non-focusable to further prevent keyboard controls
      tabIndex={-1}
      style={{ 
        userSelect: 'none', 
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
    >
      <style jsx>{`
        div {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
      `}</style>

      <div className="relative w-full pt-[56.25%]">
        <div 
          ref={playerRef} 
          className="absolute top-0 left-0 w-full h-full"
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }}
        ></div>
        
        {showSubscriptionPrompt && !hasFullAccess && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-8 text-center z-10">
            <Lock className="h-12 w-12 text-primary-blue mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Preview Limit Reached</h3>
            <p className="text-gray-300 mb-6">
              Subscribe now to watch the full video and get unlimited access to all content
            </p>
            <div className="space-y-3 w-full max-w-sm">
              <SubscribeButton 
                variant="primary"
                text="Subscribe Now (10,000 coins)"
                className="w-full" 
              />
            </div>
          </div>
        )}
      </div>

      {!hasFullAccess && !showSubscriptionPrompt && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-primary-blue mb-2">
            <Crown className="h-5 w-5" />
            <h3 className="font-semibold">Preview Mode</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            You're watching in preview mode ({Math.floor(previewDuration / 60)}:{(previewDuration % 60).toString().padStart(2, '0')} limit). 
            Subscribe to unlock the full video and get unlimited access to all content.
          </p>
          <SubscribeButton 
            variant="primary"
            text="Subscribe Now (10,000 coins)"
            className="w-full" 
          />
        </div>
      )}
    </div>
  );
}
