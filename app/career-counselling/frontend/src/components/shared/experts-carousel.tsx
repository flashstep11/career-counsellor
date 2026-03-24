"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, ChevronRight, Users, GraduationCap } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Expert } from "@/types";
import axios from "axios";

// Deterministic gradient per expert based on name
const GRADIENTS = [
  "from-violet-500 to-purple-700",
  "from-blue-500 to-cyan-600",
  "from-rose-500 to-pink-700",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-700",
  "from-indigo-500 to-blue-700",
  "from-fuchsia-500 to-rose-600",
  "from-sky-500 to-indigo-600",
];

function gradientFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

interface ExpertsCarouselProps {
  title?: string;
  limit?: number;
}

export default function ExpertsCarousel({
  title = "Related Experts",
  limit = 8,
}: ExpertsCarouselProps) {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExperts = async () => {
      try {
        const res = await axios.get("/api/experts", {
          params: { limit, sortBy: "rating" },
        });
        const data = res.data;
        const raw: Expert[] = Array.isArray(data) ? data : data.experts ?? [];
        setExperts(raw.slice(0, limit));
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchExperts();
  }, [limit]);

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-violet-500" />
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex-none w-48 h-52 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (experts.length === 0) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-violet-500" />
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <Link
          href="/experts"
          className="flex items-center gap-1 text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors"
        >
          See all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Cards */}
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {experts.map((expert) => {
          const ud = expert.userDetails ?? {};
          const name = `${ud.firstName ?? ""} ${ud.lastName ?? ""}`.trim();
          const initials = `${ud.firstName?.[0] ?? ""}${ud.lastName?.[0] ?? ""}`;
          const gradient = gradientFor(name || expert.expertID);

          return (
            <Link
              key={expert.expertID}
              href={`/experts/${expert.expertID}`}
              className="flex-none w-48 snap-start group"
            >
              <div className="bg-white rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1 flex flex-col">
                {/* Gradient banner */}
                <div className={`bg-gradient-to-br ${gradient} h-16 relative flex-none`}>
                  {/* Rating badge */}
                  {expert.rating > 0 && (
                    <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5 fill-yellow-300 text-yellow-300" />
                      {expert.rating.toFixed(1)}
                    </div>
                  )}
                </div>

                {/* Avatar — bleeds over banner */}
                <div className="flex justify-center -mt-7 mb-2">
                  <Avatar className="h-14 w-14 border-4 border-white shadow-sm">
                    <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white font-bold text-base`}>
                      {initials || "?"}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Info */}
                <div className="px-3 pb-3 flex flex-col items-center text-center gap-0.5 flex-1">
                  <p className="font-bold text-sm line-clamp-1 text-gray-900">{name || "Expert"}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {expert.currentPosition || "Career Expert"}
                  </p>
                  {expert.organization && (
                    <p className="text-xs text-gray-400 line-clamp-1">{expert.organization}</p>
                  )}

                  {/* Students guided */}
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Users className="h-3 w-3" />
                    <span>{expert.studentsGuided ?? 0} guided</span>
                  </div>

                  {/* CTA */}
                  <div className={`mt-3 w-full bg-gradient-to-r ${gradient} text-white text-xs font-semibold py-1.5 rounded-lg text-center group-hover:opacity-90 transition-opacity`}>
                    View Profile
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
