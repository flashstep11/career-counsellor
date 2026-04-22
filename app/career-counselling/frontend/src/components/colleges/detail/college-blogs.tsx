import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { CalendarDays, User } from "lucide-react";
import RandomImage from "@/components/shared/random-image";

interface CollegeBlogsProps {
  collegeId: string | number;
  displayStyle?: "sidebar" | "full";
}

export default function CollegeBlogs({
  collegeId,
  displayStyle = "sidebar",
}: CollegeBlogsProps) {
  const blogs = [
    {
      id: 1,
      title: "Life at Our College: A Student's Perspective",
      author: "Priya Singh",
      date: "March 15, 2024",
      readTime: "5 min read",
      excerpt: "Discover what makes our campus life unique and exciting...",
      image: "/blogs/campus-life.jpg",
    },
    // Add more blogs
  ];

  if (displayStyle === "full") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {blogs.map((blog) => (
          <Card key={blog.id}>
            <Link href={`/blogs/${blog.id}`}>
              <div className="relative h-48">
                <RandomImage
                  alt={blog.title}
                  fill
                  className="object-cover rounded-t-lg"
                ></RandomImage>
              </div>
              <CardContent className="p-4">
                <h4 className="font-semibold text-lg mb-2">{blog.title}</h4>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {blog.excerpt}
                </p>
                <div className="flex items-center text-sm text-gray-500 space-x-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{blog.author}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>{blog.date}</span>
                  </div>
                  <span>•</span>
                  <span>{blog.readTime}</span>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    );
  }

  // Sidebar version (compact)
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {blogs.map((blog) => (
            <Link
              key={blog.id}
              href={`/blogs/${blog.id}`}
              className="block hover:bg-gray-50 rounded-lg p-3 transition-colors"
            >
              <h4 className="font-semibold mb-2">{blog.title}</h4>
              <div className="flex items-center text-sm text-gray-500 space-x-3">
                <span>{blog.author}</span>
                <span>•</span>
                <span>{blog.readTime}</span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
