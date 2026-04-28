from threading import Lock


_DEFAULT_MODEL = "claude-opus-4-7"
_lock = Lock()
_settings = {
    "api_key": "",
    "model": _DEFAULT_MODEL,
}


def _mask_api_key(api_key: str) -> str | None:
    key = (api_key or "").strip()
    if not key:
        return None
    if len(key) <= 8:
        return "*" * len(key)
    return f"{key[:4]}{'*' * max(4, len(key) - 8)}{key[-4:]}"


def get_claude_settings() -> dict[str, str | bool | None]:
    with _lock:
        api_key = _settings["api_key"]
        model = _settings["model"] or _DEFAULT_MODEL
    return {
        "is_ok": True,
        "is_configured": bool((api_key or "").strip()),
        "model": model,
        "api_key_masked": _mask_api_key(api_key),
    }


def set_claude_settings(*, api_key: str, model: str | None = None) -> dict[str, str | bool | None]:
    with _lock:
        _settings["api_key"] = (api_key or "").strip()
        if model and model.strip():
            _settings["model"] = model.strip()
    return get_claude_settings()


def set_claude_model(*, model: str) -> dict[str, str | bool | None]:
    with _lock:
        _settings["model"] = (model or "").strip() or _DEFAULT_MODEL
    return get_claude_settings()


def clear_claude_api_key() -> dict[str, str | bool | None]:
    with _lock:
        _settings["api_key"] = ""
    return get_claude_settings()
