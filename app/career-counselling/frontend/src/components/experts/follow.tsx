"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

interface FollowButtonProps {
  targetUserId: string;
  className?: string;
  label?: string;        // custom label, defaults to "Follow"
  followingLabel?: string; // label when following, defaults to "Unfollow"
}

export default function FollowButton({ targetUserId, className = "", label = "Follow", followingLabel = "Unfollow" }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null); // Use null as initial state
  const [isLoading, setIsLoading] = useState(true); // Start with loading state true
  const { user } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    // Check if the current user is following this expert
    const checkFollowingStatus = async () => {
      // If user is not logged in or is viewing their own profile, don't check
      if (!user || user._id === targetUserId) {
        setIsLoading(false);
        return;
      }
      
      try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          console.error("No authentication token found");
          setIsLoading(false);
          return;
        }

        const response = await axios.get(`/api/users/following/status`, {
          params: { target_id: targetUserId },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setIsFollowing(response.data.is_following);
      } catch (error) {
        console.error("Error checking following status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkFollowingStatus();
  }, [user, targetUserId]);

  if (!user || user._id === targetUserId) {
    return null;
  }

  const handleFollowToggle = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to follow experts",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("No authentication token found");
      }

      const endpoint = isFollowing ? "/api/users/unfollow" : "/api/users/follow";
      const response = await axios.post(endpoint, null, {
        params: { target_id: targetUserId },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setIsFollowing(!isFollowing);
      toast({
        title: isFollowing ? "Unfollowed" : "Following",
        description: response.data.message,
      });
    } catch (error) {
      console.error("Follow/unfollow error:", error);
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.detail
        ? error.response.data.detail
        : "Something went wrong";
        
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  };

  if (isLoading) {
    return (
      <Button 
        className={`${className} bg-gray-100 text-gray-400`}
        disabled={true}
      >
        ...
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleFollowToggle}
      className={`${className} ${isFollowing ? "bg-gray-200 hover:bg-gray-300 text-gray-800" : "bg-primary-blue hover:bg-primary-blue/90"}`}
      disabled={isLoading}
    >
      {isLoading ? "..." : isFollowing ? followingLabel : label}
    </Button>
  );
}
