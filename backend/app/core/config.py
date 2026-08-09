from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    app_name: str = "OneOpen Workboard API"
    api_prefix: str = "/api"
    database_url: str = Field(default="sqlite:///./oneopen_workboard.db", alias="DATABASE_URL")
    secret_key: str = Field(default="change-me-for-local-dev", alias="SECRET_KEY")
    access_token_expire_minutes: int = Field(default=60 * 24, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    uploads_dir: str = Field(default="./uploads", alias="UPLOADS_DIR")
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        alias="CORS_ORIGINS",
    )
    mail_host: str | None = Field(default=None, alias="MAIL_HOST")
    mail_port: int = Field(default=587, alias="MAIL_PORT")
    mail_username: str | None = Field(default=None, alias="MAIL_USERNAME")
    mail_password: str | None = Field(default=None, alias="MAIL_PASSWORD")
    mail_from: str | None = Field(default=None, alias="MAIL_FROM")
    mail_from_name: str = Field(default="OneOpen Workboard", alias="MAIL_FROM_NAME")
    mail_use_tls: bool = Field(default=True, alias="MAIL_USE_TLS")
    public_base_url: str = Field(default="http://localhost:8000", alias="PUBLIC_BASE_URL")
    magicboard_api_url: str | None = Field(default=None, alias="MAGICBOARD_API_URL")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    @property
    def cors_origin_list(self) -> list[str]:
        stripped = self.cors_origins.strip()
        if not stripped:
            return []
        return [origin.strip() for origin in stripped.split(",") if origin.strip()]

    @property
    def magicboard_connected(self) -> bool:
        return bool(self.magicboard_api_url and self.magicboard_api_url.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()
