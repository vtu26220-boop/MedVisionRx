from fastapi import Depends
from app.admin.security import administrator
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.organ_bank import (
    OrganBankBulkResponse,
    OrganBankCreate,
    OrganBankStatusUpdate,
    OrganBankUpdate,
)

from app.services.organ_bank_service import (
    change_organ_bank_status,
    create_organ_bank,
    create_organ_banks_bulk,
    delete_organ_bank,
    get_all_organ_banks,
    get_organ_bank_by_id,
    get_organ_banks,
    update_organ_bank,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/organ-banks",
    tags=["Organ Banks"],
)


# ============================================================
# FRONTEND RESPONSE HELPER
# ============================================================

def prepare_bank_response(
    bank: dict,
) -> dict:
    """
    Keep the backend field website_url while also exposing
    website because the OrganBanks frontend uses `website`.
    """

    if not bank:
        return bank

    result = dict(bank)

    result["website"] = result.get(
        "website_url"
    )

    # Frontend compatibility
    result["verified"] = result.get(
        "is_active",
        False,
    )

    return result


def prepare_bank_list(
    banks: list[dict],
) -> list[dict]:

    return [
        prepare_bank_response(bank)
        for bank in banks
    ]


# ============================================================
# CREATE ORGAN BANK
# ============================================================

@router.post(
    "/",
    status_code=status.HTTP_201_CREATED, dependencies=[Depends(administrator)])
async def create_bank(
    bank: OrganBankCreate,
):
    """
    Create one Organ Bank.
    """

    result = await create_organ_bank(
        bank
    )

    return prepare_bank_response(
        result
    )


# ============================================================
# BULK CREATE ORGAN BANKS
# ============================================================

@router.post(
    "/bulk",
    status_code=status.HTTP_201_CREATED, dependencies=[Depends(administrator)])
async def create_banks_bulk(
    banks: list[OrganBankCreate],
):
    """
    Add multiple Organ Banks at once.

    This endpoint is used to insert the 100+
    Organ Bank records through the backend API.
    """

    result = await create_organ_banks_bulk(
        banks
    )

    result["records"] = (
        prepare_bank_list(
            result.get(
                "records",
                [],
            )
        )
    )

    return result


# ============================================================
# GET ACTIVE ORGAN BANKS
# ============================================================

@router.get(
    "/",
)
async def get_banks(
    search: Optional[str] = Query(
        default=None,
        description=(
            "Search by name, organisation, "
            "address, city or state"
        ),
    ),
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
    Get active Organ Banks.
    """

    banks = await get_organ_banks(
        search=search,
        city=city,
        state=state,
    )

    return prepare_bank_list(
        banks
    )


# ============================================================
# GET ALL ORGAN BANKS
# ============================================================

@router.get(
    "/all", dependencies=[Depends(administrator)])
async def get_all_banks():
    """
    Get all Organ Banks including inactive records.
    """

    banks = await get_all_organ_banks()

    return prepare_bank_list(
        banks
    )


# ============================================================
# GET ONE ORGAN BANK
# ============================================================

@router.get(
    "/{organ_bank_id}",
)
async def get_bank(
    organ_bank_id: str,
):
    """
    Get one Organ Bank by ID.
    """

    bank = await get_organ_bank_by_id(
        organ_bank_id
    )

    if bank is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organ Bank not found.",
        )

    return prepare_bank_response(
        bank
    )


# ============================================================
# EDIT ORGAN BANK
# ============================================================

@router.put(
    "/{organ_bank_id}", dependencies=[Depends(administrator)])
async def edit_bank(
    organ_bank_id: str,
    bank: OrganBankUpdate,
):
    """
    Edit an Organ Bank.
    """

    updated_bank = await update_organ_bank(
        organ_bank_id,
        bank,
    )

    if updated_bank is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organ Bank not found.",
        )

    return prepare_bank_response(
        updated_bank
    )


# ============================================================
# REMOVE ORGAN BANK
# ============================================================

@router.delete(
    "/{organ_bank_id}", dependencies=[Depends(administrator)])
async def remove_bank(
    organ_bank_id: str,
):
    """
    Permanently remove an Organ Bank.
    """

    deleted = await delete_organ_bank(
        organ_bank_id
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organ Bank not found.",
        )

    return {
        "message": (
            "Organ Bank removed successfully."
        ),
        "id": organ_bank_id,
    }


# ============================================================
# CHANGE ORGAN BANK STATUS
# ============================================================

@router.patch(
    "/{organ_bank_id}/status", dependencies=[Depends(administrator)])
async def change_bank_status(
    organ_bank_id: str,
    status_data: OrganBankStatusUpdate,
):
    """
    Activate or deactivate an Organ Bank.
    """

    updated_bank = (
        await change_organ_bank_status(
            organ_bank_id,
            status_data.is_active,
        )
    )

    if updated_bank is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organ Bank not found.",
        )

    return prepare_bank_response(
        updated_bank
    )