"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";

export interface DiscussionsFilters {
  sortBy: string;
  postedBy: string;
  dateFrom: string;
  dateTo: string;
  fields: string[];
}

const DEFAULT_FILTERS: DiscussionsFilters = {
  sortBy: "mostRecent",
  postedBy: "",
  dateFrom: "",
  dateTo: "",
  fields: [],
};

const FIELD_OPTIONS = [
  "Technology & Software",
  "Business & Management",
  "Healthcare & Medicine",
  "Engineering",
  "Finance & Accounting",
  "Creative Arts & Design",
  "Education & Research",
  "Law & Legal Services",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFilters: DiscussionsFilters;
  onApply: (filters: DiscussionsFilters) => void;
}

export function DiscussionsFilterPopup({
  open,
  onOpenChange,
  initialFilters,
  onApply,
}: Props) {
  const [draft, setDraft] = useState<DiscussionsFilters>(initialFilters);

  // Sync when dialog opens with current applied filters
  const handleOpenChange = (val: boolean) => {
    if (val) setDraft(initialFilters);
    onOpenChange(val);
  };

  const toggleField = (field: string) => {
    setDraft((prev) => ({
      ...prev,
      fields: prev.fields.includes(field)
        ? prev.fields.filter((f) => f !== field)
        : [...prev.fields, field],
    }));
  };

  const handleReset = () => setDraft(DEFAULT_FILTERS);

  const handleApply = () => {
    onApply(draft);
    onOpenChange(false);
  };

  const activeCount =
    (draft.sortBy !== "mostRecent" ? 1 : 0) +
    (draft.postedBy.trim() ? 1 : 0) +
    (draft.dateFrom ? 1 : 0) +
    (draft.dateTo ? 1 : 0) +
    draft.fields.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md w-full rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Filter &amp; Sort Posts
            {activeCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeCount} active
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Sort By */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-800">Sort By</Label>
            <Select
              value={draft.sortBy}
              onValueChange={(v) => setDraft((p) => ({ ...p, sortBy: v }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mostRecent">Most Recent</SelectItem>
                <SelectItem value="mostLiked">Most Liked</SelectItem>
                <SelectItem value="mostViewed">Most Viewed</SelectItem>
                <SelectItem value="mostDiscussed">Most Discussed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Posted By */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-800">Posted By</Label>
            <Input
              placeholder="Author name..."
              value={draft.postedBy}
              onChange={(e) => setDraft((p) => ({ ...p, postedBy: e.target.value }))}
              className="rounded-xl"
            />
            <p className="text-xs text-gray-400">Filter by author name (partial match)</p>
          </div>

          {/* Between Dates */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-800">Between Dates</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-400 mb-1">From</p>
                <Input
                  type="date"
                  value={draft.dateFrom}
                  onChange={(e) => setDraft((p) => ({ ...p, dateFrom: e.target.value }))}
                  className="rounded-xl text-sm"
                />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">To</p>
                <Input
                  type="date"
                  value={draft.dateTo}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDraft((p) => ({ ...p, dateTo: e.target.value }))}
                  className="rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-800">Field / Topic</Label>
            <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto pr-1">
              {FIELD_OPTIONS.map((field) => (
                <div key={field} className="flex items-center gap-2">
                  <Checkbox
                    id={`field-${field}`}
                    checked={draft.fields.includes(field)}
                    onCheckedChange={() => toggleField(field)}
                  />
                  <label
                    htmlFor={`field-${field}`}
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    {field}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-row justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-1 text-gray-500"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
              onClick={handleApply}
            >
              Apply Filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
