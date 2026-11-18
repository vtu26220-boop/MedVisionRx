from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from app.core.firebase_admin import verify_firebase_token

from app.schemas.blood_requirement import (
    BloodRequirementCreate,
    BloodRequirementStatus,
)

from app.services.blood_requirement_service import (
    create_blood_requirement,
    delete_blood_requirement,
    get_all_blood_requirements,
    get_blood_requirement_by_id,
    get_blood_requirements,
    get_my_blood_requirements,
    update_blood_requirement_status,
)


router = APIRouter(
    prefix="/api/blood-requirements",
    tags=["Blood Requirement"],
)

security = HTTPBearer(auto_error=False)


# ============================================================
# FIREBASE AUTHENTICATION
# ============================================================

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        security
    ),
):
    """
    Verify the Firebase ID token and return the authenticated user.
    The UID is always taken from the verified token.
    """

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        decoded_token = verify_firebase_token(
            credentials.credentials
        )

        user_id = decoded_token.get("uid")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Firebase token: user UID is missing.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return decoded_token

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase ID token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_requirement_owner(
    requirement_id: str,
    current_user: dict,
):
    """
    Allow a user to modify only a requirement created by their
    authenticated Firebase account.
    """

    return current_user.get("uid")


# ============================================================
# CREATE BLOOD REQUIREMENT
# ============================================================

@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
)
async def create_requirement(
    requirement: BloodRequirementCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new blood requirement.

    The creator UID comes from the verified Firebase ID token,
    never from the request body.
    """

    try:
        return await create_blood_requirement(
            requirement,
            created_by_user_id=current_user["uid"],
        )

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to create blood requirement: "
                f"{str(e)}"
            ),
        )


# ============================================================
# GET ACTIVE / FILTERED BLOOD REQUIREMENTS
# ============================================================

@router.get("/")
async def get_requirements(
    blood_group: Optional[str] = Query(
        default=None,
        description="Filter by blood group, e.g. B+",
    ),
    status_filter: Optional[str] = Query(
        default="active",
        alias="status",
        description="Filter by requirement status",
    ),
):
    """
    Get blood requirements.

    Optional filters:
    - blood_group
    - status
    """

    try:
        return await get_blood_requirements(
            blood_group=blood_group,
            status=status_filter,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to fetch blood requirements: "
                f"{str(e)}"
            ),
        )


# ============================================================
# GET MY BLOOD REQUIREMENTS (COMPLETE HISTORY)
# ============================================================

@router.get("/my")
async def get_my_requirements(
    current_user: dict = Depends(get_current_user),
):
    """
    Return all blood requirements belonging to the authenticated
    Firebase user, including fulfilled, cancelled, and expired records.
    """
    try:
        return await get_my_blood_requirements(
            user_id=current_user["uid"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to fetch your blood requirements: {str(e)}",
        )


# ============================================================
# GET ALL BLOOD REQUIREMENTS
# ============================================================

@router.get("/all")
async def get_all_requirements():
    """
    Get all blood requirements.

    Intended for admin use.
    Includes active and non-active requirements.
    """

    try:
        return await get_all_blood_requirements()

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to fetch all blood requirements: "
                f"{str(e)}"
            ),
        )


# ============================================================
# GET ONE BLOOD REQUIREMENT
# ============================================================

@router.get("/{requirement_id}")
async def get_requirement(
    requirement_id: str,
):
    """
    Get one blood requirement by ID.
    """

    try:
        requirement = await get_blood_requirement_by_id(
            requirement_id
        )

        if requirement is None:
            raise HTTPException(
                status_code=404,
                detail="Blood requirement not found",
            )

        return requirement

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to fetch blood requirement: "
                f"{str(e)}"
            ),
        )


# ============================================================
# UPDATE BLOOD REQUIREMENT STATUS
# ============================================================

@router.patch("/{requirement_id}/status")
async def update_requirement_status(
    requirement_id: str,
    status_value: BloodRequirementStatus,
    current_user: dict = Depends(get_current_user),
):
    """
    Update the status of a blood requirement.

    Only the Firebase-authenticated creator can update it.
    """

    try:
        existing_requirement = await get_blood_requirement_by_id(
            requirement_id
        )

        if existing_requirement is None:
            raise HTTPException(
                status_code=404,
                detail="Blood requirement not found",
            )

        if existing_requirement.get("created_by_user_id") != current_user.get("uid"):
            raise HTTPException(
                status_code=403,
                detail="You are not allowed to update this blood requirement.",
            )

        requirement = await update_blood_requirement_status(
            requirement_id=requirement_id,
            status=status_value,
        )

        if requirement is None:
            raise HTTPException(
                status_code=404,
                detail="Blood requirement not found",
            )

        return requirement

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to update blood requirement status: "
                f"{str(e)}"
            ),
        )


# ============================================================
# DELETE BLOOD REQUIREMENT
# ============================================================

@router.delete("/{requirement_id}")
async def delete_requirement(
    requirement_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a blood requirement.

    Only the Firebase-authenticated creator can delete it.
    """

    try:
        existing_requirement = await get_blood_requirement_by_id(
            requirement_id
        )

        if existing_requirement is None:
            raise HTTPException(
                status_code=404,
                detail="Blood requirement not found",
            )

        if existing_requirement.get("created_by_user_id") != current_user.get("uid"):
            raise HTTPException(
                status_code=403,
                detail="You are not allowed to delete this blood requirement.",
            )

        deleted = await delete_blood_requirement(
            requirement_id
        )

        if not deleted:
            raise HTTPException(
                status_code=404,
                detail="Blood requirement not found",
            )

        return {
            "message": "Blood requirement deleted successfully",
            "requirement_id": requirement_id,
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to delete blood requirement: "
                f"{str(e)}"
            ),
        )
