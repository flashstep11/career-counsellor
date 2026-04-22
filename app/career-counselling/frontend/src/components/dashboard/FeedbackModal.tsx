"use client";

import { useState } from "react";
import axios from "axios";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    meetingId: string;
    onSuccess: () => void;
}

export function FeedbackModal({ isOpen, onClose, meetingId, onSuccess }: FeedbackModalProps) {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (rating === 0) {
            setError("Please provide a rating from 1 to 5 stars.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const token = localStorage.getItem("token");
            // Assuming API URL prefix is handled
            const apiUrl = "";
            await axios.post(
                `${apiUrl}/api/meetings/${meetingId}/feedback`,
                {
                    rating,
                    comment,
                    isAnonymous: false // Could add a checkbox for this
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            onSuccess();
            onClose();
            // Optional reset
            setRating(0);
            setComment("");
        } catch (err: any) {
            console.error("Failed to submit feedback:", err);
            setError(err.response?.data?.detail || "Failed to submit feedback. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-xl">Rate your session</DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Star Rating Selection */}
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-sm text-gray-500 font-medium">How was your meeting?</p>
                        <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHover(star)}
                                    onMouseLeave={() => setHover(0)}
                                    className="focus:outline-none transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={`w-8 h-8 ${star <= (hover || rating)
                                                ? "fill-yellow-400 text-yellow-400"
                                                : "text-gray-300"
                                            } transition-colors`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Comment Area */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            Additional comments (optional)
                        </label>
                        <Textarea
                            placeholder="Share your thoughts about this session..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="resize-none h-24"
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md border border-red-100">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between flex-row">
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || rating === 0}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {isSubmitting ? "Submitting..." : "Submit Feedback"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
