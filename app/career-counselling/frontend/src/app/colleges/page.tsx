"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import CollegeCard from "@/components/colleges/college-card";
import CollegeFilters from "@/components/colleges/college-filters";
import CollegeSorting from "@/components/colleges/college-sorting";
import { College } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { SkeletonCardGrid } from "@/components/shared/loading-indicator";
import { Building2, Sparkles, RefreshCcw, Search } from "lucide-react";
import PredictorFilters, { Filters } from "@/components/predictor/predictor-filters";
import PredictorCard from "@/components/predictor/predictor-card";
import { Skeleton } from "@/components/ui/skeleton";

type Tab = "explore" | "predictor";

export default function CollegesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("explore");

  // ── Explore tab state ───────────────────────────────────────────
  const [filters, setFilters] = useState({
    state: "",
    course: "",
    landArea: 0,
    placement: 0,
    type: "",
    locality_type: "",
    ranking: "",
  });
  const [sortOptions, setSortOptions] = useState<{
    fields: { field: string; order: "asc" | "desc"; priority: number }[];
  }>({ fields: [] });
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);

  const resetFilters = () => {
    setFilters({ state: "", course: "", landArea: 0, placement: 0, type: "", locality_type: "", ranking: "" });
    setSortOptions({ fields: [] });
    setCurrentPage(1);
  };

  const fetchColleges = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        landArea: filters.landArea || undefined,
        placement: filters.placement || undefined,
        college_type: filters.type || undefined,
        locality_type: filters.locality_type || undefined,
        state: filters.state && filters.state !== "All States" ? filters.state : undefined,
        course_category: filters.course && filters.course !== "All Courses" ? filters.course : undefined,
        sort: sortOptions.fields.map((f) => `${f.field}:${f.order}`).join(","),
      };
      const response = await axios.get("/api/colleges/", { params });
      if (response.data && response.data.colleges) {
        setColleges(response.data.colleges);
        setTotalPages(response.data.totalPages || Math.ceil(response.data.total / itemsPerPage) || 1);
      } else {
        setColleges(Array.isArray(response.data) ? response.data : []);
        setTotalPages(1);
      }
    } catch (error: any) {
      console.error("Error fetching colleges:", error);
      setColleges([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, sortOptions, itemsPerPage]);

  useEffect(() => { fetchColleges(); }, [fetchColleges]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Predictor tab state ─────────────────────────────────────────
  const [predictorFilters, setPredictorFilters] = useState<Filters>({
    category: "",
    gender: "",
    homeState: "",
    state: "",
    branch: "",
    localityType: "",
    avgPackage: [0, 100],
    genderRatio: [0, 1],
    nirfRanking: [0, 100],
    distance: [0, 2500],
    hIndex: [0, 150],
    exams: {},
  });
  const [predictions, setPredictions] = useState<any[]>([]);
  const [predictorLoading, setPredictorLoading] = useState(false);
  const [predictorError, setPredictorError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userData, setUserData] = useState({ category: "", gender: "", homeState: "" });
  const [userDataLoading, setUserDataLoading] = useState(true);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => setLocationError("Unable to get your location. Distance filtering will be disabled.")
      );
    } else {
      setLocationError("Geolocation not supported. Distance filtering will be disabled.");
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios.get("/api/profile-minimal", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setUserData(res.data))
      .catch(() => {})
      .finally(() => setUserDataLoading(false));
  }, []);

  const resetPredictorFilters = () => {
    setPredictorFilters({
      category: "", gender: "", homeState: "", state: "", branch: "", localityType: "",
      avgPackage: [0, 100], genderRatio: [0, 1], nirfRanking: [0, 100],
      distance: [0, 2500], hIndex: [0, 150], exams: {},
    });
    setPredictions([]);
    setPredictorError(null);
  };

  const toggleExam = (exam: string, checked: boolean) => {
    setPredictorFilters((prev) => {
      const updatedExams = { ...prev.exams };
      if (checked) updatedExams[exam] = 0; else delete updatedExams[exam];
      return { ...prev, exams: updatedExams };
    });
  };

  const updateExamRank = (exam: string, rank: number) => {
    setPredictorFilters((prev) => ({ ...prev, exams: { ...prev.exams, [exam]: rank } }));
  };

  const handlePredict = async () => {
    if (Object.keys(predictorFilters.exams).length === 0) {
      alert("Please enter rank for at least one exam");
      return;
    }
    setPredictorLoading(true);
    setPredictorError(null);
    const token = localStorage.getItem("token");
    const normalizedExamRanks = Object.fromEntries(
      Object.entries(predictorFilters.exams).map(([exam, rank]) => [
        exam.toLowerCase().trim().replace(/\s+/g, "-"), rank,
      ])
    );
    const payload = {
      exam_ranks: normalizedExamRanks,
      preferred_state: predictorFilters.state === "" || predictorFilters.state === "All States" ? null : predictorFilters.state,
      locality: predictorFilters.localityType === "" ? null : predictorFilters.localityType,
      preferred_branches: predictorFilters.branch === "" || predictorFilters.branch === "All Branches" ? null : predictorFilters.branch,
      placement_range: predictorFilters.avgPackage[0] === 0 && predictorFilters.avgPackage[1] === 100 ? null : predictorFilters.avgPackage,
      gender_ratio_range: predictorFilters.genderRatio[0] === 0 && predictorFilters.genderRatio[1] === 1 ? null : predictorFilters.genderRatio,
      nirf_ranking_range: predictorFilters.nirfRanking[0] === 0 && predictorFilters.nirfRanking[1] === 100 ? null : predictorFilters.nirfRanking,
      h_index_range: predictorFilters.hIndex[0] === 0 && predictorFilters.hIndex[1] === 150 ? null : predictorFilters.hIndex,
      distance_range: !userLocation || (predictorFilters.distance[0] === 0 && predictorFilters.distance[1] === 2500)
        ? null
        : { min_distance: predictorFilters.distance[0], max_distance: predictorFilters.distance[1], user_location: userLocation },
      skip: 0,
      limit: 30,
    };
    try {
      const response = await axios.post("/api/colleges/predict", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPredictions(response.data);
    } catch (error: any) {
      setPredictorError(error.response?.data?.detail || "An error occurred while fetching predictions");
    } finally {
      setPredictorLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden -mx-6 px-6">

      {/* Tab bar */}
      <div className="flex items-end gap-1 pt-5 pb-0 flex-shrink-0 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("explore")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-t-lg border border-b-0 transition-colors ${
            activeTab === "explore"
              ? "bg-white border-gray-200 text-gray-900 -mb-px"
              : "bg-gray-50 border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Explore Colleges
        </button>
        <button
          onClick={() => setActiveTab("predictor")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-t-lg border border-b-0 transition-colors ${
            activeTab === "predictor"
              ? "bg-white border-gray-200 text-gray-900 -mb-px"
              : "bg-gray-50 border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          College Predictor
        </button>
      </div>

      {/* ── Explore Colleges tab ─────────────────────────────────── */}
      {activeTab === "explore" && (
        <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0 pt-5 pb-6">
          <aside className="lg:w-1/4 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-lg font-semibold">Filters</h2>
              <Button variant="default" size="sm" onClick={resetFilters}
                className="bg-black text-white hover:bg-gray-800 text-xs">
                Reset All
              </Button>
            </div>
            <div className="overflow-y-auto flex-1 pr-2 [scrollbar-width:thin]">
              <CollegeFilters filters={filters} onChange={setFilters} />
            </div>
          </aside>

          <main className="lg:w-3/4 overflow-y-auto relative">
            {loading ? (
              <SkeletonCardGrid count={6} columns="grid-cols-1 md:grid-cols-2" />
            ) : (
              <>
                <CollegeSorting sortOptions={sortOptions} onChange={setSortOptions} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {colleges.map((college) => (
                    <CollegeCard
                      key={college.collegeID}
                      college={{
                        collegeID: college.collegeID,
                        name: college.name,
                        address: college.address || "Location not specified",
                        type: college.type || "Not specified",
                        yearOfEstablishment: college.yearOfEstablishment || -1,
                        landArea: college.landArea || -1,
                        placement: college.placement || -1,
                        placementMedian: college.placementMedian || -1,
                      }}
                    />
                  ))}
                </div>
                {colleges.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No colleges found matching your filters.</p>
                  </div>
                )}
                <Pagination className="mt-8">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#"
                        onClick={(e) => { e.preventDefault(); if (currentPage > 1) handlePageChange(currentPage - 1); }}
                        className={currentPage <= 1 ? "opacity-50 pointer-events-none" : ""}
                      />
                    </PaginationItem>
                    {currentPage >= 3 && (
                      <>
                        <PaginationItem>
                          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(1); }}>1</PaginationLink>
                        </PaginationItem>
                        <PaginationItem><PaginationEllipsis /></PaginationItem>
                      </>
                    )}
                    {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      let pageNum = currentPage - 1 + i;
                      if (currentPage <= 2) pageNum = i + 1;
                      else if (currentPage >= totalPages - 1) pageNum = totalPages - 2 + i;
                      if (pageNum <= 0 || pageNum > totalPages) return null;
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink href="#"
                            onClick={(e) => { e.preventDefault(); handlePageChange(pageNum); }}
                            isActive={currentPage === pageNum}
                          >{pageNum}</PaginationLink>
                        </PaginationItem>
                      );
                    }).filter(Boolean)}
                    {currentPage < totalPages - 2 && <PaginationItem><PaginationEllipsis /></PaginationItem>}
                    {totalPages > 3 && currentPage < totalPages - 1 && (
                      <PaginationItem>
                        <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(totalPages); }}>{totalPages}</PaginationLink>
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationNext href="#"
                        onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) handlePageChange(currentPage + 1); }}
                        className={currentPage >= totalPages ? "opacity-50 pointer-events-none" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </>
            )}
          </main>
        </div>
      )}

      {/* ── College Predictor tab ────────────────────────────────── */}
      {activeTab === "predictor" && (
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 pt-5 pb-6">
          {/* Predictor filters sidebar */}
          <aside className="lg:w-1/3 xl:w-1/4 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-3 flex-shrink-0">
              <h2 className="text-lg font-semibold">Filters</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={resetPredictorFilters} className="h-8">
                  <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Reset
                </Button>
                <Button size="sm" onClick={handlePredict} className="h-8" disabled={predictorLoading}>
                  <Search className="h-3.5 w-3.5 mr-1" />
                  {predictorLoading ? "Predicting…" : "Predict"}
                </Button>
              </div>
            </div>
            {locationError && (
              <div className="mb-3 p-2 bg-yellow-50 text-yellow-800 text-xs rounded flex-shrink-0">
                {locationError}
              </div>
            )}
            <div className="overflow-y-auto flex-1 pr-2 [scrollbar-width:thin]">
              {userDataLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : (
                <PredictorFilters
                  userData={{ ...userData, location: userLocation || undefined }}
                  filters={predictorFilters}
                  onChange={setPredictorFilters}
                  toggleExam={toggleExam}
                  updateExamRank={updateExamRank}
                />
              )}
            </div>
          </aside>

          {/* Predictor results */}
          <main className="lg:w-2/3 xl:w-3/4 overflow-y-auto">
            <div className="mb-4 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-800">
                {predictorLoading
                  ? "Analyzing your preferences…"
                  : predictions.length > 0
                  ? `${predictions.length} college${predictions.length !== 1 ? "s" : ""} match your criteria`
                  : "Enter your exam rank and click Predict"}
              </h2>
              {!predictorLoading && predictions.length === 0 && !predictorError && (
                <p className="text-sm text-gray-500 mt-1">
                  Add at least one exam score (JEE Advanced / JEE Mains) and hit Predict to get recommendations tailored to your rank and preferences.
                </p>
              )}
            </div>

            {predictorError && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm mb-4">
                {predictorError}
              </div>
            )}

            {predictorLoading ? (
              <div className="grid grid-cols-1 gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg border p-5 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : predictions.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {predictions.map((prediction, index) => (
                  <PredictorCard key={index} prediction={prediction} />
                ))}
              </div>
            ) : null}
          </main>
        </div>
      )}
    </div>
  );
}
