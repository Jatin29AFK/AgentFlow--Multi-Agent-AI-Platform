import asyncio

from fastapi import APIRouter, HTTPException, Request

from app.core.config import settings
from app.core.rate_limit import limiter
from app.schemas.chat_schema import ChatRequest, ChatResponse
from app.services.llm_service import LLMService


router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
@limiter.limit(settings.RATE_LIMIT_CHAT)
async def chat(request: Request, body: ChatRequest):
    try:
        llm_service = LLMService(role="chat")
        messages = [
            message.model_dump() if hasattr(message, "model_dump") else message.dict()
            for message in body.messages
        ]

        if not messages and body.message:
            messages = [{"role": "user", "content": body.message}]

        if not messages:
            raise HTTPException(status_code=400, detail="Message is required.")

        response = await asyncio.to_thread(
            llm_service.generate_chat_response,
            messages,
        )

        return ChatResponse(
            response=response,
            model=llm_service.model,
        )
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"LLM request failed: {exc}",
        )
