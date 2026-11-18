from app.admin.tls import enable_system_certificates

enable_system_certificates()

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.admin.router import router as admin_router
from app.admin.policy import AdminPolicyMiddleware

from app.db.mongodb import database

from app.routers.blood_donor_router import (
    router as blood_donor_router,
)

from app.routers.blood_requirement_router import (
    router as blood_requirement_router,
)

from app.routers.blood_bank_router import (
    router as blood_bank_router,
)

from app.routers.organ_donation_router import (
    router as organ_donation_router,
)

from app.routers.organ_bank_router import (
    router as organ_bank_router,
)

from app.routers.organ_requirement_router import (
    router as organ_requirement_router,
)

from app.routers.prescription_router import router as prescription_router

from app.routers.medicine_catalogue_router import (
    router as medicine_catalogue_router,
)

from app.routers.users_router import (
    router as users_router,
)

app = FastAPI(
    title="MedVisionRx API",
    description="Healthcare platform backend for MedVisionRx",
    version="1.0.0",
)


# ==========================================
# CORS
# ==========================================

app.add_middleware(AdminPolicyMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ] + [origin.strip().rstrip("/") for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# ROUTERS
# ==========================================

app.include_router(
    blood_donor_router
)

app.include_router(
    blood_requirement_router
)

app.include_router(
    blood_bank_router
)

app.include_router(
    organ_donation_router
)

app.include_router(
    organ_bank_router
)

app.include_router(
    organ_requirement_router
)

app.include_router(prescription_router)
app.include_router(admin_router)

app.include_router(medicine_catalogue_router)

app.include_router(
    users_router
)

# ==========================================
# ROOT
# ==========================================

@app.get("/")
async def root():
    return {
        "message": "MedVisionRx API is running",
        "database": database.name,
    }


# ==========================================
# API HEALTH
# ==========================================

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "MedVisionRx API",
    }


# ==========================================
# DATABASE HEALTH
# ==========================================

@app.get("/health/database")
async def database_health():
    try:
        await database.command("ping")

        return {
            "status": "connected",
            "database": database.name,
            "message": (
                "MongoDB Atlas connection successful"
            ),
        }

    except Exception as e:
        return {
            "status": "error",
            "message": (
                "MongoDB connection failed"
            ),
            "error": str(e),
        }
