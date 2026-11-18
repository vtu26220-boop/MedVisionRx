
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.firebase_admin import verify_firebase_token
from app.db.mongodb import database

from app.schemas.organ_requirement import (
    OrganRequirementCreate,
    OrganRequirementResponseCreate,
)

from app.services.organ_requirement_service import (
    create_organ_requirement,
    get_organ_requirements,
    get_organ_requirement,
    get_my_organ_requirements,
    update_organ_requirement,
    cancel_organ_requirement,
    create_organ_requirement_response,
    get_organ_requirement_responses,
    accept_organ_requirement_response,
    reject_organ_requirement_response,
    get_accepted_donors_for_requirement,
)

router = APIRouter(
    prefix="/api/organ-requirements",
    tags=["Organ Requirements"],
)

security = HTTPBearer(auto_error=False)


# =========================================================
# FIREBASE AUTHENTICATION
# =========================================================

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in.",
        )

    try:
        decoded = verify_firebase_token(credentials.credentials)

        if not decoded.get("uid"):
            raise HTTPException(
                status_code=401,
                detail="Firebase UID is missing.",
            )

        return decoded

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired Firebase token.",
        ) from exc


# =========================================================
# REQUIREMENT OWNER VALIDATION
# =========================================================

async def verify_requirement_owner(
    requirement_id: str,
    uid: str,
):
    """
    Verify the Firebase UID against the requirement owner.

    Legacy migration:
    Older requirements may contain the MongoDB _id of the
    user's profile instead of the Firebase UID.

    Migrate only when that MongoDB profile belongs to the
    currently authenticated Firebase UID.
    """

    requirement = await get_organ_requirement(requirement_id)

    if not requirement:
        raise HTTPException(
            status_code=404,
            detail="Organ requirement not found.",
        )

    owner_id = requirement.get("created_by_user_id")

    # Normal case: requirement already stores Firebase UID.
    if str(owner_id or "") == str(uid):
        return requirement

    # Legacy case: old owner ID may be the MongoDB users._id.
    if owner_id and ObjectId.is_valid(str(owner_id)):
        legacy_profile = await database["users"].find_one({
            "_id": ObjectId(str(owner_id)),
            "uid": uid,
        })

        if legacy_profile:
            # Safe migration: only update after confirming that
            # this profile belongs to the authenticated Firebase UID.
            await database["organ_requirements"].update_one(
                {
                    "_id": ObjectId(requirement_id),
                    "created_by_user_id": owner_id,
                },
                {
                    "$set": {
                        "created_by_user_id": uid,
                    }
                },
            )

            # Keep response ownership consistent with the migrated
            # requirement so service-level checks also succeed.
            await database["organ_requirement_responses"].update_many(
                {
                    "requirement_id": requirement_id,
                    "requester_user_id": owner_id,
                },
                {
                    "$set": {
                        "requester_user_id": uid,
                    }
                },
            )

            return await get_organ_requirement(requirement_id)

    raise HTTPException(
        status_code=403,
        detail=(
            "You are not the owner of this requirement. "
            "Sign in using the account that created it."
        ),
    )


# =========================================================
# CREATE REQUIREMENT
# =========================================================

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_requirement(
    requirement: OrganRequirementCreate,
    current_user: dict = Depends(get_current_user),
):
    try:
        result = await create_organ_requirement(
            requirement.model_dump(),
            current_user["uid"],
        )

        if isinstance(result, dict) and result.get("error"):
            raise HTTPException(400, result["error"])

        return {
            "message": "Organ requirement created successfully.",
            "requirement": result,
        }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create organ requirement: {str(exc)}",
        ) from exc


# =========================================================
# LIST REQUIREMENTS
# =========================================================

@router.get("/")
async def list_requirements(
    status_filter: Optional[str] = Query("active", alias="status"),
    organ: Optional[str] = None,
    donation_type: Optional[str] = None,
    urgency: Optional[str] = None,
):
    return await get_organ_requirements(
        status=status_filter,
        organ=organ,
        donation_type=donation_type,
        urgency=urgency,
    )


# =========================================================
# MY REQUIREMENTS
# =========================================================

@router.get("/my")
async def my_requirements(
    current_user: dict = Depends(get_current_user),
):
    return await get_my_organ_requirements(current_user["uid"])


# =========================================================
# GET ONE REQUIREMENT
# =========================================================

@router.get("/{requirement_id}")
async def get_requirement(requirement_id: str):
    result = await get_organ_requirement(requirement_id)

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Organ requirement not found.",
        )

    return result


# =========================================================
# UPDATE REQUIREMENT
# =========================================================

@router.put("/{requirement_id}")
async def update_requirement(
    requirement_id: str,
    requirement: OrganRequirementCreate,
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["uid"]

    await verify_requirement_owner(requirement_id, uid)

    result = await update_organ_requirement(
        requirement_id,
        uid,
        requirement.model_dump(),
    )

    if isinstance(result, dict) and result.get("error"):
        errors = {
            "invalid_requirement_id": (400, "Invalid requirement ID."),
            "organ_requirement_not_found": (404, "Requirement not found."),
            "not_owner": (403, "You cannot update this requirement."),
        }

        code, message = errors.get(
            result["error"],
            (400, "Unable to update requirement."),
        )

        raise HTTPException(code, message)

    return {
        "message": "Organ requirement updated successfully.",
        "requirement": result,
    }


# =========================================================
# CANCEL REQUIREMENT
# =========================================================

@router.delete("/{requirement_id}")
async def cancel_requirement(
    requirement_id: str,
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["uid"]

    await verify_requirement_owner(requirement_id, uid)

    result = await cancel_organ_requirement(requirement_id, uid)

    errors = {
        "invalid_requirement_id": (400, "Invalid requirement ID."),
        "organ_requirement_not_found": (404, "Requirement not found."),
        "not_owner": (403, "You cannot cancel this requirement."),
        "already_fulfilled": (409, "Requirement is already fulfilled."),
    }

    if isinstance(result, dict) and result.get("error"):
        code, message = errors.get(
            result["error"],
            (400, "Unable to cancel requirement."),
        )
        raise HTTPException(code, message)

    return {
        "message": "Organ requirement cancelled successfully.",
        "requirement": result,
    }


# =========================================================
# DONOR RESPONDS TO REQUIREMENT
# =========================================================

@router.post("/{requirement_id}/responses")
async def respond_to_requirement(
    requirement_id: str,
    response: OrganRequirementResponseCreate,
    current_user: dict = Depends(get_current_user),
):
    if response.requirement_id != requirement_id:
        raise HTTPException(
            status_code=400,
            detail="Requirement ID does not match the URL.",
        )

    if not ObjectId.is_valid(response.organ_donation_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid organ donation ID.",
        )

    uid = current_user["uid"]

    # The donor profile must belong to the signed-in Firebase user.
    donor = await database["organ_donations"].find_one({
        "_id": ObjectId(response.organ_donation_id),
        "user_id": uid,
    })

    if not donor:
        raise HTTPException(
            status_code=403,
            detail="Your organ donor profile was not found for this account.",
        )

    result = await create_organ_requirement_response(
        requirement_id,
        response.organ_donation_id,
    )

    errors = {
        "invalid_requirement_id": (400, "Invalid requirement ID."),
        "invalid_donation_id": (400, "Invalid donor ID."),
        "organ_requirement_not_found": (404, "Requirement not found."),
        "organ_donation_not_found": (404, "Donor profile not found."),
        "organ_requirement_not_active": (409, "Requirement is no longer active."),
        "organ_requirement_fulfilled": (409, "Requirement is already fulfilled."),
        "organ_not_pledged": (409, "You have not pledged the requested organ."),
        "donation_type_mismatch": (409, "Donation type does not match."),
        "already_responded": (409, "You have already responded."),
    }

    if isinstance(result, dict) and result.get("error"):
        code, message = errors.get(
            result["error"],
            (400, "Unable to submit response."),
        )

        raise HTTPException(
            status_code=code,
            detail=result.get("message", message),
        )

    return {
        "message": "Response submitted successfully.",
        "response": result,
    }


# =========================================================
# GET DONOR RESPONSES - REQUESTER ONLY
# =========================================================

@router.get("/{requirement_id}/responses")
async def get_requirement_responses(
    requirement_id: str,
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["uid"]

    # Verify and migrate legacy owner ID if safely possible.
    await verify_requirement_owner(requirement_id, uid)

    result = await get_organ_requirement_responses(
        requirement_id,
        uid,
    )

    if isinstance(result, dict) and result.get("error"):
        if result["error"] == "not_owner":
            raise HTTPException(
                status_code=403,
                detail="You are not the owner of this requirement.",
            )

        raise HTTPException(
            status_code=404,
            detail=result["error"],
        )

    return result


# =========================================================
# GET ACCEPTED DONORS
# =========================================================

@router.get("/{requirement_id}/accepted-donors")
async def get_accepted_donors(
    requirement_id: str,
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["uid"]

    await verify_requirement_owner(requirement_id, uid)

    result = await get_accepted_donors_for_requirement(
        requirement_id,
        uid,
    )

    if isinstance(result, dict) and result.get("error"):
        raise HTTPException(
            status_code=403,
            detail=result["error"],
        )

    return result


# =========================================================
# ACCEPT RESPONSE - SHARED FUNCTION
# =========================================================

async def _accept_response(
    requirement_id: str,
    response_id: str,
    uid: str,
):
    await verify_requirement_owner(requirement_id, uid)

    if not ObjectId.is_valid(response_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid response ID.",
        )

    response = await database["organ_requirement_responses"].find_one({
        "_id": ObjectId(response_id),
        "requirement_id": requirement_id,
    })

    if not response:
        raise HTTPException(
            status_code=404,
            detail="Donor response not found for this requirement.",
        )

    result = await accept_organ_requirement_response(
        response_id,
        uid,
    )

    errors = {
        "invalid_response_id": (400, "Invalid response ID."),
        "response_not_found": (404, "Response not found."),
        "organ_requirement_not_found": (404, "Requirement not found."),
        "not_owner": (403, "You cannot accept this response."),
        "response_not_pending": (409, "Response is no longer pending."),
        "organ_requirement_not_active": (409, "Requirement is no longer active."),
        "organ_requirement_fulfilled": (409, "Requirement is already fulfilled."),
    }

    if isinstance(result, dict) and result.get("error"):
        code, message = errors.get(
            result["error"],
            (400, "Unable to accept donor."),
        )
        raise HTTPException(code, message)

    return {
        "message": "Donor accepted successfully.",
        "response": result,
    }


# =========================================================
# ACCEPT RESPONSE - NON-NESTED URL
# =========================================================

@router.post("/responses/{response_id}/accept")
async def accept_response(
    response_id: str,
    current_user: dict = Depends(get_current_user),
):
    if not ObjectId.is_valid(response_id):
        raise HTTPException(400, "Invalid response ID.")

    response = await database["organ_requirement_responses"].find_one({
        "_id": ObjectId(response_id),
    })

    if not response:
        raise HTTPException(404, "Response not found.")

    return await _accept_response(
        response["requirement_id"],
        response_id,
        current_user["uid"],
    )


# =========================================================
# ACCEPT RESPONSE - NESTED URL
# =========================================================

@router.post("/{requirement_id}/responses/{response_id}/accept")
async def accept_nested_response(
    requirement_id: str,
    response_id: str,
    current_user: dict = Depends(get_current_user),
):
    return await _accept_response(
        requirement_id,
        response_id,
        current_user["uid"],
    )


# =========================================================
# REJECT RESPONSE - SHARED FUNCTION
# =========================================================

async def _reject_response(
    requirement_id: str,
    response_id: str,
    uid: str,
):
    await verify_requirement_owner(requirement_id, uid)

    if not ObjectId.is_valid(response_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid response ID.",
        )

    response = await database["organ_requirement_responses"].find_one({
        "_id": ObjectId(response_id),
        "requirement_id": requirement_id,
    })

    if not response:
        raise HTTPException(
            status_code=404,
            detail="Donor response not found.",
        )

    result = await reject_organ_requirement_response(
        response_id,
        uid,
    )

    errors = {
        "invalid_response_id": (400, "Invalid response ID."),
        "response_not_found": (404, "Response not found."),
        "organ_requirement_not_found": (404, "Requirement not found."),
        "not_owner": (403, "You cannot reject this response."),
        "response_not_pending": (409, "Response is no longer pending."),
    }

    if isinstance(result, dict) and result.get("error"):
        code, message = errors.get(
            result["error"],
            (400, "Unable to reject response."),
        )
        raise HTTPException(code, message)

    return {
        "message": "Donor response rejected successfully.",
        "response": result,
    }


# =========================================================
# REJECT RESPONSE - NON-NESTED URL
# =========================================================

@router.post("/responses/{response_id}/reject")
async def reject_response(
    response_id: str,
    current_user: dict = Depends(get_current_user),
):
    if not ObjectId.is_valid(response_id):
        raise HTTPException(400, "Invalid response ID.")

    response = await database["organ_requirement_responses"].find_one({
        "_id": ObjectId(response_id),
    })

    if not response:
        raise HTTPException(404, "Response not found.")

    return await _reject_response(
        response["requirement_id"],
        response_id,
        current_user["uid"],
    )


# =========================================================
# REJECT RESPONSE - NESTED URL
# =========================================================

@router.post("/{requirement_id}/responses/{response_id}/reject")
async def reject_nested_response(
    requirement_id: str,
    response_id: str,
    current_user: dict = Depends(get_current_user),
):
    return await _reject_response(
        requirement_id,
        response_id,
        current_user["uid"],
    )
