"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowUp, ArrowDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Available fields for sorting
const sortableFields = [
  { id: "yearOfEstablishment", name: "Year of Establishment" },
  { id: "placementMedian", name: "Median Package" },
  { id: "landArea", name: "Land Area" },
  { id: "placement", name: "Placement Percentage" }
];

interface CollegeSortingProps {
  sortOptions: {
    fields: { field: string; order: 'asc' | 'desc'; priority: number }[];
  };
  onChange: (options: {
    fields: { field: string; order: 'asc' | 'desc'; priority: number }[];
  }) => void;
}

export default function CollegeSorting({ sortOptions, onChange }: CollegeSortingProps) {
  const [open, setOpen] = useState(false);
  const [localSortOptions, setLocalSortOptions] = useState<{
    fields: { field: string; order: 'asc' | 'desc'; priority: number }[];
  }>({ ...sortOptions });
  const [selectedField, setSelectedField] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<'asc' | 'desc'>('asc');

  // Apply local sorting options to the parent component
  const applySorting = () => {
    // Make sure priorities are sequential starting from 1
    const updatedFields = [...localSortOptions.fields]
      .sort((a, b) => a.priority - b.priority)
      .map((field, index) => ({ ...field, priority: index + 1 }));
    
    onChange({ fields: updatedFields });
    setOpen(false);
  };

  // Reset sorting options
  const resetSorting = () => {
    setLocalSortOptions({ fields: [] });
  };

  // Add a field to sort by
  const addSortField = () => {
    if (!selectedField) return;
    
    // Check if field already exists
    if (localSortOptions.fields.some(f => f.field === selectedField)) {
      return;
    }
    
    const newField = {
      field: selectedField,
      order: selectedOrder,
      priority: localSortOptions.fields.length + 1
    };
    
    setLocalSortOptions({
      fields: [...localSortOptions.fields, newField]
    });
    
    setSelectedField("");
    setSelectedOrder('asc');
  };

  // Remove a field from sorting
  const removeSortField = (fieldToRemove: string) => {
    const updatedFields = localSortOptions.fields
      .filter(f => f.field !== fieldToRemove)
      .map((field, index) => ({ ...field, priority: index + 1 }));
      
    setLocalSortOptions({ fields: updatedFields });
  };

  // Toggle the sort order of a field
  const toggleFieldOrder = (fieldToToggle: string) => {
    const updatedFields = localSortOptions.fields.map(field => {
      if (field.field === fieldToToggle) {
        return { ...field, order: (field.order === 'asc' ? 'desc' : 'asc') as 'asc' | 'desc' };
      }
      return field;
    });
    
    setLocalSortOptions({ fields: updatedFields });
  };

  // Move a field up in priority
  const moveFieldUp = (fieldToMove: string) => {
    const fields = [...localSortOptions.fields];
    const index = fields.findIndex(f => f.field === fieldToMove);
    
    if (index > 0) {
      const temp = fields[index].priority;
      fields[index].priority = fields[index - 1].priority;
      fields[index - 1].priority = temp;
      
      setLocalSortOptions({ fields: fields.sort((a, b) => a.priority - b.priority) });
    }
  };

  // Move a field down in priority
  const moveFieldDown = (fieldToMove: string) => {
    const fields = [...localSortOptions.fields];
    const index = fields.findIndex(f => f.field === fieldToMove);
    
    if (index < fields.length - 1) {
      const temp = fields[index].priority;
      fields[index].priority = fields[index + 1].priority;
      fields[index + 1].priority = temp;
      
      setLocalSortOptions({ fields: fields.sort((a, b) => a.priority - b.priority) });
    }
  };

  return (
    <div className="mb-6">
      <Dialog open={open} onOpenChange={setOpen}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {sortOptions.fields.length > 0 ? (
              <>
                <span className="font-medium">Sorted by:</span>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.fields
                    .sort((a, b) => a.priority - b.priority)
                    .map((field) => {
                      const fieldName = sortableFields.find(f => f.id === field.field)?.name || field.field;
                      return (
                        <Badge key={field.field} variant="outline" className="bg-blue-50">
                          {fieldName} {field.order === 'asc' ? '↑' : '↓'} 
                          <span className="ml-1 text-xs text-gray-500">({field.priority})</span>
                        </Badge>
                      );
                    })}
                </div>
              </>
            ) : (
              <span className="text-sm text-gray-500">No sorting applied</span>
            )}
          </div>
          
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Configure Sorting
            </Button>
          </DialogTrigger>
        </div>

        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Configure College Sorting</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Sort by</label>
                  <Select value={selectedField} onValueChange={setSelectedField}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortableFields.map(field => (
                        <SelectItem 
                          key={field.id} 
                          value={field.id}
                          disabled={localSortOptions.fields.some(f => f.field === field.id)}
                        >
                          {field.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Order</label>
                  <Select value={selectedOrder} onValueChange={(value: 'asc' | 'desc') => setSelectedOrder(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending ↑</SelectItem>
                      <SelectItem value="desc">Descending ↓</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  size="sm" 
                  onClick={addSortField} 
                  disabled={!selectedField}
                  className="mb-0.5"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              
              {localSortOptions.fields.length > 0 && (
                <Card className="mt-4">
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm font-medium">Sort Priority (Top to Bottom)</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="space-y-2">
                      {localSortOptions.fields
                        .sort((a, b) => a.priority - b.priority)
                        .map((field) => {
                          const fieldName = sortableFields.find(f => f.id === field.field)?.name || field.field;
                          return (
                            <div key={field.field} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                              <div className="flex items-center gap-1">
                                <GripVertical className="h-4 w-4 text-gray-400" />
                                <span>{fieldName}</span>
                                <Badge variant={field.order === 'asc' ? "default" : "secondary"} className="ml-2">
                                  {field.order === 'asc' ? 'ASC' : 'DESC'}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => toggleFieldOrder(field.field)}
                                  className="h-8 w-8 p-0"
                                >
                                  {field.order === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                </Button>
                                
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => moveFieldUp(field.field)} 
                                  disabled={field.priority === 1}
                                  className="h-8 w-8 p-0"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => moveFieldDown(field.field)} 
                                  disabled={field.priority === localSortOptions.fields.length}
                                  className="h-8 w-8 p-0"
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                                
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => removeSortField(field.field)}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={resetSorting}>
              <X className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={applySorting}>
                <Check className="h-4 w-4 mr-2" />
                Apply Sorting
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}