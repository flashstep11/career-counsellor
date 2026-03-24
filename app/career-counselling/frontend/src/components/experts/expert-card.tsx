import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Star,
  Building2,
  GraduationCap,
  Calendar,
  Users,
  CheckCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Expert } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export const ExpertCardSkeleton = () => {
  return (
    <Card className="h-full overflow-hidden bg-gradient-to-br from-white to-gray-50/50">
      <CardContent className="p-6">
        <div className="flex items-start gap-5">
          <div className="relative">
            <Skeleton className="h-20 w-20 rounded-full" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-7 w-32 mb-2" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>

            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <Skeleton className="h-16 w-full rounded-lg" />

          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ExpertCard = ({ expert }: { expert: Expert }) => {
  if (!expert) return null;

  const userDetails = expert.userDetails || {};
  const initials = `${userDetails.firstName?.[0] || ""}${
    userDetails.lastName?.[0] || ""
  }`;

  const latestEducation =
    expert.education.length > 0
      ? expert.education.reduce((latest, current) =>
          current.year > latest.year ? current : latest
        )
      : null;

  // Assume an expert is verified if they have a high rating (4+) or many students guided
  const isVerified = expert.rating >= 4.0 || expert.studentsGuided > 10;

  return (
    <Link href={`/experts/${expert.expertID}`}>
      <Card className="group h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <div className="relative">
              <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-medium text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {expert.available && (
                <div className="absolute -right-1 -bottom-1 rounded-full bg-green-500 p-1.5 ring-2 ring-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-xl truncate group-hover:text-blue-600 transition-colors">
                    {`${userDetails.firstName || ""} ${
                      userDetails.lastName || ""
                    }`.trim()}
                  </h3>
                  {isVerified && (
                    <span title="Verified Expert">
                      <CheckCircle className="h-5 w-5 fill-blue-600 text-white flex-shrink-0" />
                    </span>
                  )}
                </div>
                {expert.rating !== undefined && (
                  <div className="flex items-center gap-1.5 bg-yellow-50 px-2 py-1 rounded-full">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-yellow-700">
                      {expert.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="truncate">{expert.currentPosition}</span>
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="truncate">{expert.organization}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {latestEducation && (
              <div className="flex items-center gap-2 text-gray-600 text-sm bg-gray-50 p-2 rounded-lg">
                <GraduationCap className="h-4 w-4 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">
                    {latestEducation.degree}
                  </p>
                  <p className="truncate text-gray-500">
                    {latestEducation.institution} • {latestEducation.year}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex flex-wrap gap-2">
                {expert.meetingCost && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 border-blue-100 text-blue-600 px-3 py-1"
                  >
                    {expert.meetingCost.toLocaleString("en-IN")} coins/hr
                  </Badge>
                )}
                {isVerified && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 border-blue-100 text-blue-600 px-3 py-1 flex items-center gap-1"
                  >
                    <CheckCircle className="h-3 w-3 fill-blue-600 text-white" />
                    Verified
                  </Badge>
                )}
              </div>

              <div className="text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Expert since: {new Date(expert.createdAt).getFullYear()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ExpertCard;
