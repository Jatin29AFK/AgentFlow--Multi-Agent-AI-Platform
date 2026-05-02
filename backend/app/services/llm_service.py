from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from app.core.config import settings


class LLMService:
    def __init__(self):
        if not settings.GROQ_API_KEY:
            raise ValueError(
                "GROQ_API_KEY is missing. Please add it in your .env file."
            )

        self.llm = ChatGroq(
            groq_api_key=settings.GROQ_API_KEY,
            model=settings.GROQ_MODEL,
            temperature=0.2,
        )

    def generate_response(
        self,
        user_message: str,
        system_prompt: str = "You are AgentFlow, a helpful AI assistant."
    ) -> str:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message),
        ]

        result = self.llm.invoke(messages)
        return result.content