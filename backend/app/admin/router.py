import asyncio
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Literal
from uuid import UUID
from pymongo.errors import DuplicateKeyError

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, JSONResponse
from firebase_admin import auth
from pydantic import BaseModel, EmailStr, Field, StringConstraints, ValidationError, AwareDatetime

from app.db.mongodb import database
from app.admin.maintenance import normalize, public_status
from app.admin.security import administrator, reviewer, signed_in, is_reviewer, configured_uids
from app.admin.policy import DEFAULTS, SERVICES, invalidate_policy, load_policy
from app.schemas.medicine_catalogue import MedicineCatalogueCreate
from app.schemas.blood_bank import BloodBankCreate
from app.schemas.organ_bank import OrganBankCreate

router = APIRouter(prefix="/api/admin", tags=["Administration"])
RESOURCES = {
    "users": ("users", ["fullName", "email", "phone", "uid"]),
    "prescriptions": ("prescriptions", ["filename", "status"]),
    "medicines": ("medicine_catalogue", ["name", "brand_name", "generic_name"]),
    "blood-donors": ("blood_donors", ["full_name", "blood_group", "city", "state"]),
    "blood-requirements": ("blood_requirements", ["organ_required", "blood_group", "hospital_name", "hospital_city", "status"]),
    "blood-banks": ("blood_banks", ["name", "city", "state"]),
    "organ-donors": ("organ_donations", ["full_name", "name", "city", "status"]),
    "organ-requirements": ("organ_requirements", ["organ_required", "hospital_name", "hospital_city", "status"]),
    "organ-banks": ("organ_banks", ["name", "city", "state"]),
    "support": ("admin_support", ["subject", "email", "status", "service"]),
    "activity": ("admin_audit", ["action", "resource", "actor_email", "outcome"]),
}
# Explicit summaries prevent list APIs from leaking prescriptions or large photos.
FIELDS = {
 "users": ["uid", "fullName", "email", "phone", "createdAt"],
 "prescriptions": ["filename", "status", "created_at", "updated_at", "ocr_provider", "error", "admin_flagged", "admin_note", "user_id"],
 "medicines": ["name", "brand_name", "generic_name", "strength", "dosage_form", "category", "uses", "side_effects", "warnings", "age_restrictions", "information_source", "verified", "last_verified", "created_at", "updated_at"],
 "blood-donors": ["full_name", "blood_group", "city", "state", "availability", "verification_status", "created_at"],
 "organ-donors": ["full_name", "name", "blood_group", "city", "state", "organs", "donation_type", "status", "created_at"],
 "blood-requirements": ["blood_group", "units_required", "units_fulfilled", "hospital_name", "hospital_city", "urgency", "status", "created_at"],
 "organ-requirements": ["organ_required", "units_required", "units_fulfilled", "hospital_name", "hospital_city", "urgency", "status", "created_at"],
 "blood-banks": list(BloodBankCreate.model_fields) + ["created_at", "updated_at"],
 "organ-banks": list(OrganBankCreate.model_fields) + ["created_at", "updated_at"],
 "support": ["name", "subject", "email", "message", "service", "status", "resolution", "created_at", "updated_at", "created_by"],
 "activity": ["action", "resource", "record_id", "actor_email", "reason", "fields", "outcome", "created_at"],
}


def safe(value):
    if isinstance(value, (datetime, ObjectId)):
        return value.isoformat() if isinstance(value, datetime) else str(value)
    if isinstance(value, list): return [safe(v) for v in value]
    if isinstance(value, dict): return {k: safe(v) for k, v in value.items() if k not in {"file_path", "password", "password_hash", "profileImageUrl", "raw_text"}}
    return value


def serialize(row):
    if not row: return None
    return {**safe({k: v for k, v in row.items() if k != "_id"}), "id": str(row["_id"])}


def resource_info(resource):
    if resource not in RESOURCES: raise HTTPException(404, "Unknown admin resource.")
    return RESOURCES[resource]


def key_query(identifier):
    variants = [identifier]
    if ObjectId.is_valid(identifier): variants.append(ObjectId(identifier))
    return {"_id": {"$in": variants}}


async def audit(actor, action, resource, record_id="", reason="", fields=None, outcome="success"):
    result = await database["admin_audit"].insert_one({"actor_uid": actor["uid"], "actor_email": actor.get("email", ""), "action": action, "resource": resource,
        "record_id": str(record_id), "reason": reason, "fields": fields or [], "outcome": outcome, "created_at": datetime.now(timezone.utc)})
    return result.inserted_id


async def mutate(actor, action, resource, identifier, reason, values, operation):
    event = await audit(actor, action, resource, identifier, reason, list(values), "pending")
    try:
        result = await operation()
    except Exception:
        await database["admin_audit"].update_one({"_id": event}, {"$set": {"outcome": "failed"}})
        raise
    await database["admin_audit"].update_one({"_id": event}, {"$set": {"outcome": "success"}})
    return result


class Change(BaseModel):
    values: dict
    reason: Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=500)]


class AccessReason(BaseModel):
    reason: Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=500)]


class AccountChange(BaseModel):
    disabled: bool
    reason: Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=500)]


class Ticket(BaseModel):
    name: str = Field(default="", max_length=120)
    subject: str = Field(min_length=3, max_length=150)
    message: str = Field(min_length=5, max_length=4000)
    email: EmailStr
    service: Literal["general", "prescription", "medicine", "blood", "organ", "blood_donation", "blood_requirement", "organ_donation", "organ_requirement"] = "general"


class MaintenanceRule(BaseModel):
    enabled: bool = False
    reason: str = Field(default="", max_length=500)
    ends_at: AwareDatetime | None = None


class Settings(BaseModel):
    maintenance: bool = False
    maintenance_reason: str = Field(default="", max_length=500)
    maintenance_ends_at: AwareDatetime | None = None
    service_maintenance: dict[str, MaintenanceRule] = Field(default_factory=dict)
    upload_limit_mb: int = Field(default=10, ge=1, le=10)
    support_email: str = Field(default="", max_length=150)
    support_phone: str = Field(default="", max_length=30)
    services: dict[str, bool]
    reason: Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=500)]


@router.get("/me")
async def me(actor=Depends(administrator)):
    return {"uid": actor["uid"], "email": actor.get("email", ""), "name": actor.get("name") or "Administrator", "reviewer": is_reviewer(actor)}


@router.post("/website-session")
async def website_session(actor=Depends(administrator)):
    # Identity is taken exclusively from the verified administrator token.
    try:
        token = await run_in_threadpool(auth.create_custom_token, actor["uid"])
    except Exception as exc:
        raise HTTPException(503, "Unable to open the website session. Please retry.") from exc
    await audit(actor, "administrator_session_transfer", "settings", actor["uid"], "Administrator opened a linked session")
    return JSONResponse({"uid": actor["uid"], "token": token.decode("utf-8") if isinstance(token, bytes) else token}, headers={"Cache-Control": "no-store"})


@router.get("/dashboard")
async def dashboard(days: int = Query(30, ge=7, le=90), actor=Depends(administrator)):
    queries = [("users", "users", {}), ("prescriptions", "prescriptions", {}), ("analyzed", "prescriptions", {"status": {"$in": ["needs_review", "completed"]}}),
        ("blood_active", "blood_requirements", {"status": "active"}), ("organ_active", "organ_requirements", {"status": "active"}),
        ("medicines", "medicine_catalogue", {}), ("medicine_pending", "medicine_catalogue", {"verified": {"$ne": True}}), ("scans_failed", "prescriptions", {"status": "failed"}),
        ("support_open", "admin_support", {"status": {"$in": ["open", "in_progress", "responded"]}}), ("flagged", "prescriptions", {"admin_flagged": True})]
    counts = await asyncio.gather(*(database[collection].count_documents(query) for _, collection, query in queries))
    totals = {item[0]: count for item, count in zip(queries, counts)}
    totals["active_requirements"] = totals["blood_active"] + totals["organ_active"]
    totals["pending_reviews"] = totals["medicine_pending"] + totals["flagged"]
    now = datetime.now(timezone.utc)
    # India calendar dates, matching the website's audience and date controls.
    local = timezone(timedelta(hours=5, minutes=30))
    today = now.astimezone(local).date()
    start = datetime.combine(today - timedelta(days=days-1), datetime.min.time(), tzinfo=local)
    pipeline = [
        {"$addFields": {"_event_date": {"$convert": {"input": "$created_at", "to": "date", "onError": None, "onNull": None}}}},
        {"$match": {"_event_date": {"$gte": start, "$lte": now}}},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$_event_date", "timezone": "Asia/Kolkata"}},
                    "analyzed": {"$sum": {"$cond": [{"$in": ["$status", ["needs_review", "completed"]]}, 1, 0]}},
                    "failed": {"$sum": {"$cond": [{"$eq": ["$status", "failed"]}, 1, 0]}}}},
    ]
    points = await database["prescriptions"].aggregate(pipeline).to_list(length=None)
    by_day = {row["_id"]: row for row in points}
    chart = [{"date": (start.date()+timedelta(days=index)).isoformat(), "analyzed": by_day.get((start.date()+timedelta(days=index)).isoformat(), {}).get("analyzed", 0),
        "failed": by_day.get((start.date()+timedelta(days=index)).isoformat(), {}).get("failed", 0)} for index in range(days)]
    settings, _ = await load_policy()
    from app.services.prescription_ocr import capabilities
    enabled = {key: not value["enabled"] for key, value in settings["service_maintenance"].items()}
    activity = await database["admin_audit"].find({}, {field: 1 for field in FIELDS["activity"]}).sort("created_at", -1).limit(5).to_list(length=5)
    return {"totals": totals, "chart": chart, "activity": [serialize(row) for row in activity], "services": enabled,
        "maintenance": settings.get("maintenance", False), "ocr_available": capabilities()["available"], "generated_at": now.isoformat()}


@router.get("/resources/{resource}")
async def records(resource: str, q: str = Query("", max_length=150), status: str = Query("", max_length=40), page: int = Query(1, ge=1), size: int = Query(15, ge=1, le=50), actor=Depends(administrator)):
    collection, search_fields = resource_info(resource)
    query = {}
    if q.strip(): query["$or"] = [{field: {"$regex": re.escape(q.strip()), "$options": "i"}} for field in search_fields]
    if status:
        if resource == "prescriptions" and status == "analyzed": query["status"] = {"$in": ["needs_review", "completed"]}
        elif resource == "medicines": query["verified"] = status == "reviewed"
        elif resource in {"blood-banks", "organ-banks"}: query["is_active"] = status == "active"
        elif resource == "blood-donors": query["availability"] = status == "active"
        elif resource == "support" and status == "unresolved": query["status"] = {"$in": ["open", "in_progress", "responded"]}
        else: query["status"] = status
    projection = {field: 1 for field in FIELDS[resource]}
    count = await database[collection].count_documents(query)
    rows = await database[collection].find(query, projection).sort("createdAt" if resource == "users" else "created_at", -1).skip((page-1)*size).limit(size).to_list(length=size)
    result = [serialize(row) for row in rows]
    if resource == "support" and result:
        replies = await database["admin_support_responses"].find({"ticket_id": {"$in": [row["id"] for row in result]}}, {"ticket_id": 1, "created_at": 1, "read_at": 1, "feedback": 1, "cleared_at": 1}).sort("created_at", 1).to_list(length=None)
        for row in result:
            related = [reply for reply in replies if reply["ticket_id"] == row["id"]]
            latest = related[-1] if related else {}
            row.update(response_count=len(related), user_read=bool(latest.get("read_at")), user_feedback=latest.get("feedback"), notification_cleared=bool(latest.get("cleared_at")), last_response_at=safe(latest.get("created_at")))
    if resource == "users":
        uids = [row.get("uid") for row in result if row.get("uid")]
        controls = await database["admin_account_controls"].find({"_id": {"$in": uids}}, {"disabled": 1}).to_list(length=None)
        disabled = {str(row["_id"]): row.get("disabled", False) for row in controls}
        for row in result: row["disabled"] = disabled.get(row.get("uid"), False)
    return {"items": result, "total": count, "page": page, "size": size}


@router.post("/resources/{resource}")
async def create(resource: str, body: Change, actor=Depends(administrator)):
    collection, _ = resource_info(resource)
    models = {"medicines": MedicineCatalogueCreate, "blood-banks": BloodBankCreate, "organ-banks": OrganBankCreate}
    if resource not in models: raise HTTPException(405, "Create this record through its normal registration workflow.")
    try: values = models[resource].model_validate(body.values).model_dump(mode="json")
    except ValidationError as exc: raise HTTPException(422, "Invalid record: " + "; ".join(f"{'.'.join(str(v) for v in item['loc'])}: {item['msg']}" for item in exc.errors())) from exc
    if resource == "medicines": validate_medicine(values, actor)
    validate_bank_url(values)
    values.update(created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    async def operation():
        result = await database[collection].insert_one(values)
        return {"id": str(result.inserted_id)}
    return await mutate(actor, "record_created", resource, "new", body.reason, values, operation)


def validate_bank_url(values):
    value = values.get("website_url")
    if value:
        from urllib.parse import urlparse
        parsed = urlparse(str(value))
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise HTTPException(422, "Facility website must be an HTTP or HTTPS URL.")


def validate_medicine(values, actor):
    if values.get("verified"):
        if not is_reviewer(actor): raise HTTPException(403, "Only a clinical reviewer can mark medicine information reviewed.")
        if not values.get("generic_name") or not str(values.get("information_source", "")).startswith("https://"):
            raise HTTPException(422, "A reviewed entry needs generic ingredients and an HTTPS reference source.")
        values["last_verified"] = datetime.now(timezone.utc)
    else: values["last_verified"] = None


@router.patch("/resources/{resource}/{identifier}")
async def edit(resource: str, identifier: str, body: Change, actor=Depends(administrator)):
    collection, _ = resource_info(resource)
    if resource in {"users", "activity"}: raise HTTPException(405, "Use the account action endpoint; audit entries cannot be edited.")
    query = key_query(identifier)
    existing = await database[collection].find_one(query)
    if not existing: raise HTTPException(404, "Record not found.")
    allowed = {
        "prescriptions": {"admin_flagged", "admin_note"},
        "blood-donors": {"availability"}, "organ-donors": {"status"},
        "blood-requirements": {"status"}, "organ-requirements": {"status"},
        "support": {"status", "resolution"},
        "medicines": set(MedicineCatalogueCreate.model_fields),
        "blood-banks": set(BloodBankCreate.model_fields), "organ-banks": set(OrganBankCreate.model_fields),
    }
    if not body.values or set(body.values) - allowed[resource]: raise HTTPException(422, "This change contains unsupported fields.")
    values = dict(body.values)
    if resource.endswith("requirements"):
        if values.get("status") != "cancelled" or existing.get("status") != "active":
            raise HTTPException(409, "Only active requirements can be cancelled. Fulfillment and donor transactions must use the normal service workflow.")
        if existing.get("units_fulfilled", 0) or any(item.get("response_status", item.get("status")) in {"pending", "accepted"} for item in existing.get("donor_responses", []) if isinstance(item, dict)):
            raise HTTPException(409, "This request has donor activity. Resolve it through the original service workflow before cancellation.")
        query["status"] = "active"
    if resource == "organ-donors" and (values.get("status") not in {"active", "inactive"} or existing.get("status") not in {"active", "inactive"}):
        raise HTTPException(409, "Only active/inactive donor registrations can be changed here.")
    for boolean in ["availability", "admin_flagged"]:
        if boolean in values and not isinstance(values[boolean], bool): raise HTTPException(422, "Expected a boolean flag.")
    if resource == "support" and values.get("status", existing.get("status")) not in {"open", "in_progress", "responded", "resolved", "closed"}: raise HTTPException(422, "Invalid support status.")
    for field in ["admin_note", "resolution"]:
        if field in values and (not isinstance(values[field], str) or len(values[field]) > 4000): raise HTTPException(422, "Note is too long or invalid.")
    models = {"medicines": MedicineCatalogueCreate, "blood-banks": BloodBankCreate, "organ-banks": OrganBankCreate}
    if resource in models:
        merged = {key: existing[key] for key in models[resource].model_fields if key in existing}
        merged.update(values)
        # Editing clinical information invalidates the earlier review unless a
        # reviewer explicitly re-confirms it in this save.
        if resource == "medicines" and "verified" not in values: merged["verified"] = False
        try: values = models[resource].model_validate(merged).model_dump(mode="json")
        except ValidationError as exc: raise HTTPException(422, "Check required fields, contact details and HTTPS URLs.") from exc
        if resource == "medicines": validate_medicine(values, actor)
        validate_bank_url(values)
    values["updated_at"] = datetime.now(timezone.utc)
    async def operation():
        result = await database[collection].update_one(query, {"$set": values})
        if not result.matched_count: raise HTTPException(409, "The record changed. Refresh before trying again.")
        return {"success": True}
    return await mutate(actor, "record_updated", resource, identifier, body.reason, values, operation)


@router.patch("/accounts/{uid}")
async def account(uid: str, body: AccountChange, actor=Depends(administrator)):
    if uid == actor["uid"] or uid in configured_uids("MEDVISION_ADMIN_UIDS"):
        raise HTTPException(409, "Administrator accounts cannot be suspended through this page.")
    try: user = await run_in_threadpool(auth.get_user, uid)
    except auth.UserNotFoundError as exc: raise HTTPException(404, "Firebase account not found.") from exc
    if (user.custom_claims or {}).get("admin"): raise HTTPException(409, "Administrator accounts cannot be suspended here.")
    async def operation():
        # Persist the block first so already issued tokens are also denied by
        # the policy layer, not only at the next Firebase sign-in.
        await database["admin_account_controls"].update_one({"_id": uid}, {"$set": {"disabled": body.disabled, "updated_at": datetime.now(timezone.utc)}}, upsert=True)
        invalidate_policy()
        try:
            await run_in_threadpool(auth.update_user, uid, disabled=body.disabled)
            if body.disabled: await run_in_threadpool(auth.revoke_refresh_tokens, uid)
        except Exception as exc:
            raise HTTPException(502, "The local access policy was saved, but Firebase could not be updated. Retry to synchronize the account.") from exc
        return {"success": True}
    return await mutate(actor, "account_suspended" if body.disabled else "account_restored", "users", uid, body.reason, {"disabled": body.disabled}, operation)


@router.post("/prescriptions/{identifier}/clinical-access")
async def clinical_access(identifier: str, body: AccessReason, actor=Depends(reviewer)):
    row = await database["prescriptions"].find_one({"_id": identifier})
    if not row: raise HTTPException(404, "Prescription not found.")
    await audit(actor, "prescription_clinical_access", "prescriptions", identifier, body.reason)
    # The original is accessed separately; every original-file view is audited.
    return {"id": identifier, "raw_text": row.get("raw_text", ""), "medicines": safe(row.get("medicines", [])), "warnings": row.get("warnings", [])}


@router.post("/prescriptions/{identifier}/original")
async def original(identifier: str, body: AccessReason, actor=Depends(reviewer)):
    row = await database["prescriptions"].find_one({"_id": identifier})
    if not row: raise HTTPException(404, "Prescription not found.")
    from app.services.prescription_service import STORAGE
    path = Path(row.get("file_path", "")).resolve()
    if path.parent != STORAGE.resolve() or not path.is_file(): raise HTTPException(404, "Original file unavailable.")
    await audit(actor, "prescription_original_viewed", "prescriptions", identifier, body.reason)
    media = "application/pdf" if path.suffix == ".pdf" else "image/png" if path.suffix == ".png" else "image/jpeg"
    return FileResponse(path, media_type=media, headers={"Cache-Control": "private, no-store"})


@router.post("/support/request", status_code=201)
async def submit_ticket(body: Ticket, actor=Depends(signed_in)):
    now = datetime.now(timezone.utc)
    record = {**body.model_dump(mode="json"), "created_by": actor["uid"], "status": "open", "resolution": "", "created_at": now, "updated_at": now}
    result = await database["admin_support"].insert_one(record)
    await audit(actor, "support_ticket_created", "support", result.inserted_id, "Support request submitted")
    return {"id": str(result.inserted_id), "success": True}


class SupportResponse(BaseModel):
    request_id: UUID
    message: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]


class NotificationAction(BaseModel):
    action: Literal["read", "clear", "helpful", "not_helpful"]


def notification_view(row):
    fields = ["ticket_id", "service", "subject", "request_message", "message", "created_at", "read_at", "feedback", "feedback_at", "cleared_at"]
    return {"id": str(row["_id"]), **safe({key: row.get(key) for key in fields})}


@router.get("/support/notifications")
async def notifications(service: Literal["general", "prescription", "medicine", "blood_donation", "blood_requirement", "organ_donation", "organ_requirement"], actor=Depends(signed_in)):
    scope = {"user_id": actor["uid"], "service": {"$in": ["general", "blood", "organ"]} if service == "general" else service, "cleared_at": None}
    replies = database["admin_support_responses"]
    rows = await replies.find(scope).sort("created_at", -1).limit(100).to_list(length=100)
    unread = await replies.count_documents({**scope, "read_at": None})
    return JSONResponse({"items": [notification_view(row) for row in rows], "unread_count": unread}, headers={"Cache-Control": "private, no-store"})


@router.patch("/support/notifications/{identifier}")
async def update_notification(identifier: UUID, body: NotificationAction, actor=Depends(signed_in)):
    collection = database["admin_support_responses"]
    query = {"_id": str(identifier), "user_id": actor["uid"]}
    row = await collection.find_one(query)
    if not row: raise HTTPException(404, "Notification not found.")
    now = datetime.now(timezone.utc)
    values = {}
    if body.action == "clear":
        if not row.get("cleared_at"): values["cleared_at"] = now
    else:
        if row.get("cleared_at"): raise HTTPException(409, "This notification has been cleared.")
        if not row.get("read_at"): values["read_at"] = now
        if body.action in {"helpful", "not_helpful"}:
            values.update(feedback=body.action, feedback_at=now)
    if values:
        await collection.update_one(query, {"$set": values})
    return {"item": notification_view(await collection.find_one(query))}


@router.get("/support/{identifier}/responses")
async def support_responses(identifier: str, actor=Depends(administrator)):
    ticket = await database["admin_support"].find_one(key_query(identifier))
    if not ticket: raise HTTPException(404, "Support request not found.")
    rows = await database["admin_support_responses"].find({"ticket_id": str(ticket["_id"])}).sort("created_at", 1).to_list(length=None)
    return {"items": [notification_view(row) for row in rows]}


@router.post("/support/{identifier}/respond")
async def respond_to_support(identifier: str, body: SupportResponse, actor=Depends(administrator)):
    tickets, replies = database["admin_support"], database["admin_support_responses"]
    ticket = await tickets.find_one(key_query(identifier))
    if not ticket: raise HTTPException(404, "Support request not found.")
    if not ticket.get("created_by"): raise HTTPException(409, "This legacy request has no linked user account. An in-app response cannot be delivered.")
    ticket_id = str(ticket["_id"])
    reply_id = str(body.request_id)
    existing = await replies.find_one({"_id": reply_id})
    if existing and (existing["ticket_id"] != ticket_id or existing["message"] != body.message):
        raise HTTPException(409, "This response identifier was already used for a different message.")
    if not existing:
        if await replies.count_documents({"ticket_id": ticket_id}) >= 100:
            raise HTTPException(409, "This support request has reached its response limit.")
        now = datetime.now(timezone.utc)
        record = {"_id": reply_id, "ticket_id": ticket_id, "user_id": ticket["created_by"], "service": ticket.get("service", "general"), "subject": ticket.get("subject", "Support request"), "request_message": ticket.get("message", ""), "message": body.message, "created_at": now, "responded_by": actor["uid"], "read_at": None, "feedback": None, "feedback_at": None, "cleared_at": None}
        try:
            await replies.insert_one(record)
        except DuplicateKeyError:
            existing = await replies.find_one({"_id": reply_id})
            if not existing or existing["ticket_id"] != ticket_id or existing["message"] != body.message:
                raise HTTPException(409, "This response identifier is already in use.")
        else:
            await audit(actor, "support_response_sent", "support", ticket_id, "Administrator sent an in-app support response")
    await tickets.update_one({"_id": ticket["_id"], "status": {"$in": ["open", "in_progress", "responded"]}}, {"$set": {"status": "responded", "updated_at": datetime.now(timezone.utc)}})
    return {"success": True, "item": notification_view(await replies.find_one({"_id": reply_id}))}


@router.get("/maintenance-status")
async def maintenance_status():
    settings, _ = await load_policy()
    return JSONResponse(public_status(settings), headers={"Cache-Control": "no-store"})


@router.get("/settings")
async def settings(actor=Depends(administrator)):
    row, _ = await load_policy()
    return safe({k: v for k, v in row.items() if k != "_id"})


@router.put("/settings")
async def save_settings(body: Settings, actor=Depends(administrator)):
    if set(body.services) != set(SERVICES): raise HTTPException(422, "Provide settings for all six services.")
    if body.support_email:
        try:
            from pydantic import TypeAdapter
            TypeAdapter(EmailStr).validate_python(body.support_email)
        except ValidationError as exc: raise HTTPException(422, "Enter a valid support email.") from exc
    if set(body.service_maintenance) - set(SERVICES):
        raise HTTPException(422, "Unknown service maintenance setting.")
    now = datetime.now(timezone.utc)
    if body.maintenance and body.maintenance_ends_at and body.maintenance_ends_at <= now:
        raise HTTPException(422, "Website maintenance end time must be in the future.")
    for rule in body.service_maintenance.values():
        if rule.enabled and not rule.reason.strip():
            raise HTTPException(422, "Provide a public reason for each service under maintenance.")
        if rule.enabled and rule.ends_at and rule.ends_at <= now:
            raise HTTPException(422, "Service maintenance end time must be in the future.")
    values = normalize(body.model_dump(mode="json", exclude={"reason"}), DEFAULTS)
    if values["maintenance"] and not values["maintenance_reason"].strip():
        values["maintenance_reason"] = body.reason
    values["services"] = {key: not rule["enabled"] for key, rule in values["service_maintenance"].items()}
    values["updated_at"] = datetime.now(timezone.utc)
    async def operation():
        await database["admin_settings"].update_one({"_id": "platform"}, {"$set": values}, upsert=True)
        invalidate_policy()
        return {"success": True}
    return await mutate(actor, "platform_settings_updated", "settings", "platform", body.reason, values, operation)
