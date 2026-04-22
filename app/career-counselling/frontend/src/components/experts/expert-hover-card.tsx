"use client";

import { useState } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import FollowButton from "@/components/experts/follow";

interface ExpertData {
  userId: string;
  userDetails?: {
    firstName?: string;
    lastName?: string;
  };
  specializations?: string[];
  bio?: string;
}

interface ExpertHoverCardProps {
  expertId: string;
  children: React.ReactNode;
}

export default function ExpertHoverCard({
  expertId,
  children,
}: ExpertHoverCardProps) {
  const [expert, setExpert] = useState<ExpertData | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch expert details when hover card is opened
  const fetchExpertDetails = async () => {
    if (expert || loading) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/experts/${expertId}`);
      if (response.ok) {
        const data = await response.json();
        setExpert(data);
      }
    } catch (error) {
      console.error("Error fetching expert details:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <HoverCard openDelay={300} closeDelay={200}>
      <HoverCardTrigger asChild>
        <div className="cursor-pointer" onMouseEnter={fetchExpertDetails}>
          {children}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 bg-white shadow-lg rounded-lg p-4">
        {loading || !expert ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-8 w-24" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12 ring-2 ring-primary-lavender">
                <AvatarFallback className="bg-primary-blue text-white">
                  {expert.userDetails?.firstName?.[0] || ""}
                  {expert.userDetails?.lastName?.[0] || ""}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-semibold">
                  {expert.userDetails?.firstName} {expert.userDetails?.lastName}
                </h4>
                <p className="text-sm text-gray-500">
                  {expert.specializations?.join(", ") || "Expert"}
                </p>
              </div>
            </div>
            {expert.bio && (
              <p className="text-sm text-gray-600 line-clamp-3">{expert.bio}</p>
            )}
            <div className="flex items-center justify-between pt-2">
              <Link href={`/experts/${expertId}`} passHref>
                <Button variant="outline" size="sm">
                  View Profile
                </Button>
              </Link>
              <FollowButton targetUserId={expert.userId} />
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
