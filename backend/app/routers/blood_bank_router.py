from fastapi import Depends
from app.admin.security import administrator
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.blood_bank import BloodBankCreate
from app.services.blood_bank_service import (
    create_blood_bank,
    delete_blood_bank,
    get_active_blood_banks,
    get_all_blood_banks,
    get_blood_bank_by_id,
    set_blood_bank_status,
    update_blood_bank,
)


router = APIRouter(
    prefix="/api/blood-banks",
    tags=["Blood Banks"],
)


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED, dependencies=[Depends(administrator)])
async def create_bank(
    blood_bank: BloodBankCreate,
):
    """
    Create a new blood bank.
    """

    try:
        return await create_blood_bank(
            blood_bank
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to create blood bank: "
                f"{str(e)}"
            ),
        )


@router.get("/")
async def get_banks(
    city: Optional[str] = Query(
        default=None,
        description="Filter by city",
    ),
    state: Optional[str] = Query(
        default=None,
        description="Filter by state",
    ),
):
    """
    Get active blood banks for users.
    """

    try:
        return await get_active_blood_banks(
            city=city,
            state=state,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to fetch blood banks: "
                f"{str(e)}"
            ),
        )


@router.get("/all", dependencies=[Depends(administrator)])
async def get_all_banks():
    """
    Get all blood banks.
    Intended for admin use.
    """

    try:
        return await get_all_blood_banks()

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to fetch all blood banks: "
                f"{str(e)}"
            ),
        )


@router.get("/{blood_bank_id}")
async def get_bank(
    blood_bank_id: str,
):
    """
    Get one blood bank by ID.
    """

    try:
        blood_bank = await get_blood_bank_by_id(
            blood_bank_id
        )

        if blood_bank is None:
            raise HTTPException(
                status_code=404,
                detail="Blood bank not found",
            )

        return blood_bank

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to fetch blood bank: "
                f"{str(e)}"
            ),
        )


@router.put("/{blood_bank_id}", dependencies=[Depends(administrator)])
async def edit_bank(
    blood_bank_id: str,
    blood_bank: BloodBankCreate,
):
    """
    Update an existing blood bank.
    """

    try:
        updated_bank = await update_blood_bank(
            blood_bank_id=blood_bank_id,
            blood_bank=blood_bank,
        )

        if updated_bank is None:
            raise HTTPException(
                status_code=404,
                detail="Blood bank not found",
            )

        return updated_bank

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to update blood bank: "
                f"{str(e)}"
            ),
        )


@router.patch("/{blood_bank_id}/status", dependencies=[Depends(administrator)])
async def change_bank_status(
    blood_bank_id: str,
    is_active: bool,
):
    """
    Enable or disable a blood bank.
    """

    try:
        blood_bank = await set_blood_bank_status(
            blood_bank_id=blood_bank_id,
            is_active=is_active,
        )

        if blood_bank is None:
            raise HTTPException(
                status_code=404,
                detail="Blood bank not found",
            )

        return blood_bank

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to change blood bank status: "
                f"{str(e)}"
            ),
        )


@router.delete("/{blood_bank_id}", dependencies=[Depends(administrator)])
async def remove_bank(
    blood_bank_id: str,
):
    """
    Permanently delete a blood bank.
    Intended for authorized admin use.
    """

    try:
        deleted = await delete_blood_bank(
            blood_bank_id
        )

        if not deleted:
            raise HTTPException(
                status_code=404,
                detail="Blood bank not found",
            )

        return {
            "message": "Blood bank deleted successfully",
            "blood_bank_id": blood_bank_id,
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to delete blood bank: "
                f"{str(e)}"
            ),
        )