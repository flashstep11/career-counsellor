"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Video,
  FileText,
  MessageSquare,
  Eye,
  Heart,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface TrendingItem {
  id: string;
  type: "video" | "post" | "blog";
  title: string;
  authorName: string;
  views: number;
  likes: number;
  excerpt: string;
  url: string;
  score: number;
}

const TYPE_META: Record<
  TrendingItem["type"],
  { label: string; icon: React.ElementType; color: string; gradient: string }
> = {
  video: {
    label: "Video",
    icon: Video,
    color: "text-red-600",
    gradient: "from-red-500 to-pink-600",
  },
  post: {
    label: "Post",
    icon: MessageSquare,
    color: "text-purple-600",
    gradient: "from-purple-500 to-indigo-600",
  },
  blog: {
    label: "Blog",
    icon: FileText,
    color: "text-blue-600",
    gradient: "from-blue-500 to-cyan-600",
  },
};

function recordView(item: TrendingItem) {
  const token = localStorage.getItem("token");
  if (!token) return;
  fetch("/api/activity/view", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ type: item.type, itemId: item.id, title: item.title }),
  }).catch(() => {});
}

export function TrendingCarousel() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [items, setItems] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/activity/trending?limit=6");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("TrendingCarousel fetch error:", err);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isAutoPlaying || items.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, items.length]);

  const handlePrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handleItemClick = (item: TrendingItem) => {
    recordView(item);
    router.push(item.url);
  };

  if (loading) {
    return (
      <Card className="bg-white rounded-xl shadow-sm border-0 overflow-hidden mb-6">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-5 bg-gray-200 rounded w-40" />
            <div className="h-48 bg-gray-200 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 rounded-xl shadow-md border-0 overflow-hidden mb-6">
        <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
          <TrendingUp className="h-10 w-10 text-orange-400" />
          <p className="text-lg font-semibold text-gray-700">No trending content yet</p>
          <p className="text-sm text-gray-500">
            Trending posts, videos, and blogs will appear here once there is activity.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentItem = items[currentIndex];
  const meta = TYPE_META[currentItem.type] ?? TYPE_META.post;
  const TypeIcon = meta.icon;

  return (
    <Card className="bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 rounded-xl shadow-md border-0 overflow-hidden mb-6">
      <CardContent className="p-0">
        <div className="px-6 py-4 bg-white/60 backdrop-blur-sm border-b border-gray-200/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-bold text-gray-900">Trending Now</h2>
            <span className="ml-auto text-xs text-gray-500">
              {currentIndex + 1} / {items.length}
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <div
              className={`relative rounded-xl overflow-hidden cursor-pointer group bg-gradient-to-br ${meta.gradient} h-64 flex items-center justify-center`}
              onClick={() => handleItemClick(currentItem)}
            >
              <TypeIcon className="h-24 w-24 text-white/30 transition-transform duration-300 group-hover:scale-110" />
              <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full flex items-center gap-1.5 shadow-lg">
                <TypeIcon className={`h-3.5 w-3.5 ${meta.color}`} />
                <span className="text-xs font-semibold text-gray-900">{meta.label}</span>
              </div>
              <div className="absolute bottom-3 right-3 flex gap-2">
                <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full flex items-center gap-1">
                  <Eye className="h-3 w-3 text-white" />
                  <span className="text-xs font-medium text-white">
                    {currentItem.views >= 1000
                      ? `${(currentItem.views / 1000).toFixed(1)}K`
                      : currentItem.views}
                  </span>
                </div>
                <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full flex items-center gap-1">
                  <Heart className="h-3 w-3 text-red-300" />
                  <span className="text-xs font-medium text-white">{currentItem.likes}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <div className="space-y-4">
                <div>
                  <h3
                    className="text-2xl font-bold text-gray-900 mb-2 cursor-pointer hover:text-blue-600 transition-colors line-clamp-2"
                    onClick={() => handleItemClick(currentItem)}
                  >
                    {currentItem.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    by <span className="font-semibold text-gray-900">{currentItem.authorName}</span>
                  </p>
                  <p className="text-gray-700 leading-relaxed line-clamp-3">
                    {currentItem.excerpt}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4" />
                    <span className="font-medium">{currentItem.views.toLocaleString()}</span>
                    <span>views</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span className="font-medium">{currentItem.likes.toLocaleString()}</span>
                    <span>likes</span>
                  </div>
                </div>
                <Button
                  onClick={() => handleItemClick(currentItem)}
                  className="w-full md:w-auto gap-2 bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700"
                >
                  {currentItem.type === "video"
                    ? "Watch Now"
                    : currentItem.type === "blog"
                    ? "Read Blog"
                    : "Read Post"}
                </Button>
              </div>
            </div>
          </div>

          <button
            onClick={handlePrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
          >
            <ChevronRight className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        <div className="flex justify-center gap-2 pb-4 px-6">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => { setCurrentIndex(index); setIsAutoPlaying(false); }}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-8 bg-gradient-to-r from-orange-600 to-pink-600"
                  : "w-2 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
