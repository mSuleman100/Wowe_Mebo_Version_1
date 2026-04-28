from fastapi import APIRouter, HTTPException

from backend.state.claude_settings import clear_claude_api_key, get_claude_settings, set_claude_model, set_claude_settings
from backend.types.schemas import ClaudeModelUpdateRequest, ClaudeSettingsResponse, ClaudeSettingsUpdateRequest

router = APIRouter(prefix="/claude/settings", tags=["claude-settings"])

_ALLOWED_MODELS = {
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-6",
    "claude-opus-4-7",
}


def _validate_model(model: str) -> str:
    normalized = (model or "").strip()
    if normalized not in _ALLOWED_MODELS:
        raise HTTPException(status_code=400, detail="Unsupported Claude model.")
    return normalized


@router.get("", response_model=ClaudeSettingsResponse)
def get_settings() -> ClaudeSettingsResponse:
    return ClaudeSettingsResponse(**get_claude_settings())


@router.post("", response_model=ClaudeSettingsResponse)
def post_settings(payload: ClaudeSettingsUpdateRequest) -> ClaudeSettingsResponse:
    api_key = (payload.api_key or "").strip()
    if not api_key:
        raise HTTPException(status_code=400, detail="api_key is required")
    model = _validate_model(payload.model) if payload.model else None
    return ClaudeSettingsResponse(**set_claude_settings(api_key=api_key, model=model))


@router.post("/model", response_model=ClaudeSettingsResponse)
def post_model(payload: ClaudeModelUpdateRequest) -> ClaudeSettingsResponse:
    model = _validate_model(payload.model)
    return ClaudeSettingsResponse(**set_claude_model(model=model))


@router.delete("", response_model=ClaudeSettingsResponse)
def delete_api_key() -> ClaudeSettingsResponse:
    return ClaudeSettingsResponse(**clear_claude_api_key())
