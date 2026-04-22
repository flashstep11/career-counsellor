"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { CheckCircle2, Loader2, Shield } from "lucide-react";

import { Community } from "@/types";
import { ModeratorApplicationCreate } from "@/types/moderator-application";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  community: Community;
}

export default function ModeratorApplicationForm({ community }: Props) {
  const router = useRouter();
  const [formData, setFormData] = useState<ModeratorApplicationCreate>({
    communityId: community.communityId,
    motivation: "",
    experience: "",
    availability: "",
    supportingDocumentUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.motivation.trim()) {
      setError("Motivation is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await axios.post("/api/moderator-applications", formData);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="max-w-2xl mx-auto rounded-2xl border border-green-200 bg-green-50/60">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
          <h3 className="text-2xl font-bold text-gray-900">Application submitted</h3>
          <p className="text-sm text-gray-700 max-w-md mx-auto">
            Your request has been sent to the community admin for approval.
            You will be notified once reviewed.
          </p>
          <Button className="rounded-xl bg-black text-white hover:bg-black/90" onClick={() => router.push(`/communities/${community.communityId}`)}>
            Back to Community
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto rounded-2xl border border-gray-100 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Shield className="h-5 w-5 text-indigo-600" />
          Apply to Become a Moderator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <form onSubmit={onSubmit} className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="motivation" className="text-sm font-semibold text-gray-800">Motivation *</Label>
            <Textarea
              id="motivation"
              value={formData.motivation}
              onChange={(e) => setFormData((p) => ({ ...p, motivation: e.target.value }))}
              rows={4}
              className="rounded-xl border-gray-200 focus-visible:ring-indigo-300"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="experience" className="text-sm font-semibold text-gray-800">Experience</Label>
            <Textarea
              id="experience"
              value={formData.experience}
              onChange={(e) => setFormData((p) => ({ ...p, experience: e.target.value }))}
              rows={3}
              className="rounded-xl border-gray-200 focus-visible:ring-indigo-300"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="availability" className="text-sm font-semibold text-gray-800">Availability</Label>
            <Textarea
              id="availability"
              value={formData.availability}
              onChange={(e) => setFormData((p) => ({ ...p, availability: e.target.value }))}
              rows={2}
              className="rounded-xl border-gray-200 focus-visible:ring-indigo-300"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-xl bg-black text-white hover:bg-black/90">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Application"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
