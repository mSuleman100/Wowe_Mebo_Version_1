"""
==============================================================================
 WOWE Backend - API Schemas (backend/types/schemas.py)

 Author:   M. Suleman Anwar
 Date:     2026-01-15

 Purpose:
 - Pydantic models for request/response validation.
 - Keeps route handlers clean and consistent.
==============================================================================
"""

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="ok")


class CommandResponse(BaseModel):
    is_ok: bool
    cmd: str


class SequenceRequest(BaseModel):
    steps: list[str] = Field(default_factory=list, min_length=0)


class SequenceResponse(BaseModel):
    is_ok: bool
    steps_count: int


class TraceEvent(BaseModel):
    # Frontend sends these to /debug/trace so backend can print execution flow.
    t_ms: int = Field(ge=0)
    robot: str
    kind: str
    detail: str | None = None


class TraceRequest(BaseModel):
    run_id: str
    title: str | None = None
    events: list[TraceEvent] = Field(default_factory=list)


class ScriptRequest(BaseModel):
    script: dict  # JSON script: { "Series": [...] } or { "Parallel": [...] }


class ScriptResponse(BaseModel):
    is_ok: bool
    message: str

