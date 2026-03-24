"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Flag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface Report {
    reportId: string;
    targetId: string;
    targetType: string;
    reason: string;
    reporterId: string;
    status: string;
    createdAt: string;
}

export default function CommunityReportsPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchReports = useCallback(async () => {
        try {
            const res = await axios.get(`/api/communities/${id}/reports`);
            setReports(Array.isArray(res.data) ? res.data : []);
        } catch (err: unknown) {
            if (axios.isAxiosError(err) && err.response?.status === 403) {
                setError("You are not a moderator of this community.");
            } else {
                setError("Failed to load reports.");
            }
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }
        fetchReports();
    }, [isAuthenticated, fetchReports, router]);

    const handleResolve = async (reportId: string) => {
        try {
            await axios.post(`/api/communities/${id}/reports/${reportId}/resolve`);
            setReports((prev) =>
                prev.map((r) => (r.reportId === reportId ? { ...r, status: "resolved" } : r))
            );
        } catch {
            // ignore
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto px-6 py-8">
                <div className="flex items-center gap-3 mb-6">
                    <Link href={`/communities/${id}`}>
                        <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl">
                            <ArrowLeft className="h-4 w-4" /> Back to community
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Flag className="h-5 w-5 text-rose-500" /> Reported Content
                    </h1>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600">{error}</div>
                ) : reports.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No reports — everything looks clean!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reports.map((report) => (
                            <div
                                key={report.reportId}
                                className={`bg-white rounded-2xl border p-5 ${report.status === "resolved" ? "border-green-200 opacity-60" : "border-rose-200"}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${report.status === "resolved" ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-700"}`}>
                                                {report.status}
                                            </span>
                                            <span className="text-xs text-gray-400 capitalize">{report.targetType}</span>
                                            <span className="text-xs text-gray-300">•</span>
                                            <span className="text-xs text-gray-400">
                                                {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 mb-2">{report.reason}</p>
                                        {report.targetType === "post" && (
                                            <Link href={`/posts/${report.targetId}`} className="text-xs text-indigo-500 hover:underline">
                                                View reported post →
                                            </Link>
                                        )}
                                    </div>
                                    {report.status === "open" && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleResolve(report.reportId)}
                                            className="shrink-0 rounded-xl bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-1" /> Resolve
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
