import asyncio
import json
import logging
import re
from datetime import datetime, timedelta
from typing import Any, Optional

import google.generativeai as genai
from bson import ObjectId
from pymongo import ASCENDING, ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.config import settings
from app.core.database import get_database


logger = logging.getLogger(__name__)


class VideoTranscriptProcessingManager:
    def __init__(self):
        self.db = get_database()
        self.video_collection = self.db.videos
        self.job_collection = self.db.video_transcript_jobs
        self.batch_size = max(1, settings.VIDEO_TRANSCRIPT_BATCH_SIZE)
        self.worker_interval_seconds = max(5, settings.VIDEO_TRANSCRIPT_WORKER_INTERVAL_SECONDS)
        self.daily_interval_hours = max(1, settings.VIDEO_TRANSCRIPT_DAILY_INTERVAL_HOURS)
        self.retry_delay_minutes = max(1, settings.VIDEO_TRANSCRIPT_RETRY_DELAY_MINUTES)
        self.rate_limit_delay_seconds = max(0.0, settings.VIDEO_TRANSCRIPT_RATE_LIMIT_DELAY_SECONDS)
        self._run_lock = asyncio.Lock()
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            genai.configure(api_key=self.api_key)
        self.model_candidates = [
            settings.GEMINI_MODEL,
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro-latest",
        ]

    def _log(self, level: str, message: str, **fields: Any) -> None:
        payload = {"message": message, **fields}
        text = json.dumps(payload, default=str)
        if level == "error":
            logger.error(text)
        elif level == "warning":
            logger.warning(text)
        else:
            logger.info(text)

    async def ensure_indexes(self) -> None:
        await self.job_collection.create_index(
            [("activeJobKey", ASCENDING)],
            unique=True,
            partialFilterExpression={"activeJobKey": {"$exists": True}},
        )
        await self.job_collection.create_index([("status", ASCENDING), ("nextRunAt", ASCENDING)])
        await self.job_collection.create_index([("videoId", ASCENDING), ("createdAt", ASCENDING)])

    def _normalize_model(self, model_name: str) -> str:
        if model_name.startswith("models/"):
            return model_name
        return f"models/{model_name}"

    def _extract_json_object(self, text: str) -> Optional[dict]:
        if not text:
            return None
        cleaned = text.strip()
        try:
            parsed = json.loads(cleaned)
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if not match:
                return None
            try:
                parsed = json.loads(match.group(0))
                return parsed if isinstance(parsed, dict) else None
            except json.JSONDecodeError:
                return None

    def _get_supported_model(self) -> Optional[str]:
        if not self.api_key:
            return None
        try:
            available = []
            for model in genai.list_models():
                methods = getattr(model, "supported_generation_methods", []) or []
                if "generateContent" in methods:
                    available.append(model.name)
            for candidate in self.model_candidates:
                if not candidate:
                    continue
                normalized = self._normalize_model(candidate)
                if normalized in available:
                    return normalized
            return available[0] if available else None
        except Exception as exc:
            self._log("error", "Failed to list Gemini models", error=str(exc))
            return None

    async def enqueue_missing_videos(self, limit: int = 100) -> dict[str, int]:
        query = {
            "transcript": {"$exists": True, "$nin": [None, ""]},
            "$or": [
                {"translatedTranscript": {"$exists": False}},
                {"translatedTranscript": None},
                {"translatedTranscript": ""},
                {"transcriptSummary": {"$exists": False}},
                {"transcriptSummary": None},
                {"transcriptSummary": ""},
            ],
        }
        queued = 0
        scanned = 0
        async for video in self.video_collection.find(query).sort("createdAt", ASCENDING).limit(limit):
            scanned += 1
            if await self.enqueue_video(video):
                queued += 1
        return {"scanned": scanned, "queued": queued}

    async def get_diagnostics(self) -> dict[str, Any]:
        eligible_query = {
            "transcript": {"$exists": True, "$nin": [None, ""]},
            "$or": [
                {"translatedTranscript": {"$exists": False}},
                {"translatedTranscript": None},
                {"translatedTranscript": ""},
                {"transcriptSummary": {"$exists": False}},
                {"transcriptSummary": None},
                {"transcriptSummary": ""},
            ],
        }
        missing_transcript_query = {
            "$or": [
                {"transcript": {"$exists": False}},
                {"transcript": None},
                {"transcript": ""},
            ]
        }
        latest_failed = await self.job_collection.find_one(
            {"status": "failed"},
            sort=[("updatedAt", -1)],
        )
        return {
            "eligibleVideos": await self.video_collection.count_documents(eligible_query),
            "videosMissingTranscript": await self.video_collection.count_documents(missing_transcript_query),
            "queue": {
                "pending": await self.job_collection.count_documents({"status": "pending"}),
                "processing": await self.job_collection.count_documents({"status": "processing"}),
                "failed": await self.job_collection.count_documents({"status": "failed"}),
                "completed": await self.job_collection.count_documents({"status": "completed"}),
            },
            "lastFailedJob": {
                "videoId": latest_failed.get("videoId"),
                "error": latest_failed.get("lastError"),
                "updatedAt": latest_failed.get("updatedAt"),
            } if latest_failed else None,
        }

    async def enqueue_video(self, video: dict) -> bool:
        video_id = str(video["_id"])
        if video.get("translatedTranscript") and video.get("transcriptSummary"):
            return False

        existing = await self.job_collection.find_one(
            {
                "videoId": video_id,
                "status": {"$in": ["pending", "processing"]},
            },
            {"_id": 1},
        )
        if existing:
            return False

        now = datetime.utcnow()
        job = {
            "videoId": video_id,
            "status": "pending",
            "activeJobKey": video_id,
            "attempts": 0,
            "createdAt": now,
            "updatedAt": now,
            "nextRunAt": now,
            "lastError": None,
        }
        try:
            await self.job_collection.insert_one(job)
            return True
        except DuplicateKeyError:
            return False

    async def reset_stale_processing_jobs(self) -> None:
        now = datetime.utcnow()
        await self.job_collection.update_many(
            {
                "status": "processing",
                "lockExpiresAt": {"$lte": now},
            },
            {
                "$set": {
                    "status": "failed",
                    "updatedAt": now,
                    "nextRunAt": now + timedelta(minutes=self.retry_delay_minutes),
                    "lastError": "Processing lock expired",
                },
                "$unset": {
                    "activeJobKey": "",
                    "lockedAt": "",
                    "lockExpiresAt": "",
                },
            },
        )

    async def claim_next_job(self) -> Optional[dict]:
        now = datetime.utcnow()
        return await self.job_collection.find_one_and_update(
            {
                "status": {"$in": ["pending", "failed"]},
                "nextRunAt": {"$lte": now},
            },
            {
                "$set": {
                    "status": "processing",
                    "updatedAt": now,
                    "lockedAt": now,
                    "lockExpiresAt": now + timedelta(minutes=15),
                }
            },
            sort=[("nextRunAt", ASCENDING), ("createdAt", ASCENDING)],
            return_document=ReturnDocument.AFTER,
        )

    async def _mark_job_completed(self, job_id: ObjectId) -> None:
        now = datetime.utcnow()
        await self.job_collection.update_one(
            {"_id": job_id},
            {
                "$set": {
                    "status": "completed",
                    "updatedAt": now,
                    "completedAt": now,
                },
                "$unset": {
                    "activeJobKey": "",
                    "lockedAt": "",
                    "lockExpiresAt": "",
                },
            },
        )

    async def _mark_job_failed(self, job: dict, error: str) -> None:
        attempts = int(job.get("attempts", 0)) + 1
        now = datetime.utcnow()
        await self.job_collection.update_one(
            {"_id": job["_id"]},
            {
                "$set": {
                    "status": "failed",
                    "updatedAt": now,
                    "nextRunAt": now + timedelta(minutes=self.retry_delay_minutes),
                    "lastError": error[:1000],
                },
                "$inc": {"attempts": 1},
                "$unset": {
                    "activeJobKey": "",
                    "lockedAt": "",
                    "lockExpiresAt": "",
                },
            },
        )
        self._log(
            "warning",
            "Video transcript processing failed",
            videoId=job.get("videoId"),
            attempts=attempts,
            error=error[:300],
        )

    async def _call_gemini(self, transcript: str) -> dict:
        model_name = self._get_supported_model()
        if not model_name:
            raise RuntimeError("No Gemini model available for generateContent")

        model = genai.GenerativeModel(model_name)
        prompt = (
            "Translate the following video transcript to English and write an English summary with a maximum length of 500 characters. "
            "Return strict JSON only with keys translated_transcript and summary. "
            "Do not wrap the response in markdown fences.\n\n"
            f"TRANSCRIPT:\n{transcript}"
        )

        last_error: Optional[Exception] = None
        for attempt in range(2):
            try:
                response = model.generate_content(prompt, request_options={"timeout": 30})
                parsed = self._extract_json_object(getattr(response, "text", "") or "")
                if not parsed:
                    raise RuntimeError("Gemini response was not valid JSON")
                translated = str(parsed.get("translated_transcript", "")).strip()
                summary = str(parsed.get("summary", "")).strip()
                if not translated:
                    raise RuntimeError("Gemini response missing translated_transcript")
                if not summary:
                    raise RuntimeError("Gemini response missing summary")
                if len(summary) > 500:
                    summary = summary[:497].rstrip() + "..."
                return {
                    "translatedTranscript": translated,
                    "transcriptSummary": summary,
                    "model": model_name,
                }
            except Exception as exc:
                last_error = exc
                error_text = str(exc)
                transient = any(
                    phrase in error_text
                    for phrase in ["RESOURCE_EXHAUSTED", "429", "Deadline", "ServiceUnavailable", "500"]
                )
                if transient and attempt == 0:
                    await asyncio.sleep(max(1.0, self.rate_limit_delay_seconds))
                    continue
                break

        raise RuntimeError(str(last_error) if last_error else "Gemini processing failed")

    async def process_job(self, job: dict) -> dict[str, Any]:
        video_id = job["videoId"]
        video = await self.video_collection.find_one({"_id": ObjectId(video_id)})
        if not video:
            await self._mark_job_failed(job, "Video not found")
            return {"processed": 0, "failed": 1, "skipped": 0}

        if video.get("translatedTranscript") and video.get("transcriptSummary"):
            await self._mark_job_completed(job["_id"])
            return {"processed": 0, "failed": 0, "skipped": 1}

        transcript = (video.get("transcript") or "").strip()
        if not transcript:
            await self._mark_job_failed(job, "Transcript missing")
            return {"processed": 0, "failed": 1, "skipped": 0}

        try:
            result = await self._call_gemini(transcript)
            now = datetime.utcnow()
            update_result = await self.video_collection.update_one(
                {"_id": ObjectId(video_id)},
                {
                    "$set": {
                        "translatedTranscript": result["translatedTranscript"],
                        "transcriptSummary": result["transcriptSummary"],
                        "transcriptProcessedAt": now,
                        "transcriptProcessingError": None,
                        "updatedAt": now,
                    }
                },
            )
            if update_result.matched_count != 1:
                raise RuntimeError("Video update did not match any record")

            updated_video = await self.video_collection.find_one({"_id": ObjectId(video_id)})
            if not updated_video:
                raise RuntimeError("Updated video could not be reloaded")
            if not updated_video.get("translatedTranscript"):
                raise RuntimeError("translatedTranscript was not persisted")
            if not updated_video.get("transcriptSummary"):
                raise RuntimeError("transcriptSummary was not persisted")
            if not updated_video.get("transcriptProcessedAt"):
                raise RuntimeError("transcriptProcessedAt was not persisted")

            await self._mark_job_completed(job["_id"])
            self._log("info", "Video transcript processed", videoId=video_id, model=result["model"])
            return {"processed": 1, "failed": 0, "skipped": 0}
        except Exception as exc:
            now = datetime.utcnow()
            await self.video_collection.update_one(
                {"_id": ObjectId(video_id)},
                {
                    "$set": {
                        "transcriptProcessingError": str(exc)[:1000],
                        "updatedAt": now,
                    }
                },
            )
            await self._mark_job_failed(job, str(exc))
            return {"processed": 0, "failed": 1, "skipped": 0}

    async def run_once(self, enqueue_missing: bool = False, limit: Optional[int] = None) -> dict[str, int]:
        async with self._run_lock:
            stats = {"queued": 0, "processed": 0, "failed": 0, "skipped": 0}
            await self.reset_stale_processing_jobs()
            if enqueue_missing:
                enqueue_stats = await self.enqueue_missing_videos(limit=limit or 100)
                stats["queued"] = enqueue_stats["queued"]

            batch_limit = limit or self.batch_size
            for index in range(batch_limit):
                job = await self.claim_next_job()
                if not job:
                    break
                job_stats = await self.process_job(job)
                for key in ("processed", "failed", "skipped"):
                    stats[key] += int(job_stats.get(key, 0))
                if self.rate_limit_delay_seconds > 0 and index < batch_limit - 1:
                    await asyncio.sleep(self.rate_limit_delay_seconds)
            self._log("info", "Video transcript run finished", **stats, limit=batch_limit, enqueue_missing=enqueue_missing)
            return stats

    async def worker_loop(self) -> None:
        while True:
            try:
                await self.run_once(enqueue_missing=False)
            except Exception as exc:
                self._log("error", "Video transcript worker loop crashed", error=str(exc))
            await asyncio.sleep(self.worker_interval_seconds)

    async def scheduler_loop(self) -> None:
        while True:
            try:
                enqueue_stats = await self.enqueue_missing_videos(limit=500)
                self._log("info", "Scheduled transcript enqueue finished", **enqueue_stats)
            except Exception as exc:
                self._log("error", "Video transcript scheduler failed", error=str(exc))
            await asyncio.sleep(self.daily_interval_hours * 3600)
