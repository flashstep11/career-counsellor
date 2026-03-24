"use client";

import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Crown, Eye, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Video } from "@/types";
import RandomImage from "../shared/random-image";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";

interface FeaturedVideoProps {
  video: Video;
}

export default function FeaturedVideo({ video }: FeaturedVideoProps) {
  const { user } = useAuth();
  const isPaidUser = user?.type === "paid";
  const isExpertOwnVideo =
    user?.isExpert &&
    user._id &&
    video.userId &&
    user._id.toString() === video.userId.toString();
  const isAdmin = user?.isAdmin;

  if (!video) {
    return null; // or render a placeholder
  }

  return (
    <Card className="overflow-hidden">
      <Link href={`/videos/${video.videoID}`}>
        <div className="flex flex-col md:flex-row">
          <div className="relative md:w-2/3">
            <div className="relative h-64 md:h-full">
              <RandomImage
                alt={video.title}
                fill
                className="object-cover"
              ></RandomImage>
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                <Play className="h-16 w-16 text-white" />
              </div>

              {/* Premium badge for free users - hide for admins, paid users, and experts viewing their own videos */}
              {!isPaidUser && !isExpertOwnVideo && !isAdmin && (
                <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
                  <Crown className="h-3 w-3" />
                  <span>Premium</span>
                </div>
              )}

              <div className="absolute bottom-2 right-2 text-white text-sm px-2 py-1 rounded flex flex-wrap gap-1">
                {video.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-700 px-2 py-1 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <CardContent className="md:w-1/3 p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold mb-2">{video.title}</h2>
                <div className="text-gray-600 line-clamp-3">
                  <ReactMarkdown>{video.description}</ReactMarkdown>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div>
                  <p className="font-medium">
                    {video.expertDetails?.userDetails.firstName +
                      " " +
                      video.expertDetails?.userDetails.lastName}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  <span>{video.views.toLocaleString()} views</span>
                </div>
                <span>•</span>
                <span>
                  {new Date(video.createdAt).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>

              <Button className="w-full">Watch Now</Button>
            </div>
          </CardContent>
        </div>
      </Link>
    </Card>
  );
}
