from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "AgentFlow"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"

    SQLITE_DB_PATH: str = "agentflow.db"
    HUMAN_REVIEW_SCORE_THRESHOLD: int = 7

    ALLOWED_ORIGINS: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "http://localhost:5174,"
        "http://127.0.0.1:5174"
    )
    ALLOWED_ORIGIN_REGEX: str = r"^https://.*\.vercel\.app$"

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


settings = Settings()
