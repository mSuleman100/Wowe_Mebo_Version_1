from threading import Lock


_lock = Lock()
_registry: dict[str, dict[str, str]] = {}


def _norm(value: str) -> str:
    return (value or "").strip().lower()


def _key(*, robot_type: str, device_id: str) -> str:
    return f"{_norm(robot_type)}:{_norm(device_id)}"


def register_robot(*, name: str, robot_type: str, device_id: str, feed_id: str) -> dict[str, str]:
    normalized_type = _norm(robot_type) or "wowe"
    normalized_device = _norm(device_id)
    normalized_feed = _norm(feed_id) or normalized_device
    normalized_name = (name or "").strip() or normalized_device.upper()
    entry = {
        "name": normalized_name,
        "type": normalized_type,
        "device_id": normalized_device,
        "feed_id": normalized_feed,
    }
    with _lock:
        _registry[_key(robot_type=normalized_type, device_id=normalized_device)] = entry
    return entry


def touch_device(*, device_id: str, robot_type: str) -> dict[str, str]:
    normalized_device = _norm(device_id)
    return register_robot(
        name=normalized_device.upper(),
        robot_type=robot_type,
        device_id=normalized_device,
        feed_id=normalized_device,
    )


def list_robots() -> list[dict[str, str]]:
    with _lock:
        return [value.copy() for value in _registry.values()]
