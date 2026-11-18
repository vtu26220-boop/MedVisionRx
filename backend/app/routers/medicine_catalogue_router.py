from fastapi import Depends, HTTPException
from app.admin.security import administrator, is_reviewer
from fastapi import APIRouter, Query

from app.schemas.medicine_catalogue import MedicineCatalogueCreate
from app.services.medicine_catalogue_service import (
    create_medicine,
    create_medicines_bulk,
    get_medicines,
    get_medicine_by_id,
    update_medicine,
    delete_medicine,
)
from app.services.medicine_image_service import search_medicine_image


def require_review_permission(data: MedicineCatalogueCreate, token: dict):
    if not data.verified:
        return
    if not is_reviewer(token):
        raise HTTPException(403, "Clinical reviewer permission is required to verify medicine information.")
    if not data.generic_name or not data.information_source or not data.information_source.startswith("https://"):
        raise HTTPException(422, "Verified medicines require a generic ingredient and an HTTPS information source.")


router = APIRouter(
    prefix="/api/medicine-catalogue",
    tags=["Medicine Catalogue"],
)


# =========================================================
# LIST / SEARCH MEDICINES
# =========================================================

@router.get("/")
async def list_medicines(
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=5000, ge=1, le=5000),
):
    return await get_medicines(
        search=search,
        category=category,
        page=page,
        limit=limit,
    )


# =========================================================
# BULK CREATE MEDICINES
# =========================================================

@router.post("/bulk", status_code=201, dependencies=[Depends(administrator)])
async def bulk_create_medicines(
    medicines: list[MedicineCatalogueCreate],
    admin_user: dict = Depends(administrator),
):
    for medicine in medicines:
        require_review_permission(medicine, admin_user)
    return await create_medicines_bulk(medicines)


# =========================================================
# MEDICINE IMAGE SEARCH
# IMPORTANT:
# This route must come before /{medicine_id}
# =========================================================

@router.get("/image-search")
async def medicine_image_search(
    medicine_name: str = Query(..., min_length=1),
):
    return await search_medicine_image(medicine_name)


# =========================================================
# GET MEDICINE DETAILS
# =========================================================

@router.get("/{medicine_id}")
async def medicine_details(
    medicine_id: str,
):
    return await get_medicine_by_id(medicine_id)


# =========================================================
# CREATE SINGLE MEDICINE
# =========================================================

@router.post("/", status_code=201, dependencies=[Depends(administrator)])
async def add_medicine(
    data: MedicineCatalogueCreate,
    admin_user: dict = Depends(administrator),
):
    require_review_permission(data, admin_user)
    return await create_medicine(data)


# =========================================================
# UPDATE MEDICINE
# =========================================================

@router.put("/{medicine_id}", dependencies=[Depends(administrator)])
async def edit_medicine(
    medicine_id: str,
    data: MedicineCatalogueCreate,
    admin_user: dict = Depends(administrator),
):
    require_review_permission(data, admin_user)
    return await update_medicine(
        medicine_id,
        data,
    )


# =========================================================
# DELETE MEDICINE
# =========================================================

@router.delete("/{medicine_id}", dependencies=[Depends(administrator)])
async def remove_medicine(
    medicine_id: str,
):
    return await delete_medicine(medicine_id)