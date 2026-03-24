"use client";

import { Video } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Play, Eye, Clock, Crown } from "lucide-react";
import Link from "next/link";
import RandomImage from "../shared/random-image";
import { useAuth } from "@/contexts/AuthContext";

interface VideoCardProps {
  video: Video;
}

export default function VideoCard({ video }: VideoCardProps) {
  const { user } = useAuth();
  const isPaidUser = user?.type === "paid";
  const isExpertOwnVideo = user?.isExpert && user._id && 
                          video.userId && 
                          user._id.toString() === video.userId.toString();
  const isAdmin = user?.isAdmin;
  
  // Format the views count
  const formatViews = (views: number): string => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    } else {
      return views.toString();
    }
  };

  // Format the time since the video was published
  const getTimeSince = (date: string): string => {
    const now = new Date();
    const videoDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - videoDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    } else if (diffDays < 365) {
      return `${Math.floor(diffDays / 30)} months ago`;
    } else {
      return `${Math.floor(diffDays / 365)} years ago`;
    }
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <Link href={`/videos/${video.videoID}`}>
        <div className="relative h-48">
          <RandomImage alt={video.title} fill className="object-cover" />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors">
            <Play className="h-12 w-12 text-white" />
          </div>
          
          {/* Premium badge - hide for admins, paid users, and experts viewing their own videos */}
          {!isPaidUser && !isExpertOwnVideo && !isAdmin && (
            <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
              <Crown className="h-3 w-3" />
              <span>Premium</span>
            </div>
          )}
          
          {video.tags && video.tags.length > 0 && (
            <div className="absolute bottom-2 right-2 flex flex-wrap gap-1 justify-end">
              {video.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="bg-black/70 text-white text-xs px-2 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
              {video.tags.length > 2 && (
                <span className="bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                  +{video.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
      <CardContent className="p-4">
        <Link href={`/videos/${video.videoID}`}>
          <h3 className="font-semibold line-clamp-2 mb-2 hover:text-primary transition-colors">
            {video.title}
          </h3>
        </Link>
        
        <div className="flex items-center text-sm text-gray-500">
          <span className="flex items-center">
            <Link 
              href={`/profile/${video.userId}`}
              className="hover:text-indigo-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {video.expertDetails?.userDetails?.firstName} {video.expertDetails?.userDetails?.lastName}
            </Link>
          </span>
        </div>
      </CardContent>
      <CardFooter className="px-4 py-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <Eye className="h-3 w-3" />
          <span>{formatViews(video.views)} views</span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>{getTimeSince(video.createdAt)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
