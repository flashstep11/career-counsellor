from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.mongodb import db


def get_database() -> AsyncIOMotorDatabase:
    """
    Get the MongoDB database instance.

    Returns:
        AsyncIOMotorDatabase: The MongoDB database instance

    Note:
        This function returns a reference to the global database instance.
        The connection is established when the module is imported.
    """
    return db
