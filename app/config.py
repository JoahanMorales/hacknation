from pydantic_settings import BaseSettings, SettingsConfigDict


# Secretos sólo por entorno (.env local, nunca versionado).
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str = ""
    demo_mode: bool = False


settings = Settings()
