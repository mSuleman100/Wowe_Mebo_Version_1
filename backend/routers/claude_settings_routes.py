import httpx
from fastapi import APIRouter, HTTPException

from backend.state.claude_settings import clear_claude_api_key, get_claude_settings, set_claude_model, set_claude_settings
from backend.types.schemas import ClaudeAPIRequest, ClaudeAPIResponse, ClaudeModelUpdateRequest, ClaudeSettingsResponse, ClaudeSettingsUpdateRequest

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


@router.post("/call", response_model=ClaudeAPIResponse)
async def call_claude(payload: ClaudeAPIRequest) -> ClaudeAPIResponse:
    """
    Proxy endpoint to call Claude API from backend (avoids CORS issues).
    Frontend sends prompt → Backend calls Claude API → Returns response
    """
    settings = get_claude_settings()
    api_key = settings.get("api_key", "").strip()
    model = settings.get("model", "claude-opus-4-7").strip()

    if not api_key:
        return ClaudeAPIResponse(is_ok=False, error="Claude API key not configured. Please add it in CONFIG panel.")

    # Prepare request body
    request_body = {
        "model": model,
        "max_tokens": payload.max_tokens,
        "temperature": payload.temperature,
        "messages": [{"role": msg.role, "content": msg.content} for msg in payload.messages],
    }
    if payload.system:
        request_body["system"] = payload.system

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                },
                json=request_body,
                timeout=30.0,
            )

            if not response.is_success:
                error_msg = "Claude API error"
                try:
                    error_data = response.json()
                    error_msg = error_data.get("error", {}).get("message", error_msg)
                except Exception:
                    error_msg = f"HTTP {response.status_code}: {response.text}"
                print(f"[Claude API Error] {error_msg}")
                return ClaudeAPIResponse(is_ok=False, error=error_msg)

            data = response.json()
            content = data.get("content", [{}])[0].get("text", "")
            return ClaudeAPIResponse(is_ok=True, content=content)

    except httpx.TimeoutException:
        return ClaudeAPIResponse(is_ok=False, error="Claude API request timeout. Please try again.")
    except Exception as e:
        error_str = str(e)
        print(f"[Claude API Exception] {error_str}")
        return ClaudeAPIResponse(is_ok=False, error=f"Error: {error_str}")
