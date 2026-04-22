from typing import Optional
from datetime import datetime
from bson import ObjectId

from app.core.database import get_database
from app.models.meeting_feedback import MeetingFeedback
from app.models.meeting import MeetingStatus

class MeetingFeedbackManager:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.meeting_feedbacks
        self.ratings_collection = self.db.ratings

    async def get_feedback_for_meeting(self, meeting_id: str) -> Optional[MeetingFeedback]:
        """Get the feedback specifically for a meeting."""
        doc = await self.collection.find_one({"meetingId": meeting_id})
        if doc:
            doc["id"] = str(doc["_id"])
            return MeetingFeedback(**doc)
        return None

    async def get_feedback_by_id(self, feedback_id: str) -> Optional[MeetingFeedback]:
        """Get feedback by its ID."""
        doc = await self.collection.find_one({"_id": ObjectId(feedback_id)})
        if doc:
            doc["id"] = str(doc["_id"])
            return MeetingFeedback(**doc)
        return None

    async def create_feedback(
        self,
        meeting_id: str,
        reviewer_id: str,
        reviewee_id: str,
        rating: int,
        comment: Optional[str] = None,
        is_anonymous: bool = False
    ) -> MeetingFeedback:
        """
        Creates meeting feedback. Business logic constraints (idempotency, meeting status)
        should be validated in the router before calling this, or can be double-checked here.
        """
        now = datetime.utcnow()
        doc = {
            "meetingId": meeting_id,
            "reviewerId": reviewer_id,
            "revieweeId": reviewee_id,
            "rating": rating,
            "comment": comment,
            "isAnonymous": is_anonymous,
            "createdAt": now,
            "updatedAt": now
        }
        
        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        doc["id"] = str(result.inserted_id)

        # Update global expert average rating
        await self._update_expert_average_rating(reviewee_id)

        return MeetingFeedback(**doc)

    async def _update_expert_average_rating(self, expert_user_id: str):
        """
        Recalculates an expert's average rating by looking at all meeting_feedbacks
        (and optionally general ratings, though we can assume we only average meeting_feedbacks for now).
        For this project, let's gather both if they exist, or just meeting feedbacks.
        """
        expert = await self.db.experts.find_one({"userId": expert_user_id})
        if not expert:
            return

        expert_id = expert["expertID"]

        # 1. Get all meeting feedbacks for this expert
        pipeline = [
            {"$match": {"revieweeId": expert_user_id}},
            {"$group": {
                "_id": None,
                "averageRating": {"$avg": "$rating"},
                "count": {"$sum": 1}
            }}
        ]
        
        meeting_feedback_stats = await self.collection.aggregate(pipeline).to_list(None)
        
        # 2. Get all generic ratings from rating collection
        generic_rating_pipeline = [
            {"$match": {"expertId": expert_id}},
            {"$group": {
                "_id": None,
                "averageRating": {"$avg": "$rating"},
                "count": {"$sum": 1}
            }}
        ]
        generic_feedback_stats = await self.ratings_collection.aggregate(generic_rating_pipeline).to_list(None)

        total_sum = 0
        total_count = 0

        if meeting_feedback_stats:
            total_sum += meeting_feedback_stats[0]["averageRating"] * meeting_feedback_stats[0]["count"]
            total_count += meeting_feedback_stats[0]["count"]

        if generic_feedback_stats:
            total_sum += generic_feedback_stats[0]["averageRating"] * generic_feedback_stats[0]["count"]
            total_count += generic_feedback_stats[0]["count"]

        new_average = 0.0
        if total_count > 0:
            new_average = total_sum / total_count

        # Update expert model
        await self.db.experts.update_one(
            {"userId": expert_user_id},
            {"$set": {"rating": round(new_average, 1)}}
        )
