from fastapi import APIRouter, HTTPException

from backend.state.robot_registry import list_robots, register_robot
from backend.types.schemas import RobotEntry, RobotRegistrationRequest, RobotRegistrationResponse

router = APIRouter()


@router.get("/robots", response_model=list[RobotEntry])
def get_robots() -> list[RobotEntry]:
    return [RobotEntry(**robot) for robot in list_robots()]


@router.post("/robots/register", response_model=RobotRegistrationResponse)
def post_register_robot(payload: RobotRegistrationRequest) -> RobotRegistrationResponse:
    robot_type = payload.type.strip().lower()
    if robot_type not in {"wowe", "mebo"}:
        raise HTTPException(status_code=400, detail="type must be 'wowe' or 'mebo'")

    device_id = payload.device_id.strip().lower()
    if not device_id:
        raise HTTPException(status_code=400, detail="device_id is required")

    feed_id = payload.feed_id.strip().lower()
    if not feed_id:
        raise HTTPException(status_code=400, detail="feed_id is required")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    robot = register_robot(
        name=name,
        robot_type=robot_type,
        device_id=device_id,
        feed_id=feed_id,
    )
    return RobotRegistrationResponse(is_ok=True, robot=RobotEntry(**robot))
