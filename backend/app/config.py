from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://byggagent:changeme@db:5432/byggagent"

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # Auth
    magic_link_secret: str = "dev-secret-change-me"
    magic_link_expiry_minutes: int = 15
    session_expiry_days: int = 7
    secret_key: str = "dev-secret-change-me"

    # Email
    smtp_host: str = "smtp.example.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    from_email: str = "noreply@example.com"

    # LLM
    anthropic_api_key: str = ""
    voyage_api_key: str = ""
    default_model: str = "claude-sonnet-4-6"

    # App
    app_url: str = "http://localhost:3000"
    api_url: str = "http://localhost:8000"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
