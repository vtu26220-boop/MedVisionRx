"""Cross-cutting admin controls, registered without editing service handlers."""
import time
from app.admin.maintenance import normalize, expired_updates, apply_changes

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.firebase_admin import verify_firebase_token
from app.db.mongodb import database
from fastapi.concurrency import run_in_threadpool

SERVICES = {
    "prescription": ["/api/prescription"],
    "medicine": ["/api/medicine-catalogue"],
    "blood_donation": ["/api/blood-donors", "/api/blood-donations"],
    "blood_requirement": ["/api/blood-requirements", "/api/blood-banks"],
    "organ_donation": ["/api/organ-donations"],
    "organ_requirement": ["/api/organ-requirements", "/api/organ-banks"],
}
DEFAULTS = {"maintenance": False, "maintenance_reason": "", "maintenance_ends_at": None, "service_maintenance": {}, "upload_limit_mb": 10, "support_email": "", "support_phone": "", "services": {key: True for key in SERVICES}}
_cached = None
_expires = 0


def invalidate_policy():
    global _expires
    _expires = 0


async def load_policy():
    global _cached, _expires
    if _cached is not None and time.monotonic() < _expires:
        return await expire_policy(_cached)
    settings = await database["admin_settings"].find_one({"_id": "platform"}) or {}
    disabled = await database["admin_account_controls"].find({"disabled": True}, {"_id": 1}).to_list(length=None)
    _cached = (normalize(settings, DEFAULTS), {str(row["_id"]) for row in disabled})
    _expires = time.monotonic() + 5
    return await expire_policy(_cached)


async def expire_policy(cached):
    global _cached
    settings, suspended = cached
    changes = expired_updates(settings)
    if changes:
        for guard, updates in changes:
            # Compare the captured deadline to avoid overwriting an extension.
            result = await database["admin_settings"].update_one({"_id": "platform", **guard}, {"$set": updates})
            if result.matched_count == 0:
                # Another worker may have extended or already expired this rule.
                _cached = None
                invalidate_policy()
                return await load_policy()
        _cached = (apply_changes(settings, changes), suspended)
        return _cached
    return cached


class AdminPolicyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if request.method == "OPTIONS" or not path.startswith("/api/") or path.startswith("/api/admin"):
            return await call_next(request)
        try:
            settings, suspended = await load_policy()
        except Exception:
            return JSONResponse({"detail": "Platform controls are temporarily unavailable. Try again shortly."}, status_code=503)
        if suspended:
            header = request.headers.get("authorization", "")
            if header.startswith("Bearer "):
                try:
                    user = await run_in_threadpool(verify_firebase_token, header[7:])
                    if user.get("uid") in suspended:
                        return JSONResponse({"detail": "This account has been suspended. Contact support."}, status_code=403)
                except ValueError:
                    return JSONResponse({"detail": "Invalid sign-in session."}, status_code=401)
        if not path.startswith("/api/users"):
            if settings["maintenance"]:
                return JSONResponse({"detail": "The platform is temporarily under maintenance."}, status_code=503)
            for key, prefixes in SERVICES.items():
                if any(path == prefix or path.startswith(prefix + "/") for prefix in prefixes) and settings["service_maintenance"][key]["enabled"]:
                    return JSONResponse({"detail": "This service has been temporarily paused by the administrator."}, status_code=503)
        if path == "/api/prescription/scan" and request.method == "POST":
            limit = settings["upload_limit_mb"] * 1024 * 1024
            length = request.headers.get("content-length", "")
            if length.isdigit() and int(length) > limit + 65536:
                return JSONResponse({"detail": f"The administrator's upload limit is {settings['upload_limit_mb']} MB."}, status_code=413)
            if settings["upload_limit_mb"] < 10:
                # Cache body before parsing so the unchanged upload handler can read it.
                body = await request.body()
                if len(body) > limit + 65536:
                    return JSONResponse({"detail": "The configured upload limit was exceeded."}, status_code=413)
                try:
                    form = await request.form()
                    try:
                        file = form.get("file")
                        if getattr(file, "size", 0) > limit:
                            return JSONResponse({"detail": "The configured upload limit was exceeded."}, status_code=413)
                    finally:
                        await form.close()
                except Exception:
                    return JSONResponse({"detail": "Invalid upload form."}, status_code=400)
        return await call_next(request)
