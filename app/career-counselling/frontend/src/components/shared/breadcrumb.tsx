"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { HomeIcon } from "lucide-react";

// Define page titles for static routes
const routeTitles: Record<string, string> = {
  "": "Home",
  assessments: "Assessments",
  blogs: "Blogs",
  colleges: "Colleges",
  experts: "Experts",
  videos: "Videos",
  predictor: "College Predictor",
  dashboard: "Dashboard",
  profile: "Profile",
  settings: "Settings",
  notifications: "Notifications",
  riasec: "RIASEC",
  search: "Search",
  "college-branch": "Branch Details",
  create: "Create",
  edit: "Edit",
  admin: "Admin Dashboard",
  wallet: "Wallet",
  "become-expert": "Become an Expert",
};

// Dynamic segment descriptive names by parent segment
const dynamicSegmentNames: Record<string, string> = {
  blogs: "Blog",
  colleges: "College",
  experts: "Expert Profile",
  videos: "Video",
  "college-branch": "Branch",
};

// Helper function to detect if a segment is likely an ID (UUID, number, etc.)
const isLikelyId = (segment: string): boolean => {
  // Check if segment looks like a UUID, numeric ID, or contains mostly numbers and special chars
  return (
    // Other ID-like strings
    (// Numeric ID
    /^[0-9a-f]{24}$/i.test(segment) || // MongoDB ID format
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) || // UUID format
    /^\d+$/.test(segment) || /^[0-9a-f-]{10,}$/i.test(segment))
  );
};

// Function to generate breadcrumb path segments
const generateBreadcrumbItems = (pathname: string) => {
  // Remove trailing slash and split path into segments
  const segments = pathname.replace(/\/$/, "").split("/").filter(Boolean);

  // Skip breadcrumbs for home page
  if (segments.length === 0) return null;

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {/* Home link is always the first item */}
        <BreadcrumbItem>
          <BreadcrumbLink href="/" className="flex items-center">
            <HomeIcon className="h-4 w-4 mr-1" />
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        {/* Create breadcrumb items for each path segment */}
        {segments.map((segment, index) => {
          // Detect if this segment is likely an ID
          const isIdSegment = isLikelyId(segment);

          // Create the path up to this segment
          const path = `/${segments.slice(0, index + 1).join("/")}`;

          // For the last segment, use BreadcrumbPage
          if (index === segments.length - 1) {
            // If it's an ID, use a descriptive name based on the parent path
            let title = routeTitles[segment] || segment;

            if (isIdSegment && index > 0) {
              const parentSegment = segments[index - 1];
              title = dynamicSegmentNames[parentSegment] || "Details";
            }

            return (
              <BreadcrumbItem key={path}>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            );
          }

          // Otherwise create a link
          let title = routeTitles[segment] || segment;

          // If it's an ID, use a descriptive name
          if (isIdSegment && index > 0) {
            const parentSegment = segments[index - 1];
            title = dynamicSegmentNames[parentSegment] || "Item";
          }

          return (
            <BreadcrumbItem key={path}>
              <BreadcrumbLink href={path}>{title}</BreadcrumbLink>
              <BreadcrumbSeparator />
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default function SiteBreadcrumb() {
  const pathname = usePathname();

  const breadcrumbItems = generateBreadcrumbItems(pathname);

  // If no breadcrumbs to show (home page), return null
  if (!breadcrumbItems) return null;

  return breadcrumbItems;
}
