"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Loader2, TrendingUp, Users, Coins } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type BranchPlacement = {
  year: number;
  average_package: number;
  highest_package: number;
  median_package: number;
  companies_visited: string[];
};

type Category = {
  quota: string;
  seat_type: string;
  gender: string;
  exam: string;
  co_type: string;
};

type Cutoff = {
  year?: number;
  counselling_round?: number;
  category: Category;
  opening_rank: number;
  closing_rank: number;
};

type Branch = {
  _id: string;
  name: string;
  degree_name: string;
  duration: number;
};

type CollegeBranch = {
  _id: string;
  college_id: string;
  branch_id: string;
  seats: number;
  fees_per_year: number;
  cutoffs: Cutoff[];
  avg_cutoffs: Cutoff[];
  avg_placement: number;
  placements: BranchPlacement[];
  branch: Branch;
};

export default function CollegeCourses({ college }: { college: any }) {
  const [branches, setBranches] = useState<CollegeBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await axios.get(
          `/api/college-branches/?college_id=${college.collegeID}`
        );
        setBranches(response.data);
      } catch (err) {
        console.error("Failed to fetch branch data", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, [college.collegeID]);

  if (loading) {
    return (
      <div className="space-y-6 py-4">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 gap-6">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-9 w-28 rounded-md" />
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[...Array(3)].map((_, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || branches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No branch information available for this college.
        </p>
      </div>
    );
  }

  const formatRupees = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryLabel = (category: Category) => {
    const quotaMap: Record<string, string> = {
      ai: "All India",
      hs: "Home State",
      os: "Other State",
    };

    const seatMap: Record<string, string> = {
      open: "Open",
      sc: "SC",
      st: "ST",
      obc: "OBC",
      ews: "EWS",
    };

    const genderMap: Record<string, string> = {
      neutral: "All Genders",
      female: "Female-only",
    };

    const examMap: Record<string, string> = {
      "jee-mains": "JEE Mains",
      "jee-advanced": "JEE Advanced",
      gate: "GATE",
    };

    return `${quotaMap[category.quota] || category.quota} | ${
      seatMap[category.seat_type] || category.seat_type
    } | ${genderMap[category.gender] || category.gender} | ${
      examMap[category.exam] || category.exam
    }`;
  };

  return (
    <div className="space-y-6 py-4">
      <h2 className="text-2xl font-semibold">Branches at {college.name}</h2>
      <div className="grid grid-cols-1 gap-6">
        {branches.map((branch) => (
          <Card key={branch._id} className="overflow-hidden">
            <CardHeader className="bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{branch.branch.name}</CardTitle>
                  <CardDescription>
                    {branch.branch.degree_name} • {branch.branch.duration} Years
                  </CardDescription>
                </div>
                <Link href={`/college-branch/${branch._id}`} passHref>
                  <Button variant="outline">View Details</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Seats</p>
                    <p className="font-medium">{branch.seats}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Annual Fee</p>
                    <p className="font-medium">
                      {formatRupees(branch.fees_per_year)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Package</p>
                    <p className="font-medium">
                      {branch.avg_placement?.toFixed(2) || "N/A"} LPA
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
