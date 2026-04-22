"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CollegeOverview from "@/components/colleges/detail/college-overview";
import CollegeCourses from "@/components/colleges/detail/college-courses";
import CollegeFacilities from "@/components/colleges/detail/college-facilities";
import CollegeReviews from "@/components/colleges/detail/college-reviews";
import CollegeExperts from "@/components/colleges/detail/college-experts";
import CollegeBlogs from "@/components/colleges/detail/college-blogs";
import RandomImage from "@/components/shared/random-image";
import SystemShareButton from "@/components/shared/system-share-button";
import {
  SkeletonText,
  SkeletonImage,
  SkeletonCard,
  SkeletonCardGrid,
  SkeletonList,
} from "@/components/shared/loading-indicator";

export default function CollegeDetailPage() {
  const params = useParams();
  const collegeId = params?.id as string;

  const [college, setCollege] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchCollegeDetails = async () => {
      try {
        const response = await axios.get(`/api/colleges/${collegeId}`);
        setCollege(response.data);
      } catch (err) {
        console.error("Failed to fetch college data", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (collegeId) {
      fetchCollegeDetails();
    }
  }, [collegeId]);

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Hero section skeleton */}
        <div className="relative h-[50vh]">
          <SkeletonImage height="h-[50vh]" />
          <div className="absolute inset-0 bg-black/30 flex items-end">
            <div className="container mx-auto px-4 py-8">
              <div className="flex justify-between items-end">
                <div className="space-y-4">
                  <SkeletonText className="h-10 w-64" />
                  <div className="flex items-center space-x-4">
                    <SkeletonText className="h-4 w-32" />
                    <span className="text-white">•</span>
                    <SkeletonText className="h-4 w-24" />
                    <span className="text-white">•</span>
                    <SkeletonText className="h-4 w-20" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content skeleton */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-2/3 space-y-8">
              <SkeletonCard />

              <div className="space-y-4">
                <div className="flex space-x-2 border-b">
                  {Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <SkeletonText key={i} className="h-10 w-24" />
                    ))}
                </div>
                <SkeletonCardGrid
                  count={3}
                  columns="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                />
              </div>
            </div>

            <div className="lg:w-1/3 space-y-6">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonList count={3} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !college) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">
          College data could not be loaded. Please try again later.
        </h1>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="relative h-[50vh]">
        <RandomImage alt={college.name} fill className="object-cover" />
        <div className="absolute inset-0 bg-black/50 flex items-end h-full">
          <div className="container mx-auto px-4 py-8 text-white">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-bold mb-4">{college.name}</h1>
                <div className="flex items-center space-x-4 text-sm">
                  <span>{college.address || "Location not available"}</span>
                  <span>•</span>
                  <span>
                    {(college.type || "Type N/A")
                      .split(" ")
                      .map(
                        (word: string) =>
                          word.charAt(0).toUpperCase() +
                          word.slice(1).toLowerCase()
                      )
                      .join(" ")}
                  </span>
                  <span>•</span>
                  <span>Est. {college.yearOfEstablishment || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="self-start mr-4 mt-4">
            <SystemShareButton
              url={typeof window !== "undefined" ? window.location.href : ""}
              title={college.name}
              text="Check out this college:"
              className="bg-white text-gray-800 hover:bg-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="lg:w-2/3">
            <section className="mb-8">
              <CollegeOverview college={college} />
            </section>

            <Tabs defaultValue="courses">
              <TabsList>
                <TabsTrigger value="courses">Branches</TabsTrigger>
                <TabsTrigger value="facilities">Facilities</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>
              <TabsContent value="courses">
                <CollegeCourses college={college} />
              </TabsContent>
              <TabsContent value="facilities">
                <CollegeFacilities college={college} />
              </TabsContent>
              <TabsContent value="reviews">
                <CollegeReviews college={college} />
              </TabsContent>
            </Tabs>

            {college.notableAlumni?.length > 0 && (
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Notable Alumni</h2>
                <ul className="list-disc pl-5 space-y-2">
                  {college.notableAlumni.map(
                    (alumni: string, index: number) => (
                      <li key={index}>{alumni}</li>
                    )
                  )}
                </ul>
              </section>
            )}

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-6">College Blogs</h2>
              <CollegeBlogs collegeId={college.collegeID} displayStyle="full" />
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:w-1/3 space-y-6">
            <div className="p-4 border rounded-lg">
              <h3 className="text-lg font-semibold">Placement Statistics</h3>
              <p>Overall Placement: {college.placement || "N/A"}%</p>
              <p>Median Package: ₹{college.placementMedian || "N/A"} LPA</p>
            </div>

            {college.notableFaculty?.length > 0 && (
              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold">Notable Faculty</h3>
                <ul className="list-disc pl-5 space-y-2">
                  {college.notableFaculty.map(
                    (faculty: string, index: number) => (
                      <li key={index}>{faculty}</li>
                    )
                  )}
                </ul>
              </div>
            )}

            <CollegeExperts collegeId={college.collegeID} />
          </div>
        </div>
      </div>
    </div>
  );
}
