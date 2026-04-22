from datetime import datetime
from typing import List, Optional

from bson import ObjectId

from app.core.database import get_database
from app.managers.community import CommunityManager
from app.managers.user import UserManager
from app.models.moderator_application import (
    ApplicationStatus,
    ModeratorApplication,
    ModeratorApplicationCreate,
    ModeratorApplicationResponse,
    ModeratorApplicationUpdate,
)
from app.models.notification import Notification, NotificationType


class ModeratorApplicationManager:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.moderator_applications
        self.user_manager = UserManager()
        self.community_manager = CommunityManager()

    async def submit_application(
        self, application_data: ModeratorApplicationCreate, user_id: str
    ) -> ModeratorApplicationResponse:
        community = await self.community_manager.get_community(application_data.communityId)
        if not community:
            raise ValueError("Community not found")

        community_id = community.communityId
        await self._validate_application(community_id, user_id)

        existing_pending = await self.collection.find_one(
            {
                "userId": user_id,
                "communityId": community_id,
                "status": ApplicationStatus.PENDING.value,
            }
        )
        if existing_pending:
            return await self._to_response(existing_pending)

        application = ModeratorApplication(
            userId=user_id,
            communityId=community_id,
            motivation=application_data.motivation,
            experience=application_data.experience,
            availability=application_data.availability,
            supportingDocumentUrl=application_data.supportingDocumentUrl,
            status=ApplicationStatus.PENDING,
            routedTo=community.createdBy,
        )

        application_dict = application.model_dump(by_alias=True, exclude={"id"})
        result = await self.collection.insert_one(application_dict)

        await self._send_creator_notification(application, community.createdBy, community.displayName)
        return await self._to_response({"_id": result.inserted_id, **application_dict})

    async def get_application(self, application_id: str) -> Optional[ModeratorApplicationResponse]:
        try:
            doc = await self.collection.find_one({"_id": ObjectId(application_id)})
            if not doc:
                return None
            return await self._to_response(doc)
        except Exception:
            return None

    async def get_user_applications(self, user_id: str) -> List[ModeratorApplicationResponse]:
        cursor = self.collection.find({"userId": user_id}).sort("createdAt", -1)
        applications = []
        async for doc in cursor:
            applications.append(await self._to_response(doc))
        return applications

    async def get_community_applications_by_status(
        self, community_id: str, status: ApplicationStatus
    ) -> List[ModeratorApplicationResponse]:
        cursor = self.collection.find(
            {"communityId": community_id, "status": status.value}
        ).sort("createdAt", -1)
        applications = []
        async for doc in cursor:
            applications.append(await self._to_response(doc))
        return applications

    async def review_application_by_creator(
        self, application_id: str, creator_id: str, review_data: ModeratorApplicationUpdate
    ) -> Optional[ModeratorApplicationResponse]:
        try:
            application_doc = await self.collection.find_one({"_id": ObjectId(application_id)})
        except Exception as e:
            raise ValueError("Invalid application id") from e

        if not application_doc:
            return None
        if application_doc.get("routedTo") != creator_id:
            raise ValueError("You are not authorized to review this application")
        if application_doc.get("status") != ApplicationStatus.PENDING.value:
            raise ValueError("Application has already been reviewed")

        update_data = {
            "status": review_data.status.value,
            "reviewedBy": creator_id,
            "reviewedAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            "adminNotes": review_data.adminNotes,
            "rejectionReason": review_data.rejectionReason,
        }

        result = await self.collection.update_one(
            {"_id": ObjectId(application_id)},
            {"$set": update_data},
        )
        if not result.matched_count:
            return None

        updated_doc = {**application_doc, **update_data}
        application_response = await self._to_response(updated_doc)
        await self._send_application_notification(
            application_response, creator_id, review_data.status
        )

        if review_data.status == ApplicationStatus.APPROVED:
            await self.community_manager.promote_to_moderator(
                application_doc["communityId"], creator_id, application_doc["userId"]
            )

        return application_response

    async def _validate_application(self, community_id: str, user_id: str) -> None:
        community = await self.community_manager.get_community(community_id)
        if not community:
            raise ValueError("Community not found")

        if user_id not in community.members:
            raise ValueError("Join the community before applying to be a moderator")

        is_moderator = await self.community_manager.is_moderator(community_id, user_id)
        if is_moderator:
            raise ValueError("User is already a moderator of this community")

        if user_id in (community.bannedUsers or []):
            raise ValueError("User is banned from this community")

    async def _to_response(self, doc: dict) -> ModeratorApplicationResponse:
        doc = dict(doc)
        doc["id"] = str(doc["_id"])
        del doc["_id"]

        user = await self.user_manager.get_user_by_id(doc["userId"])
        if user:
            doc["userName"] = f"{user.firstName} {user.lastName}".strip()
            doc["userEmail"] = user.email
            doc["userProfile"] = {
                "firstName": user.firstName,
                "lastName": user.lastName,
                "email": user.email,
                "isExpert": user.isExpert,
                "reputation": user.reputation,
            }

        community = await self.community_manager.get_community(doc["communityId"])
        if community:
            doc["communityName"] = community.name
            doc["communityDisplayName"] = community.displayName

        if doc.get("reviewedBy"):
            reviewer = await self.user_manager.get_user_by_id(doc["reviewedBy"])
            if reviewer:
                doc["reviewerName"] = f"{reviewer.firstName} {reviewer.lastName}".strip()

        return ModeratorApplicationResponse(**doc)

    async def _send_creator_notification(
        self, application: ModeratorApplication, creator_id: str, community_name: str
    ) -> None:
        from app.managers.notification import NotificationManager

        applicant = await self.user_manager.get_user_by_id(application.userId)
        if not applicant:
            return

        notif = Notification(
            targetUserId=creator_id,
            sourceUserId=application.userId,
            type=NotificationType.CONNECTION_ACTIVITY,
            content=(
                f"{applicant.firstName} {applicant.lastName} applied to moderate "
                f"{community_name}. Review their request."
            ),
            referenceId=application.id,
            referenceType="moderator_application",
        )
        await NotificationManager().create_notification(notif)

    async def _send_application_notification(
        self,
        application: ModeratorApplicationResponse,
        reviewer_id: str,
        status: ApplicationStatus,
    ) -> None:
        from app.managers.notification import NotificationManager

        if status == ApplicationStatus.APPROVED:
            content = (
                f"Your moderator application for '{application.communityDisplayName}' "
                f"was approved."
            )
        elif status == ApplicationStatus.REJECTED:
            reason = application.rejectionReason or "No reason provided"
            content = (
                f"Your moderator application for '{application.communityDisplayName}' "
                f"was rejected. Reason: {reason}."
            )
        else:
            return

        notif = Notification(
            targetUserId=application.userId,
            sourceUserId=reviewer_id,
            type=NotificationType.CONNECTION_ACTIVITY,
            content=content,
            referenceId=application.id,
            referenceType="moderator_application",
        )
        await NotificationManager().create_notification(notif)
