import { Card, CardContent } from "@/components/ui/card";
import { Award, BookOpen, Clock, Users, Star, GraduationCap } from "lucide-react";
import { Expert } from "@/types";
import { Badge } from "@/components/ui/badge";
import MarkdownViewer from "@/components/shared/markdown-viewer";

interface ExpertOverviewProps {
  expert: Expert;
}

export default function ExpertOverview({ expert }: ExpertOverviewProps) {
  const highlights = [
    {
      icon: Clock,
      label: "Expert Since",
      value: new Date(expert.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    },
    {
      icon: Users,
      label: "Students Guided",
      value: expert.studentsGuided ? `${expert.studentsGuided}` : "0"
    },
    {
      icon: Star,
      label: "Rating",
      value: (expert.rating ?? 0) <= 0 ? "New Mentor" : `${expert.rating}/5`,
    },
  ];

  return (
    <div className="space-y-7 py-2">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {highlights.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card key={index} className="border-gray-200 shadow-sm">
              <CardContent className="p-4 text-center">
                <Icon className="h-5 w-5 mx-auto mb-2 text-primary-blue" />
                <p className="text-xs md:text-sm text-gray-500">{item.label}</p>
                <p className="text-sm md:text-base font-semibold text-gray-900">{item.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* About */}
      <section>
        <h2 className="text-xl font-semibold mb-3 text-gray-900">About</h2>
        <MarkdownViewer content={expert.bio}></MarkdownViewer>
      </section>

      {/* Education */}
      <section>
        <h2 className="text-xl font-semibold mb-3 text-gray-900">Education</h2>
        <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
          {expert.education.map((edu, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-xs md:text-sm"
            >
              <GraduationCap className="h-4 w-4 mr-1" />
              {edu.degree} • {edu.institution}
            </Badge>
          ))}
        </div>
      </section>
    </div>
  );
}
