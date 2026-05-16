from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "AgentFlow"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"

    LLM_PROVIDER: str = "groq"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = ""
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"

    DEFAULT_LLM_MODEL: str = ""
    CHAT_MODEL: str = ""
    SUPERVISOR_MODEL: str = ""
    SPECIALIST_MODEL: str = ""
    REVIEWER_MODEL: str = ""
    MEMORY_MODEL: str = ""

    CHAT_TEMPERATURE: float = 0.2
    SUPERVISOR_TEMPERATURE: float = 0.1
    SPECIALIST_TEMPERATURE: float = 0.35
    REVIEWER_TEMPERATURE: float = 0.0
    MEMORY_TEMPERATURE: float = 0.0

    LLM_MAX_RETRIES: int = 3
    LLM_RETRY_MIN_SECONDS: int = 1
    LLM_RETRY_MAX_SECONDS: int = 8

    SQLITE_DB_PATH: str = "agentflow.db"
    HUMAN_REVIEW_SCORE_THRESHOLD: int = 7
    AGENT_MAX_TOOL_ITERATIONS: int = 2

    MEMORY_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    REVIEW_WEBHOOK_URL: str = ""
    HTTP_TIMEOUT_SECONDS: int = 12

    RATE_LIMIT_DEFAULT: str = "120/minute"
    RATE_LIMIT_AGENT_RUN: str = "12/minute"
    RATE_LIMIT_CHAT: str = "20/minute"
    RATE_LIMIT_MEMORY_WRITE: str = "30/minute"
    RATE_LIMIT_REVIEW: str = "20/minute"

    LOG_LEVEL: str = "INFO"

    ALLOWED_ORIGINS: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "http://localhost:5174,"
        "http://127.0.0.1:5174"
    )
    ALLOWED_ORIGIN_REGEX: str = (
        r"^http://(localhost|127\.0\.0\.1):\d+$|^https://.*\.vercel\.app$"
    )

    class Config:
        env_file = ".env"

    @property
    def cors_origins_list(self) -> List[str]:
        return [
            origin.strip().rstrip("/")
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]

    @property
    def cors_origin_regex(self) -> str | None:
        regex = self.ALLOWED_ORIGIN_REGEX.strip()
        return regex or None

    @property
    def default_model(self) -> str:
        return self.DEFAULT_LLM_MODEL.strip() or self.GROQ_MODEL.strip()

    def model_for_role(self, role: str) -> str:
        model_map = {
            "chat": self.CHAT_MODEL,
            "supervisor": self.SUPERVISOR_MODEL,
            "specialist": self.SPECIALIST_MODEL,
            "reviewer": self.REVIEWER_MODEL,
            "memory": self.MEMORY_MODEL,
        }
        return model_map.get(role, "").strip() or self.default_model

    def temperature_for_role(self, role: str) -> float:
        temperature_map = {
            "chat": self.CHAT_TEMPERATURE,
            "supervisor": self.SUPERVISOR_TEMPERATURE,
            "specialist": self.SPECIALIST_TEMPERATURE,
            "reviewer": self.REVIEWER_TEMPERATURE,
            "memory": self.MEMORY_TEMPERATURE,
        }
        return float(temperature_map.get(role, self.CHAT_TEMPERATURE))


settings = Settings()
