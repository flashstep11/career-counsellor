"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

export default function FeedbackPage() {
    const router = useRouter();

    // Form state
    const [formData, setFormData] = useState({
        requestType: "college",
        name: "",
        email: "",
        collegeName: "",
        branchName: "",
        location: "",
        details: "",
        source: ""
    });

    // Handle input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    // Handle select change
    const handleSelectChange = (value: string) => {
        setFormData(prev => ({ ...prev, requestType: value }));
    };

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Construct email subject and body
        const subject = `College Information Request: ${formData.collegeName || 'New Request'}`;

        // Format the email body with all the form information
        const body = `
Request Type: ${getRequestTypeLabel(formData.requestType)}
Name: ${formData.name}
Email: ${formData.email}

College Details:
College Name: ${formData.collegeName}
Branch Name: ${formData.branchName || 'N/A'}
Location: ${formData.location}

Additional Details:
${formData.details}

Information Source:
${formData.source || 'Not provided'}
    `.trim();

        // Create mailto URL with encoded subject and body
        const mailtoUrl = `mailto:aditya.jain.pansari@research.iiit.ac.in?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        // Open the mail client
        window.location.href = mailtoUrl;
    };

    // Helper to get display label for request type
    const getRequestTypeLabel = (value: string): string => {
        const labels: Record<string, string> = {
            "college": "Add College Information",
            "branch": "Add Branch Information",
            "correction": "Correction to Existing Information",
            "other": "Other Feedback"
        };
        return labels[value] || value;
    };

    return (
        <div className="container max-w-4xl mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold text-center mb-2">College Information Request</h1>
            <p className="text-gray-500 text-center mb-8">
                Couldn't find the information you were looking for? Let us know and we'll work on it with immediate effect!
            </p>

            <Card>
                <CardHeader>
                    <CardTitle>Submit Your Request</CardTitle>
                    <CardDescription>
                        Please provide details about the college or branch information you're looking for
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="requestType">Request Type</Label>
                            <Select defaultValue="college" onValueChange={handleSelectChange}>
                                <SelectTrigger id="requestType">
                                    <SelectValue placeholder="Select request type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="college">Add College Information</SelectItem>
                                    <SelectItem value="branch">Add Branch Information</SelectItem>
                                    <SelectItem value="correction">Correction to Existing Information</SelectItem>
                                    <SelectItem value="other">Other Feedback</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Your Name</Label>
                            <Input
                                id="name"
                                placeholder="Enter your name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="collegeName">College Name</Label>
                            <Input
                                id="collegeName"
                                placeholder="Enter full college name (e.g., Indian Institute of Technology, Delhi)"
                                value={formData.collegeName}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="branchName">Branch Name (if applicable)</Label>
                            <Input
                                id="branchName"
                                placeholder="Enter branch name (e.g., Computer Science and Engineering)"
                                value={formData.branchName}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="location">College Location</Label>
                            <Input
                                id="location"
                                placeholder="City, State"
                                value={formData.location}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="details">Additional Details</Label>
                            <Textarea
                                id="details"
                                placeholder="Please provide any additional information that may help us locate the correct college data or describe the information you're looking for"
                                rows={5}
                                value={formData.details}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="source">Information Source (Optional)</Label>
                            <Input
                                id="source"
                                placeholder="If you have a reference website or document, please share the link"
                                value={formData.source}
                                onChange={handleChange}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-primary-blue hover:bg-blue-600"
                        >
                            Submit Request
                        </Button>

                        <p className="text-sm text-gray-500 text-center">
                            Your email client will open with all the details prefilled. Just click send to submit your request.
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}