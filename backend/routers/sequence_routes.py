"""
==============================================================================
 WOWE Backend - Sequence Routes (backend/routers/sequence_routes.py)

 Author:   M. Suleman Anwar
 Date:     2026-01-15

 Purpose:
 - Receive a list of steps from the UI and store/execute them.

 Notes:
 - Current implementation stores the last sequence for debugging.
 - Later this will coordinate multi-robot execution and acknowledgements.
==============================================================================
"""

from fastapi import APIRouter, HTTPException

from backend.state.ir_queue import enqueue
from backend.state.runtime_state import set_last_sequence
from backend.types.schemas import SequenceRequest, SequenceResponse
from backend.utils.cmd_mapping import try_get_ir_code

router = APIRouter()


@router.post("/sequence", response_model=SequenceResponse)
def post_sequence(payload: SequenceRequest) -> SequenceResponse:
    """Validate a sequence payload and store it (placeholder for execution)."""
    steps = [s.strip() for s in payload.steps if s.strip()]
    if len(steps) == 0:
        raise HTTPException(status_code=400, detail="Sequence steps cannot be empty.")

    # Placeholder implementation: store for debugging; later execute on robots.
    set_last_sequence(steps=steps)

    # Enqueue each step for the default IR device (alpha) if it maps to an IR code.
    for step in steps:
        ir_code = try_get_ir_code(ui_cmd=step)
        if ir_code is None:
            continue
        enqueue(device_id="alpha", ui_cmd=step, ir_code=ir_code)

    return SequenceResponse(is_ok=True, steps_count=len(steps))

