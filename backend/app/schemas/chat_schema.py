from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"] = Field(
        ...,
        description="Message role in the chat conversation."
    )
    content: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="Message content."
    )


class ChatRequest(BaseModel):
    message: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=2000,
        description="Single user message. Kept for backwards compatibility."
    )
    messages: List[ChatMessage] = Field(
        default=[],
        max_length=20,
        description="Full chat history to send to the AI model."
    )


class ChatResponse(BaseModel):
    response: str
    model: str
