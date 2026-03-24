"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { Send, Loader2, Tags, ImagePlus, X, Film, AlertTriangle, BookOpen, Sparkles } from "lucide-react";
import { Community } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface MediaItem {
    url: string;
    type: "image" | "video";
    fileId: string;
    preview?: string; // local preview URL
}

const WORD_LIMIT = 500;

function countWords(text: string) {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function SubmitPostPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [community, setCommunity] = useState<Community | null>(null);
    const [form, setForm] = useState({ title: "", content: "", tags: "" });
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showWordLimitModal, setShowWordLimitModal] = useState(false);
    const [enhancingContent, setEnhancingContent] = useState(false);

    const wordCount = countWords(form.content);
    const overLimit = wordCount > WORD_LIMIT;

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }
        axios.get(`/api/communities/${id}`).then((r) => {
            setCommunity(r.data);
            if (r.data && !r.data.isJoined) {
                router.push(`/communities/${id}`);
            }
        }).catch(() => { });
    }, [id, isAuthenticated, router]);

    // ── Media upload ────────────────────────
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        for (const file of Array.from(files)) {
            if (media.length >= 4) {
                setError("Maximum 4 media files per post.");
                break;
            }
            const isImage = file.type.startsWith("image/");
            const isVideo = file.type.startsWith("video/");
            if (!isImage && !isVideo) {
                setError("Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM) are allowed.");
                continue;
            }
            if (isImage && file.size > 5 * 1024 * 1024) {
                setError("Image too large. Max 5 MB.");
                continue;
            }
            if (isVideo && file.size > 20 * 1024 * 1024) {
                setError("Video too large. Max 20 MB.");
                continue;
            }

            setUploading(true);
            setError("");
            try {
                const formData = new FormData();
                formData.append("file", file);
                const res = await axios.post("/api/communities/upload-media", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                setMedia((prev) => [
                    ...prev,
                    {
                        url: res.data.url,
                        type: res.data.type,
                        fileId: res.data.fileId,
                        preview: URL.createObjectURL(file),
                    },
                ]);
            } catch (err: any) {
                setError(err.response?.data?.detail || "Failed to upload media.");
            } finally {
                setUploading(false);
            }
        }
        // Reset input so same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeMedia = (index: number) => {
        setMedia((prev) => {
            const item = prev[index];
            if (item.preview) URL.revokeObjectURL(item.preview);
            return prev.filter((_, i) => i !== index);
        });
    };

    // ── AI Enhancement ─────────────────────
    const handleEnhanceContent = async () => {
        if (!form.content.trim()) {
            setError("Please add some content to enhance");
            return;
        }

        try {
            setError("");
            setEnhancingContent(true);
            const token = localStorage.getItem("token");

            if (!token) {
                setError("You must be logged in to enhance content");
                return;
            }

            const response = await fetch("/api/chatbot/enhance-content", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    content: form.content,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to enhance content");
            }

            const data = await response.json();
            setForm({ ...form, content: data.enhanced_content });
            toast.success("Content enhanced successfully!");
        } catch (err) {
            console.error("Error enhancing content:", err);
            setError("Failed to enhance content. Please try again.");
        } finally {
            setEnhancingContent(false);
        }
    };

    // ── Submit ────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!form.title.trim() || !form.content.trim()) {
            setError("Title and content are required.");
            return;
        }
        if (overLimit) {
            setShowWordLimitModal(true);
            return;
        }
        setLoading(true);
        try {
            const tags = form.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
            // Use resolved communityId (ObjectId) for API call, not URL slug
            const communityApiId = community?.communityId || id;
            await axios.post(`/api/communities/${communityApiId}/posts`, {
                title: form.title,
                content: form.content,
                tags,
                media: media.map(({ url, type, fileId }) => ({ url, type, fileId })),
            });
            router.push(`/communities/${id}`);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to create post.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50/30">
            {/* Word-limit modal */}
            {showWordLimitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full mx-4 p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex-shrink-0 bg-amber-100 text-amber-600 rounded-full p-2">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Post is too long</h2>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                            Your post has <span className="font-semibold text-red-500">{wordCount} words</span>, which exceeds the community limit of <span className="font-semibold">{WORD_LIMIT} words</span>.
                        </p>
                        <p className="text-sm text-gray-500 mb-5">
                            For longer content, consider publishing it as a <span className="font-semibold text-indigo-600">blog post</span> instead — blogs have no word limit and reach a wider audience.
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-xl"
                                onClick={() => setShowWordLimitModal(false)}
                            >
                                Edit post
                            </Button>
                            <Button
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2"
                                onClick={() => router.push("/blogs/create")}
                            >
                                <BookOpen className="h-4 w-4" />
                                Write a blog
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            <div className="max-w-2xl mx-auto px-4 py-10">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div
                        className="h-2 w-full"
                        style={{ backgroundColor: community?.iconColor || "#6366f1" }}
                    />
                    <div className="px-6 py-5 border-b border-gray-50">
                        <h1 className="text-xl font-bold text-gray-900">Create a Post</h1>
                        {community && (
                            <p className="text-sm text-gray-400 mt-0.5">
                                Posting in{" "}
                                <span className="font-semibold" style={{ color: community.iconColor }}>
                                    c/{community.name}
                                </span>
                            </p>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                            <Input
                                placeholder="An interesting title for your post"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                maxLength={300}
                                className="rounded-xl"
                            />
                            <p className="text-xs text-gray-400 mt-1 text-right">{form.title.length}/300</p>
                        </div>

                        {/* Content */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-sm font-medium text-gray-700">Content *</label>
                                <Button
                                    type="button"
                                    onClick={handleEnhanceContent}
                                    disabled={!form.content.trim() || enhancingContent}
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-1.5 text-xs"
                                >
                                    {enhancingContent ? (
                                        <>
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            <span>Enhancing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-3 w-3 text-yellow-500" />
                                            <span>Enhance</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                            <Textarea
                                placeholder="Share your thoughts, questions, or insights..."
                                value={form.content}
                                onChange={(e) => setForm({ ...form, content: e.target.value })}
                                className="rounded-xl resize-none min-h-[180px]"
                            />
                            <div className="flex justify-between mt-1">
                                <p className="text-xs text-gray-400">
                                    Keep it concise — use{" "}
                                    <Link href="/blogs" className="underline text-indigo-500">blogs</Link>{" "}
                                    for longer content
                                </p>
                                <p className={`text-xs font-medium ${overLimit ? "text-red-500" : wordCount > WORD_LIMIT * 0.9 ? "text-amber-500" : "text-gray-400"}`}>
                                    {wordCount}/{WORD_LIMIT} words
                                </p>
                            </div>
                        </div>

                        {/* Media Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                                <ImagePlus className="h-3.5 w-3.5 text-gray-400" />
                                Media <span className="font-normal text-gray-400">(optional, up to 4)</span>
                            </label>

                            {/* Preview grid */}
                            {media.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    {media.map((item, i) => (
                                        <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                                            {item.type === "image" ? (
                                                <img
                                                    src={item.preview || item.url}
                                                    alt=""
                                                    className="w-full h-36 object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-36 flex items-center justify-center bg-gray-100">
                                                    <Film className="h-8 w-8 text-gray-400" />
                                                    <span className="text-sm text-gray-500 ml-2">Video</span>
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeMedia(i)}
                                                className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {media.length < 4 && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 hover:border-indigo-300 rounded-xl text-sm text-gray-500 hover:text-indigo-600 transition-colors w-full justify-center"
                                >
                                    {uploading ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                                    ) : (
                                        <><ImagePlus className="h-4 w-4" /> Add images or videos</>
                                    )}
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                                multiple
                                onChange={handleFileSelect}
                            />
                            <p className="text-xs text-gray-400 mt-1">Images: JPEG, PNG, GIF, WebP (max 5 MB) · Videos: MP4, WebM (max 20 MB)</p>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                                <Tags className="h-3.5 w-3.5 text-gray-400" />
                                Tags <span className="font-normal text-gray-400">(optional)</span>
                            </label>
                            <Input
                                placeholder="career, advice, interview (comma-separated)"
                                value={form.tags}
                                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                                className="rounded-xl"
                            />
                            <p className="text-xs text-gray-400 mt-1">Add tags to help others find your post</p>
                        </div>

                        {error && (
                            <div className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2">{error}</div>
                        )}

                        {/* Preview of tags */}
                        {form.tags.trim() && (
                            <div className="flex flex-wrap gap-1.5">
                                {form.tags
                                    .split(",")
                                    .map((t) => t.trim())
                                    .filter(Boolean)
                                    .map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-100"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                            </div>
                        )}

                        <div className="flex gap-3 pt-1">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push(`/communities/${id}`)}
                                className="flex-1 rounded-xl"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" /> Posting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" /> Post
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
