import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import { Blog } from "@/types";
import RandomImage from "../shared/random-image";

interface BlogCardProps {
  blog: Blog;
}

export function BlogCard({ blog }: BlogCardProps) {
  const { author } = blog;
  const authorName = `${author.firstName} ${author.middleName || ""} ${
    author.lastName
  }`.trim();

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/blogs/${blog.blogID}`}>
        <div className="relative h-48">
          <RandomImage
            alt={blog.heading}
            fill
            className="object-cover"
          ></RandomImage>
          {blog.refType !== "NA" && (
            <div className="absolute top-2 left-2">
              <span className="bg-primary-lavender text-primary-blue px-3 py-1 rounded-full text-sm">
                {blog.refType}
              </span>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
            {blog.heading}
          </h3>
          <div className="text-gray-600 text-sm mb-4 line-clamp-1">
            <ReactMarkdown>{blog.body}</ReactMarkdown>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Link
                href={`/profile/${blog.userID}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
                  <AvatarFallback>{author.firstName[0]}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="text-sm">
                <p className="font-medium">
                  <Link 
                    href={`/profile/${blog.userID}`}
                    className="hover:text-indigo-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {authorName}
                  </Link>
                </p>
                <p className="text-gray-500">
                  {new Date(blog.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Eye className="h-4 w-4" />
                <span>{blog.views || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{`${Math.max(
                  1,
                  Math.ceil(blog.body.split(/\s+/).length / 200)
                )} min read`}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
