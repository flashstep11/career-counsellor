"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import PredictorFilters, { Filters } from "@/components/predictor/predictor-filters";
import PredictorCard from "@/components/predictor/predictor-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCcw, Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserData {
  category: string;
  gender: string;
  homeState: string;
  location?: { latitude: number; longitude: number };
}

export default function PredictorPage() {
  const [userData, setUserData] = useState<UserData>({
    category: "Not available",
    gender: "Not available",
    homeState: "Not available",
  });

  // Filters state (matches Filters interface)
  const [filters, setFilters] = useState<Filters>({
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
    hIndex: [0, 150], // Initialize h-index filter
    exams: {},
  });

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userDataLoading, setUserDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError("Unable to get your location. Distance filtering will be disabled.");
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser. Distance filtering will be disabled.");
    }
  }, []);

  // Update userData with location when it becomes available
  useEffect(() => {
    if (userLocation && userData) {
      // Only update if location changed to prevent infinite loops
      if (!userData.location ||
        userData.location.latitude !== userLocation.latitude ||
        userData.location.longitude !== userLocation.longitude) {
        setUserData((prev) => ({ ...prev, location: userLocation }));
      }
    }
  }, [userLocation]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setUserDataLoading(true);
    axios
      .get("/api/profile-minimal", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setUserData(res.data);
      })
      .catch((err) => console.error("Error fetching user data:", err))
      .finally(() => setUserDataLoading(false));
  }, []);

  const fetchPredictedPredictions = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");

    const normalizedExamRanks =
      Object.keys(filters.exams).length > 0
        ? Object.fromEntries(
          Object.entries(filters.exams).map(([exam, rank]) => [
            exam.toLowerCase().trim().replace(/\s+/g, "-"),
            rank,
          ])
        )
        : {};

    const payload = {
      exam_ranks: normalizedExamRanks,
      preferred_state:
        filters.state === "" || filters.state === "All States" ? null : filters.state,
      locality: filters.localityType === "" ? null : filters.localityType,
      preferred_branches:
        filters.branch === "" || filters.branch === "All Branches" ? null : filters.branch,
      placement_range:
        filters.avgPackage[0] === 0 && filters.avgPackage[1] === 100 ? null : filters.avgPackage,
      gender_ratio_range:
        filters.genderRatio[0] === 0 && filters.genderRatio[1] === 1 ? null : filters.genderRatio,
      nirf_ranking_range:
        filters.nirfRanking[0] === 0 && filters.nirfRanking[1] === 100 ? null : filters.nirfRanking,
      h_index_range:
        filters.hIndex[0] === 0 && filters.hIndex[1] === 150 ? null : filters.hIndex,
      distance_range:
        !userLocation || (filters.distance[0] === 0 && filters.distance[1] === 2500)
          ? null
          : {
            min_distance: filters.distance[0],
            max_distance: filters.distance[1],
            user_location: userLocation,
          },
      skip: 0,
      limit: 30,
    };

    try {
      const response = await axios.post("/api/colleges/predict", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setPredictions(response.data);
    } catch (error: any) {
      console.error("Error fetching predictions:", error);
      setError(error.response?.data?.detail || "An error occurred while fetching predictions");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
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
      hIndex: [0, 150], // Reset h-index filter
      exams: {},
    });
  };

  const toggleExam = (exam: string, checked: boolean) => {
    setFilters((prev) => {
      const updatedExams = { ...prev.exams };
      if (checked) {
        updatedExams[exam] = 0; // default rank
      } else {
        delete updatedExams[exam];
      }
      return { ...prev, exams: updatedExams };
    });
  };

  const updateExamRank = (exam: string, rank: number) => {
    setFilters((prev) => ({
      ...prev,
      exams: { ...prev.exams, [exam]: rank },
    }));
  };

  const handlePredict = () => {
    if (Object.keys(filters.exams).length === 0) {
      alert(`Please enter rank for at least one exam`);
      return;
    }

    fetchPredictedPredictions();
  };

  // Prediction skeleton component
  const PredictionSkeleton = () => (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <Card className="mb-6 bg-gradient-to-r from-slate-50 to-gray-100 border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-3xl font-bold">College - Branch Predictor</CardTitle>
          <CardDescription className="text-base">
            Enter your exam scores and preferences to get personalized college recommendations
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar: Filters */}
        <aside className="lg:w-1/3 xl:w-1/4 order-2 lg:order-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Filters</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetFilters}
                    className="h-8"
                  >
                    <RefreshCcw className="h-3.5 w-3.5 mr-1" />
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePredict}
                    className="h-8"
                  >
                    <Search className="h-3.5 w-3.5 mr-1" />
                    Predict
                  </Button>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <ScrollArea className="h-[calc(100vh-270px)] pr-3">
                {locationError && (
                  <div className="mb-4 p-2 bg-yellow-50 text-yellow-800 text-sm rounded">
                    {locationError}
                  </div>
                )}

                {userDataLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <PredictorFilters
                    userData={{ ...userData, location: userLocation || undefined }}
                    filters={filters}
                    onChange={setFilters}
                    toggleExam={toggleExam}
                    updateExamRank={updateExamRank}
                  />
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </aside>

        {/* Right Side: Predictions Display */}
        <main className="lg:w-2/3 xl:w-3/4 order-1 lg:order-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recommended Colleges</CardTitle>
              <CardDescription>
                {loading
                  ? "Analyzing your preferences..."
                  : predictions.length > 0
                    ? `Found ${predictions.length} colleges that match your criteria`
                    : "Use the filters and click Predict to see recommendations"}
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <ScrollArea className="h-[calc(100vh-230px)]">
                {error && (
                  <div className="text-center py-4">
                    <p className="text-red-500">{error}</p>
                  </div>
                )}
                {loading ? (
                  <div className="grid grid-cols-1 gap-5">
                    {[...Array(6)].map((_, i) => (
                      <PredictionSkeleton key={i} />
                    ))}
                  </div>
                ) : predictions.length > 0 ? (
                  <div className="grid grid-cols-1 gap-5">
                    {predictions.map((prediction, index) => (
                      <PredictorCard key={index} prediction={prediction} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No predictions found matching your filters.</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Try adjusting your criteria or adding more exam scores.
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
