import { Card, CardContent } from "@/components/ui/card";
import {
  Trophy,
  Calendar,
  Users,
  Building2,
  GraduationCap,
  Globe,
  Phone,
  Mail,
} from "lucide-react";
import MarkdownViewer from "@/components/shared/markdown-viewer";

interface CollegeOverviewProps {
  college: {
    name: string;
    yearOfEstablishment: number;
    landArea: number;
    placement: number;
    placementMedian: number;
    description?: string;
    address?: string;
    contactNumber?: string;
    email?: string;
    website?: string;
  };
}

export default function CollegeOverview({ college }: CollegeOverviewProps) {
  const highlights = [
    {
      icon: Trophy,
      label: "Placement %",
      value: `${college.placement || "N/A"}%`,
    },
    {
      icon: Calendar,
      label: "Established",
      value: college.yearOfEstablishment || "N/A",
    },
    {
      icon: Users,
      label: "Median Package",
      value: `₹${college.placementMedian || "N/A"} LPA`,
    },
    {
      icon: Building2,
      label: "Campus Size",
      value: `${college.landArea || "N/A"} Acres`,
    },
    {
      icon: GraduationCap,
      label: "Programs",
      value: "Information Not Available",
    },
  ];

  return (
    <div className="space-y-6 py-4">
      {/* Quick Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {highlights.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card key={index}>
              <CardContent className="p-4 text-center">
                <Icon className="h-6 w-6 mx-auto mb-2 text-primary-blue" />
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className="font-semibold">{item.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* About Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">About</h2>
        <div style={{ all: "unset" }}>
          {college.description ? (
            <MarkdownViewer content={college.description} />
          ) : (
            "No description available for this college."
          )}
        </div>
      </section>

      {/* Contact Information */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
        <div className="space-y-3">
          {college.website && (
            <div className="flex items-center space-x-3">
              <Globe className="h-5 w-5 text-gray-500" />
              <a
                href={college.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-blue hover:underline"
              >
                {college.website}
              </a>
            </div>
          )}

          {college.contactNumber && (
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-500" />
              <span>{college.contactNumber}</span>
            </div>
          )}

          {college.email && (
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-500" />
              <span>{college.email}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
