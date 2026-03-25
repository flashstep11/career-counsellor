import asyncio
import os
import sys
from datetime import datetime

import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient

# Ensure app is in path so we can import config
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.config import settings


def _is_truthy(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


async def seed_admin() -> None:
    """Create (or promote) an admin user.

    Env vars:
      - ADMIN_EMAIL (default: admin@example.com)
      - ADMIN_PASSWORD (required unless ALLOW_DEFAULT_ADMIN=1)
      - RESET_ADMIN_PASSWORD (default: 0) if user exists
      - ADMIN_FIRST_NAME / ADMIN_LAST_NAME (optional)
      - ALLOW_DEFAULT_ADMIN (default: 0) allows fallback password for local dev

    This script is intentionally simple and idempotent.
    """

    email = (os.getenv("ADMIN_EMAIL") or settings.ADMIN_EMAIL or "admin@example.com").strip()

    allow_default = _is_truthy(os.getenv("ALLOW_DEFAULT_ADMIN")) or bool(settings.ALLOW_DEFAULT_ADMIN)
    password = os.getenv("ADMIN_PASSWORD") or (settings.ADMIN_PASSWORD if settings.ADMIN_PASSWORD else None)
    if password is None or not password.strip():
        if allow_default:
            password = "admin123"
            print("WARNING: Using default admin password (ALLOW_DEFAULT_ADMIN=1).")
            print("         Do NOT use this in production.")
        else:
            print("ADMIN_PASSWORD is not set.")
            print("Set ADMIN_PASSWORD (and optionally ADMIN_EMAIL) and re-run.")
            print("For local dev only, you can set ALLOW_DEFAULT_ADMIN=1.")
            return

    password = password.strip()
    reset_password = _is_truthy(os.getenv("RESET_ADMIN_PASSWORD")) or bool(settings.RESET_ADMIN_PASSWORD)

    first_name = (os.getenv("ADMIN_FIRST_NAME") or settings.ADMIN_FIRST_NAME or "Admin").strip() or "Admin"
    last_name = (os.getenv("ADMIN_LAST_NAME") or settings.ADMIN_LAST_NAME or "User").strip() or "User"

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]

    now = datetime.utcnow()

    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        update_doc: dict = {
            "isAdmin": True,
            "updatedAt": now,
        }

        if reset_password:
            hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            update_doc["hashedPassword"] = hashed_password

        await db.users.update_one({"_id": existing_user["_id"]}, {"$set": update_doc})

        print("==========================================")
        print("Admin user updated!")
        print(f"Email: {email}")
        print("isAdmin set to true")
        print("Password: (unchanged)" if not reset_password else "Password: (reset to ADMIN_PASSWORD)")
        print("==========================================")
        client.close()
        return

    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    user_doc = {
        "email": email,
        "hashedPassword": hashed_password,
        "firstName": first_name,
        "lastName": last_name,
        "middleName": "",
        "gender": "",
        "category": "open",
        "mobileNo": "",
        "home_state": "",
        "type": "free",
        "isExpert": False,
        "isAdmin": True,
        "wallet": 200,
        "following": [],
        "followers": [],
        "onboarding_completed": True,
        "createdAt": now,
        "updatedAt": now,
    }

    result = await db.users.insert_one(user_doc)

    print("==========================================")
    print("Admin seeded successfully!")
    print(f"Email: {email}")
    print("Password: (from ADMIN_PASSWORD)")
    print(f"User ID: {str(result.inserted_id)}")
    print("==========================================")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed_admin())
