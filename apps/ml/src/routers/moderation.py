"""
Content moderation stub. Phase 8.5.
In production: calls OpenAI moderation API with an in-house fallback.
"""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ModerationRequest(BaseModel):
    text: str
    context: str = "post"  # "post" | "comment" | "trail_condition"


class ModerationResponse(BaseModel):
    flagged: bool
    categories: dict
    action: str  # "allow" | "review" | "block"


@router.post("/check", response_model=ModerationResponse)
async def check_content(req: ModerationRequest) -> ModerationResponse:
    # Phase 8.5 will integrate OpenAI moderation API here.
    return ModerationResponse(
        flagged=False,
        categories={},
        action="allow",
    )
