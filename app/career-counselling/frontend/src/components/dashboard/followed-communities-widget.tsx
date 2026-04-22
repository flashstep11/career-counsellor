"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Community } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

export function FollowedCommunitiesWidget() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    axios
      .get("/api/communities/user/joined")
      .then((r) => setCommunities(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCommunities([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <Card className="overflow-hidden bg-white rounded-xl shadow-sm border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Users2 className="h-5 w-5 text-indigo-500" />
          My Communities
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
          </div>
        ) : communities.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">You haven&apos;t joined any communities yet</p>
          </div>
        ) : (
          <>
            <div className="max-h-[220px] overflow-y-auto space-y-0.5 custom-scrollbar">
            {communities.map((community) => (
              <div
                key={community.communityId}
                onClick={() => router.push(`/communities/${community.name}`)}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <Avatar className="h-9 w-9 ring-1 ring-gray-100 shrink-0">
                  <AvatarFallback
                    className="text-white text-xs font-semibold"
                    style={{ backgroundColor: community.iconColor || "#6366f1" }}
                  >
                    {community.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                    c/{community.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {community.memberCount.toLocaleString()} members
                  </p>
                </div>
                {community.isJoined && (
                  <span className="text-xs text-indigo-500 font-medium shrink-0">Joined</span>
                )}
              </div>
            ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
