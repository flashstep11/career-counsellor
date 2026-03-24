import { Card, CardContent } from "@/components/ui/card";
import { Users, Video, FileText, IndianRupee } from "lucide-react";

const metrics = [
  {
    label: "Total Students",
    value: "1,234",
    icon: Users,
    trend: "+12%",
  },
  {
    label: "Video Views",
    value: "45.2K",
    icon: Video,
    trend: "+8%",
  },
  {
    label: "Blog Reads",
    value: "23.1K",
    icon: FileText,
    trend: "+15%",
  },
  {
    label: "Total Earnings",
    value: "₹45,678",
    icon: IndianRupee,
    trend: "+10%",
  },
];

export function MetricsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{metric.label}</p>
                  <h3 className="text-2xl font-bold mt-1">{metric.value}</h3>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary-lavender flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary-blue" />
                </div>
              </div>
              <p className="text-sm text-green-500 mt-2">
                {metric.trend} this month
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
