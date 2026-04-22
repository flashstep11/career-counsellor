import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const states = [
  "All States",
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh',
  'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu',
  'Jharkhand', 'Karnataka', 'Kashmir', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

const courses = [
  "All Courses",
  "Computer Science & IT",
  "Electrical & Electronics",
  "Mechanical & Manufacturing",
  "Civil & Infrastructure",
  "Materials & Metallurgy",
  "Chemical & Process",
  "Biotechnology & Life Sciences",
  "Mathematics & Physics",
  "Interdisciplinary",
  "Integrated & Dual Degrees"
];

interface CollegeFiltersProps {
  filters: {
    state: string;
    course: string;
    landArea: number;
    placement: number;
    type: string;
    locality_type: string;
    ranking: string;
  };
  onChange: (filters: any) => void;
}

export default function CollegeFilters({
  filters,
  onChange,
}: CollegeFiltersProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold">State</h3>
        <Select
          value={filters.state}
          onValueChange={(value) => onChange({ ...filters, state: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px] overflow-y-auto">
            {states.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Course</h3>
        <Select
          value={filters.course}
          onValueChange={(value) => onChange({ ...filters, course: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px] overflow-y-auto">
            {courses.map((course) => (
              <SelectItem key={course} value={course}>
                {course}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Placement Percentage &gt;</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Current: {filters.placement}%</span>
        </div>
        <Slider
          value={[filters.placement]}
          onValueChange={(value) => onChange({ ...filters, placement: value[0] })}
          min={0}
          max={100}
          step={5}
        />
        <div className="flex justify-between text-sm text-gray-500">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Land Area (acres) &gt;</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Current: {filters.landArea} acres</span>
        </div>
        <Slider
          value={[filters.landArea]}
          onValueChange={(value) => onChange({ ...filters, landArea: value[0] })}
          min={0}
          max={1000}
          step={10}
        />
        <div className="flex justify-between text-sm text-gray-500">
          <span>0</span>
          <span>1000 acres</span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">College Type</h3>
        <div className="space-y-2">
          {["Public", "Private", "Other"].map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={type}
                checked={filters.type === type.toLowerCase()}
                onCheckedChange={(checked) =>
                  onChange({
                    ...filters,
                    type: checked ? type.toLowerCase() : "",
                  })
                }
              />
              <label htmlFor={type} className="text-sm">
                {type}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Locality Type</h3>
        <div className="space-y-2">
          {["Urban", "Rural"].map((locality_type) => (
            <div key={locality_type} className="flex items-center space-x-2">
              <Checkbox
                id={locality_type}
                checked={filters.locality_type === locality_type.toLowerCase()}
                onCheckedChange={(checked) =>
                  onChange({
                    ...filters,
                    locality_type: checked ? locality_type.toLowerCase() : "",
                  })
                }
              />
              <label htmlFor={locality_type} className="text-sm">
                {locality_type}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
