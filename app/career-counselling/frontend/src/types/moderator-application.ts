export interface ModeratorApplication {
  id: string;
  userId: string;
  communityId: string;
  motivation: string;
  experience?: string;
  availability?: string;
  supportingDocumentUrl?: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: string;
  adminNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModeratorApplicationResponse extends ModeratorApplication {
  userName?: string;
  userEmail?: string;
  communityName?: string;
  communityDisplayName?: string;
  reviewerName?: string;
}

export interface ModeratorApplicationCreate {
  communityId: string;
  motivation: string;
  experience?: string;
  availability?: string;
  supportingDocumentUrl?: string;
}
