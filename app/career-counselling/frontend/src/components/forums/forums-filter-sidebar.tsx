"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X, RefreshCw, ChevronRight } from "lucide-react";

interface ForumFilters {
  fields: string[];
  goals: string[];
  educationLevel: string;
  sortBy: string;
}

interface ForumsFilterSidebarProps {
  onFiltersChange: (filters: ForumFilters) => void;
  savedPreferences?: any;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ForumsFilterSidebar({ 
  onFiltersChange, 
  savedPreferences,
  isCollapsed = false,
  onToggleCollapse,
}: ForumsFilterSidebarProps) {
  const [filters, setFilters] = useState<ForumFilters>({
    fields: [],
    goals: [],
    educationLevel: "all",
    sortBy: "recent",
  });

  const [isExpanded, setIsExpanded] = useState(true);

  // Load from saved preferences if available
  useEffect(() => {
    if (savedPreferences) {
      const newFilters: ForumFilters = {
        fields: savedPreferences[3] ? [savedPreferences[3]] : [],
        goals: savedPreferences[2] || [],
        educationLevel: savedPreferences[4] || "all",
        sortBy: "recent",
      };
      setFilters(newFilters);
      onFiltersChange(newFilters);
    }
  }, [savedPreferences]);

  const fieldOptions = [
    "Technology & Software",
    "Business & Management",
    "Healthcare & Medicine",
    "Engineering",
    "Finance & Accounting",
    "Creative Arts & Design",
    "Education & Research",
    "Law & Legal Services",
  ];

  const goalOptions = [
    "Career guidance and planning",
    "Skill development and learning",
    "Job/internship search assistance",
    "College/university selection",
    "Industry insights and networking",
    "Personal development",
  ];

  const educationLevels = [
    { value: "all", label: "All Levels" },
    { value: "High School", label: "High School" },
    { value: "Undergraduate", label: "Undergraduate" },
    { value: "Postgraduate", label: "Postgraduate" },
    { value: "Professional", label: "Professional" },
  ];

  const handleFieldToggle = (field: string) => {
    const newFields = filters.fields.includes(field)
      ? filters.fields.filter((f) => f !== field)
      : [...filters.fields, field];
    const newFilters = { ...filters, fields: newFields };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleGoalToggle = (goal: string) => {
    const newGoals = filters.goals.includes(goal)
      ? filters.goals.filter((g) => g !== goal)
      : [...filters.goals, goal];
    const newFilters = { ...filters, goals: newGoals };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleEducationChange = (value: string) => {
    const newFilters = { ...filters, educationLevel: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSortChange = (value: string) => {
    const newFilters = { ...filters, sortBy: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters: ForumFilters = {
      fields: [],
      goals: [],
      educationLevel: "all",
      sortBy: "recent",
    };
    setFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const activeFiltersCount =
    filters.fields.length +
    filters.goals.length +
    (filters.educationLevel !== "all" ? 1 : 0);

  // Collapsed state - just show the button
  if (isCollapsed) {
    return (
      <Button
        onClick={onToggleCollapse}
        variant="outline"
        className="gap-2 shadow-sm hover:shadow-md transition-all"
      >
        <Filter className="h-4 w-4" />
        Filters
        {activeFiltersCount > 0 && (
          <Badge variant="secondary" className="ml-1">
            {activeFiltersCount}
          </Badge>
        )}
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    );
  }

  // Expanded state - full sidebar
  return (
    <Card className="bg-white rounded-xl shadow-sm border-0 sticky top-6">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-700" />
            <h3 className="font-semibold text-gray-900">Filters</h3>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters Content */}
          <div className="space-y-6">
            {/* Sort By */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900">Sort By</Label>
              <Select value={filters.sortBy} onValueChange={handleSortChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="trending">Trending</SelectItem>
                  <SelectItem value="mostLiked">Most Liked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Field/Industry Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-900">
                Field of Interest
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {fieldOptions.map((field) => (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox
                      id={`field-${field}`}
                      checked={filters.fields.includes(field)}
                      onCheckedChange={() => handleFieldToggle(field)}
                    />
                    <Label
                      htmlFor={`field-${field}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {field}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Goals Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-900">
                Mentorship Goals
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {goalOptions.map((goal) => (
                  <div key={goal} className="flex items-center space-x-2">
                    <Checkbox
                      id={`goal-${goal}`}
                      checked={filters.goals.includes(goal)}
                      onCheckedChange={() => handleGoalToggle(goal)}
                    />
                    <Label
                      htmlFor={`goal-${goal}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {goal}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Education Level Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900">
                Education Level
              </Label>
              <Select
                value={filters.educationLevel}
                onValueChange={handleEducationChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {educationLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
      </CardContent>
    </Card>
  );
}
