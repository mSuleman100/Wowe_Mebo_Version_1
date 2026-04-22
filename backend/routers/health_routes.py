"""
==============================================================================
 WOWE Backend - Health Routes (backend/routers/health_routes.py)

 Author:   M. Suleman Anwar
 Date:     2026-01-15

 Purpose:
 - Simple liveness check used by the frontend to show ONLINE/OFFLINE.
==============================================================================
"""

from fastapi import APIRouter

from backend.types.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Return backend liveness status."""
    return HealthResponse(status="ok")

