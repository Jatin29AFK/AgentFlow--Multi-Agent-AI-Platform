from __future__ import annotations

from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.logging import get_logger


logger = get_logger(__name__)


def _retry_config():
    return {
        "reraise": True,
        "stop": stop_after_attempt(settings.LLM_MAX_RETRIES),
        "wait": wait_exponential(
            multiplier=1,
            min=settings.LLM_RETRY_MIN_SECONDS,
            max=settings.LLM_RETRY_MAX_SECONDS,
        ),
        "retry": retry_if_exception_type(Exception),
    }


class LLMService:
    def __init__(
        self,
        role: str = "chat",
        provider: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
    ):
        self.role = role
        self.provider = (provider or settings.LLM_PROVIDER).strip().lower()
        self.model = (model or settings.model_for_role(role)).strip()
        self.temperature = (
            float(temperature)
            if temperature is not None
            else settings.temperature_for_role(role)
        )
        self.llm = self._build_chat_model()

    def _build_chat_model(self):
        if self.provider == "groq":
            if not settings.GROQ_API_KEY:
                raise ValueError("GROQ_API_KEY is missing. Please add it in your .env file.")

            from langchain_groq import ChatGroq

            return ChatGroq(
                groq_api_key=settings.GROQ_API_KEY,
                model=self.model,
                temperature=self.temperature,
            )

        if self.provider == "openai":
            if not settings.OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY is missing. Please add it in your .env file.")

            from langchain_openai import ChatOpenAI

            kwargs: dict[str, Any] = {
                "api_key": settings.OPENAI_API_KEY,
                "model": self.model,
                "temperature": self.temperature,
            }
            if settings.OPENAI_BASE_URL.strip():
                kwargs["base_url"] = settings.OPENAI_BASE_URL.strip()

            return ChatOpenAI(**kwargs)

        if self.provider == "ollama":
            from langchain_ollama import ChatOllama

            return ChatOllama(
                base_url=settings.OLLAMA_BASE_URL,
                model=self.model,
                temperature=self.temperature,
            )

        raise ValueError(
            "Unsupported LLM_PROVIDER. Expected one of: groq, openai, ollama."
        )

    @staticmethod
    def _build_messages(user_message: str, system_prompt: str) -> list[Any]:
        return [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message),
        ]

    @staticmethod
    def _build_chat_history_messages(messages: list[dict[str, str]]) -> list[Any]:
        chat_messages: list[Any] = []

        for message in messages:
            role = message.get("role", "user")
            content = message.get("content", "")

            if role == "system":
                chat_messages.append(SystemMessage(content=content))
            elif role == "assistant":
                chat_messages.append(AIMessage(content=content))
            else:
                chat_messages.append(HumanMessage(content=content))

        return chat_messages

    @staticmethod
    def _normalize_content(content: Any) -> str:
        if isinstance(content, str):
            return content

        if isinstance(content, list):
            parts = []
            for item in content:
                if isinstance(item, dict) and "text" in item:
                    parts.append(str(item["text"]))
                else:
                    parts.append(str(item))
            return "\n".join(parts)

        return str(content)

    @retry(**_retry_config())
    def _invoke_with_retry(self, messages: list[Any]):
        return self.llm.invoke(messages)

    @retry(**_retry_config())
    async def _ainvoke_with_retry(self, messages: list[Any]):
        return await self.llm.ainvoke(messages)

    def generate_response(
        self,
        user_message: str,
        system_prompt: str = "You are AgentFlow, a helpful AI assistant.",
    ) -> str:
        logger.info(
            "Starting LLM call.",
            extra={
                "provider": self.provider,
                "model": self.model,
            },
        )
        result = self._invoke_with_retry(self._build_messages(user_message, system_prompt))
        return self._normalize_content(result.content)

    def generate_chat_response(
        self,
        messages: list[dict[str, str]],
        system_prompt: str = "You are AgentFlow, a helpful AI assistant.",
    ) -> str:
        normalized_messages = [
            {"role": "system", "content": system_prompt},
            *messages,
        ]
        result = self._invoke_with_retry(
            self._build_chat_history_messages(normalized_messages)
        )
        return self._normalize_content(result.content)

    async def agenerate_response(
        self,
        user_message: str,
        system_prompt: str = "You are AgentFlow, a helpful AI assistant.",
    ) -> str:
        logger.info(
            "Starting async LLM call.",
            extra={
                "provider": self.provider,
                "model": self.model,
            },
        )
        result = await self._ainvoke_with_retry(
            self._build_messages(user_message, system_prompt)
        )
        return self._normalize_content(result.content)
