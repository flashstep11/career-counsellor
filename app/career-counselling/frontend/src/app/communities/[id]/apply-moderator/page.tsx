"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import { Community } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import ModeratorApplicationForm from "@/components/communities/moderator-application-form";

export default function ApplyModeratorPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPending, setHasPending] = useState(false);
  const [alreadyModerator, setAlreadyModerator] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const communityRes = await axios.get(`/api/communities/${id}`);
      setCommunity(communityRes.data);
      setAlreadyModerator(Boolean(communityRes.data?.isModerator));

      const myAppsRes = await axios.get("/api/my-moderator-applications");
      const pending = (myAppsRes.data || []).find(
        (a: { communityId: string; status: string }) =>
          a.communityId === communityRes.data.communityId && a.status === "pending"
      );
      setHasPending(Boolean(pending));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load page");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30 grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  if (error) {
    return <Alert className="max-w-2xl mx-auto mt-6" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;
  }
  if (!community) {
    return <Alert className="max-w-2xl mx-auto mt-6" variant="destructive"><AlertDescription>Community not found</AlertDescription></Alert>;
  }
  if (!community.isJoined) {
    return (
      <Card className="max-w-2xl mx-auto mt-6">
        <CardContent className="pt-6 text-center">
          <p className="mb-3">You must join this community before applying.</p>
          <Button className="rounded-xl bg-black text-white hover:bg-black/90" onClick={() => router.push(`/communities/${id}`)}>Back</Button>
        </CardContent>
      </Card>
    );
  }
  if (alreadyModerator) {
    return (
      <Card className="max-w-2xl mx-auto mt-6">
        <CardContent className="pt-6 text-center space-y-3">
          <Shield className="h-12 w-12 text-green-600 mx-auto" />
          <p>You are already a moderator for this community.</p>
          <Button className="rounded-xl bg-black text-white hover:bg-black/90" onClick={() => router.push(`/communities/${id}`)}>Back</Button>
        </CardContent>
      </Card>
    );
  }
  if (hasPending) {
    return (
      <Card className="max-w-2xl mx-auto mt-6">
        <CardContent className="pt-6 text-center space-y-3">
          <Shield className="h-12 w-12 text-yellow-500 mx-auto" />
          <p>Your moderator request is already pending admin review.</p>
          <Button className="rounded-xl bg-black text-white hover:bg-black/90" onClick={() => router.push(`/communities/${id}`)}>Back</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
      <div className="h-24 w-full bg-gradient-to-r from-blue-600 to-purple-600" />
      <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 -mt-6 pb-12 space-y-6">
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
          <h1 className="text-2xl font-extrabold text-gray-900">Moderator Application</h1>
          <p className="text-sm text-gray-600 mt-1">
            Community: <span className="font-semibold">{community.displayName}</span>
          </p>
        </div>
        <ModeratorApplicationForm community={community} />
      </div>
    </div>
  );
}
