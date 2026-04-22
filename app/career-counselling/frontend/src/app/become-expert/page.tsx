"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Define the form schema with validation
const formSchema = z.object({
    currentPosition: z.string().min(3, {
        message: "Current position must be at least 3 characters.",
    }),
    organization: z.string().min(3, {
        message: "Organization name must be at least 3 characters.",
    }),
    bio: z.string().min(50, {
        message: "Bio must be at least 50 characters to provide adequate information.",
    }).max(500, {
        message: "Bio must not exceed 500 characters."
    }),
    education: z.string().min(5, {
        message: "Please provide your highest education qualification.",
    }),
    specialization: z.string().min(3, {
        message: "Specialization must be at least 3 characters.",
    }),
    meetingCost: z.number().min(0, {
        message: "Meeting cost must be a positive number.",
    }).or(z.string().regex(/^\d+$/).transform(Number)),
    proofDocument: z.any()
        .refine((file) => file?.length > 0, "Proof document is required")
        .refine(
            (file) => file?.[0]?.type === "application/pdf",
            "Only PDF files are accepted"
        )
        .refine(
            (file) => file?.[0]?.size <= 5 * 1024 * 1024,
            "File size must be less than 5MB"
        ),
});

export default function BecomeExpertPage() {
    const { isAuthenticated, user } = useAuth();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isCheckingStatus, setIsCheckingStatus] = useState(true);

    // Initialize form
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            currentPosition: "",
            organization: "",
            bio: "",
            education: "",
            specialization: "",
            meetingCost: 0,
        },
    });

    // Check if the user already has an application
    const checkApplicationStatus = async () => {
        if (!isAuthenticated) return;

        setIsCheckingStatus(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("/api/experts/my-application", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.data) {
                setApplicationStatus(response.data.status);
            }
        } catch (error: any) {
            if (error.response?.status !== 404) {
                // Only show errors that aren't "no application found"
                setErrorMessage("Failed to check application status. Please try again.");
                console.error("Error checking application status:", error);
            }
        } finally {
            setIsCheckingStatus(false);
        }
    };

    // Check application status when component mounts
    useEffect(() => {
        if (isAuthenticated) {
            checkApplicationStatus();
        }
    }, [isAuthenticated]);

    // Handle form submission
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();

            // Append form fields to FormData
            formData.append("currentPosition", values.currentPosition);
            formData.append("organization", values.organization);
            formData.append("bio", values.bio);
            formData.append("education", values.education);
            formData.append("specialization", values.specialization);
            formData.append("meetingCost", values.meetingCost.toString());
            formData.append("proofDocument", values.proofDocument[0]);

            const response = await axios.post("/api/experts/apply", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`,
                },
            });

            toast.success("Application submitted successfully!");
            setApplicationStatus("pending");
        } catch (error: any) {
            console.error("Error submitting application:", error);
            setErrorMessage(
                error.response?.data?.detail ||
                "Failed to submit application. Please try again."
            );
            toast.error("Failed to submit application");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get status-based UI elements
    const getStatusAlert = () => {
        if (applicationStatus === "pending") {
            return (
                <Alert className="mb-6 bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <AlertTitle className="text-yellow-800">Application Pending</AlertTitle>
                    <AlertDescription className="text-yellow-700">
                        Your expert application is currently under review. We'll notify you once it's been processed.
                    </AlertDescription>
                </Alert>
            );
        } else if (applicationStatus === "approved") {
            return (
                <Alert className="mb-6 bg-green-50 border-green-200">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <AlertTitle className="text-green-800">Application Approved</AlertTitle>
                    <AlertDescription className="text-green-700">
                        Congratulations! Your expert application has been approved. You can now access your expert dashboard.
                    </AlertDescription>
                    <Button
                        className="mt-4 bg-green-600 hover:bg-green-700"
                        onClick={() => router.push(`/experts/${user?.expertId}`)}
                    >
                        Go to Expert Dashboard
                    </Button>
                </Alert>
            );
        } else if (applicationStatus === "rejected") {
            return (
                <Alert className="mb-6 bg-red-50 border-red-200">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <AlertTitle className="text-red-800">Application Rejected</AlertTitle>
                    <AlertDescription className="text-red-700">
                        We're sorry, but your expert application has been rejected. You can submit a new application with updated information.
                    </AlertDescription>
                </Alert>
            );
        }
        return null;
    };

    // Content to render
    const pageContent = (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <Card className="shadow-lg border-gray-200">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 pb-6">
                    <div className="flex items-center gap-2">
                        <GraduationCap className="h-8 w-8 text-primary-blue" />
                        <CardTitle className="text-2xl md:text-3xl text-gray-800">Become an Expert</CardTitle>
                    </div>
                    <CardDescription className="text-lg text-gray-600 mt-2">
                        Share your knowledge and expertise with students seeking career guidance.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {isCheckingStatus ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
                            <p className="mt-4 text-gray-600">Checking application status...</p>
                        </div>
                    ) : (
                        <>
                            {getStatusAlert()}

                            {errorMessage && (
                                <Alert variant="destructive" className="mb-6">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{errorMessage}</AlertDescription>
                                </Alert>
                            )}

                            {!applicationStatus && (
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control}
                                                name="currentPosition"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Current Position</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g. Professor, Software Engineer" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="organization"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Organization / Institution</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g. IIT Delhi, Google" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="bio"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Professional Bio</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Describe your professional background, experience, and expertise..."
                                                            className="min-h-[150px]"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Provide a detailed professional bio that highlights your experience and expertise.
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control}
                                                name="education"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Highest Education</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g. PhD in Computer Science" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="specialization"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Specialization</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g. Machine Learning, Career Counseling" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="meetingCost"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Session Cost (coins per hour)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            placeholder="e.g. 1000"
                                                            {...field}
                                                            onChange={(e) => {
                                                                const value = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                                                                field.onChange(value);
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Set your hourly rate for one-on-one counseling sessions.
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="proofDocument"
                                            render={({ field: { onChange, value, ...rest } }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="h-5 w-5 text-blue-600" />
                                                            Proof Document (PDF)
                                                        </div>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                                                            <Input
                                                                type="file"
                                                                accept="application/pdf"
                                                                className="hidden"
                                                                id="proofDocument"
                                                                onChange={(e) => {
                                                                    onChange(e.target.files);
                                                                }}
                                                                {...rest}
                                                            />
                                                            <label htmlFor="proofDocument" className="cursor-pointer w-full text-center">
                                                                <Upload className="h-10 w-10 text-blue-600 mx-auto mb-2" />
                                                                <p className="text-lg font-medium text-gray-700">Upload credentials</p>
                                                                <p className="text-sm text-gray-500 mt-1">
                                                                    Drag and drop or click to browse
                                                                </p>
                                                                <p className="text-xs text-gray-400 mt-2">
                                                                    (PDF only, max 5MB)
                                                                </p>
                                                            </label>
                                                        </div>
                                                    </FormControl>
                                                    <FormDescription>
                                                        Please upload a PDF document containing your professional credentials, certificates, or any other relevant qualifications.
                                                    </FormDescription>
                                                    <FormMessage />
                                                    {form.getValues().proofDocument?.[0]?.name && (
                                                        <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                                                            <CheckCircle className="h-4 w-4" />
                                                            <span>
                                                                {form.getValues().proofDocument[0].name} ({Math.round(form.getValues().proofDocument[0].size / 1024)} KB)
                                                            </span>
                                                        </div>
                                                    )}
                                                </FormItem>
                                            )}
                                        />

                                        <Button
                                            type="submit"
                                            className="w-full md:w-auto bg-primary-blue hover:bg-primary-blue/90"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Submitting Application...
                                                </>
                                            ) : (
                                                "Submit Application"
                                            )}
                                        </Button>
                                    </form>
                                </Form>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );

    return (
        <ProtectedRoute>
            {pageContent}
        </ProtectedRoute>
    );
}