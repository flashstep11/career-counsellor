"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
    const [availability, setAvailability] = useState<Availability>(
        initialAvailability || DEFAULT_AVAILABILITY
    );
    const [isSaving, setIsSaving] = useState(false);

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
                    Set your available hours for meeting with students. Students will be
                    able to book 1-hour slots within these windows.
                </p>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
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
                                        <Label className="text-sm font-medium text-gray-700">
                                            {DAY_LABELS[day]}
                                        </Label>
                                    </div>
                                    {dayData.isAvailable && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => addSlot(day)}
                                            className="text-blue-600 hover:text-blue-700"
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Add Slot
                                        </Button>
                                    )}
                                </div>

                                {dayData.isAvailable && (
                                    <div className="space-y-2 ml-12">
                                        {dayData.slots.map((slot, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-2"
                                            >
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
                                    </div>
                                )}

                                {!dayData.isAvailable && (
                                    <p className="text-sm text-gray-400 ml-12">Unavailable</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
