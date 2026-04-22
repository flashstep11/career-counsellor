"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, GraduationCap, Target, Sparkles } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* ─── Constants ────────────────────────────────────────────────────── */

const GRADES = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"] as const;

const STREAMS = [
    "Science (PCM)",
    "Science (PCB)",
    "Commerce",
    "Arts / Humanities",
] as const;

const INTEREST_OPTIONS = [
    "Engineering",
    "Medicine / Healthcare",
    "Law",
    "Business / MBA",
    "Computer Science / IT",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Commerce / Finance",
    "Economics",
    "Design / Architecture",
    "Arts & Literature",
    "Social Sciences",
    "Government / Civil Services",
    "Defence",
    "Sports",
    "Media & Journalism",
    "Agriculture",
    "Education / Teaching",
] as const;

/* ─── Types ─────────────────────────────────────────────────────────── */

interface FormData {
    grade: string;
    preferred_stream: string;
    target_college: string;
    interests: string[];
    career_goals: string;
}

interface OnboardingModalProps {
    open: boolean;
    onComplete: () => void;
    onSkip?: () => void;
}

/* ─── Step indicator ────────────────────────────────────────────────── */

function StepDot({ active, done }: { active: boolean; done: boolean }) {
    return (
        <div
            className={cn(
                "h-2.5 w-2.5 rounded-full transition-all",
                done ? "bg-blue-600" : active ? "bg-blue-400 scale-125" : "bg-gray-200"
            )}
        />
    );
}

/* ─── Main component ────────────────────────────────────────────────── */

export default function OnboardingModal({ open, onComplete, onSkip }: OnboardingModalProps) {
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState<FormData>({
        grade: "",
        preferred_stream: "",
        target_college: "",
        interests: [],
        career_goals: "",
    });

    /* ── helpers ── */
    const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const toggleInterest = (interest: string) => {
        setForm((prev) => {
            const already = prev.interests.includes(interest);
            return {
                ...prev,
                interests: already
                    ? prev.interests.filter((i) => i !== interest)
                    : prev.interests.length < 8
                        ? [...prev.interests, interest]
                        : prev.interests,
            };
        });
    };

    const step1Valid = form.grade !== "" && form.preferred_stream !== "";
    const step2Valid = form.interests.length > 0;

    const handleNext = () => {
        if (step === 1 && step1Valid) setStep(2);
    };

    const handleBack = () => {
        if (step === 2) setStep(1);
    };

    const handleSubmit = async () => {
        if (!step2Valid) return;
        setSubmitting(true);
        try {
            const payload: Record<string, unknown> = {
                grade: form.grade || undefined,
                preferred_stream: form.preferred_stream || undefined,
                interests: form.interests,
                target_college: form.target_college || undefined,
                career_goals: form.career_goals || undefined,
            };
            // Remove undefined keys
            Object.keys(payload).forEach(
                (k) => payload[k] === undefined && delete payload[k]
            );

            await axios.put("/api/onboarding", payload);
            toast.success("Profile personalised! Welcome to AlumNiti 🎉");
            onComplete();
        } catch {
            toast.error("Could not save your preferences. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open}>
            {/* Prevent closing by clicking outside — user must complete onboarding */}
            <DialogContent
                className="sm:max-w-lg"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
                // hide the default ✕ close button
                showCloseButton={false}
            >
                <DialogHeader className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-blue-600" />
                        <DialogTitle className="text-lg font-semibold">
                            Let&apos;s personalise your experience
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-sm text-gray-500">
                        Answer a few quick questions so we can tailor your feed.{" "}
                        <span className="font-medium text-gray-700">Step {step} of 2</span>
                    </DialogDescription>

                    {/* Step dots + skip */}
                    <div className="flex items-center justify-between pt-1">
                        <div className="flex gap-2">
                            <StepDot active={step === 1} done={step > 1} />
                            <StepDot active={step === 2} done={false} />
                        </div>
                        {onSkip && (
                            <button
                                type="button"
                                onClick={onSkip}
                                className="text-xs text-gray-400 hover:text-gray-600 underline-offset-2 hover:underline transition-colors"
                            >
                                Skip for now
                            </button>
                        )}
                    </div>
                </DialogHeader>

                {/* ── Step 1 ── */}
                {step === 1 && (
                    <div className="space-y-5 mt-2">
                        {/* Grade */}
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1.5">
                                <GraduationCap className="h-4 w-4 text-blue-600" />
                                Which grade are you in?
                            </Label>
                            <Select value={form.grade} onValueChange={(v) => set("grade", v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select your grade" />
                                </SelectTrigger>
                                <SelectContent>
                                    {GRADES.map((g) => (
                                        <SelectItem key={g} value={g}>
                                            {g}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Stream */}
                        <div className="space-y-1.5">
                            <Label>Which stream are you in?</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {STREAMS.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => set("preferred_stream", s)}
                                        className={cn(
                                            "rounded-lg border px-3 py-2 text-sm font-medium text-left transition-colors",
                                            form.preferred_stream === s
                                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                                : "border-gray-200 hover:bg-gray-50"
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Button
                            className="w-full"
                            disabled={!step1Valid}
                            onClick={handleNext}
                        >
                            Next
                        </Button>
                    </div>
                )}

                {/* ── Step 2 ── */}
                {step === 2 && (
                    <div className="space-y-5 mt-2">
                        {/* Target college */}
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1.5">
                                <Target className="h-4 w-4 text-blue-600" />
                                Which college are you aiming for?
                                <span className="text-gray-400 font-normal text-xs">(optional)</span>
                            </Label>
                            <Input
                                placeholder="e.g. IIT Bombay, AIIMS Delhi, SRCC…"
                                value={form.target_college}
                                onChange={(e) => set("target_college", e.target.value)}
                            />
                        </div>

                        {/* Interests */}
                        <div className="space-y-1.5">
                            <Label>
                                What are your interests?{" "}
                                <span className="text-gray-400 font-normal text-xs">
                                    (pick up to 8)
                                </span>
                            </Label>
                            <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1">
                                {INTEREST_OPTIONS.map((interest) => {
                                    const selected = form.interests.includes(interest);
                                    return (
                                        <button
                                            key={interest}
                                            type="button"
                                            onClick={() => toggleInterest(interest)}
                                            className={cn(
                                                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                                                selected
                                                    ? "border-blue-600 bg-blue-50 text-blue-700"
                                                    : "border-gray-200 hover:bg-gray-50 text-gray-700",
                                                !selected &&
                                                form.interests.length >= 8 &&
                                                "opacity-40 cursor-not-allowed"
                                            )}
                                        >
                                            {interest}
                                        </button>
                                    );
                                })}
                            </div>
                            {form.interests.length === 0 && (
                                <p className="text-xs text-red-500">
                                    Please select at least one interest.
                                </p>
                            )}
                        </div>

                        {/* Career goals */}
                        <div className="space-y-1.5">
                            <Label>
                                Briefly describe your career goal{" "}
                                <span className="text-gray-400 font-normal text-xs">(optional)</span>
                            </Label>
                            <Textarea
                                placeholder="e.g. I want to become a software engineer at a top tech company…"
                                className="resize-none h-20"
                                value={form.career_goals}
                                onChange={(e) => set("career_goals", e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={handleBack}
                                disabled={submitting}
                            >
                                Back
                            </Button>
                            <Button
                                className="flex-1"
                                disabled={!step2Valid || submitting}
                                onClick={handleSubmit}
                            >
                                {submitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    "Get started"
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
