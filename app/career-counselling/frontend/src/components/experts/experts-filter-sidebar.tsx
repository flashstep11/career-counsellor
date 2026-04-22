"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X, ChevronRight } from "lucide-react";

interface ExpertsFilterSidebarProps {
  onFiltersChange: (filters: any) => void;
  savedPreferences?: any;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ExpertsFilterSidebar({
  onFiltersChange,
  savedPreferences,
  isCollapsed = false,
  onToggleCollapse,
}: ExpertsFilterSidebarProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [educationLevel, setEducationLevel] = useState<string>("");
  const [availability, setAvailability] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("rating");

  // Load saved preferences on mount
  useEffect(() => {
    if (savedPreferences) {
      if (savedPreferences.fields) setSelectedFields(savedPreferences.fields);
      if (savedPreferences.goals) setSelectedGoals(savedPreferences.goals);
      if (savedPreferences.educationLevel) setEducationLevel(savedPreferences.educationLevel);
    }
  }, [savedPreferences]);

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange({
      fields: selectedFields,
      goals: selectedGoals,
      educationLevel,
      availability,
      sortBy,
    });
  }, [selectedFields, selectedGoals, educationLevel, availability, sortBy]);

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

  const handleFieldToggle = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleGoalToggle = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const resetFilters = () => {
    setSelectedFields([]);
    setSelectedGoals([]);
    setEducationLevel("");
    setAvailability("all");
    setSortBy("rating");
  };

  const activeFilterCount =
    selectedFields.length +
    selectedGoals.length +
    (educationLevel ? 1 : 0) +
    (availability !== "all" ? 1 : 0);

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
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="ml-1">
            {activeFilterCount}
          </Badge>
        )}
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    );
  }

  // Expanded state - full sidebar
  return (
    <Card className="sticky top-6 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount}</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Fields/Industries */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-3 block">
            Field of Interest
          </Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {fieldOptions.map((field) => (
              <div key={field} className="flex items-center space-x-2">
                <Checkbox
                  id={`field-${field}`}
                  checked={selectedFields.includes(field)}
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

        {/* Goals */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-3 block">
            Mentorship Goals
          </Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {goalOptions.map((goal) => (
              <div key={goal} className="flex items-center space-x-2">
                <Checkbox
                  id={`goal-${goal}`}
                  checked={selectedGoals.includes(goal)}
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

        {/* Education Level */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-3 block">
            Education Level
          </Label>
          <Select value={educationLevel} onValueChange={setEducationLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="High School">High School</SelectItem>
              <SelectItem value="Undergraduate">Undergraduate</SelectItem>
              <SelectItem value="Postgraduate">Postgraduate</SelectItem>
              <SelectItem value="Professional">Professional</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Availability */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-3 block">
            Availability
          </Label>
          <Select value={availability} onValueChange={setAvailability}>
            <SelectTrigger>
              <SelectValue placeholder="All experts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Experts</SelectItem>
              <SelectItem value="available">Available Now</SelectItem>
              <SelectItem value="this-week">Available This Week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort By */}
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-3 block">
            Sort By
          </Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="experience">Most Experienced</SelectItem>
              <SelectItem value="sessions">Most Sessions</SelectItem>
              <SelectItem value="recent">Recently Joined</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset Button */}
        {activeFilterCount > 0 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={resetFilters}
          >
            Reset All Filters
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
