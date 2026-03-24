"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Play, ChevronRight, Video } from "lucide-react";
import RandomImage from "./random-image";
import { Video as VideoType } from "@/types";
import axios from "axios";

interface VideosCarouselProps {
  title?: string;
  refType?: string;
  typeId?: string;
  limit?: number;
}

export default function VideosCarousel({
  title = "Related Videos",
  refType,
  typeId,
  limit = 10,
}: VideosCarouselProps) {
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const params: Record<string, any> = { limit, sortBy: "views" };
        if (refType && refType !== "NA") params.refType = refType;
        if (typeId) params.typeId = typeId;

        const res = await axios.get("/api/videos", { params });
        const data = res.data;
        const raw: VideoType[] = Array.isArray(data) ? data : data.videos ?? [];
        setVideos(raw.slice(0, limit));
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, [refType, typeId, limit]);

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex-none w-72 h-40 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <Link
          href="/videos"
          className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          See all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Cards — YouTube/Netflix style */}
      <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {videos.map((video) => (
          <Link
            key={video.videoID}
            href={`/videos/${video.videoID}`}
            className="flex-none w-72 snap-start group"
          >
            <div className="relative h-40 rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
              {/* Thumbnail */}
              <RandomImage
                alt={video.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-11 w-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/35 transition-colors">
                  <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                </div>
              </div>

              {/* Top badge */}
              <div className="absolute top-3 left-3">
                <span className="bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                  Video
                </span>
              </div>

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white text-sm font-semibold line-clamp-1 leading-snug mb-0.5">
                  {video.title}
                </p>
                <div className="flex items-center gap-2 text-white/70 text-xs">
                  <span className="line-clamp-1">
                    {video.expertDetails
                      ? `${(video.expertDetails as any)?.userDetails?.firstName ?? ""} ${(video.expertDetails as any)?.userDetails?.lastName ?? ""}`.trim() || "Expert"
                      : "Expert"}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 flex-none">
                    <Eye className="h-3 w-3" />
                    {(video.views ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
