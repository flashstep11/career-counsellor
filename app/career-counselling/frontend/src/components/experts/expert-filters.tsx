import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface ExpertFiltersProps {
  filters: {
    sortBy: string;
    availabilityFilter: string;
  };
  onChange: (filters: any) => void;
  onReset?: () => void;
}

export default function ExpertFilters({
  filters,
  onChange,
  onReset,
}: ExpertFiltersProps) {
  return (
    <Card className="p-4 space-y-6">
      {/* Sort By Filter */}
      <div className="space-y-2">
        <Label htmlFor="sortBy">Sort By</Label>
        <Select 
          value={filters.sortBy} 
          onValueChange={(value) => onChange({ ...filters, sortBy: value })}
        >
          <SelectTrigger id="sortBy">
            <SelectValue placeholder="No sorting" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No sorting</SelectItem>
            <SelectItem value="meetingCost">Meeting Cost (low to high)</SelectItem>
            <SelectItem value="rating">Rating (high to low)</SelectItem>
            <SelectItem value="studentsGuided">Students Guided (high to low)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Availability Filter */}
      <div className="space-y-2">
        <Label htmlFor="availabilityFilter">Show</Label>
        <Select 
          value={filters.availabilityFilter} 
          onValueChange={(value) => onChange({ ...filters, availabilityFilter: value })}
        >
          <SelectTrigger id="availabilityFilter">
            <SelectValue placeholder="Filter availability..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Experts</SelectItem>
            <SelectItem value="available">Only Available Experts</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}
