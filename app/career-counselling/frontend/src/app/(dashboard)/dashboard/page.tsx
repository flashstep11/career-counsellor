"use client";

import { useState, useEffect } from "react";
import { FollowedCommunitiesWidget } from "@/components/dashboard/followed-communities-widget";
import { WeeklyGoalsWidget } from "@/components/dashboard/weekly-goals-widget";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { FindMentorQuestionnaire } from "@/components/dashboard/find-mentor-questionnaire";
import { UpcomingEventsWidget } from "@/components/dashboard/upcoming-events-widget";
import {
  FileText,
  Video,
  MessageSquare,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Clock,
  Eye,
  Heart,
  BookOpen,
  ArrowUpRight,
  User,
  Search,
  Star,
  Plus,
} from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Blog, Video as VideoType, Post as ApiPost } from "@/types";
import PostItem from "@/components/communities/post-item";
import axios from "axios";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

const PAGE_SIZE = 5;

interface WeeklyGoal {
  id: number;
  title: string;
  completed: boolean;
}

interface DashboardStats {
  profileStrength: number;
  unreadReplies: number;
  upcomingMeetingsToday: number;
  weeklyGoals: WeeklyGoal[];
}

interface Post {
  postId: string;
  title?: string;
  content: string;
  authorName?: string;
  communityDisplayName?: string;
  createdAt: string;
  likes: number;
  likedBy: string[];
  views: number;
  commentsCount?: number;
  tags?: string[];
}

/* ─── Collapsible feed section ───────────────────────────────── */
function FeedSection({
  title,
  icon,
  children,
  loading,
  hasMore,
  hasLess,
  onMore,
  onLess,
  count,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  loading: boolean;
  hasMore: boolean;
  hasLess: boolean;
  onMore: () => void;
  onLess: () => void;
  count?: number;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2">
          <span className="text-indigo-500">{icon}</span>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        </div>
        {count !== undefined && (
          <span className="text-xs font-medium bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">
            {count}
          </span>
        )}
      </div>
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
          </div>
        ) : (
          <>
            {children}
            <div className="flex gap-2 mt-2">
              {hasMore && (
                <button
                  onClick={onMore}
                  className="flex-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center justify-center gap-1 py-2.5 rounded-xl hover:bg-indigo-50 transition-all border border-dashed border-indigo-200 hover:border-indigo-400"
                >
                  <ChevronDown className="h-4 w-4" />
                  Show more
                </button>
              )}
              {hasLess && (
                <button
                  onClick={onLess}
                  className="flex-1 text-sm text-gray-500 hover:text-gray-700 font-medium flex items-center justify-center gap-1 py-2.5 rounded-xl hover:bg-gray-50 transition-all border border-dashed border-gray-200 hover:border-gray-400"
                >
                  <ChevronUp className="h-4 w-4" />
                  View less
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface HistoryItem {
  type: string;
  itemId: string;
  title: string;
  viewedAt: string;
}

/* ─── Posts section ──────────────────────────────────────────── */
function PostsSection() {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [useHistory, setUseHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    const loadGlobal = () =>
      axios
        .get(`/api/posts?limit=50`)
        .then((res) => {
          const data: Post[] = Array.isArray(res.data) ? res.data : res.data.posts || [];
          const unique = Array.from(new Map(data.map((p) => [p.postId, p])).values());
          setPosts(unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        })
        .catch(() => setPosts([]))
        .finally(() => setLoading(false));

    if (!isAuthenticated) { loadGlobal(); return; }

    const token = localStorage.getItem("token");
    fetch("/api/activity/recent", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: HistoryItem[]) => {
        const items = Array.from(new Map(data.filter((h) => h.type === "post").map((h) => [h.itemId, h])).values());
        if (items.length > 0) { setHistory(items); setUseHistory(true); setLoading(false); }
        else loadGlobal();
      })
      .catch(() => loadGlobal());
  }, [isAuthenticated]);

  const shown = useHistory ? history.slice(0, visible) : posts.slice(0, visible);
  const totalCount = useHistory ? history.length : posts.length;

  return (
    <FeedSection
      title={useHistory ? "Recently Viewed Posts" : "Recent Posts"}
      icon={<MessageSquare className="h-5 w-5" />}
      loading={loading}
      count={totalCount}
      hasMore={visible < totalCount}
      hasLess={visible > PAGE_SIZE}
      onMore={() => setVisible((v) => v + PAGE_SIZE)}
      onLess={() => setVisible(PAGE_SIZE)}
    >
      {shown.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No posts yet</p>
      ) : useHistory ? (
        <div className="space-y-2">
          {(shown as HistoryItem[]).map((item) => (
            <Link key={item.itemId} href={`/posts/${item.itemId}`}>
              <div className="group flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-all duration-200">
                <MessageSquare className="h-4 w-4 text-indigo-400 shrink-0" />
                <p className="text-sm font-medium text-gray-900 line-clamp-2 flex-1 min-w-0">{item.title}</p>
                <span className="text-xs text-gray-400 shrink-0">{formatDistanceToNow(new Date(item.viewedAt), { addSuffix: true })}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-indigo-400 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(shown as Post[]).map((post) => (
            <Link key={post.postId} href={`/posts/${post.postId}`}>
              <div className="group relative flex flex-col gap-2 p-4 rounded-xl border border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md cursor-pointer transition-all duration-200 hover:-translate-y-0.5">
                {/* Top row: community badge + arrow */}
                <div className="flex items-center justify-between gap-2">
                  {post.communityDisplayName ? (
                    <span className="inline-flex items-center text-xs font-medium text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      {post.communityDisplayName}
                    </span>
                  ) : (
                    <span />
                  )}
                  <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                </div>

                {/* Title */}
                <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-indigo-900">
                  {post.title || post.content}
                </p>

                {/* Excerpt from content when title is available */}
                {post.title && post.content && (
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {post.content}
                  </p>
                )}

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Meta row */}
                <div className="flex items-center gap-3 text-xs text-gray-400 pt-1 border-t border-gray-100">
                  {post.authorName && (
                    <span className="flex items-center gap-1 text-gray-500">
                      <User className="h-3 w-3" />{post.authorName}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </span>
                  <span className="flex items-center gap-1 ml-auto">
                    <Heart className="h-3 w-3 text-rose-400" />{post.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />{post.views}
                  </span>
                  {post.commentsCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />{post.commentsCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </FeedSection>
  );
}

/* ─── Blogs section ──────────────────────────────────────────── */
function BlogsSection() {
  const { isAuthenticated } = useAuth();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [useHistory, setUseHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    const loadGlobal = () =>
      axios
        .get(`/api/blogs`, { params: { limit: 50, sortBy: "recent" } })
        .then((res) => {
          const data: Blog[] = res.data.blogs || res.data || [];
          setBlogs(data);
        })
        .catch(() => setBlogs([]))
        .finally(() => setLoading(false));

    if (!isAuthenticated) { loadGlobal(); return; }

    const token = localStorage.getItem("token");
    fetch("/api/activity/recent", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: HistoryItem[]) => {
        const items = Array.from(new Map(data.filter((h) => h.type === "blog").map((h) => [h.itemId, h])).values());
        if (items.length > 0) { setHistory(items); setUseHistory(true); setLoading(false); }
        else loadGlobal();
      })
      .catch(() => loadGlobal());
  }, [isAuthenticated]);

  const shown = useHistory ? history.slice(0, visible) : blogs.slice(0, visible);
  const totalCount = useHistory ? history.length : blogs.length;

  return (
    <FeedSection
      title={useHistory ? "Recently Viewed Blogs" : "Recent Blogs"}
      icon={<FileText className="h-5 w-5" />}
      loading={loading}
      count={totalCount}
      hasMore={visible < totalCount}
      hasLess={visible > PAGE_SIZE}
      onMore={() => setVisible((v) => v + PAGE_SIZE)}
      onLess={() => setVisible(PAGE_SIZE)}
    >
      {shown.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No blogs yet</p>
      ) : useHistory ? (
        <div className="space-y-2">
          {(shown as HistoryItem[]).map((item) => (
            <Link key={item.itemId} href={`/blogs/${item.itemId}`}>
              <div className="group flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer transition-all duration-200">
                <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                <p className="text-sm font-medium text-gray-900 line-clamp-2 flex-1 min-w-0">{item.title}</p>
                <span className="text-xs text-gray-400 shrink-0">{formatDistanceToNow(new Date(item.viewedAt), { addSuffix: true })}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-emerald-400 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(shown as Blog[]).map((blog) => {
            const author = `${blog.author.firstName} ${blog.author.lastName || ""}`.trim();
            const initials = `${blog.author.firstName?.[0] ?? ""}${blog.author.lastName?.[0] ?? ""}`.toUpperCase();
            const readTime = Math.max(1, Math.ceil(blog.body.split(/\s+/).length / 200));
            const excerpt = blog.body.replace(/[#*_`>\[\]]/g, "").slice(0, 120).trim();
            return (
              <Link key={blog.blogID} href={`/blogs/${blog.blogID}`}>
                <div className="group flex flex-col gap-2 p-4 rounded-xl border border-gray-200 bg-gray-50 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md cursor-pointer transition-all duration-200 hover:-translate-y-0.5">
                  {/* Top: read-time pill + arrow */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      <BookOpen className="h-3 w-3" />{readTime} min read
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-emerald-500 transition-colors shrink-0" />
                  </div>

                  {/* Title */}
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-emerald-900">
                    {blog.heading}
                  </p>

                  {/* Excerpt */}
                  {excerpt && (
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {excerpt}{excerpt.length === 120 ? "…" : ""}
                    </p>
                  )}

                  {/* Author + time */}
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      {initials || <User className="h-3 w-3" />}
                    </div>
                    <span className="text-xs font-medium text-gray-600 truncate">{author}</span>
                    <span className="text-xs text-gray-400 ml-auto flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(blog.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </FeedSection>
  );
}

/* ─── Videos section ─────────────────────────────────────────── */
function VideosSection() {
  const { isAuthenticated } = useAuth();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [useHistory, setUseHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    const loadGlobal = () =>
      axios
        .get(`/api/videos`, { params: { limit: 50 } })
        .then((res) => {
          const data: VideoType[] = Array.isArray(res.data) ? res.data : res.data.videos || [];
          setVideos(data);
        })
        .catch(() => setVideos([]))
        .finally(() => setLoading(false));

    if (!isAuthenticated) { loadGlobal(); return; }

    const token = localStorage.getItem("token");
    fetch("/api/activity/recent", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: HistoryItem[]) => {
        const items = Array.from(new Map(data.filter((h) => h.type === "video").map((h) => [h.itemId, h])).values());
        if (items.length > 0) { setHistory(items); setUseHistory(true); setLoading(false); }
        else loadGlobal();
      })
      .catch(() => loadGlobal());
  }, [isAuthenticated]);

  const shown = useHistory ? history.slice(0, visible) : videos.slice(0, visible);
  const totalCount = useHistory ? history.length : videos.length;

  return (
    <FeedSection
      title={useHistory ? "Recently Viewed Videos" : "Recent Videos"}
      icon={<Video className="h-5 w-5" />}
      loading={loading}
      count={totalCount}
      hasMore={visible < totalCount}
      hasLess={visible > PAGE_SIZE}
      onMore={() => setVisible((v) => v + PAGE_SIZE)}
      onLess={() => setVisible(PAGE_SIZE)}
    >
      {shown.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No videos yet</p>
      ) : useHistory ? (
        <div className="space-y-2">
          {(shown as HistoryItem[]).map((item) => (
            <Link key={item.itemId} href={`/videos/${item.itemId}`}>
              <div className="group flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50 hover:border-violet-300 hover:bg-violet-50 cursor-pointer transition-all duration-200">
                <Video className="h-4 w-4 text-violet-500 shrink-0" />
                <p className="text-sm font-medium text-gray-900 line-clamp-2 flex-1 min-w-0">{item.title}</p>
                <span className="text-xs text-gray-400 shrink-0">{formatDistanceToNow(new Date(item.viewedAt), { addSuffix: true })}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-violet-400 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(shown as VideoType[]).map((video) => (
            <Link key={video.videoID} href={`/videos/${video.videoID}`}>
              <div className="group flex flex-col gap-2 p-4 rounded-xl border border-gray-200 bg-gray-50 hover:border-violet-300 hover:bg-violet-50 hover:shadow-md cursor-pointer transition-all duration-200 hover:-translate-y-0.5">
                {/* Tags + arrow */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {video.tags?.slice(0, 2).map((t) => (
                      <span key={t} className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-violet-500 transition-colors shrink-0" />
                </div>
                {/* Title */}
                <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-violet-900">
                  {video.title}
                </p>
                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-gray-400 pt-1 border-t border-gray-100">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />{video.views} views
                  </span>
                  <span className="flex items-center gap-1 ml-auto">
                    <Heart className="h-3 w-3 text-rose-400" />{video.likes}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </FeedSection>
  );
}

/* ─── My Feed (user's own posts/blogs/videos) ────────────────── */
function MyFeedSection() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const promises: Promise<void>[] = [];

    promises.push(
      fetch(`/api/users/${user._id}/posts?limit=100`, { headers })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setPosts(Array.isArray(data) ? data : []))
        .catch(() => setPosts([]))
    );

    if (user.isExpert && user.expertId) {
      promises.push(
        fetch(`/api/experts/${user.expertId}/blogs?limit=50`, { headers })
          .then((r) => (r.ok ? r.json() : {}))
          .then((data: { blogs?: Blog[] }) => setBlogs(Array.isArray(data.blogs) ? data.blogs : []))
          .catch(() => setBlogs([]))
      );
      promises.push(
        fetch(`/api/experts/${user.expertId}/videos?limit=50`, { headers })
          .then((r) => (r.ok ? r.json() : {}))
          .then((data: { videos?: VideoType[] }) => setVideos(Array.isArray(data.videos) ? data.videos : []))
          .catch(() => setVideos([]))
      );
    }

    Promise.all(promises).finally(() => setLoading(false));
  }, [user?._id, user?.isExpert, user?.expertId]);

  type FeedEntry =
    | { kind: "post"; data: ApiPost }
    | { kind: "blog"; data: Blog }
    | { kind: "video"; data: VideoType };

  const feed: FeedEntry[] = [
    ...posts.map((p) => ({ kind: "post" as const, data: p })),
    ...blogs.map((b) => ({ kind: "blog" as const, data: b })),
    ...videos.map((v) => ({ kind: "video" as const, data: v })),
  ].sort(
    (a, b) =>
      new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Posts</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {feed.length} {feed.length === 1 ? "item" : "items"}
          </p>
        </div>
        <Link href="/forums">
          <button className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition-colors">
            <Plus className="h-4 w-4" />
            New Post
          </button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
        </div>
      ) : feed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium mb-1">No posts yet</p>
          <p className="text-sm text-gray-400 mb-5">
            Share your thoughts with the community
          </p>
          <Link href="/forums">
            <button className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-colors">
              <Plus className="h-4 w-4" />
              Create your first post
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map((entry) => {
            if (entry.kind === "post") {
              return (
                <PostItem key={entry.data.postId} post={entry.data} showCommunity />
              );
            }
            if (entry.kind === "blog") {
              const blog = entry.data;
              const readTime = Math.max(1, Math.ceil(blog.body.split(/\s+/).length / 200));
              const excerpt = blog.body.replace(/[#*_`>[\]]/g, "").slice(0, 120).trim();
              return (
                <Link key={blog.blogID} href={`/blogs/${blog.blogID}`}>
                  <div className="group bg-white border border-gray-100 hover:border-emerald-200 rounded-2xl shadow-sm hover:shadow-md transition-all p-5">
                    <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <BookOpen className="h-3 w-3" /> Blog · {readTime} min read
                      </span>
                      <span className="ml-auto flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(blog.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors mb-1.5 line-clamp-2">
                      {blog.heading}
                    </h3>
                    {excerpt && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                        {excerpt}{excerpt.length === 120 ? "…" : ""}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Eye className="h-3.5 w-3.5" />
                      <span>{blog.views || 0} views</span>
                    </div>
                  </div>
                </Link>
              );
            }
            if (entry.kind === "video") {
              const video = entry.data;
              return (
                <Link key={video.videoID} href={`/videos/${video.videoID}`}>
                  <div className="group bg-white border border-gray-100 hover:border-violet-200 rounded-2xl shadow-sm hover:shadow-md transition-all p-5">
                    <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
                        <Video className="h-3 w-3" /> Video
                      </span>
                      <span className="ml-auto flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-violet-700 transition-colors mb-1.5 line-clamp-2">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{video.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />{video.views || 0} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" />{video.likes || 0}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Main Dashboard ─────────────────────────────────────────── */
export default function UserDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [showMentorQuestionnaire, setShowMentorQuestionnaire] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/user/dashboard-stats`
        );
        setStats(response.data);
      } catch {
        setStats({ profileStrength: 0, unreadReplies: 0, upcomingMeetingsToday: 0, weeklyGoals: [] });
      }
    };
    fetchStats();
  }, [isAuthenticated]);

  const dashboardContent = (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Find Mentor Questionnaire Modal */}
      {showMentorQuestionnaire && (
        <FindMentorQuestionnaire onClose={() => setShowMentorQuestionnaire(false)} />
      )}

      {/* Hero Section — single unified card, all 3 columns horizontal */}
      <div className="w-full max-w-[1800px] px-6 sm:px-8 lg:px-12 pb-4">
        <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-3xl shadow-lg overflow-hidden">
          <div className="flex flex-col lg:flex-row">

            {/* Left — Welcome */}
            <div className="flex-1 p-7">
              <WelcomeHeader
                userName={user?.firstName}
                userLastName={user?.lastName}
                profilePictureUrl={
                  typeof user?.profile_picture_url === "string"
                    ? user.profile_picture_url
                    : null
                }
                unreadReplies={stats?.unreadReplies}
                upcomingMeetingsToday={stats?.upcomingMeetingsToday}
              />
            </div>

            {/* Right — Find Mentor stacked above Upcoming Meetings */}
            <div className="lg:w-80 p-6 flex flex-col gap-3">
              {/* Become an Expert */}
              {user && !user.isExpert && (
                <Link
                  href="/become-expert"
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold px-4 py-2.5 rounded-2xl shadow-md hover:shadow-lg transition-all ring-1 ring-amber-300/60"
                >
                  <Star className="h-4 w-4 fill-white" />
                  Become an Expert
                </Link>
              )}

              {/* Find Mentor */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 shadow-md text-white">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-0.5">Career Support</p>
                <h3 className="text-base font-bold mb-1">Find a Mentor</h3>
                <p className="text-xs text-blue-100 leading-snug mb-3">
                  Get personalised guidance from industry experts and alumni.
                </p>
                <button
                  onClick={() => setShowMentorQuestionnaire(true)}
                  className="w-full bg-white text-blue-700 font-semibold text-sm py-2 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Find Mentor
                </button>
              </div>

              {/* Upcoming Meetings */}
              <UpcomingEventsWidget />
            </div>

          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 w-full max-w-[1800px] px-6 sm:px-8 lg:px-12 pb-40">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column — My Feed */}
          <div className="lg:col-span-2">
            <MyFeedSection />
          </div>

          {/* Right Column — Sidebar Widgets */}
          <div className="lg:col-span-1 space-y-6">
            {/* Followed Communities */}
            <FollowedCommunitiesWidget />

            {/* Weekly Goals */}
            {stats && stats.weeklyGoals.length > 0 && (
              <WeeklyGoalsWidget goals={stats.weeklyGoals} />
            )}

            {/* Recently Viewed */}
            <PostsSection />
            <BlogsSection />
            <VideosSection />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ProtectedRoute>{dashboardContent}</ProtectedRoute>
  );
}
