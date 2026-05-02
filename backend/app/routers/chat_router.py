from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.schemas.chat_schema import ChatRequest, ChatResponse
from app.services.llm_service import LLMService


router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest):
    try:
        llm_service = LLMService()
        response = llm_service.generate_response(request.message)

        return ChatResponse(
            response=response,
            model=settings.GROQ_MODEL,
        )

    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"LLM request failed: {str(e)}"
        )