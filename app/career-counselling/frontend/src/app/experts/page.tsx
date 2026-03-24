"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertCircle, RefreshCw, TrendingUp, History, Users, Star, GraduationCap, CheckCircle, Calendar } from "lucide-react";
import axios from "axios";
import Link from "next/link";
import ExpertCard, { ExpertCardSkeleton } from "@/components/experts/expert-card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Expert } from "@/types";
import { ExpertsFilterSidebar } from "@/components/experts/experts-filter-sidebar";
import BlogsCarousel from "@/components/shared/blogs-carousel";
import VideosCarousel from "@/components/shared/videos-carousel";
import FollowButton from "@/components/experts/follow";

// Main Experts Page Component
export default function ExpertsPage() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retries, setRetries] = useState(0);
  const [savedPreferences, setSavedPreferences] = useState<any>(null);
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);

  // Simplified filters state
  const [filters, setFilters] = useState({
    fields: [],
    goals: [],
    educationLevel: "",
    availability: "all",
    sortBy: "rating",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(8);

  const [topRatedExperts, setTopRatedExperts] = useState<Expert[]>([]);
  const [featuredExpert, setFeaturedExpert] = useState<Expert | null>(null);
  const [lastViewedExperts, setLastViewedExperts] = useState<
    { expertID: string; name: string; currentPosition: string; rating: number }[]
  >([]);

  const fetchExperts = async () => {
    setLoading(true);
    setError("");

    try {
      // Build query parameters based on filters
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      // Add filters to query params
      if (filters.availability !== "all") {
        params.availability = filters.availability;
      }

      if (filters.sortBy && filters.sortBy !== "none") {
        params.sortBy = filters.sortBy;
      }

      // Add field filters
      if (filters.fields && filters.fields.length > 0) {
        params.fields = filters.fields.join(',');
      }

      // Add goal filters
      if (filters.goals && filters.goals.length > 0) {
        params.goals = filters.goals.join(',');
      }

      // Add education level filter
      if (filters.educationLevel) {
        params.educationLevel = filters.educationLevel;
      }

      const response = await axios.get(`/api/experts`, { params });
      const data = response.data;

      // Handle both paginated and non-paginated responses
      if (data.experts && typeof data.total !== "undefined") {
        // Paginated response
        setExperts(data.experts);
        setTotalPages(Math.ceil(data.total / itemsPerPage));
      } else {
        // Non-paginated response (array of experts)
        setExperts(Array.isArray(data) ? data : []);
        setTotalPages(
          Math.ceil((Array.isArray(data) ? data.length : 0) / itemsPerPage)
        );
      }
    } catch (err: any) {
      console.error("Error fetching experts:", err);

      // Provide more specific error messages based on the error type
      if (err.response) {
        // Server responded with an error status code
        const statusText = err.response.status ? ` (${err.response.status})` : '';
        const message = err.response.data && typeof err.response.data === 'object' && err.response.data.message
          ? err.response.data.message
          : 'Failed to load experts';
        setError(`Server error${statusText}: ${message}`);
      } else if (err.request) {
        // Request was made but no response was received
        setError("Network error: Unable to connect to the server. Please check your connection.");
      } else {
        // Something else happened while setting up the request
        setError("Failed to load experts. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset filters function
  const resetFilters = () => {
    setFilters({
      fields: [],
      goals: [],
      educationLevel: "",
      availability: "all",
      sortBy: "rating",
    });
    setCurrentPage(1);
  };

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const fetchTopRated = useCallback(async () => {
    try {
      const res = await axios.get("/api/experts", { params: { limit: 10, sortBy: "rating" } });
      const data = res.data;
      const raw: Expert[] = Array.isArray(data) ? data : data.experts ?? [];
      setTopRatedExperts(raw.slice(0, 10));
      if (raw.length > 0) setFeaturedExpert(raw[0]);
    } catch { /* non-critical */ }
  }, []);

  // Load last viewed from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("lastViewedExperts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setLastViewedExperts(parsed.slice(0, 8));
      }
    } catch { /* ignore */ }
  }, []);

  // Load saved preferences
  useEffect(() => {
    const loadPreferences = () => {
      try {
        const saved = localStorage.getItem("mentorPreferences");
        if (saved) {
          setSavedPreferences(JSON.parse(saved));
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
      }
    };
    loadPreferences();
  }, []);

  // Retry handler
  const handleRetry = () => {
    setRetries(prev => prev + 1);
    fetchExperts();
  };

  useEffect(() => {
    fetchExperts();
  }, [currentPage, itemsPerPage, filters]);

  useEffect(() => {
    fetchTopRated();
  }, [fetchTopRated]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading && experts.length === 0) {
    // Show skeleton loading state
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">Our Experts</h1>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <div className="pb-16 sticky top-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Filters</h2>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24 mb-2" />
                  <div className="h-10 w-full rounded-md bg-gray-200 animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-28 mb-2" />
                  <div className="h-10 w-full rounded-md bg-gray-200 animate-pulse"></div>
                </div>
              </div>
            </div>
          </aside>
          <main className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(6)].map((_, index) => (
                <ExpertCardSkeleton key={index} />
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">Our Experts</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-red-700 mb-2">Unable to Load Experts</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <Button
            onClick={handleRetry}
            className="gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Retrying..." : "Retry"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-2 pb-8">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-3xl font-bold">Discover Experts</h1>
      </div>

      {/* ── Featured Expert ────────────────────────────────────────── */}
      {currentPage === 1 && featuredExpert && (() => {
        const ud = featuredExpert.userDetails || {} as any;
        const name = `${ud.firstName || ""} ${ud.lastName || ""}`.trim();
        const gradients = ["from-violet-500 to-purple-700", "from-blue-500 to-cyan-700", "from-emerald-500 to-teal-700", "from-orange-500 to-red-600", "from-pink-500 to-rose-700", "from-indigo-500 to-violet-700"];
        const grad = gradients[(name.charCodeAt(0) || 0) % gradients.length];
        const isVerified = featuredExpert.rating >= 4.0 || featuredExpert.studentsGuided > 10;
        return (
          <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-r ${grad} shadow-xl mb-8`}>
            <div className="flex flex-col md:flex-row items-center gap-6 p-8">
              {/* Avatar */}
              <Link href={`/experts/${featuredExpert.expertID}`} className="relative shrink-0">
                <Avatar className="h-28 w-28 border-4 border-white/40 shadow-2xl">
                  <AvatarFallback className="bg-white/20 text-white text-3xl font-bold">
                    {`${ud.firstName?.[0] || ""}${ud.lastName?.[0] || ""}`}
                  </AvatarFallback>
                </Avatar>
                {featuredExpert.available && (
                  <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-green-400 ring-2 ring-white" />
                )}
              </Link>
              {/* Info */}
              <Link href={`/experts/${featuredExpert.expertID}`} className="flex-1 text-white text-center md:text-left group">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                  <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">⭐ Featured Expert</span>
                  {isVerified && <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Verified</span>}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-1 group-hover:underline underline-offset-2">{name}</h2>
                <p className="text-white/80 text-sm mb-1">{featuredExpert.currentPosition}</p>
                <p className="text-white/60 text-xs mb-3">{featuredExpert.organization}</p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
                  <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-yellow-300 text-yellow-300" /><span className="font-semibold">{featuredExpert.rating?.toFixed(1)}</span></span>
                  <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-white/70" />{featuredExpert.studentsGuided} students guided</span>
                  <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-white/70" />Since {new Date(featuredExpert.createdAt).getFullYear()}</span>
                </div>
              </Link>
              {/* CTA */}
              <div className="flex flex-col gap-2 shrink-0">
                <Link href={`/experts/${featuredExpert.expertID}`} className="bg-white text-gray-900 font-semibold text-sm px-5 py-2.5 rounded-full shadow hover:shadow-lg transition-shadow text-center">
                  View Profile
                </Link>
                <Link
                  href={`/experts/${featuredExpert.expertID}#book-meeting`}
                  className="flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 text-white font-semibold text-sm px-5 py-2.5 rounded-full border border-white/40 transition-colors text-center"
                >
                  <Calendar className="h-4 w-4" />
                  Book Meeting
                </Link>
                <FollowButton
                  targetUserId={featuredExpert.userId}
                  className="!rounded-full !text-sm !px-5 !py-2.5 !bg-white/10 hover:!bg-white/20 !text-white !border !border-white/30 !font-semibold"
                />
                {featuredExpert.meetingCost && (
                  <span className="bg-white/10 text-white text-xs text-center px-4 py-1.5 rounded-full border border-white/20">
                    {featuredExpert.meetingCost.toLocaleString("en-IN")} coins/hr
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Recently Viewed ────────────────────────────────────────── */}
      {currentPage === 1 && lastViewedExperts.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <History className="h-5 w-5 text-gray-500" />
            <h2 className="text-xl font-bold">Recently Viewed</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {lastViewedExperts.map((e) => (
              <Link key={e.expertID} href={`/experts/${e.expertID}`} className="flex-none w-56 snap-start group">
                <div className="border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-all duration-200 bg-white">
                  <Avatar className="h-12 w-12 mb-3 border-2 border-gray-100">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">
                      {e.name?.[0] || "E"}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">{e.name}</p>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{e.currentPosition}</p>
                  {e.rating > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium text-yellow-700">{e.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Top Rated — Reddit-style quick-action cards ────────────── */}
      {currentPage === 1 && topRatedExperts.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-bold">Top Rated Experts</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {topRatedExperts.map((expert) => {
              const ud = expert.userDetails || {} as any;
              const name = `${ud.firstName || ""} ${ud.lastName || ""}`.trim();
              const gradients = ["from-violet-500 to-purple-700", "from-blue-500 to-cyan-700", "from-emerald-500 to-teal-700", "from-orange-500 to-red-600", "from-pink-500 to-rose-700", "from-indigo-500 to-violet-700", "from-teal-500 to-emerald-700", "from-amber-500 to-orange-600"];
              const grad = gradients[(name.charCodeAt(0) || 0) % gradients.length];
              const isVerified = expert.rating >= 4.0 || expert.studentsGuided > 10;
              return (
                <div key={expert.expertID} className="flex-none w-64 snap-start bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col">
                  {/* Banner */}
                  <div className={`h-16 bg-gradient-to-r ${grad} relative`}>
                    <Avatar className="absolute -bottom-5 left-4 h-12 w-12 border-3 border-white shadow-md ring-2 ring-white">
                      <AvatarFallback className={`bg-gradient-to-br ${grad} text-white font-bold text-sm`}>
                        {`${ud.firstName?.[0] || ""}${ud.lastName?.[0] || ""}`}
                      </AvatarFallback>
                    </Avatar>
                    {expert.available && (
                      <div className="absolute bottom-1 left-14 h-3 w-3 rounded-full bg-green-400 ring-1 ring-white" />
                    )}
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/30 text-white text-xs px-1.5 py-0.5 rounded-full">
                      <Star className="h-3 w-3 fill-yellow-300 text-yellow-300" />
                      {expert.rating?.toFixed(1)}
                    </div>
                  </div>
                  {/* Card body */}
                  <div className="pt-7 px-4 pb-4 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      {/* Name + tick grouped tightly */}
                      <span className="flex items-center gap-0.5 min-w-0">
                        <p className="text-sm font-bold text-gray-900 line-clamp-1">{name}</p>
                        {isVerified && <CheckCircle className="h-3.5 w-3.5 fill-blue-600 text-white shrink-0" />}
                      </span>
                      {/* Follow button pushed to the right */}
                      <FollowButton
                        targetUserId={expert.userId}
                        className="!h-6 !text-[10px] !px-2 !py-0 !rounded-full !font-semibold shrink-0 ml-auto"
                      />
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1 mb-0.5">{expert.currentPosition}</p>
                    <p className="text-xs text-gray-400 line-clamp-1 mb-3">{expert.organization}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                      <Users className="h-3 w-3" />
                      <span>{expert.studentsGuided} students guided</span>
                    </div>
                    {/* Quick actions */}
                    <div className="flex gap-2 mt-auto">
                      <Link href={`/experts/${expert.expertID}`} className="flex-1 text-center text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-full transition-colors">
                        View Profile
                      </Link>
                      <Link href={`/experts/${expert.expertID}#book-meeting`} className="flex-1 text-center text-xs font-semibold border border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-600 py-1.5 rounded-full transition-colors">
                        Book Meeting
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Browse All ─────────────────────────────────────────────── */}
      {currentPage === 1 && (
        <div className="flex items-center gap-3 mb-6">
          <GraduationCap className="h-5 w-5 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-700">Browse All</h2>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      )}

      <div className={`grid grid-cols-1 gap-6 ${isFilterCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-4'}`}>
        {!isFilterCollapsed && (
          <aside className="lg:col-span-1">
            <ExpertsFilterSidebar
              onFiltersChange={handleFiltersChange}
              savedPreferences={savedPreferences}
              isCollapsed={isFilterCollapsed}
              onToggleCollapse={() => setIsFilterCollapsed(!isFilterCollapsed)}
            />
          </aside>
        )}

        <main className={`${isFilterCollapsed ? 'lg:col-span-1' : 'lg:col-span-3'} relative`}>
          {isFilterCollapsed && (
            <div className="mb-4">
              <ExpertsFilterSidebar
                onFiltersChange={handleFiltersChange}
                savedPreferences={savedPreferences}
                isCollapsed={isFilterCollapsed}
                onToggleCollapse={() => setIsFilterCollapsed(!isFilterCollapsed)}
              />
            </div>
          )}

          {loading && experts.length > 0 && (
            <div className="absolute inset-0 flex justify-center items-start z-10 bg-white/80 pt-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
                {[...Array(4)].map((_, i) => <ExpertCardSkeleton key={i} />)}
              </div>
            </div>
          )}

          {experts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No experts found with the selected filters.</p>
              <Button onClick={resetFilters} className="mt-4">Reset Filters</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {experts.map((expert) => (
                <ExpertCard key={expert.expertID} expert={expert} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                {currentPage > 1 && (
                  <PaginationItem>
                    <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} />
                  </PaginationItem>
                )}
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage >= 3) pageNum = currentPage - 3 + i;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(pageNum); }} isActive={currentPage === pageNum}>
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                {currentPage < totalPages && (
                  <PaginationItem>
                    <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </main>
      </div>

      {/* ── Bottom Carousels ───────────────────────────────────────── */}
      <section className="mt-12 space-y-10 border-t border-gray-100 pt-8">
        <BlogsCarousel title="Related Blogs" />
        <VideosCarousel title="Related Videos" />
      </section>
    </div>
  );
}
