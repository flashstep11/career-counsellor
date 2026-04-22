"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  Loader2,
  TrendingUp,
  Users,
  Coins,
  BookOpen,
  Building,
  GraduationCap,
  MapPin,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import RandomImage from "@/components/shared/random-image";
import { Bar, Line } from "react-chartjs-2";
import SystemShareButton from "@/components/shared/system-share-button";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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
  description?: string;
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
  college?: {
    _id: string;
    name: string;
    location?: string;
    city?: string;
    state?: string;
    type?: string;
  };
};

export default function BranchDetailPage() {
  const params = useParams();
  const branchId = params?.id as string;

  const [branchData, setBranchData] = useState<CollegeBranch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchBranchDetails = async () => {
      try {
        const response = await axios.get(`/api/college-branches/${branchId}`);
        setBranchData(response.data);
      } catch (err) {
        console.error("Failed to fetch branch data", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (branchId) {
      fetchBranchDetails();
    }
  }, [branchId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !branchData) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">
          Branch data could not be loaded. Please try again later.
        </h1>
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
    <div>
      {/* Hero Section */}
      <div className="relative h-[40vh]">
        <RandomImage
          alt={branchData.branch.name}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50 flex items-end">
          <div className="container mx-auto px-4 py-8 text-white">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {branchData.branch.name}
                </h1>
                {branchData.college && (
                  <h2 className="text-2xl font-medium mb-3">
                    <Link
                      href={`/colleges/${branchData.college_id}`}
                      className="hover:underline"
                    >
                      {branchData.college.name}
                    </Link>
                  </h2>
                )}
                <div className="flex items-center space-x-4 text-sm">
                  <span>{branchData.branch.degree_name}</span>
                  <span>•</span>
                  <span>{branchData.branch.duration} Years</span>
                  {branchData.college && branchData.college.city && (
                    <>
                      <span>•</span>
                      <span className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {branchData.college.city}
                        {branchData.college.state
                          ? `, ${branchData.college.state}`
                          : ""}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <SystemShareButton
                  url={
                    typeof window !== "undefined" ? window.location.href : ""
                  }
                  title={`${branchData.branch.name} at ${
                    branchData.college?.name || "College"
                  }`}
                  text="Check out this course:"
                  className="bg-white text-gray-800 hover:bg-gray-100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About this Branch</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  {branchData.branch.description ||
                    "No description available for this branch."}
                </p>
              </CardContent>
            </Card>

            {/* Placement Information */}
            <Card>
              <CardHeader>
                <CardTitle>Placement Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3">
                    Average Placement Information
                  </h3>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Average Package
                      </p>
                      <p className="font-medium">
                        {branchData.avg_placement?.toFixed(2) || "N/A"} LPA
                      </p>
                    </div>
                  </div>
                </div>

                {branchData.placements && branchData.placements.length > 1 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">
                      Placement Trends
                    </h3>
                    <div className="h-72">
                      <Bar
                        data={{
                          labels: branchData.placements.map((p) =>
                            p.year.toString()
                          ),
                          datasets: [
                            {
                              label: "Average Package (LPA)",
                              data: branchData.placements.map(
                                (p) => p.average_package
                              ),
                              backgroundColor: "rgba(59, 130, 246, 0.7)",
                            },
                            {
                              label: "Highest Package (LPA)",
                              data: branchData.placements.map(
                                (p) => p.highest_package
                              ),
                              backgroundColor: "rgba(16, 185, 129, 0.7)",
                            },
                            {
                              label: "Median Package (LPA)",
                              data: branchData.placements.map(
                                (p) => p.median_package
                              ),
                              backgroundColor: "rgba(249, 115, 22, 0.7)",
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: "Package in LPA",
                              },
                            },
                            x: {
                              title: {
                                display: true,
                                text: "Year",
                              },
                            },
                          },
                          plugins: {
                            tooltip: {
                              callbacks: {
                                label: function (context) {
                                  return `${
                                    context.dataset.label
                                  }: ${(context.parsed.y ?? 0).toFixed(2)} LPA`;
                                },
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                )}

                <Separator className="my-4" />

                <h3 className="text-lg font-medium mb-3">
                  Year-wise Placement Data
                </h3>
                {branchData.placements && branchData.placements.length > 0 ? (
                  <div className="space-y-4">
                    {branchData.placements.map((placement, index) => (
                      <div key={index} className="border p-3 rounded-md">
                        <h4 className="font-medium mb-2">
                          Placement Stats {placement.year}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Average Package
                            </p>
                            <p className="font-medium">
                              {placement.average_package.toFixed(2)} LPA
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Highest Package
                            </p>
                            <p className="font-medium">
                              {placement.highest_package.toFixed(2)} LPA
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Median Package
                            </p>
                            <p className="font-medium">
                              {placement.median_package.toFixed(2)} LPA
                            </p>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          Companies Visited
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {placement.companies_visited.map((company, i) => (
                            <Badge key={i} variant="secondary" className="mb-1">
                              {company}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No placement information available
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Cutoff Information */}
            <Card>
              <CardHeader>
                <CardTitle>Cutoff Information</CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className="text-lg font-medium mb-3">Average Cutoffs</h3>
                {branchData.avg_cutoffs && branchData.avg_cutoffs.length > 0 ? (
                  <>
                    <div className="h-72 mb-6">
                      <Line
                        data={{
                          labels: branchData.avg_cutoffs.map((c) =>
                            getCategoryLabel(c.category).split("|")[1].trim()
                          ),
                          datasets: [
                            {
                              label: "Opening Rank",
                              data: branchData.avg_cutoffs.map(
                                (c) => c.opening_rank
                              ),
                              borderColor: "rgb(99, 102, 241)",
                              backgroundColor: "rgba(99, 102, 241, 0.5)",
                              pointRadius: 5,
                            },
                            {
                              label: "Closing Rank",
                              data: branchData.avg_cutoffs.map(
                                (c) => c.closing_rank
                              ),
                              borderColor: "rgb(244, 114, 182)",
                              backgroundColor: "rgba(244, 114, 182, 0.5)",
                              pointRadius: 5,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: "Rank",
                              },
                              reverse: true, // Lower ranks are better, so reverse the axis
                            },
                            x: {
                              title: {
                                display: true,
                                text: "Category",
                              },
                            },
                          },
                          plugins: {
                            tooltip: {
                              callbacks: {
                                label: function (context) {
                                  return `${
                                    context.dataset.label
                                  }: ${Math.round(
                                    context.parsed.y ?? 0
                                  ).toLocaleString()}`;
                                },
                              },
                            },
                          },
                        }}
                      />
                    </div>
                    <div className="space-y-3">
                      {branchData.avg_cutoffs.map((cutoff, index) => (
                        <div key={index} className="border p-3 rounded-md">
                          <Badge variant="outline" className="mb-2">
                            {getCategoryLabel(cutoff.category)}
                          </Badge>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Opening Rank
                              </p>
                              <p className="font-medium">
                                {cutoff.opening_rank.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Closing Rank
                              </p>
                              <p className="font-medium">
                                {cutoff.closing_rank.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    No cutoff information available
                  </p>
                )}

                {branchData.cutoffs && branchData.cutoffs.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="detailed-cutoffs">
                        <AccordionTrigger>
                          Detailed Year-wise Cutoffs
                        </AccordionTrigger>
                        <AccordionContent>
                          {branchData.cutoffs.some((c) => c.year) && (
                            <div className="h-72 mb-6">
                              <Line
                                data={(() => {
                                  // Group cutoffs by category
                                  const categories = [
                                    ...new Set(
                                      branchData.cutoffs
                                        .filter(
                                          (c) =>
                                            c.year &&
                                            c.category &&
                                            c.category.seat_type
                                        )
                                        .map((c) => c.category.seat_type)
                                    ),
                                  ];

                                  const years = [
                                    ...new Set(
                                      branchData.cutoffs
                                        .filter((c) => c.year)
                                        .map((c) => c.year)
                                    ),
                                  ].sort((a, b) => (a || 0) - (b || 0));

                                  const datasets = categories.map((catType) => {
                                    const color =
                                      {
                                        open: "rgb(59, 130, 246)", // blue
                                        sc: "rgb(16, 185, 129)", // green
                                        st: "rgb(249, 115, 22)", // orange
                                        obc: "rgb(244, 114, 182)", // pink
                                        ews: "rgb(168, 85, 247)", // purple
                                      }[catType as string] ||
                                      "rgb(156, 163, 175)";

                                    return {
                                      label:
                                        catType?.toUpperCase() || "Unknown",
                                      data: years.map((year) => {
                                        const matchingCutoffs =
                                          branchData.cutoffs.filter(
                                            (c) =>
                                              c.year === year &&
                                              c.category &&
                                              c.category.seat_type === catType
                                          );
                                        if (matchingCutoffs.length > 0) {
                                          // Average the closing ranks if multiple entries
                                          return (
                                            matchingCutoffs.reduce(
                                              (sum, c) => sum + c.closing_rank,
                                              0
                                            ) / matchingCutoffs.length
                                          );
                                        }
                                        return null;
                                      }),
                                      borderColor: color,
                                      backgroundColor: color
                                        .replace("rgb", "rgba")
                                        .replace(")", ", 0.5)"),
                                      borderWidth: 2,
                                      pointRadius: 4,
                                      spanGaps: true,
                                    };
                                  });

                                  return {
                                    labels: years.map(
                                      (y) => y?.toString() || ""
                                    ),
                                    datasets,
                                  };
                                })()}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  scales: {
                                    y: {
                                      title: {
                                        display: true,
                                        text: "Closing Rank",
                                      },
                                      reverse: true, // Lower ranks are better, so reverse the axis
                                    },
                                    x: {
                                      title: {
                                        display: true,
                                        text: "Year",
                                      },
                                    },
                                  },
                                  plugins: {
                                    title: {
                                      display: true,
                                      text: "Cutoff Trends by Category",
                                    },
                                    tooltip: {
                                      callbacks: {
                                        label: function (context) {
                                          return `${
                                            context.dataset.label
                                          }: ${Math.round(
                                            context.parsed.y ?? 0
                                          ).toLocaleString()}`;
                                        },
                                      },
                                    },
                                  },
                                }}
                              />
                            </div>
                          )}
                          <div className="space-y-3">
                            {branchData.cutoffs.map((cutoff, index) => (
                              <div
                                key={index}
                                className="border p-3 rounded-md"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="outline">
                                    {getCategoryLabel(cutoff.category)}
                                  </Badge>
                                  {cutoff.year && (
                                    <Badge variant="secondary">
                                      Year: {cutoff.year}{" "}
                                      {cutoff.counselling_round &&
                                        `| Round: ${cutoff.counselling_round}`}
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-sm text-muted-foreground">
                                      Opening Rank
                                    </p>
                                    <p className="font-medium">
                                      {cutoff.opening_rank.toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">
                                      Closing Rank
                                    </p>
                                    <p className="font-medium">
                                      {cutoff.closing_rank.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Branch Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Degree</p>
                    <p className="font-medium">
                      {branchData.branch.degree_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">
                      {branchData.branch.duration} Years
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Seats</p>
                    <p className="font-medium">{branchData.seats}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Annual Fee</p>
                    <p className="font-medium">
                      {formatRupees(branchData.fees_per_year)}
                    </p>
                  </div>
                </div>
                {branchData.college && (
                  <>
                    <div className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">College</p>
                        <Link
                          href={`/colleges/${branchData.college_id}`}
                          className="font-medium hover:underline"
                        >
                          {branchData.college.name}
                        </Link>
                      </div>
                    </div>
                    {(branchData.college.city || branchData.college.state) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Location
                          </p>
                          <p className="font-medium">
                            {branchData.college.city
                              ? branchData.college.city
                              : ""}
                            {branchData.college.city && branchData.college.state
                              ? ", "
                              : ""}
                            {branchData.college.state
                              ? branchData.college.state
                              : ""}
                          </p>
                        </div>
                      </div>
                    )}
                    {branchData.college.type && (
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            College Type
                          </p>
                          <Badge variant="outline">
                            {branchData.college.type}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
