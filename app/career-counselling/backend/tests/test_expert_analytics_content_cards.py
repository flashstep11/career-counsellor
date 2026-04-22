import asyncio
import datetime
from types import SimpleNamespace

from bson import ObjectId

from app.managers.expert_analytics import ExpertAnalyticsManager


class _FakeAggregateResult:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, length=1):
        return self.docs[:length]


class _FakeCollection:
    def __init__(self, docs):
        self.docs = docs

    async def find_one(self, query):
        for doc in self.docs:
            if "_id" in query and str(doc.get("_id")) == str(query["_id"]):
                return doc
            if all(doc.get(k) == v for k, v in query.items() if not isinstance(v, dict)):
                return doc
        return None

    async def count_documents(self, query):
        if "$or" in query:
            count = 0
            for doc in self.docs:
                for cond in query["$or"]:
                    if all(doc.get(k) == v for k, v in cond.items()):
                        count += 1
                        break
            return count

        if "status" in query and isinstance(query["status"], dict) and "$in" in query["status"]:
            allowed = set(query["status"]["$in"])
            return len([d for d in self.docs if d.get("expertId") == query.get("expertId") and d.get("status") in allowed])

        if "startTime" in query and isinstance(query["startTime"], dict) and "$gt" in query["startTime"]:
            cutoff = query["startTime"]["$gt"]
            return len([d for d in self.docs if d.get("expertId") == query.get("expertId") and d.get("status") == query.get("status") and d.get("startTime") > cutoff])

        return len([d for d in self.docs if all(d.get(k) == v for k, v in query.items())])

    def aggregate(self, pipeline):
        match = pipeline[0].get("$match", {})
        target = []
        for doc in self.docs:
            include = True
            if "$or" in match:
                include = False
                for cond in match["$or"]:
                    if all(doc.get(k) == v for k, v in cond.items()):
                        include = True
                        break
                if not include:
                    continue
            for key, value in match.items():
                if key == "$or":
                    continue
                if isinstance(value, dict) and "$in" in value:
                    if doc.get(key) not in value["$in"]:
                        include = False
                        break
                elif doc.get(key) != value:
                    include = False
                    break
            if include:
                target.append(doc)

        group = pipeline[1].get("$group", {})
        if "totalViews" in group:
            return _FakeAggregateResult([{"_id": None, "totalViews": sum(int(d.get("views", 0)) for d in target)}])
        if group.get("_id") == "$rating":
            buckets = {}
            for d in target:
                buckets[d["rating"]] = buckets.get(d["rating"], 0) + 1
            return _FakeAggregateResult([{"_id": rating, "count": count} for rating, count in buckets.items()])

        return _FakeAggregateResult([])

    def find(self, query):
        rows = [d for d in self.docs if all(d.get(k) == v for k, v in query.items())]

        class _Cursor:
            def __init__(self, docs):
                self.docs = docs

            def __aiter__(self):
                self._iter = iter(self.docs)
                return self

            async def __anext__(self):
                try:
                    return next(self._iter)
                except StopIteration:
                    raise StopAsyncIteration

        return _Cursor(rows)


def test_analytics_cards_reflect_content_and_views():
    expert_id = str(ObjectId())
    now = datetime.datetime.now()

    manager = ExpertAnalyticsManager()
    manager.experts_collection = _FakeCollection([
        {"_id": ObjectId(expert_id), "userId": "user-1", "profileViews": 11, "rating": 4.5}
    ])
    manager.videos_collection = _FakeCollection([
        {"_id": ObjectId(), "userId": "user-1", "views": 30},
        {"_id": ObjectId(), "userId": "user-1", "views": 20},
    ])
    manager.blogs_collection = _FakeCollection([
        {"_id": ObjectId(), "userID": "user-1", "views": 7},
        {"_id": ObjectId(), "userId": "user-1", "views": 3},
    ])
    manager.posts_collection = _FakeCollection([
        {"_id": ObjectId(), "expertId": expert_id, "views": 9},
    ])
    manager.users_collection = _FakeCollection([
        {"_id": ObjectId(), "following": "user-1"},
        {"_id": ObjectId(), "following": "user-1"},
    ])
    manager.ratings_collection = _FakeCollection([
        {"_id": ObjectId(), "expertId": expert_id, "rating": 5},
        {"_id": ObjectId(), "expertId": expert_id, "rating": 4},
    ])
    manager.meetings_collection = _FakeCollection([
        {
            "_id": ObjectId(),
            "expertId": expert_id,
            "status": "completed",
            "isPaid": True,
            "amount": 500,
            "completedAt": now,
            "startTime": now - datetime.timedelta(days=1),
        },
        {
            "_id": ObjectId(),
            "expertId": expert_id,
            "status": "scheduled",
            "isPaid": False,
            "amount": 0,
            "startTime": now + datetime.timedelta(days=1),
        },
    ])

    analytics = asyncio.run(manager.get_expert_analytics(expert_id))

    assert analytics is not None
    assert analytics["content"]["videosCount"] == 2
    assert analytics["content"]["blogsCount"] == 2
    assert analytics["content"]["postsCount"] == 1

    assert analytics["views"]["videoViews"] == 50
    assert analytics["views"]["blogReads"] == 10
    assert analytics["views"]["postViews"] == 9
    assert analytics["views"]["profileViews"] == 11
    assert analytics["views"]["totalEngagement"] == 80

    assert analytics["performance"]["followersCount"] == 2
    assert analytics["performance"]["meetings"]["completed"] == 1
    assert analytics["performance"]["meetings"]["upcoming"] == 1
