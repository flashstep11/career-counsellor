"use client";

import { useState, useEffect } from "react";
import { Star, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RateExpertProps {
  expertId: string;
  userId: string;
  currentRating: number;
  onRatingUpdate?: (newRating: number) => void;
}

interface RatingDetails {
  id: string;
  rating: number;
  comment: string | null;
  isAnonymous: boolean;
  expertId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export default function RateExpert({
  expertId,
  userId,
  currentRating,
  onRatingUpdate
}: RateExpertProps) {
  const { user } = useAuth();
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [userComment, setUserComment] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [ratingId, setRatingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [ratingDetails, setRatingDetails] = useState<RatingDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  // Check if the current user is the expert
  const isCurrentUserExpert = user && user._id === userId;

  // Fetch the user's previous rating for this expert if available
  useEffect(() => {
    const fetchUserRating = async () => {
      if (!user || isCurrentUserExpert) return;

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/experts/${expertId}/ratings/user`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.rating) {
            setUserRating(data.rating);
            setSelectedRating(data.rating);
            
            if (data.id) {
              setRatingId(data.id);
              // Immediately fetch the full rating details
              await fetchRatingDetails(data.id);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user rating:", error);
      }
    };

    fetchUserRating();
  }, [expertId, user, isCurrentUserExpert, userId]);

  // Function to fetch full rating details
  const fetchRatingDetails = async (id: string) => {
    if (!id) return;
    
    setIsLoadingDetails(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/ratings/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const details = await response.json();
        setRatingDetails(details);
        
        // Set form values from the details
        setSelectedRating(details.rating);
        setUserComment(details.comment || "");
        setIsAnonymous(details.isAnonymous || false);
      }
    } catch (error) {
      console.error("Error fetching rating details:", error);
      toast.error("Failed to load rating details");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Handle submitting the rating
  const handleRateExpert = async () => {
    if (!user) {
      toast.error("You must be logged in to rate experts");
      return;
    }

    if (isCurrentUserExpert) {
      toast.error("You cannot rate yourself");
      return;
    }

    if (selectedRating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/experts/${expertId}/ratings`, {
        method: userRating ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: selectedRating,
          comment: userComment.trim() || null,
          isAnonymous: isAnonymous
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserRating(selectedRating);
        setIsEditMode(false);
        setDialogOpen(false);
        toast.success(userRating ? "Rating updated successfully" : "Rating submitted successfully");

        // If the response includes an ID, save it
        if (data.rating && data.rating.id) {
          setRatingId(data.rating.id);
          
          // Update the rating details in state
          if (data.rating) {
            setRatingDetails(data.rating);
          }
        }

        // Call the onRatingUpdate callback if provided
        if (onRatingUpdate && data.newAverageRating) {
          onRatingUpdate(data.newAverageRating);
        }
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to submit rating");
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Failed to submit rating. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset dialog state when closed
  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // Reset edit mode when dialog is closed without saving
      if (isEditMode && ratingDetails) {
        setSelectedRating(ratingDetails.rating);
        setUserComment(ratingDetails.comment || "");
        setIsAnonymous(ratingDetails.isAnonymous);
      }
      setIsEditMode(false);
    }
  };

  // Open dialog in edit mode
  const handleEditRating = () => {
    setIsEditMode(true);
    
    // Make sure we have the latest rating details
    if (ratingId && (!ratingDetails || ratingDetails.id !== ratingId)) {
      fetchRatingDetails(ratingId);
    }
    
    setDialogOpen(true);
  };

  // Button to show in the main component
  const renderRatingButton = () => {
    if (isCurrentUserExpert) {
      return (
        <div className="flex items-center justify-center gap-2">
          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          <span className="font-medium">
            {currentRating.toFixed(1)} Rating
          </span>
        </div>
      );
    }
    
    if (userRating) {
      return (
        <Button 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2"
          onClick={handleEditRating}
        >
          <Edit className="h-4 w-4" />
          Edit Your Rating ({userRating} ⭐)
        </Button>
      );
    }
    
    return (
      <Button 
        variant="outline"
        className="w-full"
        onClick={() => {
          setIsEditMode(false);
          setDialogOpen(true);
        }}
      >
        Rate this Expert
      </Button>
    );
  };

  // Dialog content for rating form
  const renderRatingDialog = () => {
    return (
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Your Rating" : "Rate this Expert"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update your rating for this expert"
                : "Share your experience with this expert"
              }
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingDetails ? (
            <div className="py-8 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-6 py-4">
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className="focus:outline-none"
                    onClick={() => setSelectedRating(rating)}
                    onMouseEnter={() => setHoveredRating(rating)}
                    onMouseLeave={() => setHoveredRating(0)}
                    disabled={isSubmitting}
                  >
                    <Star
                      className={`h-8 w-8 ${
                        (hoveredRating ? rating <= hoveredRating : rating <= selectedRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      } transition-colors`}
                    />
                  </button>
                ))}
              </div>

              {/* Review Comment Box */}
              <div className="w-full">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Leave a review (optional):
                </div>
                <Textarea
                  placeholder="Share your experience with this expert..."
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  className="resize-none h-24"
                  disabled={isSubmitting}
                />
              </div>
              
              {/* Anonymous Rating Option */}
              <div className="flex items-center space-x-2 self-start">
                <Checkbox 
                  id="anonymous-rating" 
                  checked={isAnonymous}
                  onCheckedChange={(checked) => setIsAnonymous(checked === true)}
                  disabled={isSubmitting}
                />
                <Label 
                  htmlFor="anonymous-rating" 
                  className="text-sm text-gray-700 cursor-pointer"
                >
                  Post anonymously
                </Label>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRateExpert}
              disabled={selectedRating === 0 || isSubmitting}
            >
              {isSubmitting
                ? "Submitting..."
                : isEditMode
                  ? "Update Rating"
                  : "Submit Rating"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      {renderRatingButton()}
      {renderRatingDialog()}
    </>
  );
}