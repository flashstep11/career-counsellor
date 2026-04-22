"use client";

import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  FileText,
  GraduationCap,
  Users,
  PlayCircle,
  Loader2,
} from "lucide-react";
import { SearchResult, SearchType } from "@/types";
import { useRouter } from "next/navigation";

interface SearchResultsProps {
  results: SearchResult | null;
  activeTab: SearchType;
  isLoading: boolean;
  query: string;
  setOpen: (open: boolean) => void;
  onResultClick?: (query: string) => void;
}

export function SearchResults({
  results,
  activeTab,
  isLoading,
  query,
  setOpen,
  onResultClick,
}: SearchResultsProps) {
  const router = useRouter();

  // Handle result selection
  const handleResultSelect = (path: string) => {
    // Save search query to history
    if (onResultClick && query.trim()) {
      onResultClick(query);
    }

    // Navigate to result
    router.push(path);
    setOpen(false);
  };

  if (isLoading) {
    return (
      <div className="py-6 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (query && !results?.total_count) {
    return <CommandEmpty>No results found.</CommandEmpty>;
  }

  const sections = [];

  if (activeTab === "all" || activeTab === "blog") {
    sections.push(
      <CommandGroup key="blogs" heading="Blogs">
        {results?.blogs?.map((blog, index) => (
          <CommandItem
            key={`blog-${blog.blogID || index}`}
            onSelect={() => handleResultSelect(`/blogs/${blog.blogID}`)}
            className="cursor-pointer"
          >
            <FileText className="mr-2 h-4 w-4" />
            <span>{blog.heading}</span>
          </CommandItem>
        ))}
      </CommandGroup>
    );
  }

  if (activeTab === "all" || activeTab === "college") {
    sections.push(
      <CommandGroup key="colleges" heading="Colleges">
        {results?.colleges?.map((college, index) => (
          <CommandItem
            key={`college-${college.collegeID || index}`}
            onSelect={() => handleResultSelect(`/colleges/${college.collegeID}`)}
            className="cursor-pointer"
          >
            <GraduationCap className="mr-2 h-4 w-4" />
            <span>{college.name}</span>
          </CommandItem>
        ))}
      </CommandGroup>
    );
  }

  if (activeTab === "all" || activeTab === "expert") {
    sections.push(
      <CommandGroup key="experts" heading="Experts">
        {results?.experts?.map((expert, index) => (
          <CommandItem
            key={`expert-${expert.expertID || index}`}
            onSelect={() => handleResultSelect(`/experts/${expert.expertID}`)}
            className="cursor-pointer"
          >
            <Users className="mr-2 h-4 w-4" />
            <span>{`${expert.userDetails.firstName} ${expert.userDetails.lastName}`}</span>
          </CommandItem>
        ))}
      </CommandGroup>
    );
  }

  if (activeTab === "all" || activeTab === "video") {
    sections.push(
      <CommandGroup key="videos" heading="Videos">
        {results?.videos?.map((video, index) => (
          <CommandItem
            key={`video-${video.videoID || index}`}
            onSelect={() => handleResultSelect(`/videos/${video.videoID}`)}
            className="cursor-pointer"
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            <span>{video.title}</span>
          </CommandItem>
        ))}
      </CommandGroup>
    );
  }

  return <>{sections}</>;
}
