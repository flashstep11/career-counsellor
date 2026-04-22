from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.models.report import Report, ReportCreate, ReportResponse
from app.core.database import get_database


class ReportManager:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.reports

    async def create_report(self, data: ReportCreate, reporter_id: str) -> ReportResponse:
        now = datetime.utcnow()
        doc = {
            "targetId": data.targetId,
            "targetType": data.targetType,
            "reason": data.reason,
            "reporterId": reporter_id,
            "communityId": data.communityId,
            "status": "open",
            "createdAt": now,
            "updatedAt": now,
        }
        result = await self.collection.insert_one(doc)
        doc["reportId"] = str(result.inserted_id)
        return ReportResponse(**doc)

    async def get_community_reports(
        self, community_id: str, skip: int = 0, limit: int = 50
    ) -> List[ReportResponse]:
        cursor = (
            self.collection.find({"communityId": community_id})
            .sort("createdAt", -1)
            .skip(skip)
            .limit(limit)
        )
        reports = []
        async for doc in cursor:
            doc["reportId"] = str(doc["_id"])
            reports.append(ReportResponse(**doc))
        return reports

    async def resolve_report(self, report_id: str) -> Optional[ReportResponse]:
        result = await self.collection.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": {"status": "resolved", "updatedAt": datetime.utcnow()}},
        )
        if result.modified_count:
            doc = await self.collection.find_one({"_id": ObjectId(report_id)})
            if doc:
                doc["reportId"] = str(doc["_id"])
                return ReportResponse(**doc)
        return None
