"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { MessageSquare, Plus, SlidersHorizontal, ChevronDown, Loader2, Search, BookOpen, Play } from "lucide-react";
import { FollowedCommunitiesWidget } from "@/components/dashboard/followed-communities-widget";
import { TrendingCarousel } from "@/components/dashboard/trending-carousel";
import PostItem from "@/components/communities/post-item";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Post, Community, Blog, Video } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DiscussionsFilterPopup,
  DiscussionsFilters,
} from "@/components/forums/discussions-filter-popup";
import { SideFooter } from "@/components/shared/side-footer";
import { HideGlobalFooter } from "@/components/shared/hide-global-footer";
import { DiscoverCommunitiesWidget } from "@/components/communities/discover-communities-widget";

const DEFAULT_FILTERS: DiscussionsFilters = {
  sortBy: "mostRecent",
  postedBy: "",
  dateFrom: "",
  dateTo: "",
  fields: [],
};

export default function ForumsPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [appliedFilters, setAppliedFilters] = useState<DiscussionsFilters>(DEFAULT_FILTERS);
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [promoBlogs, setPromoBlogs] = useState<Blog[]>([]);
  const [promoVideos, setPromoVideos] = useState<Video[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoadingCommunities(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    fetch("/api/communities/user/joined", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        setJoinedCommunities(Array.isArray(data) ? data : []);
      })
      .catch(() => setJoinedCommunities([]))
      .finally(() => setLoadingCommunities(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    fetchPosts();
    // Fetch promo content once on mount
    axios.get("/api/blogs?limit=20").then((r) => {
      const items: Blog[] = Array.isArray(r.data) ? r.data : r.data.blogs || [];
      // Shuffle so different ones appear each session
      setPromoBlogs(items.sort(() => Math.random() - 0.5));
    }).catch(() => { });
    axios.get("/api/videos?limit=20").then((r) => {
      const items: Video[] = Array.isArray(r.data) ? r.data : r.data.videos || [];
      setPromoVideos(items.sort(() => Math.random() - 0.5));
    }).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, authLoading]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/posts/feed?limit=50");
      let data: Post[] = Array.isArray(res.data) ? res.data : res.data.posts || [];

      const f = appliedFilters;

      // Field filter
      if (f.fields.length) {
        data = data.filter((p) =>
          p.tags?.some((tag) =>
            f.fields.some(
              (field) =>
                tag.toLowerCase().includes(field.toLowerCase()) ||
                field.toLowerCase().includes(tag.toLowerCase())
            )
          )
        );
      }

      // Posted By filter
      if (f.postedBy.trim()) {
        const q = f.postedBy.trim().toLowerCase();
        data = data.filter((p) => p.authorName?.toLowerCase().includes(q));
      }

      // Date From filter
      if (f.dateFrom) {
        const from = new Date(f.dateFrom);
        data = data.filter((p) => new Date(p.createdAt) >= from);
      }

      // Date To filter
      if (f.dateTo) {
        const to = new Date(f.dateTo + "T23:59:59");
        data = data.filter((p) => new Date(p.createdAt) <= to);
      }

      // Sort
      data = [...data].sort((a, b) => {
        switch (f.sortBy) {
          case "mostLiked":
            return b.likes - a.likes;
          case "mostViewed":
            return (b.views || 0) - (a.views || 0);
          case "mostDiscussed":
            return (b.commentsCount || 0) - (a.commentsCount || 0);
          case "mostRecent":
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });

      setPosts(data);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const activeFilterCount =
    (appliedFilters.sortBy !== "mostRecent" ? 1 : 0) +
    (appliedFilters.postedBy.trim() ? 1 : 0) +
    (appliedFilters.dateFrom ? 1 : 0) +
    (appliedFilters.dateTo ? 1 : 0) +
    appliedFilters.fields.length;

  const forumsContent = (
    <div className="min-h-screen bg-gray-50">
      {/* Suppress global footer — this page uses the side footer */}
      <HideGlobalFooter />
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="mb-5">
          <h1 className="text-3xl font-bold text-gray-900">Discussion Posts</h1>
          <p className="text-gray-500 mt-1 text-sm">Join the community conversations</p>
        </div>

        {/* Trending Carousel */}
        <div className="mb-6">
          <TrendingCarousel />
        </div>

        {/* 2-column layout: feed | right sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
          {/* ── Posts Feed Column ── */}
          <div className="flex flex-col h-full min-h-0">
            {/* Sticky toolbar — filter button + create post */}
            <div className="sticky top-[80px] z-40 bg-gray-50 pt-1 pb-3 flex items-center justify-between gap-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilterPopup(true)}
                className="gap-2 rounded-xl border-gray-200 hover:border-indigo-300"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filter &amp; Sort
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-0.5 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>

              {/* Sticky Create Post button — opens community picker */}
              <Popover open={createOpen} onOpenChange={setCreateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Create Post
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-3 rounded-2xl shadow-lg">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                    Post in a community
                  </p>

                  {loadingCommunities ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                    </div>
                  ) : (
                    <div className="space-y-0.5 max-h-52 overflow-y-auto mb-2">
                      {/* Always show c/general as the default option */}
                      {!joinedCommunities.some((c) => c.name === "general") && (
                        <button
                          onClick={() => {
                            setCreateOpen(false);
                            router.push("/communities/general/submit");
                          }}
                          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-indigo-50 transition-colors text-left group"
                        >
                          <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 bg-indigo-500">
                            G
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-600 truncate">
                              c/general
                            </p>
                            <p className="text-xs text-gray-400 truncate">General — post anything</p>
                          </div>
                        </button>
                      )}
                      {joinedCommunities.map((c) => (
                        <button
                          key={c.communityId}
                          onClick={() => {
                            setCreateOpen(false);
                            router.push(`/communities/${c.name}/submit`);
                          }}
                          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-indigo-50 transition-colors text-left group"
                        >
                          <div
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: c.iconColor || "#6366f1" }}
                          >
                            {c.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-600 truncate">
                              c/{c.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{c.displayName}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Browse & join communities */}
                  <div className="border-t border-gray-100 pt-2 mt-1">
                    <button
                      onClick={() => {
                        setCreateOpen(false);
                        router.push("/communities");
                      }}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-indigo-600 font-medium"
                    >
                      <Search className="h-4 w-4 shrink-0" />
                      Browse &amp; join communities
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
                {appliedFilters.sortBy !== "mostRecent" && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-600 border border-indigo-100">
                    Sort: {appliedFilters.sortBy.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                )}
                {appliedFilters.postedBy.trim() && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-600 border border-indigo-100">
                    By: {appliedFilters.postedBy}
                  </span>
                )}
                {appliedFilters.dateFrom && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-600 border border-indigo-100">
                    From: {appliedFilters.dateFrom}
                  </span>
                )}
                {appliedFilters.dateTo && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-600 border border-indigo-100">
                    To: {appliedFilters.dateTo}
                  </span>
                )}
                {appliedFilters.fields.map((f) => (
                  <span
                    key={f}
                    className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-600 border border-indigo-100"
                  >
                    {f}
                  </span>
                ))}
                <button
                  onClick={() => setAppliedFilters(DEFAULT_FILTERS)}
                  className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Scrollable posts list (infinite scroll container) */}
            <div className="pr-1 pb-10">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 auto-rows-min">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-7 w-7 rounded-full" />
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-20 ml-auto" />
                      </div>
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                      <div className="flex gap-4 pt-1">
                        <Skeleton className="h-3 w-14" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <h3 className="text-lg font-bold text-gray-800 mb-1">
                    {activeFilterCount > 0
                      ? "No posts match your filters"
                      : "No discussions yet"}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {activeFilterCount > 0
                      ? "Try adjusting your filters or clearing them."
                      : "Join a community and start the conversation!"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 auto-rows-min">
                  {posts.map((post, idx) => {
                    // Every 3rd post (after index 2, 5, 8 …), inject a promo card
                    const showPromo = (idx + 1) % 3 === 0;
                    // Alternate blog / video
                    const promoSlot = Math.floor((idx + 1) / 3) - 1;
                    const isBlog = promoSlot % 2 === 0;
                    const blog = isBlog ? promoBlogs[promoSlot % Math.max(promoBlogs.length, 1)] : null;
                    const video = !isBlog ? promoVideos[promoSlot % Math.max(promoVideos.length, 1)] : null;

                    return (
                      <div key={post.postId}>
                        <PostItem post={post} showCommunity />

                        {showPromo && blog && (
                          <Link href={`/blogs/${blog.blogID}`} className="block mt-4">
                            <div className="flex gap-3 items-start bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
                              <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                                <BookOpen className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">Recommended Blog</p>
                                <p className="text-sm font-semibold text-gray-800 line-clamp-2">{blog.heading}</p>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                  {blog.author.firstName} {blog.author.lastName}
                                </p>
                              </div>
                            </div>
                          </Link>
                        )}

                        {showPromo && video && (
                          <Link href={`/videos/${video.videoID}`} className="block mt-4">
                            <div className="flex gap-3 items-start bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
                              <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-rose-500 flex items-center justify-center">
                                <Play className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider mb-0.5">Recommended Video</p>
                                <p className="text-sm font-semibold text-gray-800 line-clamp-2">{video.title}</p>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                  {video.views?.toLocaleString() ?? 0} views
                                </p>
                              </div>
                            </div>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="hidden lg:flex flex-col gap-4 h-full">
            <DiscoverCommunitiesWidget />
            <FollowedCommunitiesWidget />
            {/* Side footer replaces bottom footer for infinite-scroll layout */}
            <SideFooter />
          </div>
        </div>
      </div>

      {/* Filter popup — rendered outside feed, does NOT resize it */}
      <DiscussionsFilterPopup
        open={showFilterPopup}
        onOpenChange={setShowFilterPopup}
        initialFilters={appliedFilters}
        onApply={setAppliedFilters}
      />
    </div>
  );

  return <ProtectedRoute>{forumsContent}</ProtectedRoute>;
}
