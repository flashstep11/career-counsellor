export interface Author {
  userID: string;
  firstName: string;
  middleName?: string;
  lastName: string;
}

export interface Blog {
  heading: string;
  body: string;
  refType: "college" | "collegebranch" | "NA";
  typeId?: string;
  blogID?: string;
  userID: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  author: Author;
  views: number;
  expertId: string; // Add this field for the follow button
}

export interface User {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  gender: string;
  category: string;
  home_state?: string;
  mobileNo: string;
  type: string;
  isExpert: boolean;
  isAdmin: boolean;
  password: string | null;
  wallet: number;
  profilePicture?: string;
  // Onboarding fields
  grade?: string;
  preferred_stream?: string;
  target_college?: string;
  interests: string[];
  career_goals?: string;
  onboarding_completed: boolean;
  following: string[];
  followers: string[];
  // Community / social features
  credentials?: string[];   // admin-assigned verification badges
  reputation?: number;      // engagement score from post likes
}

interface Person {
  name: string;
  link: string;
}

export interface College {
  // Base fields
  name: string;
  address: string;
  type: "private" | "public" | "other";
  yearOfEstablishment: number;
  landArea: number;
  placement: number;
  placementMedian: number;
  placementOther?: Record<string, any>;
  notableAlumni: Person[];
  notableFaculty: Person[];

  // Response metadata
  collegeID: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

interface Education {
  degree: string;
  institution: string;
  year: number;
}

interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  [key: string]: string | undefined;
}

interface UserDetails {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  gender: string;
  category: string;
  preferredState?: string;
  mobileNo: string;
  type: string;
  isExpert: boolean;
  isAdmin: boolean;
}

export interface Expert {
  // Base fields
  calendarEmbedUrl: string;
  meetingCost: number;
  currentPosition: string;
  organization: string;
  bio: string;
  education: Education[];
  socialLinks: SocialLinks;
  userId: string;
  rating: number;
  available: boolean;
  studentsGuided: number;
  availability?: Record<string, { isAvailable: boolean; slots: { startTime: string; endTime: string }[] }>;

  // Metadata
  createdAt: string; // ISO date string
  expertID: string;
  userDetails: UserDetails;
}

export interface Video {
  videoID: string;
  title: string;
  description: string;
  youtubeUrl: string;
  userId: string;
  previewDuration: number;
  views: number;
  likes: number;
  likedBy: string[];
  tags: string[];
  refType: "college" | "collegebranch" | "NA"; // More strict typing
  typeId: string | null; // ID of college or branch based on refType
  createdAt: string;
  expertDetails?: Expert;
  featured?: boolean; // Added optional featured property
}

export interface PostMedia {
  url: string;
  type: "image" | "video";
  fileId: string;
}

export interface Post {
  postId: string;
  title: string;
  content: string;
  authorId: string;
  authorName?: string;
  authorInitials?: string;
  authorCredentials?: string[];
  communityId: string;
  communityName?: string;
  communityDisplayName?: string;
  createdAt: string;
  updatedAt: string;
  likes: number;
  likedBy: string[];
  views?: number;
  tags?: string[];
  media?: PostMedia[];
  commentsCount?: number;
  isPinned?: boolean;
  topComment?: {
    content: string;
    authorName: string;
    authorInitials: string;
  } | null;
}

export interface Community {
  communityId: string;
  name: string;
  displayName: string;
  description: string;
  iconColor: string;
  createdBy: string;
  creatorName?: string;
  memberCount: number;
  postCount: number;
  members: string[];
  community_roles?: Record<string, string>;
  pinnedPosts?: string[];
  bannedUsers?: string[];
  isJoined?: boolean;
  isModerator?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Search specific types
export type SearchType = "all" | "blog" | "video" | "expert" | "college";

interface BlogSearchResponse {
  blogID: string;
  heading: string;
}

interface CollegeSearchResponse {
  name: string;
  collegeID: string;
}

interface UserSearchResponse {
  firstName: string;
  lastName: string;
}

interface ExpertSearchResponse {
  expertID: string;
  userDetails: UserSearchResponse;
}

interface VideoSearchResponse {
  videoID: string;
  title: string;
}

export interface SearchResult {
  type: SearchType;
  blogs?: BlogSearchResponse[];
  colleges?: CollegeSearchResponse[];
  experts?: ExpertSearchResponse[];
  videos?: VideoSearchResponse[];
  total_count: number;
}

export interface Prediction {
  college_name: string;
  branch_name: string;
  openingRank?: number;
  closingRank?: number;
  distance?: number;
  h_index?: number; // Add h-index
}

export type NotificationType =
  | "new_post"
  | "new_video"
  | "new_blog"
  | "like_post"
  | "comment"
  | "follow"
  | "meeting_scheduled"
  | "meeting_reminder"
  | "connection_request"
  | "connection_accepted"
  | "connection_activity"
  | "comment_reply"
  | "post_liked"
  | "community_post"
  | "mention";

export type ConnectionStatus = "pending" | "accepted" | "declined" | "none";

export interface Connection {
  connectionId: string;
  requester_id: string;
  target_id: string;
  relationship_type: "connect";
  status: ConnectionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SourceUserDetails {
  name: string;
  avatar: string;
}

export interface Notification {
  notificationId: string;
  targetUserId: string;
  sourceUserId: string;
  type: NotificationType;
  content: string;
  referenceId?: string;
  referenceType?: string;
  read: boolean;
  createdAt: string;
  sourceUserDetails?: SourceUserDetails;
}

/**
 * A batched notification that groups multiple fan-out events (new_video, new_blog)
 * from the same expert within a 60-minute window into a single visible entry.
 */
export interface NotificationBatch {
  batchId: string;
  targetUserId: string;
  actorId: string;
  actorName: string;
  actorExpertId?: string;
  eventType: NotificationType;
  entityIds: string[];
  referenceType: string;   // "video" | "blog"
  batchKey: string;
  isRead: boolean;
  isOpen: boolean;
  windowExpiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  commentID: string;
  user: {
    name: string;
    avatar: string;
    userId?: string;
  };
  content: string;
  createdAt: string;
  parent_id?: string;  // Optional, for replies
  replies?: Comment[];  // Array of reply comments
}
