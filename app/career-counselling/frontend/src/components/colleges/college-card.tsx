import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MapPin, Building2, Calendar, IndianRupee, Trophy } from "lucide-react";
import RandomImage from "../shared/random-image";

interface CollegeCardProps {
  college: {
    collegeID: string;
    name: string;
    address: string;
    type: string;
    yearOfEstablishment: number;
    landArea: number;
    placement: number;
    placementMedian: number;
    image?: string;
  };
}

export default function CollegeCard({ college }: CollegeCardProps) {
  return (
    <Link href={`/colleges/${college.collegeID}`}>
      <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
        {/* College Image */}
        <div className="relative h-48">
          <RandomImage
            alt={college.name}
            fill
            className="object-cover rounded-t-lg"
          />
        </div>

        {/* College Information */}
        <div className="flex flex-col flex-grow">
          <CardHeader className="pb-2">
            <h3 className="font-semibold text-lg">{college.name}</h3>
          </CardHeader>

          <CardContent className="flex-grow flex flex-col justify-between">
            <div className="space-y-2 text-sm text-gray-500">
              {/* Address */}
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>{college.address || "Address not available"}</span>
              </div>

              {/* Type of Institution */}
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span>
                  {(college.type || "N/A")
                    .split(" ")
                    .map(
                      (word) =>
                        word.charAt(0).toUpperCase() +
                        word.slice(1).toLowerCase()
                    )
                    .join(" ")}
                </span>
              </div>

              {/* Year of Establishment */}
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Established: {college.yearOfEstablishment || "N/A"}</span>
              </div>

              {/* Median Placement */}
              <div className="flex items-center space-x-2">
                <IndianRupee className="h-4 w-4" />
                <span>Median Package: ₹{college.placementMedian || 0} LPA</span>
              </div>

              {/* Placement Percentage */}
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4" />
                <span>Placement: {college.placement || 0}%</span>
              </div>

              {/* Land Area */}
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span>Land Area: {college.landArea} acres</span>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}
