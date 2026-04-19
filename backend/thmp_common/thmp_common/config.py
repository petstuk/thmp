from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    thmp_env: str = "development"
    thmp_jwt_secret: str
    thmp_jwt_issuer: str = "thmp"
    thmp_jwt_audience: str = "thmp-api"
    thmp_internal_api_secret: str = ""
    thmp_cors_origins: str = "http://localhost:5173"

    access_token_minutes: int = 15
    refresh_token_days: int = 7


@lru_cache
def get_settings() -> Settings:
    return Settings()
