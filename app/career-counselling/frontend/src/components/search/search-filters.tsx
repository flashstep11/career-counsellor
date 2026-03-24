import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface SearchFiltersProps {
  filters: any;
  onChange: (filters: any) => void;
  activeTab: string;
}

export default function SearchFilters({
  filters,
  onChange,
  activeTab,
}: SearchFiltersProps) {
  const renderFilters = () => {
    switch (activeTab) {
      case "colleges":
        return (
          <>
            <div className="space-y-4">
              <h3 className="font-semibold">Location</h3>
              <Select
                value={filters.location}
                onValueChange={(value) =>
                  onChange({ ...filters, location: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delhi">Delhi</SelectItem>
                  <SelectItem value="mumbai">Mumbai</SelectItem>
                  <SelectItem value="bangalore">Bangalore</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Course</h3>
              <Select
                value={filters.course}
                onValueChange={(value) =>
                  onChange({ ...filters, course: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "experts":
        return (
          <>
            <div className="space-y-4">
              <h3 className="font-semibold">Specialization</h3>
              <Select
                value={filters.specialization}
                onValueChange={(value) =>
                  onChange({ ...filters, specialization: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select specialization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cs">Computer Science</SelectItem>
                  <SelectItem value="mechanical">Mechanical</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Rating</h3>
              <div className="space-y-2">
                {[4, 3, 2].map((rating) => (
                  <div key={rating} className="flex items-center space-x-2">
                    <Checkbox
                      id={`rating-${rating}`}
                      checked={filters.rating === rating}
                      onCheckedChange={() => onChange({ ...filters, rating })}
                    />
                    <label htmlFor={`rating-${rating}`}>{rating}+ Stars</label>
                  </div>
                ))}
              </div>
            </div>
          </>
        );

      // Add more cases for videos and blogs
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
      {/* Common filters */}
      <div className="space-y-4">
        <h3 className="font-semibold">Sort By</h3>
        <Select
          value={filters.sortBy}
          onValueChange={(value) => onChange({ ...filters, sortBy: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevant">Most Relevant</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tab-specific filters */}
      {renderFilters()}
    </div>
  );
}
