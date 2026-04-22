import asyncio
from types import SimpleNamespace

from bson import ObjectId

from app.managers.rating import RatingManager


class _FakeAggregateResult:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, length=1):
        return self.docs[:length]


class _FakeRatingsCollection:
    def __init__(self):
        self.docs = []

    async def find_one(self, query):
        if "_id" in query:
            target = str(query["_id"])
            for doc in self.docs:
                if str(doc["_id"]) == target:
                    return doc
            return None

        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return doc
        return None

    async def insert_one(self, doc):
        inserted_id = ObjectId()
        stored = {**doc, "_id": inserted_id}
        self.docs.append(stored)
        return SimpleNamespace(inserted_id=inserted_id)

    async def update_one(self, query, update):
        target = await self.find_one(query)
        if not target:
            return SimpleNamespace(modified_count=0)

        for key, value in update.get("$set", {}).items():
            target[key] = value
        return SimpleNamespace(modified_count=1)

    def aggregate(self, pipeline):
        expert_id = pipeline[0]["$match"]["expertId"]
        ratings = [doc["rating"] for doc in self.docs if doc["expertId"] == expert_id]
        if not ratings:
            return _FakeAggregateResult([])
        avg = sum(ratings) / len(ratings)
        return _FakeAggregateResult([{"_id": None, "averageRating": avg}])


class _FakeExpertsCollection:
    def __init__(self):
        self.updated_rating = None

    async def update_one(self, _query, update):
        self.updated_rating = update["$set"]["rating"]
        return SimpleNamespace(modified_count=1)


def test_create_rating_updates_expert_average():
    expert_id = str(ObjectId())
    manager = RatingManager()
    manager.collection = _FakeRatingsCollection()
    manager.experts_collection = _FakeExpertsCollection()

    first = asyncio.run(
        manager.create_rating(
            expertId=expert_id,
            userId="user-1",
            rating=5,
            comment="Great session",
            isAnonymous=False,
        )
    )
    second = asyncio.run(
        manager.create_rating(
            expertId=expert_id,
            userId="user-2",
            rating=3,
            comment="Good",
            isAnonymous=False,
        )
    )

    assert first.rating == 5
    assert second.rating == 3
    assert manager.experts_collection.updated_rating == 4.0
