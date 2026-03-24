"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Community } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { ModeratorApplicationResponse } from "@/types/moderator-application";

type ApiModeratorApplication = ModeratorApplicationResponse & { _id?: string };

export default function ModeratorApprovalsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [applications, setApplications] = useState<ApiModeratorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const communityRes = await axios.get(`/api/communities/${id}`);
      setCommunity(communityRes.data);
      const appsRes = await axios.get(`/api/communities/${id}/moderator-applications/pending`);
      const normalized = (appsRes.data || []).map((app: ApiModeratorApplication) => ({
        ...app,
        id: app.id || app._id || "",
      }));
      setApplications(normalized);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchData();
  }, [isAuthenticated, router, fetchData]);

  const handleReview = async (applicationId: string, status: "approved" | "rejected") => {
    if (reviewingId) return;
    if (!applicationId) {
      setError("Invalid application id");
      return;
    }
    try {
      setReviewingId(applicationId);
      setError(null);
      await axios.put(`/api/communities/${id}/moderator-applications/${applicationId}/review`, {
        status,
        adminNotes: "Reviewed by community admin",
        rejectionReason: status === "rejected" ? "Rejected by community admin" : undefined,
      });
      setApplications((prev) => prev.filter((a) => a.id !== applicationId));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to review application");
    } finally {
      setReviewingId(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (error) {
    return <Alert className="max-w-3xl mx-auto mt-6" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;
  }
  if (!community) {
    return <Alert className="max-w-3xl mx-auto mt-6" variant="destructive"><AlertDescription>Community not found</AlertDescription></Alert>;
  }
  if (!user || community.createdBy !== user._id) {
    return <Alert className="max-w-3xl mx-auto mt-6" variant="destructive"><AlertDescription>Community creator access required</AlertDescription></Alert>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
      <div className="h-24 w-full bg-gradient-to-r from-blue-600 to-purple-600" />
      <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 -mt-6 pb-12 space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl mb-3"
            onClick={() => router.push(`/communities/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Community
          </Button>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Moderator Approvals</h1>
              <p className="text-sm text-gray-600 mt-1">
                Review moderator requests for <span className="font-semibold">{community.displayName}</span>
              </p>
            </div>
            <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200">
              {applications.length} pending
            </Badge>
          </div>
        </div>

        {applications.length === 0 ? (
          <Card className="rounded-2xl border border-gray-100 shadow-sm">
            <CardContent className="pt-8 pb-8 text-sm text-gray-600 text-center">
              No pending applications.
            </CardContent>
          </Card>
        ) : (
          applications.map((application) => (
            <Card key={application.id} className="rounded-2xl border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{application.userName || "Applicant"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><strong>Email:</strong> {application.userEmail}</p>
                <p><strong>Motivation:</strong> {application.motivation}</p>
                {application.experience && <p><strong>Experience:</strong> {application.experience}</p>}
                {application.availability && <p><strong>Availability:</strong> {application.availability}</p>}
                <div className="flex gap-2 pt-1">
                  <Button
                    className="rounded-xl bg-black text-white hover:bg-black/90"
                    onClick={() => handleReview(application.id, "approved")}
                    disabled={reviewingId === application.id}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl border-gray-300 bg-white text-black hover:bg-gray-50"
                    onClick={() => handleReview(application.id, "rejected")}
                    disabled={reviewingId === application.id}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
