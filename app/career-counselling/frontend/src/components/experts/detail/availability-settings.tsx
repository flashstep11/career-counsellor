"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, Save, Loader2, Plus, Trash2, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TimeSlot {
    startTime: string;
    endTime: string;
}

interface DayAvailability {
    isAvailable: boolean;
    slots: TimeSlot[];
}

interface Availability {
    monday: DayAvailability;
    tuesday: DayAvailability;
    wednesday: DayAvailability;
    thursday: DayAvailability;
    friday: DayAvailability;
    saturday: DayAvailability;
    sunday: DayAvailability;
}

const DAYS = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
] as const;

const DAY_LABELS: Record<string, string> = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
};

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

const DEFAULT_SLOT: TimeSlot = { startTime: "09:00", endTime: "17:00" };

const DEFAULT_AVAILABILITY: Availability = {
    monday: { isAvailable: false, slots: [] },
    tuesday: { isAvailable: false, slots: [] },
    wednesday: { isAvailable: false, slots: [] },
    thursday: { isAvailable: false, slots: [] },
    friday: { isAvailable: false, slots: [] },
    saturday: { isAvailable: false, slots: [] },
    sunday: { isAvailable: false, slots: [] },
};

interface AvailabilitySettingsProps {
    expertId: string;
    initialAvailability?: Availability | null;
}

export default function AvailabilitySettings({
    expertId,
    initialAvailability,
}: AvailabilitySettingsProps) {
    const [useQuickSetup, setUseQuickSetup] = useState(true);
    const [availability, setAvailability] = useState<Availability>(
        initialAvailability || DEFAULT_AVAILABILITY
    );
    const [isSaving, setIsSaving] = useState(false);
    const [expandAdvanced, setExpandAdvanced] = useState(false);
    const [quickSetupWindows, setQuickSetupWindows] = useState<TimeSlot[]>([
        { startTime: "09:00", endTime: "17:00" },
    ]);
    const [quickSetupDays, setQuickSetupDays] = useState(WEEKDAYS);

    const addQuickSetupWindow = () => {
        setQuickSetupWindows((prev) => {
            const last = prev[prev.length - 1];
            const nextStart = last?.endTime || "09:00";
            const nextEndHour = Math.min(parseInt(nextStart.split(":")[0], 10) + 1, 23);
            const nextEnd = `${String(nextEndHour).padStart(2, "0")}:00`;
            return [...prev, { startTime: nextStart, endTime: nextEnd }];
        });
    };

    const removeQuickSetupWindow = (index: number) => {
        setQuickSetupWindows((prev) => prev.filter((_, i) => i !== index));
    };

    const updateQuickSetupWindow = (
        index: number,
        field: "startTime" | "endTime",
        value: string
    ) => {
        setQuickSetupWindows((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };

            if (
                field === "startTime" &&
                updated[index].endTime <= updated[index].startTime
            ) {
                const [h, m] = updated[index].startTime.split(":").map(Number);
                const bumped = Math.min(h + 1, 23);
                updated[index].endTime = `${String(bumped).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            }

            return updated;
        });
    };

    // Apply quick setup to all selected days
    const applyQuickSetup = () => {
        const isValidWindow = (start: string, end: string) => end > start;

        if (quickSetupWindows.length === 0) {
            toast.error("Please add at least one time window.");
            return;
        }

        if (quickSetupDays.length === 0) {
            toast.error("Please select at least one day.");
            return;
        }

        for (let i = 0; i < quickSetupWindows.length; i++) {
            const window = quickSetupWindows[i];
            if (!isValidWindow(window.startTime, window.endTime)) {
                toast.error(`Window ${i + 1} is invalid. End time must be after start time.`);
                return;
            }
        }

        const sortedSlots = [...quickSetupWindows].sort((a, b) => a.startTime.localeCompare(b.startTime));
        for (let i = 1; i < sortedSlots.length; i++) {
            if (sortedSlots[i].startTime < sortedSlots[i - 1].endTime) {
                toast.error("Time windows overlap. Please adjust your quick setup windows.");
                return;
            }
        }

        setAvailability((prev) => {
            const updated = { ...prev };
            quickSetupDays.forEach((day) => {
                updated[day as keyof Availability] = {
                    isAvailable: true,
                    slots: sortedSlots,
                };
            });
            return updated;
        });
        toast.success(`Schedule applied to ${quickSetupDays.length} days`);
    };

    const toggleDay = (day: string) => {
        setAvailability((prev) => {
            const dayData = prev[day as keyof Availability];
            return {
                ...prev,
                [day]: {
                    isAvailable: !dayData.isAvailable,
                    slots: !dayData.isAvailable && dayData.slots.length === 0
                        ? [{ ...DEFAULT_SLOT }]
                        : dayData.slots,
                },
            };
        });
    };

    const addSlot = (day: string) => {
        setAvailability((prev) => {
            const dayData = prev[day as keyof Availability];
            const lastSlot = dayData.slots[dayData.slots.length - 1];
            const newStart = lastSlot ? lastSlot.endTime : "09:00";
            const newEndHour = Math.min(parseInt(newStart.split(":")[0]) + 2, 23);
            const newEnd = `${String(newEndHour).padStart(2, "0")}:00`;
            return {
                ...prev,
                [day]: {
                    ...dayData,
                    slots: [...dayData.slots, { startTime: newStart, endTime: newEnd }],
                },
            };
        });
    };

    const removeSlot = (day: string, index: number) => {
        setAvailability((prev) => {
            const dayData = prev[day as keyof Availability];
            const newSlots = dayData.slots.filter((_, i) => i !== index);
            return {
                ...prev,
                [day]: {
                    ...dayData,
                    isAvailable: newSlots.length > 0 ? dayData.isAvailable : false,
                    slots: newSlots,
                },
            };
        });
    };

    const updateSlotTime = (
        day: string,
        index: number,
        field: "startTime" | "endTime",
        value: string
    ) => {
        setAvailability((prev) => {
            const dayData = prev[day as keyof Availability];
            const newSlots = [...dayData.slots];
            const updated = { ...newSlots[index], [field]: value };
            // Auto-fix: if endTime <= startTime or endTime is 00:00, bump to startTime + 1h
            if (field === "startTime" && updated.endTime <= updated.startTime) {
                const [h, m] = updated.startTime.split(":").map(Number);
                const bumped = Math.min(h + 1, 23);
                updated.endTime = `${String(bumped).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            }
            newSlots[index] = updated;
            return {
                ...prev,
                [day]: { ...dayData, slots: newSlots },
            };
        });
    };

    const toggleDay_QuickSetup = (day: string) => {
        setQuickSetupDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem("token");
            const apiUrl = "";
            const response = await fetch(`${apiUrl}/api/experts/${expertId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ availability }),
            });

            if (!response.ok) throw new Error("Failed to save availability");
            toast.success("Availability saved successfully!");
        } catch (error) {
            console.error("Error saving availability:", error);
            toast.error("Failed to save availability. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const getAvailabilitySummary = (day: string) => {
        const dayData = availability[day as keyof Availability];
        if (!dayData.isAvailable) return "Unavailable";
        if (dayData.slots.length === 1) {
            return `${dayData.slots[0].startTime} - ${dayData.slots[0].endTime}`;
        }
        return `${dayData.slots.length} time slots`;
    };

    const workingDays = DAYS.filter((day) => availability[day].isAvailable);

    const getSlotLabel = (slot: TimeSlot) => `${slot.startTime}-${slot.endTime}`;

    const getWorkingHoursRow = (day: string) => {
        const dayData = availability[day as keyof Availability];
        if (!dayData.isAvailable || dayData.slots.length === 0) return "Unavailable";
        return dayData.slots.map(getSlotLabel).join(", ");
    };

    return (
        <Card className="bg-white shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        Availability Schedule
                    </CardTitle>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Schedule
                    </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                    Set your available hours for meetings with students.
                </p>
            </CardHeader>

            <CardContent className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Current Working Hours</h3>
                    {workingDays.length === 0 ? (
                        <p className="text-sm text-gray-600">No working hours set yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {workingDays.map((day) => (
                                <div key={day} className="flex items-start justify-between gap-4">
                                    <span className="text-sm font-medium text-gray-700 min-w-20">
                                        {DAY_LABELS[day]}
                                    </span>
                                    <span className="text-sm text-gray-600 text-right">
                                        {getWorkingHoursRow(day)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Setup Section */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                                ⚡
                            </span>
                            Quick Setup
                        </h3>
                        <Label className="flex items-center gap-2 cursor-pointer">
                            {useQuickSetup ? "Active" : "Inactive"}
                            <Switch checked={useQuickSetup} onCheckedChange={setUseQuickSetup} />
                        </Label>
                    </div>

                    {useQuickSetup && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Set one or more time windows for multiple days at once
                            </p>

                            <div className="rounded-lg border border-blue-200 bg-white p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium text-gray-700">Time windows</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addQuickSetupWindow}
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Window
                                    </Button>
                                </div>

                                {quickSetupWindows.map((window, index) => (
                                    <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                                        <div>
                                            <Label className="text-sm font-medium mb-2 block">
                                                Window {index + 1} From
                                            </Label>
                                            <input
                                                type="time"
                                                value={window.startTime}
                                                onChange={(e) =>
                                                    updateQuickSetupWindow(index, "startTime", e.target.value)
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium mb-2 block">
                                                Window {index + 1} To
                                            </Label>
                                            <input
                                                type="time"
                                                value={window.endTime}
                                                min={window.startTime}
                                                onChange={(e) =>
                                                    updateQuickSetupWindow(index, "endTime", e.target.value)
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            disabled={quickSetupWindows.length === 1}
                                            onClick={() => removeQuickSetupWindow(index)}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            aria-label={`Remove window ${index + 1}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <Label className="text-sm font-medium mb-2 block">Apply to Days</Label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {DAYS.map((day) => (
                                        <Button
                                            key={day}
                                            variant={quickSetupDays.includes(day) ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => toggleDay_QuickSetup(day)}
                                            className={quickSetupDays.includes(day) ? "bg-blue-600 hover:bg-blue-700" : ""}
                                        >
                                            {DAY_LABELS[day].slice(0, 3)}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <Button
                                onClick={applyQuickSetup}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                                Apply to Selected Days
                            </Button>
                        </div>
                    )}
                </div>

                {/* Advanced Fine-Tuning Section */}
                <div className="space-y-4">
                    <button
                        onClick={() => setExpandAdvanced(!expandAdvanced)}
                        className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                        {expandAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        Advanced: Fine-Tune Day-by-Day
                    </button>

                    {expandAdvanced && (
                        <div className="space-y-3 pl-6 pt-2 border-l-2 border-blue-200">
                            {DAYS.map((day) => {
                                const dayData = availability[day];
                                return (
                                    <div
                                        key={day}
                                        className={`p-4 rounded-lg border transition-colors ${dayData.isAvailable
                                            ? "border-blue-200 bg-blue-50/50"
                                            : "border-gray-200 bg-gray-50/50"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <Switch
                                                    checked={dayData.isAvailable}
                                                    onCheckedChange={() => toggleDay(day)}
                                                />
                                                <Label className="text-sm font-medium text-gray-700 min-w-16">
                                                    {DAY_LABELS[day]}
                                                </Label>
                                            </div>
                                            <span className="text-xs font-medium text-gray-500">
                                                {getAvailabilitySummary(day)}
                                            </span>
                                        </div>

                                        {dayData.isAvailable && (
                                            <div className="space-y-2 ml-10">
                                                {dayData.slots.map((slot, index) => (
                                                    <div key={index} className="flex items-center gap-2">
                                                        <input
                                                            type="time"
                                                            value={slot.startTime}
                                                            onChange={(e) =>
                                                                updateSlotTime(day, index, "startTime", e.target.value)
                                                            }
                                                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        />
                                                        <span className="text-gray-500 text-sm">to</span>
                                                        <input
                                                            type="time"
                                                            value={slot.endTime}
                                                            min={slot.startTime}
                                                            max="23:59"
                                                            onChange={(e) =>
                                                                updateSlotTime(day, index, "endTime", e.target.value)
                                                            }
                                                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        />
                                                        {dayData.slots.length > 1 && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeSlot(day, index)}
                                                                className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}

                                                {dayData.isAvailable && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => addSlot(day)}
                                                        className="text-blue-600 hover:text-blue-700 p-1 h-auto"
                                                    >
                                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                                        <span className="text-xs">Add Slot</span>
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Info Alert */}
                <Alert className="border-blue-200 bg-blue-50">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm text-blue-800">
                        Students can book sessions based on your selected session length and available windows.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
}
