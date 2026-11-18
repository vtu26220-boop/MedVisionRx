
import asyncio
from bson import ObjectId

from app.db.mongodb import database


FIREBASE_UID = "G4LiHprlduOOjR9BnJdgZOiFc8G2"
OLD_OWNER_ID = "6a2056f5-0e1a-458f-8a90-2e3742394490"
REQUIREMENT_ID = "6af88956ddd0d4b83eecf6f2"


async def migrate():
    # Check the logged-in Firebase user's profile.
    user = await database["users"].find_one({
        "uid": FIREBASE_UID
    })

    if not user:
        print("ERROR: Firebase user not found. Nothing changed.")
        return

    # Check the exact requirement and its current owner.
    requirement = await database["organ_requirements"].find_one({
        "_id": ObjectId(REQUIREMENT_ID),
        "created_by_user_id": OLD_OWNER_ID
    })

    if not requirement:
        print("ERROR: Requirement or old owner ID did not match.")
        print("Nothing changed.")
        return

    # Update the requirement owner.
    result = await database["organ_requirements"].update_one(
        {
            "_id": ObjectId(REQUIREMENT_ID),
            "created_by_user_id": OLD_OWNER_ID
        },
        {
            "$set": {
                "created_by_user_id": FIREBASE_UID
            }
        }
    )

    # Update responses belonging to this requirement.
    responses = await database[
        "organ_requirement_responses"
    ].update_many(
        {
            "requirement_id": REQUIREMENT_ID,
            "requester_user_id": OLD_OWNER_ID
        },
        {
            "$set": {
                "requester_user_id": FIREBASE_UID
            }
        }
    )

    print("\nMigration result")
    print("----------------")
    print("Requirement updated:", result.modified_count)
    print("Responses updated:", responses.modified_count)

    # Verify the updated requirement.
    updated = await database["organ_requirements"].find_one({
        "_id": ObjectId(REQUIREMENT_ID)
    })

    print("New owner ID:", updated.get("created_by_user_id"))

    if updated.get("created_by_user_id") == FIREBASE_UID:
        print("\nSUCCESS: Requirement ownership migrated.")
    else:
        print("\nERROR: Please check the database.")


if __name__ == "__main__":
    asyncio.run(migrate())
