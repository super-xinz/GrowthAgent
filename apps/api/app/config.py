from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "sqlite+aiosqlite:///./reddit_growth.db"
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"
    llm_provider: str = "mock"
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_strong_model: str = ""
    default_daily_reply_limit: int = 3
    max_daily_reply_limit: int = 5
    max_subreddit_daily_reply_limit: int = 1
    max_conversation_followups: int = 4
    tracking_base_url: str = "http://localhost:8000"
    reddit_client_id: str = ""
    reddit_redirect_uri: str = "http://localhost:8000/v1/reddit/oauth/callback"
    autopublish_enabled: bool = False
    global_kill_switch: bool = False
    reddit_app_approval_status: str = "DEVELOPMENT_ONLY"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
