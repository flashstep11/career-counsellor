import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

const recentSearches = [
  { id: 1, query: "IIT Delhi Computer Science", timestamp: "2 hours ago" },
  { id: 2, query: "BITS Pilani", timestamp: "1 day ago" },
  {
    id: 3,
    query: "Top Engineering Colleges in Mumbai",
    timestamp: "2 days ago",
  },
  // Add more recent searches
];

export function RecentSearches() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Dive Back In</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentSearches.map((search) => (
            <div
              key={search.id}
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
            >
              <Search className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-secondary-darkGray">{search.query}</p>
                <p className="text-sm text-gray-500">{search.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
