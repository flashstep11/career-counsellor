"""
Expert Application Manager

This module provides functionality for managing expert applications in the database.
"""

from datetime import datetime
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.database import get_database
from app.models.expert_application import (
    ExpertApplicationCreate,
    ExpertApplicationResponse,
    ExpertApplicationStatus,
    ExpertApplicationStatusUpdate
)
from app.managers.expert import ExpertManager
from app.managers.user import UserManager


class ExpertApplicationManager:
    """Manager for expert applications"""

    def __init__(self):
        self.db: AsyncIOMotorDatabase = get_database()
        self.collection = self.db.expert_applications
        self.expert_manager = ExpertManager()
        self.user_manager = UserManager()

    async def create_application(self, data: ExpertApplicationCreate) -> ExpertApplicationResponse:
        """
        Create a new expert application

        Args:
            data: The expert application data

        Returns:
            The created expert application
        """
        # Check if user already has a pending application
        existing = await self.collection.find_one({"userId": data.userId})
        if existing:
            # Update existing application if it exists
            if existing["status"] == ExpertApplicationStatus.REJECTED:
                # If previously rejected, allow to reapply with fresh details
                await self.collection.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {
                        **data.dict(),
                        "applicationDate": datetime.utcnow(),
                        "status": ExpertApplicationStatus.PENDING,
                        "reviewDate": None,
                        "reviewedBy": None,
                        "rejectionReason": None
                    }}
                )
                updated = await self.collection.find_one({"_id": existing["_id"]})
                return self._document_to_model(updated)
            else:
                # Return existing application without modifying it
                return self._document_to_model(existing)

        # Create a new application
        application = {
            **data.dict(),
            "applicationDate": datetime.utcnow(),
            "status": ExpertApplicationStatus.PENDING,
            "reviewDate": None,
            "reviewedBy": None,
            "rejectionReason": None
        }

        result = await self.collection.insert_one(application)
        created = await self.collection.find_one({"_id": result.inserted_id})

        return self._document_to_model(created)

    async def get_application(self, application_id: str) -> Optional[ExpertApplicationResponse]:
        """
        Get an expert application by ID

        Args:
            application_id: The ID of the application to get

        Returns:
            The expert application if found, None otherwise
        """
        try:
            application = await self.collection.find_one({"_id": ObjectId(application_id)})
            if not application:
                return None

            return self._document_to_model(application)
        except Exception:
            return None

    async def get_user_application(self, user_id: str) -> Optional[ExpertApplicationResponse]:
        """
        Get an expert application by user ID

        Args:
            user_id: The ID of the user

        Returns:
            The expert application if found, None otherwise
        """
        application = await self.collection.find_one({"userId": user_id})
        if not application:
            return None

        return self._document_to_model(application)

    async def get_all_applications(self, status: Optional[ExpertApplicationStatus] = None) -> List[ExpertApplicationResponse]:
        """
        Get all expert applications, optionally filtered by status

        Args:
            status: Optional filter for application status

        Returns:
            List of expert applications
        """
        query = {}
        if status:
            query["status"] = status

        cursor = self.collection.find(query).sort("applicationDate", -1)
        applications = await cursor.to_list(length=100)

        return [self._document_to_model(application) for application in applications]

    async def update_application_status(
        self,
        application_id: str,
        status_update: ExpertApplicationStatusUpdate,
        admin_id: str
    ) -> Optional[ExpertApplicationResponse]:
        """
        Update the status of an expert application

        Args:
            application_id: The ID of the application to update
            status_update: The status update data
            admin_id: The ID of the admin making the update

        Returns:
            The updated expert application if found, None otherwise
        """
        try:
            application = await self.get_application(application_id)
            if not application:
                return None

            # Prepare update data
            update_data = {
                "status": status_update.status,
                "reviewDate": datetime.utcnow(),
                "reviewedBy": admin_id
            }

            # Add rejection reason if provided and status is rejected
            if status_update.status == ExpertApplicationStatus.REJECTED and status_update.rejectionReason:
                update_data["rejectionReason"] = status_update.rejectionReason

            # Update the application
            await self.collection.update_one(
                {"_id": ObjectId(application_id)},
                {"$set": update_data}
            )

            # If approved, create an expert profile for the user
            if status_update.status == ExpertApplicationStatus.APPROVED:
                # Create expert profile
                expert = await self.expert_manager.create_from_application(application)

                # Update user isExpert flag
                await self.user_manager.update_to_expert(application.userId, expert.id)

            # Get and return the updated application
            updated = await self.collection.find_one({"_id": ObjectId(application_id)})
            return self._document_to_model(updated)

        except Exception as e:
            print(f"Error updating application status: {e}")
            return None

    def _document_to_model(self, doc: dict) -> ExpertApplicationResponse:
        """
        Convert a database document to a model

        Args:
            doc: The database document

        Returns:
            The model
        """
        # Convert MongoDB _id to string id
        doc_copy = dict(doc)
        doc_copy["id"] = str(doc_copy.pop("_id"))

        return ExpertApplicationResponse(**doc_copy)
