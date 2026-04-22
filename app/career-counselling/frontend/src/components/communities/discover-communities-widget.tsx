"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Compass, Loader2, Users2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface CommunityItem {
  communityId: string;
  name: string;
  displayName: string;
  iconColor?: string;
  memberCount: number;
  isJoined?: boolean;
}

export function DiscoverCommunitiesWidget() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const loadCommunities = () => {
    setStatus("loading");
    setErrorMsg("");
    const controller = new AbortController();
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    fetch("/api/communities?limit=50", {
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
        const data = await res.json();
        if (!mountedRef.current) return;
        const list: CommunityItem[] = (Array.isArray(data) ? data : [])
          .map(
            (d: Record<string, unknown>) => ({
              communityId: String(d.communityId ?? d._id ?? d.name ?? ""),
              name: String(d.name ?? ""),
              displayName: String(d.displayName ?? d.name ?? ""),
              iconColor: String(d.iconColor ?? "#6366f1"),
              memberCount: Number(d.memberCount ?? 0),
              isJoined: Boolean(d.isJoined),
            })
          )
          .filter((c) => !c.isJoined)
          .slice(0, 5);
        setCommunities(list);
        setStatus("done");
      })
      .catch((e) => {
        if (e.name === "AbortError" || !mountedRef.current) return;
        setErrorMsg(String(e.message ?? e));
        setStatus("error");
      });

    return () => controller.abort();
  };

  useEffect(() => {
    mountedRef.current = true;
    const cleanup = loadCommunities();
    return () => {
      mountedRef.current = false;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJoinLeave = async (c: CommunityItem) => {
    if (!isAuthenticated) { router.push("/login"); return; }
    setJoiningId(c.communityId);
    try {
      const action = c.isJoined ? "leave" : "join";
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/communities/${c.communityId}/${action}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!mountedRef.current) return;
      setCommunities((prev) =>
        prev.map((item) =>
          item.communityId === c.communityId
            ? { ...item, isJoined: !item.isJoined, memberCount: item.isJoined ? item.memberCount - 1 : item.memberCount + 1 }
            : item
        )
      );
    } catch { /* ignore */ } finally {
      if (mountedRef.current) setJoiningId(null);
    }
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border-0">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Compass className="h-4 w-4 text-indigo-500" />
          Discover Communities
        </CardTitle>
      </CardHeader>

      <CardContent className="px-3 pb-3">
        {status === "loading" && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}

        {status === "error" && (
          <div className="py-4 px-2 text-center space-y-2">
            <p className="text-xs text-red-500 font-medium">Failed to load communities</p>
            {errorMsg && <p className="text-[10px] text-gray-400 font-mono break-all">{errorMsg}</p>}
            <button
              onClick={loadCommunities}
              className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:underline mt-1"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}

        {status === "done" && communities.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-5">No communities found.</p>
        )}

        {status === "done" && communities.length > 0 && (
          <div className="space-y-0.5">
            {communities.map((c) => (
              <div
                key={c.communityId || c.name}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* Entire left section (avatar + name) is one single button */}
                <button
                  onClick={() => router.push(`/communities/${c.name}`)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback
                      className="text-white text-xs font-bold"
                      style={{ backgroundColor: c.iconColor || "#6366f1" }}
                    >
                      {(c.displayName || c.name).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      c/{c.name}
                    </p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Users2 className="h-2.5 w-2.5" />
                      {c.memberCount.toLocaleString()} members
                    </p>
                  </div>
                </button>

                <Button
                  size="sm"
                  variant={c.isJoined ? "outline" : "default"}
                  disabled={joiningId === c.communityId}
                  onClick={() => handleJoinLeave(c)}
                  className={`shrink-0 h-7 text-xs rounded-lg px-2.5 ${
                    c.isJoined
                      ? "border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {joiningId === c.communityId ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : c.isJoined ? "Joined" : "Join"}
                </Button>
              </div>
            ))}

            <Link
              href="/communities"
              className="mt-2 flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <Compass className="h-3.5 w-3.5" />
              Browse all communities
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
