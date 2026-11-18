from typing import Optional
from datetime import datetime, timezone

from bson import ObjectId
from app.db.mongodb import database

from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    status,
    Depends,
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.firebase_admin import verify_firebase_token

from app.schemas.blood_donor import (
    BloodDonorCreate,
    BloodDonationCreate,
)

from app.services.blood_donor_service import (
    create_blood_donor,
    get_blood_donor_by_id,
    get_blood_donor_by_user_id,
    get_blood_donor_by_contact,
    update_blood_donor,
    get_all_blood_donors,
    get_blood_donation_dashboard_stats,
    create_blood_donation,
    get_donation_history,
    get_latest_donation_history,
    delete_blood_donation,
    get_blood_requirement_donor_responses,
    accept_blood_donation_response,
    reject_blood_donation_response,
)


router = APIRouter(
    prefix="/api/blood-donors",
    tags=["Blood Donors"],
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=True)),
) -> str:
    try:
        decoded = verify_firebase_token(credentials.credentials)
        uid = decoded.get("uid")
        if not uid:
            raise ValueError("Firebase token does not contain a user ID.")
        return str(uid)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase ID token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============================================================
# CREATE BLOOD DONOR
# ============================================================

@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
)
async def create_donor(
    donor: BloodDonorCreate,
    current_user_id: str = Depends(get_current_user),
):
    try:
        result = await create_blood_donor(
            donor, current_user_id
        )

        if result is None:
            raise HTTPException(status_code=400, detail="Unable to create blood donor.")
        if result.get("duplicate"):
            raise HTTPException(status_code=409, detail=result.get("message", "Duplicate donor information."))
        return result

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create blood donor: {str(e)}",
        )


# ============================================================
# DASHBOARD STATISTICS
# ============================================================

@router.get(
    "/dashboard/stats",
)
async def dashboard_stats(
    user_id: Optional[str] = Query(default=None),
    current_user_id: str = Depends(get_current_user),
):
    try:
        # The query-string user_id is retained for URL compatibility but is never trusted.
        return await get_blood_donation_dashboard_stats(
            user_id=current_user_id
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load dashboard statistics: {str(e)}",
        )


# ============================================================
# GET ALL DONORS
# ============================================================

@router.get(
    "/",
)
async def get_donors(current_user_id: str = Depends(get_current_user)):
    try:
        return await get_all_blood_donors()

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load blood donors: {str(e)}",
        )


# ============================================================
# GET DONOR BY USER ID
# ============================================================

@router.get(
    "/by-user/{user_id}",
)
async def get_donor_by_user(
    user_id: str,
    current_user_id: str = Depends(get_current_user),
):
    try:
        if user_id != current_user_id:
            raise HTTPException(status_code=403, detail="You cannot access another user's donor profile.")
        donor = await get_blood_donor_by_user_id(
            current_user_id
        )

        if donor is None:
            raise HTTPException(
                status_code=404,
                detail="Blood donor not found for this user.",
            )

        return donor

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to find blood donor: {str(e)}",
        )


# ============================================================
# GET DONOR BY EMAIL / PHONE
# ============================================================

@router.get(
    "/by-contact",
)
async def get_donor_by_contact(
    email: Optional[str] = Query(default=None),
    phone: Optional[str] = Query(default=None),
    current_user_id: str = Depends(get_current_user),
):
    try:
        # Contact lookup is scoped to the authenticated account.
        donor = await get_blood_donor_by_contact(
            email=email,
            phone=phone,
            current_user_id=current_user_id,
        )

        if donor is None:
            raise HTTPException(
                status_code=404,
                detail="Blood donor not found.",
            )

        return donor

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to find blood donor: {str(e)}",
        )


# ============================================================
# UPDATE BLOOD DONOR
# ============================================================

@router.put(
    "/{donor_id}",
)
async def update_donor(
    donor_id: str,
    donor: BloodDonorCreate,
    current_user_id: str = Depends(get_current_user),
):
    try:
        result = await update_blood_donor(
            donor_id,
            donor,
            current_user_id,
        )

        if result is None:
            raise HTTPException(
                status_code=404,
                detail="Blood donor not found.",
            )

        if result.get("duplicate"):
            raise HTTPException(
                status_code=409,
                detail=result.get(
                    "message",
                    "Duplicate donor information.",
                ),
            )

        return result

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update blood donor: {str(e)}",
        )


# ============================================================
# SAVED DONORS (PRIVATE TO THE AUTHENTICATED USER)
# ============================================================

saved_blood_donors_collection = database["saved_blood_donors"]
blood_donors_collection = database["blood_donors"]


@router.get("/saved")
async def get_saved_donors(
    current_user_id: str = Depends(get_current_user),
):
    """Return only donors saved by the authenticated Firebase user."""
    try:
        saved_cursor = saved_blood_donors_collection.find(
            {"user_id": current_user_id}
        ).sort("created_at", -1)

        donors = []
        async for saved in saved_cursor:
            donor_id = saved.get("donor_id")
            if not donor_id or not ObjectId.is_valid(str(donor_id)):
                continue

            donor = await blood_donors_collection.find_one(
                {"_id": ObjectId(str(donor_id))},
                {
                    "full_name": 1,
                    "blood_group": 1,
                    "city": 1,
                    "state": 1,
                    "phone": 1,
                    "email": 1,
                    "address": 1,
                    "availability": 1,
                    "verification_status": 1,
                    "last_donation_date": 1,
                },
            )
            if donor is None:
                continue

            donor["id"] = str(donor.pop("_id"))
            donors.append(donor)

        return {"donors": donors, "count": len(donors)}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load saved donors: {str(e)}",
        )


@router.post("/saved/{donor_id}", status_code=status.HTTP_201_CREATED)
async def save_donor(
    donor_id: str,
    current_user_id: str = Depends(get_current_user),
):
    """Save a donor for the authenticated user; repeated saves are idempotent."""
    try:
        if not ObjectId.is_valid(donor_id):
            raise HTTPException(status_code=400, detail="Invalid donor ID.")

        donor = await blood_donors_collection.find_one(
            {"_id": ObjectId(donor_id)},
            {"user_id": 1},
        )
        if donor is None:
            raise HTTPException(status_code=404, detail="Donor not found.")
        # Saving is a personal bookmark action. Do not reject a donor based
        # on profile ownership: accepted responses and donor profiles can
        # legitimately refer to the same Firebase account in test data.

        await saved_blood_donors_collection.update_one(
            {"user_id": current_user_id, "donor_id": donor_id},
            {
                "$setOnInsert": {
                    "user_id": current_user_id,
                    "donor_id": donor_id,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            },
            upsert=True,
        )
        return {"message": "Donor saved successfully.", "donor_id": donor_id, "saved": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save donor: {str(e)}",
        )


@router.delete("/saved/{donor_id}")
async def unsave_donor(
    donor_id: str,
    current_user_id: str = Depends(get_current_user),
):
    """Remove a saved donor without affecting the donor's actual profile."""
    try:
        result = await saved_blood_donors_collection.delete_one(
            {"user_id": current_user_id, "donor_id": donor_id}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="This donor is not in your saved list.")
        return {"message": "Donor removed from Saved Donors.", "donor_id": donor_id, "saved": False}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to remove saved donor: {str(e)}",
        )


# ============================================================
# GET DONOR BY ID
# ============================================================

@router.get(
    "/{donor_id}",
)
async def get_donor(
    donor_id: str,
    current_user_id: str = Depends(get_current_user),
):
    try:
        donor = await get_blood_donor_by_id(
            donor_id, current_user_id
        )

        if donor is None:
            raise HTTPException(
                status_code=404,
                detail="Blood donor not found.",
            )

        return donor

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load blood donor: {str(e)}",
        )


# ============================================================
# CREATE DONATION RESPONSE
# ============================================================

@router.post(
    "/{donor_id}/donations",
)
async def create_donation(
    donor_id: str,
    donation: BloodDonationCreate,
    current_user_id: str = Depends(get_current_user),
):
    """
    Donor clicks "Donate Blood".

    This creates a PENDING response.

    The requester must later accept this donor.
    """

    try:
        # Make sure the URL donor ID and payload donor ID
        # cannot accidentally refer to different donors.
        if donation.donor_id != donor_id:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Donor ID in the URL does not match "
                    "the donor ID in the request."
                ),
            )

        result = await create_blood_donation(
            donation, current_user_id
        )

        if result is None:
            raise HTTPException(
                status_code=404,
                detail="Blood donor or requirement not found.",
            )

        if result.get("error"):
            error_code = result.get(
                "error"
            )

            error_status_map = {
                "blood_requirement_not_found": 404,
                "blood_requirement_not_active": 409,
                "blood_requirement_fulfilled": 409,
                "blood_group_mismatch": 409,
                "already_donated": 409,
                "not_owner": 403,
            }

            raise HTTPException(
                status_code=error_status_map.get(
                    error_code,
                    400,
                ),
                detail=result.get(
                    "message",
                    "Unable to create donation response.",
                ),
            )

        return result

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create donation response: {str(e)}",
        )


# ============================================================
# GET DONATION HISTORY
# ============================================================

@router.get(
    "/{donor_id}/donations",
)
async def donation_history(
    donor_id: str,
    current_user_id: str = Depends(get_current_user),
):
    try:
        history = await get_donation_history(
            donor_id, current_user_id
        )

        if history is None:
            raise HTTPException(
                status_code=404,
                detail="Blood donor not found.",
            )

        return history

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load donation history: {str(e)}",
        )


# ============================================================
# GET DONOR RESPONSES FOR A BLOOD REQUIREMENT
# ============================================================

@router.get(
    "/requirements/{requirement_id}/donors",
)
async def requirement_donor_responses(
    requirement_id: str,
    user_id: Optional[str] = Query(default=None),
    current_user_id: str = Depends(get_current_user),
):
    """
    Used by the person who created a blood requirement.

    Shows all users who responded to the requirement.
    """

    try:
        result = await get_blood_requirement_donor_responses(
            requirement_id=requirement_id,
            requester_user_id=current_user_id,
        )

        if result is None:
            raise HTTPException(
                status_code=404,
                detail="Blood requirement not found.",
            )

        if result.get("error") == "not_owner":
            raise HTTPException(
                status_code=403,
                detail=result.get(
                    "message",
                    "You are not allowed to view these donors.",
                ),
            )

        return result

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load donor responses: {str(e)}",
        )


# ============================================================
# ACCEPT DONOR RESPONSE
# ============================================================

@router.post(
    "/donations/{donation_id}/accept",
)
async def accept_donation_response(
    donation_id: str,
    user_id: Optional[str] = Query(default=None),
    current_user_id: str = Depends(get_current_user),
):
    """
    Requester selects a donor.

    This changes the response from:

        pending -> accepted

    and then:

        - creates the actual donation history
        - increments donor total donations
        - updates donor last donation date
        - increments requirement fulfilled units
        - updates remaining units
        - may mark the requirement fulfilled
    """

    try:
        result = await accept_blood_donation_response(
            donation_id=donation_id,
            requester_user_id=current_user_id,
        )

        if result is None:
            raise HTTPException(
                status_code=404,
                detail="Donation response not found.",
            )

        if result.get("error"):
            error_code = result.get(
                "error"
            )

            error_status_map = {
                "not_owner": 403,
                "already_accepted": 409,
                "response_not_pending": 409,
                "insufficient_units": 409,
                "blood_requirement_not_found": 404,
            }

            raise HTTPException(
                status_code=error_status_map.get(
                    error_code,
                    400,
                ),
                detail=result.get(
                    "message",
                    "Unable to accept donor.",
                ),
            )

        return {
            "message": "Donor accepted successfully.",
            "donation": result,
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to accept donor response: {str(e)}",
        )


# ============================================================
# REJECT DONOR RESPONSE
# ============================================================

@router.post(
    "/donations/{donation_id}/reject",
)
async def reject_donation_response(
    donation_id: str,
    user_id: Optional[str] = Query(default=None),
    current_user_id: str = Depends(get_current_user),
):
    try:
        result = await reject_blood_donation_response(
            donation_id=donation_id,
            requester_user_id=current_user_id,
        )

        if result is None:
            raise HTTPException(
                status_code=404,
                detail="Donation response not found.",
            )

        if result.get("error"):
            error_code = result.get(
                "error"
            )

            error_status_map = {
                "not_owner": 403,
                "response_not_pending": 409,
            }

            raise HTTPException(
                status_code=error_status_map.get(
                    error_code,
                    400,
                ),
                detail=result.get(
                    "message",
                    "Unable to reject donor response.",
                ),
            )

        return result

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reject donor response: {str(e)}",
        )


# ============================================================
# DELETE DONATION / RESPONSE
# ============================================================

@router.delete(
    "/donations/{donation_id}",
)
async def delete_donation(
    donation_id: str,
    current_user_id: str = Depends(get_current_user),
):
    try:
        deleted = await delete_blood_donation(
            donation_id, current_user_id
        )

        if not deleted:
            raise HTTPException(
                status_code=404,
                detail="Donation record not found.",
            )

        return {
            "message": "Donation record deleted successfully.",
            "id": donation_id,
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete donation record: {str(e)}",
        )


# ============================================================
# TEMPORARY LATEST HISTORY
# ============================================================

@router.get(
    "/history/latest",
)
async def latest_history(current_user_id: str = Depends(get_current_user)):
    try:
        return await get_latest_donation_history(current_user_id)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load latest donation history: {str(e)}",
        )
    