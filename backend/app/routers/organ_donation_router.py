from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.organ_donation import (
    DonationType,
    OrganDonationCreate,
    OrganDonationResponse,
    OrganDonationStatus,
)

from app.services.organ_donation_service import (
    cancel_organ_donation,
    create_organ_donation,
    delete_organ_donation,
    get_active_organ_donations,
    get_all_organ_donations,
    get_donor_organ_requests,
    get_organ_donation_by_id,
    get_organ_donation_history,
    get_user_organ_donation,
    reactivate_organ_donation,
    update_organ_donation_status,
)


router = APIRouter(
    prefix="/api/organ-donations",
    tags=["Organ Donation"],
)


# =========================================================
# CREATE / REGISTER / UPDATE ORGAN DONATION PLEDGE
# =========================================================

@router.post(
    "/",
    response_model=OrganDonationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_organ_donation_pledge(
    donation: OrganDonationCreate,
    user_id: Optional[str] = Query(
        default=None,
        description="MedVisionRx user ID associated with this pledge.",
    ),
):
    """
    Save a donor pledge. When user_id is supplied, update the
    existing pledge for that user instead of creating a duplicate.
    """
    normalized_user_id = user_id.strip() if user_id else None

    try:
        return await create_organ_donation(
            donation=donation,
            created_by_user_id=normalized_user_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save the organ donation pledge.",
        ) from exc


# =========================================================
# GET ACTIVE ORGAN DONATIONS
# =========================================================

@router.get("/")
async def get_active_donations(
    donation_type: Optional[DonationType] = Query(default=None),
):
    try:
        donations = await get_active_organ_donations(
            donation_type=donation_type.value if donation_type else None
        )
        return donations
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load organ donation pledges.",
        ) from exc


# =========================================================
# GET CURRENT USER'S ORGAN DONOR PROFILE
# =========================================================

@router.get(
    "/by-user/{user_id}",
    response_model=OrganDonationResponse,
)
async def get_donation_by_user(user_id: str):
    """
    Return only the pledge associated with the requested MedVisionRx
    user ID. The service also checks legacy owner-field names.
    """
    normalized_user_id = (user_id or "").strip()

    if not normalized_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID is required.",
        )

    try:
        donation = await get_user_organ_donation(normalized_user_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load the organ donor profile.",
        ) from exc

    if donation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No organ donor registration was found for this user ID. "
                "Check that the registration was saved with the same user ID."
            ),
        )

    return donation


# =========================================================
# ORGAN DONATION REQUESTS
# =========================================================

@router.get("/requests")
async def get_donor_requests(user_id: str = Query(...)):
    normalized_user_id = (user_id or "").strip()
    if not normalized_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID is required.",
        )

    try:
        return await get_donor_organ_requests(normalized_user_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load organ donation requests.",
        ) from exc


# =========================================================
# ORGAN DONATION HISTORY
# =========================================================

@router.get("/history")
async def get_donation_history(user_id: str = Query(...)):
    normalized_user_id = (user_id or "").strip()
    if not normalized_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID is required.",
        )

    try:
        history = await get_organ_donation_history(normalized_user_id)
        return {
            "success": True,
            "count": len(history),
            "data": history,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load organ donation history.",
        ) from exc


# =========================================================
# GET ALL ORGAN DONATIONS (ADMIN)
# =========================================================

@router.get("/admin/all")
async def get_all_donations():
    try:
        donations = await get_all_organ_donations()
        return {
            "success": True,
            "count": len(donations),
            "data": donations,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load all organ donation pledges.",
        ) from exc


# =========================================================
# GET ONE ORGAN DONATION PLEDGE
# =========================================================

@router.get(
    "/{donation_id}",
    response_model=OrganDonationResponse,
)
async def get_organ_donation(donation_id: str):
    donation = await get_organ_donation_by_id(donation_id)
    if not donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organ donation pledge not found.",
        )
    return donation


# =========================================================
# UPDATE ONE ORGAN DONATION STATUS
# =========================================================

@router.patch(
    "/{donation_id}/status",
    response_model=OrganDonationResponse,
)
async def update_donation_status(
    donation_id: str,
    new_status: OrganDonationStatus,
):
    updated_donation = await update_organ_donation_status(
        donation_id=donation_id,
        status=new_status,
    )
    if not updated_donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organ donation pledge not found.",
        )
    return updated_donation


# =========================================================
# CANCEL ORGAN DONATION
# =========================================================

@router.patch(
    "/{donation_id}/cancel",
    response_model=OrganDonationResponse,
)
async def cancel_donation(donation_id: str):
    cancelled_donation = await cancel_organ_donation(donation_id)
    if not cancelled_donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organ donation pledge not found.",
        )
    return cancelled_donation


# =========================================================
# REACTIVATE ORGAN DONATION
# =========================================================

@router.patch(
    "/{donation_id}/reactivate",
    response_model=OrganDonationResponse,
)
async def reactivate_donation(donation_id: str):
    donation = await reactivate_organ_donation(donation_id)
    if not donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organ donation pledge not found.",
        )
    return donation


# =========================================================
# PERMANENTLY DELETE ORGAN DONATION
# =========================================================

@router.delete(
    "/{donation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_donation(donation_id: str):
    deleted = await delete_organ_donation(donation_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organ donation pledge not found.",
        )
    return None
