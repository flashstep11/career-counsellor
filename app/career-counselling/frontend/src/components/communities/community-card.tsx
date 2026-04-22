import Link from "next/link";
import { Users2, FileText } from "lucide-react";
import { Community } from "@/types";

interface CommunityCardProps {
    community: Community;
}

export default function CommunityCard({ community }: CommunityCardProps) {
    const initial = community.displayName.charAt(0).toUpperCase();

    return (
        <Link href={`/communities/${community.name}`}>
            <div className="group relative bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer h-full flex flex-col">
                {/* Top accent bar */}
                <div className="h-1.5 w-full" style={{ backgroundColor: community.iconColor }} />

                <div className="p-5 flex flex-col flex-1">
                    {/* Icon + Name */}
                    <div className="flex items-start gap-3 mb-3">
                        <div
                            className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                            style={{ backgroundColor: community.iconColor }}
                        >
                            {initial}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                                {community.displayName}
                            </h3>
                            <p className="text-xs text-gray-400 font-medium">c/{community.name}</p>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-500 line-clamp-2 flex-1 mb-4">
                        {community.description}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                            <Users2 className="h-3.5 w-3.5" />
                            <span>{community.memberCount.toLocaleString()} members</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            <span>{community.postCount.toLocaleString()} posts</span>
                        </div>
                    </div>

                    {/* Joined badge */}
                    {community.isJoined && (
                        <span className="mt-3 inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
                            ✓ Joined
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
