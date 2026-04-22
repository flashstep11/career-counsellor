"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

// Define option type for dropdowns
interface Option {
  value: string;
  label: string;
}

interface FilterState {
  category: string;
  college: string;
  branch: string;
  sortBy: string;
}

interface BlogFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export default function BlogFilters({ filters, onChange }: BlogFiltersProps) {
  // Options for dropdowns
  const [collegeOptions, setCollegeOptions] = useState<Option[]>([]);
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Fetch options when category changes
  useEffect(() => {
    const fetchOptions = async () => {
      if (filters.category !== "college" && filters.category !== "collegebranch") {
        return;
      }

      setLoadingOptions(true);

      try {
        let endpoint =
          filters.category === "college"
            ? "/api/colleges/options"
            : "/api/branches/options";

        const response = await axios.get(endpoint);
        const options = response.data.map((item: any) => ({
          value: item.id || item.value,
          label: item.name || item.label
        }));

        if (filters.category === "college") {
          setCollegeOptions(options);
        } else {
          setBranchOptions(options);
        }
      } catch (error) {
        console.error(`Error fetching ${filters.category} options:`, error);
      } finally {
        setLoadingOptions(false);
      }
    };

    if (filters.category === "college" || filters.category === "collegebranch") {
      fetchOptions();
    }
  }, [filters.category]);

  // Handle filter changes
  const handleFilterChange = (name: string, value: string) => {
    // Reset related filters when changing category
    if (name === "category") {
      onChange({
        ...filters,
        [name]: value,
        college: "",
        branch: "",
      });
    } else {
      onChange({
        ...filters,
        [name]: value,
      });
    }
  };

  return (
    <Card className="p-4 space-y-6">
      {/* Sort By Filter */}
      <div className="space-y-2">
        <Label htmlFor="sortBy">Sort By</Label>
        <Select 
          value={filters.sortBy} 
          onValueChange={(value) => handleFilterChange("sortBy", value)}
        >
          <SelectTrigger id="sortBy">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="views">Most Viewed</SelectItem>
            <SelectItem value="likes">Most Liked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select 
          value={filters.category} 
          onValueChange={(value) => handleFilterChange("category", value)}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Select category..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="NA">General</SelectItem>
            <SelectItem value="college">College Specific</SelectItem>
            <SelectItem value="collegebranch">Branch Specific</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* College Filter - Only show when category is "college" */}
      {filters.category === "college" && (
        <div className="space-y-2">
          <Label htmlFor="college">College</Label>
          {loadingOptions ? (
            <div className="flex items-center space-x-2 h-10 px-3 border rounded">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-500">
                Loading colleges...
              </span>
            </div>
          ) : (
            <Select
              value={filters.college}
              onValueChange={(value) => handleFilterChange("college", value)}
            >
              <SelectTrigger id="college">
                <SelectValue placeholder="Select college..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">All Colleges</SelectItem>
                {collegeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Branch Filter - Only show when category is "collegebranch" */}
      {filters.category === "collegebranch" && (
        <div className="space-y-2">
          <Label htmlFor="branch">Branch</Label>
          {loadingOptions ? (
            <div className="flex items-center space-x-2 h-10 px-3 border rounded">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-500">
                Loading branches...
              </span>
            </div>
          ) : (
            <Select
              value={filters.branch}
              onValueChange={(value) => handleFilterChange("branch", value)}
            >
              <SelectTrigger id="branch">
                <SelectValue placeholder="Select branch..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">All Branches</SelectItem>
                {branchOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </Card>
  );
}
