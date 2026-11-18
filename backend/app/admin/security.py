import os

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth
from fastapi.concurrency import run_in_threadpool

security = HTTPBearer(auto_error=False)


def configured_uids(name):
    return {value.strip() for value in os.getenv(name, "").split(",") if value.strip()}


async def signed_in(credentials: HTTPAuthorizationCredentials | None = Depends(security)):
    if not credentials:
        raise HTTPException(401, "Sign in to continue.")
    try:
        token = await run_in_threadpool(auth.verify_id_token, credentials.credentials, check_revoked=True)
    except Exception as exc:
        raise HTTPException(401, "Your session is invalid, expired or suspended. Sign in again.") from exc
    if not token.get("uid"):
        raise HTTPException(401, "Invalid account identity.")
    return token


def is_administrator(token):
    return token.get("admin") is True or token.get("uid") in configured_uids("MEDVISION_ADMIN_UIDS")


async def administrator(token=Depends(signed_in)):
    if not is_administrator(token):
        raise HTTPException(403, "This account does not have administrator access.")
    return token


def is_reviewer(token):
    return token.get("clinical_reviewer") is True or token["uid"] in configured_uids("MEDVISION_REVIEWER_UIDS")


async def reviewer(token=Depends(administrator)):
    if not is_reviewer(token):
        raise HTTPException(403, "A separately assigned clinical reviewer permission is required.")
    return token
