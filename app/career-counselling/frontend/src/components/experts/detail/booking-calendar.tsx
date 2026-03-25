"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface TimeSlot {
    startTime: string;
    endTime: string;
    display: string;
}

interface BookingCalendarProps {
    expertId: string;
    meetingCost: number;
    disabled?: boolean;
}

export default function BookingCalendar({
    expertId,
    meetingCost,
    disabled = false,
}: BookingCalendarProps) {
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [isBooking, setIsBooking] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [monthAvailability, setMonthAvailability] = useState<Record<string, boolean>>({});
    const [isLoadingMonth, setIsLoadingMonth] = useState(false);
    const { user } = useAuth();
    const router = useRouter();

    // Generate calendar dates for the current month view
    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPad = firstDay.getDay(); // 0 = Sunday
        const days: (Date | null)[] = [];

        // Padding before the 1st
        for (let i = 0; i < startPad; i++) {
            days.push(null);
        }
        // Actual days
        for (let d = 1; d <= lastDay.getDate(); d++) {
            days.push(new Date(year, month, d));
        }
        return days;
    };

    const calendarDays = generateCalendarDays();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const formatDateForApi = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Fetch availability for the entire month when currentMonth changes
    useEffect(() => {
        const fetchMonthAvailability = async () => {
            setIsLoadingMonth(true);
            try {
                const year = currentMonth.getFullYear();
                // API month is 1-12
                const month = currentMonth.getMonth() + 1;
                const apiUrl = "";

                const response = await fetch(
                    `${apiUrl}/api/experts/${expertId}/availability?year=${year}&month=${month}`
                );

                if (response.ok) {
                    const data = await response.json();
                    setMonthAvailability(data.availability || {});
                }
            } catch (error) {
                console.error("Error loading month availability:", error);
            } finally {
                setIsLoadingMonth(false);
            }
        };

        fetchMonthAvailability();
    }, [expertId, currentMonth]);

    const handleDateSelect = async (date: Date) => {
        const dateStr = formatDateForApi(date);
        setSelectedDate(dateStr);
        setSelectedSlot(null);
        setIsLoadingSlots(true);

        try {
            const apiUrl = "";
            const response = await fetch(
                `${apiUrl}/api/experts/${expertId}/slots?date=${dateStr}`
            );
            if (!response.ok) throw new Error("Failed to load slots");
            const data = await response.json();
            setAvailableSlots(data.slots || []);
        } catch (error) {
            console.error("Error loading slots:", error);
            toast.error("Failed to load available time slots");
            setAvailableSlots([]);
        } finally {
            setIsLoadingSlots(false);
        }
    };

    const handleBook = async () => {
        if (!selectedSlot || !user) return;

        setIsBooking(true);
        try {
            const token = localStorage.getItem("token");
            const apiUrl = "";
            const response = await fetch(`${apiUrl}/api/meetings/book`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    expertId,
                    startTime: selectedSlot.startTime,
                    endTime: selectedSlot.endTime,
                }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.detail || "Failed to book meeting");
            }

            toast.success("Meeting booked successfully! Redirecting to your meetings...");
            setSelectedSlot(null);
            setAvailableSlots([]);
            setSelectedDate("");
            // Redirect to meetings dashboard after a short delay
            setTimeout(() => router.push("/meetings"), 1500);
        } catch (error) {
            console.error("Error booking meeting:", error);
            toast.error(
                error instanceof Error ? error.message : "Failed to book meeting"
            );
        } finally {
            setIsBooking(false);
        }
    };

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ];

    return (
        <div className="space-y-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Book a Session
                </h3>
                <p className="text-sm text-gray-500">
                    {meetingCost.toLocaleString("en-IN")} coins / session
                </p>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between px-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                        setCurrentMonth(
                            new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                        )
                    }
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-gray-700">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                        setCurrentMonth(
                            new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                        )
                    }
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <div key={d} className="text-xs font-medium text-gray-500 py-1">
                        {d}
                    </div>
                ))}
                {calendarDays.map((day, i) => {
                    if (!day) {
                        return <div key={`pad-${i}`} />;
                    }
                    const dateStr = formatDateForApi(day);
                    const isPast = day < today;
                    const isSelected = dateStr === selectedDate;
                    const isToday = day.toDateString() === new Date().toDateString();

                    // A date is unavailable if it's explicitly false in our map, or if we have loaded the map and it's missing/false
                    const hasAvailabilityData = Object.keys(monthAvailability).length > 0;
                    const isUnavailable = hasAvailabilityData && monthAvailability[dateStr] === false;
                    const isDisabled = isPast || disabled || isUnavailable;

                    return (
                        <button
                            key={dateStr}
                            disabled={isDisabled}
                            onClick={() => handleDateSelect(day)}
                            className={`
                relative text-sm p-2 rounded-lg transition-all
                ${isDisabled ? "text-gray-300 cursor-not-allowed overflow-hidden" : "hover:bg-blue-100 cursor-pointer"}
                ${isSelected ? "bg-blue-600 text-white hover:bg-blue-700 font-medium" : ""}
                ${isToday && !isSelected ? "ring-2 ring-blue-300 font-medium text-blue-800" : ""}
                ${isUnavailable && !isPast ? "opacity-60" : ""}
              `}
                        >
                            {/* Cross out explicitly unavailable days */}
                            {isUnavailable && (
                                <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
                                    <div className="w-full border-t flex-shrink-0" style={{ borderColor: 'rgba(156, 163, 175, 0.4)', transform: 'rotate(25deg)' }}></div>
                                </div>
                            )}
                            <span className="relative z-10">{day.getDate()}</span>
                        </button>
                    );
                })}
            </div>

            {/* Available Slots */}
            {selectedDate && (
                <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Available Slots for {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })}
                    </h4>

                    {isLoadingSlots ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        </div>
                    ) : availableSlots.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">
                            No available slots on this day.
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                            {availableSlots.map((slot, i) => (
                                <Button
                                    key={i}
                                    variant={selectedSlot === slot ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedSlot(slot)}
                                    className={`text-xs ${selectedSlot === slot
                                        ? "bg-blue-600 text-white"
                                        : "hover:border-blue-300"
                                        }`}
                                >
                                    {slot.display}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Book Button */}
            {selectedSlot && (
                <Button
                    onClick={handleBook}
                    disabled={isBooking || disabled}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3"
                >
                    {isBooking ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Booking...
                        </>
                    ) : (
                        <>
                            Confirm Booking — {meetingCost.toLocaleString("en-IN")} coins
                        </>
                    )}
                </Button>
            )}
        </div>
    );
}
