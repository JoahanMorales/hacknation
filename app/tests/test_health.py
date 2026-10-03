from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app


def test_health() -> None:
    assert TestClient(app).get("/api/health").json() == {"status": "ok"}


def test_settings_from_env(monkeypatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("DEMO_MODE", "true")
    settings = Settings(_env_file=None)
    assert settings.openai_api_key == "sk-test"
    assert settings.demo_mode is True
