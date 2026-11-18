from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, EmailStr
from app.db.mongodb import database
from app.core.firebase_admin import verify_firebase_token
from app.admin.security import is_administrator

router = APIRouter(prefix="/api/users", tags=["Users"])


class CreateUserProfileRequest(BaseModel):
    fullName: str
    email: EmailStr
    phone: str = ""


class UpdateUserProfileRequest(BaseModel):
    fullName: str
    phone: str = ""
    profileImageUrl: str = ""
    avatarId: str = ""


def get_uid_from_authorization(authorization: str | None) -> tuple[str, dict]:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization token is required.")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format.")
    id_token = authorization[7:].strip()
    try:
        firebase_user = verify_firebase_token(id_token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    uid = firebase_user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Firebase UID not found.")
    return uid, firebase_user


def public_profile(profile, token):
    result = dict(profile or {})
    admin = is_administrator(token)
    result.update(uid=token["uid"], is_admin=admin, role="Administrator" if admin else "Member")
    if admin:
        result.update(fullName="Admin", email=token.get("email") or result.get("email", ""), phone="", avatarId="/admin-avatar.svg", profileImageUrl="")
    return result


@router.post("/profile")
async def create_user_profile(
    data: CreateUserProfileRequest,
    authorization: str | None = Header(default=None),
):
    uid, firebase_user = get_uid_from_authorization(authorization)
    email = (firebase_user.get("email") or str(data.email)).strip().lower()
    full_name = data.fullName.strip()
    phone = data.phone.strip()
    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required.")
    if not phone and not is_administrator(firebase_user):
        raise HTTPException(status_code=400, detail="Phone number is required.")

    users = database["users"]
    now = datetime.now(timezone.utc)
    await users.update_one(
        {"uid": uid},
        {
            "$set": {
                "fullName": full_name,
                "email": email,
                "phone": phone,
                "updatedAt": now,
            },
            "$setOnInsert": {
                "uid": uid,
                "location": "",
                "college": "",
                "education": {},
                "careerGoal": "",
                "resume": {},
                "profileImageUrl": "",
                "avatarId": "",
                "createdAt": now,
            },
        },
        upsert=True,
    )
    user = await users.find_one({"uid": uid}, {"_id": 0})
    return {"success": True, "message": "User profile saved successfully.", "user": public_profile(user, firebase_user)}


@router.get("/me")
async def get_current_user(authorization: str | None = Header(default=None)):
    uid, firebase_user = get_uid_from_authorization(authorization)
    user = await database["users"].find_one({"uid": uid}, {"_id": 0})
    if not user and not is_administrator(firebase_user):
        raise HTTPException(status_code=404, detail="User profile not found.")
    return {"success": True, "user": public_profile(user, firebase_user)}


@router.patch("/me")
async def update_current_user(
    data: UpdateUserProfileRequest,
    authorization: str | None = Header(default=None),
):
    uid, firebase_user = get_uid_from_authorization(authorization)
    full_name = data.fullName.strip()
    phone = data.phone.strip()
    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required.")
    if not phone and not is_administrator(firebase_user):
        raise HTTPException(status_code=400, detail="Phone number is required.")

    users = database["users"]
    existing = await users.find_one({"uid": uid})
    if not existing and not is_administrator(firebase_user):
        raise HTTPException(status_code=404, detail="User profile not found. Create your profile first.")

    await users.update_one(
        {"uid": uid},
        {"$set": {
            "fullName": full_name,
            "phone": phone,
            "profileImageUrl": data.profileImageUrl.strip(),
            "avatarId": data.avatarId.strip(),
            "updatedAt": datetime.now(timezone.utc),
        }},
        upsert=is_administrator(firebase_user),
    )
    updated = await users.find_one({"uid": uid}, {"_id": 0})
    return {"success": True, "message": "Profile updated successfully.", "user": public_profile(updated, firebase_user)}
