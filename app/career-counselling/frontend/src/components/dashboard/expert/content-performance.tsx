import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const videos = [
  {
    id: 1,
    title: "JEE Advanced Preparation Strategy",
    views: 15234,
    engagement: 85,
    revenue: 12500,
  },
  // Add more videos...
];

const blogs = [
  {
    id: 1,
    title: "How to Choose the Right Engineering Branch",
    reads: 8456,
    engagement: 92,
    revenue: 8900,
  },
  // Add more blogs...
];

export function ContentPerformance() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Content Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="videos">
          <TabsList className="mb-4">
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="blogs">Blogs</TabsTrigger>
          </TabsList>

          <TabsContent value="videos">
            <div className="space-y-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{video.title}</h4>
                    <span className="text-primary-blue">{video.revenue} coins</span>
                  </div>
                  <div className="flex space-x-4 text-sm text-gray-500">
                    <span>{video.views.toLocaleString()} views</span>
                    <span>{video.engagement}% engagement</span>
                  </div>
                </div>
              ))}
            </div>
            
          </TabsContent>

          <TabsContent value="blogs">
            <div className="space-y-4">
              {blogs.map((blog) => (
                <div
                  key={blog.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{blog.title}</h4>
                    <span className="text-primary-blue">{blog.revenue} coins</span>
                  </div>
                  <div className="flex space-x-4 text-sm text-gray-500">
                    <span>{blog.reads.toLocaleString()} reads</span>
                    <span>{blog.engagement}% engagement</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
