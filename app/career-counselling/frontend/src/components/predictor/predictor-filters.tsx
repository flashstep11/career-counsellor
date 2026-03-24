"use client";

"use client";

import { Slider } from "@mui/material";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export interface Filters {
  category: string;
  gender: string;
  homeState: string;
  state: string;
  branch: string;
  localityType: string;
  avgPackage: [number, number];
  genderRatio: [number, number];
  nirfRanking: [number, number];
  distance: [number, number];
  hIndex: [number, number]; // Add h-index filter
  exams: Record<string, number>;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface PredictorFiltersProps {
  userData: {
    category: string;
    gender: string;
    homeState: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
  filters: Filters;
  onChange: (filters: Filters) => void;
  toggleExam: (exam: string, checked: boolean) => void;
  updateExamRank: (exam: string, rank: number) => void;
}

const examOptions = ["JEE Advanced", "JEE Mains"];

const states = [
  "All States",
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh",
  "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Delhi", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jammu", "Jharkhand", "Karnataka",
  "Kerala", "Ladakh", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal"
];

const branches = [
  "All Branches",
  "Computer Science & IT",
  "Electrical & Electronics",
  "Mechanical & Manufacturing",
  "Civil & Infrastructure",
  "Materials & Metallurgy",
  "Chemical & Process",
  "Biotechnology & Life Sciences",
  "Mathematics & Physics",
  "Interdisciplinary"
];

const localityTypes = ["Urban", "Rural"];

export default function PredictorFilters({
  userData,
  filters,
  onChange,
  toggleExam,
  updateExamRank,
}: PredictorFiltersProps) {
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  const requestLocation = () => {
    // Prevent multiple simultaneous location requests
    if (isRequestingLocation) return;

    if (navigator.geolocation) {
      setIsRequestingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          onChange({
            ...filters,
            location: location,
          });
          setIsRequestingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsRequestingLocation(false);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  // Handler for when user interacts with distance slider
  const handleDistanceChange = (event: Event, value: number | number[]) => {
    if (!userData.location && !isRequestingLocation) {
      // Request location but don't update the slider value until we have it
      requestLocation();
      return;
    }

    // Only update the slider value if we have a location
    if (userData.location) {
      onChange({ ...filters, distance: value as [number, number] });
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
      {/* User Data Display */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Category:</span>
          <Button disabled className="bg-gray-100 text-black cursor-default">
            {userData.category}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Gender:</span>
          <Button disabled className="bg-gray-100 text-black cursor-default">
            {userData.gender}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Home State:</span>
          <Button disabled className="bg-gray-100 text-black cursor-default">
            {userData.homeState}
          </Button>
        </div>
      </div>

      {/* Exam Section */}
      <div className="space-y-4">
        <h3 className="font-semibold">Exams</h3>
        {examOptions.map((exam) => {
          const isChecked = exam in filters.exams;
          return (
            <div
              key={exam}
              // Two columns: left (checkbox + label), right (rank input or placeholder)
              className="grid grid-cols-[auto_1fr] gap-2 items-center mb-2"
            >
              {/* Left column: checkbox + label */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={exam}
                  checked={isChecked}
                  onCheckedChange={(checked) => toggleExam(exam, !!checked)}
                />
                <label htmlFor={exam} className="text-sm">
                  {exam}
                </label>
              </div>

              {/* Right column: rank input (if checked) or empty placeholder */}
              {isChecked ? (
                <Input
                  type="number"
                  placeholder="Enter Rank"
                  className="w-32"
                  value={filters.exams[exam] || 0}
                  onChange={(e) => updateExamRank(exam, Number(e.target.value))}
                />
              ) : (
                <div />
              )}
            </div>
          );
        })}
      </div>

      {/* Other Filters */}
      <div className="space-y-4">
        <h3 className="font-semibold">State</h3>
        <Select
          value={filters.state}
          onValueChange={(value) => onChange({ ...filters, state: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            {states.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Branch Categories</h3>
        <Select
          value={filters.branch}
          onValueChange={(value) => onChange({ ...filters, branch: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Locality Type</h3>
        <Select
          value={filters.localityType}
          onValueChange={(value) => onChange({ ...filters, localityType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select locality type" />
          </SelectTrigger>
          <SelectContent>
            {localityTypes.map((lt) => (
              <SelectItem key={lt} value={lt}>
                {lt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        <h3 className="font-semibold">Average Package (LPA)</h3>
        <Slider
          value={filters.avgPackage}
          onChange={(_, value) =>
            onChange({ ...filters, avgPackage: value as [number, number] })
          }
          min={0}
          max={100}
          step={1}
          valueLabelDisplay="auto"
          sx={{ color: "black" }}
        />
      </div>
      <div className="space-y-4">
        <h3 className="font-semibold">Gender Ratio (M:F)</h3>
        <Slider
          value={filters.genderRatio}
          onChange={(_, value) =>
            onChange({ ...filters, genderRatio: value as [number, number] })
          }
          min={0}
          max={1}
          step={0.01}
          valueLabelDisplay="auto"
          sx={{ color: "black" }}
        />
      </div>
      <div className="space-y-4">
        <h3 className="font-semibold">NIRF Ranking</h3>
        <Slider
          value={filters.nirfRanking}
          onChange={(_, value) =>
            onChange({ ...filters, nirfRanking: value as [number, number] })
          }
          min={0}
          max={100}
          step={1}
          valueLabelDisplay="auto"
          sx={{ color: "black" }}
        />
      </div>

      {/* H-Index Filter */}
      <div className="space-y-4">
        <h3 className="font-semibold">H-Index (Research Quality)</h3>
        <div className="flex flex-col gap-1">
          <Slider
            value={filters.hIndex}
            onChange={(_, value) =>
              onChange({ ...filters, hIndex: value as [number, number] })
            }
            min={0}
            max={150}
            step={5}
            valueLabelDisplay="auto"
            sx={{ color: "black" }}
          />
        </div>
      </div>

      {/* Distance Filter */}
      <div className="space-y-4">
        <h3 className="font-semibold">Distance (km)</h3>
        <div className="flex flex-col gap-1">
          <Slider
            value={filters.distance}
            onChange={handleDistanceChange}
            disabled={!userData.location}
            min={0}
            max={2500}
            step={50}
            valueLabelDisplay="auto"
            sx={{ color: userData.location ? "black" : "gray" }}
          />
        </div>
      </div>
    </div>
  );
}
