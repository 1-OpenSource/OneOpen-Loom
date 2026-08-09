from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "OneOpen Magicboard API"
    api_prefix: str = "/api"
    database_url: str = Field(default="sqlite:///./oneopen_magicboard.db", alias="DATABASE_URL")
    secret_key: str = Field(default="change-me-for-local-dev", alias="SECRET_KEY")
    access_token_expire_minutes: int = Field(default=60 * 24, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    uploads_dir: str = Field(default="./uploads", alias="UPLOADS_DIR")
    cors_origins: str = Field(
        default="http://localhost:5174,http://localhost:5173",
        alias="CORS_ORIGINS",
    )
    public_base_url: str = Field(default="http://localhost:8002", alias="PUBLIC_BASE_URL")
    workboard_api_url: str | None = Field(default=None, alias="WORKBOARD_API_URL")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    @property
    def cors_origin_list(self) -> list[str]:
        stripped = self.cors_origins.strip()
        if not stripped:
            return []
        return [origin.strip() for origin in stripped.split(",") if origin.strip()]

    @property
    def workboard_connected(self) -> bool:
        return bool(self.workboard_api_url and self.workboard_api_url.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()
