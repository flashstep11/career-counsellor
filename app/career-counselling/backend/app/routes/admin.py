from fastapi import APIRouter, Depends, HTTPException, Body, Query, Path
from typing import List, Optional
from pydantic import BaseModel
from app.core.auth_utils import require_admin
from app.managers.user import UserManager
from app.managers.blog import BlogManager
from app.managers.expert import ExpertManager
from app.managers.video import VideoManager
from app.managers.video_transcript_processing import VideoTranscriptProcessingManager
from app.managers.expert_application import ExpertApplicationManager
from app.managers.meeting import MeetingManager
from app.managers.community import CommunityManager
from app.schemas.admin import (
    UsersListResponse,
    ExpertsListResponse,
    BlogsListResponse,
    VideosListResponse,
    ExpertApprovalRequest,
    DashboardStats
)
from app.models.expert_application import ExpertApplicationResponse
from bson import ObjectId
from datetime import datetime
from app.core.time_utils import now_app_naive
import secrets
import bcrypt

router = APIRouter()
user_manager = UserManager()
blog_manager = BlogManager()
expert_manager = ExpertManager()
video_manager = VideoManager()
video_transcript_processing_manager = VideoTranscriptProcessingManager()
expert_application_manager = ExpertApplicationManager()
meeting_manager = MeetingManager()
community_manager = CommunityManager()


@router.get("/meetings/active")
async def get_active_meetings(user_data: dict = Depends(require_admin)):
    """List meetings that are currently in progress.

    A meeting is considered active if startTime <= now <= endTime and status != cancelled.
    Returns lightweight records enriched with student/expert names.
    """
    now = now_app_naive()

    meetings = await meeting_manager.collection.find(
        {
            "startTime": {"$lte": now},
            "endTime": {"$gte": now},
            "status": {"$ne": "cancelled"},
        }
    ).to_list(200)

    if not meetings:
        return {"meetings": []}

    user_ids = list({m.get("userId") for m in meetings if m.get("userId")})
    expert_ids = list({m.get("expertId") for m in meetings if m.get("expertId")})

    users_by_id = {}
    if user_ids:
        users = await user_manager.db.users.find({"_id": {"$in": [ObjectId(uid) for uid in user_ids]}}).to_list(None)
        users_by_id = {str(u["_id"]): u for u in users}

    experts_by_id = {}
    if expert_ids:
        experts = await user_manager.db.experts.find({"_id": {"$in": [ObjectId(eid) for eid in expert_ids]}}).to_list(None)
        experts_by_id = {str(e["_id"]): e for e in experts}

    results = []
    for m in meetings:
        user_doc = users_by_id.get(str(m.get("userId")), {})
        expert_doc = experts_by_id.get(str(m.get("expertId")), {})

        results.append(
            {
                "id": str(m.get("_id")),
                "status": m.get("status"),
                "startTime": m.get("startTime"),
                "endTime": m.get("endTime"),
                "userId": str(m.get("userId")),
                "expertId": str(m.get("expertId")),
                "userName": (f"{user_doc.get('firstName', '')} {user_doc.get('lastName', '')}").strip() or None,
                "userEmail": user_doc.get("email"),
                "expertName": (f"{expert_doc.get('firstName', '')} {expert_doc.get('lastName', '')}").strip() or None,
                "expertEmail": expert_doc.get("email"),
            }
        )

    results.sort(key=lambda x: x.get("startTime") or datetime.min)
    return {"meetings": results}


@router.get("/meetings/upcoming")
async def get_upcoming_meetings(user_data: dict = Depends(require_admin)):
    """List meetings that are scheduled for the future.

    A meeting is considered upcoming if startTime >= now and status is scheduled.
    Returns lightweight records enriched with student/expert names.
    """
    now = now_app_naive()

    # Use strict greater-than so meetings that start "now" don't appear in both
    # active and upcoming buckets.
    meetings = await meeting_manager.collection.find(
        {
            "startTime": {"$gt": now},
            "status": {"$in": ["scheduled", "SCHEDULED"]},
        }
    ).to_list(200)

    if not meetings:
        return {"meetings": []}

    user_ids = list({m.get("userId") for m in meetings if m.get("userId")})
    expert_ids = list({m.get("expertId") for m in meetings if m.get("expertId")})

    users_by_id = {}
    if user_ids:
        users = await user_manager.db.users.find({"_id": {"$in": [ObjectId(uid) for uid in user_ids]}}).to_list(None)
        users_by_id = {str(u["_id"]): u for u in users}

    experts_by_id = {}
    if expert_ids:
        experts = await user_manager.db.experts.find({"_id": {"$in": [ObjectId(eid) for eid in expert_ids]}}).to_list(None)
        experts_by_id = {str(e["_id"]): e for e in experts}

    results = []
    for m in meetings:
        user_doc = users_by_id.get(str(m.get("userId")), {})
        expert_doc = experts_by_id.get(str(m.get("expertId")), {})

        results.append(
            {
                "id": str(m.get("_id")),
                "status": m.get("status"),
                "startTime": m.get("startTime"),
                "endTime": m.get("endTime"),
                "userId": str(m.get("userId")),
                "expertId": str(m.get("expertId")),
                "userName": (f"{user_doc.get('firstName', '')} {user_doc.get('lastName', '')}").strip() or None,
                "userEmail": user_doc.get("email"),
                "expertName": (f"{expert_doc.get('firstName', '')} {expert_doc.get('lastName', '')}").strip() or None,
                "expertEmail": expert_doc.get("email"),
            }
        )

    results.sort(key=lambda x: x.get("startTime") or datetime.min)
    return {"meetings": results}


@router.post("/initialize-wallets")
async def initialize_wallets(user_data: dict = Depends(require_admin)):
    """
    Initialize wallets for all existing users who don't have one.
    Only accessible by admins.
    """
    modified_count = await user_manager.initialize_wallet_for_existing_users()
    return {"message": f"Initialized wallets for {modified_count} users"}


@router.get("/dashboard", response_model=DashboardStats)
async def admin_dashboard(user_data: dict = Depends(require_admin)):
    """
    Get admin dashboard statistics data.
    Only accessible by admins.
    """
    stats = await user_manager.get_dashboard_stats()
    return stats


@router.get("/users", response_model=UsersListResponse)
async def get_users(
    search: Optional[str] = Query(None),
    user_data: dict = Depends(require_admin)
):
    """
    Get all users with optional search filtering.
    Only accessible by admins.
    """
    users = await user_manager.get_all_users(search)
    return {"users": users}


class AdminUserCreateRequest(BaseModel):
    firstName: str
    lastName: str
    email: str
    role: str = "user"  # user | expert | admin
    status: str = "active"  # active | inactive | suspended
    verified: bool = False
    # Expert-related fields (stored on the user doc in this project)
    specialization: Optional[str] = None
    bio: Optional[str] = None
    expertStatus: Optional[str] = None  # pending | approved | rejected


class AdminUserUpdateRequest(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None  # user | expert | admin
    status: Optional[str] = None  # active | inactive | suspended
    verified: Optional[bool] = None
    credentials: Optional[List[str]] = None
    # Expert-related fields (stored on the user doc)
    specialization: Optional[str] = None
    bio: Optional[str] = None
    expertStatus: Optional[str] = None  # pending | approved | rejected
    rating: Optional[float] = None
    studentsGuided: Optional[int] = None


def _normalize_role(role: str) -> str:
    r = (role or "user").strip().lower()
    if r not in {"user", "expert", "admin"}:
        raise HTTPException(status_code=400, detail="Invalid role")
    return r


def _normalize_status(status: str) -> str:
    s = (status or "active").strip().lower()
    if s not in {"active", "inactive", "suspended"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    return s


def _apply_verified(credentials: List[str], verified: bool) -> List[str]:
    current = list(credentials or [])
    has_verified = any(c.lower() == "verified" for c in current)
    if verified and not has_verified:
        current.append("Verified")
    if not verified and has_verified:
        current = [c for c in current if c.lower() != "verified"]
    # De-dupe while preserving order
    seen = set()
    deduped = []
    for c in current:
        key = (c or "").strip()
        if not key:
            continue
        lk = key.lower()
        if lk in seen:
            continue
        seen.add(lk)
        deduped.append(key)
    return deduped


@router.post("/users", response_model=dict)
async def admin_create_user(
    body: AdminUserCreateRequest,
    user_data: dict = Depends(require_admin),
):
    """Create a user from the admin dashboard.

    This creates an account without OTP signup. A temporary password is generated
    and stored as `hashedPassword`.
    """
    existing = await user_manager.db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    role = _normalize_role(body.role)
    status = _normalize_status(body.status)

    is_admin = role == "admin"
    is_expert = role == "expert"

    temp_password = secrets.token_urlsafe(12)
    hashed_password = bcrypt.hashpw(temp_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    now = datetime.utcnow()
    credentials: List[str] = []
    credentials = _apply_verified(credentials, bool(body.verified))

    user_doc = {
        "email": body.email,
        "hashedPassword": hashed_password,
        "firstName": body.firstName,
        "lastName": body.lastName,
        "middleName": "",
        "gender": "",
        "category": "",
        "mobileNo": "",
        "home_state": "",
        "type": "free",
        "wallet": 200,
        "isAdmin": is_admin,
        "isExpert": is_expert,
        "status": status,
        "credentials": credentials,
        "createdAt": now,
        "updatedAt": now,
    }

    if is_expert:
        if body.specialization is not None:
            user_doc["specialization"] = body.specialization
        if body.bio is not None:
            user_doc["bio"] = body.bio
        user_doc["expertStatus"] = (body.expertStatus or "approved").strip().lower()

    result = await user_manager.db.users.insert_one(user_doc)
    created = await user_manager.db.users.find_one({"_id": result.inserted_id})
    if not created:
        raise HTTPException(status_code=500, detail="Failed to create user")

    created["_id"] = str(created["_id"])
    created.pop("hashedPassword", None)

    return {
        "user": created,
        "temporaryPassword": temp_password,
        "message": "User created",
    }


@router.put("/users/{user_id}", response_model=dict)
async def admin_update_user(
    user_id: str = Path(...),
    body: AdminUserUpdateRequest = Body(...),
    user_data: dict = Depends(require_admin),
):
    """Update user fields that the admin dashboard can edit (role/status/verification/etc)."""
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")

    existing = await user_manager.db.users.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    update: dict = {"updatedAt": datetime.utcnow()}

    if body.firstName is not None:
        update["firstName"] = body.firstName
    if body.lastName is not None:
        update["lastName"] = body.lastName
    if body.email is not None:
        other = await user_manager.db.users.find_one({"email": body.email, "_id": {"$ne": oid}})
        if other:
            raise HTTPException(status_code=400, detail="Another user already has this email")
        update["email"] = body.email

    if body.status is not None:
        update["status"] = _normalize_status(body.status)

    if body.role is not None:
        role = _normalize_role(body.role)
        update["isAdmin"] = role == "admin"
        update["isExpert"] = role == "expert"
        if role != "expert":
            update["expertStatus"] = None
        else:
            update["expertStatus"] = (body.expertStatus or existing.get("expertStatus") or "approved")

    if body.expertStatus is not None:
        update["expertStatus"] = body.expertStatus.strip().lower()

    current_credentials = list(existing.get("credentials", []) or [])
    if body.credentials is not None:
        current_credentials = list(body.credentials or [])
    if body.verified is not None:
        current_credentials = _apply_verified(current_credentials, bool(body.verified))
    update["credentials"] = current_credentials

    if body.specialization is not None:
        update["specialization"] = body.specialization
    if body.bio is not None:
        update["bio"] = body.bio
    if body.rating is not None:
        update["rating"] = body.rating
    if body.studentsGuided is not None:
        update["studentsGuided"] = body.studentsGuided

    await user_manager.db.users.update_one({"_id": oid}, {"$set": update})
    updated = await user_manager.db.users.find_one({"_id": oid})
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update user")
    updated["_id"] = str(updated["_id"])
    updated.pop("hashedPassword", None)
    return {"user": updated, "message": "User updated"}


@router.delete("/users/{user_id}", response_model=dict)
async def admin_delete_user(
    user_id: str = Path(...),
    user_data: dict = Depends(require_admin),
):
    """Delete a user by id."""
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")

    res = await user_manager.db.users.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "message": "User deleted"}


@router.get("/users/{user_id}/network")
async def get_user_network(
    user_id: str = Path(...),
    user_data: dict = Depends(require_admin),
):
    """Return followers + accepted connections for a specific user.

    - Followers are sourced from the `follows` collection (status=accepted).
    - Connections are sourced from the `connections` collection (status=accepted).
    """

    try:
        user_oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")

    user_doc = await user_manager.db.users.find_one({"_id": user_oid})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    # Followers (directed follows)
    follower_ids: List[str] = []
    async for doc in user_manager.db.follows.find(
        {"followedId": user_id, "status": "accepted"},
        {"followerId": 1},
    ):
        fid = doc.get("followerId")
        if isinstance(fid, str) and fid:
            follower_ids.append(fid)

    # Following (directed follows)
    following_ids: List[str] = []
    async for doc in user_manager.db.follows.find(
        {"followerId": user_id, "status": "accepted"},
        {"followedId": 1},
    ):
        fid = doc.get("followedId")
        if isinstance(fid, str) and fid:
            following_ids.append(fid)

    # Accepted connections (undirected)
    other_ids_set = set()
    async for doc in user_manager.db.connections.find(
        {
            "status": "accepted",
            "$or": [{"requester_id": user_id}, {"target_id": user_id}],
        },
        {"requester_id": 1, "target_id": 1},
    ):
        requester_id = doc.get("requester_id")
        target_id = doc.get("target_id")
        if requester_id == user_id and isinstance(target_id, str):
            other_ids_set.add(target_id)
        elif target_id == user_id and isinstance(requester_id, str):
            other_ids_set.add(requester_id)
    connection_other_ids: List[str] = list(other_ids_set)

    # Resolve IDs -> user docs
    def _to_object_ids(ids: List[str]) -> List[ObjectId]:
        out: List[ObjectId] = []
        for _id in ids:
            try:
                out.append(ObjectId(_id))
            except Exception:
                continue
        return out

    ids_to_resolve = list({*follower_ids, *following_ids, *connection_other_ids})
    resolved_users_by_id = {}
    if ids_to_resolve:
        resolved_users = await user_manager.db.users.find(
            {"_id": {"$in": _to_object_ids(ids_to_resolve)}},
            {"firstName": 1, "lastName": 1, "email": 1, "isAdmin": 1, "isExpert": 1},
        ).to_list(None)
        resolved_users_by_id = {str(u.get("_id")): u for u in resolved_users}

    def _pack_user(uid: str):
        u = resolved_users_by_id.get(uid)
        if not u:
            return None
        return {
            "id": str(u.get("_id")),
            "firstName": u.get("firstName") or "",
            "lastName": u.get("lastName") or "",
            "email": u.get("email"),
            "isAdmin": bool(u.get("isAdmin")),
            "isExpert": bool(u.get("isExpert")),
        }

    followers = [x for x in (_pack_user(uid) for uid in follower_ids) if x]
    following = [x for x in (_pack_user(uid) for uid in following_ids) if x]
    connections = [x for x in (_pack_user(uid) for uid in connection_other_ids) if x]

    followers.sort(key=lambda x: ((x.get("firstName") or "").lower(), (x.get("lastName") or "").lower()))
    following.sort(key=lambda x: ((x.get("firstName") or "").lower(), (x.get("lastName") or "").lower()))
    connections.sort(key=lambda x: ((x.get("firstName") or "").lower(), (x.get("lastName") or "").lower()))

    return {
        "userId": user_id,
        "followers": followers,
        "following": following,
        "connections": connections,
        "counts": {"followers": len(followers), "following": len(following), "connections": len(connections)},
    }


# ── Communities (admin) ───────────────────────────────────────────────────


@router.get("/communities")
async def admin_list_communities(user_data: dict = Depends(require_admin)):
    """List all communities with moderators for admin dashboard."""
    docs = await community_manager.collection.find().sort("updatedAt", -1).to_list(500)
    if not docs:
        return {"communities": []}

    # Collect all member userIds so we can enrich names/emails.
    member_ids = set()
    for d in docs:
        for mid in d.get("members", []) or []:
            member_ids.add(mid)

    users_by_id = {}
    if member_ids:
        users = await user_manager.db.users.find({"_id": {"$in": [ObjectId(uid) for uid in member_ids]}}).to_list(None)
        users_by_id = {str(u["_id"]): u for u in users}

    communities = []
    for d in docs:
        community_id = str(d.get("_id"))
        roles = d.get("community_roles", {}) or {}
        members = d.get("members", []) or []

        moderator_ids = [uid for uid, role in roles.items() if role == "moderator" and uid in members]
        moderators = []
        for mid in moderator_ids:
            u = users_by_id.get(str(mid), {})
            moderators.append(
                {
                    "id": str(mid),
                    "firstName": u.get("firstName"),
                    "lastName": u.get("lastName"),
                    "email": u.get("email"),
                }
            )

        communities.append(
            {
                "communityId": community_id,
                "name": d.get("name"),
                "displayName": d.get("displayName"),
                "description": d.get("description"),
                "createdBy": d.get("createdBy"),
                "memberCount": d.get("memberCount", 0),
                "postCount": d.get("postCount", 0),
                "updatedAt": d.get("updatedAt"),
                "moderators": moderators,
            }
        )

    return {"communities": communities}


@router.get("/communities/{community_id}/members")
async def admin_get_community_members(
    community_id: str,
    user_data: dict = Depends(require_admin),
):
    """Get members of a community along with their role (member/moderator)."""
    try:
        doc = await community_manager.collection.find_one({"_id": ObjectId(community_id)})
    except Exception:
        doc = await community_manager.collection.find_one({"name": community_id})

    if not doc:
        raise HTTPException(status_code=404, detail="Community not found")

    members = doc.get("members", []) or []
    roles = doc.get("community_roles", {}) or {}

    users_by_id = {}
    if members:
        users = await user_manager.db.users.find({"_id": {"$in": [ObjectId(uid) for uid in members]}}).to_list(None)
        users_by_id = {str(u["_id"]): u for u in users}

    result = []
    for mid in members:
        u = users_by_id.get(str(mid), {})
        result.append(
            {
                "id": str(mid),
                "firstName": u.get("firstName"),
                "lastName": u.get("lastName"),
                "email": u.get("email"),
                "role": "moderator" if roles.get(mid) == "moderator" else "member",
            }
        )

    result.sort(key=lambda x: (x.get("role") != "moderator", (x.get("firstName") or ""), (x.get("lastName") or "")))
    return {"communityId": str(doc.get("_id")), "members": result}


class CommunityRoleUpdate(BaseModel):
    role: str  # "moderator" | "member"


@router.put("/communities/{community_id}/members/{member_id}/role")
async def admin_set_community_member_role(
    community_id: str,
    member_id: str,
    payload: CommunityRoleUpdate,
    user_data: dict = Depends(require_admin),
):
    """Admin can promote/demote community members."""
    # Resolve community
    try:
        comm_doc = await community_manager.collection.find_one({"_id": ObjectId(community_id)})
    except Exception:
        comm_doc = await community_manager.collection.find_one({"name": community_id})

    if not comm_doc:
        raise HTTPException(status_code=404, detail="Community not found")

    comm_id = str(comm_doc.get("_id"))
    members = comm_doc.get("members", []) or []
    if member_id not in members:
        raise HTTPException(status_code=400, detail="User is not a member of this community")

    role = (payload.role or "").strip().lower()
    if role not in ["moderator", "member"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    if role == "moderator":
        res = await community_manager.collection.update_one(
            {"_id": ObjectId(comm_id)},
            {"$set": {f"community_roles.{member_id}": "moderator", "updatedAt": datetime.utcnow()}},
        )
    else:
        res = await community_manager.collection.update_one(
            {"_id": ObjectId(comm_id)},
            {"$unset": {f"community_roles.{member_id}": ""}, "$set": {"updatedAt": datetime.utcnow()}},
        )

    if res.modified_count <= 0:
        raise HTTPException(status_code=400, detail="No changes applied")

    return {"message": "Role updated"}


@router.post("/communities/{community_id}/moderators/me")
async def admin_become_moderator(
    community_id: str,
    user_data: dict = Depends(require_admin),
):
    """Admin can make themselves a moderator (auto-join if needed)."""
    admin_id = user_data.get("id")
    if not admin_id:
        raise HTTPException(status_code=400, detail="Cannot identify admin user")

    # Resolve community
    try:
        comm_doc = await community_manager.collection.find_one({"_id": ObjectId(community_id)})
    except Exception:
        comm_doc = await community_manager.collection.find_one({"name": community_id})

    if not comm_doc:
        raise HTTPException(status_code=404, detail="Community not found")

    comm_id = str(comm_doc.get("_id"))

    # Ensure membership, then set moderator
    await community_manager.collection.update_one(
        {"_id": ObjectId(comm_id)},
        {
            "$addToSet": {"members": admin_id},
            "$set": {f"community_roles.{admin_id}": "moderator", "updatedAt": datetime.utcnow()},
        },
    )

    return {"message": "You are now a moderator"}


@router.get("/experts", response_model=ExpertsListResponse)
async def get_experts(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(
        None, enum=["pending", "approved", "rejected"]),
    user_data: dict = Depends(require_admin)
):
    """
    Get all experts with optional search filtering and status filtering.
    Only accessible by admins.
    """
    experts = await expert_manager.get_all_experts(search, status)
    return {"experts": experts}


@router.put("/experts/{expert_id}/approve", response_model=dict)
async def approve_expert(
    expert_id: str = Path(...),
    approval_data: ExpertApprovalRequest = Body(...),
    user_data: dict = Depends(require_admin)
):
    """
    Approve or reject an expert.
    Only accessible by admins.
    """
    success = await expert_manager.update_expert_approval(expert_id, approval_data.status)
    if not success:
        raise HTTPException(status_code=404, detail="Expert not found")

    return {"success": True, "message": f"Expert {approval_data.status}"}


@router.post("/make-expert/{user_id}", response_model=dict)
async def make_user_expert(
    user_id: str = Path(...),
    user_data: dict = Depends(require_admin)
):
    """
    Convert a regular user into an expert (pending approval).
    Only accessible by admins.
    """
    success = await expert_manager.make_user_expert(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")

    return {"success": True, "message": "User marked as expert (pending approval)"}


@router.get("/blogs", response_model=BlogsListResponse)
async def get_blogs(
    search: Optional[str] = Query(None),
    user_data: dict = Depends(require_admin)
):
    """
    Get all blogs with optional search filtering.
    Only accessible by admins.
    """
    # Use get_blogs_with_filters instead of get_all_blogs
    blogs = await blog_manager.get_blogs_with_filters(
        skip=0,
        limit=100,  # Use a reasonably large limit for admin view
        expert_id=None,
        ref_type=None,
        type_id=None,
        sort_by="recent"
    )
    return {"blogs": blogs}


@router.put("/blogs/{blog_id}", response_model=dict)
async def update_blog(
    blog_id: str = Path(...),
    blog_data: dict = Body(...),
    user_data: dict = Depends(require_admin)
):
    """
    Update a blog.
    Only accessible by admins.
    """
    success = await blog_manager.update_blog_admin(blog_id, blog_data)
    if not success:
        raise HTTPException(status_code=404, detail="Blog not found")
    return {"success": True, "message": "Blog updated successfully"}


@router.delete("/blogs/{blog_id}", response_model=dict)
async def delete_blog(
    blog_id: str = Path(...),
    user_data: dict = Depends(require_admin)
):
    """
    Delete a blog.
    Only accessible by admins.
    """
    success = await blog_manager.delete_blog(blog_id)
    if not success:
        raise HTTPException(status_code=404, detail="Blog not found")

    return {"success": True, "message": "Blog deleted successfully"}


@router.get("/videos", response_model=VideosListResponse)
async def get_videos(
    search: Optional[str] = Query(None),
    user_data: dict = Depends(require_admin)
):
    """
    Get all videos with optional search filtering.
    Only accessible by admins.
    """
    videos = await video_manager.get_all_videos(search)
    return {"videos": videos}


@router.get("/recent-activities", response_model=dict)
async def get_recent_activities(
    limit: int = Query(5),
    user_data: dict = Depends(require_admin)
):
    """
    Get recent activities on the platform.
    Only accessible by admins.
    """
    activities = await user_manager.get_recent_activities(limit)
    return {"activities": activities}


@router.get("/expert-applications", response_model=List[ExpertApplicationResponse])
async def get_expert_applications(
    status: Optional[str] = Query(
        None, enum=["pending", "approved", "rejected"]),
    user_data: dict = Depends(require_admin)
):
    """
    Get all expert applications with optional status filtering.
    Only accessible by admins.
    """
    applications = await expert_application_manager.get_all_applications(status)
    return applications


@router.get("/admin/videos")
async def get_admin_videos(user_data: dict = Depends(require_admin)):
    """
    Get all videos for admin dashboard
    """
    try:
        videos = await video_manager.get_admin_videos()
        return {"videos": videos}
    except Exception as e:
        print(f"Error fetching admin videos: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch videos: {str(e)}"
        )


@router.get("/admin/users")
async def get_admin_users(
    search: Optional[str] = Query(None, description="Search term for user name or email"),
    user_data: dict = Depends(require_admin)
):
    """
    Get all users for admin dashboard
    """
    try:
        users = await user_manager.get_all_users(search)
        return {"users": users}
    except Exception as e:
        print(f"Error fetching admin users: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch users: {str(e)}"
        )


@router.get("/admin/experts")
async def get_admin_experts(user_data: dict = Depends(require_admin)):
    """
    Get all experts for admin dashboard
    """
    try:
        experts = await expert_manager.get_all_experts()
        return {"experts": experts}
    except Exception as e:
        print(f"Error fetching admin experts: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch experts: {str(e)}"
        )


@router.get("/admin/blogs")
async def get_admin_blogs(user_data: dict = Depends(require_admin)):
    """
    Get all blogs for admin dashboard
    """
    try:
        blogs = await blog_manager.get_all_blogs()
        return {"blogs": blogs}
    except Exception as e:
        print(f"Error fetching admin blogs: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch blogs: {str(e)}"
        )


@router.get("/admin/recent-activities")
async def get_admin_activities(
    limit: int = Query(10, ge=1, le=100, description="Number of activities to return"),
    user_data: dict = Depends(require_admin)
):
    """
    Get recent activities for admin dashboard
    """
    try:
        activities = await user_manager.get_recent_activities(limit)
        return {"activities": activities}
    except Exception as e:
        print(f"Error fetching admin activities: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch activities: {str(e)}"
        )


@router.post("/video-transcripts/process")
async def trigger_video_transcript_processing(
    limit: int = Query(50, ge=1, le=500, description="Maximum number of missing videos to enqueue"),
    user_data: dict = Depends(require_admin),
):
    """
    Manually enqueue missing video transcript jobs and kick the worker once.
    """
    try:
        run_stats = await video_transcript_processing_manager.run_once(
            enqueue_missing=True,
            limit=limit,
        )
        diagnostics = await video_transcript_processing_manager.get_diagnostics()
        return {
            "success": True,
            "message": "Video transcript processing triggered",
            **run_stats,
            **diagnostics,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to trigger transcript processing: {str(e)}"
        )


@router.get("/video-transcripts/status")
async def get_video_transcript_processing_status(
    user_data: dict = Depends(require_admin),
):
    """
    Get transcript processing queue counts for the admin dashboard.
    """
    try:
        return await video_transcript_processing_manager.get_diagnostics()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch transcript processing status: {str(e)}"
        )
