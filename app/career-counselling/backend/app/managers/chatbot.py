import google.generativeai as genai
from google.api_core import exceptions as gexc
import asyncio
import os
import re
from fastapi import HTTPException
import json
import logging
import time
from typing import Any
from app.core.database import get_database
from app.config import settings
from datetime import datetime
from bson import ObjectId
from app.managers.search import SearchManager
from app.managers.college import CollegeManager
from app.managers.expert import ExpertManager
from app.managers.branch import BranchManager


class ChatbotManager:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            genai.configure(api_key=self.api_key)
        self.model = settings.GEMINI_MODEL or "gemini-flash-lite-latest"
        self.blocked_models = {
            self._normalize_model_name("gemini-2.5-flash"),
        }
        # Preferred models in order (cost and quota friendly first)
        self.model_fallbacks = [
            "gemini-flash-lite-latest",
            "gemini-flash-latest",
        ]
        self.model_cache_ttl_seconds = 900
        self._cached_generate_models: list[str] = []
        self._cached_embedding_models: list[str] = []
        self._cached_models_at = 0.0
        normalized_default = self._normalize_model_name(self.model)
        if (
            self.model
            and self.model not in self.model_fallbacks
            and normalized_default not in self.blocked_models
        ):
            self.model_fallbacks.insert(0, self.model)
        self.search_manager = SearchManager()
        self.college_manager = CollegeManager()
        self.expert_manager = ExpertManager()
        self.branch_manager = BranchManager()

    def _log_event(self, level: str, message: str, **fields):
        payload = {"message": message, **fields}
        try:
            text = json.dumps(payload, default=str)
        except Exception:
            text = f"{message} | {fields}"
        logger = logging.getLogger(__name__)
        if level == "error":
            logger.error(text)
        elif level == "warning":
            logger.warning(text)
        else:
            logger.info(text)

    def _normalize_model_name(self, name: str) -> str:
        return name if name.startswith("models/") else f"models/{name}"

    def _list_generate_models(self, force_refresh: bool = False) -> list[str]:
        now = time.time()
        if (
            not force_refresh
            and self._cached_generate_models
            and (now - self._cached_models_at) < self.model_cache_ttl_seconds
        ):
            return list(self._cached_generate_models)

        try:
            models = genai.list_models()
            supported = []
            for m in models:
                methods = getattr(m, "supported_generation_methods", []) or []
                if "generateContent" in methods:
                    supported.append(m.name)
            self._cached_generate_models = list(supported)
            self._cached_models_at = now
            return supported
        except Exception as e:
            self._log_event("error", "Failed to list Gemini models", error=str(e))
            return list(self._cached_generate_models)

    def _list_embedding_models(self, force_refresh: bool = False) -> list[str]:
        now = time.time()
        if (
            not force_refresh
            and self._cached_embedding_models
            and (now - self._cached_models_at) < self.model_cache_ttl_seconds
        ):
            return list(self._cached_embedding_models)

        try:
            models = genai.list_models()
            supported = []
            for m in models:
                methods = getattr(m, "supported_generation_methods", []) or []
                if "embedContent" in methods:
                    supported.append(m.name)
            self._cached_embedding_models = list(supported)
            self._cached_models_at = now
            return supported
        except Exception as e:
            self._log_event("error", "Failed to list embedding models", error=str(e))
            return list(self._cached_embedding_models)

    def _select_embedding_model(self) -> str | None:
        preferred = [
            self._normalize_model_name(getattr(settings, "GEMINI_EMBEDDING_MODEL", "models/text-embedding-004")),
            "models/text-embedding-004",
            "models/embedding-001",
            "models/gemini-embedding-001",
        ]
        available = self._list_embedding_models()
        for model in preferred:
            if model in available:
                return model
        if available:
            return available[0]
        return None

    def _select_model(self) -> str | None:
        available = self._list_generate_models()
        preferred = [self._normalize_model_name(m) for m in self.model_fallbacks]
        for m in preferred:
            if m in available:
                return m
        return None

    def _candidate_models(self) -> list[str]:
        candidates: list[str] = []

        selected = self._select_model()
        if selected:
            candidates.append(selected)

        for model in self.model_fallbacks:
            normalized = self._normalize_model_name(model)
            if normalized not in candidates:
                candidates.append(normalized)

        default_model = self._normalize_model_name(self.model)
        if default_model not in candidates:
            candidates.append(default_model)

        filtered: list[str] = []
        for model in candidates:
            if model in self.blocked_models:
                continue
            if model not in filtered:
                filtered.append(model)

        return filtered

    async def _candidate_models_async(self) -> list[str]:
        return await asyncio.to_thread(self._candidate_models)

    def _tool_declarations(self) -> list[dict[str, Any]]:
        return [
            {
                "function_declarations": [
                    {
                        "name": "search_platform_knowledge",
                        "description": "Search videos and blogs in the platform knowledge base. Use this for factual platform-specific queries.",
                        "parameters": {
                            "type": "OBJECT",
                            "properties": {
                                "query": {
                                    "type": "STRING",
                                    "description": "The factual query to search in the platform knowledge base.",
                                },
                                "content_types": {
                                    "type": "ARRAY",
                                    "items": {
                                        "type": "STRING",
                                        "enum": ["videos", "blogs"],
                                    },
                                    "description": "Optional content types to search. Defaults to videos and blogs.",
                                },
                                "top_k": {
                                    "type": "INTEGER",
                                    "description": "Maximum number of combined results to retrieve. Keep this small.",
                                },
                            },
                            "required": ["query"],
                        },
                    }
                ]
            },
            {
                "function_declarations": [
                    {
                        "name": "search_platform_entities",
                        "description": "Search platform entities like colleges, experts, branches, blogs, and videos for factual grounding.",
                        "parameters": {
                            "type": "OBJECT",
                            "properties": {
                                "query": {
                                    "type": "STRING",
                                    "description": "The factual query to search in platform entities.",
                                },
                                "top_k": {
                                    "type": "INTEGER",
                                    "description": "Maximum results per entity type (1-5).",
                                },
                            },
                            "required": ["query"],
                        },
                    }
                ]
            }
        ]

    def _build_user_profile_context(self, user: dict, expert_data: dict | None) -> str:
        first_name = (user.get("firstName") or "").strip()
        role = "Expert" if user.get("isExpert", False) else "Student"
        home_state = user.get("home_state")
        category = user.get("category")
        user_type = user.get("type", "free")
        user_status = user.get("status", "active")
        exam_ranks = user.get("exam_ranks", {}) or {}
        education = user.get("education", {}) or {}
        preferences = user.get("preferences", {}) or {}
        interests = user.get("interests", []) or []

        lines: list[str] = []
        lines.append(f"- Name: {first_name or 'User'}")
        lines.append(f"- Role: {role}")
        lines.append(f"- Account Type: {str(user_type).capitalize()}")
        lines.append(f"- Account Status: {str(user_status).capitalize()}")
        if home_state:
            lines.append(f"- Home State: {home_state}")
        if category:
            lines.append(f"- Category: {category}")

        if education:
            edu_parts = []
            if education.get("degree"):
                edu_parts.append(f"Degree {education.get('degree')}")
            if education.get("field"):
                edu_parts.append(f"Field {education.get('field')}")
            if education.get("college"):
                edu_parts.append(f"College {education.get('college')}")
            if education.get("year"):
                edu_parts.append(f"Year {education.get('year')}")
            if edu_parts:
                lines.append(f"- Education: {', '.join(edu_parts)}")

        if exam_ranks:
            rank_bits = [f"{k}: {v}" for k, v in exam_ranks.items() if v is not None]
            if rank_bits:
                lines.append(f"- Exam Ranks: {', '.join(rank_bits)}")

        preferred_fields = preferences.get("fields", []) or []
        preferred_locations = preferences.get("locations", []) or []
        career_goals = preferences.get("career_goals", []) or []
        skills = preferences.get("skills", []) or []

        if preferred_fields:
            lines.append(f"- Preferred Fields: {', '.join(preferred_fields)}")
        if preferred_locations:
            lines.append(f"- Preferred Locations: {', '.join(preferred_locations)}")
        if career_goals:
            lines.append(f"- Career Goals: {', '.join(career_goals)}")
        if skills:
            lines.append(f"- Skill Interests: {', '.join(skills)}")
        if interests:
            lines.append(f"- General Interests: {', '.join(interests)}")

        if expert_data:
            expertise_areas = expert_data.get("expertise_areas", []) or []
            if expert_data.get("specialization"):
                lines.append(f"- Expert Specialization: {expert_data.get('specialization')}")
            if expert_data.get("organization"):
                lines.append(f"- Expert Organization: {expert_data.get('organization')}")
            if expertise_areas:
                lines.append(f"- Expert Areas: {', '.join(expertise_areas)}")

        return "\n".join(lines)

    def _extract_response_text(self, response: Any) -> str:
        text = (getattr(response, "text", "") or "").strip()
        if text:
            return text

        try:
            candidates = getattr(response, "candidates", []) or []
            text_parts: list[str] = []
            for candidate in candidates:
                content = getattr(candidate, "content", None)
                parts = getattr(content, "parts", []) or []
                for part in parts:
                    part_text = getattr(part, "text", None)
                    if part_text:
                        text_parts.append(str(part_text))
            return "\n".join(text_parts).strip()
        except Exception:
            return ""

    def _parse_function_args(self, raw_args: Any) -> dict[str, Any]:
        if raw_args is None:
            return {}
        if isinstance(raw_args, dict):
            return raw_args
        try:
            if hasattr(raw_args, "items"):
                return {k: v for k, v in raw_args.items()}
        except Exception:
            pass
        try:
            if hasattr(raw_args, "to_dict"):
                converted = raw_args.to_dict()
                if isinstance(converted, dict):
                    return converted
        except Exception:
            pass
        try:
            loaded = json.loads(str(raw_args))
            if isinstance(loaded, dict):
                return loaded
        except Exception:
            pass
        return {}

    def _extract_function_calls(self, response: Any) -> list[dict[str, Any]]:
        calls: list[dict[str, Any]] = []
        try:
            candidates = getattr(response, "candidates", []) or []
            for candidate in candidates:
                content = getattr(candidate, "content", None)
                parts = getattr(content, "parts", []) or []
                for part in parts:
                    function_call = getattr(part, "function_call", None)
                    if not function_call:
                        continue
                    name = getattr(function_call, "name", "")
                    if not name:
                        continue
                    args = self._parse_function_args(getattr(function_call, "args", None))
                    calls.append({"name": name, "args": args})
        except Exception as e:
            self._log_event("warning", "Failed to parse function calls", error=str(e))
        return calls

    def _sanitize_history_text(self, content: str, max_len: int = 3500) -> str:
        if not content:
            return ""
        return content.strip()[:max_len]

    def _build_system_instruction(self, session: dict | None) -> str:
        base_instruction = (
            "You are CareerMind AI, a concise and supportive career counselling assistant. "
            "Use markdown. Provide accurate, practical advice. "
            "For platform-specific facts about blogs/videos, use available tools instead of guessing."
        )

        if not session:
            return base_instruction

        recent_system_prompts = session.get("system_prompts", [])[-2:]
        if not recent_system_prompts:
            return base_instruction

        stitched_prompts = []
        for item in recent_system_prompts:
            content = self._sanitize_history_text(item.get("content", ""), max_len=2500)
            if content:
                stitched_prompts.append(content)

        if not stitched_prompts:
            return base_instruction

        return f"{base_instruction}\n\nSession System Context:\n" + "\n\n".join(stitched_prompts)

    def _build_chat_history(self, session: dict | None) -> list[dict[str, Any]]:
        history: list[dict[str, Any]] = []
        if not session:
            return history

        for item in session.get("history", [])[-10:]:
            role = item.get("role")
            content = self._sanitize_history_text(item.get("content", ""), max_len=2000)
            if not content:
                continue
            if role == "user":
                history.append({"role": "user", "parts": [content]})
            elif role == "assistant":
                history.append({"role": "model", "parts": [content]})
        return history

    def _build_message_context(self, session: dict | None, message: str) -> str:
        context_blocks: list[str] = []

        if session:
            # Keep the context bounded to avoid oversized requests as sessions grow.
            for system_prompt in session.get("system_prompts", [])[-2:]:
                content = (system_prompt.get("content") or "").strip()
                if content:
                    context_blocks.append(f"SYSTEM:\n{content[:3500]}")

            for history_item in session.get("history", [])[-8:]:
                role = (history_item.get("role") or "user").upper()
                content = (history_item.get("content") or "").strip()
                if content:
                    context_blocks.append(f"{role}: {content[:1500]}")

        context_text = "\n\n".join(context_blocks)

        return (
            "You are CareerMind AI, a concise and supportive career counselling assistant. "
            "If you need platform-specific data, you may output a line in this exact format: "
            "SYSTEM REQUEST: <query>.\n\n"
            f"CONTEXT:\n{context_text}\n\n"
            f"USER: {message}\n\n"
            "Respond directly to the user in markdown."
        )

    async def _generate_text_with_fallback(self, prompt: str) -> str:
        last_error: Exception | None = None
        transient_errors = (
            gexc.ResourceExhausted,
            gexc.DeadlineExceeded,
            gexc.ServiceUnavailable,
            gexc.InternalServerError,
        )

        for model_name in await self._candidate_models_async():
            model = genai.GenerativeModel(model_name)
            for attempt in range(2):
                try:
                    response = await asyncio.to_thread(
                        model.generate_content,
                        prompt,
                        request_options={"timeout": 25},
                    )
                    text = (response.text or "").strip()
                    if text:
                        return text
                    raise ValueError("Gemini returned empty response text")
                except transient_errors as e:
                    last_error = e
                    error_text = str(e).lower()
                    if "quota" in error_text or "429" in error_text:
                        self._log_event(
                            "warning",
                            "Gemini model quota exceeded; trying next model",
                            model=model_name,
                            error=str(e),
                        )
                        break
                    self._log_event(
                        "warning",
                        "Transient Gemini chat error; retrying",
                        model=model_name,
                        attempt=attempt + 1,
                        error=str(e),
                    )
                    continue
                except Exception as e:
                    last_error = e
                    self._log_event(
                        "error",
                        "Gemini chat request failed",
                        model=model_name,
                        error=str(e),
                    )
                    break

        if last_error:
            raise last_error
        raise RuntimeError("No Gemini model produced a response")

    def _clean_tool_content_types(self, content_types: Any) -> list[str]:
        allowed = {"videos", "blogs"}
        if not isinstance(content_types, list):
            return ["videos", "blogs"]
        cleaned = [str(item).strip().lower() for item in content_types if str(item).strip().lower() in allowed]
        return cleaned or ["videos", "blogs"]

    async def _embed_query(self, query: str) -> list[float] | None:
        embedding_model = await asyncio.to_thread(self._select_embedding_model)
        if not embedding_model:
            self._log_event("warning", "No embedding model available; using fallback retrieval")
            return None
        try:
            result = await asyncio.to_thread(
                genai.embed_content,
                model=embedding_model,
                content=query,
                task_type="retrieval_query",
            )
            if isinstance(result, dict):
                vector = result.get("embedding")
            else:
                vector = getattr(result, "embedding", None)
            if isinstance(vector, list) and vector:
                return vector
        except Exception as e:
            self._log_event("warning", "Embedding generation failed; using fallback retrieval", error=str(e))
        return None

    async def _vector_search_docs(
        self,
        collection_name: str,
        query_vector: list[float],
        query: str,
        top_k: int,
        index_candidates: list[str],
        path_candidates: list[str],
    ) -> list[dict[str, Any]]:
        db = get_database()
        collection = getattr(db, collection_name)

        for index_name in index_candidates:
            if not index_name:
                continue
            for path in path_candidates:
                if not path:
                    continue
                try:
                    pipeline = [
                        {
                            "$vectorSearch": {
                                "index": index_name,
                                "path": path,
                                "queryVector": query_vector,
                                "numCandidates": max(50, top_k * 15),
                                "limit": top_k,
                            }
                        },
                        {
                            "$project": {
                                "title": 1,
                                "description": 1,
                                "youtubeUrl": 1,
                                "tags": 1,
                                "transcriptSummary": 1,
                                "heading": 1,
                                "body": 1,
                                "score": {"$meta": "vectorSearchScore"},
                            }
                        },
                    ]
                    docs = await collection.aggregate(pipeline).to_list(top_k)
                    if docs:
                        return docs
                except Exception:
                    continue

        escaped = re.escape(query)
        if collection_name == "videos":
            fallback_query = {
                "$or": [
                    {"title": {"$regex": escaped, "$options": "i"}},
                    {"description": {"$regex": escaped, "$options": "i"}},
                    {"tags": {"$regex": escaped, "$options": "i"}},
                    {"transcriptSummary": {"$regex": escaped, "$options": "i"}},
                ]
            }
        else:
            fallback_query = {
                "$or": [
                    {"heading": {"$regex": escaped, "$options": "i"}},
                    {"body": {"$regex": escaped, "$options": "i"}},
                    {"tags": {"$regex": escaped, "$options": "i"}},
                ]
            }

        return await collection.find(fallback_query).limit(top_k).to_list(top_k)

    async def search_platform_knowledge(
        self,
        query: str,
        content_types: Any = None,
        top_k: Any = 3,
    ) -> dict[str, Any]:
        query = (query or "").strip()
        if not query:
            return {"query": "", "results": {"videos": [], "blogs": []}, "meta": {"reason": "empty_query"}}

        normalized_content_types = self._clean_tool_content_types(content_types)
        try:
            top_k_int = max(1, min(int(top_k), 5))
        except Exception:
            top_k_int = 3

        query_vector = await self._embed_query(query)
        has_vector = query_vector is not None

        video_results: list[dict[str, Any]] = []
        blog_results: list[dict[str, Any]] = []

        if "videos" in normalized_content_types:
            video_index_candidates = [
                getattr(settings, "VIDEO_VECTOR_INDEX", ""),
                "videos_vector_index",
                "vector_index",
                "default",
            ]
            video_path_candidates = [
                getattr(settings, "VIDEO_VECTOR_FIELD", ""),
                "embedding",
                "vector",
                "summaryEmbedding",
                "transcriptEmbedding",
            ]

            docs = await self._vector_search_docs(
                "videos",
                query_vector or [],
                query,
                top_k_int,
                video_index_candidates,
                video_path_candidates,
            ) if has_vector else await self._vector_search_docs(
                "videos",
                [],
                query,
                top_k_int,
                [],
                [],
            )

            for doc in docs[:top_k_int]:
                video_results.append(
                    {
                        "video_id": str(doc.get("_id", "")),
                        "title": doc.get("title", ""),
                        "description": (doc.get("description", "") or "")[:320],
                        "youtube_url": doc.get("youtubeUrl", ""),
                        "transcript_summary": (doc.get("transcriptSummary", "") or "")[:320],
                        "score": float(doc.get("score", 0.0)) if doc.get("score") is not None else 0.0,
                    }
                )

        if "blogs" in normalized_content_types:
            blog_index_candidates = [
                getattr(settings, "BLOG_VECTOR_INDEX", ""),
                "blogs_vector_index",
                "vector_index",
                "default",
            ]
            blog_path_candidates = [
                getattr(settings, "BLOG_VECTOR_FIELD", ""),
                "embedding",
                "vector",
                "bodyEmbedding",
            ]

            docs = await self._vector_search_docs(
                "blogs",
                query_vector or [],
                query,
                top_k_int,
                blog_index_candidates,
                blog_path_candidates,
            ) if has_vector else await self._vector_search_docs(
                "blogs",
                [],
                query,
                top_k_int,
                [],
                [],
            )

            for doc in docs[:top_k_int]:
                blog_results.append(
                    {
                        "blog_id": str(doc.get("_id", "")),
                        "heading": doc.get("heading", ""),
                        "body": (doc.get("body", "") or "")[:320],
                        "score": float(doc.get("score", 0.0)) if doc.get("score") is not None else 0.0,
                    }
                )

        return {
            "query": query,
            "results": {
                "videos": video_results,
                "blogs": blog_results,
            },
            "meta": {
                "content_types": normalized_content_types,
                "top_k": top_k_int,
                "vector_search_used": has_vector,
            },
        }

    async def search_platform_entities(self, query: str, top_k: Any = 3) -> dict[str, Any]:
        query = (query or "").strip()
        if not query:
            return {"query": "", "results": {}, "meta": {"reason": "empty_query"}}

        try:
            top_k_int = max(1, min(int(top_k), 5))
        except Exception:
            top_k_int = 3

        search_results = await self.search_manager.search(query, limit=top_k_int)

        colleges = []
        for college in (search_results.colleges or [])[:top_k_int]:
            colleges.append(
                {
                    "college_id": getattr(college, "collegeID", ""),
                    "name": getattr(college, "name", ""),
                    "state": getattr(college, "state", ""),
                    "city": getattr(college, "city", ""),
                    "nirf_ranking": getattr(college, "nirfRanking", None),
                }
            )

        experts = []
        for expert in (search_results.experts or [])[:top_k_int]:
            full_name = ""
            user_details = getattr(expert, "userDetails", None)
            if user_details:
                full_name = f"{getattr(user_details, 'firstName', '')} {getattr(user_details, 'lastName', '')}".strip()
            experts.append(
                {
                    "expert_id": getattr(expert, "expertID", ""),
                    "name": full_name,
                    "bio": (getattr(expert, "bio", "") or "")[:260],
                    "specialties": getattr(expert, "specialties", []),
                    "rating": getattr(expert, "rating", None),
                }
            )

        branches = []
        if hasattr(search_results, "branches") and search_results.branches:
            for branch in search_results.branches[:top_k_int]:
                branches.append(
                    {
                        "branch_id": getattr(branch, "branchID", ""),
                        "name": getattr(branch, "name", ""),
                        "description": (getattr(branch, "description", "") or "")[:260],
                    }
                )

        blogs = []
        for blog in (search_results.blogs or [])[:top_k_int]:
            blogs.append(
                {
                    "blog_id": getattr(blog, "blogID", ""),
                    "heading": getattr(blog, "heading", ""),
                    "tags": getattr(blog, "tags", []),
                }
            )

        videos = []
        for video in (search_results.videos or [])[:top_k_int]:
            videos.append(
                {
                    "video_id": getattr(video, "videoID", ""),
                    "title": getattr(video, "title", ""),
                    "tags": getattr(video, "tags", []),
                }
            )

        return {
            "query": query,
            "results": {
                "colleges": colleges,
                "experts": experts,
                "branches": branches,
                "blogs": blogs,
                "videos": videos,
            },
            "meta": {
                "top_k": top_k_int,
                "total_count": getattr(search_results, "total_count", 0),
            },
        }

    async def handle_system_request(self, query: str):
        """Process a system request from the AI to search for information"""
        try:
            # Extract the query from the SYSTEM REQUEST format
            search_query = query.replace("SYSTEM REQUEST:", "").strip()

            # Perform search using our existing search functionality
            search_results = await self.search_manager.search(search_query)

            # If we have results, let's get more details about top items
            detailed_results = []

            # Process college results - colleges are CollegeSearchResponse objects
            if search_results.colleges and len(search_results.colleges) > 0:
                college_ids = [
                    college.collegeID for college in search_results.colleges[:3]]
                for college_id in college_ids:
                    try:
                        # The get_college method returns a CollegeDescriptionResponse object
                        college_details = await self.college_manager.get_college(college_id)
                        if college_details:
                            # Access attributes directly on the Pydantic model
                            detailed_results.append({
                                "type": "college",
                                "name": college_details.name,
                                "state": college_details.state,
                                "address": college_details.address,
                                "nirfRanking": college_details.nirfRanking,
                                "description": college_details.description,
                                "website": str(college_details.website),
                                "college_type": college_details.type,  # Renamed to avoid duplicate key
                                "locality_type": college_details.locality_type,
                                "gender_ratio": college_details.gender_ratio,
                                "yearOfEstablishment": college_details.yearOfEstablishment,
                                "placement": college_details.placement,
                                "placementMedian": college_details.placementMedian
                            })
                    except Exception as e:
                        print(
                            f"Error processing college {college_id}: {str(e)}")

            # Process experts results - experts are ExpertSearchResponse objects
            if search_results.experts and len(search_results.experts) > 0:
                expert_ids = [
                    expert.expertID for expert in search_results.experts[:3]]
                for expert_id in expert_ids:
                    try:
                        # The get_expert method returns an ExpertResponse object
                        expert = await self.expert_manager.get_expert(expert_id)
                        if expert:
                            # Extract user details from the ExpertResponse
                            expert_info = {
                                "type": "expert",
                                "name": f"{expert.userDetails.firstName} {expert.userDetails.lastName}",
                                "bio": expert.bio,
                                "specialization": getattr(expert, "specialization", ""),
                                "institution": getattr(expert, "organization", ""),
                                "rating": expert.rating
                            }

                            # Add expertise areas if available
                            if hasattr(expert, "expertise_areas"):
                                expert_info["expertise_areas"] = expert.expertise_areas

                            # Add education if available
                            if hasattr(expert, "education") and expert.education:
                                education_info = []
                                for edu in expert.education:
                                    education_info.append({
                                        "degree": edu.get("degree", ""),
                                        "institution": edu.get("institution", ""),
                                        "year": edu.get("year", "")
                                    })
                                expert_info["education"] = education_info

                            detailed_results.append(expert_info)
                    except Exception as e:
                        print(f"Error processing expert {expert_id}: {str(e)}")

            # Process branch results if they exist
            if hasattr(search_results, 'branches') and search_results.branches and len(search_results.branches) > 0:
                branch_ids = [
                    branch.branchID for branch in search_results.branches[:3]]
                for branch_id in branch_ids:
                    try:
                        branch_details = await self.branch_manager.get_branch(branch_id)
                        if branch_details:
                            # Check if branch_details is a dictionary or an object
                            if isinstance(branch_details, dict):
                                detailed_results.append({
                                    "type": "branch",
                                    "name": branch_details.get("name", ""),
                                    "description": branch_details.get("description", ""),
                                    "career_prospects": branch_details.get("career_prospects", ""),
                                    "required_skills": branch_details.get("required_skills", []),
                                    "job_roles": branch_details.get("job_roles", [])
                                })
                            else:
                                # Assume it's a Pydantic model
                                detailed_results.append({
                                    "type": "branch",
                                    "name": getattr(branch_details, "name", ""),
                                    "description": getattr(branch_details, "description", ""),
                                    "career_prospects": getattr(branch_details, "career_prospects", ""),
                                    "required_skills": getattr(branch_details, "required_skills", []),
                                    "job_roles": getattr(branch_details, "job_roles", [])
                                })
                    except Exception as e:
                        print(f"Error processing branch {branch_id}: {str(e)}")

            # Process blog results - blogs are BlogSearchResponse objects
            if search_results.blogs and len(search_results.blogs) > 0:
                blog_ids = [blog.blogID for blog in search_results.blogs[:3]]
                from app.managers.blog import BlogManager
                blog_manager = BlogManager()
                for blog_id in blog_ids:
                    try:
                        blog = await blog_manager.get_blog(blog_id)
                        if blog:
                            # Handle blog data based on its type
                            blog_info = {
                                "type": "blog",
                                "heading": getattr(blog, "heading", "") if hasattr(blog, "heading") else blog.get("heading", ""),
                                "author": ""
                            }

                            # Get blog body and truncate if needed
                            if hasattr(blog, "body"):
                                body = blog.body
                                blog_info["body"] = body[:500] + \
                                    "..." if len(body) > 500 else body
                            elif isinstance(blog, dict) and "body" in blog:
                                body = blog["body"]
                                blog_info["body"] = body[:500] + \
                                    "..." if len(body) > 500 else body

                            # Add tags if available
                            if hasattr(blog, "tags"):
                                blog_info["tags"] = blog.tags
                            elif isinstance(blog, dict) and "tags" in blog:
                                blog_info["tags"] = blog["tags"]

                            # Add author if available
                            if hasattr(blog, "author"):
                                # Get the author's name
                                if hasattr(blog.author, "firstName") and hasattr(blog.author, "lastName"):
                                    blog_info["author"] = f"{blog.author.firstName} {blog.author.lastName}"

                            detailed_results.append(blog_info)
                    except Exception as e:
                        print(f"Error processing blog {blog_id}: {str(e)}")

            # Process video results - videos are VideoSearchResponse objects
            if search_results.videos and len(search_results.videos) > 0:
                video_ids = [
                    video.videoID for video in search_results.videos[:3]]
                from app.managers.video import VideoManager
                video_manager = VideoManager()
                for video_id in video_ids:
                    try:
                        video = await video_manager.get_video(video_id)
                        if video:
                            # Handle video data based on its type
                            video_info = {
                                "type": "video",
                                "title": getattr(video, "title", ""),
                                "description": getattr(video, "description", ""),
                                "tags": getattr(video, "tags", []),
                                "duration": getattr(video, "duration", "Unknown")
                            }

                            summary = getattr(video, "transcriptSummary", None)
                            translated = getattr(video, "translatedTranscript", None)

                            # Only expose transcript context when the transcript has been fully processed.
                            # Otherwise keep video grounding lightweight and title-based.
                            if summary and translated:
                                video_info["summary"] = summary
                                video_info["translatedTranscript"] = translated

                            if isinstance(video, dict):
                                dict_summary = video.get("transcriptSummary")
                                dict_translated = video.get("translatedTranscript")
                                if dict_summary and dict_translated:
                                    video_info["summary"] = dict_summary
                                    video_info["translatedTranscript"] = dict_translated

                            # If no processed transcript is available, keep only title-level context.
                            if "translatedTranscript" not in video_info:
                                video_info = {
                                    "type": "video",
                                    "title": video_info["title"],
                                }

                            detailed_results.append(video_info)
                    except Exception as e:
                        print(f"Error processing video {video_id}: {str(e)}")

            # Format the response for the AI
            response = {
                "query": search_query,
                "result_count": {
                    "colleges": len(search_results.colleges or []),
                    "experts": len(search_results.experts or []),
                    "branches": len(getattr(search_results, 'branches', []) or []),
                    "blogs": len(search_results.blogs or []),
                    "videos": len(search_results.videos or [])
                },
                "detailed_results": detailed_results
            }

            return json.dumps(response, indent=2)

        except Exception as e:
            print(f"Error in handle_system_request: {str(e)}")
            return f"Error processing search request: {str(e)}"

    async def get_user_details(self, user_id: str):
        """Helper method to get user details by ID"""
        db = get_database()
        try:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                user["id"] = str(user.pop("_id"))
                return user
            return None
        except Exception:
            return None

    async def create_chat_session(self, user_id: str):
        """Create a new chat session for a user"""
        db = get_database()

        # Create a new chat session
        chat_session = {
            "user_id": user_id,
            "created_at": datetime.now(),
            "history": [],
            "system_prompts": []
        }

        result = await db.chatbot_sessions.insert_one(chat_session)

        # After creating a session, send an initial system prompt with user details
        session_id = str(result.inserted_id)
        await self.send_initial_system_prompt(session_id, user_id)

        return session_id

    async def send_initial_system_prompt(self, session_id: str, user_id: str):
        """Send initial system prompt with comprehensive user details"""
        db = get_database()

        try:
            # Get user details
            user = await db.users.find_one({"_id": ObjectId(user_id)})

            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            # Get additional user data if available
            expert_data = None
            if user.get("isExpert", False):
                print("User is an expert, fetching expert data...")
                expert_data = await db.experts.find_one({"userId": user_id})
                print(f"Expert data: {expert_data}")

            # Get user's activities, followers, and following counts if available
            activity_count = 0
            following_count = len(user.get("following", []))
            followers_count = len(user.get("followers", []))

            # Get most recent activity if any
            recent_activity = None
            try:
                activities = await db.user_activities.find({"user_id": user_id}).sort("timestamp", -1).limit(5).to_list(5)
                activity_count = len(activities)
                if activities:
                    recent_activity = activities[0]
            except Exception:
                pass

            profile_context = self._build_user_profile_context(user, expert_data)

            # Construct a relevance-first system prompt with bounded user information
            system_prompt = f"""
            SYSTEM: You are CareerMind AI, a helpful career counselling assistant.

            USER PROFILE (use only when relevant to the current user query):
            {profile_context}

            PERSONALIZATION RULES:
            - Prioritize the user's exact message intent over profile assumptions.
            - Never reframe a first-person user query as if they are asking for someone else.
            - Use profile details only when they improve the answer quality.
            - Ask at most one focused clarifying question if required.
            - Do not ask generic multi-question questionnaires unless user asks for deep counselling flow.
            - Avoid overusing the user's name (max once in a response, optional).
            - Keep responses practical, concise, and decision-oriented.
            - If key profile fields are missing, explicitly state what is missing and why it matters.
            - Mention uncertainty instead of guessing.
            - Never include role labels like ASSISTANT: in output.

            DATA CAPABILITIES:
            Our platform contains rich information about:
            1. Colleges - Including rankings, placements, locations, specializations, etc.
            2. Experts - Career counselors and professionals with their specializations
            3. Branches/Courses - Details about various educational programs and career paths
            4. Blogs - Informative articles on career guidance
            5. Videos - Educational content for career development (including full transcripts)
            
            TOOL USAGE:
            - Use search_platform_entities for colleges/experts/branches/blogs/videos when factual grounding is needed.
            - Use search_platform_knowledge for deeper video/blog fact lookup.
            - Do not fabricate specific colleges, experts, blogs, videos, ranks, or cutoffs.
            - Prefer tool-grounded answers for platform-specific facts.
            - Never reveal internal tool/function names in user-facing responses.
            - If explaining capability, say "I can check platform data" instead of naming tools.

            Keep responses focused on student career guidance. Use markdown formatting.

            Today's date: {datetime.now().strftime("%B %d, %Y")}

            PLEASE immediately acknowledge the user when they start a new session and
            provide a friendly welcome message. For example:
            "Hello {user.get('firstName', '')}! I'm your AI career counselling assistant.
            How can I help with your career questions today?"
            Use SYSTEM REQUEST only when you genuinely need platform-specific factual lookup
            (for example: exact colleges, experts, branches, videos, or blogs from our database).
            Do not use SYSTEM REQUEST for general guidance questions.
            If you do search and get results, incorporate those results naturally in your response.

            If the user asks what college they can get into, point them to the College Predictor page. (/predictor)
            """

            # Send the system prompt
            await self.send_message(system_prompt, session_id, user_id, is_system=True)

            # Send a welcome message to appear in the chat
            welcome_message = f"Hello {user.get('firstName', '')}! I'm your AI career counselling assistant. How can I help with your career questions today?"
            response = await self.send_message(welcome_message, session_id, user_id, is_assistant=True)

            return response

        except Exception as e:
            print(f"Error sending initial system prompt: {str(e)}")
            # Don't raise the exception here, as this is an internal initialization step

    async def get_chat_history(self, session_id: str):
        """Get chat history for a session"""
        db = get_database()
        session = await db.chatbot_sessions.find_one({"_id": ObjectId(session_id)})

        if not session:
            raise HTTPException(
                status_code=404, detail="Chat session not found")

        return session["history"]

    async def send_message(self, message: str, session_id: str = None, user_id: str = None, is_system: bool = False, is_assistant: bool = False):
        """
        Process a message and return a non-streaming response
        """
        if not self.api_key:
            raise HTTPException(
                status_code=500, detail="GEMINI_API_KEY not configured")

        try:
            db = get_database()

            # Check if this is a system request from the AI
            if message.startswith("SYSTEM REQUEST:") and not is_system and not is_assistant:
                # Process the search request
                search_result = await self.handle_system_request(message)

                # Add this as a system message in the session
                if session_id:
                    await db.chatbot_sessions.update_one(
                        {"_id": ObjectId(session_id)},
                        {"$push": {"system_prompts": {
                            "content": f"Search Results for: {message}\n\n{search_result}",
                            "timestamp": datetime.now()
                        }}}
                    )

                # Return a message to acknowledge the search has been performed
                return {
                    "response": f"I've searched our database for information about {message.replace('SYSTEM REQUEST:', '').strip()}. Let me tell you what I found...",
                    "debug_history": [{"role": "system", "content": search_result}]
                }

            # For assistant-generated messages, just return the message without API calls
            if is_assistant:
                # Store the message in database if necessary
                if session_id and user_id:
                    await db.chatbot_sessions.update_one(
                        {"_id": ObjectId(session_id)},
                        {"$push": {"history": {
                            "role": "assistant",
                            "content": message,
                            "timestamp": datetime.now()
                        }}}
                    )
                return {
                    "response": message,
                    "debug_history": [{"role": "assistant", "content": message}]
                }

            # For system messages, just store them without making API calls
            if is_system:
                if session_id:
                    await db.chatbot_sessions.update_one(
                        {"_id": ObjectId(session_id)},
                        {"$push": {"system_prompts": {
                            "content": message,
                            "timestamp": datetime.now()
                        }}}
                    )
                return {
                    "response": "System prompt saved",
                    "debug_history": [{"role": "system", "content": message}]
                }

            # From here on, we're dealing with a genuine user message that needs AI response

            # Get session data first (do this only once)
            session = None
            if session_id:
                session = await db.chatbot_sessions.find_one({"_id": ObjectId(session_id)})

            # Add the current user message
            if not is_assistant:
                # Store user message in history
                if session_id and user_id:
                    await db.chatbot_sessions.update_one(
                        {"_id": ObjectId(session_id)},
                        {"$push": {"history": {
                            "role": "user",
                            "content": message,
                            "timestamp": datetime.now()
                        }}}
                    )

                model_candidates = await self._candidate_models_async()
                if not model_candidates:
                    raise HTTPException(status_code=500, detail="No compatible Gemini models available")

                model_name = model_candidates[0]
                system_instruction = self._build_system_instruction(session)
                chat_history = self._build_chat_history(session)

                model = genai.GenerativeModel(
                    model_name,
                    system_instruction=system_instruction,
                    tools=self._tool_declarations(),
                )
                chat = await asyncio.to_thread(model.start_chat, history=chat_history)

                response_text = ""
                pending_input = message

                for iteration in range(3):
                    response = await asyncio.to_thread(chat.send_message, pending_input)
                    tool_calls = self._extract_function_calls(response)

                    if not tool_calls:
                        response_text = self._extract_response_text(response)
                        break

                    tool_feedback_chunks: list[str] = []
                    for tool_call in tool_calls:
                        tool_name = tool_call.get("name", "")
                        raw_args = tool_call.get("args", {})
                        tool_args = raw_args if isinstance(raw_args, dict) else {}

                        if tool_name not in {"search_platform_knowledge", "search_platform_entities"}:
                            tool_feedback_chunks.append(
                                json.dumps(
                                    {
                                        "tool": tool_name,
                                        "error": "unsupported_tool",
                                    }
                                )
                            )
                            continue

                        query = str(tool_args.get("query", "")).strip()
                        if not query:
                            tool_feedback_chunks.append(
                                json.dumps(
                                    {
                                        "tool": tool_name,
                                        "error": "empty_query_argument",
                                    }
                                )
                            )
                            continue

                        if tool_name == "search_platform_knowledge":
                            content_types = tool_args.get("content_types")
                            top_k = tool_args.get("top_k", 3)
                            search_result = await self.search_platform_knowledge(query, content_types, top_k)
                        else:
                            top_k = tool_args.get("top_k", 3)
                            search_result = await self.search_platform_entities(query, top_k)
                        tool_feedback_chunks.append(
                            json.dumps(
                                {
                                    "tool": tool_name,
                                    "args": tool_args,
                                    "result": search_result,
                                },
                                default=str,
                            )
                        )

                        # Persist tool outputs in system context for memory continuity.
                        if session_id:
                            await db.chatbot_sessions.update_one(
                                {"_id": ObjectId(session_id)},
                                {
                                    "$push": {
                                        "system_prompts": {
                                            "content": (
                                                "TOOL OUTPUT: search_platform_knowledge\n"
                                                f"Args: {json.dumps(tool_args, default=str)}\n"
                                                f"Result: {json.dumps(search_result, default=str)}"
                                            ),
                                            "timestamp": datetime.now(),
                                        }
                                    }
                                },
                            )

                    if not tool_feedback_chunks:
                        response_text = self._extract_response_text(response)
                        break

                    pending_input = (
                        "Tool outputs are provided below as JSON. Use them to answer the user's original question.\n\n"
                        f"Original user question: {message}\n\n"
                        + "\n\n".join(tool_feedback_chunks)
                    )

                    if iteration == 2:
                        response_text = self._extract_response_text(response)

                # Clean up the response text to remove any role prefixes like "ASSISTANT:"
                response_text = re.sub(r'^ASSISTANT:\s*', '', response_text)
                response_text = re.sub(
                    r'\n+ASSISTANT:\s*', '\n', response_text)
                # Hide internal tool identifiers if the model leaks them.
                response_text = response_text.replace("search_platform_entities", "platform data")
                response_text = response_text.replace("search_platform_knowledge", "platform knowledge")

                if not response_text:
                    fallback_prompt = self._build_message_context(session, message)
                    response_text = await self._generate_text_with_fallback(fallback_prompt)

                # Store the assistant's response
                if session_id:
                    await db.chatbot_sessions.update_one(
                        {"_id": ObjectId(session_id)},
                        {"$push": {"history": {
                            "role": "assistant",
                            "content": response_text,
                            "timestamp": datetime.now()
                        }}}
                    )

                return {
                    "response": response_text,
                    "debug_history": [{"role": "assistant", "content": response_text}]
                }

        except gexc.ResourceExhausted as e:
            self._log_event("warning", "Gemini quota exceeded in send_message", error=str(e))
            raise HTTPException(
                status_code=429,
                detail="Gemini API quota exceeded for the selected model. Please wait for quota reset, switch to another model, or use a billed API key/project.",
            )
        except Exception as e:
            print(f"Error in send_message: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def enhance_content(self, content: str):
        """
        Enhance content using AI without saving to a session
        Specifically designed for one-off content enhancement
        """
        if not self.api_key:
            self._log_event("warning", "GEMINI_API_KEY not configured; returning original content")
            return content.strip()

        try:
            candidate_models = await self._candidate_models_async()
            if not candidate_models:
                self._log_event("error", "No Gemini model supports generateContent; returning original content")
                return content.strip()

            model_name = candidate_models[0]

            enhancement_prompt = (
                "You are a professional content enhancer. Your task is to rewrite content to make it more professional, "
                "well-structured, and engaging using proper markdown formatting. Use headings, bullet points, emphasis, and other markdown "
                "elements to improve readability. Maintain the core message but enhance the language, clarity, and overall presentation to "
                "a LinkedIn-professional level. Do not add any greetings or explanations - ONLY return the enhanced content."
            )

            prompt = f"{enhancement_prompt}\n\nCONTENT:\n{content}"
            model = genai.GenerativeModel(model_name)

            last_error: Exception | None = None
            for attempt in range(2):
                try:
                    response = await asyncio.to_thread(
                        model.generate_content,
                        prompt,
                        request_options={"timeout": 20},
                    )
                    enhanced_content = (response.text or "").strip()
                    enhanced_content = re.sub(
                        r'^(Here is the enhanced content:|Enhanced content:|Here\'s the enhanced version:)\s*',
                        "",
                        enhanced_content,
                        flags=re.IGNORECASE,
                    ).strip()
                    return enhanced_content or content.strip()
                except (gexc.ResourceExhausted, gexc.DeadlineExceeded, gexc.ServiceUnavailable, gexc.InternalServerError) as e:
                    last_error = e
                    self._log_event(
                        "warning",
                        "Transient Gemini error; retrying",
                        model=model_name,
                        attempt=attempt + 1,
                        error=str(e),
                    )
                    continue
                except Exception as e:
                    last_error = e
                    self._log_event(
                        "error",
                        "Gemini enhance_content failed",
                        model=model_name,
                        error=str(e),
                    )
                    break

            if last_error:
                raise last_error
            return content.strip()

        except Exception as e:
            print(f"Error in enhance_content: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
